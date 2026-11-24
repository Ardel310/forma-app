
"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Copy,
  BookOpen,
  ChevronRight,
  ArrowLeft,
  CalendarDays,
  Check,
  Archive,
  FileText,
  X,
} from "lucide-react";
import { createClient } from "../lib/supabase/client";

type Plan = {
  id: string;
  name: string;
  nutritionist: string | null;
  start_date: string;
  end_date: string | null;
  status: "draft" | "active" | "archived";
  notes: string | null;
};

type Meal = {
  id: string;
  meal_type: string;
  option_number: number;
  name: string;
  instructions: string | null;
};

type Ingredient = {
  id: string;
  meal_id: string;
  name: string;
  quantity: number;
  unit: string;
};

const mealTypes = [
  ["breakfast", "Desayuno"],
  ["morning_snack", "Media mañana"],
  ["lunch", "Almuerzo"],
  ["lunch_dessert", "Postre del almuerzo"],
  ["afternoon_snack", "Merienda"],
  ["dinner", "Cena"],
  ["dinner_dessert", "Postre de la cena"],
];

const emptyForm = {
  name: "",
  nutritionist: "",
  start_date: "",
  end_date: "",
  notes: "",
};

const styles = {
  card: "rounded-2xl border border-[#DFE5DF] bg-white p-5",
  input:
    "w-full rounded-xl border border-[#DFE5DF] bg-white px-4 py-3 text-sm outline-none focus:border-[#7D8C82]",
  primary:
    "flex w-full items-center justify-center gap-2 rounded-xl bg-[#7D8C82] px-4 py-3 text-sm font-medium text-white disabled:opacity-50",
  secondary:
    "flex w-full items-center justify-center gap-2 rounded-xl bg-[#EDF1ED] px-4 py-3 text-sm font-medium text-[#65776B] disabled:opacity-50",
};

function formatDate(date: string | null) {
  if (!date) return "Sin fecha de fin";

  return new Date(`${date}T12:00:00`).toLocaleDateString(
    "es-ES",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

export default function NutritionPlans() {
  const [supabase] = useState(() => createClient());

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<Plan | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [sourcePlan, setSourcePlan] = useState<Plan | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function loadPlans() {
    setLoading(true);

    const { data, error } = await supabase
      .from("nutrition_plans")
      .select("*")
      .order("start_date", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setPlans(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadPlans();
  }, []);

  function openCreate() {
    setError("");
    setMessage("");
    setSourcePlan(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  }

  function openDuplicate(plan: Plan) {
    setError("");
    setMessage("");
    setSourcePlan(plan);

    setForm({
      name: `${plan.name} - copia`,
      nutritionist: plan.nutritionist || "",
      start_date: "",
      end_date: "",
      notes: plan.notes || "",
    });

    setShowForm(true);
  }

  async function savePlan() {
    setError("");
    setMessage("");

    if (!form.name.trim() || !form.start_date) {
      setError("Completa el nombre y la fecha de inicio.");
      return;
    }

    if (form.end_date && form.end_date < form.start_date) {
      setError("La fecha de fin no puede ser anterior al inicio.");
      return;
    }

    setSaving(true);

    try {
      if (sourcePlan) {
        const { error } = await supabase.rpc(
          "duplicate_nutrition_plan",
          {
            p_source_plan_id: sourcePlan.id,
            p_name: form.name.trim(),
            p_start_date: form.start_date,
            p_end_date: form.end_date || null,
          }
        );

        if (error) throw error;
      } else {
        const { data, error: authError } =
          await supabase.auth.getUser();

        if (authError || !data.user) {
          throw new Error("Usuario no autenticado.");
        }

        const { error } = await supabase
          .from("nutrition_plans")
          .insert({
            user_id: data.user.id,
            name: form.name.trim(),
            nutritionist: form.nutritionist || null,
            start_date: form.start_date,
            end_date: form.end_date || null,
            notes: form.notes || null,
            status: "draft",
          });

        if (error) throw error;
      }

      setShowForm(false);
      setSelected(null);
      setMessage("Plan guardado como borrador.");
      await loadPlans();
    } catch (err: any) {
      setError(err.message || "No se pudo guardar el plan.");
    } finally {
      setSaving(false);
    }
  }

  async function openPlan(plan: Plan) {
    setSelected(plan);
    setMeals([]);
    setIngredients([]);
    setExpanded(null);
    setError("");
    setMessage("");
    setDetailLoading(true);

    try {
      const { data, error } = await supabase
        .from("nutrition_meals")
        .select("*")
        .eq("plan_id", plan.id)
        .order("option_number");

      if (error) throw error;

      const rows = data || [];
      setMeals(rows);

      if (rows.length > 0) {
        const { data: items, error: ingredientError } =
          await supabase
            .from("nutrition_ingredients")
            .select("*")
            .in(
              "meal_id",
              rows.map((meal) => meal.id)
            );

        if (ingredientError) throw ingredientError;

        setIngredients(items || []);
      }
    } catch (err: any) {
      setError(err.message || "No se pudo consultar el plan.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function activatePlan(plan: Plan) {
    const confirmed = window.confirm(
      `¿Activar "${plan.name}"? El plan actual se archivará y se conservará tu histórico.`
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const { error } = await supabase.rpc(
        "activate_nutrition_plan",
        { p_plan_id: plan.id }
      );

      if (error) throw error;

      setSelected(null);
      setMessage("Nuevo plan nutricional activado.");
      await loadPlans();
    } catch (err: any) {
      setError(err.message || "No se pudo activar el plan.");
    } finally {
      setSaving(false);
    }
  }

  const active = plans.find((plan) => plan.status === "active");

  const drafts = plans.filter(
    (plan) => plan.status === "draft"
  );

  const archived = plans.filter(
    (plan) => plan.status === "archived"
  );

  function renderPlanCard(plan: Plan) {
    return (
      <div key={plan.id} className={styles.card}>
        <div className="mb-3 flex items-start gap-3">
          <FileText size={22} className="mt-1 text-[#7D8C82]" />

          <div className="flex-1">
            <p className="text-xs text-[#7D8C82]">
              {plan.status === "draft" ? "Borrador" : "Archivado"}
            </p>

            <h3 className="mt-1 font-semibold text-[#20352E]">
              {plan.name}
            </h3>

            <p className="mt-1 text-xs text-gray-500">
              {formatDate(plan.start_date)} —{" "}
              {formatDate(plan.end_date)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => openPlan(plan)}
            className="flex items-center gap-2 rounded-lg bg-[#EDF1ED] px-3 py-2 text-xs text-[#65776B]"
          >
            <BookOpen size={15} />
            Consultar
          </button>

          <button
            onClick={() => openDuplicate(plan)}
            className="flex items-center gap-2 rounded-lg bg-[#EDF1ED] px-3 py-2 text-xs text-[#65776B]"
          >
            <Copy size={15} />
            Duplicar
          </button>

          {plan.status === "draft" && (
            <button
              disabled={saving}
              onClick={() => activatePlan(plan)}
              className="flex items-center gap-2 rounded-lg bg-[#7D8C82] px-3 py-2 text-xs text-white disabled:opacity-50"
            >
              <Check size={15} />
              Activar
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-5 pb-6 text-[#20352E]">

      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-xl bg-[#EDF1ED] p-3 text-sm text-[#65776B]">
          {message}
        </div>
      )}

      {showForm ? (
        <div className={`${styles.card} space-y-4`}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {sourcePlan ? "Duplicar plan" : "Nuevo plan"}
            </h2>

            <button
              onClick={() => setShowForm(false)}
              disabled={saving}
              aria-label="Cerrar"
            >
              <X size={21} className="text-[#7D8C82]" />
            </button>
          </div>

          {sourcePlan && (
            <p className="text-xs text-gray-500">
              Se copiarán todas las comidas, ingredientes,
              cantidades y preparaciones del plan original.
            </p>
          )}

          <label className="block space-y-1">
            <span className="text-xs font-medium">
              Nombre del plan
            </span>
            <input
              className={styles.input}
              placeholder="Plan nutricional diciembre 2026"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
            />
          </label>

          {!sourcePlan && (
            <label className="block space-y-1">
              <span className="text-xs font-medium">
                Nutricionista
              </span>
              <input
                className={styles.input}
                value={form.nutritionist}
                onChange={(e) =>
                  setForm({
                    ...form,
                    nutritionist: e.target.value,
                  })
                }
              />
            </label>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="block min-w-0 space-y-1">
              <span className="text-xs font-medium">
                Fecha de inicio
              </span>
              <input
                type="date"
                className={styles.input}
                value={form.start_date}
                onChange={(e) =>
                  setForm({
                    ...form,
                    start_date: e.target.value,
                  })
                }
              />
            </label>

            <label className="block min-w-0 space-y-1">
              <span className="text-xs font-medium">
                Fecha de fin
              </span>
              <input
                type="date"
                className={styles.input}
                value={form.end_date}
                onChange={(e) =>
                  setForm({
                    ...form,
                    end_date: e.target.value,
                  })
                }
              />
            </label>
          </div>

          {!sourcePlan && (
            <label className="block space-y-1">
              <span className="text-xs font-medium">
                Observaciones
              </span>
              <textarea
                className={styles.input}
                rows={4}
                value={form.notes}
                onChange={(e) =>
                  setForm({ ...form, notes: e.target.value })
                }
              />
            </label>
          )}

          <button
            className={styles.primary}
            disabled={saving}
            onClick={savePlan}
          >
            {saving ? "Guardando..." : "Guardar borrador"}
          </button>

          <button
            className={styles.secondary}
            disabled={saving}
            onClick={() => setShowForm(false)}
          >
            Cancelar
          </button>
        </div>
      ) : selected ? (
        <>
          <button
            onClick={() => {
              setSelected(null);
              setError("");
            }}
            className="flex items-center gap-2 text-sm text-[#7D8C82]"
          >
            <ArrowLeft size={18} />
            Todos los planes
          </button>

          <div>
            <p className="text-xs uppercase text-[#7D8C82]">
              {selected.status === "active"
                ? "Plan activo"
                : selected.status === "draft"
                ? "Borrador"
                : "Plan archivado"}
            </p>

            <h2 className="mt-1 text-2xl font-semibold">
              {selected.name}
            </h2>

            <p className="mt-2 flex items-center gap-2 text-xs text-gray-500">
              <CalendarDays size={15} />
              {formatDate(selected.start_date)} —{" "}
              {formatDate(selected.end_date)}
            </p>

            {selected.nutritionist && (
              <p className="mt-2 text-sm text-gray-500">
                {selected.nutritionist}
              </p>
            )}

            {selected.notes && (
              <p className="mt-3 text-sm text-gray-500">
                {selected.notes}
              </p>
            )}
          </div>

          {detailLoading ? (
            <p className="text-sm text-gray-500">
              Cargando recetas...
            </p>
          ) : (
            mealTypes.map(([type, label]) => {
              const options = meals.filter(
                (meal) => meal.meal_type === type
              );

              return (
                <div key={type} className={styles.card}>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold">{label}</h3>
                    <span className="text-xs text-[#7D8C82]">
                      {options.length} opciones
                    </span>
                  </div>

                  {options.length === 0 && (
                    <p className="text-xs text-gray-400">
                      Sin opciones registradas.
                    </p>
                  )}

                  <div className="space-y-2">
                    {options.map((meal) => (
                      <div
                        key={meal.id}
                        className="overflow-hidden rounded-xl border border-[#DFE5DF]"
                      >
                        <button
                          onClick={() =>
                            setExpanded(
                              expanded === meal.id
                                ? null
                                : meal.id
                            )
                          }
                          className="flex w-full items-center justify-between gap-3 p-3 text-left text-sm"
                        >
                          <span>
                            {meal.option_number}. {meal.name}
                          </span>

                          <ChevronRight
                            size={16}
                            className={`shrink-0 text-[#7D8C82] ${
                              expanded === meal.id
                                ? "rotate-90"
                                : ""
                            }`}
                          />
                        </button>

                        {expanded === meal.id && (
                          <div className="space-y-3 border-t border-[#DFE5DF] p-3">
                            <h4 className="text-xs font-semibold">
                              Ingredientes
                            </h4>

                            {ingredients
                              .filter(
                                (item) =>
                                  item.meal_id === meal.id
                              )
                              .map((item) => (
                                <div
                                  key={item.id}
                                  className="flex justify-between gap-3 text-xs"
                                >
                                  <span>{item.name}</span>
                                  <span className="shrink-0 text-[#7D8C82]">
                                    {item.quantity} {item.unit}
                                  </span>
                                </div>
                              ))}

                            {meal.instructions && (
                              <>
                                <h4 className="text-xs font-semibold">
                                  Preparación
                                </h4>
                                <p className="whitespace-pre-line text-xs leading-relaxed text-gray-600">
                                  {meal.instructions}
                                </p>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}

          <button
            className={styles.secondary}
            onClick={() => openDuplicate(selected)}
          >
            <Copy size={17} />
            Duplicar este plan
          </button>

          {selected.status === "draft" && (
            <button
              className={styles.primary}
              disabled={saving || detailLoading || meals.length === 0}
              onClick={() => activatePlan(selected)}
            >
              <Check size={17} />
              Activar plan
            </button>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-[#7D8C82]">
                Biblioteca
              </p>

              <h2 className="mt-1 text-2xl font-semibold">
                Planes nutricionales
              </h2>
            </div>

            <button
              onClick={openCreate}
              aria-label="Crear nuevo plan"
              className="rounded-xl bg-[#EDF1ED] p-3 text-[#7D8C82]"
            >
              <Plus size={23} />
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">
              Cargando planes...
            </p>
          ) : (
            <>
              {active ? (
                <div className="space-y-4 rounded-2xl bg-[#7D8C82] p-5 text-white">
                  <p className="text-xs font-medium uppercase tracking-wide text-white/80">
                    Plan activo
                  </p>

                  <h3 className="text-xl font-semibold">
                    {active.name}
                  </h3>

                  <p className="flex items-center gap-2 text-xs text-white/90">
                    <CalendarDays size={16} />
                    {formatDate(active.start_date)} —{" "}
                    {formatDate(active.end_date)}
                  </p>

                  <div className="space-y-3 border-t border-white/25 pt-4">
                    <button
                      onClick={() => openPlan(active)}
                      className="flex w-full items-center gap-3 text-sm"
                    >
                      <BookOpen size={18} />
                      <span className="flex-1 text-left">
                        Consultar plan
                      </span>
                      <ChevronRight size={17} />
                    </button>

                    <button
                      onClick={() => openDuplicate(active)}
                      className="flex w-full items-center gap-3 text-sm"
                    >
                      <Copy size={18} />
                      <span className="flex-1 text-left">
                        Duplicar plan
                      </span>
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.card}>
                  <p className="text-sm text-gray-500">
                    No tienes ningún plan activo.
                  </p>
                </div>
              )}

              <button
                onClick={openCreate}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#7D8C82] bg-white p-4 text-sm font-medium text-[#65776B]"
              >
                <Plus size={18} />
                Crear nuevo plan
              </button>

              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-semibold">
                  <FileText size={18} className="text-[#7D8C82]" />
                  Borradores
                </h3>

                {drafts.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    No tienes planes pendientes de activar.
                  </p>
                ) : (
                  drafts.map(renderPlanCard)
                )}
              </div>

              <div className="space-y-3 border-t border-[#DFE5DF] pt-5">
                <h3 className="flex items-center gap-2 font-semibold">
                  <Archive size={18} className="text-[#7D8C82]" />
                  Histórico de planes
                </h3>

                {archived.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    Tus planes anteriores aparecerán aquí.
                  </p>
                ) : (
                  archived.map(renderPlanCard)
                )}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
