// Metadata de los modelos disponibles para comparar. Sin imports server-only
// (SDKs, API keys) para que sea seguro importarlo desde componentes cliente.

export interface ModelOption {
  id: string;
  label: string;
  provider: "gemini" | "groq" | "openrouter";
}

export const MODEL_OPTIONS: ModelOption[] = [
  { id: "gemini", label: "Gemini Flash", provider: "gemini" },
  { id: "groq-llama-3.3-70b", label: "Groq · Llama 3.3 70B", provider: "groq" },
  { id: "groq-llama-3.1-8b", label: "Groq · Llama 3.1 8B (rápido)", provider: "groq" },
  { id: "groq-gpt-oss-120b", label: "Groq · GPT-OSS 120B", provider: "groq" },
  { id: "or-nemotron-super", label: "OpenRouter · Nemotron 3 Super", provider: "openrouter" },
  { id: "or-gemma-31b", label: "OpenRouter · Gemma 4 31B", provider: "openrouter" },
  { id: "or-gpt-oss-20b", label: "OpenRouter · GPT-OSS 20B", provider: "openrouter" },
];

export const DEFAULT_MODEL_IDS = ["gemini", "groq-llama-3.3-70b", "or-nemotron-super"];

export const MODEL_IDS = MODEL_OPTIONS.map((m) => m.id);
