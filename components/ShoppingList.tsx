
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ShoppingBasket,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Check,
  Package,
  Wheat,
  Beef,
  Fish,
  Sandwich,
  Apple,
  Carrot,
  Milk,
  Bean,
  Nut,
} from "lucide-react";
import { createClient } from "../lib/supabase/client";

type ShoppingItem = {
  ingredient: string;
  total_quantity: number;
  unit: string;
  category: string;
  category_order: number;
};

type Props = {
  onBack: () => void;
  initialWeek?: string;
};

const C = {
  green: "#7D8C82",
  dark: "#25382F",
  muted: "#687A6D",
  pale: "#EEF2EE",
  white: "#FFFFFF",
  border: "#E5EAE5",
  danger: "#B45353",
};

const categoryIcons = {
  "Carbohidratos": Wheat,
  "Carnes": Beef,
  "Pescados y mariscos": Fish,
  "Cereales y panes": Sandwich,
  "Frutas": Apple,
  "Verduras y hortalizas": Carrot,
  "Lácteos y huevos": Milk,
  "Legumbres": Bean,
  "Frutos secos y grasas": Nut,
  "Otros": Package,
};

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  }).format(parseDate(value));
}

function itemKey(item: ShoppingItem) {
  return JSON.stringify([
    item.ingredient.trim().toLowerCase(),
    item.unit,
    Number(item.total_quantity),
  ]);
}

function formatQuantity(quantity: number, unit: string) {
  const q = Number(quantity);

  if (unit === "g" && q >= 1000) {
    return `${(q / 1000).toLocaleString("es-ES", {
      maximumFractionDigits: 3,
    })} kg`;
  }

  if (unit === "ml" && q >= 1000) {
    return `${(q / 1000).toLocaleString("es-ES", {
      maximumFractionDigits: 3,
    })} L`;
  }

  return `${q.toLocaleString("es-ES", {
    maximumFractionDigits: 2,
  })} ${unit}`;
}

const cardStyle = {
  background: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: 20,
  padding: 17,
  marginBottom: 15,
};

const buttonStyle = {
  border: "none",
  background: C.pale,
  color: C.muted,
  borderRadius: 12,
  padding: 12,
  fontFamily: "inherit",
  cursor: "pointer",
};

export default function ShoppingList({
  onBack,
  initialWeek,
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [weekStart, setWeekStart] = useState(
    initialWeek ? mondayOf(initialWeek) : ""
  );

  const [userId, setUserId] = useState("");
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [checked, setChecked] = useState<
    Record<string, boolean>
  >({});

  const [loading, setLoading] = useState(true);
  const [checklistReady, setChecklistReady] = useState(false);
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  const [refresh, setRefresh] = useState(0);

  // COMPROBAR SESIÓN

  useEffect(() => {
    if (!initialWeek) {
      setWeekStart(mondayOf(localDate()));
    }

    let active = true;

    async function getUser() {
      const { data, error } =
        await supabase.auth.getUser();

      if (!active) return;

      if (error || !data.user) {
        setError("No se pudo comprobar tu sesión.");
        setLoading(false);
        return;
      }

      setUserId(data.user.id);
    }

    getUser();

    return () => {
      active = false;
    };
  }, [supabase, initialWeek]);

  const storageKey =
    `forma-shopping-${userId}-${weekStart}`;

  // RECUPERAR CHECKLIST

  useEffect(() => {
    if (!userId || !weekStart) return;

    setChecklistReady(false);
    setStorageError("");

    try {
      const saved = localStorage.getItem(storageKey);
      setChecked(saved ? JSON.parse(saved) || {} : {});
    } catch {
      setChecked({});
    }

    setChecklistReady(true);
  }, [userId, weekStart, storageKey]);

  // CARGAR LISTA Y CATEGORÍAS DESDE SUPABASE

  useEffect(() => {
    if (!userId || !weekStart) return;

    let active = true;

    async function loadShoppingList() {
      setLoading(true);
      setError("");

      const { data, error } = await supabase.rpc(
        "get_categorized_shopping_list",
        {
          p_start_date: weekStart,
          p_end_date: addDays(weekStart, 6),
        }
      );

      if (!active) return;

      if (error) {
        setError(error.message);
        setItems([]);
      } else {
        setItems(
          ((data ?? []) as ShoppingItem[]).filter(
            (item) =>
              item.ingredient &&
              item.total_quantity !== null &&
              Number(item.total_quantity) > 0
          )
        );
      }

      setLoading(false);
    }

    loadShoppingList();

    return () => {
      active = false;
    };
  }, [supabase, userId, weekStart, refresh]);

  // AGRUPAR Y ORDENAR POR CATEGORÍAS

  const grouped = useMemo(() => {
    const groups: Record<
      string,
      {
        category: string;
        order: number;
        items: ShoppingItem[];
      }
    > = {};

    items.forEach((item) => {
      const category = item.category || "Otros";

      if (!groups[category]) {
        groups[category] = {
          category,
          order: item.category_order ?? 10,
          items: [],
        };
      }

      groups[category].items.push(item);
    });

    return Object.values(groups)
      .sort((a, b) => a.order - b.order)
      .map((group) => ({
        ...group,
        items: group.items.sort((a, b) =>
          a.ingredient.localeCompare(
            b.ingredient,
            "es"
          )
        ),
      }));
  }, [items]);

  const pendingGroups = grouped.map(group => ({
    ...group,
    items: group.items.filter(item => !checked[itemKey(item)]),
  })).filter(group => group.items.length > 0);

  const purchasedItems = grouped.flatMap(group =>
    group.items.filter(item => checked[itemKey(item)])
  );

  const completed = items.filter(
    (item) => checked[itemKey(item)]
  ).length;

  const percentage = items.length
    ? Math.round((completed / items.length) * 100)
    : 0;

  // MARCAR PRODUCTO

  function toggleItem(item: ShoppingItem) {
    if (!checklistReady) return;

    const key = itemKey(item);

    const next = {
      ...checked,
      [key]: !checked[key],
    };

    setChecked(next);

    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(next)
      );
      setStorageError("");
    } catch {
      setStorageError(
        "No se pudo guardar el checklist en este dispositivo."
      );
    }
  }

  function resetChecklist() {
    if (!window.confirm(
      "¿Quieres desmarcar todos los productos?"
    )) return;

    setChecked({});

    try {
      localStorage.removeItem(storageKey);
      setStorageError("");
    } catch {
      setStorageError(
        "No se pudo restablecer el checklist."
      );
    }
  }

  function changeWeek(days: number) {
    setLoading(true);
    setItems([]);
    setChecked({});
    setChecklistReady(false);

    setWeekStart((current) =>
      addDays(current, days)
    );
  }

  return (
    <div>
      {/* VOLVER */}

      <button
        type="button"
        onClick={onBack}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          border: "none",
          background: "transparent",
          color: C.muted,
          fontFamily: "inherit",
          fontSize: 13,
          cursor: "pointer",
          padding: "10px 0 20px",
        }}
      >
        <ArrowLeft size={18} />
        Volver a Nutrición
      </button>

      {/* CABECERA */}

      <div style={{ marginBottom: 23 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 15,
            background: C.pale,
            color: C.green,
            display: "grid",
            placeItems: "center",
            marginBottom: 15,
          }}
        >
          <ShoppingBasket
            size={26}
            strokeWidth={1.7}
          />
        </div>

        <h1
          style={{
            fontSize: 27,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: C.dark,
            margin: "0 0 7px",
          }}
        >
          Lista de la compra
        </h1>

        <p
          style={{
            color: C.muted,
            fontSize: 13,
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          Todo lo que necesitas para tu menú semanal.
        </p>
      </div>

      {/* SELECTOR SEMANAL */}

      <section
        style={{
          ...cardStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <button
          type="button"
          disabled={!weekStart}
          aria-label="Semana anterior"
          onClick={() => changeWeek(-7)}
          style={{
            ...buttonStyle,
            display: "grid",
            placeItems: "center",
          }}
        >
          <ChevronLeft size={20} />
        </button>

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: C.dark,
            }}
          >
            {weekStart &&
              `${formatDate(weekStart)} - ${formatDate(
                addDays(weekStart, 6)
              )}`}
          </div>

          <div
            style={{
              fontSize: 11,
              color: C.muted,
              marginTop: 4,
            }}
          >
            {weekStart === mondayOf(localDate())
              ? "Semana actual"
              : "Planificación semanal"}
          </div>
        </div>

        <button
          type="button"
          disabled={!weekStart}
          aria-label="Semana siguiente"
          onClick={() => changeWeek(7)}
          style={{
            ...buttonStyle,
            display: "grid",
            placeItems: "center",
          }}
        >
          <ChevronRight size={20} />
        </button>
      </section>

      {/* RESUMEN */}

      <section
        style={{
          background: C.green,
          color: C.white,
          borderRadius: 21,
          padding: 21,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>
            <p style={{
              fontSize: 13,
              margin: "0 0 5px",
            }}>
              Mi compra semanal
            </p>

            <div style={{
              fontSize: 30,
              fontWeight: 600,
            }}>
              {completed} / {items.length}
            </div>

            <p style={{
              fontSize: 12,
              margin: "3px 0 0",
            }}>
              Productos comprados
            </p>
          </div>

          <ShoppingBasket
            size={38}
            strokeWidth={1.4}
          />
        </div>

        <div
          style={{
            height: 7,
            background: "rgba(255,255,255,0.25)",
            borderRadius: 10,
            marginTop: 20,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${percentage}%`,
              background: C.white,
              borderRadius: 10,
              transition: "width 0.25s ease",
            }}
          />
        </div>

        <p style={{
          textAlign: "right",
          fontSize: 11,
          margin: "8px 0 0",
        }}>
          {percentage}% completado
        </p>
      </section>

      {/* HERRAMIENTAS */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          marginBottom: 17,
        }}
      >
        <button
          type="button"
          disabled={loading}
          onClick={() => setRefresh((n) => n + 1)}
          style={{
            ...buttonStyle,
            background: "transparent",
            display: "flex",
            alignItems: "center",
            gap: 7,
            fontSize: 12,
            padding: "10px 0",
          }}
        >
          <RefreshCw size={16} />
          Actualizar lista
        </button>

        <button
          type="button"
          disabled={!checklistReady || loading}
          onClick={resetChecklist}
          style={{
            ...buttonStyle,
            background: "transparent",
            fontSize: 12,
            padding: "10px 0",
          }}
        >
          Desmarcar todo
        </button>
      </div>

      {/* ESTADOS */}

      {loading && (
        <p style={{
          textAlign: "center",
          padding: 25,
          color: C.muted,
          fontSize: 13,
        }}>
          Calculando tu lista de la compra...
        </p>
      )}

      {error && (
        <section style={cardStyle}>
          <p
            role="alert"
            style={{
              color: C.danger,
              fontSize: 12,
              lineHeight: 1.7,
            }}
          >
            {error}
          </p>

          <button
            type="button"
            onClick={() => setRefresh((n) => n + 1)}
            style={buttonStyle}
          >
            Reintentar
          </button>
        </section>
      )}

      {storageError && (
        <p role="alert" style={{
          color: C.danger,
          fontSize: 12,
        }}>
          {storageError}
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <section style={{
          ...cardStyle,
          textAlign: "center",
          padding: 25,
        }}>
          <Package
            size={32}
            color={C.green}
            strokeWidth={1.5}
          />

          <h3 style={{
            fontSize: 16,
            color: C.dark,
          }}>
            Todavía no hay productos
          </h3>

          <p style={{
            fontSize: 13,
            color: C.muted,
            lineHeight: 1.7,
          }}>
            Planifica las comidas de esta semana
            para generar tu lista automáticamente.
          </p>
        </section>
      )}

      {/* CATEGORÍAS */}

      {!loading && !error &&
        pendingGroups.map((group) => {
          const CategoryIcon =
            categoryIcons[
              group.category as keyof typeof categoryIcons
            ] || Package;


          return (
            <section
              key={group.category}
              style={cardStyle}
            >
              {/* CABECERA DE CATEGORÍA */}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  paddingBottom: 13,
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <div
                  style={{
                    width: 37,
                    height: 37,
                    borderRadius: 11,
                    background: C.pale,
                    color: C.green,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <CategoryIcon
                    size={20}
                    strokeWidth={1.7}
                  />
                </div>

                <h2
                  style={{
                    flex: 1,
                    fontSize: 14,
                    fontWeight: 600,
                    color: C.dark,
                    margin: 0,
                  }}
                >
                  {group.category}
                </h2>

                <span
                  style={{
                    fontSize: 11,
                    color: C.muted,
                    whiteSpace: "nowrap",
                  }}
                >
                  {group.items.length} pendientes
                </span>
              </div>

              {/* PRODUCTOS */}

              {group.items.map((item, index) => {
                const done = !!checked[itemKey(item)];

                return (
                  <button
                    key={itemKey(item)}
                    type="button"
                    role="checkbox"
                    aria-checked={done}
                    disabled={!checklistReady}
                    onClick={() => toggleItem(item)}
                    style={{
                      width: "100%",
                      minHeight: 52,
                      display: "flex",
                      alignItems: "center",
                      gap: 11,
                      padding: "12px 0",
                      background: "transparent",
                      border: "none",
                      borderBottom:
                        index < group.items.length - 1
                          ? `1px solid ${C.border}`
                          : "none",
                      fontFamily: "inherit",
                      cursor: "pointer",
                      textAlign: "left",
                      opacity: done ? 0.5 : 1,
                    }}
                  >
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        flexShrink: 0,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: 7,
                        border: `1px solid ${C.green}`,
                        background: done
                          ? C.green
                          : C.white,
                        color: C.white,
                      }}
                    >
                      {done && <Check size={16} />}
                    </span>

                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 13,
                        fontWeight: 500,
                        color: C.dark,
                        overflowWrap: "anywhere",
                        textDecoration: done
                          ? "line-through"
                          : "none",
                      }}
                    >
                      {item.ingredient}
                    </span>

                    <span
                      style={{
                        color: C.muted,
                        fontSize: 13,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatQuantity(
                        item.total_quantity,
                        item.unit
                      )}
                    </span>
                  </button>
                );
              })}
            </section>
          );
        })}

      {!loading && !error && purchasedItems.length > 0 && (
        <section style={{ ...cardStyle, background: C.pale }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10,
            paddingBottom: 13, borderBottom: `1px solid ${C.border}` }}>
            <Check size={20} color={C.green} />
            <h2 style={{ flex: 1, fontSize: 14, fontWeight: 600, color: C.dark, margin: 0 }}>
              Comprados ({purchasedItems.length})
            </h2>
          </div>
              {purchasedItems.map((item, index) => {
                const done = !!checked[itemKey(item)];

                return (
                  <button
                    key={itemKey(item)}
                    type="button"
                    role="checkbox"
                    aria-checked={done}
                    disabled={!checklistReady}
                    onClick={() => toggleItem(item)}
                    style={{
                      width: "100%",
                      minHeight: 52,
                      display: "flex",
                      alignItems: "center",
                      gap: 11,
                      padding: "12px 0",
                      background: "transparent",
                      border: "none",
                      borderBottom:
                        index < purchasedItems.length - 1
                          ? `1px solid ${C.border}`
                          : "none",
                      fontFamily: "inherit",
                      cursor: "pointer",
                      textAlign: "left",
                      opacity: done ? 0.5 : 1,
                    }}
                  >
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        flexShrink: 0,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: 7,
                        border: `1px solid ${C.green}`,
                        background: done
                          ? C.green
                          : C.white,
                        color: C.white,
                      }}
                    >
                      {done && <Check size={16} />}
                    </span>

                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 13,
                        fontWeight: 500,
                        color: C.dark,
                        overflowWrap: "anywhere",
                        textDecoration: done
                          ? "line-through"
                          : "none",
                      }}
                    >
                      {item.ingredient}
                    </span>

                    <span
                      style={{
                        color: C.muted,
                        fontSize: 13,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatQuantity(
                        item.total_quantity,
                        item.unit
                      )}
                    </span>
                  </button>
                );
              })}
        </section>
      )}

      {/* NOTA FINAL */}

      {!loading && !error && items.length > 0 && (
        <div
          style={{
            background: C.pale,
            borderRadius: 15,
            padding: 16,
            marginTop: 5,
            marginBottom: 20,
          }}
        >
          <p style={{
            color: C.muted,
            fontSize: 11,
            lineHeight: 1.8,
            margin: 0,
          }}>
            Las cantidades corresponden a los pesos
            originales del plan nutricional, antes
            de cocinar cuando corresponda.
            Si cambias una comida, actualiza la lista.
            Los productos marcados se guardan en
            este dispositivo.
          </p>
        </div>
      )}
    </div>
  );
}
