
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  House,
  Salad,
  Dumbbell,
  ChartNoAxesColumnIncreasing,
  BookOpen,
  LogOut,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  ArrowLeft,
  CalendarDays,
  Check,
  X,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "../lib/supabase/client";

type Section =
  | "home"
  | "nutrition"
  | "training"
  | "progress"
  | "library";

type PlannedMeal = {
  id: string;
  meal_date: string;
  meal_type: string;
  nutrition_plan_id: string;
  nutrition_meal_id: string | null;
  meal_name_snapshot: string | null;
  ingredients_snapshot: unknown;
  instructions_snapshot: string | null;
};

type NutritionOption = {
  id: string;
  plan_id: string;
  meal_type: string;
  option_number: number;
  name: string;
  instructions: string | null;
};

type Ingredient = {
  ingredient: string;
  quantity: number | null;
  unit: string | null;
};

type NavItem = {
  id: Section;
  title: string;
  shortTitle: string;
  icon: LucideIcon;
};

const C = {
  green: "#7D8C82",
  darkGreen: "#687A6D",
  bg: "#F7F8F6",
  text: "#25382F",
  muted: "#7C8980",
  border: "#E5EAE5",
  pale: "#EEF2EE",
  white: "#FFFFFF",
  danger: "#B45353",
};

const mealTypes = [
  { id: "breakfast", label: "Desayuno" },
  { id: "morning_snack", label: "Media mañana" },
  { id: "lunch", label: "Almuerzo" },
  { id: "lunch_dessert", label: "Postre del almuerzo" },
  { id: "afternoon_snack", label: "Merienda" },
  { id: "dinner", label: "Cena" },
  { id: "dinner_dessert", label: "Postre de la cena" },
];

const navigation: NavItem[] = [
  { id: "home", title: "Inicio", shortTitle: "Inicio", icon: House },
  { id: "nutrition", title: "Nutrición", shortTitle: "Nutrición", icon: Salad },
  { id: "training", title: "Entrenamiento", shortTitle: "Entreno", icon: Dumbbell },
  {
    id: "progress",
    title: "Mi progreso",
    shortTitle: "Progreso",
    icon: ChartNoAxesColumnIncreasing,
  },
  { id: "library", title: "Biblioteca", shortTitle: "Biblioteca", icon: BookOpen },
];

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function localDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(value: string, amount: number) {
  const date = parseDate(value);
  date.setDate(date.getDate() + amount);
  return localDate(date);
}

function mondayOf(value: string) {
  const date = parseDate(value);
  const day = date.getDay();
  date.setDate(date.getDate() - ((day + 6) % 7));
  return localDate(date);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  }).format(parseDate(value));
}

function weekdayName(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
  })
    .format(parseDate(value))
    .replace(".", "");
}

function mealLabel(type: string) {
  return mealTypes.find((item) => item.id === type)?.label ?? type;
}

function mealName(meal?: PlannedMeal) {
  return meal?.meal_name_snapshot || "Sin planificar";
}

function normalizeIngredients(value: unknown): Ingredient[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];

    const row = item as Record<string, unknown>;
    const name = row.ingredient ?? row.name ?? row.nombre;
    const quantity =
      row.quantity ?? row.cantidad ?? row.amount ?? null;
    const unit = row.unit ?? row.unidad ?? null;

    if (typeof name !== "string") return [];

    return [{
      ingredient: name,
      quantity:
        typeof quantity === "number"
          ? quantity
          : typeof quantity === "string" &&
              quantity.trim() !== "" &&
              Number.isFinite(Number(quantity))
            ? Number(quantity)
            : null,
      unit: typeof unit === "string" ? unit : null,
    }];
  });
}

function Button({
  children,
  onClick,
  secondary = false,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        minHeight: 46,
        padding: "11px 14px",
        background: secondary ? C.pale : C.green,
        color: secondary ? C.darkGreen : C.white,
        border: "none",
        borderRadius: 13,
        fontFamily: "inherit",
        fontSize: 12,
        fontWeight: 600,
        cursor: disabled ? "wait" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

export default function HomePage() {
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);

  const [section, setSection] = useState<Section>("home");
  const [checkingSession, setCheckingSession] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const [today, setToday] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [weekStart, setWeekStart] = useState("");

  const [meals, setMeals] = useState<PlannedMeal[]>([]);
  const [loadingMeals, setLoadingMeals] = useState(true);
  const [mealError, setMealError] = useState("");

  const [selectedMeal, setSelectedMeal] = useState<PlannedMeal | null>(null);
  const [options, setOptions] = useState<NutritionOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [optionError, setOptionError] = useState("");
  const [changingOption, setChangingOption] = useState(false);
  const [savingOption, setSavingOption] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function initialize() {
      const date = localDate();

      setToday(date);
      setSelectedDay(date);
      setWeekStart(mondayOf(date));

      const { data, error } = await supabase.auth.getUser();

      if (!active) return;

      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      setCheckingSession(false);
    }

    initialize();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  const loadMeals = useCallback(async () => {
    if (!today || checkingSession) return;

    setLoadingMeals(true);
    setMealError("");

    const first = weekStart || mondayOf(today);
    const last = addDays(first, 6);

    const { data, error } = await supabase
      .from("weekly_meal_plans")
      .select(
        "id, meal_date, meal_type, nutrition_plan_id, nutrition_meal_id, meal_name_snapshot, ingredients_snapshot, instructions_snapshot"
      )
      .gte("meal_date", first)
      .lte("meal_date", last);

    if (error) {
      setMealError(`${error.message} (${error.code || "sin código"})`);
      setMeals([]);
    } else {
      setMeals((data ?? []) as PlannedMeal[]);
    }

    setLoadingMeals(false);
  }, [supabase, today, weekStart, checkingSession]);

  useEffect(() => {
    loadMeals();
  }, [loadMeals, refreshKey]);

  function navigate(destination: Section) {
    setSection(destination);
    setSelectedMeal(null);
    setChangingOption(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function logout() {
    setLoggingOut(true);
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("No se pudo cerrar sesión.");
      setLoggingOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  function openMeal(meal: PlannedMeal) {
    setSelectedMeal(meal);
    setChangingOption(false);
    setOptions([]);
    setOptionError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function showOptions() {
    if (!selectedMeal) return;

    setChangingOption(true);
    setLoadingOptions(true);
    setOptionError("");

    const { data, error } = await supabase
      .from("nutrition_meals")
      .select(
        "id, plan_id, meal_type, option_number, name, instructions"
      )
      .eq("plan_id", selectedMeal.nutrition_plan_id)
      .eq("meal_type", selectedMeal.meal_type)
      .order("option_number", { ascending: true });

    if (error) {
      setOptionError(`${error.message} (${error.code || "sin código"})`);
      setOptions([]);
    } else {
      setOptions((data ?? []) as NutritionOption[]);
    }

    setLoadingOptions(false);
  }

  async function saveOption(option: NutritionOption) {
    if (!selectedMeal || savingOption) return;

    setSavingOption(true);
    setOptionError("");

    /*
      Primero recuperamos los ingredientes de la opción elegida
      para guardar una copia histórica en weekly_meal_plans.
    */
    const { data: ingredientRows, error: ingredientError } =
      await supabase
        .from("nutrition_ingredients")
        .select("*")
        .eq("meal_id", option.id);

    if (ingredientError) {
      setOptionError(
        `No se pudieron consultar los ingredientes: ${ingredientError.message}`
      );
      setSavingOption(false);
      return;
    }

    const ingredientsSnapshot = (ingredientRows ?? []).map(
      (row: Record<string, unknown>) => ({
        ingredient: row.ingredient ?? row.name ?? row.nombre ?? "",
        quantity: row.quantity ?? row.cantidad ?? null,
        unit: row.unit ?? row.unidad ?? null,
      })
    );

    const { error } = await supabase
      .from("weekly_meal_plans")
      .update({
        nutrition_meal_id: option.id,
        meal_name_snapshot: option.name,
        ingredients_snapshot: ingredientsSnapshot,
        instructions_snapshot: option.instructions,
      })
      .eq("id", selectedMeal.id);

    if (error) {
      setOptionError(`${error.message} (${error.code || "sin código"})`);
      setSavingOption(false);
      return;
    }

    setSelectedMeal(null);
    setChangingOption(false);
    setSavingOption(false);
    setRefreshKey((value) => value + 1);
  }

  const weekDays = useMemo(
    () =>
      weekStart
        ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
        : [],
    [weekStart]
  );

  const todayMeals = meals.filter((meal) => meal.meal_date === today);

  const selectedDayMeals = meals.filter(
    (meal) => meal.meal_date === selectedDay
  );

  function renderMealRows(
    items: PlannedMeal[],
    interactive: boolean
  ) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 15,
        }}
      >
        {mealTypes.map((type, index) => {
          const meal = items.find(
            (item) => item.meal_type === type.id
          );

          const content = (
            <>
              <div
                style={{
                  width: 33,
                  height: 33,
                  flexShrink: 0,
                  borderRadius: 10,
                  display: "grid",
                  placeItems: "center",
                  background: C.pale,
                  color: C.green,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {index + 1}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: "0 0 3px",
                    color: C.muted,
                    fontSize: 10,
                  }}
                >
                  {type.label}
                </p>

                <p
                  style={{
                    margin: 0,
                    color: C.text,
                    fontSize: 12,
                    fontWeight: 500,
                    lineHeight: 1.5,
                  }}
                >
                  {mealName(meal)}
                </p>
              </div>

              {interactive && meal && (
                <ChevronRight
                  size={16}
                  color={C.green}
                  strokeWidth={1.6}
                />
              )}
            </>
          );

          if (interactive && meal) {
            return (
              <button
                type="button"
                key={type.id}
                onClick={() => openMeal(meal)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: "3px 0",
                  border: "none",
                  background: "transparent",
                  textAlign: "left",
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                {content}
              </button>
            );
          }

          return (
            <div
              key={type.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              {content}
            </div>
          );
        })}
      </div>
    );
  }

  if (checkingSession) {
    return (
      <main
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: C.bg,
          color: C.green,
        }}
      >
        Comprobando acceso a FORMA...
      </main>
    );
  }

  const current = navigation.find((item) => item.id === section);

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: C.bg,
        color: C.text,
        fontFamily: "inherit",
      }}
    >
      <div
        style={{
          maxWidth: 680,
          margin: "0 auto",
          padding:
            "20px 18px calc(115px + env(safe-area-inset-bottom))",
        }}
      >
        {/* CABECERA */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 25,
          }}
        >
          <button
            type="button"
            onClick={() => navigate("home")}
            aria-label="Ir al inicio"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: 0,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <Image
              src="/isotipo.png"
              alt="FORMA"
              width={45}
              height={45}
              priority
              style={{
                borderRadius: 12,
                objectFit: "contain",
              }}
            />
            <span
              style={{
                color: C.green,
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: "0.16em",
              }}
            >
              FORMA
            </span>
          </button>

          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            aria-label="Cerrar sesión"
            style={{
              width: 43,
              height: 43,
              display: "grid",
              placeItems: "center",
              background: C.white,
              color: C.green,
              border: `1px solid ${C.border}`,
              borderRadius: 13,
              cursor: "pointer",
            }}
          >
            <LogOut size={19} strokeWidth={1.7} />
          </button>
        </header>

        {/* HOME */}
        {section === "home" && (
          <>
            <section style={{ marginBottom: 23 }}>
              <p
                style={{
                  color: C.green,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                  margin: "0 0 7px",
                }}
              >
                {today && dateFormatter.format(parseDate(today))}
              </p>

              <h1
                style={{
                  fontSize: 29,
                  fontWeight: 600,
                  letterSpacing: "-0.04em",
                  margin: "0 0 7px",
                }}
              >
                Mi día de hoy
              </h1>

              <p
                style={{
                  fontSize: 12,
                  color: C.muted,
                  margin: 0,
                }}
              >
                Tu alimentación y entrenamiento diario.
              </p>
            </section>

            <section
              style={{
                background: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: 21,
                padding: "19px 17px",
                marginBottom: 17,
              }}
            >
              <button
                type="button"
                onClick={() => navigate("nutrition")}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  color: C.text,
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 16,
                    fontWeight: 600,
                  }}
                >
                  <Salad size={22} color={C.green} strokeWidth={1.7} />
                  Mi menú de hoy
                </span>
                <ChevronRight size={19} color={C.green} />
              </button>

              <div
                style={{
                  height: 1,
                  background: C.border,
                  margin: "17px 0",
                }}
              />

              {loadingMeals ? (
                <p style={{ color: C.muted, fontSize: 12 }}>
                  Cargando tu menú...
                </p>
              ) : mealError ? (
                <p role="alert" style={{ color: C.danger, fontSize: 12 }}>
                  {mealError}
                </p>
              ) : (
                renderMealRows(todayMeals, true)
              )}

              <div style={{ marginTop: 20 }}>
                <Button
                  secondary
                  onClick={() => navigate("nutrition")}
                >
                  Ver mi planificación semanal
                </Button>
              </div>
            </section>

            <section
              style={{
                background: C.green,
                color: C.white,
                borderRadius: 21,
                padding: 19,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <Dumbbell size={23} strokeWidth={1.7} />
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                  Mi entrenamiento
                </h2>
              </div>

              <p
                style={{
                  margin: "0 0 17px",
                  fontSize: 12,
                  lineHeight: 1.6,
                  opacity: 0.9,
                }}
              >
                Registra tu sesión cuando entrenes.
                Tú decides tus días de descanso.
              </p>

              <button
                type="button"
                onClick={() => navigate("training")}
                style={{
                  width: "100%",
                  minHeight: 47,
                  background: C.white,
                  color: C.darkGreen,
                  border: "none",
                  borderRadius: 13,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                + Registrar entrenamiento
              </button>
            </section>
          </>
        )}

        {/* NUTRICIÓN */}
        {section === "nutrition" && (
          <>
            {selectedMeal ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMeal(null);
                    setChangingOption(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    border: "none",
                    background: "transparent",
                    color: C.green,
                    fontFamily: "inherit",
                    fontSize: 12,
                    cursor: "pointer",
                    padding: "0 0 18px",
                  }}
                >
                  <ArrowLeft size={18} />
                  Volver al menú
                </button>

                <p
                  style={{
                    margin: "0 0 7px",
                    color: C.green,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {mealLabel(selectedMeal.meal_type)}
                </p>

                <h1
                  style={{
                    margin: "0 0 20px",
                    fontSize: 25,
                    lineHeight: 1.3,
                    fontWeight: 600,
                  }}
                >
                  {mealName(selectedMeal)}
                </h1>

                <section
                  style={{
                    background: C.white,
                    border: `1px solid ${C.border}`,
                    borderRadius: 20,
                    padding: 19,
                    marginBottom: 15,
                  }}
                >
                  <h2 style={{ fontSize: 15, margin: "0 0 15px" }}>
                    Ingredientes
                  </h2>

                  {normalizeIngredients(
                    selectedMeal.ingredients_snapshot
                  ).length === 0 ? (
                    <p style={{ color: C.muted, fontSize: 12 }}>
                      No hay ingredientes detallados para esta comida.
                    </p>
                  ) : (
                    normalizeIngredients(
                      selectedMeal.ingredients_snapshot
                    ).map((ingredient, index) => (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 15,
                          padding: "10px 0",
                          borderBottom: `1px solid ${C.border}`,
                          fontSize: 12,
                        }}
                      >
                        <span>{ingredient.ingredient}</span>
                        <span
                          style={{
                            color: C.green,
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {ingredient.quantity ?? ""}
                          {" "}
                          {ingredient.unit ?? ""}
                        </span>
                      </div>
                    ))
                  )}
                </section>

                {selectedMeal.instructions_snapshot && (
                  <section
                    style={{
                      background: C.white,
                      border: `1px solid ${C.border}`,
                      borderRadius: 20,
                      padding: 19,
                      marginBottom: 15,
                    }}
                  >
                    <h2 style={{ fontSize: 15, margin: "0 0 12px" }}>
                      Preparación
                    </h2>
                    <p
                      style={{
                        color: C.muted,
                        fontSize: 12,
                        lineHeight: 1.8,
                        whiteSpace: "pre-wrap",
                        margin: 0,
                      }}
                    >
                      {selectedMeal.instructions_snapshot}
                    </p>
                  </section>
                )}

                {!changingOption ? (
                  <Button onClick={showOptions}>
                    Cambiar esta comida
                  </Button>
                ) : (
                  <section
                    style={{
                      background: C.white,
                      border: `1px solid ${C.border}`,
                      borderRadius: 20,
                      padding: 18,
                    }}
                  >
                    <h2 style={{ fontSize: 15, margin: "0 0 14px" }}>
                      Elige otra opción
                    </h2>

                    {loadingOptions ? (
                      <p style={{ fontSize: 12, color: C.muted }}>
                        Cargando opciones...
                      </p>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 9,
                        }}
                      >
                        {options.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            disabled={savingOption}
                            onClick={() => saveOption(option)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 10,
                              textAlign: "left",
                              padding: "13px 12px",
                              background:
                                option.id === selectedMeal.nutrition_meal_id
                                  ? C.pale
                                  : C.white,
                              border: `1px solid ${C.border}`,
                              borderRadius: 12,
                              fontFamily: "inherit",
                              color: C.text,
                              fontSize: 12,
                              cursor: "pointer",
                            }}
                          >
                            <span>
                              {option.option_number}. {option.name}
                            </span>
                            {option.id === selectedMeal.nutrition_meal_id && (
                              <Check size={17} color={C.green} />
                            )}
                          </button>
                        ))}

                        {options.length === 0 && !optionError && (
                          <p style={{ fontSize: 12, color: C.muted }}>
                            No hay opciones disponibles para esta comida.
                          </p>
                        )}
                      </div>
                    )}

                    {optionError && (
                      <p
                        role="alert"
                        style={{
                          color: C.danger,
                          fontSize: 11,
                          lineHeight: 1.6,
                        }}
                      >
                        {optionError}
                      </p>
                    )}

                    <div style={{ marginTop: 15 }}>
                      <Button
                        secondary
                        onClick={() => setChangingOption(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </section>
                )}
              </>
            ) : (
              <>
                <section style={{ marginBottom: 22 }}>
                  <p
                    style={{
                      color: C.green,
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.09em",
                      margin: "0 0 7px",
                    }}
                  >
                    TU PLANIFICACIÓN
                  </p>
                  <h1
                    style={{
                      fontSize: 28,
                      margin: "0 0 7px",
                      fontWeight: 600,
                    }}
                  >
                    Nutrición
                  </h1>
                  <p
                    style={{
                      fontSize: 12,
                      color: C.muted,
                      margin: 0,
                    }}
                  >
                    Consulta y organiza tus comidas.
                  </p>
                </section>

                {/* SELECTOR DE SEMANA */}
                <section
                  style={{
                    background: C.white,
                    border: `1px solid ${C.border}`,
                    borderRadius: 20,
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 17,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setWeekStart((value) => addDays(value, -7))
                      }
                      aria-label="Semana anterior"
                      style={{
                        border: "none",
                        background: C.pale,
                        color: C.green,
                        borderRadius: 10,
                        padding: 8,
                        cursor: "pointer",
                      }}
                    >
                      <ChevronLeft size={18} />
                    </button>

                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        color: C.text,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <CalendarDays size={17} color={C.green} />
                      {weekStart &&
                        `${shortDate(weekStart)} - ${shortDate(
                          addDays(weekStart, 6)
                        )}`}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setWeekStart((value) => addDays(value, 7))
                      }
                      aria-label="Semana siguiente"
                      style={{
                        border: "none",
                        background: C.pale,
                        color: C.green,
                        borderRadius: 10,
                        padding: 8,
                        cursor: "pointer",
                      }}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(7, minmax(0, 1fr))",
                      gap: 4,
                    }}
                  >
                    {weekDays.map((day) => {
                      const active = selectedDay === day;

                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => setSelectedDay(day)}
                          style={{
                            minWidth: 0,
                            minHeight: 54,
                            border: "none",
                            borderRadius: 11,
                            background: active ? C.green : C.pale,
                            color: active ? C.white : C.darkGreen,
                            fontFamily: "inherit",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 4,
                          }}
                        >
                          <span style={{ fontSize: 10 }}>
                            {weekdayName(day)}
                          </span>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                            }}
                          >
                            {parseDate(day).getDate()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* COMIDAS DEL DÍA */}
                <section
                  style={{
                    background: C.white,
                    border: `1px solid ${C.border}`,
                    borderRadius: 20,
                    padding: 18,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 19,
                    }}
                  >
                    <h2
                      style={{
                        fontSize: 15,
                        margin: 0,
                        fontWeight: 600,
                      }}
                    >
                      {selectedDay &&
                        dateFormatter.format(parseDate(selectedDay))}
                    </h2>

                    <button
                      type="button"
                      onClick={() =>
                        setRefreshKey((value) => value + 1)
                      }
                      aria-label="Actualizar menú"
                      style={{
                        border: "none",
                        background: "transparent",
                        color: C.green,
                        cursor: "pointer",
                      }}
                    >
                      <RefreshCw size={17} />
                    </button>
                  </div>

                  {loadingMeals ? (
                    <p style={{ fontSize: 12, color: C.muted }}>
                      Cargando comidas...
                    </p>
                  ) : mealError ? (
                    <p
                      role="alert"
                      style={{ fontSize: 12, color: C.danger }}
                    >
                      {mealError}
                    </p>
                  ) : (
                    renderMealRows(selectedDayMeals, true)
                  )}
                </section>
              </>
            )}
          </>
        )}

        {/* RESTO DE SECCIONES */}
        {section !== "home" && section !== "nutrition" && (
          <>
            <section style={{ marginBottom: 23 }}>
              <div
                style={{
                  width: 53,
                  height: 53,
                  display: "grid",
                  placeItems: "center",
                  background: C.pale,
                  color: C.green,
                  borderRadius: 15,
                  marginBottom: 15,
                }}
              >
                {current && (
                  <current.icon size={26} strokeWidth={1.7} />
                )}
              </div>

              <h1
                style={{
                  fontSize: 27,
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                {current?.title}
              </h1>
            </section>

            <section
              style={{
                background: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: 20,
                padding: 22,
              }}
            >
              <h2 style={{ fontSize: 15, margin: "0 0 8px" }}>
                Próximamente
              </h2>
              <p
                style={{
                  color: C.muted,
                  fontSize: 12,
                  lineHeight: 1.8,
                  margin: 0,
                }}
              >
                Aquí desarrollaremos las funciones de{" "}
                {current?.title.toLowerCase()}.
              </p>
            </section>
          </>
        )}
      </div>

      {/* MENÚ INFERIOR */}
      <nav
        aria-label="Navegación principal"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: C.white,
          borderTop: `1px solid ${C.border}`,
          paddingBottom: "env(safe-area-inset-bottom)",
          boxShadow: "0 -5px 24px rgba(0,0,0,0.035)",
        }}
      >
        <div
          style={{
            maxWidth: 680,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns:
              "repeat(5, minmax(0, 1fr))",
            padding: "10px 5px 8px",
          }}
        >
          {navigation.map((item) => {
            const Icon = item.icon;
            const selected = section === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                aria-current={selected ? "page" : undefined}
                style={{
                  minWidth: 0,
                  minHeight: 49,
                  border: "none",
                  background: "transparent",
                  color: selected ? C.darkGreen : C.muted,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  padding: "4px 1px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <Icon
                  size={21}
                  strokeWidth={selected ? 2.2 : 1.6}
                />
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: selected ? 600 : 400,
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.shortTitle}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </main>
  );
}
