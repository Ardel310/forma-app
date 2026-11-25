"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import type { CSSProperties } from "react";
import { ArrowLeft, Plus, Dumbbell, X } from "lucide-react";
import { createClient } from "../lib/supabase/client";

type Session = { id: string; name: string; session_date: string; status: string };
type Exercise = { id: string; name: string; equipment: string | null; is_active: boolean };
type Entry = { id: string; exercise_id: string; sort_order: number };
const C = { green: "#7D8C82", dark: "#596B60", text: "#25382F", muted: "#78847B", border: "#E5EAE5", pale: "#EEF2EE" };
const card: CSSProperties = { background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, padding: 16 };
const btn: CSSProperties = { fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", border: 0, borderRadius: 12, padding: 12, color: C.dark, background: C.pale };
export default function StrengthSession({ sessionId, onBack }: { sessionId: string; onBack: () => void }) {
  const db = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [library, setLibrary] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [picker, setPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const lock = useRef(false);
  useEffect(() => {
    let alive = true;
    setLoading(true); setError(""); setSession(null); setEntries([]); setPicker(false);
    async function load() {
      try {
        const [s,e,l] = await Promise.all([
          db.from("training_sessions").select("id,name,session_date,status").eq("id",sessionId).single(),
          db.from("training_exercises").select("id,exercise_id,sort_order").eq("session_id",sessionId).order("sort_order").order("id"),
          db.from("exercise_library").select("id,name,equipment,is_active").order("name").order("id")
        ]);
        if(s.error) throw s.error; if(e.error) throw e.error; if(l.error) throw l.error;
        if(alive) { setSession(s.data); setEntries(e.data ?? []); setLibrary(l.data ?? []); }
      } catch(err) { if(alive) setError((err as {message?:string}).message ?? "No se pudo cargar la sesión."); }
      finally { if(alive) setLoading(false); }
    }
    void load(); return () => { alive = false; };
  },[db,sessionId,retry]);
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
  const filtered = library.filter(e => e.is_active && `${e.name} ${e.equipment ?? ""}`.toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es")));
  return <div style={{display:"flex",flexDirection:"column",gap:16,width:"100%",color:C.text}}>
    <button type="button" disabled={busy} onClick={onBack} style={{...btn,background:"none",padding:0,display:"flex",alignItems:"center",gap:8,alignSelf:"flex-start"}}><ArrowLeft size={18}/> Fuerza</button>
    {error && <div role="alert" style={{...card,color:"#9B3C3C",fontSize:13}}>{error}</div>}
    {loading ? <p style={{color:C.muted}}>Cargando entrenamiento…</p> : !session ? <button style={btn} onClick={()=>setRetry(n=>n+1)}>Reintentar</button> : <>
      <header><h2 style={{margin:0,fontSize:24,fontWeight:600}}>{session.name}</h2><p style={{fontSize:13,color:C.muted,margin:"5px 0 0"}}>{new Date(`${session.session_date}T12:00:00`).toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"})} · {session.status === "completed" ? "Finalizado" : session.status === "in_progress" ? "En curso" : "Borrador"}</p></header>
      {entries.length === 0 && <div style={{...card,textAlign:"center",color:C.muted,fontSize:13}}><Dumbbell size={28} color={C.green}/><p>Todavía no hay ejercicios en esta sesión.</p></div>}
      {entries.map((entry,i)=>{const exercise=library.find(e=>e.id===entry.exercise_id); return <div key={entry.id} style={{...card,display:"flex",alignItems:"center",gap:12}}><div style={{background:C.pale,borderRadius:12,padding:10}}><Dumbbell size={22} color={C.dark}/></div><div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:14}}>{i+1}. {exercise?.name ?? "Ejercicio"}</div><div style={{fontSize:12,color:C.muted}}>{exercise?.equipment ?? "Sin equipamiento indicado"}{exercise && !exercise.is_active ? " · Archivado" : ""}</div><div style={{fontSize:11,color:C.muted,marginTop:5}}>Registro de series pendiente de implementación</div></div></div>})}
      {session.status !== "completed" && !picker && <button type="button" style={{...btn,display:"flex",alignItems:"center",justifyContent:"center",gap:8}} onClick={()=>{setPicker(true);setSearch("");}}><Plus size={18}/> Añadir ejercicio</button>}
      {picker && <section style={{...card,display:"flex",flexDirection:"column",gap:12}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}><strong style={{fontSize:15}}>Seleccionar ejercicio</strong><button type="button" disabled={busy} style={{...btn,display:"flex",alignItems:"center",gap:6}} onClick={()=>setPicker(false)}><X size={16}/> Cerrar</button></div><input aria-label="Buscar ejercicio" placeholder="Buscar ejercicio o equipamiento" value={search} onChange={e=>setSearch(e.target.value)} style={{fontFamily:"inherit",fontSize:16,padding:12,border:`1px solid ${C.border}`,borderRadius:12,width:"100%",boxSizing:"border-box"}}/>{filtered.length===0 && <p style={{fontSize:13,color:C.muted}}>No hay ejercicios disponibles.</p>}{filtered.map(e=><button type="button" key={e.id} disabled={busy} onClick={()=>void add(e)} style={{...btn,background:"#fff",border:`1px solid ${C.border}`,display:"flex",alignItems:"center",textAlign:"left",gap:10}}><div style={{flex:1}}>{e.name}<div style={{fontSize:11,fontWeight:400,color:C.muted}}>{e.equipment ?? ""}</div></div><Plus size={18}/></button>)}</section>}
    </>}
  </div>;
}
