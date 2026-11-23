
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Salad,
  Dumbbell,
  ChartNoAxesColumnIncreasing,
  BookOpen,
  ArrowLeft,
  ArrowRight,
  LogOut,
  CalendarDays,
  Utensils,
  Activity,
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

type MenuItem = {
  id: Exclude<Section, "home">;
  title: string;
  description: string;
  icon: LucideIcon;
};

const C = {
  green: "#7D8C82",
  greenDark: "#687A6D",
  background: "#F7F8F6",
  text: "#25382F",
  muted: "#7C8980",
  border: "#E5EAE5",
  pale: "#EEF2EE",
  white: "#FFFFFF",
};

const menuItems: MenuItem[] = [
  {
    id: "nutrition",
    title: "Nutrición",
    description: "Menús y recetas",
    icon: Salad,
  },
  {
    id: "training",
    title: "Entrenamiento",
    description: "Ejercicios y cargas",
    icon: Dumbbell,
  },
  {
    id: "progress",
    title: "Mi progreso",
    description: "Medidas y evolución",
    icon: ChartNoAxesColumnIncreasing,
  },
  {
    id: "library",
    title: "Biblioteca",
    description: "Planes e históricos",
    icon: BookOpen,
  },
];

function getTodayLabel() {
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
  const [todayLabel, setTodayLabel] = useState("");

  useEffect(() => {
    setTodayLabel(getTodayLabel());

    let active = true;
    const supabase = createClient();

    async function checkSession() {
      try {
        const { data, error } = await supabase.auth.getUser();

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

  async function handleLogout() {
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
          fontSize: 14,
        }}
      >
        Comprobando acceso a FORMA...
      </main>
    );
  }

  const currentItem = menuItems.find(
    (item) => item.id === section
  );

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: C.background,
        color: C.text,
        padding: "24px 20px 70px",
        fontFamily: "inherit",
      }}
    >
      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        {/* CABECERA */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 38,
          }}
        >
          <button
            type="button"
            onClick={() => setSection("home")}
            aria-label="Volver al inicio"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              border: "none",
              background: "transparent",
              padding: 0,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <Image
              src="/isotipo.png"
              alt="FORMA"
              width={52}
              height={52}
              priority
              style={{
                borderRadius: 14,
                objectFit: "contain",
              }}
            />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 3,
              }}
            >
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  letterSpacing: "0.19em",
                  color: C.green,
                }}
              >
                FORMA
              </span>

              <span
                style={{
                  fontSize: 9,
                  letterSpacing: "0.12em",
                  color: C.muted,
                }}
              >
                MI ESPACIO PERSONAL
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            style={{
              width: 43,
              height: 43,
              borderRadius: 14,
              border: `1px solid ${C.border}`,
              background: C.white,
              color: C.green,
              display: "grid",
              placeItems: "center",
              cursor: loggingOut ? "wait" : "pointer",
            }}
          >
            <LogOut size={19} strokeWidth={1.7} />
          </button>
        </header>

        {section === "home" ? (
          <>
            {/* BIENVENIDA */}
            <section style={{ marginBottom: 30 }}>
              <p
                style={{
                  fontSize: 11,
                  letterSpacing: "0.13em",
                  fontWeight: 500,
                  color: C.green,
                  margin: "0 0 10px",
                }}
              >
                TU BIENESTAR, A TU RITMO
              </p>

              <h1
                style={{
                  fontSize: "clamp(28px, 5vw, 40px)",
                  lineHeight: 1.2,
                  letterSpacing: "-0.04em",
                  fontWeight: 600,
                  margin: "0 0 12px",
                }}
              >
                Cada día cuenta.
              </h1>

              <p
                style={{
                  fontSize: 14,
                  color: C.muted,
                  margin: 0,
                  lineHeight: 1.7,
                }}
              >
                Organiza tus hábitos y sigue tu evolución.
              </p>
            </section>

            {/* MI DÍA DE HOY */}
            <section
              style={{
                background: C.green,
                borderRadius: 24,
                padding: "25px 23px",
                marginBottom: 34,
                color: C.white,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 24,
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      marginBottom: 8,
                    }}
                  >
                    <CalendarDays
                      size={19}
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
                      margin: 0,
                      textTransform: "capitalize",
                    }}
                  >
                    {todayLabel}
                  </p>
                </div>

                <ArrowRight
                  size={20}
                  strokeWidth={1.7}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                <button
                  type="button"
                  onClick={() => setSection("nutrition")}
                  style={{
                    border: "1px solid rgba(255,255,255,0.16)",
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.12)",
                    color: C.white,
                    padding: 17,
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 9,
                  }}
                >
                  <Utensils
                    size={22}
                    strokeWidth={1.6}
                  />

                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    Nutrición
                  </span>

                  <span
                    style={{
                      fontSize: 11,
                      opacity: 0.85,
                    }}
                  >
                    Ver menú diario
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSection("training")}
                  style={{
                    border: "1px solid rgba(255,255,255,0.16)",
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.12)",
                    color: C.white,
                    padding: 17,
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 9,
                  }}
                >
                  <Activity
                    size={22}
                    strokeWidth={1.6}
                  />

                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    Actividad
                  </span>

                  <span
                    style={{
                      fontSize: 11,
                      opacity: 0.85,
                    }}
                  >
                    Registrar entrenamiento
                  </span>
                </button>
              </div>
            </section>

            {/* SECCIONES */}
            <section>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  margin: "0 0 17px",
                }}
              >
                Explora tu espacio
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap: 13,
                }}
              >
                {menuItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSection(item.id)}
                      style={{
                        minWidth: 0,
                        minHeight: 175,
                        padding: "20px 17px",
                        background: C.white,
                        border: `1px solid ${C.border}`,
                        borderRadius: 20,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        textAlign: "left",
                        gap: 9,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        color: C.text,
                      }}
                    >
                      <div
                        style={{
                          width: 43,
                          height: 43,
                          borderRadius: 13,
                          background: C.pale,
                          color: C.green,
                          display: "grid",
                          placeItems: "center",
                          marginBottom: 5,
                        }}
                      >
                        <Icon
                          size={23}
                          strokeWidth={1.7}
                        />
                      </div>

                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          lineHeight: 1.4,
                        }}
                      >
                        {item.title}
                      </span>

                      <span
                        style={{
                          fontSize: 11,
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
            {/* NAVEGACIÓN INTERIOR */}
            <button
              type="button"
              onClick={() => setSection("home")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: 0,
                marginBottom: 30,
                border: "none",
                background: "transparent",
                color: C.green,
                fontSize: 13,
                fontWeight: 500,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              <ArrowLeft
                size={17}
                strokeWidth={1.7}
              />
              Volver al inicio
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 15,
                marginBottom: 26,
              }}
            >
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 17,
                  background: C.pale,
                  color: C.green,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {currentItem && (
                  <currentItem.icon
                    size={28}
                    strokeWidth={1.6}
                  />
                )}
              </div>

              <div>
                <h1
                  style={{
                    fontSize: 27,
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  {currentItem?.title}
                </h1>

                <p
                  style={{
                    fontSize: 13,
                    color: C.muted,
                    margin: "5px 0 0",
                  }}
                >
                  {currentItem?.description}
                </p>
              </div>
            </div>

            <div
              style={{
                padding: "32px 25px",
                borderRadius: 20,
                border: `1px solid ${C.border}`,
                background: C.white,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <BookOpen
                  size={20}
                  color={C.green}
                  strokeWidth={1.7}
                />

                <h2
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  Estamos preparando esta sección
                </h2>
              </div>

              <p
                style={{
                  color: C.muted,
                  fontSize: 13,
                  lineHeight: 1.8,
                  margin: 0,
                }}
              >
                Próximamente podrás gestionar aquí tus
                datos de {currentItem?.title.toLowerCase()}.
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
