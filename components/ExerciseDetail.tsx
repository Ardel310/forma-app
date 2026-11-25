"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowLeft, Star, Pencil, Dumbbell, Plus, X, Archive, RotateCcw, ChevronRight, ClipboardList, ChartNoAxesCombined } from "lucide-react";
import { createClient } from "../lib/supabase/client";

type Exercise = {
  id: string; name: string; equipment: string | null; gym: string | null;
  image_path: string | null; technique_notes: string | null; description: string | null;
  is_favorite: boolean; is_active: boolean; is_unilateral: boolean;
};
type Group = { id: string; name: string; color: string; is_active: boolean };
type Relation = { muscle_group_id: string; is_primary: boolean };
type Variant = { id: string; exercise_id: string; variant_id: string; notes: string | null };
type Props = { exercise: Exercise; onBack: () => void; onEdit: () => void; onOpenExercise: (exercise: Exercise) => void; onChanged: () => void };
const C = { green: "#7D8C82", dark: "#596B60", text: "#25382F", muted: "#78847B", pale: "#EEF2EE", border: "#E5EAE5", white: "#FFFFFF", danger: "#B45353" };
const card: CSSProperties = { background: C.white, border: `1px solid ${C.border}`, borderRadius: 18, padding: 17, display: "grid", gap: 12 };
const btn: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: 0, borderRadius: 12, padding: "12px 14px", minHeight: 42, background: C.green, color: C.white, fontFamily: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const soft: CSSProperties = { ...btn, background: C.pale, color: C.dark };
const input: CSSProperties = { width: "100%", boxSizing: "border-box", minWidth: 0, padding: 12, border: `1px solid ${C.border}`, borderRadius: 11, fontFamily: "inherit", fontSize: 16, color: C.text, background: C.white };
const heading: CSSProperties = { fontSize: 15, margin: 0, fontWeight: 600 };
const muted: CSSProperties = { fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.7 };
const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const message = (e: unknown) => (e as { message?: string })?.message || "No se pudo completar la operación.";

export default function ExerciseDetail({ exercise, onBack, onEdit, onOpenExercise, onChanged }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [item, setItem] = useState(exercise);
  const [groups, setGroups] = useState<Group[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [library, setLibrary] = useState<Exercise[]>([]);
  const [images, setImages] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [picker, setPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [variantId, setVariantId] = useState("");
  const [notes, setNotes] = useState("");
  const id = exercise.id;

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [a,b,c,d] = await Promise.all([
        supabase.from("exercise_library").select("*").order("name"),
        supabase.from("muscle_groups").select("id,name,color,is_active").order("sort_order"),
        supabase.from("exercise_muscle_groups").select("muscle_group_id,is_primary").eq("exercise_id",id),
        supabase.from("exercise_variants").select("id,exercise_id,variant_id,notes").or(`exercise_id.eq.${id},variant_id.eq.${id}`),
      ]);
      for (const r of [a,b,c,d]) if (r.error) throw r.error;
      const all = (a.data ?? []) as Exercise[];
      const current = all.find(e => e.id === id);
      if (!current) throw new Error("No se encontró el ejercicio.");
      setItem(current); setLibrary(all); setGroups((b.data ?? []) as Group[]); setRelations((c.data ?? []) as Relation[]); setVariants((d.data ?? []) as Variant[]);
      const linked = new Set((d.data ?? []).map(v => v.exercise_id === id ? v.variant_id : v.exercise_id));
      const paths = Array.from(new Set(all.filter(e => e.id === id || linked.has(e.id)).map(e => e.image_path).filter((p): p is string => Boolean(p))));
      const map: Record<string,string> = {};
      if (paths.length) {
        const {data,error} = await supabase.storage.from("exercise-images").createSignedUrls(paths,3600);
        if (error) setError("No se pudieron cargar algunas fotografías.");
        for (const img of data ?? []) if (img.path && img.signedUrl) map[img.path] = img.signedUrl;
      }
      setImages(map);
    } catch(e) { setError(message(e)); }
    finally { setLoading(false); }
  },[supabase,id]);
  useEffect(() => { void load(); },[load]);
  const linkedIds = new Set(variants.map(v => v.exercise_id === id ? v.variant_id : v.exercise_id));
  const candidates = library.filter(e => e.id !== id && e.is_active && !linkedIds.has(e.id) && normalize([e.name,e.equipment].filter(Boolean).join(" ")).includes(normalize(search)));
  async function changeFlag(field: "is_active" | "is_favorite") {
    if (busy || loading) return;
    if (field === "is_active" && !window.confirm(item.is_active ? "¿Desactivar este ejercicio? Se conservará su histórico." : "¿Reactivar este ejercicio?")) return;
    setBusy(true); setError("");
    try {
      const {data,error} = await supabase.from("exercise_library").update({[field]: !item[field]}).eq("id",id).select("*").single();
      if (error) throw error;
      setItem(data as Exercise); onChanged();
    } catch(e) { setError(message(e)); } finally { setBusy(false); }
  }
  async function addVariant() {
    if (busy || loading || !candidates.some(e => e.id === variantId)) return;
    setBusy(true); setError("");
    try {
      const {error} = await supabase.from("exercise_variants").insert({exercise_id:id,variant_id:variantId,notes:notes.trim() || null});
      if (error) throw error;
      setPicker(false); setVariantId(""); setSearch(""); setNotes(""); await load();
    } catch(e) { setError(message(e)); } finally { setBusy(false); }
  }
  async function removeVariant(v: Variant) {
    if (busy || loading || !window.confirm("¿Desvincular esta variante? Ambos ejercicios y sus históricos se conservarán.")) return;
    setBusy(true); setError("");
    try {
      const {error} = await supabase.from("exercise_variants").delete().eq("id",v.id).select("id").single();
      if (error) throw error;
      await load();
    } catch(e) { setError(message(e)); } finally { setBusy(false); }
  }
  function photo(e: Exercise, compact = false) {
    const src = e.image_path ? images[e.image_path] : undefined;
    return <div style={{background:C.pale,display:"grid",placeItems:"center",overflow:"hidden",borderRadius:12,width:compact?60:"100%",height:compact?60:undefined,aspectRatio:compact?undefined:"16 / 9",maxHeight:compact?60:300,flexShrink:0}}>
      {src ? /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src} alt={e.name} style={{width:"100%",height:"100%",objectFit:"contain",minHeight:0}} /> : <Dumbbell size={compact?24:36} color={C.green} strokeWidth={1.5}/>}
    </div>;
  }
  return <div style={{display:"grid",gap:15,width:"100%",color:C.text}}>
    <button type="button" disabled={busy} onClick={onBack} style={{display:"flex",alignItems:"center",justifySelf:"start",gap:8,background:"transparent",border:0,padding:0,color:C.dark,fontFamily:"inherit",fontSize:13,fontWeight:600}}><ArrowLeft size={18}/> Biblioteca de ejercicios</button>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}><h2 style={{margin:0,fontSize:24,fontWeight:600,overflowWrap:"anywhere"}}>{item.name}</h2><button type="button" style={soft} disabled={busy||loading} aria-label={item.is_favorite?"Quitar de favoritos":"Añadir a favoritos"} aria-pressed={item.is_favorite} onClick={()=>void changeFlag("is_favorite")}><Star size={20} fill={item.is_favorite?C.green:"none"}/></button></div>
    {error && <div role="alert" style={{...card,color:C.danger,fontSize:12}}>{error}<button type="button" style={soft} disabled={busy||loading} onClick={()=>void load()}>Actualizar datos</button></div>}
    {loading ? <p style={muted}>Cargando ejercicio...</p> : <>
      <section style={card}>{photo(item)}<div style={{display:"flex",flexWrap:"wrap",gap:7}}>{[item.is_active?"Activo":"Desactivado",item.equipment,item.is_unilateral?"Unilateral":null].filter(Boolean).map((t,i)=><span key={i} style={{background:C.pale,color:C.dark,borderRadius:8,padding:"6px 9px",fontSize:11}}>{t}</span>)}</div><button type="button" style={btn} disabled={busy} onClick={onEdit}><Pencil size={17}/> Editar ejercicio</button></section>
      <section style={card}><h3 style={heading}>Grupos musculares</h3>{[...relations].sort((a,b)=>Number(b.is_primary)-Number(a.is_primary)).map(r=>{const g=groups.find(g=>g.id===r.muscle_group_id);return <div key={r.muscle_group_id} style={{display:"flex",alignItems:"center",gap:8,fontSize:12}}><span style={{width:10,height:10,borderRadius:"50%",background:g?.color??C.green,flexShrink:0}}/><span style={{flex:1}}>{g?.name??"Grupo no disponible"}{g&&!g.is_active?" (desactivado)":""}</span><span style={muted}>{r.is_primary?"Principal":"Secundario"}</span></div>})}{!relations.length&&<p style={muted}>Sin grupos asignados.</p>}</section>
      <section style={card}><h3 style={heading}>Descripción</h3><p style={{...muted,whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{item.description||"Sin descripción."}</p><div style={{height:1,background:C.border}}/><h3 style={{...heading,display:"flex",gap:8,alignItems:"center"}}><ClipboardList size={18} color={C.green}/> Observaciones técnicas</h3><div style={{background:C.pale,borderRadius:12,padding:12,fontSize:12,lineHeight:1.7,whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{item.technique_notes||"Sin observaciones técnicas."}</div></section>
      <section style={card}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}><h3 style={heading}>Variantes del ejercicio</h3><button type="button" style={soft} disabled={busy} onClick={()=>{setPicker(!picker);setVariantId("");setSearch("");setNotes("");}}>{picker?<X size={16}/>:<Plus size={16}/>} {picker?"Cerrar":"Añadir"}</button></div><p style={muted}>Cada variante conserva su propio histórico y rendimiento.</p>
      {picker&&<div style={{display:"grid",gap:9,background:C.pale,borderRadius:12,padding:12}}><input style={input} placeholder="Buscar ejercicio..." aria-label="Buscar variante" value={search} disabled={busy} onChange={e=>{setSearch(e.target.value);setVariantId("");}}/><select style={input} aria-label="Seleccionar variante" value={variantId} disabled={busy} onChange={e=>setVariantId(e.target.value)}><option value="">Seleccionar ejercicio</option>{candidates.map(e=><option key={e.id} value={e.id}>{[e.name,e.equipment].filter(Boolean).join(" · ")}</option>)}</select>{!candidates.length&&<p style={muted}>No hay ejercicios disponibles. Crea otro ejercicio activo en la biblioteca para vincularlo.</p>}<textarea style={input} rows={2} placeholder="Notas de la variante (opcional)" value={notes} disabled={busy} onChange={e=>setNotes(e.target.value)}/><button type="button" style={btn} disabled={busy||!variantId} onClick={()=>void addVariant()}>Vincular variante</button></div>}
      {!variants.length&&<p style={muted}>Todavía no hay variantes vinculadas.</p>}
      {variants.map(v=>{const other=library.find(e=>e.id===(v.exercise_id===id?v.variant_id:v.exercise_id));return <div key={v.id} style={{border:`1px solid ${C.border}`,borderRadius:12,padding:10,display:"grid",gap:8}}><div style={{display:"flex",alignItems:"center",gap:8}}>{other?<button type="button" disabled={busy} onClick={()=>onOpenExercise(other)} style={{display:"flex",alignItems:"center",gap:9,flex:1,minWidth:0,background:"transparent",border:0,padding:0,textAlign:"left",fontFamily:"inherit",color:C.text}}>{photo(other,true)}<span style={{flex:1,minWidth:0,overflowWrap:"anywhere"}}><strong style={{fontSize:12}}>{other.name}</strong><span style={{...muted,display:"block"}}>{[other.equipment,!other.is_active?"Desactivado":null].filter(Boolean).join(" · ")}</span></span><ChevronRight size={16} color={C.green}/></button>:<span style={muted}>Variante no disponible</span>}<button type="button" style={{...soft,padding:8,color:C.danger}} aria-label="Desvincular variante" disabled={busy} onClick={()=>void removeVariant(v)}><X size={17}/></button></div>{v.notes&&<p style={{...muted,whiteSpace:"pre-wrap"}}>{v.notes}</p>}</div>})}</section>
      <section style={card}><h3 style={{...heading,display:"flex",alignItems:"center",gap:8}}><ChartNoAxesCombined size={18} color={C.green}/> Rendimiento</h3><div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8}}>{["Último peso","Récord personal","Entrenamientos","Última sesión"].map(t=><div key={t} style={{background:C.pale,borderRadius:12,padding:12}}><p style={muted}>{t}</p><strong style={{fontSize:22,color:C.dark}}>—</strong></div>)}</div><p style={muted}>Disponible cuando incorporemos el registro de entrenamientos y la evolución individual.</p></section>
      <button type="button" style={{...soft,color:item.is_active?C.danger:C.dark}} disabled={busy} onClick={()=>void changeFlag("is_active")}>{item.is_active?<Archive size={17}/>:<RotateCcw size={17}/>} {item.is_active?"Desactivar ejercicio":"Reactivar ejercicio"}</button>
    </>}
  </div>;
}
