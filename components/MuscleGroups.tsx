
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import {
  ArrowLeft,
  Plus,
  Pencil,
  ChevronUp,
  ChevronDown,
  Archive,
  RotateCcw,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import { createClient } from "../lib/supabase/client";

type MuscleGroup = {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  is_active: boolean;
};

const C = {
  green: "#7D8C82",
  dark: "#596B60",
  text: "#25382F",
  muted: "#78847B",
  pale: "#EEF2EE",
  border: "#E5EAE5",
  white: "#FFFFFF",
  danger: "#B45353",
};

const colors = [
  "#7D8C82",
  "#C39A72",
  "#B49B77",
  "#C4A0B5",
  "#9DAD91",
  "#A7A28A",
  "#698A9F",
  "#8E91B2",
  "#D49A93",
  "#9C83A4",
  "#B38DAD",
  "#8DB6AF",
  "#C6A36B",
  "#7895A3",
  "#B6B6B6",
];

const card: CSSProperties = {
  background: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: 18,
  padding: 16,
};

const button: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  border: "none",
  borderRadius: 12,
  padding: "12px 15px",
  minHeight: 44,
  background: C.green,
  color: C.white,
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const secondary: CSSProperties = {
  ...button,
  background: C.pale,
  color: C.dark,
};

const iconButton: CSSProperties = {
  display: "grid",
  placeItems: "center",
  width: 34,
  height: 36,
  flexShrink: 0,
  border: "none",
  borderRadius: 9,
  background: "transparent",
  color: C.dark,
  cursor: "pointer",
};

const input: CSSProperties = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  padding: 12,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  background: C.white,
  color: C.text,
  fontFamily: "inherit",
  fontSize: 14,
};

export default function MuscleGroups({
  onBack,
}: {
  onBack: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);

  const [groups, setGroups] = useState<MuscleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [tab, setTab] = useState<"active" | "inactive">(
    "active"
  );

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MuscleGroup | null>(
    null
  );

  const [name, setName] = useState("");
  const [color, setColor] = useState(C.green);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("muscle_groups")
      .select("id,name,color,sort_order,is_active")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      setError(error.message);
      setLoading(false);
      return false;
    }

    setGroups((data ?? []) as MuscleGroup[]);
    setLoading(false);
    return true;
  }, [supabase]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const activeGroups = groups.filter((g) => g.is_active);
  const inactiveGroups = groups.filter((g) => !g.is_active);

  const visibleGroups =
    tab === "active" ? activeGroups : inactiveGroups;

  function openForm(group?: MuscleGroup) {
    setEditing(group ?? null);
    setName(group?.name ?? "");
    setColor(group?.color ?? C.green);
    setError("");
    setMessage("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    if (busy) return;
    setShowForm(false);
    setEditing(null);
    setError("");
  }

  async function saveGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) return;

    const cleanName = name.trim();

    if (!cleanName) {
      setError("Introduce el nombre del grupo muscular.");
      return;
    }

    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      setError("Selecciona un color válido.");
      return;
    }

    const duplicate = groups.some(
      (g) =>
        g.id !== editing?.id &&
        g.name.trim().toLocaleLowerCase("es") ===
          cleanName.toLocaleLowerCase("es")
    );

    if (duplicate) {
      setError("Ya existe un grupo muscular con ese nombre.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (editing) {
        const { error } = await supabase
          .from("muscle_groups")
          .update({
            name: cleanName,
            color,
          })
          .eq("id", editing.id)
          .select("id")
          .single();

        if (error) throw error;
      } else {
        const nextOrder =
          Math.max(0, ...groups.map((g) => g.sort_order)) + 1;

        const { error } = await supabase
          .from("muscle_groups")
          .insert({
            name: cleanName,
            color,
            sort_order: nextOrder,
            is_active: true,
          })
          .select("id")
          .single();

        if (error) throw error;

        setTab("active");
      }

      setShowForm(false);
      setEditing(null);

      setMessage(
        editing
          ? "Grupo muscular actualizado."
          : "Grupo muscular creado."
      );

      await loadGroups();
    } catch (error) {
      setError(
        (error as { message?: string }).message ??
          "No se pudo guardar el grupo muscular."
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleGroup(group: MuscleGroup) {
    if (busy) return;

    if (
      group.is_active &&
      !window.confirm(
        `¿Desactivar ${group.name}? Se conservarán los ejercicios y el histórico asociados.`
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const { error } = await supabase
        .from("muscle_groups")
        .update({ is_active: !group.is_active })
        .eq("id", group.id)
        .select("id")
        .single();

      if (error) throw error;

      setMessage(
        group.is_active
          ? "Grupo muscular desactivado."
          : "Grupo muscular reactivado."
      );

      await loadGroups();
    } catch (error) {
      setError(
        (error as { message?: string }).message ??
          "No se pudo actualizar el grupo."
      );
    } finally {
      setBusy(false);
    }
  }

  async function moveGroup(
    group: MuscleGroup,
    direction: -1 | 1
  ) {
    if (busy || loading) return;

    const index = visibleGroups.findIndex(
      (g) => g.id === group.id
    );

    const target = index + direction;

    if (index < 0 || target < 0 || target >= visibleGroups.length) {
      return;
    }

    const reordered = [...visibleGroups];

    [reordered[index], reordered[target]] = [
      reordered[target],
      reordered[index],
    ];

    const ordered = [
      ...groups.filter(
        (g) => g.is_active !== group.is_active
      ),
      ...reordered,
    ];

    setBusy(true);
    setError("");
    setMessage("");

    try {
      for (let i = 0; i < ordered.length; i++) {
        if (ordered[i].sort_order === i + 1) continue;

        const { error } = await supabase
          .from("muscle_groups")
          .update({ sort_order: i + 1 })
          .eq("id", ordered[i].id)
          .select("id")
          .single();

        if (error) throw error;
      }

      await loadGroups();
      setMessage("Orden actualizado.");
    } catch (error) {
      await loadGroups();

      setError(
        (error as { message?: string }).message ??
          "No se pudo completar el cambio de orden."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        width: "100%",
        color: C.text,
      }}
    >
      <button
        type="button"
        disabled={busy}
        onClick={showForm ? closeForm : onBack}
        style={{
          ...iconButton,
          width: "auto",
          display: "flex",
          alignSelf: "flex-start",
          gap: 8,
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <ArrowLeft size={18} />
        {showForm ? "Grupos musculares" : "Biblioteca"}
      </button>

      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 23,
              fontWeight: 600,
            }}
          >
            {showForm
              ? editing
                ? "Editar grupo"
                : "Nuevo grupo"
              : "Grupos musculares"}
          </h2>

          <p
            style={{
              margin: "5px 0 0",
              color: C.muted,
              fontSize: 12,
            }}
          >
            Personaliza tu biblioteca de ejercicios.
          </p>
        </div>

        {!showForm && (
          <button
            type="button"
            disabled={busy || loading}
            onClick={() => openForm()}
            aria-label="Crear grupo muscular"
            style={{
              ...button,
              width: 44,
              padding: 0,
              flexShrink: 0,
            }}
          >
            <Plus size={22} />
          </button>
        )}
      </header>

      {error && (
        <div
          role="alert"
          style={{
            ...card,
            color: C.danger,
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          {error}
        </div>
      )}

      {message && (
        <p
          role="status"
          style={{
            color: C.dark,
            fontSize: 12,
            margin: 0,
          }}
        >
          {message}
        </p>
      )}

      {showForm ? (
        <form
          onSubmit={saveGroup}
          style={{
            ...card,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Nombre del grupo muscular
            <input
              style={input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Antebrazos"
              maxLength={80}
              required
              disabled={busy}
            />
          </label>

          <div>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                margin: "0 0 12px",
              }}
            >
              Color identificativo
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(42px, 1fr))",
                gap: 10,
              }}
            >
              {colors.map((item) => (
                <button
                  key={item}
                  type="button"
                  disabled={busy}
                  onClick={() => setColor(item)}
                  aria-label={`Color ${item}`}
                  aria-pressed={color === item}
                  style={{
                    height: 42,
                    borderRadius: 12,
                    background: item,
                    color: C.white,
                    border:
                      color === item
                        ? `2px solid ${C.dark}`
                        : "2px solid transparent",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {color === item && <Check size={20} />}
                </button>
              ))}
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginTop: 16,
                fontSize: 12,
              }}
            >
              <input
                type="color"
                value={color}
                disabled={busy}
                onChange={(e) => setColor(e.target.value)}
                style={{
                  width: 44,
                  height: 40,
                  border: "none",
                  background: "transparent",
                  padding: 0,
                }}
              />
              Color personalizado
              <span style={{ color: C.muted }}>
                {color.toUpperCase()}
              </span>
            </label>
          </div>

          <div
            style={{
              ...card,
              background: C.pale,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span
              style={{
                width: 15,
                height: 15,
                borderRadius: "50%",
                background: color,
                flexShrink: 0,
              }}
            />

            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                overflowWrap: "anywhere",
              }}
            >
              {name.trim() || "Vista previa del grupo"}
            </span>
          </div>

          <button
            type="submit"
            disabled={busy}
            style={button}
          >
            <Check size={18} />
            {busy ? "Guardando..." : "Guardar grupo"}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={closeForm}
            style={secondary}
          >
            <X size={17} />
            Cancelar
          </button>
        </form>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 5,
              padding: 5,
              background: C.pale,
              borderRadius: 13,
            }}
          >
            {(["active", "inactive"] as const).map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setTab(item);
                    setMessage("");
                  }}
                  style={{
                    ...button,
                    background:
                      tab === item ? C.white : "transparent",
                    color: C.dark,
                    fontSize: 12,
                    padding: 9,
                    minHeight: 38,
                  }}
                >
                  {item === "active"
                    ? `Activos (${activeGroups.length})`
                    : `Desactivados (${inactiveGroups.length})`}
                </button>
              )
            )}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              style={{
                color: C.muted,
                fontSize: 11,
              }}
            >
              {visibleGroups.length} grupos musculares
            </span>

            <button
              type="button"
              disabled={busy || loading}
              onClick={() => void loadGroups()}
              style={iconButton}
              aria-label="Actualizar grupos"
            >
              <RefreshCw size={17} />
            </button>
          </div>

          {loading ? (
            <p style={{ fontSize: 12, color: C.muted }}>
              Cargando grupos musculares...
            </p>
          ) : visibleGroups.length === 0 ? (
            <div
              style={{
                ...card,
                textAlign: "center",
                padding: 30,
              }}
            >
              <p
                style={{
                  color: C.muted,
                  fontSize: 13,
                  margin: 0,
                }}
              >
                {tab === "active"
                  ? "No hay grupos musculares activos."
                  : "No hay grupos musculares desactivados."}
              </p>
            </div>
          ) : (
            visibleGroups.map((group, index) => (
              <div
                key={group.id}
                style={{
                  ...card,
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "10px 12px",
                  opacity: group.is_active ? 1 : 0.7,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <button
                    type="button"
                    disabled={busy || index === 0}
                    onClick={() => void moveGroup(group, -1)}
                    aria-label={`Subir ${group.name}`}
                    style={{
                      ...iconButton,
                      width: 28,
                      height: 28,
                      opacity: index === 0 ? 0.25 : 1,
                    }}
                  >
                    <ChevronUp size={17} />
                  </button>

                  <button
                    type="button"
                    disabled={
                      busy || index === visibleGroups.length - 1
                    }
                    onClick={() => void moveGroup(group, 1)}
                    aria-label={`Bajar ${group.name}`}
                    style={{
                      ...iconButton,
                      width: 28,
                      height: 28,
                      opacity:
                        index === visibleGroups.length - 1
                          ? 0.25
                          : 1,
                    }}
                  >
                    <ChevronDown size={17} />
                  </button>
                </div>

                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: group.color,
                    flexShrink: 0,
                  }}
                />

                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 13,
                    fontWeight: 500,
                    overflowWrap: "anywhere",
                  }}
                >
                  {group.name}
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => openForm(group)}
                  aria-label={`Editar ${group.name}`}
                  style={iconButton}
                >
                  <Pencil size={17} />
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void toggleGroup(group)}
                  aria-label={
                    group.is_active
                      ? `Desactivar ${group.name}`
                      : `Reactivar ${group.name}`
                  }
                  style={iconButton}
                >
                  {group.is_active ? (
                    <Archive size={17} />
                  ) : (
                    <RotateCcw size={17} />
                  )}
                </button>
              </div>
            ))
          )}

          <p
            style={{
              fontSize: 11,
              lineHeight: 1.7,
              color: C.muted,
              margin: "4px 0",
            }}
          >
            Los grupos desactivados conservarán sus ejercicios
            y registros históricos.
          </p>
        </>
      )}
    </div>
  );
}
