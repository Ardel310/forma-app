
"use client";

import { useState } from "react";
import {
  Dumbbell,
  HeartPulse,
  CalendarDays,
  LibraryBig,
  ChartNoAxesCombined,
  History,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

import ExerciseLibrary from "./ExerciseLibrary";
import StrengthTraining from "./StrengthTraining";
import CardioTraining from "./CardioTraining";

type TrainingView =
  | "home"
  | "strength"
  | "cardio"
  | "calendar"
  | "exercises"
  | "performance"
  | "history";

const C = {
  green: "#7D8C82",
  dark: "#596B60",
  text: "#25382F",
  muted: "#78847B",
  pale: "#EEF2EE",
  border: "#E5EAE5",
  white: "#FFFFFF",
};

const sections = [
  {
    id: "strength",
    title: "Fuerza",
    description: "Registra tus entrenamientos y series",
    icon: Dumbbell,
  },
  {
    id: "cardio",
    title: "Cardio y clases",
    description: "Cardio, clases colectivas y cuerpo-mente",
    icon: HeartPulse,
  },
  {
    id: "calendar",
    title: "Calendario",
    description: "Actividad diaria y días de descanso",
    icon: CalendarDays,
  },
  {
    id: "exercises",
    title: "Biblioteca de ejercicios",
    description: "Ejercicios, grupos musculares y variantes",
    icon: LibraryBig,
  },
  {
    id: "performance",
    title: "Rendimiento",
    description: "Progresión, récords y estadísticas",
    icon: ChartNoAxesCombined,
  },
  {
    id: "history",
    title: "Histórico",
    description: "Consulta tus entrenamientos anteriores",
    icon: History,
  },
] as const;

export default function Training() {
  const [view, setView] =
    useState<TrainingView>("home");

  function openView(next: TrainingView) {
    setView(next);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  const selected = sections.find(
    (section) => section.id === view
  );

  // MÓDULO DE FUERZA
  if (view === "strength") {
    return (
      <StrengthTraining
        onBack={() => openView("home")}
      />
    );
  }

  // MÓDULO DE CARDIO Y CLASES
  if (view === "cardio") {
    return (
      <CardioTraining
        onBack={() => openView("home")}
      />
    );
  }

  // BIBLIOTECA DE EJERCICIOS
  if (view === "exercises") {
    return (
      <ExerciseLibrary
        onBack={() => openView("home")}
      />
    );
  }

  // APARTADOS PENDIENTES DE DESARROLLO
  if (view !== "home" && selected) {
    const Icon = selected.icon;

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <button
          type="button"
          onClick={() => openView("home")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "none",
            border: "none",
            padding: 0,
            color: C.dark,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
            alignSelf: "flex-start",
          }}
        >
          <ArrowLeft size={18} />
          Entrenamiento
        </button>

        <h2
          style={{
            margin: 0,
            fontSize: 23,
            color: C.text,
          }}
        >
          {selected.title}
        </h2>

        <div
          style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 20,
            padding: "40px 20px",
            textAlign: "center",
          }}
        >
          <Icon size={36} color={C.green} />

          <h3
            style={{
              fontSize: 16,
              color: C.text,
              marginBottom: 8,
            }}
          >
            Próximamente
          </h3>

          <p
            style={{
              fontSize: 13,
              color: C.muted,
              margin: 0,
            }}
          >
            {selected.description}
          </p>
        </div>
      </div>
    );
  }

  // MENÚ PRINCIPAL DE ENTRENAMIENTO
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 18,
        width: "100%",
      }}
    >
      <header>
        <h2
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 600,
            color: C.text,
          }}
        >
          Entrenamiento
        </h2>

        <p
          style={{
            margin: "5px 0 0",
            fontSize: 13,
            color: C.muted,
          }}
        >
          Registra, analiza y mejora tu rendimiento.
        </p>
      </header>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {sections.map((section) => {
          const Icon = section.icon;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => openView(section.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                width: "100%",
                padding: 16,
                border: `1px solid ${C.border}`,
                borderRadius: 18,
                background: C.white,
                textAlign: "left",
                color: C.text,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  flexShrink: 0,
                  borderRadius: 14,
                  background: C.pale,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon
                  size={23}
                  strokeWidth={1.7}
                  color={C.dark}
                />
              </div>

              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  {section.title}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    lineHeight: 1.5,
                    color: C.muted,
                  }}
                >
                  {section.description}
                </div>
              </div>

              <ChevronRight
                size={18}
                color={C.green}
                style={{ flexShrink: 0 }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
