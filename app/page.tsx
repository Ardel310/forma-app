"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  ArrowLeft,
  RefreshCw,
  CalendarDays,
  Check,
  ShoppingCart,
  Scale,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "../lib/supabase/client";
import ShoppingList from "../components/ShoppingList";
import NutritionPlans from "../components/NutritionPlans";

type Section =
  | "home"
  | "nutrition"
  | "training"
  | "progress"
  | "library";

type PlannedMeal = {
  id: string;
  user_id: string;
  meal_date: string;
  meal_type: string;
  nutrition_plan_id: string;
  nutrition_meal_id: string | null;
  meal_name_snapshot: string | null;
  ingredients_snapshot: unknown;
  instructions_snapshot: string | null;
  original_ingredients_snapshot?: unknown;
  ingredient_substitutions?: unknown;
  cooking_overrides?: unknown;
  cooking_conversions_snapshot?: unknown;
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
  index: number;
  ingredient: string;
  quantity: number | null;
  unit: string | null;
};

type Conversion = {
  ingredient_name: string;
  cooking_method: string;
  conversion_factor: number;
};
const ingredientKey = (name: string) => name.trim().toLocaleLowerCase("es");
const formatAmount = (n: number) => new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(n);

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
  {
    id: "home",
    title: "Inicio",
    shortTitle: "Inicio",
    icon: House,
  },
  {
    id: "nutrition",
    title: "Nutrición",
    shortTitle: "Nutrición",
    icon: Salad,
  },
  {
    id: "training",
    title: "Entrenamiento",
    shortTitle: "Entreno",
    icon: Dumbbell,
  },
  {
    id: "progress",
    title: "Mi progreso",
    shortTitle: "Progreso",
    icon: ChartNoAxesColumnIncreasing,
  },
  {
    id: "library",
    title: "Biblioteca",
    shortTitle: "Biblioteca",
    icon: BookOpen,
  },
];

function localDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(value: string, days: number) {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  return localDate(date);
}

function mondayOf(value: string) {
  const date = parseDate(value);
  date.setDate(
    date.getDate() - ((date.getDay() + 6) % 7)
  );
  return localDate(date);
}

function fullDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(parseDate(value));
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  }).format(parseDate(value));
}

function weekday(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
  })
    .format(parseDate(value))
    .replace(".", "");
}

function mealLabel(type: string) {
  return (
    mealTypes.find((item) => item.id === type)?.label ??
    type
  );
}

function normalizeIngredients(value: unknown): Ingredient[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];

    const row = item as Record<string, unknown>;

    const name =
      row.ingredient ?? row.name ?? row.nombre;

    const amount =
      row.quantity ?? row.cantidad ?? row.amount;

    const unit = row.unit ?? row.unidad;

    if (typeof name !== "string" || !name.trim()) {
      return [];
    }

    const quantity =
      typeof amount === "number"
        ? amount
        : typeof amount === "string" &&
            amount.trim() !== "" &&
            Number.isFinite(Number(amount))
          ? Number(amount)
          : null;

    return [
      {
        index,
        ingredient: name,
        quantity,
        unit: typeof unit === "string" ? unit : null,
      },
    ];
  });
}

function AppButton({
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
        padding: "12px 15px",
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
  const [checkingSession, setCheckingSession] =
    useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const [today, setToday] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [weekStart, setWeekStart] = useState("");

  const [meals, setMeals] = useState<PlannedMeal[]>([]);
  const [loadingMeals, setLoadingMeals] = useState(true);
  const [mealError, setMealError] = useState("");

  const [selectedMeal, setSelectedMeal] =
    useState<PlannedMeal | null>(null);

  const [options, setOptions] = useState<NutritionOption[]>(
    []
  );
  const [loadingOptions, setLoadingOptions] =
    useState(false);
  const [changingOption, setChangingOption] =
    useState(false);
  const [savingOption, setSavingOption] =
    useState(false);
  const [optionError, setOptionError] = useState("");

  const [duplicating, setDuplicating] = useState(false);
  const [weekMessage, setWeekMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [showShopping, setShowShopping] = useState(false);
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [conversionError, setConversionError] = useState("");
  const [loadingConversions, setLoadingConversions] = useState(false);

  const [alternatives, setAlternatives] = useState<{id:string;original_food:string;original_quantity:number;alternative_food:string;alternative_quantity:number}[]>([]);
  const [editableMeal, setEditableMeal] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [busyDetail, setBusyDetail] = useState(false);
  const mealId = selectedMeal?.id;
  const planId = selectedMeal?.nutrition_plan_id;
  const recipeId = selectedMeal?.nutrition_meal_id;
  const mealDate = selectedMeal?.meal_date;
  const historical = selectedMeal?.cooking_conversions_snapshot;
  useEffect(() => {
    let active = true;
    setConversions([]); setAlternatives([]); setEditableMeal(false); setDetailError(""); setConversionError("");
    if (!mealId || !planId || checkingSession) { setLoadingConversions(false); return; }
    setLoadingConversions(true);
    async function loadDetails() {
      try {
        const past = !!mealDate && mealDate < today;
        const [p,c,e] = await Promise.all([
          supabase.from("nutrition_plans").select("status").eq("id",planId!).single(),
          supabase.from("cooking_conversions").select("ingredient_name,cooking_method,conversion_factor").eq("plan_id",planId!),
          supabase.from("food_equivalences").select("id,original_food,original_quantity,alternative_food,alternative_quantity").eq("plan_id",planId!).eq("meal_id",recipeId ?? "00000000-0000-0000-0000-000000000000")
        ]);
        if (!active) return;
        if (p.error) throw p.error;
        if (c.error) throw c.error;
        if (e.error) throw e.error;
        setConversions(past && Array.isArray(historical) ? historical as Conversion[] : (c.data ?? []) as Conversion[]);
        setEditableMeal(!past && p.data.status === "active");
        if (!past && p.data.status === "active") setAlternatives(e.data ?? []);
      } catch(e) { if(active) setConversionError((e as {message?:string}).message ?? "Error al cargar detalles"); }
      finally { if(active) setLoadingConversions(false); }
    }
    void loadDetails(); return () => {active=false;};
  }, [checkingSession,supabase,mealId,planId,recipeId,mealDate,today,historical,refreshKey]);

  async function refreshDetail(id:string) {
    const {data,error}=await supabase.from("weekly_meal_plans").select("*").eq("id",id).single();
    if(error) throw error;
    setSelectedMeal(old=>old?.id===id?data as PlannedMeal:old);
    setRefreshKey(v=>v+1);
  }
  async function substitute(index:number, equivalence:string|null) {
    if(!selectedMeal || !editableMeal || busyDetail) return;
    const id=selectedMeal.id; setBusyDetail(true); setDetailError("");
    try { const {error}=await supabase.rpc("substitute_planned_ingredient",{p_planned_meal_id:id,p_ingredient_index:index,p_equivalence_id:equivalence}); if(error) throw error; await refreshDetail(id); }
    catch(e){setDetailError((e as {message?:string}).message ?? "No se pudo sustituir");} finally{setBusyDetail(false);}
  }
  // SESIÓN
  useEffect(() => {
    let active = true;

    async function initialize() {
      const date = localDate();

      setToday(date);
      setSelectedDay(date);
      setWeekStart(mondayOf(date));

      const { data, error } =
        await supabase.auth.getUser();

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

  // CARGAR COMIDAS DE LA SEMANA
  const loadMeals = useCallback(async () => {
    if (!today || !weekStart || checkingSession) {
      return;
    }

    setLoadingMeals(true);
    setMealError("");

    const { data, error } = await supabase
      .from("weekly_meal_plans")
      .select(
        "id, user_id, meal_date, meal_type, nutrition_plan_id, nutrition_meal_id, meal_name_snapshot, ingredients_snapshot, instructions_snapshot, original_ingredients_snapshot, ingredient_substitutions, cooking_overrides, cooking_conversions_snapshot"
      )
      .gte("meal_date", weekStart)
      .lte("meal_date", addDays(weekStart, 6))
      .order("meal_date", { ascending: true });

    if (error) {
      setMeals([]);
      setMealError(
        `${error.message} (${error.code || "sin código"})`
      );
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
    setShowShopping(false);
    if (destination === "home" && today) setWeekStart(mondayOf(today));
    setSelectedMeal(null);
    setChangingOption(false);
    setOptionError("");

    if (destination === "nutrition" && today) {
      setSelectedDay(today);
      setWeekStart(mondayOf(today));
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ABRIR FICHA DESDE HOME O NUTRICIÓN
  function openMeal(meal: PlannedMeal) {
    setSection("nutrition");
    setShowShopping(false);
    setSelectedDay(meal.meal_date);
    setWeekStart(mondayOf(meal.meal_date));
    setSelectedMeal(meal);

    setChangingOption(false);
    setOptions([]);
    setOptionError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeMeal() {
    setSelectedMeal(null);
    setChangingOption(false);
    setOptionError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // CONSULTAR OPCIONES DE LA MISMA COMIDA
  async function showOptions(target = selectedMeal) {
    if (!target) return;
    setChangingOption(true);
    setLoadingOptions(true);
    setOptionError("");
    setOptions([]);
    try {
      const { data: plans, error: planError } = await supabase
        .from("nutrition_plans").select("id")
        .eq("status", "active")
        .lte("start_date", target.meal_date)
        .or(`end_date.is.null,end_date.gte.${target.meal_date}`);
      if (planError) throw planError;
      if (!plans?.length) throw new Error("No hay un plan activo para esta fecha.");
      if (plans.length !== 1) throw new Error("Hay varios planes activos para esta fecha. Revisa Biblioteca.");
      const { data, error } = await supabase.from("nutrition_meals")
        .select("id, plan_id, meal_type, option_number, name, instructions")
        .eq("plan_id", plans[0].id).eq("meal_type", target.meal_type)
        .eq("is_active", true)
        .order("option_number");
      if (error) throw error;
      setOptions((data ?? []) as NutritionOption[]);
    } catch (error) {
      setOptionError((error as {message?: string}).message || "No se pudieron cargar las opciones.");
    } finally { setLoadingOptions(false); }
  }

  function openEmptyMeal(date: string, type: string) {
    const target: PlannedMeal = {id:"", user_id:"", meal_date:date, meal_type:type,
      nutrition_plan_id:"", nutrition_meal_id:null, meal_name_snapshot:null,
      ingredients_snapshot:[], instructions_snapshot:null};
    openMeal(target);
    void showOptions(target);
  }

  async function saveOption(option: NutritionOption) {
    if (!selectedMeal || savingOption) return;
    if (selectedMeal.id && ((Array.isArray(selectedMeal.ingredient_substitutions) && selectedMeal.ingredient_substitutions.length) || (Array.isArray(selectedMeal.cooking_overrides) && selectedMeal.cooking_overrides.length)) && !window.confirm("Cambiar la comida eliminará sus ajustes individuales. ¿Continuar?")) return;
    setSavingOption(true);
    setOptionError("");
    try {
      const {error} = await supabase.rpc("save_planned_meal", {
        p_meal_date: selectedMeal.meal_date,
        p_meal_type: selectedMeal.meal_type,
        p_nutrition_meal_id: option.id,
      });
      if (error) throw error;
      setSelectedMeal(null);
      setChangingOption(false);
      setRefreshKey(v => v + 1);
    } catch (error) {
      setOptionError((error as {message?: string}).message || "No se pudo guardar la comida.");
    } finally { setSavingOption(false); }
  }

  async function duplicateWeek() {
    if (!weekStart || duplicating) return;
    setDuplicating(true);
    setWeekMessage("");
    try {
      const {data,error} = await supabase.rpc("duplicate_previous_week", {p_week_start:weekStart});
      if (error) throw error;
      setWeekMessage(Number(data) > 0 ? `${data} comidas copiadas. Las existentes se han conservado.` : "No hay comidas compatibles pendientes de copiar. Puedes seleccionar las opciones individualmente.");
      setRefreshKey(v => v + 1);
    } catch(error) {
      setWeekMessage((error as {message?:string}).message || "No se pudo duplicar la semana.");
    } finally { setDuplicating(false); }
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

  function changeWeek(days: number) {
    if (duplicating) return;
    setWeekMessage("");
    const next = addDays(weekStart, days);
    setWeekStart(next);
    setSelectedDay(next);
  }

  const weekDays = useMemo(
    () =>
      weekStart
        ? Array.from(
            { length: 7 },
            (_, i) => addDays(weekStart, i)
          )
        : [],
    [weekStart]
  );

  const todayMeals = meals.filter(
    (meal) => meal.meal_date === today
  );

  const selectedDayMeals = meals.filter(
    (meal) => meal.meal_date === selectedDay
  );

  function renderMealRows(
    items: PlannedMeal[],
    interactive = true
  ) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {mealTypes.map((type, index) => {
          const meal = items.find(
            (item) => item.meal_type === type.id
          );

          return (
            <button
              key={type.id}
              type="button"
              disabled={!interactive}
              onClick={() => {
                if (meal) openMeal(meal);
                else openEmptyMeal(section === "home" ? today : selectedDay, type.id);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "3px 0",
                background: "transparent",
                border: "none",
                textAlign: "left",
                fontFamily: "inherit",
                cursor:
                  interactive ? "pointer" : "default",
              }}
            >
              <span
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
              </span>

              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    marginBottom: 3,
                    color: C.muted,
                    fontSize: 10,
                  }}
                >
                  {type.label}
                </span>

                <span
                  style={{
                    display: "block",
                    color: C.text,
                    fontSize: 12,
                    fontWeight: 500,
                    lineHeight: 1.5,
                  }}
                >
                  {meal?.meal_name_snapshot ||
                    "Sin planificar · Añadir"}
                </span>
              </span>

              {interactive && (
                <ChevronRight
                  size={16}
                  color={C.green}
                  strokeWidth={1.6}
                />
              )}
            </button>
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

  const current = navigation.find(
    (item) => item.id === section
  );

  const ingredients = selectedMeal
    ? normalizeIngredients(
        selectedMeal.ingredients_snapshot
      )
    : [];

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
                {today && fullDate(today)}
              </p>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 7 }}>
              <h1
                style={{
                  fontSize: 29,
                  fontWeight: 600,
                  letterSpacing: "-0.04em",
                  margin: 0,
                }}
              >
                Mi día de hoy
              </h1>
                <button
                  type="button"
                  aria-label="Lista de la compra"
                  title="Lista de la compra"
                  onClick={() => {
                    navigate("nutrition");
                    setShowShopping(true);
                  }}
                  disabled={!today || !weekStart}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 44, height: 44, flexShrink: 0,
                    border: `1px solid ${C.border}`, borderRadius: 14,
                    background: C.white, color: C.green, cursor: "pointer",
                  }}
                >
                  <ShoppingCart size={22} strokeWidth={1.8} />
                </button>
              </div>

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
                  <Salad
                    size={22}
                    color={C.green}
                    strokeWidth={1.7}
                  />
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
                <p
                  role="alert"
                  style={{ color: C.danger, fontSize: 12 }}
                >
                  {mealError}
                </p>
              ) : (
                renderMealRows(todayMeals)
              )}

              <div style={{ marginTop: 20 }}>
                <AppButton
                  secondary
                  onClick={() => navigate("nutrition")}
                >
                  Ver mi planificación semanal
                </AppButton>
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

                <h2
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 600,
                  }}
                >
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
                {/* FICHA */}
                <button
                  type="button"
                  onClick={closeMeal}
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
                  {" · "}
                  {shortDate(selectedMeal.meal_date)}
                </p>

                <h1
                  style={{
                    margin: "0 0 20px",
                    fontSize: 25,
                    lineHeight: 1.3,
                    fontWeight: 600,
                  }}
                >
                  {selectedMeal.meal_name_snapshot ||
                    "Sin planificar"}
                </h1>

                {selectedMeal.id && (<>
                <section
                  style={{
                    background: C.white,
                    border: `1px solid ${C.border}`,
                    borderRadius: 20,
                    padding: 19,
                    marginBottom: 15,
                  }}
                >
                  <h2
                    style={{
                      fontSize: 15,
                      margin: "0 0 15px",
                    }}
                  >
                    Ingredientes
                  </h2>

                  {ingredients.length === 0 ? (
                    <p
                      style={{
                        color: C.muted,
                        fontSize: 12,
                      }}
                    >
                      No hay ingredientes detallados.
                    </p>
                  ) : (
                    ingredients.map((ingredient) => {
                      const original=normalizeIngredients(selectedMeal.original_ingredients_snapshot ?? selectedMeal.ingredients_snapshot).find(i=>i.index===ingredient.index);
                      const changed=Array.isArray(selectedMeal.ingredient_substitutions) && selectedMeal.ingredient_substitutions.some(x=>x.ingredient_index===ingredient.index);
                      const choices=alternatives.filter(x=>original && ingredientKey(x.original_food)===ingredientKey(original.ingredient));
                      return <div key={ingredient.index} style={{padding:"12px 0",borderBottom:`1px solid ${C.border}`,fontSize:12}}>
                        <div style={{display:"flex",justifyContent:"space-between",gap:12}}><strong>{ingredient.ingredient}</strong><strong style={{color:C.green}}>{ingredient.quantity} {ingredient.unit}</strong></div>
                        {changed && <p style={{color:C.muted,fontSize:11}}>Original: {original?.ingredient} · {original?.quantity} {original?.unit}</p>}
                        {editableMeal && changed && <button disabled={busyDetail} onClick={()=>void substitute(ingredient.index,null)} style={{border:0,background:C.pale,color:C.darkGreen,padding:8,borderRadius:8,fontFamily:"inherit"}}>Restaurar original</button>}
                        {editableMeal && original?.unit?.trim().toLowerCase()==="g" && choices.length>0 && <div style={{background:C.pale,padding:10,borderRadius:10,marginTop:8}}><div style={{color:C.muted,fontSize:10,marginBottom:6}}>ALTERNATIVAS</div>{choices.map(x=><button key={x.id} disabled={busyDetail} onClick={()=>void substitute(ingredient.index,x.id)} style={{display:"flex",justifyContent:"space-between",width:"100%",border:0,background:"transparent",color:C.darkGreen,padding:"8px 0",fontFamily:"inherit",textAlign:"left",gap:8}}><span>{x.alternative_food} · {formatAmount(Number(original.quantity)*Number(x.alternative_quantity)/Number(x.original_quantity))} g</span><span>Sustituir</span></button>)}</div>}
                      </div>;
                    })
                  )}
                  {detailError && <p role="alert" style={{color:C.danger,fontSize:12}}>{detailError}</p>}
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
                    <h2
                      style={{
                        fontSize: 15,
                        margin: "0 0 12px",
                      }}
                    >
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
                      {Array.isArray(selectedMeal.ingredient_substitutions) && selectedMeal.ingredient_substitutions.length>0 && <span style={{display:"block",marginBottom:8}}>Preparación original: adapta las instrucciones a los alimentos sustituidos.</span>}
                      {selectedMeal.instructions_snapshot}
                    </p>
                  </section>
                )}

                <section style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:20,padding:19,marginBottom:15}}>
                  <h2 style={{display:"flex",alignItems:"center",gap:9,fontSize:15,margin:"0 0 12px"}}><Scale size={19} color={C.green}/> Conversión crudo/cocinado</h2>
                  {loadingConversions ? <p>Cargando conversiones...</p> : conversionError ? <p role="alert" style={{color:C.danger}}>{conversionError}</p> : ingredients.flatMap(item=>{
                    if(item.quantity===null || item.unit?.trim().toLowerCase()!=="g") return [];
                    const overrides=Array.isArray(selectedMeal.cooking_overrides)?selectedMeal.cooking_overrides.filter(o=>o.ingredient_index===item.index):[];
                    const matches=conversions.filter(c=>ingredientKey(c.ingredient_name)===ingredientKey(item.ingredient));
                    const methods=[...new Set([...matches.map(c=>c.cooking_method),...overrides.map(o=>String(o.cooking_method))])];
                    return methods.map(method=>{
                      const c=matches.find(c=>c.cooking_method===method); const o=overrides.find(o=>o.cooking_method===method);
                      const weight=o?Number(o.cooked_weight):Math.round(Number(item.quantity)*Number(c?.conversion_factor));
                      return <div key={`${item.index}-${method}`} style={{padding:"12px 0",borderBottom:`1px solid ${C.border}`,fontSize:12}}><strong>{item.ingredient}</strong><div style={{color:C.muted,fontSize:11,margin:"4px 0"}}>{method}{o?" · Ajuste individual":""}</div><div style={{display:"flex",justifyContent:"space-between",gap:8}}><span>{item.quantity} g crudo</span><strong style={{color:C.darkGreen}}>{o?"":"≈ "}{formatAmount(weight)} g cocinado</strong></div>
                      </div>;
                    });
                  })}
                  <p style={{fontSize:11,color:C.muted,lineHeight:1.6,marginBottom:0}}>Los pesos prescritos siguen siendo en crudo. {selectedMeal.meal_date<today && !Array.isArray(selectedMeal.cooking_conversions_snapshot)?"Estimaciones con factores disponibles; todavía no hay copia histórica.":"Los valores automáticos son orientativos."}</p>
                </section>
                </>)}
                {selectedMeal.meal_date < today ? <p style={{fontSize:12,color:C.muted}}>Comida histórica · Solo consulta</p> : !changingOption ? (
                  <AppButton onClick={() => void showOptions()}>
                    {selectedMeal.id ? "Cambiar esta comida" : "Seleccionar comida"}
                  </AppButton>
                ) : (
                  <section
                    style={{
                      background: C.white,
                      border: `1px solid ${C.border}`,
                      borderRadius: 20,
                      padding: 18,
                    }}
                  >
                    <h2
                      style={{
                        fontSize: 15,
                        margin: "0 0 14px",
                      }}
                    >
                      {selectedMeal.id ? "Elige otra opción" : "Elige una comida del plan activo"}
                    </h2>

                    {loadingOptions ? (
                      <p
                        style={{
                          fontSize: 12,
                          color: C.muted,
                        }}
                      >
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
                        {options.map((option) => {
                          const selected =
                            option.id ===
                            selectedMeal.nutrition_meal_id;

                          return (
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
                                background: selected
                                  ? C.pale
                                  : C.white,
                                border: `1px solid ${C.border}`,
                                borderRadius: 12,
                                fontFamily: "inherit",
                                color: C.text,
                                fontSize: 12,
                                cursor: "pointer",
                                opacity: savingOption ? 0.6 : 1,
                              }}
                            >
                              <span>
                                {option.option_number}.{" "}
                                {option.name}
                              </span>

                              {selected && (
                                <Check
                                  size={17}
                                  color={C.green}
                                />
                              )}
                            </button>
                          );
                        })}

                        {options.length === 0 &&
                          !optionError && (
                            <p
                              style={{
                                fontSize: 12,
                                color: C.muted,
                              }}
                            >
                              No hay opciones disponibles.
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
                          marginTop: 14,
                        }}
                      >
                        {optionError}
                      </p>
                    )}

                    <div style={{ marginTop: 15 }}>
                      <AppButton
                        secondary
                        onClick={() => {
                          if (!selectedMeal.id) closeMeal();
                          else setChangingOption(false);
                          setOptionError("");
                        }}
                        disabled={savingOption}
                      >
                        Cancelar
                      </AppButton>
                    </div>
                  </section>
                )}
              </>
            ) : (
              <>
                {/* LISTA DE LA COMPRA */}
                {showShopping ? (
                  <ShoppingList
                    initialWeek={weekStart}
                    onBack={() => {
                      setShowShopping(false);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                ) : (<>
                {/* PLANIFICACIÓN SEMANAL */}
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
                      onClick={() => changeWeek(-7)}
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
                      <CalendarDays
                        size={17}
                        color={C.green}
                      />

                      {weekStart &&
                        `${shortDate(weekStart)} - ${shortDate(
                          addDays(weekStart, 6)
                        )}`}
                    </span>

                    <button
                      type="button"
                      onClick={() => changeWeek(7)}
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
                            background: active
                              ? C.green
                              : C.pale,
                            color: active
                              ? C.white
                              : C.darkGreen,
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
                            {weekday(day)}
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

                <div style={{marginBottom:16}}>
                  <AppButton secondary onClick={() => void duplicateWeek()} disabled={duplicating || loadingMeals || !!mealError}>
                    {duplicating ? "Copiando semana..." : "Duplicar semana anterior"}
                  </AppButton>
                  {weekMessage && <p role="status" style={{fontSize:12,color:C.darkGreen,lineHeight:1.6}}>{weekMessage}</p>}
                </div>
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
                      {selectedDay && fullDate(selectedDay)}
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
                    <p
                      style={{
                        fontSize: 12,
                        color: C.muted,
                      }}
                    >
                      Cargando comidas...
                    </p>
                  ) : mealError ? (
                    <p
                      role="alert"
                      style={{
                        fontSize: 12,
                        color: C.danger,
                      }}
                    >
                      {mealError}
                    </p>
                  ) : (
                    renderMealRows(selectedDayMeals)
                  )}
                </section>
                <div style={{marginTop:16}}>
                  <AppButton onClick={() => { setShowShopping(true); window.scrollTo({top:0,behavior:"smooth"}); }} disabled={loadingMeals || !!mealError}>
                    <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><ShoppingCart size={18}/> Lista de la compra semanal</span>
                  </AppButton>
                </div>
                </>)}
              </>
            )}
          </>
        )}

        {/* BIBLIOTECA */}
        {section === "library" && <NutritionPlans />}

        {/* OTRAS SECCIONES */}
        {section !== "home" &&
          section !== "nutrition" &&
          section !== "library" && (
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
                    <current.icon
                      size={26}
                      strokeWidth={1.7}
                    />
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
                <h2
                  style={{
                    fontSize: 15,
                    margin: "0 0 8px",
                  }}
                >
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

      {/* NAVEGACIÓN INFERIOR */}
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
                aria-current={
                  selected ? "page" : undefined
                }
                style={{
                  minWidth: 0,
                  minHeight: 49,
                  border: "none",
                  background: "transparent",
                  color: selected
                    ? C.darkGreen
                    : C.muted,
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
                  strokeWidth={
                    selected ? 2.2 : 1.6
                  }
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
