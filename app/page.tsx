
"use client";

import { useEffect, useState } from "react";
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
  RefreshCw,
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
  meal_type: string;
  meal_name_snapshot: string | null;
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

function getLocalDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateLabel() {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

export default function HomePage() {
  const router = useRouter();

  const [section, setSection] = useState<Section>("home");
  const [checkingSession, setCheckingSession] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const [today, setToday] = useState("");
  const [todayLabel, setTodayLabel] = useState("");

  const [meals, setMeals] = useState<PlannedMeal[]>([]);
  const [loadingMeals, setLoadingMeals] = useState(true);
  const [mealError, setMealError] = useState("");

  const [diagnostic, setDiagnostic] = useState(
    "Esperando consulta..."
  );

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function initialize() {
      const date = getLocalDate();

      setToday(date);
      setTodayLabel(getDateLabel());

      console.log("FORMA - Fecha consultada:", date);

      try {
        const { data, error } =
          await supabase.auth.getUser();

        if (!active) return;

        if (error || !data.user) {
          router.replace("/login");
          return;
        }

        setCheckingSession(false);
      } catch {
        if (active) {
          router.replace("/login");
        }
      }
    }

    initialize();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (checkingSession || !today) return;

    let active = true;
    const supabase = createClient();

    async function loadMeals() {
      setLoadingMeals(true);
      setMealError("");

      const { data, error } = await supabase
        .from("weekly_meal_plans")
        .select("id, meal_type, meal_name_snapshot")
        .eq("meal_date", today);

      console.log("FORMA - Fecha consultada:", today);
      console.log("FORMA - Comidas recibidas:", data);
      console.log("FORMA - Error:", error);

      if (!active) return;

      if (error) {
        setMeals([]);
        setMealError(
          `Error: ${error.message} (${error.code || "sin código"})`
        );
        setDiagnostic(
          `Fecha: ${today} · Error: ${error.code || "desconocido"}`
        );
      } else {
        const result = (data ?? []) as PlannedMeal[];

        setMeals(result);
        setDiagnostic(
          `Fecha: ${today} · Registros recibidos: ${result.length}`
        );
      }

      setLoadingMeals(false);
    }

    loadMeals();

    return () => {
      active = false;
    };
  }, [checkingSession, today, reloadKey]);

  function navigate(destination: Section) {
    setSection(destination);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function logout() {
    setLoggingOut(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("No se pudo cerrar sesión.");
      setLoggingOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
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
          fontFamily: "inherit",
        }}
      >
        Comprobando acceso a FORMA...
      </main>
    );
  }

  const current = navigation.find(
    (item) => item.id === section
  );

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
            marginBottom: 27,
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
              alt="Logo FORMA"
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
              cursor: loggingOut ? "wait" : "pointer",
            }}
          >
            <LogOut size={19} strokeWidth={1.7} />
          </button>
        </header>

        {section === "home" ? (
          <>
            {/* TÍTULO */}
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
                {todayLabel}
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

            {/* MENÚ */}
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

                <ChevronRight
                  size={19}
                  color={C.green}
                />
              </button>

              <div
                style={{
                  height: 1,
                  background: C.border,
                  margin: "17px 0",
                }}
              />

              {loadingMeals ? (
                <p
                  style={{
                    color: C.muted,
                    fontSize: 12,
                  }}
                >
                  Cargando tu menú...
                </p>
              ) : mealError ? (
                <p
                  role="alert"
                  style={{
                    color: "#B45353",
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                >
                  {mealError}
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 17,
                  }}
                >
                  {mealTypes.map((type, index) => {
                    const meal = meals.find(
                      (item) => item.meal_type === type.id
                    );

                    return (
                      <div
                        key={type.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
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

                        <div style={{ minWidth: 0 }}>
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
                            {meal?.meal_name_snapshot ||
                              "Sin planificar"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* DIAGNÓSTICO TEMPORAL */}
              <div
                style={{
                  marginTop: 20,
                  padding: 12,
                  background: "#F4F5F2",
                  border: `1px dashed ${C.border}`,
                  borderRadius: 11,
                }}
              >
                <p
                  style={{
                    margin: "0 0 7px",
                    fontSize: 10,
                    fontWeight: 600,
                    color: C.darkGreen,
                  }}
                >
                  Diagnóstico temporal
                </p>

                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    color: C.muted,
                    lineHeight: 1.6,
                    overflowWrap: "anywhere",
                  }}
                >
                  {diagnostic}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setReloadKey((value) => value + 1)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  width: "100%",
                  minHeight: 42,
                  marginTop: 12,
                  background: C.pale,
                  color: C.darkGreen,
                  border: "none",
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={15} />
                Volver a consultar
              </button>

              <button
                type="button"
                onClick={() => navigate("nutrition")}
                style={{
                  width: "100%",
                  minHeight: 42,
                  marginTop: 9,
                  background: C.white,
                  color: C.darkGreen,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                Ir a Nutrición
              </button>
            </section>

            {/* ENTRENAMIENTO */}
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
                <Dumbbell
                  size={23}
                  strokeWidth={1.7}
                />

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
        ) : (
          <>
            {/* SECCIÓN INTERIOR */}
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
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
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
