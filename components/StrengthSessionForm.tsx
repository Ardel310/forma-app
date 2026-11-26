"use client";

import { useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { createClient } from "../lib/supabase/client";

const C = { green: "#7D8C82", dark: "#596B60", text: "#25382F", muted: "#78847B", pale: "#EEF2EE", border: "#E5EAE5" };
const field: CSSProperties = { width: "100%", minWidth: 0, boxSizing: "border-box", border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, fontFamily: "inherit", fontSize: 16, color: C.text, background: "#FFFFFF" };
const label: CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 600, color: C.text };
function today() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }

export default function StrengthSessionForm({ onBack, onCreated, initialDate }: { onBack: () => void; onCreated: (id: string) => void; initialDate?: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [name, setName] = useState("");
  const [date, setDate] = useState(() => initialDate || today());
  const [mode, setMode] = useState<"live" | "past">(initialDate && initialDate !== today() ? "past" : "live");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lock.current) return;
    setError("");
    if (!name.trim()) { setError("Introduce el nombre del entrenamiento."); return; }
    if (!date || date > today() || (mode === "live" && date !== today())) { setError("Comprueba la fecha del entrenamiento."); return; }
    lock.current = true; setBusy(true);
    let id: string;
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("No se ha podido comprobar tu sesión.");
      const { data, error: saveError } = await supabase.from("training_sessions").insert({
        user_id: auth.user.id, name: name.trim(), session_date: date,
        status: mode === "live" ? "in_progress" : "draft",
        started_at: mode === "live" ? new Date().toISOString() : null,
        notes: notes.trim() || null,
      }).select("id").single();
      if (saveError || !data) throw new Error(saveError?.message || "No se ha podido crear el entrenamiento.");
      id = data.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se ha podido guardar. Comprueba las sesiones pendientes antes de reintentar.");
      lock.current = false; setBusy(false); return;
    }
    onCreated(id);
  }

  return <div style={{ display: "flex", flexDirection: "column", gap: 18, width: "100%" }}>
    <button type="button" disabled={busy} onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", padding: 0, color: C.dark, fontSize: 13, fontWeight: 600, alignSelf: "flex-start", fontFamily: "inherit" }}><ArrowLeft size={18}/>Fuerza</button>
    <h2 style={{ margin: 0, fontSize: 23, color: C.text }}>Nuevo entrenamiento</h2>
    <form onSubmit={save} style={{ background: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: 18, padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <label style={label}>Nombre del entrenamiento<input style={field} required disabled={busy} value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Glúteos y femoral" /></label>
      <label style={label}>Fecha del entrenamiento<input type="date" style={field} required disabled={busy} max={today()} value={date} onChange={e => { setDate(e.target.value); if (e.target.value !== today()) setMode("past"); }} /></label>
      <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <legend style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>Tipo de registro</legend>
        {([{ id: "live", title: "Entrenar ahora", desc: "Registra las series durante el entrenamiento." }, { id: "past", title: "Registrar entrenamiento realizado", desc: "Introduce los datos de una sesión anterior." }] as const).map(item => <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${mode === item.id ? C.green : C.border}`, background: mode === item.id ? C.pale : "#FFFFFF", borderRadius: 12, padding: 12, color: C.text }}><input type="radio" name="mode" checked={mode === item.id} onChange={() => { setMode(item.id); if (item.id === "live") setDate(today()); }} style={{ accentColor: C.green }}/><span><span style={{ display: "block", fontSize: 13, fontWeight: 600 }}>{item.title}</span><span style={{ display: "block", fontSize: 11, color: C.muted, marginTop: 4 }}>{item.desc}</span></span></label>)}
      </fieldset>
      <label style={label}>Notas iniciales (opcional)<textarea style={{ ...field, resize: "vertical" }} rows={3} disabled={busy} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Añade alguna observación..."/></label>
      {error && <p role="alert" style={{ color: "#A04444", fontSize: 13, margin: 0 }}>{error}</p>}
      <button type="submit" disabled={busy} style={{ background: C.green, color: "#FFFFFF", border: 0, borderRadius: 12, padding: 14, fontFamily: "inherit", fontWeight: 600, fontSize: 13, opacity: busy ? 0.6 : 1 }}>{busy ? "Guardando..." : "Crear entrenamiento"}</button>
    </form>
  </div>;
}
