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
  Apple,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "../lib/supabase/client";
import ShoppingList from "../components/ShoppingList";
import NutritionPlans from "../components/NutritionPlans";
import FoodCatalog from "../components/FoodCatalog";
import BodyProgress from "../components/BodyProgress";
import Training from "../components/Training";

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
