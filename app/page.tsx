
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
  CalendarDays,
  LogOut,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "../lib/supabase/client";

type Section =
  | "home"
  | "nutrition"
  | "training"
  | "progress"
  | "library";

type NavItem = {
  id: Section;
  title: string;
  shortTitle: string;
  description: string;
  icon: LucideIcon;
};

const C = {
  green: "#7D8C82",
  darkGreen: "#687A6D",
  background: "#F7F8F6",
  text: "#25382F",
  muted: "#7C8980",
  border: "#E5EAE5",
  pale: "#EEF2EE",
  white: "#FFFFFF",
};

const navigation: NavItem[] = [
  {
    id: "home",
    title: "Inicio",
    shortTitle: "Inicio",
    description: "",
    icon: House,
  },
  {
    id: "nutrition",
    title: "Nutrición",
    shortTitle: "Nutrición",
    description: "Menús, recetas y compra semanal",
    icon: Salad,
  },
  {
    id: "training",
    title: "Entrenamiento",
    shortTitle: "Entreno",
    description: "Ejercicios, series y pesos",
    icon: Dumbbell,
  },
  {
    id: "progress",
    title: "Mi progreso",
    shortTitle: "Progreso",
    description: "Medidas y evolución corporal",
    icon: ChartNoAxesColumnIncreasing,
  },
  {
    id: "library",
    title: "Biblioteca",
    shortTitle: "Biblioteca",
    description: "Planes e históricos",
    icon: BookOpen,
  },
];

const sections = navigation.filter(
  (item) => item.id !== "home"
);

function todayText() {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

export default function HomePage() {
  const router = useRouter();

  const [section, setSection] =
    useState<Section>("home");
  const [checkingSession, setCheckingSession] =
    useState(true);
  const [loggingOut, setLoggingOut] =
    useState(false);
  const [dateLabel, setDateLabel] = useState("");

  useEffect(() => {
    setDateLabel(todayText());

    let active = true;
    const supabase = createClient();

    async function checkSession() {
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
        if (active) router.replace("/login");
      }
    }

    checkSession();

    return () => {
      active = false;
    };
  }, [router]);

  function navigate(destination: Section) {
    setSection(destination);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function logout() {
    setLoggingOut(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("No se pudo cerrar la sesión.");
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
          background: C.background,
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

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: C.background,
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
            marginBottom: 30,
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
              border: "none",
              background: "transparent",
              padding: 0,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <Image
              src="/isotipo.png"
              alt="Logo FORMA"
              width={48}
              height={48}
              priority
              style={{
                borderRadius: 13,
                objectFit: "contain",
              }}
            />

            <span
              style={{
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: "0.16em",
                color: C.green,
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
            title="Cerrar sesión"
            style={{
              width: 44,
              height: 44,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              background: C.white,
              color: C.green,
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            <LogOut size={19} strokeWidth={1.7} />
          </button>
        </header>

        {section === "home" ? (
          <>
            {/* BIENVENIDA */}
            <section style={{ marginBottom: 26 }}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  color: C.green,
                  margin: "0 0 9px",
                }}
              >
                TU BIENESTAR, A TU RITMO
              </p>

              <h1
                style={{
                  fontSize: "clamp(27px, 7vw, 36px)",
                  fontWeight: 600,
                  lineHeight: 1.2,
                  letterSpacing: "-0.04em",
                  margin: "0 0 9px",
                }}
              >
                Cada día cuenta.
              </h1>

              <p
                style={{
                  fontSize: 13,
                  color: C.muted,
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                Organiza tus hábitos y sigue tu evolución.
              </p>
            </section>

            {/* MI DÍA */}
            <section
              style={{
                background: C.green,
                color: C.white,
                borderRadius: 22,
                padding: 20,
                marginBottom: 30,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 7,
                }}
              >
                <CalendarDays
                  size={20}
                  strokeWidth={1.7}
                />

                <h2
                  style={{
                    fontSize: 17,
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  Mi día de hoy
                </h2>
              </div>

              <p
                style={{
                  fontSize: 12,
                  opacity: 0.85,
                  textTransform: "capitalize",
                  margin: "0 0 20px",
                }}
              >
                {dateLabel}
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                {[
                  {
                    id: "nutrition" as Section,
                    title: "Mi menú",
                    description: "Ver alimentación",
                    icon: Salad,
                  },
                  {
                    id: "training" as Section,
                    title: "Mi entreno",
                    description: "Registrar actividad",
                    icon: Dumbbell,
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(item.id)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 9,
                        minWidth: 0,
                        padding: 15,
                        borderRadius: 15,
                        border:
                          "1px solid rgba(255,255,255,0.18)",
                        background:
                          "rgba(255,255,255,0.13)",
                        color: C.white,
                        textAlign: "left",
                        fontFamily: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      <Icon
                        size={23}
                        strokeWidth={1.7}
                      />

                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {item.title}
                      </span>

                      <span
                        style={{
                          fontSize: 10,
                          opacity: 0.85,
                          lineHeight: 1.5,
                        }}
                      >
                        {item.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* EXPLORAR */}
            <section>
              <h2
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  margin: "0 0 15px",
                }}
              >
                Explora tu espacio
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 11,
                }}
              >
                {sections.map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(item.id)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 9,
                        minWidth: 0,
                        minHeight: 155,
                        padding: 16,
                        borderRadius: 19,
                        border: `1px solid ${C.border}`,
                        background: C.white,
                        color: C.text,
                        textAlign: "left",
                        fontFamily: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          width: 41,
                          height: 41,
                          borderRadius: 12,
                          background: C.pale,
                          color: C.green,
                          display: "grid",
                          placeItems: "center",
                          marginBottom: 3,
                        }}
                      >
                        <Icon
                          size={22}
                          strokeWidth={1.7}
                        />
                      </div>

                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {item.title}
                      </span>

                      <span
                        style={{
                          fontSize: 10,
                          color: C.muted,
                          lineHeight: 1.5,
                        }}
                      >
                        {item.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        ) : (
          <>
            {/* PÁGINA INTERIOR */}
            <section style={{ marginBottom: 23 }}>
              <div
                style={{
                  width: 53,
                  height: 53,
                  borderRadius: 16,
                  background: C.pale,
                  color: C.green,
                  display: "grid",
                  placeItems: "center",
                  marginBottom: 16,
                }}
              >
                {current && (
                  <current.icon
                    size={26}
                    strokeWidth={1.6}
                  />
                )}
              </div>

              <h1
                style={{
                  fontSize: 27,
                  fontWeight: 600,
                  margin: "0 0 7px",
                }}
              >
                {current?.title}
              </h1>

              <p
                style={{
                  fontSize: 13,
                  color: C.muted,
                  margin: 0,
                }}
              >
                {current?.description}
              </p>
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
                  fontWeight: 600,
                  margin: "0 0 9px",
                }}
              >
                Próximamente
              </h2>

              <p
                style={{
                  fontSize: 12,
                  lineHeight: 1.8,
                  color: C.muted,
                  margin: "0 0 16px",
                }}
              >
                Aquí podrás consultar y gestionar tus datos
                de {current?.title.toLowerCase()}.
              </p>

              <button
                type="button"
                onClick={() => navigate("home")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: 0,
                  background: "transparent",
                  border: "none",
                  color: C.green,
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                Volver al inicio
                <ChevronRight size={16} />
              </button>
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
