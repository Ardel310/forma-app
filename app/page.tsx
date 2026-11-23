
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Salad,
  Dumbbell,
  ChartNoAxesColumnIncreasing,
  BookOpen,
  ArrowLeft,
  LogOut,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "../lib/supabase/client";

type Section = "home" | "nutrition" | "training" | "progress" | "library";

type MenuItem = {
  id: Exclude<Section, "home">;
  title: string;
  description: string;
  icon: LucideIcon;
};

const menuItems: MenuItem[] = [
  {
    id: "nutrition",
    title: "Nutrición",
    description: "Menús, recetas y compra semanal",
    icon: Salad,
  },
  {
    id: "training",
    title: "Entrenamiento",
    description: "Ejercicios, series y pesos",
    icon: Dumbbell,
  },
  {
    id: "progress",
    title: "Mi progreso",
    description: "Medidas y evolución corporal",
    icon: ChartNoAxesColumnIncreasing,
  },
  {
    id: "library",
    title: "Biblioteca",
    description: "Planes, equivalencias e históricos",
    icon: BookOpen,
  },
];

export default function HomePage() {
  const router = useRouter();

  const [section, setSection] = useState<Section>("home");
  const [checkingSession, setCheckingSession] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
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
        if (active) {
          router.replace("/login");
        }
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
      setLoggingOut(false);
      alert("No se pudo cerrar la sesión. Inténtalo de nuevo.");
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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F7F8F6",
          color: "#7D8C82",
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
        background: "#F7F8F6",
        color: "#1E2925",
        padding: "32px 20px 60px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1080,
          margin: "0 auto",
        }}
      >
        {/* CABECERA */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div
            onClick={() => setSection("home")}
            style={{
              color: "#7D8C82",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.24em",
              cursor: "pointer",
            }}
          >
            FORMA
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 38,
              height: 38,
              border: "1px solid #E1E6E1",
              borderRadius: 12,
              background: "#FFFFFF",
              color: "#7D8C82",
              cursor: loggingOut ? "wait" : "pointer",
            }}
          >
            <LogOut size={18} strokeWidth={1.7} />
          </button>
        </header>

        {section === "home" ? (
          <>
            {/* PRESENTACIÓN */}
            <div style={{ marginBottom: 32 }}>
              <h1
                style={{
                  fontSize: "clamp(25px, 4vw, 34px)",
                  fontWeight: 600,
                  letterSpacing: "-0.04em",
                  lineHeight: 1.3,
                  margin: "0 0 10px",
                }}
              >
                Mi espacio personal
              </h1>

              <p
                style={{
                  color: "#7C8580",
                  fontSize: 14,
                  margin: 0,
                }}
              >
                Entrenamiento, nutrición y evolución.
              </p>
            </div>

            {/* TARJETAS */}
            <h2
              style={{
                fontSize: 17,
                fontWeight: 600,
                marginBottom: 18,
              }}
            >
              ¿Qué quieres hacer hoy?
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
                gap: 14,
              }}
            >
              {menuItems.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => setSection(item.id)}
                    style={{
                      width: "100%",
                      minHeight: 174,
                      padding: 22,
                      border: "1px solid #E3E8E3",
                      borderRadius: 20,
                      background: "#FFFFFF",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      textAlign: "left",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      color: "inherit",
                      boxShadow: "0 2px 10px rgba(20,40,30,0.015)",
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 13,
                        background: "#F0F3F0",
                        color: "#7D8C82",
                        marginBottom: 20,
                      }}
                    >
                      <Icon size={24} strokeWidth={1.7} />
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        gap: 10,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                        }}
                      >
                        {item.title}
                      </span>

                      <ChevronRight
                        size={17}
                        strokeWidth={1.6}
                        color="#A4ADA6"
                      />
                    </div>

                    <span
                      style={{
                        marginTop: 7,
                        color: "#7C8580",
                        fontSize: 12,
                        lineHeight: 1.6,
                      }}
                    >
                      {item.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* NAVEGACIÓN INTERIOR */}
            <button
              onClick={() => setSection("home")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                border: "none",
                background: "transparent",
                color: "#7D8C82",
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: 500,
                padding: "4px 0",
                marginBottom: 28,
                cursor: "pointer",
              }}
            >
              <ArrowLeft size={17} strokeWidth={1.7} />
              Volver al inicio
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 15,
                marginBottom: 25,
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 16,
                  background: "#EDF1ED",
                  color: "#7D8C82",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {currentItem && (
                  <currentItem.icon
                    size={27}
                    strokeWidth={1.6}
                  />
                )}
              </div>

              <div>
                <h1
                  style={{
                    fontSize: 26,
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  {currentItem?.title}
                </h1>

                <p
                  style={{
                    fontSize: 13,
                    color: "#7C8580",
                    margin: "5px 0 0",
                  }}
                >
                  {currentItem?.description}
                </p>
              </div>
            </div>

            {/* CONTENIDO PROVISIONAL */}
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E3E8E3",
                borderRadius: 20,
                padding: "32px 24px",
              }}
            >
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  margin: "0 0 8px",
                }}
              >
                Estamos preparando esta sección
              </p>

              <p
                style={{
                  fontSize: 13,
                  color: "#7C8580",
                  lineHeight: 1.8,
                  margin: 0,
                }}
              >
                Próximamente podrás gestionar aquí tus datos
                de {currentItem?.title.toLowerCase()}.
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
