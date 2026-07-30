import { DEFAULT_MODEL_IDS, MODEL_IDS } from "./llm-models";

const STORAGE_KEY = "trading-pwa:selected-models";

export function getSelectedModels(): string[] {
  if (typeof window === "undefined") return DEFAULT_MODEL_IDS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_MODEL_IDS;
    const parsed = JSON.parse(raw) as string[];
    const valid = parsed.filter((id) => MODEL_IDS.includes(id));
    return valid.length > 0 ? valid : DEFAULT_MODEL_IDS;
  } catch {
    return DEFAULT_MODEL_IDS;
  }
}

export function setSelectedModels(ids: string[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}
