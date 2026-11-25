"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import type { CSSProperties } from "react";
import { ArrowLeft, Plus, Dumbbell, X, EllipsisVertical, ArrowUp, ArrowDown, Repeat, NotebookPen, BookOpen, Trash2 } from "lucide-react";
import { createClient } from "../lib/supabase/client";

type Session = { id: string; name: string; session_date: string; status: string; started_at: string | null; notes: string | null };
type Exercise = { id: string; name: string; equipment: string | null; is_active: boolean; is_unilateral: boolean; image_path: string | null; technique_notes: string | null; description: string | null };
type Entry = { id: string; exercise_id: string; sort_order: number; notes: string | null; discomfort_notes: string | null };
type SetRow = { id: string; training_exercise_id: string; set_number: number; set_type: "warmup" | "working"; weight_kg: number | null; reps: number | null; side: "both" | "left" | "right"; is_completed: boolean; completed_at: string | null };
const setFields = "id,training_exercise_id,set_number,set_type,weight_kg,reps,side,is_completed,completed_at";
const C = { green: "#7D8C82", dark: "#596B60", text: "#25382F", muted: "#78847B", border: "#E5EAE5", pale: "#EEF2EE" };
const card: CSSProperties = { background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, padding: 16 };
const btn: CSSProperties = { fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", border: 0, borderRadius: 12, padding: 12, color: C.dark, background: C.pale };
export default function StrengthSession({ sessionId, onBack }: { sessionId: string; onBack: () => void }) {
  const db = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [previous,setPrevious]=useState<Record<string,{date:string;rows:SetRow[]}>>({});
  const [duration,setDuration]=useState("");
  const [calories,setCalories]=useState("");
  const [notes,setNotes]=useState("");
  const [discomfort,setDiscomfort]=useState("");
  const [closing,setClosing]=useState(false);
  const closingRef=useRef(false);
  const [sets, setSets] = useState<SetRow[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [library, setLibrary] = useState<Exercise[]>([]);
  const [groups,setGroups]=useState<Record<string,{name:string;color:string}>>({});
  const setsRef=useRef<SetRow[]>([]);
  const queue=useRef<Promise<void>>(Promise.resolve());
  const pending=useRef(0);
  const [photos,setPhotos]=useState<Record<string,string>>({});
  const [preview,setPreview]=useState<string|null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [picker, setPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [groupFilter,setGroupFilter]=useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const lock = useRef(false);
  const [menu,setMenu]=useState<string|null>(null);
  const [panel,setPanel]=useState<{id:string;kind:"notes"|"technique"|"replace"}|null>(null);
  const [entryNotes,setEntryNotes]=useState("");
  const [entryPain,setEntryPain]=useState("");
  const [variants,setVariants]=useState<string[]>([]);
  async function openReplacement(entry:Entry){
    setMenu(null);setVariants([]);setSearch("");setGroupFilter("");setPicker(false);setPanel({id:entry.id,kind:"replace"});
    const r=await db.from("exercise_variants").select("exercise_id,variant_id").or(`exercise_id.eq.${entry.exercise_id},variant_id.eq.${entry.exercise_id}`);
    if(r.error){setError(r.error.message);return;}
    setVariants((r.data??[]).map(x=>x.exercise_id===entry.exercise_id?x.variant_id:x.exercise_id));
  }
  function manage(entry:Entry,action:string,replacement?:string){
    if(action==="delete"&&!window.confirm("¿Eliminar este ejercicio y todas sus series?"))return;
    if(action==="replace"&&!window.confirm("¿Sustituir ejercicio? Si hay series completadas se conservará el original; si no, se borrarán sus series pendientes."))return;
    setMenu(null);
    void mutate(async()=>{
      const r=await db.rpc("manage_training_exercise",{p_entry_id:entry.id,p_action:action,p_replacement_id:replacement??null});
      if(r.error)throw r.error;
      const e=await db.from("training_exercises").select("id,exercise_id,sort_order,notes,discomfort_notes").eq("session_id",sessionId).order("sort_order").order("id");
      if(e.error){setRetry(n=>n+1);throw e.error;}
      const ids=(e.data??[]).map(x=>x.id);
      const rows=ids.length?await db.from("training_sets").select(setFields).in("training_exercise_id",ids):{data:[],error:null};
      if(rows.error){setRetry(n=>n+1);throw rows.error;}
      setEntries(e.data??[]);replaceSets(()=> (rows.data??[]) as SetRow[]);setPanel(null);
    });
  }
  function saveEntryNotes(entry:Entry){
    void mutate(async()=>{
      const patch={notes:entryNotes.trim()||null,discomfort_notes:entryPain.trim()||null};
      const r=await db.from("training_exercises").update(patch).eq("id",entry.id).select("id").single();
      if(r.error)throw r.error;
      setEntries(old=>old.map(e=>e.id===entry.id?{...e,...patch}:e));setPanel(null);
    });
  }

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(""); setSession(null); setEntries([]); replaceSets(()=>[]); setPicker(false);
    async function load() {
      try {
        const [s,e,l,g,m] = await Promise.all([
          db.from("training_sessions").select("id,name,session_date,status,started_at,notes").eq("id",sessionId).single(),
          db.from("training_exercises").select("id,exercise_id,sort_order,notes,discomfort_notes").eq("session_id",sessionId).order("sort_order").order("id"),
          db.from("exercise_library").select("id,name,equipment,is_active,is_unilateral,image_path,technique_notes,description").order("name").order("id"),
          db.from("exercise_muscle_groups").select("exercise_id,muscle_group_id").eq("is_primary",true),
          db.from("muscle_groups").select("id,name,color")
        ]);
        if(s.error) throw s.error; if(e.error) throw e.error; if(l.error) throw l.error; if(g.error) throw g.error; if(m.error) throw m.error;
        const ids = (e.data ?? []).map(x=>x.id);
        const rows = ids.length ? await db.from("training_sets").select(setFields).in("training_exercise_id",ids).order("set_number").order("id") : {data:[],error:null};
        if(rows.error) throw rows.error;
        if(alive) { const map: Record<string,{name:string;color:string}>={}; for(const link of g.data??[]){const group=(m.data??[]).find(x=>x.id===link.muscle_group_id); if(group) map[link.exercise_id]={name:group.name,color:group.color};} setGroups(map); replaceSets(()=> (rows.data ?? []) as SetRow[]); setSession(s.data); setNotes(s.data.notes??""); setEntries(e.data ?? []); setLibrary(l.data ?? []); }
      } catch(err) { if(alive) setError((err as {message?:string}).message ?? "No se pudo cargar la sesión."); }
      finally { if(alive) setLoading(false); }
    }
    void load(); return () => { alive = false; };
  },[db,sessionId,retry]);
  useEffect(()=>{
    let alive=true;
    async function loadPhotos(){
      const paths=Array.from(new Set(library.map(e=>e.image_path).filter((p):p is string=>!!p)));
      if(!paths.length){setPhotos({});return;}
      const {data}=await db.storage.from("exercise-images").createSignedUrls(paths,3600);
      if (alive) {
        const nextPhotos: Record<string, string> = {};
        for (const item of data ?? []) {
          if (item.path && typeof item.signedUrl === "string" && item.signedUrl) {
            nextPhotos[item.path] = item.signedUrl;
          }
        }
        setPhotos(nextPhotos);
      }
    }
    void loadPhotos(); return ()=>{alive=false;};
  },[db,library]);
  useEffect(()=>{
    let alive=true;
    async function loadPrevious(){
      try {
        const result:Record<string,{date:string;rows:SetRow[]}>={};
        for(const exerciseId of Array.from(new Set(entries.map(e=>e.exercise_id)))){
          const q=await db.from("training_exercises").select("id,training_sessions!inner(id,session_date,status,finished_at)").eq("exercise_id",exerciseId).eq("training_sessions.status","completed").neq("session_id",sessionId).lte("training_sessions.session_date",session?.session_date??"0001-01-01").order("session_date",{referencedTable:"training_sessions",ascending:false});
          if(q.error) throw q.error;
          const candidates=(q.data??[]).map(x=>({id:x.id,session:x.training_sessions as unknown as {id:string;session_date:string;finished_at:string|null}})).filter(x=>x.session?.id).sort((a,b)=>b.session.session_date.localeCompare(a.session.session_date)||(b.session.finished_at??"").localeCompare(a.session.finished_at??""));
          for(const candidate of candidates){
            const r=await db.from("training_sets").select(setFields).eq("training_exercise_id",candidate.id).eq("is_completed",true).order("set_number");
            if(r.error) throw r.error;
            if(r.data?.length){result[exerciseId]={date:candidate.session.session_date,rows:r.data as SetRow[]};break;}
          }
        }
        if(alive)setPrevious(result);
      }catch(err){if(alive)setError((err as {message?:string}).message??"No se pudo consultar el histórico.");}
    }
    if(session)void loadPrevious();
    return()=>{alive=false;};
  },[db,entries,sessionId,session]);
  function copyPrevious(entry:Entry){
    void mutate(async()=>{
      const offset=setsRef.current.filter(s=>s.training_exercise_id===entry.id).reduce((m,r)=>Math.max(m,r.set_number),0);
      if(offset && !window.confirm("¿Añadir las series anteriores al final, sin modificar las actuales?"))return;
      const source=previous[entry.exercise_id]?.rows??[];
      if(!source.length)return;
      const {data,error}=await db.from("training_sets").insert(source.map(r=>({training_exercise_id:entry.id,set_number:r.set_number+offset,set_type:r.set_type,weight_kg:r.weight_kg,reps:r.reps,side:r.side,is_completed:false}))).select(setFields);
      if(error)throw error;
      replaceSets(old=>[...old,...(data as SetRow[])]);
    });
  }
  async function closeSession(remove=false){
    if(!session||closingRef.current)return;
    if(remove&&!window.confirm("¿Eliminar definitivamente este entrenamiento, sus ejercicios y series?"))return;
    closingRef.current=true;setClosing(true);setError("");
    try{
      await queue.current;
      if(lock.current)throw new Error("Espera a que termine el guardado.");
      if(remove){
        const r=await db.from("training_sessions").delete().eq("id",session.id).select("id").single();if(r.error)throw r.error;
      }else{
        const mins=Number(duration),kcal=calories.trim()===""?null:Number(calories);
        if(!Number.isInteger(mins)||mins<=0)throw new Error("Introduce una duración válida en minutos.");
        if(kcal!==null&&(!Number.isFinite(kcal)||kcal<0))throw new Error("Introduce calorías válidas.");
        if(!setsRef.current.some(s=>s.is_completed))throw new Error("Completa al menos una serie antes de finalizar.");
        if(setsRef.current.some(s=>!s.is_completed)&&!window.confirm("Hay series sin completar. ¿Finalizar igualmente?"))return;
        const r=await db.from("training_sessions").update({status:"completed",duration_minutes:mins,active_calories:kcal,notes:notes.trim()||null,discomfort_notes:discomfort.trim()||null,finished_at:session.started_at?new Date().toISOString():null}).eq("id",session.id).select("id").single();if(r.error)throw r.error;
      }
      onBack();
    }catch(err){setError((err as {message?:string}).message??"No se pudo guardar el entrenamiento.");}
    finally{closingRef.current=false;setClosing(false);}
  }
  async function add(exercise: Exercise) {
    if(closingRef.current || lock.current || !session || session.status === "completed" || !exercise.is_active) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const order = entries.reduce((max,e) => Math.max(max,e.sort_order),-1)+1;
      const {data,error} = await db.from("training_exercises").insert({session_id:session.id,exercise_id:exercise.id,sort_order:order}).select("id,exercise_id,sort_order,notes,discomfort_notes").single();
      if(error) throw error;
      setEntries(old => [...old,data]); setPicker(false); setSearch("");
    } catch(err) { setError((err as {message?:string}).message ?? "No se pudo añadir el ejercicio."); }
    finally { lock.current = false; setBusy(false); }
  }
  function replaceSets(update:(old:SetRow[])=>SetRow[]) {
    const next=update(setsRef.current); setsRef.current=next; setSets(next);
  }
  function mutate(action: () => Promise<void>) {
    if(closingRef.current || !session || session.status === "completed" || (lock.current && pending.current===0)) return;
    pending.current++; lock.current=true; setBusy(true);
    queue.current=queue.current.then(async()=>{
      setError("");
      try { await action(); } catch(err) { setError((err as {message?:string}).message ?? "No se pudo guardar la serie."); }
      finally { pending.current--; if(!pending.current){lock.current=false;setBusy(false);} }
    });
  }
  function addSet(entry: Entry, side: SetRow["side"]) {
    void mutate(async()=>{
      const number=setsRef.current.filter(s=>s.training_exercise_id===entry.id).reduce((m,s)=>Math.max(m,s.set_number),0)+1;
      const {data,error}=await db.from("training_sets").insert({training_exercise_id:entry.id,set_number:number,side,set_type:"working"}).select(setFields).single();
      if(error) throw error; replaceSets(old=>[...old,data as SetRow]);
    });
  }
  function saveSet(row: SetRow, patch: Partial<SetRow>) {
    void mutate(async()=>{
      const current=setsRef.current.find(s=>s.id===row.id); if(!current) return;
      const next={...current,...patch};
      if(next.weight_kg!==null && (!Number.isFinite(next.weight_kg)||next.weight_kg<0)) throw new Error("Peso no válido.");
      if(next.reps!==null && (!Number.isInteger(next.reps)||next.reps<=0)) throw new Error("Introduce repeticiones enteras positivas.");
      if(next.is_completed && next.reps===null) throw new Error("Introduce las repeticiones antes de completar la serie.");
      replaceSets(old=>old.map(s=>s.id===row.id?next:s));
      try {
        const {data,error}=await db.from("training_sets").update(patch).eq("id",row.id).select(setFields).single();
        if(error) throw error;
        replaceSets(old=>old.map(s=>s.id===row.id?data as SetRow:s));
      } catch(err) {
        replaceSets(old=>old.map(s=>s.id===row.id?current:s));
        throw err;
      }
    });
  }
  function splitSet(row:SetRow){
    void mutate(async()=>{
      const {error}=await db.rpc("split_training_set",{p_set_id:row.id});
      if(error) throw error;
      const result=await db.from("training_sets").select(setFields).eq("training_exercise_id",row.training_exercise_id).eq("set_number",row.set_number);
      if(result.error){setRetry(n=>n+1);throw result.error;}
      replaceSets(old=>[...old.filter(s=>s.training_exercise_id!==row.training_exercise_id||s.set_number!==row.set_number),...(result.data as SetRow[])]);
    });
  }
  function changeType(row:SetRow){
    void mutate(async()=>{
      const {data,error}=await db.from("training_sets").update({set_type:(setsRef.current.find(s=>s.id===row.id)?.set_type??row.set_type)==="warmup"?"working":"warmup"}).eq("training_exercise_id",row.training_exercise_id).eq("set_number",row.set_number).select(setFields);
      if(error) throw error;
      replaceSets(old=>old.map(s=>(data as SetRow[]).find(d=>d.id===s.id)??s));
    });
  }
  function removeSet(row:SetRow) {
    if(row.is_completed && !window.confirm("¿Eliminar esta serie completada?")) return;
    void mutate(async()=>{const {error}=await db.from("training_sets").delete().eq("id",row.id); if(error) throw error; replaceSets(old=>old.filter(s=>s.id!==row.id));});
  }
  const field: CSSProperties={width:"100%",minWidth:0,boxSizing:"border-box",fontFamily:"inherit",fontSize:16,padding:"8px 4px",border:`1px solid ${C.border}`,borderRadius:8,textAlign:"center",color:C.text};
  const readOnly=closing||session?.status==="completed";
  const filtered = library.filter(e => e.is_active && (!groupFilter || groups[e.id]?.name===groupFilter) && `${e.name} ${e.equipment ?? ""}`.toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es")));
  return <div className="strength-session-stable" style={{display:"flex",flexDirection:"column",gap:16,width:"100%",color:C.text}}>
    <style>{`.strength-session-stable button:disabled, .strength-session-stable input:disabled, .strength-session-stable select:disabled { opacity: 1 !important; filter: none !important; } .strength-session-stable input:not([type=checkbox]), .strength-session-stable select { background-color: #fff; color: #25382F; -webkit-text-fill-color: #25382F; } .strength-session-stable button, .strength-session-stable input, .strength-session-stable select { -webkit-tap-highlight-color: transparent; transition: none !important; }`}</style>
    <button type="button" aria-disabled={busy} onClick={()=>{if(!lock.current)onBack();}} style={{...btn,background:"none",padding:0,display:"flex",alignItems:"center",gap:8,alignSelf:"flex-start"}}><ArrowLeft size={18}/> Fuerza</button>
    {preview && <div role="dialog" aria-modal="true" aria-label="Fotografía del ejercicio" onClick={()=>setPreview(null)} style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}><button type="button" aria-label="Cerrar fotografía" onClick={()=>setPreview(null)} style={{...btn,position:"absolute",top:24,right:20}}><X size={20}/></button><img src={preview} alt="Fotografía del ejercicio" style={{maxWidth:"100%",maxHeight:"85vh",objectFit:"contain",borderRadius:12}}/></div>}
    {error && <div role="alert" style={{...card,color:"#9B3C3C",fontSize:13}}>{error}</div>}
    {loading ? <p style={{color:C.muted}}>Cargando entrenamiento…</p> : !session ? <button style={btn} onClick={()=>setRetry(n=>n+1)}>Reintentar</button> : <>
      <header><h2 style={{margin:0,fontSize:24,fontWeight:600}}>{session.name}</h2><p style={{fontSize:13,color:C.muted,margin:"5px 0 0"}}>{new Date(`${session.session_date}T12:00:00`).toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"})} · {session.status === "completed" ? "Finalizado" : session.status === "in_progress" ? "En curso" : "Borrador"}</p></header>
      {entries.length === 0 && <div style={{...card,textAlign:"center",color:C.muted,fontSize:13}}><Dumbbell size={28} color={C.green}/><p>Todavía no hay ejercicios en esta sesión.</p></div>}
      {entries.map((entry,i)=>{const exercise=library.find(e=>e.id===entry.exercise_id); const rows=sets.filter(s=>s.training_exercise_id===entry.id).sort((a,b)=>a.set_number-b.set_number || a.side.localeCompare(b.side)); const unilateral=!!exercise?.is_unilateral||rows.some(r=>r.side!=="both"); const prev=previous[entry.exercise_id]; const baseColumns=`${unilateral?42:28}px repeat(2,minmax(0,1fr)) 25px 20px`; const columns=prev?baseColumns.replace(/^\d+px /,`${unilateral?42:28}px minmax(54px,0.9fr) `):baseColumns; const group=groups[entry.exercise_id]; const photo=exercise?.image_path?photos[exercise.image_path]:undefined; return <section key={entry.id} style={{...card,display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}><div style={{background:C.pale,borderRadius:12,width:48,height:48,flexShrink:0,display:"grid",placeItems:"center",overflow:"hidden"}}>{photo?<button type="button" aria-label="Ampliar fotografía" onClick={()=>setPreview(photo)} style={{border:0,padding:0,width:48,height:48,background:"none",cursor:"pointer"}}><img src={photo} alt={exercise?.name??"Ejercicio"} style={{width:"100%",height:"100%",objectFit:"cover"}}/></button>:<Dumbbell size={22} color={C.dark}/>}</div><div style={{flex:1,minWidth:0}}><div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:6,fontWeight:600,fontSize:14}}><span>{i+1}. {exercise?.name ?? "Ejercicio"}</span></div><div style={{fontSize:12,color:C.muted}}>{exercise?.equipment ?? "Sin equipamiento indicado"}{exercise && !exercise.is_active ? " · Archivado" : ""}</div></div>{group&&<span style={{fontSize:10,fontWeight:600,borderRadius:6,padding:"4px 8px",background:group.color+"22",color:C.text,flexShrink:0,marginLeft:"auto",textAlign:"center",maxWidth:"35%",overflowWrap:"anywhere"}}>{group.name}</span>}<button type="button" aria-label="Opciones del ejercicio" aria-expanded={menu===entry.id} onClick={()=>{setMenu(menu===entry.id?null:entry.id);setPanel(null);}} style={{...btn,background:"none",padding:4,flexShrink:0}}><EllipsisVertical size={19}/></button></div>
        {menu===entry.id&&<div style={{...card,padding:8,display:"grid",gap:4}}>
          {!readOnly&&<><button disabled={busy||i===0} style={{...btn,textAlign:"left",color:i===0?C.muted:C.dark}} onClick={()=>manage(entry,"up")}><ArrowUp size={15}/> Mover arriba</button><button disabled={busy||i===entries.length-1} style={{...btn,textAlign:"left",color:i===entries.length-1?C.muted:C.dark}} onClick={()=>manage(entry,"down")}><ArrowDown size={15}/> Mover abajo</button><button disabled={busy} style={{...btn,textAlign:"left"}} onClick={()=>void openReplacement(entry)}><Repeat size={15}/> Sustituir ejercicio</button><button style={{...btn,textAlign:"left"}} onClick={()=>{setEntryNotes(entry.notes??"");setEntryPain(entry.discomfort_notes??"");setPanel({id:entry.id,kind:"notes"});setMenu(null);}}><NotebookPen size={15}/> Observaciones</button></>}
          <button style={{...btn,textAlign:"left"}} onClick={()=>{setPanel({id:entry.id,kind:"technique"});setMenu(null);}}><BookOpen size={15}/> Consultar técnica</button>
          {!readOnly&&<button disabled={busy} style={{...btn,textAlign:"left",color:"#A33D3D",background:"none"}} onClick={()=>manage(entry,"delete")}><Trash2 size={15}/> Eliminar ejercicio</button>}
        </div>}
        {panel?.id===entry.id&&<div style={{...card,padding:12,display:"grid",gap:10}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}><strong>{panel.kind==="technique"?"Técnica del ejercicio":panel.kind==="notes"?"Observaciones y molestias":"Sustituir ejercicio"}</strong><button type="button" aria-label="Cerrar panel" style={{...btn,background:"none",padding:4,display:"grid",placeItems:"center",flexShrink:0}} onClick={()=>setPanel(null)}><X size={18}/></button></div>
          {panel.kind==="technique"&&<><div style={{whiteSpace:"pre-wrap",fontSize:13}}>{exercise?.technique_notes||"Sin indicaciones técnicas."}</div>{exercise?.description&&<div style={{whiteSpace:"pre-wrap",fontSize:13}}>{exercise.description}</div>}</>}
          {panel.kind==="notes"&&<><label>Observaciones<textarea style={{...field,textAlign:"left"}} rows={3} value={entryNotes} onChange={e=>setEntryNotes(e.target.value)}/></label><label>Molestias<textarea style={{...field,textAlign:"left"}} rows={2} value={entryPain} onChange={e=>setEntryPain(e.target.value)}/></label><button disabled={busy} style={btn} onClick={()=>saveEntryNotes(entry)}>Guardar observaciones</button></>}
          {panel.kind==="replace"&&<><input style={{...field,textAlign:"left"}} placeholder="Buscar ejercicio" value={search} onChange={e=>setSearch(e.target.value)}/><select style={field} value={groupFilter} onChange={e=>setGroupFilter(e.target.value)}><option value="">Todos los grupos</option>{Array.from(new Set(library.filter(e=>e.is_active).map(e=>groups[e.id]?.name).filter(Boolean))).sort().map(name=><option key={name}>{name}</option>)}</select>{[true,false].map(linked=>{const list=filtered.filter(e=>e.id!==entry.exercise_id&&variants.includes(e.id)===linked);return list.length>0&&<div key={String(linked)} style={{display:"grid",gap:6}}><small>{linked?"Variantes vinculadas":"Otros ejercicios"}</small>{list.map(e=><button key={e.id} disabled={busy} style={{...btn,textAlign:"left"}} onClick={()=>manage(entry,"replace",e.id)}>{e.name} · {e.equipment??""}</button>)}</div>})}</>}
        </div>}
        {entry.notes&&<small style={{whiteSpace:"pre-wrap",color:C.muted}}>Observaciones: {entry.notes}</small>}{entry.discomfort_notes&&<small style={{whiteSpace:"pre-wrap",color:C.muted}}>Molestias: {entry.discomfort_notes}</small>}
        {prev&&<div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:6,fontSize:11,color:C.muted}}><span>Anterior: {prev.date.split("-").reverse().join("/")} · Máx. {Math.max(0,...prev.rows.filter(r=>r.set_type==="working").map(r=>r.weight_kg??0))} kg</span>{!readOnly&&<button style={{...btn,padding:6,marginLeft:"auto"}} onClick={()=>copyPrevious(entry)}>Copiar series</button>}</div>}
        {!prev&&!readOnly&&<small style={{color:C.muted}}>Sin referencia anterior disponible.</small>}
        {rows.length>0 && <div style={{display:"grid",gridTemplateColumns:columns,gap:5,alignItems:"center",fontSize:11,color:C.muted,textAlign:"center"}}><span>Serie</span>{prev&&<span>Anterior</span>}<span>Kg</span><span>Reps</span><span>Hecha</span><span/></div>}
        {rows.map((row)=><div key={row.id} style={{display:"flex",flexDirection:"column",gap:5,background:row.is_completed?C.pale:"transparent",borderRadius:10,padding:"4px 0"}}>
          <div style={{display:"grid",gridTemplateColumns:columns,gap:5,alignItems:"center"}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,minWidth:0}}>
              <button disabled={readOnly} title="Cambiar tipo de serie" style={{...btn,padding:"6px 2px",width:28}} onClick={()=>changeType(row)}>{row.set_type==="warmup"?"A":new Set(rows.filter(s=>s.set_number<=row.set_number&&s.set_type==="working").map(s=>s.set_number)).size}</button>
              {unilateral && (row.side==="both"&&!readOnly?<button type="button" aria-label="Separar serie en izquierda y derecha" title="Separar lados" onClick={()=>{if(window.confirm("¿Separar esta serie en izquierda y derecha?"))splitSet(row);}} style={{...btn,fontSize:10,padding:"3px 2px",width:"100%",background:C.pale}}>Ambos</button>:<span style={{fontSize:10,color:C.muted}}>{row.side==="both"?"Ambos":row.side==="left"?"Izq.":"Der."}</span>)}
            </div>
            {prev&&<div style={{fontSize:10,textAlign:"center",color:C.muted,lineHeight:1.45,minWidth:0}}>{referenceText(row,rows,prev.rows).split(" / ").map((part,j)=><div key={j} style={{whiteSpace:"nowrap",fontSize:part.length>13?9:10}}>{part}</div>)}</div>}
            {(["weight_kg","reps"] as const).map(k=><NumericField key={k} label={k==="weight_kg"?"Peso en kg":"Repeticiones"} value={row[k]} disabled={readOnly} style={field} onSave={v=>saveSet(row,{[k]:v})}/>)}

            <input aria-label="Serie completada" type="checkbox" disabled={readOnly} checked={row.is_completed} onChange={e=>saveSet(row,{is_completed:e.target.checked,completed_at:e.target.checked?new Date().toISOString():null})} style={{accentColor:C.green,width:20,height:20,margin:"auto"}}/>
            <button type="button" aria-label="Eliminar serie" disabled={readOnly} style={{...btn,padding:3,background:"none"}} onClick={()=>removeSet(row)}><X size={16}/></button>
          </div>

        </div>)}
        {rows.length>0 && <small style={{color:C.muted}}>A = aproximación. Pulsa el número para cambiar el tipo.{unilateral&&!readOnly&&" Pulsa Ambos para separar los lados."}</small>}
        {session.status!=="completed" && <button type="button" style={{...btn,display:"flex",alignItems:"center",justifyContent:"center",gap:6}} onClick={()=>addSet(entry,"both")}><Plus size={16}/> Añadir serie</button>}
      </section>})}
      {session.status !== "completed" && !picker && <button type="button" style={{...btn,display:"flex",alignItems:"center",justifyContent:"center",gap:8}} onClick={()=>{setPanel(null);setMenu(null);setPicker(true);setSearch("");setGroupFilter("");}}><Plus size={18}/> Añadir ejercicio</button>}
      {picker && <section style={{...card,display:"flex",flexDirection:"column",gap:12}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}><strong style={{fontSize:15}}>Seleccionar ejercicio</strong><button type="button" disabled={busy} style={{...btn,display:"flex",alignItems:"center",gap:6}} onClick={()=>setPicker(false)}><X size={16}/> Cerrar</button></div><input aria-label="Buscar ejercicio" placeholder="Buscar ejercicio o equipamiento" value={search} onChange={e=>setSearch(e.target.value)} style={{fontFamily:"inherit",fontSize:16,padding:12,border:`1px solid ${C.border}`,borderRadius:12,width:"100%",boxSizing:"border-box"}}/><select aria-label="Filtrar por grupo muscular" value={groupFilter} onChange={e=>setGroupFilter(e.target.value)} style={{...field,textAlign:"left",padding:12,borderRadius:12}}><option value="">Todos los grupos musculares</option>{Array.from(new Set(library.filter(e=>e.is_active).map(e=>groups[e.id]?.name).filter(Boolean))).sort((a,b)=>a.localeCompare(b,"es")).map(name=><option key={name} value={name}>{name}</option>)}</select>{filtered.length===0 && <p style={{fontSize:13,color:C.muted}}>No hay ejercicios disponibles.</p>}{filtered.map(e=><button type="button" key={e.id} disabled={busy} onClick={()=>void add(e)} style={{...btn,background:"#fff",border:`1px solid ${C.border}`,display:"flex",alignItems:"center",textAlign:"left",gap:10}}><div style={{flex:1}}>{e.name}<div style={{fontSize:11,fontWeight:400,color:C.muted}}>{e.equipment ?? ""}</div></div><Plus size={18}/></button>)}</section>}
      {session.status!=="completed"&&<section style={{...card,display:"flex",flexDirection:"column",gap:10}}><strong>Finalizar entrenamiento</strong><label>Duración (minutos)<input style={field} inputMode="numeric" value={duration} onChange={e=>setDuration(e.target.value)}/></label><label>Calorías activas (opcional)<input style={field} inputMode="decimal" value={calories} onChange={e=>setCalories(e.target.value)}/></label><label>Sensaciones y observaciones<textarea style={{...field,textAlign:"left"}} rows={2} value={notes} onChange={e=>setNotes(e.target.value)}/></label><label>Molestias (opcional)<textarea style={{...field,textAlign:"left"}} rows={2} value={discomfort} onChange={e=>setDiscomfort(e.target.value)}/></label><button type="button" disabled={closing||busy} style={{...btn,background:C.green,color:"white"}} onClick={()=>void closeSession()}>Finalizar entrenamiento</button></section>}
      <button type="button" disabled={closing||busy} style={{...btn,background:"none",color:"#A33D3D"}} onClick={()=>void closeSession(true)}>Eliminar entrenamiento</button>
    </>}
  </div>;
}

function NumericField({label,value,disabled,style,onSave}:{label:string;value:number|null;disabled:boolean;style:CSSProperties;onSave:(v:number|null)=>void}) {
  const [draft,setDraft]=useState(value===null?"":String(value));
  useEffect(()=>{setDraft(value===null?"":String(value));},[value]);
  return <input aria-label={label} inputMode={label==="Repeticiones"?"numeric":"decimal"} placeholder="—" value={draft} disabled={disabled} style={style} onChange={e=>setDraft(e.target.value)} onBlur={()=>{const raw=draft.trim().replace(",","."); const next=raw===""?null:Number(raw); if(next!==value) onSave(next);}} onKeyDown={e=>{if(e.key==="Enter") e.currentTarget.blur();}}/>;
}
function referenceText(row:SetRow,current:SetRow[],previous:SetRow[]){
  const numbers=(rows:SetRow[])=>Array.from(new Set(rows.filter(r=>r.set_type===row.set_type).map(r=>r.set_number))).sort((a,b)=>a-b);
  const n=numbers(previous)[numbers(current).indexOf(row.set_number)];
  const matches=previous.filter(r=>r.set_type===row.set_type&&r.set_number===n);
  const format=(r:SetRow)=>`${r.weight_kg??"—"} × ${r.reps??"—"}`;
  const exact=matches.find(r=>r.side===row.side)??matches.find(r=>r.side==="both");
  if(exact)return format(exact);
  if(row.side==="both"&&matches.length)return matches.map(r=>`${r.side==="left"?"I":"D"}: ${format(r)}`).join(" / ");
  return "—";
}
