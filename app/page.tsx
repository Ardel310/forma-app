
"use client";

import { useState } from "react";

export default function Home() {
  const [section, setSection] = useState("inicio");

  const sections = [
    {
      id: "nutricion",
      icon: "🥗",
      title: "Nutrición",
      description: "Menús, recetas y compra semanal",
    },
    {
      id: "entreno",
      icon: "🏋️",
      title: "Entrenamiento",
      description: "Ejercicios, series y pesos",
    },
    {
      id: "progreso",
      icon: "📈",
      title: "Mi progreso",
      description: "Medidas y evolución corporal",
    },
    {
      id: "biblioteca",
      icon: "📚",
      title: "Biblioteca",
      description: "Planes, equivalencias e históricos",
    },
  ];

  return (
    <main className="app-container">
      <header style={{ marginBottom: 32 }}>
        <p style={{
          color: "#7D8C82",
          fontSize: 12,
          letterSpacing: 3,
          fontWeight: 700,
        }}>
          FORMA
        </p>

        <h1 style={{ fontSize: 30, marginBottom: 8 }}>
          Mi espacio personal
        </h1>

        <p style={{ color: "#78847B", fontSize: 14 }}>
          Entrenamiento, nutrición y evolución.
        </p>
      </header>

      {section === "inicio" ? (
        <>
          <h2 style={{ fontSize: 18, marginBottom: 18 }}>
            ¿Qué quieres hacer hoy?
          </h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 12,
          }}>
            {sections.map((item) => (
              <button
                key={item.id}
                className="card"
                onClick={() => setSection(item.id)}
                style={{
                  textAlign: "left",
                  minHeight: 160,
                  width: "100%",
                  color: "inherit",
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 20 }}>
                  {item.icon}
                </div>

                <h3 style={{ fontSize: 16, marginBottom: 8 }}>
                  {item.title}
                </h3>

                <p style={{
                  fontSize: 12,
                  color: "#78847B",
                  lineHeight: 1.5,
                }}>
                  {item.description}
                </p>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="card">
          <button
            onClick={() => setSection("inicio")}
            style={{
              background: "none",
              border: "none",
              color: "#7D8C82",
              padding: 0,
              marginBottom: 24,
            }}
          >
            ← Volver al inicio
          </button>

          <h2>
            {sections.find((item) => item.id === section)?.title}
          </h2>

          <p style={{ color: "#78847B", marginTop: 12 }}>
            Próximamente configuraremos este apartado.
          </p>
        </div>
      )}
    </main>
  );
}
