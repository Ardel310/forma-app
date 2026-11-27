
"use client";

import FormaLoader from "./FormaLoader";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  X,
  Dumbbell,
  Star,
  ImagePlus,
  Trash2,
} from "lucide-react";
import { createClient } from "../lib/supabase/client";

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

type MuscleGroup = {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
};

type Props = {
  exercise?: Exercise | null;
  duplicate?: boolean;
  onBack: () => void;
  onSaved: (id: string) => void;
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
  borderRadius: 20,
  padding: 18,
  display: "flex",
  flexDirection: "column",
  gap: 16,
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
  fontSize: 13,
};

const label: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  fontSize: 12,
  fontWeight: 600,
};

const button: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 46,
  width: "100%",
  padding: "12px 15px",
  border: "none",
  borderRadius: 13,
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

const defaultEquipment = [
  "Máquina",
  "Barra",
  "Mancuernas",
  "Polea",
  "Multipower",
  "Peso corporal",
  "Banda elástica",
  "Kettlebell",
  "Discos",
  "Otro",
];

async function compressImage(file: File): Promise<Blob> {
  if (file.size > 30 * 1024 * 1024) {
    throw new Error(
      "La fotografía es demasiado grande. Máximo 30 MB antes de comprimir."
    );
  }

  const url = URL.createObjectURL(file);

  try {
    const image = new window.Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(
          new Error(
            "No se puede abrir esta fotografía. Prueba con JPG o PNG."
          )
        );
      image.src = url;
    });

    const maxSize = 1200;

    const ratio = Math.min(
      1,
      maxSize / Math.max(
        image.naturalWidth,
        image.naturalHeight
      )
    );

    const canvas = document.createElement("canvas");

    canvas.width = Math.max(
      1,
      Math.round(image.naturalWidth * ratio)
    );

    canvas.height = Math.max(
      1,
      Math.round(image.naturalHeight * ratio)
    );

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error(
        "No se pudo preparar la fotografía."
      );
    }

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(
      image,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const blob = await new Promise<Blob>(
      (resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) resolve(result);
            else reject(
              new Error(
                "No se pudo comprimir la fotografía."
              )
            );
          },
          "image/jpeg",
          0.82
        );
      }
    );

    if (blob.size > 5 * 1024 * 1024) {
      throw new Error(
        "La fotografía supera el límite de almacenamiento."
      );
    }

    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function Toggle({
  checked,
  onChange,
  title,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 14,
        border: 0,
        background: "transparent",
        textAlign: "left",
        color: C.text,
        padding: "5px 0",
        width: "100%",
        fontFamily: "inherit",
      }}
    >
      <span style={{ flex: 1 }}>
        <span
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {title}
        </span>

        {description && (
          <span
            style={{
              display: "block",
              color: C.muted,
              fontSize: 11,
              marginTop: 4,
              lineHeight: 1.6,
            }}
          >
            {description}
          </span>
        )}
      </span>

      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: checked
            ? "flex-end"
            : "flex-start",
          width: 43,
          height: 25,
          padding: 3,
          borderRadius: 20,
          background: checked
            ? C.green
            : "#DCE2DD",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: 19,
            height: 19,
            background: C.white,
            borderRadius: "50%",
            boxShadow: "0 1px 4px rgba(0,0,0,.12)",
          }}
        />
      </span>
    </button>
  );
}

export default function ExerciseForm({
  exercise = null,
  duplicate = false,
  onBack,
  onSaved,
}: Props) {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [groups, setGroups] =
    useState<MuscleGroup[]>([]);

  const [equipmentOptions, setEquipmentOptions] =
    useState<string[]>(defaultEquipment);

  const [name, setName] =
    useState(duplicate ? `${exercise?.name ?? ""} (variante)`.slice(0,120) : exercise?.name ?? "");

  const [equipment, setEquipment] =
    useState(exercise?.equipment ?? "");

  const [customEquipment, setCustomEquipment] = useState(false);
  const [linkVariant, setLinkVariant] = useState(true);
  const [pendingLinkId, setPendingLinkId] = useState<string | null>(null);

  const [primaryGroup, setPrimaryGroup] =
    useState("");

  const [secondaryGroups, setSecondaryGroups] =
    useState<string[]>([]);

  const [description, setDescription] =
    useState(exercise?.description ?? "");

  const [techniqueNotes, setTechniqueNotes] =
    useState(exercise?.technique_notes ?? "");

  const [favorite, setFavorite] =
    useState(exercise?.is_favorite ?? false);

  const [unilateral, setUnilateral] =
    useState(exercise?.is_unilateral ?? false);

  const [imagePath, setImagePath] =
    useState<string | null>(
      exercise?.image_path ?? null
    );

  const [existingPreview, setExistingPreview] =
    useState("");

  const [localPreview, setLocalPreview] =
    useState("");

  const [imageBlob, setImageBlob] =
    useState<Blob | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [loadFailed, setLoadFailed] =
    useState(false);

  const [busy, setBusy] =
    useState(false);

  const [processingImage, setProcessingImage] =
    useState(false);

  const [error, setError] =
    useState("");

  const [showSecondary, setShowSecondary] =
    useState(false);

  const exerciseId = exercise?.id;
  const originalImagePath = exercise?.image_path;

  useEffect(() => {
    let active = true;

    async function initialize() {
      setLoading(true);
      setLoadFailed(false);
      setError("");

      try {
        const [groupResult, exerciseResult] =
          await Promise.all([
            supabase
              .from("muscle_groups")
              .select("id,name,color,is_active")
              .order("sort_order")
              .order("name"),

            supabase
              .from("exercise_library")
              .select("equipment"),
          ]);

        if (groupResult.error)
          throw groupResult.error;

        if (exerciseResult.error)
          throw exerciseResult.error;

        if (!active) return;

        setGroups(
          (groupResult.data ?? []) as MuscleGroup[]
        );

        const items = exerciseResult.data ?? [];

        const equipments = Array.from(
          new Set([
            ...defaultEquipment,
            ...items
              .map((item) => item.equipment)
              .filter(
                (value): value is string =>
                  Boolean(value)
              ),
          ])
        ).sort((a, b) => a.localeCompare(b, "es"));

        setEquipmentOptions(equipments);

        if (exerciseId) {
          const { data, error } = await supabase
            .from("exercise_muscle_groups")
            .select("muscle_group_id,is_primary")
            .eq("exercise_id", exerciseId);

          if (error) throw error;

          if (!active) return;

          const relations = data ?? [];

          setPrimaryGroup(
            relations.find(
              (item) => item.is_primary
            )?.muscle_group_id ?? ""
          );

          setSecondaryGroups(
            relations
              .filter((item) => !item.is_primary)
              .map((item) => item.muscle_group_id)
          );
        }

        if (originalImagePath) {
          const { data } = await supabase.storage
            .from("exercise-images")
            .createSignedUrl(
              originalImagePath,
              3600
            );

          if (active && data?.signedUrl) {
            setExistingPreview(data.signedUrl);
          }
        }
      } catch (error) {
        if (active) {
          setLoadFailed(true);
          setError(
            (error as { message?: string }).message ??
              "No se pudieron cargar los datos."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [supabase, exerciseId, originalImagePath]);

  useEffect(() => {
    if (!imageBlob) {
      setLocalPreview("");
      return;
    }

    const url = URL.createObjectURL(imageBlob);
    setLocalPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [imageBlob]);

  const activeGroups = groups.filter(
    (group) => group.is_active
  );

  const preview =
    localPreview ||
    (imagePath ? existingPreview : "");

  function changePrimary(id: string) {
    setPrimaryGroup(id);

    setSecondaryGroups((previous) =>
      previous.filter((value) => value !== id)
    );
  }

  function toggleSecondary(id: string) {
    if (id === primaryGroup) return;

    setSecondaryGroups((previous) =>
      previous.includes(id)
        ? previous.filter((value) => value !== id)
        : [...previous, id]
    );
  }

  async function selectImage(file?: File) {
    if (!file || busy || processingImage) return;

    setProcessingImage(true);
    setError("");

    try {
      const blob = await compressImage(file);
      setImageBlob(blob);
    } catch (error) {
      setError(
        (error as { message?: string }).message ??
          "No se pudo preparar la fotografía."
      );
    } finally {
      setProcessingImage(false);
    }
  }

  function removeImage() {
    setImageBlob(null);
    setImagePath(null);
    setExistingPreview("");
  }

  async function saveExercise(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      busy ||
      loading ||
      loadFailed ||
      processingImage
    ) return;

    setError("");

    if (pendingLinkId && exercise) {
      setBusy(true);
      try {
        const { error } = await supabase.from("exercise_variants").insert({ exercise_id: exercise.id, variant_id: pendingLinkId });
        if (error && error.code !== "23505") throw error;
        onSaved(pendingLinkId);
      } catch (error) { setError((error as {message?: string}).message ?? "No se pudo vincular la variante."); }
      finally { setBusy(false); }
      return;
    }

    if (!name.trim()) {
      setError(
        "Introduce el nombre del ejercicio."
      );
      return;
    }

    if (
      !activeGroups.some(
        (group) => group.id === primaryGroup
      )
    ) {
      setError(
        "Selecciona un grupo muscular principal activo."
      );
      return;
    }

    if (
      secondaryGroups.some(
        (id) =>
          !activeGroups.some(
            (group) => group.id === id
          )
      )
    ) {
      setError(
        "Elimina o reactiva los grupos secundarios desactivados."
      );
      return;
    }

    setBusy(true);

    let uploadedPath: string | null = null;
    let finalImagePath = imagePath;
    let savedId: string | null = null;

    try {
      if (imageBlob) {
        const { data, error } =
          await supabase.auth.getUser();

        if (error || !data.user) {
          throw new Error(
            "No se ha podido verificar tu sesión."
          );
        }

        const path =
          `${data.user.id}/${crypto.randomUUID()}.jpg`;

        const { error: uploadError } =
          await supabase.storage
            .from("exercise-images")
            .upload(path, imageBlob, {
              contentType: "image/jpeg",
              upsert: false,
            });

        if (uploadError) throw uploadError;

        uploadedPath = path;
        finalImagePath = path;
      }

      const { data, error } = await supabase.rpc(
        "save_exercise",
        {
          p_exercise_id: duplicate ? null : exercise?.id ?? null,
          p_name: name.trim(),
          p_equipment: equipment.trim() || null,
          p_gym: exercise?.gym ?? null,
          p_image_path: finalImagePath,
          p_technique_notes:
            techniqueNotes.trim() || null,
          p_description:
            description.trim() || null,
          p_is_favorite: favorite,
          p_is_unilateral: unilateral,
          p_primary_group_id: primaryGroup,
          p_secondary_group_ids: secondaryGroups,
        }
      );

      if (error) throw error;

      if (typeof data !== "string" || !data) {
        throw new Error(
          "No se recibió la confirmación del ejercicio."
        );
      }

      savedId = data;
      if (duplicate && linkVariant && exercise) {
        const { error: linkError } = await supabase.from("exercise_variants").insert({ exercise_id: exercise.id, variant_id: savedId });
        if (linkError && linkError.code !== "23505") {
          setPendingLinkId(savedId);
          setError("El ejercicio se ha creado, pero no se pudo vincular. Puedes reintentar o volver a la biblioteca.");
          return;
        }
      }

      // Conservar imágenes anteriores: pueden estar compartidas por variantes.
    } catch (error) {
      // Comprobar referencias antes de limpiar
      // una fotografía recién subida.
      if (uploadedPath && !savedId) {
        try {
          const { count, error: referenceError } =
            await supabase
              .from("exercise_library")
              .select("id", {
                count: "exact",
                head: true,
              })
              .eq("image_path", uploadedPath);

          if (!referenceError && count === 0) {
            await supabase.storage
              .from("exercise-images")
              .remove([uploadedPath]);
          }
        } catch {
          // Conservar la imagen si no se puede
          // comprobar su estado con seguridad.
        }
      }

      setError(
        (error as { message?: string }).message ??
          "No se pudo guardar el ejercicio."
      );
    } finally {
      setBusy(false);
    }

    if (savedId) onSaved(savedId);
  }

  function cancel() {
    if (busy || processingImage) return;
    onBack();
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 17,
        color: C.text,
        width: "100%",
      }}
    >
      <button
        type="button"
        disabled={busy || processingImage}
        onClick={cancel}
        style={{
          display: "flex",
          alignItems: "center",
          alignSelf: "flex-start",
          gap: 8,
          background: "transparent",
          border: 0,
          color: C.dark,
          fontSize: 13,
          fontWeight: 600,
          padding: 0,
        }}
      >
        <ArrowLeft size={18} />
        Biblioteca de ejercicios
      </button>

      <header>
        <h2
          style={{
            fontSize: 24,
            fontWeight: 600,
            margin: 0,
          }}
        >
          {duplicate ? "Duplicar ejercicio" : exercise
            ? "Editar ejercicio"
            : "Nuevo ejercicio"}
        </h2>

        <p
          style={{
            fontSize: 12,
            color: C.muted,
            margin: "5px 0 0",
          }}
        >
          Personaliza tu biblioteca de entrenamiento.
        </p>
      </header>

      {loading ? (
        <FormaLoader />
      ) : loadFailed ? (
        <div style={card}>
          <p role="alert" style={{ color: C.danger }}>
            {error}
          </p>
          <button
            type="button"
            onClick={cancel}
            style={secondary}
          >
            Volver e intentar de nuevo
          </button>
        </div>
      ) : pendingLinkId ? (
        <form onSubmit={saveExercise} style={card}>
          <p role="alert" style={{color:C.danger}}>{error}</p>
          <button type="submit" disabled={busy} style={button}>Reintentar vinculación</button>
          <button type="button" disabled={busy} style={secondary} onClick={()=>onSaved(pendingLinkId)}>Volver a la biblioteca</button>
        </form>
      ) : (
        <form
          onSubmit={saveExercise}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 15,
          }}
        >
          {/* FOTOGRAFÍA */}
          <section
            style={{
              ...card,
              padding: 0,
              overflow: "hidden",
              gap: 0,
            }}
          >
            <div
              style={{
                position: "relative",
                minHeight: 180,
                aspectRatio: "16 / 10",
                background: C.pale,
                display: "grid",
                placeItems: "center",
                overflow: "hidden",
              }}
            >
              {preview ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={preview}
                  alt="Fotografía del ejercicio"
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                    padding: 20,
                    textAlign: "center",
                  }}
                >
                  <Camera
                    size={35}
                    color={C.green}
                    strokeWidth={1.5}
                  />

                  <span
                    style={{
                      fontSize: 13,
                      color: C.dark,
                      fontWeight: 600,
                    }}
                  >
                    {processingImage
                      ? "Preparando fotografía..."
                      : imagePath
                        ? "Fotografía guardada"
                        : "Añadir fotografía"}
                  </span>

                  <span
                    style={{
                      fontSize: 11,
                      color: C.muted,
                    }}
                  >
                    Cámara o galería del móvil
                  </span>
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                gap: 9,
                padding: 12,
              }}
            >
              <label
                style={{
                  ...secondary,
                  flex: 1,
                  width: "auto",
                  cursor:
                    busy || processingImage
                      ? "wait"
                      : "pointer",
                }}
              >
                <ImagePlus size={18} />

                {preview || imagePath
                  ? "Cambiar foto"
                  : "Seleccionar foto"}

                <input
                  type="file"
                  accept="image/*"
                  disabled={busy || processingImage}
                  style={{ display: "none" }}
                  onChange={(event) => {
                    const file =
                      event.target.files?.[0];

                    event.target.value = "";

                    void selectImage(file);
                  }}
                />
              </label>

              {(preview || imagePath || imageBlob) && (
                <button
                  type="button"
                  disabled={busy || processingImage}
                  onClick={removeImage}
                  aria-label="Quitar fotografía"
                  style={{
                    ...secondary,
                    width: 46,
                    padding: 0,
                    color: C.danger,
                  }}
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </section>

          {/* DATOS PRINCIPALES */}
          <section style={card}>
            <h3
              style={{
                fontSize: 15,
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Dumbbell size={19} color={C.green} />
              Datos del ejercicio
            </h3>

            <label style={label}>
              Nombre del ejercicio *
              <input
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="Ej. Hip Thrust"
                maxLength={120}
                required
                disabled={busy}
                style={input}
              />
            </label>

            <label style={label}>
              Grupo muscular principal *
              <select
                value={primaryGroup}
                onChange={(e) =>
                  changePrimary(e.target.value)
                }
                required
                disabled={busy}
                style={input}
              >
                <option value="">
                  Seleccionar grupo muscular
                </option>

                {groups
                  .filter(
                    (group) =>
                      group.is_active ||
                      group.id === primaryGroup
                  )
                  .map((group) => (
                    <option
                      key={group.id}
                      value={group.id}
                      disabled={!group.is_active}
                    >
                      {group.name}
                      {!group.is_active
                        ? " (desactivado)"
                        : ""}
                    </option>
                  ))}
              </select>
            </label>

            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 10,
                }}
              >
                Grupos musculares secundarios
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 7,
                }}
              >
                {secondaryGroups.map((id) => {
                  const group = groups.find(
                    (item) => item.id === id
                  );

                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        toggleSecondary(id)
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: C.pale,
                        border: 0,
                        borderRadius: 9,
                        color: C.dark,
                        padding: "9px 10px",
                        fontSize: 11,
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background:
                            group?.color ?? C.green,
                        }}
                      />

                      {group?.name ?? "Grupo no disponible"}

                      {group && !group.is_active
                        ? " (desactivado)"
                        : ""}

                      <X size={13} />
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    setShowSecondary((value) => !value)
                  }
                  style={{
                    ...secondary,
                    width: "auto",
                    minHeight: 35,
                    fontSize: 11,
                    padding: "8px 12px",
                  }}
                >
                  {showSecondary
                    ? "Cerrar selección"
                    : "+ Añadir grupo"}
                </button>
              </div>

              {showSecondary && (
                <div
                  style={{
                    display: "grid",
                    gap: 9,
                    padding: 12,
                    marginTop: 10,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                  }}
                >
                  {activeGroups
                    .filter(
                      (group) =>
                        group.id !== primaryGroup
                    )
                    .map((group) => (
                      <label
                        key={group.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 9,
                          fontSize: 12,
                        }}
                      >
                        <input
                          type="checkbox"
                          disabled={busy}
                          checked={secondaryGroups.includes(
                            group.id
                          )}
                          onChange={() =>
                            toggleSecondary(group.id)
                          }
                          style={{
                            accentColor: C.green,
                            width: 18,
                            height: 18,
                          }}
                        />

                        <span
                          style={{
                            width: 9,
                            height: 9,
                            borderRadius: "50%",
                            background: group.color,
                          }}
                        />

                        {group.name}
                      </label>
                    ))}
                </div>
              )}
            </div>

            <div style={label}>
              <label htmlFor="exercise-equipment">Equipamiento</label>
              <select id="exercise-equipment" value={customEquipment ? "custom" : equipment ? `item:${equipment}` : ""} disabled={busy} style={{...input,paddingRight:40}} onChange={e => {
                if (e.target.value === "custom") { setCustomEquipment(true); setEquipment(""); }
                else { setCustomEquipment(false); setEquipment(e.target.value.slice(5)); }
              }}>
                <option value="">Seleccionar equipamiento</option>
                {Array.from(new Set([...equipmentOptions, ...(!customEquipment && equipment ? [equipment] : [])])).map(item => <option key={item} value={`item:${item}`}>{item}</option>)}
                <option value="custom">+ Añadir otro equipamiento</option>
              </select>
              {customEquipment && <input aria-label="Nuevo equipamiento" value={equipment} onChange={e=>setEquipment(e.target.value)} maxLength={100} required disabled={busy} placeholder="Nombre del equipamiento" style={input}/>}
            </div>

          </section>

          {/* CONFIGURACIÓN */}
          <section style={card}>
            <Toggle
              title="Ejercicio unilateral"
              description="Permite registrar series independientes para cada lado."
              checked={unilateral}
              onChange={setUnilateral}
              disabled={busy}
            />

            <div
              style={{
                height: 1,
                background: C.border,
              }}
            />

            <Toggle
              title="Añadir a favoritos"
              description="Encuentra rápidamente tus ejercicios habituales."
              checked={favorite}
              onChange={setFavorite}
              disabled={busy}
            />
          </section>

          {duplicate && <section style={card}><Toggle title="Vincular como variante del ejercicio original" description="Cada ejercicio conservará su propio histórico." checked={linkVariant} onChange={setLinkVariant} disabled={busy || Boolean(pendingLinkId)}/></section>}
          {/* DESCRIPCIÓN Y TÉCNICA */}
          <section style={card}>
            <h3
              style={{
                fontSize: 15,
                margin: 0,
              }}
            >
              Descripción y técnica
            </h3>

            <label style={label}>
              Descripción
              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                placeholder="Descripción general del ejercicio..."
                rows={3}
                disabled={busy}
                style={{
                  ...input,
                  resize: "vertical",
                  lineHeight: 1.7,
                }}
              />
            </label>

            <label style={label}>
              Observaciones técnicas
              <textarea
                value={techniqueNotes}
                onChange={(e) =>
                  setTechniqueNotes(e.target.value)
                }
                placeholder="Ajustes de máquina, postura, recorrido, respiración..."
                rows={5}
                disabled={busy}
                style={{
                  ...input,
                  resize: "vertical",
                  lineHeight: 1.7,
                }}
              />
            </label>

            <p
              style={{
                margin: 0,
                color: C.muted,
                fontSize: 11,
                lineHeight: 1.7,
              }}
            >
              Estas observaciones estarán disponibles
              cada vez que selecciones este ejercicio
              en un entrenamiento.
            </p>
          </section>

          {favorite && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: C.dark,
                fontSize: 12,
              }}
            >
              <Star
                size={17}
                fill={C.green}
                color={C.green}
              />
              Ejercicio marcado como favorito
            </div>
          )}

          {error && (
            <div
              role="alert"
              style={{
                ...card,
                fontSize: 12,
                color: C.danger,
                lineHeight: 1.7,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={
              busy ||
              processingImage ||
              activeGroups.length === 0
            }
            style={{
              ...button,
              opacity:
                busy || processingImage ? 0.6 : 1,
            }}
          >
            <Check size={19} />

            {busy
              ? "Guardando ejercicio..."
              : processingImage
                ? "Preparando fotografía..."
                : exercise
                  ? "Guardar cambios"
                  : "Guardar ejercicio"}
          </button>

          {activeGroups.length === 0 && (
            <p
              style={{
                color: C.danger,
                fontSize: 12,
                margin: 0,
              }}
            >
              Necesitas al menos un grupo muscular
              activo para guardar ejercicios.
            </p>
          )}

          <button
            type="button"
            disabled={busy || processingImage}
            onClick={cancel}
            style={secondary}
          >
            Cancelar
          </button>
        </form>
      )}
    </div>
  );
}
