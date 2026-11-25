"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import type { CSSProperties } from "react";
import { ArrowLeft, Plus, Dumbbell, X } from "lucide-react";
import { createClient } from "../lib/supabase/client";

type Session = { id: string; name: string; session_date: string; status: string };
type Exercise = { id: string; name: string; equipment: string | null; is_active: boolean; is_unilateral: boolean; image_path: string | null };
type Entry = { id: string; exercise_id: string; sort_order: number };
type SetRow = { id: string; training_exercise_id: string; set_number: number; set_type: "warmup" | "working"; weight_kg: number | null; reps: number | null; side: "both" | "left" | "right"; is_completed: boolean; completed_at: string | null };
const setFields = "id,training_exercise_id,set_number,set_type,weight_kg,reps,side,is_completed,completed_at";
const C = { green: "#7D8C82", dark: "#596B60", text: "#25382F", muted: "#78847B", border: "#E5EAE5", pale: "#EEF2EE" };
const card: CSSProperties = { background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, padding: 16 };
const btn: CSSProperties = { fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", border: 0, borderRadius: 12, padding: 12, color: C.dark, background: C.pale };
export default function StrengthSession({ sessionId, onBack }: { sessionId: string; onBack: () => void }) {
  const db = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [sets, setSets] = useState<SetRow[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [library, setLibrary] = useState<Exercise[]>([]);
  const [photos,setPhotos]=useState<Record<string,string>>({});
  const [preview,setPreview]=useState<string|null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [picker, setPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const lock = useRef(false);
  useEffect(() => {
    let alive = true;
    setLoading(true); setError(""); setSession(null); setEntries([]); setSets([]); setPicker(false);
    async function load() {
      try {
        const [s,e,l] = await Promise.all([
          db.from("training_sessions").select("id,name,session_date,status").eq("id",sessionId).single(),
          db.from("training_exercises").select("id,exercise_id,sort_order").eq("session_id",sessionId).order("sort_order").order("id"),
          db.from("exercise_library").select("id,name,equipment,is_active,is_unilateral,image_path").order("name").order("id")
        ]);
        if(s.error) throw s.error; if(e.error) throw e.error; if(l.error) throw l.error;
        const ids = (e.data ?? []).map(x=>x.id);
        const rows = ids.length ? await db.from("training_sets").select(setFields).in("training_exercise_id",ids).order("set_number").order("id") : {data:[],error:null};
        if(rows.error) throw rows.error;
        if(alive) { setSets((rows.data ?? []) as SetRow[]); setSession(s.data); setEntries(e.data ?? []); setLibrary(l.data ?? []); }
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
      if(alive) setPhotos(Object.fromEntries((data??[]).filter(x=>x.path&&x.signedUrl).map(x=>[x.path!,x.signedUrl])));
    }
    void loadPhotos(); return ()=>{alive=false;};
  },[db,library]);
  async function add(exercise: Exercise) {
    if(lock.current || !session || session.status === "completed" || !exercise.is_active) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const order = entries.reduce((max,e) => Math.max(max,e.sort_order),-1)+1;
      const {data,error} = await db.from("training_exercises").insert({session_id:session.id,exercise_id:exercise.id,sort_order:order}).select("id,exercise_id,sort_order").single();
      if(error) throw error;
      setEntries(old => [...old,data]); setPicker(false); setSearch("");
    } catch(err) { setError((err as {message?:string}).message ?? "No se pudo añadir el ejercicio."); }
    finally { lock.current = false; setBusy(false); }
  }
  async function mutate(action: () => Promise<void>) {
    if(lock.current || !session || session.status === "completed") return;
    lock.current=true; setBusy(true); setError("");
    try { await action(); } catch(err) { setError((err as {message?:string}).message ?? "No se pudo guardar la serie."); }
    finally { lock.current=false; setBusy(false); }
  }
  function addSet(entry: Entry, side: SetRow["side"]) {
    void mutate(async()=>{
      const number=sets.filter(s=>s.training_exercise_id===entry.id).reduce((m,s)=>Math.max(m,s.set_number),0)+1;
      const {data,error}=await db.from("training_sets").insert({training_exercise_id:entry.id,set_number:number,side,set_type:"working"}).select(setFields).single();
      if(error) throw error; setSets(old=>[...old,data as SetRow]);
    });
  }
  function saveSet(row: SetRow, patch: Partial<SetRow>) {
    void mutate(async()=>{
      const next={...row,...patch};
      if(next.weight_kg!==null && (!Number.isFinite(next.weight_kg)||next.weight_kg<0)) throw new Error("Peso no válido.");
      if(next.reps!==null && (!Number.isInteger(next.reps)||next.reps<=0)) throw new Error("Introduce repeticiones enteras positivas.");
      if(next.is_completed && next.reps===null) throw new Error("Introduce las repeticiones antes de completar la serie.");
      const {data,error}=await db.from("training_sets").update(patch).eq("id",row.id).select(setFields).single();
      if(error) throw error; setSets(old=>old.map(s=>s.id===row.id?data as SetRow:s));
    });
  }
  function splitSet(row:SetRow){
    void mutate(async()=>{
      const {error}=await db.rpc("split_training_set",{p_set_id:row.id});
      if(error) throw error;
      const result=await db.from("training_sets").select(setFields).eq("training_exercise_id",row.training_exercise_id).eq("set_number",row.set_number);
      if(result.error){setRetry(n=>n+1);throw result.error;}
      setSets(old=>[...old.filter(s=>s.training_exercise_id!==row.training_exercise_id||s.set_number!==row.set_number),...(result.data as SetRow[])]);
    });
  }
  function changeType(row:SetRow){
    void mutate(async()=>{
      const {data,error}=await db.from("training_sets").update({set_type:row.set_type==="warmup"?"working":"warmup"}).eq("training_exercise_id",row.training_exercise_id).eq("set_number",row.set_number).select(setFields);
      if(error) throw error;
      setSets(old=>old.map(s=>(data as SetRow[]).find(d=>d.id===s.id)??s));
    });
  }
  function removeSet(row:SetRow) {
    if(row.is_completed && !window.confirm("¿Eliminar esta serie completada?")) return;
    void mutate(async()=>{const {error}=await db.from("training_sets").delete().eq("id",row.id); if(error) throw error; setSets(old=>old.filter(s=>s.id!==row.id));});
  }
  const field: CSSProperties={width:"100%",minWidth:0,boxSizing:"border-box",fontFamily:"inherit",fontSize:16,padding:"8px 4px",border:`1px solid ${C.border}`,borderRadius:8,textAlign:"center",color:C.text};
  const readOnly=busy||session?.status==="completed";
  const filtered = library.filter(e => e.is_active && `${e.name} ${e.equipment ?? ""}`.toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es")));
  return <div style={{display:"flex",flexDirection:"column",gap:16,width:"100%",color:C.text}}>
    <button type="button" disabled={busy} onClick={onBack} style={{...btn,background:"none",padding:0,display:"flex",alignItems:"center",gap:8,alignSelf:"flex-start"}}><ArrowLeft size={18}/> Fuerza</button>
    {preview && <div role="dialog" aria-modal="true" aria-label="Fotografía del ejercicio" onClick={()=>setPreview(null)} style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}><button type="button" aria-label="Cerrar fotografía" onClick={()=>setPreview(null)} style={{...btn,position:"absolute",top:24,right:20}}><X size={20}/></button><img src={preview} alt="Fotografía del ejercicio" style={{maxWidth:"100%",maxHeight:"85vh",objectFit:"contain",borderRadius:12}}/></div>}
    {error && <div role="alert" style={{...card,color:"#9B3C3C",fontSize:13}}>{error}</div>}
    {loading ? <p style={{color:C.muted}}>Cargando entrenamiento…</p> : !session ? <button style={btn} onClick={()=>setRetry(n=>n+1)}>Reintentar</button> : <>
      <header><h2 style={{margin:0,fontSize:24,fontWeight:600}}>{session.name}</h2><p style={{fontSize:13,color:C.muted,margin:"5px 0 0"}}>{new Date(`${session.session_date}T12:00:00`).toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"})} · {session.status === "completed" ? "Finalizado" : session.status === "in_progress" ? "En curso" : "Borrador"}</p></header>
      {entries.length === 0 && <div style={{...card,textAlign:"center",color:C.muted,fontSize:13}}><Dumbbell size={28} color={C.green}/><p>Todavía no hay ejercicios en esta sesión.</p></div>}
      {entries.map((entry,i)=>{const exercise=library.find(e=>e.id===entry.exercise_id); const rows=sets.filter(s=>s.training_exercise_id===entry.id).sort((a,b)=>a.set_number-b.set_number || a.side.localeCompare(b.side)); const unilateral=!!exercise?.is_unilateral||rows.some(r=>r.side!=="both"); const columns=unilateral?"30px minmax(0,1fr) minmax(0,1fr) minmax(65px,1.15fr) 25px 20px":"34px repeat(2,minmax(0,1fr)) 30px 24px"; const photo=exercise?.image_path?photos[exercise.image_path]:undefined; return <section key={entry.id} style={{...card,display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}><div style={{background:C.pale,borderRadius:12,width:48,height:48,flexShrink:0,display:"grid",placeItems:"center",overflow:"hidden"}}>{photo?<button type="button" aria-label="Ampliar fotografía" onClick={()=>setPreview(photo)} style={{border:0,padding:0,width:48,height:48,background:"none",cursor:"pointer"}}><img src={photo} alt={exercise?.name??"Ejercicio"} style={{width:"100%",height:"100%",objectFit:"cover"}}/></button>:<Dumbbell size={22} color={C.dark}/>}</div><div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:14}}>{i+1}. {exercise?.name ?? "Ejercicio"}</div><div style={{fontSize:12,color:C.muted}}>{exercise?.equipment ?? "Sin equipamiento indicado"}{exercise && !exercise.is_active ? " · Archivado" : ""}</div></div></div>
        {rows.length>0 && <div style={{display:"grid",gridTemplateColumns:columns,gap:5,alignItems:"center",fontSize:11,color:C.muted,textAlign:"center"}}><span>Serie</span><span>Kg</span><span>Reps</span>{unilateral&&<span>Lado</span>}<span>Hecha</span><span/></div>}
        {rows.map((row)=><div key={row.id} style={{display:"flex",flexDirection:"column",gap:5,background:row.is_completed?C.pale:"transparent",borderRadius:10,padding:"4px 0"}}>
          <div style={{display:"grid",gridTemplateColumns:columns,gap:5,alignItems:"center"}}>
            <button disabled={readOnly} title="Cambiar tipo de serie" style={{...btn,padding:"8px 2px"}} onClick={()=>changeType(row)}>{row.set_type==="warmup"?"A":new Set(rows.filter(s=>s.set_number<=row.set_number&&s.set_type==="working").map(s=>s.set_number)).size}</button>
            {(["weight_kg","reps"] as const).map(k=><NumericField key={k} label={k==="weight_kg"?"Peso en kg":"Repeticiones"} value={row[k]} disabled={readOnly} style={field} onSave={v=>saveSet(row,{[k]:v})}/>)}
            {unilateral && (row.side==="both"?<select aria-label="Lado" disabled={readOnly} value="both" onChange={()=>splitSet(row)} style={{...field,fontSize:12,padding:"8px 1px"}}><option value="both">Ambos</option><option value="split">Separar</option></select>:<span style={{fontSize:12,textAlign:"center"}}>{row.side==="left"?"Izq.":"Der."}</span>)}
            <input aria-label="Serie completada" type="checkbox" disabled={readOnly} checked={row.is_completed} onChange={e=>saveSet(row,{is_completed:e.target.checked,completed_at:e.target.checked?new Date().toISOString():null})} style={{accentColor:C.green,width:20,height:20,margin:"auto"}}/>
            <button type="button" aria-label="Eliminar serie" disabled={readOnly} style={{...btn,padding:3,background:"none"}} onClick={()=>removeSet(row)}><X size={16}/></button>
          </div>

        </div>)}
        {rows.length>0 && <small style={{color:C.muted}}>A = aproximación. Pulsa el número para cambiar el tipo.</small>}
        {session.status!=="completed" && <button type="button" disabled={busy} style={{...btn,display:"flex",alignItems:"center",justifyContent:"center",gap:6}} onClick={()=>addSet(entry,"both")}><Plus size={16}/> Añadir serie</button>}
      </section>})}
      {session.status !== "completed" && !picker && <button type="button" style={{...btn,display:"flex",alignItems:"center",justifyContent:"center",gap:8}} onClick={()=>{setPicker(true);setSearch("");}}><Plus size={18}/> Añadir ejercicio</button>}
      {picker && <section style={{...card,display:"flex",flexDirection:"column",gap:12}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}><strong style={{fontSize:15}}>Seleccionar ejercicio</strong><button type="button" disabled={busy} style={{...btn,display:"flex",alignItems:"center",gap:6}} onClick={()=>setPicker(false)}><X size={16}/> Cerrar</button></div><input aria-label="Buscar ejercicio" placeholder="Buscar ejercicio o equipamiento" value={search} onChange={e=>setSearch(e.target.value)} style={{fontFamily:"inherit",fontSize:16,padding:12,border:`1px solid ${C.border}`,borderRadius:12,width:"100%",boxSizing:"border-box"}}/>{filtered.length===0 && <p style={{fontSize:13,color:C.muted}}>No hay ejercicios disponibles.</p>}{filtered.map(e=><button type="button" key={e.id} disabled={busy} onClick={()=>void add(e)} style={{...btn,background:"#fff",border:`1px solid ${C.border}`,display:"flex",alignItems:"center",textAlign:"left",gap:10}}><div style={{flex:1}}>{e.name}<div style={{fontSize:11,fontWeight:400,color:C.muted}}>{e.equipment ?? ""}</div></div><Plus size={18}/></button>)}</section>}
    </>}
  </div>;
}

function NumericField({label,value,disabled,style,onSave}:{label:string;value:number|null;disabled:boolean;style:CSSProperties;onSave:(v:number|null)=>void}) {
  const [draft,setDraft]=useState(value===null?"":String(value));
  useEffect(()=>{setDraft(value===null?"":String(value));},[value,disabled]);
  return <input aria-label={label} inputMode={label==="Repeticiones"?"numeric":"decimal"} placeholder="—" value={draft} disabled={disabled} style={style} onChange={e=>setDraft(e.target.value)} onBlur={()=>{const raw=draft.trim().replace(",","."); const next=raw===""?null:Number(raw); if(next!==value) onSave(next);}} onKeyDown={e=>{if(e.key==="Enter") e.currentTarget.blur();}}/>;
}
