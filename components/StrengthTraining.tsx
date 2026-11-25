"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowLeft, ArrowRight, ChevronRight, Copy, Dumbbell, History, PlayCircle } from "lucide-react";
import { createClient } from "../lib/supabase/client";

type Session = { id: string; name: string; session_date: string; status: string; duration_minutes: number | null };
type View = "home" | "new" | "repeat" | "continue" | "history";
const C = { green: "#7D8C82", dark: "#596B60", text: "#25382F", muted: "#78847B", pale: "#EEF2EE", border: "#E5EAE5", white: "#FFFFFF" };
const card: CSSProperties = { background: C.white, border: `1px solid ${C.border}`, borderRadius: 18, padding: 16 };
const button: CSSProperties = { fontFamily: "inherit", cursor: "pointer", color: C.text, textAlign: "left", width: "100%" };
const labels = { new: "Nuevo entrenamiento", repeat: "Repetir entrenamiento", continue: "Continuar entrenamiento", history: "Histórico de fuerza" };
function dateLabel(date: string) { return new Date(`${date}T12:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }); }

export default function StrengthTraining({ onBack }: { onBack: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [view, setView] = useState<View>("home");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pending, setPending] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError("");
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError || !auth.user) throw new Error("No se ha podido comprobar tu sesión.");
        const fields = "id,name,session_date,status,duration_minutes";
        const [completed, unfinished] = await Promise.all([
          supabase.from("training_sessions").select(fields).eq("user_id", auth.user.id).eq("status", "completed").order("session_date", { ascending: false }).order("created_at", { ascending: false }).limit(5),
          supabase.from("training_sessions").select(fields).eq("user_id", auth.user.id).in("status", ["draft", "in_progress"]).order("created_at", { ascending: false }).limit(5),
        ]);
        if (completed.error || unfinished.error) throw new Error(completed.error?.message || unfinished.error?.message);
        if (!cancelled) { setSessions(completed.data || []); setPending(unfinished.data || []); }
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "No se han podido cargar los entrenamientos."); }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [supabase, retry]);
  function open(next: View) { setView(next); window.scrollTo({ top: 0 }); }
  const actions = [
    { key: "repeat" as const, Icon: Copy, description: "Duplica una sesión anterior." },
    { key: "continue" as const, Icon: PlayCircle, description: pending.length ? "Tienes sesiones pendientes." : "Recupera una sesión pendiente." },
    { key: "history" as const, Icon: History, description: "Consulta tus entrenamientos." },
  ];
  return <section style={{ display: "grid", gap: 14, color: C.text }}>
    <button
      type="button"
      onClick={() => view === "home" ? onBack() : open("home")}
      style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", padding: 0, color: C.dark, fontSize: 13, fontWeight: 600, fontFamily: "inherit", justifySelf: "start", cursor: "pointer" }}
    >
      <ArrowLeft size={18} />
      {view === "home" ? "Entrenamiento" : "Fuerza"}
    </button>
    <h2 style={{ margin: "4px 0 0", fontSize: 23, fontWeight: 600, color: C.text }}>{view === "home" ? "Fuerza" : labels[view]}</h2>
    {view !== "home" ? <div style={card}><p style={{ margin: 0, fontSize: 14, color: C.muted }}>Esta funcionalidad se incorporará en los siguientes pasos del desarrollo.</p></div> : <>
      <p style={{ margin: 0, color: C.muted, fontSize: 13 }}>Registra tus entrenamientos y sigue tu evolución.</p>
      <button type="button" onClick={() => open("new")} style={{ ...button, border: 0, background: C.green, color: C.white, borderRadius: 18, padding: 20, display: "grid", gap: 10 }}>
        <Dumbbell size={30}/><strong style={{ fontSize: 19, fontWeight: 600 }}>Nuevo entrenamiento</strong><span style={{ fontSize: 13 }}>Comienza una sesión desde cero.</span><span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14, fontWeight: 500 }}>Empezar entrenamiento <ArrowRight size={20}/></span>
      </button>
      {actions.map(({key, Icon, description}) => <button key={key} type="button" onClick={() => open(key)} style={{ ...button, ...card, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ display: "grid", placeItems: "center", width: 44, height: 44, flexShrink: 0, borderRadius: 12, background: C.pale, color: C.dark }}><Icon size={22}/></span>
        <span style={{ flex: 1, minWidth: 0, display: "grid", gap: 4 }}><strong style={{ fontSize: 14, fontWeight: 600 }}>{labels[key]}</strong><span style={{ color: C.muted, fontSize: 12 }}>{description}</span></span><ChevronRight size={19} color={C.green} style={{ flexShrink: 0 }}/>
      </button>)}
      <h3 style={{ margin: "8px 0 0", fontSize: 16, fontWeight: 600 }}>Últimos entrenamientos</h3>
      {loading ? <div style={card}>Cargando entrenamientos…</div> : error ? <div style={card}><p role="alert" style={{ fontSize: 13 }}>{error}</p><button type="button" onClick={() => setRetry(n => n + 1)} style={{ ...button, border: 0, background: C.pale, borderRadius: 10, padding: 10 }}>Reintentar</button></div> : sessions.length === 0 ? <div style={{ ...card, textAlign: "center", color: C.muted, padding: 24 }}><Dumbbell size={28} color={C.green}/><p style={{ fontSize: 13, margin: "8px 0 0" }}>Todavía no hay entrenamientos registrados.</p></div> : sessions.map(s => <div key={s.id} style={card}><strong style={{ fontSize: 14 }}>{s.name}</strong><div style={{ fontSize: 12, color: C.muted, marginTop: 5 }}>{dateLabel(s.session_date)}{s.duration_minutes != null ? ` · ${s.duration_minutes} min` : ""}</div></div>)}
    </>}
  </section>;
}
