"use client";
import TrainingPlans from "./TrainingPlans";
import FormaLoader from "./FormaLoader";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, ChevronRight, ClipboardList, Copy, Dumbbell, History, PlayCircle } from "lucide-react";
import { createClient } from "../lib/supabase/client";

import StrengthSessionForm from "./StrengthSessionForm";
import StrengthSession from "./StrengthSession";
import StrengthSessionSummary from "./StrengthSessionSummary";

type Session = { id: string; name: string; session_date: string; status: string; duration_minutes: number | null; active_calories: number | null };
type Group = {id:string;name:string;color:string};
function todayMadrid(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Madrid",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
function shift(date:string,days:number){const d=new Date(date+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
function weekStart(date:string){return shift(date,-((new Date(date+"T12:00:00Z").getUTCDay()+6)%7));}
type View = "home" | "plans" | "new" | "repeat" | "continue" | "history";
const C = { green: "#7D8C82", dark: "#596B60", text: "#25382F", muted: "#78847B", pale: "#EEF2EE", border: "#E5EAE5", white: "#FFFFFF" };
const card: CSSProperties = { background: C.white, border: `1px solid ${C.border}`, borderRadius: 18, padding: 16 };
const button: CSSProperties = { fontFamily: "inherit", cursor: "pointer", color: C.text, textAlign: "left", width: "100%" };
const labels = { plans: "Planes de entrenamiento", new: "Nuevo entrenamiento", repeat: "Repetir entrenamiento", continue: "Continuar entrenamiento", history: "Histórico de fuerza" };
function dateLabel(date: string) { return new Date(`${date}T12:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }); }

export default function StrengthTraining({ onBack }: { onBack: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [view, setView] = useState<View>("home");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pending, setPending] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [groupMap,setGroupMap]=useState<Record<string,Group[]>>({});
  const [search,setSearch]=useState("");
  const [group,setGroup]=useState("");
  const [period,setPeriod]=useState("all");
  const [from,setFrom]=useState(""); const [to,setTo]=useState("");
  const [source,setSource]=useState<Session|null>(null);
  const [name,setName]=useState(""); const [date,setDate]=useState(todayMadrid);
  const [duplicating,setDuplicating]=useState(false); const [duplicateError,setDuplicateError]=useState("");
  const today=todayMadrid(), monday=weekStart(today), sunday=shift(monday,6);
  const weekly=sessions.filter(s=>s.session_date>=monday&&s.session_date<=sunday);
  const groups=Array.from(new Map(Object.values(groupMap).flat().map(g=>[g.id,g])).values()).sort((a,b)=>a.name.localeCompare(b.name,"es"));
  const cutoff=period==="week"?monday:period==="month"?today.slice(0,7)+"-01":period==="3m"||period==="6m"?shift(today,period==="3m"?-90:-180):period==="year"?shift(today,-365):period==="custom"?from:"";
  const visible=sessions.filter(s=>s.name.toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es"))&&(!group||(groupMap[s.id]??[]).some(g=>g.id===group))&&(!cutoff||s.session_date>=cutoff)&&(period!=="custom"||!to||s.session_date<=to));
  async function duplicate(){
    if(!source||duplicating)return;
    if(!name.trim()||!date||date>today){setDuplicateError("Introduce un nombre y una fecha válida.");return;}
    setDuplicating(true);setDuplicateError("");
    try{const r=await supabase.rpc("duplicate_training_session",{p_source_session_id:source.id,p_name:name.trim(),p_session_date:date});if(r.error)throw r.error;if(typeof r.data!=="string")throw new Error("No se recibió la nueva sesión.");setSource(null);openSession(r.data);}
    catch(e){setDuplicateError((e as {message?:string}).message??"No se pudo duplicar.");}finally{setDuplicating(false);}
  }
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError("");
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError || !auth.user) throw new Error("No se ha podido comprobar tu sesión.");
        const fields = "id,name,session_date,status,duration_minutes,active_calories";
        const all:Session[]=[];
        for(let offset=0;;offset+=500){const r=await supabase.from("training_sessions").select(fields).eq("user_id",auth.user.id).eq("status","completed").order("session_date",{ascending:false}).order("created_at",{ascending:false}).order("id").range(offset,offset+499);if(r.error)throw r.error;all.push(...(r.data??[]));if((r.data??[]).length<500)break;}
        const [unfinished] = await Promise.all([
          supabase.from("training_sessions").select(fields).eq("user_id", auth.user.id).in("status", ["draft", "in_progress"]).order("created_at", { ascending: false }),
        ]);
        if(unfinished.error)throw unfinished.error;
        const map:Record<string,Group[]>={};
        for(let i=0;i<all.length;i+=100){
          const ids=all.slice(i,i+100).map(s=>s.id);
          for(let offset=0;;offset+=500){
            const r=await supabase.from("training_exercises").select("id,session_id,exercise_library!training_exercises_exercise_id_fkey(exercise_muscle_groups(is_primary,muscle_groups(id,name,color)))").in("session_id",ids).order("id").range(offset,offset+499);
            if(r.error)throw r.error;
            for(const raw of r.data??[]){const e=raw as unknown as {session_id:string;exercise_library:{exercise_muscle_groups:{is_primary:boolean;muscle_groups:Group|null}[]}|null};for(const link of e.exercise_library?.exercise_muscle_groups??[]){const g=link.muscle_groups;if(link.is_primary&&g){const list=map[e.session_id]??(map[e.session_id]=[]);if(!list.some(x=>x.id===g.id))list.push(g);}}}
            if((r.data??[]).length<500)break;
          }
        }
        if (!cancelled) { setSessions(all); setPending(unfinished.data || []);setGroupMap(map); }
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "No se han podido cargar los entrenamientos."); }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [supabase, retry]);
  function open(next: View) { setSource(null); setView(next); window.scrollTo({ top: 0 }); }
  const actions = [
    { key: "plans" as const, Icon: ClipboardList, description: "Crea y reutiliza tus rutinas habituales." },
    { key: "repeat" as const, Icon: Copy, description: "Duplica una sesión anterior." },
    { key: "continue" as const, Icon: PlayCircle, description: pending.length ? "Tienes sesiones pendientes." : "Recupera una sesión pendiente." },
    { key: "history" as const, Icon: History, description: "Consulta tus entrenamientos." },
  ];
  function openSession(id: string) { setSelectedId(id); window.scrollTo({ top: 0 }); }
  const completedSelection=sessions.find(s=>s.id===selectedId);
  if(selectedId && completedSelection) return <StrengthSessionSummary key={selectedId} sessionId={selectedId} onBack={()=>{setSelectedId(null);setRetry(n=>n+1);window.scrollTo({top:0});}} onRepeat={()=>{setSelectedId(null);open("repeat");setSource(completedSelection);setName(completedSelection.name);setDate(today);setDuplicateError("");}}/>;
  if (selectedId) return <StrengthSession key={selectedId} sessionId={selectedId} onBack={() => { setSelectedId(null); setRetry(n => n + 1); open("home"); }} />;
  if (view === "plans") return <TrainingPlans onBack={() => open("home")} />;
  if (view === "new") return <StrengthSessionForm onBack={() => open("home")} onCreated={(id) => { setRetry(n => n + 1); open("home"); openSession(id); }} />;
  const months=Array.from(new Set(visible.map(s=>s.session_date.slice(0,7))));
  const totalMinutes=visible.reduce((n,s)=>n+(s.duration_minutes??0),0);
  const totalCalories=visible.reduce((n,s)=>n+(s.active_calories??0),0);
  const number=(n:number)=>n.toLocaleString("es-ES",{maximumFractionDigits:1});
  function selectSource(s:Session){setSource(s);setName(s.name);setDate(today);setDuplicateError("");window.scrollTo({top:0});}
  function sessionCard(s:Session,repeat=false){return <button type="button" key={s.id} onClick={()=>repeat?selectSource(s):openSession(s.id)} style={{...button,...card,padding:10,borderRadius:12,display:"flex",alignItems:"center",gap:8,minWidth:0}}><span style={{flex:1,minWidth:0,display:"grid",gap:4}}><strong style={{fontSize:13,fontWeight:600,overflowWrap:"anywhere"}}>{s.name}</strong><span style={{fontSize:11,color:C.muted}}>{dateLabel(s.session_date)}{s.duration_minutes!=null?` · ${s.duration_minutes} min`:""}{s.active_calories!=null?` · ${number(s.active_calories)} kcal`:""}</span>{(groupMap[s.id]??[]).length>0&&<span style={{display:"flex",flexWrap:"wrap",gap:4}}>{(groupMap[s.id]??[]).map(g=><span key={g.id} style={{background:g.color+"22",borderRadius:5,padding:"2px 5px",fontSize:10,color:C.text}}>{g.name}</span>)}</span>}</span>{repeat?<span style={{display:"flex",alignItems:"center",gap:4,flexShrink:0,background:C.pale,color:C.dark,borderRadius:8,padding:"7px 8px",fontSize:11,fontWeight:600}}><Copy size={14}/> Repetir</span>:<ChevronRight size={17} color={C.green} style={{flexShrink:0}}/>}</button>}
  const field:CSSProperties={width:"100%",boxSizing:"border-box",fontFamily:"inherit",fontSize:16,padding:12,border:`1px solid ${C.border}`,borderRadius:12,background:C.white,color:C.text,minWidth:0};
  const smallButton:CSSProperties={...button,width:"auto",border:0,borderRadius:10,padding:10,background:C.pale,color:C.dark,fontWeight:600};
  return <section style={{ display: "grid", gap: 14, color: C.text }}>
    <button
      type="button"
      onClick={() => view === "home" ? onBack() : open("home")}
      style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", padding: 0, color: C.dark, fontSize: 13, fontWeight: 400, fontFamily: "inherit", justifySelf: "start", cursor: "pointer" }}
    >
      <ArrowLeft size={18} />
      {view === "home" ? "Entrenamiento" : "Fuerza"}
    </button>
    <h2 style={{ margin: "4px 0 0", fontSize: 23, fontWeight: 600, color: C.text }}>{view === "home" ? "Fuerza" : labels[view]}</h2>
    {view !== "home" ? <div style={{display:"grid",gap:8}}>
      {(view === "repeat" || view === "history") ? <div style={{display:"grid",gap:8}}>
      {source?<><strong>Repetir {source.name}</strong><label>Nombre<input style={field} value={name} onChange={e=>setName(e.target.value)}/></label><label>Fecha<input type="date" max={today} style={field} value={date} onChange={e=>setDate(e.target.value)}/></label>{duplicateError&&<p role="alert">{duplicateError}</p>}<button style={{...smallButton,background:C.green,color:C.white,textAlign:"center"}} disabled={duplicating} onClick={()=>void duplicate()}>{duplicating?"Duplicando…":"Comenzar entrenamiento"}</button><button style={smallButton} disabled={duplicating} onClick={()=>setSource(null)}>Cancelar</button></>:<>
      <input style={field} placeholder="Buscar entrenamiento…" value={search} onChange={e=>setSearch(e.target.value)}/>
      <div style={{position:"relative",minWidth:0}}><select style={{...field,appearance:"none",WebkitAppearance:"none",paddingRight:44}} aria-label="Grupo muscular" value={group} onChange={e=>setGroup(e.target.value)}><option value="">Todos los grupos musculares</option>{groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select><ChevronDown aria-hidden="true" size={16} color={C.dark} style={{position:"absolute",right:16,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}/></div>
      <div style={{position:"relative",minWidth:0}}><select style={{...field,appearance:"none",WebkitAppearance:"none",paddingRight:44}} aria-label="Fecha" value={period} onChange={e=>setPeriod(e.target.value)}>{[["all","Todas las fechas"],["week","Esta semana"],["month","Este mes"],["3m","Últimos 90 días"],["6m","Últimos 180 días"],["year","Últimos 365 días"],["custom","Personalizado"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><ChevronDown aria-hidden="true" size={16} color={C.dark} style={{position:"absolute",right:16,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}/></div>
      {period==="custom"&&<><label>Desde<input type="date" style={field} value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Hasta<input type="date" style={field} value={to} onChange={e=>setTo(e.target.value)}/></label></>}
      {loading?<FormaLoader size={44} minHeight={110}/>:error?<><p role="alert">{error}</p><button style={smallButton} onClick={()=>setRetry(n=>n+1)}>Reintentar</button></>:<>{view==="history"?<><div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:6}}>{[[String(visible.length),"Entrenos"],[visible.some(s=>s.duration_minutes!=null)?`${Math.floor(totalMinutes/60)} h ${totalMinutes%60} min`:"—","Duración"],[visible.some(s=>s.active_calories!=null)?number(totalCalories):"—","Kcal activas"]].map(([value,label])=><div key={label} style={{background:C.pale,borderRadius:10,padding:8,minWidth:0}}><strong style={{fontSize:15,overflowWrap:"anywhere"}}>{value}</strong><div style={{fontSize:10,color:C.muted}}>{label}</div></div>)}</div><small style={{color:C.muted}}>Totales de los datos registrados.</small>{months.map(month=><div key={month} style={{display:"grid",gap:6}}><h3 style={{fontSize:13,fontWeight:600,margin:"6px 0 0",textTransform:"capitalize"}}>{new Date(month+"-01T12:00:00").toLocaleDateString("es-ES",{month:"long",year:"numeric"})}</h3>{visible.filter(s=>s.session_date.startsWith(month)).map(s=>sessionCard(s))}</div>)}</>:<><small style={{color:C.muted}}>{visible.length} {visible.length===1?"entrenamiento":"entrenamientos"}</small>{visible.map(s=>sessionCard(s,true))}</>}{!visible.length&&<p style={{fontSize:13,color:C.muted}}>No hay entrenamientos con estos filtros.</p>}</>}
      </>}
      </div> : view === "continue" ? <>
        {loading ? <FormaLoader size={44} minHeight={110}/> : error ? <><p role="alert">{error}</p><button type="button" onClick={() => setRetry(n => n + 1)}>Reintentar</button></> : pending.length === 0 ? <p style={{ fontSize: 13, color: C.muted }}>No hay sesiones pendientes.</p> : <>
          <p style={{margin:0,fontSize:13,color:C.muted}}>{pending.length} {pending.length===1?"entrenamiento pendiente":"entrenamientos pendientes"}</p>
          {pending.map(s => <button type="button" key={s.id} onClick={() => openSession(s.id)} style={{ ...button, ...card, display:"flex",alignItems:"center",gap:8 }}><span style={{flex:1,minWidth:0,overflowWrap:"anywhere"}}><strong style={{fontSize:14}}>{s.name}</strong><span style={{display:"block",fontSize:12,color:C.muted,marginTop:4}}>{dateLabel(s.session_date)}</span></span><span style={{fontSize:10,fontWeight:600,whiteSpace:"nowrap",borderRadius:6,padding:"4px 7px",background:s.status==="draft"?"#F2EADF":"#E4EBE4",color:s.status==="draft"?"#806747":C.dark}}>{s.status==="draft"?"Borrador":"En curso"}</span><ChevronRight size={18} color={C.green} style={{flexShrink:0}}/></button>)}
        </>}
      </> : <p style={{ margin: 0, fontSize: 14, color: C.muted }}>Esta funcionalidad se incorporará en los siguientes pasos del desarrollo.</p>}
    </div> : <>
      <p style={{ margin: 0, color: C.muted, fontSize: 13 }}>Registra tus entrenamientos y sigue tu evolución.</p>
      <button type="button" onClick={() => open("new")} style={{ ...button, border: 0, background: C.green, color: C.white, borderRadius: 18, padding: 20, display: "grid", gap: 10 }}>
        <Dumbbell size={30}/><strong style={{ fontSize: 19, fontWeight: 600 }}>Nuevo entrenamiento</strong><span style={{ fontSize: 13 }}>Comienza una sesión desde cero.</span><span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14, fontWeight: 500 }}>Empezar entrenamiento <ArrowRight size={20}/></span>
      </button>
      {actions.map(({key, Icon, description}) => <button key={key} type="button" onClick={() => open(key)} style={{ ...button, ...card, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ display: "grid", placeItems: "center", width: 44, height: 44, flexShrink: 0, borderRadius: 12, background: C.pale, color: C.dark }}><Icon size={22}/></span>
        <span style={{ flex: 1, minWidth: 0, display: "grid", gap: 4 }}><strong style={{ fontSize: 14, fontWeight: 600 }}>{labels[key]}</strong><span style={{ color: C.muted, fontSize: 12 }}>{description}</span></span><ChevronRight size={19} color={C.green} style={{ flexShrink: 0 }}/>
      </button>)}
      <h3 style={{ margin: "8px 0 0", fontSize: 16, fontWeight: 600 }}>Entrenamientos de esta semana</h3>
      {loading ? <div style={card}><FormaLoader size={44} minHeight={110}/></div> : error ? <div style={card}><p role="alert" style={{ fontSize: 13 }}>{error}</p><button type="button" onClick={() => setRetry(n => n + 1)} style={{ ...button, border: 0, background: C.pale, borderRadius: 10, padding: 10 }}>Reintentar</button></div> : weekly.length === 0 ? <div style={{ ...card, textAlign: "center", color: C.muted, padding: 24 }}><Dumbbell size={28} color={C.green}/><p style={{ fontSize: 13, margin: "8px 0 0" }}>Todavía no hay entrenamientos finalizados esta semana.</p></div> : weekly.map(s=>sessionCard(s))}
    </>}
  </section>;
}
