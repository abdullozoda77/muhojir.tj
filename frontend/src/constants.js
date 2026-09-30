import { Building, Car, ChefHat, Factory, HardHat, Package, ShoppingCart, Sparkles, Sprout, Truck, Wrench } from "lucide-react";
import { t } from "./i18n.js";

// Same keys as INDUSTRIES in jobs/models.py.
export const INDUSTRIES = [
  { value: "construction", label: t("Сохтмон"), icon: HardHat },
  { value: "warehouse", label: t("Анбор"), icon: Package },
  { value: "delivery", label: t("Расонидан"), icon: Truck },
  { value: "taxi", label: t("Таксӣ ва ронандагӣ"), icon: Car },
  { value: "trade", label: t("Савдо"), icon: ShoppingCart },
  { value: "food", label: t("Ошхона ва қаҳвахона"), icon: ChefHat },
  { value: "cleaning", label: t("Тозакунӣ"), icon: Sparkles },
  { value: "agriculture", label: t("Кишоварзӣ"), icon: Sprout },
  { value: "manufacturing", label: t("Истеҳсолот"), icon: Factory },
  { value: "other", label: t("Дигар"), icon: Wrench },
];

export const industry = (value) => INDUSTRIES.find((i) => i.value === value) || { value, label: value, icon: Building };

export const RUSSIAN_LEVELS = [
  { value: "none", label: t("Намедонам") },
  { value: "basic", label: t("Каме") },
  { value: "good", label: t("Хуб") },
  { value: "fluent", label: t("Озод") },
];

export const PERIODS = [
  { value: "month", label: t("дар як моҳ") },
  { value: "day", label: t("дар як рӯз") },
  { value: "hour", label: t("дар як соат") },
];

// Application statuses, in the order they usually happen.
export const APPLICATION_STATUS = {
  sent: { label: t("Фиристода шуд"), box: "bg-surface-container-high text-on-surface" },
  viewed: { label: t("Дида шуд"), box: "bg-primary-fixed text-on-primary-fixed" },
  invited: { label: t("Даъват шуд"), box: "bg-tertiary-fixed text-on-tertiary-fixed" },
  rejected: { label: t("Рад шуд"), box: "bg-error-container text-on-error-container" },
};
