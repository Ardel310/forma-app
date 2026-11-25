
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  ArrowLeft,
  Plus,
  Search,
  Star,
  Dumbbell,
  LayoutGrid,
  List,
  Settings2,
  ChevronRight,
  RefreshCw,
  X,
} from "lucide-react";
import { createClient } from "../lib/supabase/client";
import MuscleGroups from "./MuscleGroups";

type MuscleGroup = {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  is_active: boolean;
};

type Exercise = {
  id: string;
  name: string;
  equipment: string | null;
  gym: string | null;
  image_path: string | null;
  technique_notes: string | null;
  description: string | null;
  is_favorite: boolean;
  is_active: boolean;
  is_unilateral: boolean;
};

type Relation = {
  exercise_id: string;
  muscle_group_id: string;
  is_primary: boolean;
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

const card: CSSProperties = {
  background: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: 18,
  overflow: "hidden",
};

const button: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 42,
  border: "none",
  borderRadius: 12,
  background: C.green,
  color: C.white,
  padding: "10px 14px",
  fontFamily: "inherit",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const secondary: CSSProperties = {
  ...button,
  background: C.pale,
  color: C.dark,
};

const input: CSSProperties = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  background: C.white,
  color: C.text,
  border: `1px solid ${C.border}`,
  borderRadius: 11,
  padding: 11,
  fontFamily: "inherit",
  fontSize: 12,
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function ExerciseLibrary({
  onBack,
}: {
  onBack: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [groups, setGroups] = useState<MuscleGroup[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [equipmentFilter, setEquipmentFilter] = useState("all");
  const [gymFilter, setGymFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const [layout, setLayout] = useState<"grid" | "list">("grid");

  const [view, setView] = useState<
    "library" | "groups" | "new" | "detail"
  >("library");

  const [selected, setSelected] = useState<Exercise | null>(null);

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [exerciseResult, groupResult, relationResult] =
        await Promise.all([
          supabase
            .from("exercise_library")
            .select("*")
            .order("name"),

          supabase
            .from("muscle_groups")
            .select("id,name,color,sort_order,is_active")
            .order("sort_order")
            .order("name"),

          supabase
            .from("exercise_muscle_groups")
            .select("exercise_id,muscle_group_id,is_primary"),
        ]);

      if (exerciseResult.error) throw exerciseResult.error;
      if (groupResult.error) throw groupResult.error;
      if (relationResult.error) throw relationResult.error;

      const items = (exerciseResult.data ?? []) as Exercise[];

      setExercises(items);
      setGroups((groupResult.data ?? []) as MuscleGroup[]);
      setRelations((relationResult.data ?? []) as Relation[]);

      const paths = Array.from(
        new Set(
          items
            .map((item) => item.image_path)
            .filter((path): path is string => Boolean(path))
        )
      );

      const imageMap: Record<string, string> = {};

      if (paths.length > 0) {
        const { data, error: imageError } =
          await supabase.storage
            .from("exercise-images")
            .createSignedUrls(paths, 3600);

        if (imageError) {
          setError(
            "No se han podido cargar algunas fotografías."
          );
        }

        for (const image of data ?? []) {
          if (image.path && image.signedUrl) {
            imageMap[image.path] = image.signedUrl;
          }
        }
      }

      setImages(imageMap);
    } catch (error) {
      setError(
        (error as { message?: string }).message ??
          "No se pudo cargar la biblioteca."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  const groupMap = useMemo(
    () => new Map(groups.map((group) => [group.id, group])),
    [groups]
  );

  const primaryMap = useMemo(() => {
    const map = new Map<string, MuscleGroup>();

    for (const relation of relations) {
      if (!relation.is_primary) continue;

      const group = groupMap.get(relation.muscle_group_id);

      if (group) {
        map.set(relation.exercise_id, group);
      }
    }

    return map;
  }, [relations, groupMap]);

  const equipmentOptions = useMemo(
    () =>
      Array.from(
        new Set(
          exercises
            .map((item) => item.equipment)
            .filter((value): value is string => Boolean(value))
        )
      ).sort((a, b) => a.localeCompare(b, "es")),
    [exercises]
  );

  const gymOptions = useMemo(
    () =>
      Array.from(
        new Set(
          exercises
            .map((item) => item.gym)
            .filter((value): value is string => Boolean(value))
        )
      ).sort((a, b) => a.localeCompare(b, "es")),
    [exercises]
  );

  const filtered = useMemo(() => {
    const term = normalize(search);

    return exercises.filter((exercise) => {
      const exerciseGroups = relations
        .filter((r) => r.exercise_id === exercise.id)
        .map((r) => groupMap.get(r.muscle_group_id)?.name ?? "");

      const searchable = normalize(
        [
          exercise.name,
          exercise.equipment ?? "",
          exercise.gym ?? "",
          ...exerciseGroups,
        ].join(" ")
      );

      if (term && !searchable.includes(term)) return false;

      if (statusFilter === "active" && !exercise.is_active)
        return false;

      if (statusFilter === "inactive" && exercise.is_active)
        return false;

      if (favoritesOnly && !exercise.is_favorite)
        return false;

      if (
        equipmentFilter !== "all" &&
        exercise.equipment !== equipmentFilter
      )
        return false;

      if (
        gymFilter !== "all" &&
        exercise.gym !== gymFilter
      )
        return false;

      if (
        groupFilter !== "all" &&
        !relations.some(
          (r) =>
            r.exercise_id === exercise.id &&
            r.muscle_group_id === groupFilter
        )
      )
        return false;

      return true;
    });
  }, [
    exercises,
    relations,
    groupMap,
    search,
    groupFilter,
    equipmentFilter,
    gymFilter,
    statusFilter,
    favoritesOnly,
  ]);

  function resetFilters() {
    setSearch("");
    setGroupFilter("all");
    setEquipmentFilter("all");
    setGymFilter("all");
    setStatusFilter("active");
    setFavoritesOnly(false);
  }

  function openView(
    next: "library" | "groups" | "new" | "detail"
  ) {
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openDetail(exercise: Exercise) {
    setSelected(exercise);
    openView("detail");
  }

  async function toggleFavorite(exercise: Exercise) {
    if (busy) return;

    setBusy(exercise.id);
    setError("");

    try {
      const { error } = await supabase
        .from("exercise_library")
        .update({
          is_favorite: !exercise.is_favorite,
        })
        .eq("id", exercise.id)
        .select("id")
        .single();

      if (error) throw error;

      setExercises((previous) =>
        previous.map((item) =>
          item.id === exercise.id
            ? { ...item, is_favorite: !item.is_favorite }
            : item
        )
      );

      setSelected((previous) =>
        previous?.id === exercise.id
          ? { ...previous, is_favorite: !previous.is_favorite }
          : previous
      );
    } catch (error) {
      setError(
        (error as { message?: string }).message ??
          "No se pudo actualizar el favorito."
      );
    } finally {
      setBusy(null);
    }
  }

  function exerciseImage(
    exercise: Exercise,
    compact = false
  ) {
    const src = exercise.image_path
      ? images[exercise.image_path]
      : undefined;

    return (
      <div
        style={{
          width: compact ? 76 : "100%",
          height: compact ? 76 : undefined,
          aspectRatio: compact ? undefined : "4 / 3",
          flexShrink: 0,
          background: C.pale,
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
          borderRadius: compact ? 12 : 0,
        }}
      >
        {src ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={src}
            alt={exercise.name}
            loading="lazy"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <Dumbbell
            size={compact ? 27 : 38}
            color={C.green}
            strokeWidth={1.4}
          />
        )}
      </div>
    );
  }

  if (view === "groups") {
    return (
      <MuscleGroups
        onBack={() => {
          openView("library");
          void loadLibrary();
        }}
      />
    );
  }

  if (view === "new" || view === "detail") {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <button
          type="button"
          onClick={() => openView("library")}
          style={{
            ...secondary,
            justifySelf: "start",
          }}
        >
          <ArrowLeft size={17} />
          Biblioteca de ejercicios
        </button>

        <h2 style={{ margin: 0, fontSize: 23 }}>
          {view === "new" ? "Nuevo ejercicio" : selected?.name}
        </h2>

        {view === "detail" && selected && (
          <div style={card}>
            {exerciseImage(selected)}

            <div style={{ padding: 18 }}>
              <p style={{ fontSize: 13, color: C.dark }}>
                {primaryMap.get(selected.id)?.name ??
                  "Sin grupo principal"}
              </p>

              <p style={{ fontSize: 12, color: C.muted }}>
                {[
                  selected.equipment,
                  selected.gym,
                  selected.is_unilateral ? "Unilateral" : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
        )}

        <div style={{ ...card, padding: 24 }}>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
            {view === "new"
              ? "El formulario de creación se incorporará en el siguiente paso."
              : "La ficha completa, las variantes y el histórico se incorporarán próximamente."}
          </p>
        </div>
      </div>
    );
  }

  const hasFilters =
    search !== "" ||
    groupFilter !== "all" ||
    equipmentFilter !== "all" ||
    gymFilter !== "all" ||
    statusFilter !== "active" ||
    favoritesOnly;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 15,
        width: "100%",
        color: C.text,
      }}
    >
      <button
        type="button"
        onClick={onBack}
        style={{
          display: "flex",
          alignItems: "center",
          alignSelf: "flex-start",
          gap: 8,
          border: "none",
          background: "transparent",
          color: C.dark,
          fontSize: 13,
          fontWeight: 600,
          padding: 0,
        }}
      >
        <ArrowLeft size={18} />
        Entrenamiento
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
              fontSize: 24,
              fontWeight: 600,
            }}
          >
            Ejercicios
          </h2>

          <p
            style={{
              margin: "5px 0 0",
              fontSize: 12,
              color: C.muted,
            }}
          >
            Mi biblioteca personal
          </p>
        </div>

        <button
          type="button"
          onClick={() => openView("new")}
          aria-label="Nuevo ejercicio"
          style={{
            ...button,
            width: 44,
            height: 44,
            padding: 0,
          }}
        >
          <Plus size={23} />
        </button>
      </header>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <button
          type="button"
          onClick={() => openView("groups")}
          style={secondary}
        >
          <Settings2 size={17} />
          Grupos musculares
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: "0 12px",
        }}
      >
        <Search size={18} color={C.muted} />

        <input
          aria-label="Buscar ejercicio"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar ejercicio..."
          style={{
            ...input,
            border: "none",
            padding: "13px 0",
            outline: "none",
          }}
        />

        {search && (
          <button
            type="button"
            aria-label="Limpiar búsqueda"
            onClick={() => setSearch("")}
            style={{
              background: "transparent",
              border: 0,
              color: C.muted,
              padding: 5,
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
          gap: 8,
        }}
      >
        <select
          aria-label="Grupo muscular"
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          style={input}
        >
          <option value="all">Grupo muscular</option>

          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
              {!group.is_active ? " (desactivado)" : ""}
            </option>
          ))}
        </select>

        <select
          aria-label="Equipamiento"
          value={equipmentFilter}
          onChange={(e) => setEquipmentFilter(e.target.value)}
          style={input}
        >
          <option value="all">Equipamiento</option>

          {equipmentOptions.map((equipment) => (
            <option key={equipment} value={equipment}>
              {equipment}
            </option>
          ))}
        </select>

        <select
          aria-label="Gimnasio"
          value={gymFilter}
          onChange={(e) => setGymFilter(e.target.value)}
          style={input}
        >
          <option value="all">Todos los gimnasios</option>

          {gymOptions.map((gym) => (
            <option key={gym} value={gym}>
              {gym}
            </option>
          ))}
        </select>

        <select
          aria-label="Estado del ejercicio"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={input}
        >
          <option value="active">Activos</option>
          <option value="inactive">Desactivados</option>
          <option value="all">Todos los estados</option>
        </select>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          aria-pressed={favoritesOnly}
          onClick={() => setFavoritesOnly((value) => !value)}
          style={favoritesOnly ? button : secondary}
        >
          <Star
            size={16}
            fill={favoritesOnly ? "currentColor" : "none"}
          />
          Favoritos
        </button>

        {hasFilters && (
          <button
            type="button"
            onClick={resetFilters}
            style={{
              border: 0,
              background: "transparent",
              color: C.dark,
              fontSize: 11,
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {error && (
        <p
          role="alert"
          style={{
            ...card,
            padding: 13,
            color: C.danger,
            fontSize: 12,
            margin: 0,
          }}
        >
          {error}
        </p>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 11, color: C.muted }}>
          {filtered.length} de {exercises.length} ejercicios
        </span>

        <div style={{ display: "flex", gap: 5 }}>
          <button
            type="button"
            aria-label="Vista galería"
            aria-pressed={layout === "grid"}
            onClick={() => setLayout("grid")}
            style={{
              ...(layout === "grid" ? button : secondary),
              width: 36,
              minHeight: 36,
              padding: 0,
            }}
          >
            <LayoutGrid size={17} />
          </button>

          <button
            type="button"
            aria-label="Vista listado"
            aria-pressed={layout === "list"}
            onClick={() => setLayout("list")}
            style={{
              ...(layout === "list" ? button : secondary),
              width: 36,
              minHeight: 36,
              padding: 0,
            }}
          >
            <List size={18} />
          </button>

          <button
            type="button"
            disabled={loading || Boolean(busy)}
            aria-label="Actualizar biblioteca"
            onClick={() => void loadLibrary()}
            style={{
              ...secondary,
              width: 36,
              minHeight: 36,
              padding: 0,
            }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ fontSize: 12, color: C.muted }}>
          Cargando ejercicios...
        </p>
      ) : filtered.length === 0 ? (
        <div
          style={{
            ...card,
            padding: "36px 22px",
            textAlign: "center",
          }}
        >
          <Dumbbell
            size={38}
            color={C.green}
            strokeWidth={1.4}
          />

          <h3 style={{ fontSize: 16, marginBottom: 8 }}>
            {exercises.length === 0
              ? "Tu biblioteca está vacía"
              : "No hay resultados"}
          </h3>

          <p
            style={{
              color: C.muted,
              fontSize: 12,
              lineHeight: 1.7,
            }}
          >
            {exercises.length === 0
              ? "Añade tus ejercicios para comenzar a registrar tus entrenamientos."
              : "Prueba a modificar los filtros de búsqueda."}
          </p>

          <button
            type="button"
            onClick={() =>
              exercises.length === 0
                ? openView("new")
                : resetFilters()
            }
            style={{ ...button, width: "100%", marginTop: 18 }}
          >
            {exercises.length === 0 && <Plus size={17} />}
            {exercises.length === 0
              ? "Crear mi primer ejercicio"
              : "Limpiar filtros"}
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              layout === "grid"
                ? "repeat(2, minmax(0, 1fr))"
                : "minmax(0, 1fr)",
            gap: 11,
          }}
        >
          {filtered.map((exercise) => {
            const group = primaryMap.get(exercise.id);

            return (
              <article
                key={exercise.id}
                style={{
                  ...card,
                  position: "relative",
                  opacity: exercise.is_active ? 1 : 0.7,
                  padding: layout === "list" ? 10 : 0,
                }}
              >
                <button
                  type="button"
                  onClick={() => openDetail(exercise)}
                  style={{
                    display: "flex",
                    flexDirection:
                      layout === "grid" ? "column" : "row",
                    alignItems:
                      layout === "grid" ? "stretch" : "center",
                    gap: layout === "list" ? 11 : 0,
                    width: "100%",
                    padding: 0,
                    background: "transparent",
                    border: "none",
                    color: C.text,
                    textAlign: "left",
                    fontFamily: "inherit",
                  }}
                >
                  {exerciseImage(exercise, layout === "list")}

                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding:
                        layout === "grid" ? "13px 12px" : "5px 30px 5px 0",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        lineHeight: 1.5,
                        marginBottom: 7,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {exercise.name}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 11,
                        color: C.dark,
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: group?.color ?? C.green,
                          flexShrink: 0,
                        }}
                      />

                      {group?.name ?? "Sin grupo principal"}
                    </div>

                    {exercise.equipment && (
                      <div
                        style={{
                          color: C.muted,
                          fontSize: 10,
                          marginTop: 5,
                        }}
                      >
                        {exercise.equipment}
                      </div>
                    )}

                    {exercise.gym && (
                      <div
                        style={{
                          color: C.muted,
                          fontSize: 10,
                          marginTop: 3,
                        }}
                      >
                        {exercise.gym}
                      </div>
                    )}

                    {!exercise.is_active && (
                      <div
                        style={{
                          fontSize: 10,
                          color: C.muted,
                          marginTop: 5,
                        }}
                      >
                        Desactivado
                      </div>
                    )}
                  </div>

                  {layout === "list" && (
                    <ChevronRight
                      size={16}
                      color={C.green}
                    />
                  )}
                </button>

                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void toggleFavorite(exercise)}
                  aria-label={
                    exercise.is_favorite
                      ? "Quitar de favoritos"
                      : "Añadir a favoritos"
                  }
                  aria-pressed={exercise.is_favorite}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 32,
                    height: 32,
                    display: "grid",
                    placeItems: "center",
                    background: C.white,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    color: C.green,
                  }}
                >
                  <Star
                    size={17}
                    fill={
                      exercise.is_favorite
                        ? C.green
                        : "none"
                    }
                  />
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
