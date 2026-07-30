import { GoogleGenerativeAI } from "@google/generative-ai";
import type { MarketData } from "./market-data";
import type { IndicatorSnapshot } from "./indicators";
import type { NewsItem } from "./news";

export interface TradingSuggestion {
  action: "COMPRAR" | "VENDER" | "MANTENER";
  confidence: number;
  horizon: string;
  reasoning: string;
  model: string;
  buyTarget: number | null;
  sellTarget: number | null;
  stopLoss: number | null;
}

function buildPrompt(
  market: MarketData,
  indicators: IndicatorSnapshot,
  news: NewsItem[],
  entryPrice?: number
): string {
  const newsBlock = news.length
    ? news.map((n) => `- ${n.title} (${n.source})`).join("\n")
    : "- Sin noticias recientes disponibles";

  const levelsInstruction = entryPrice
    ? `\nEl usuario tiene (o está evaluando) un precio de entrada de ${entryPrice} ${market.currency}. Además de la recomendación, calculá niveles concretos de precio en base a soporte/resistencia cercanos y el rango reciente de las velas (no uses porcentajes fijos arbitrarios):
- "buyTarget": precio al que convendría comprar/promediar si todavía no se entró y el precio actual está por encima del punto de entrada ideal. Si el precio actual ya es un buen punto de entrada, usá el precio actual.
- "sellTarget": precio objetivo de toma de ganancias (take-profit), por encima del precio de entrada.
- "stopLoss": precio de corte de pérdida, por debajo del precio de entrada, en un soporte técnico razonable.
Estos tres deben ser números concretos en la misma moneda que el precio actual.`
    : `\nNo calcules niveles de precio de entrada/salida (el usuario no cargó un precio de referencia); devolvé "buyTarget", "sellTarget" y "stopLoss" como null.`;

  return `Sos un analista de trading especializado en operaciones de CORTO PLAZO, con un sesgo deliberadamente escéptico. El usuario de esta app opera exclusivamente en horizontes cortos: mantiene posiciones desde un par de días hasta un máximo de 2-3 semanas. NUNCA des una recomendación pensando en inversión de largo plazo (tesis fundamental, "comprar y mantener años", valuación a 5-10 años, etc.). Priorizá momentum técnico reciente, catalizadores de noticias de corto plazo, y niveles de soporte/resistencia cercanos al precio actual.

IMPORTANTE — evitá el sesgo optimista: los modelos de lenguaje tienden a recomendar COMPRAR con demasiada frecuencia y a inflar la confianza. Para contrarrestarlo:
- Antes de decidir, listá mentalmente tanto la evidencia A FAVOR como la evidencia EN CONTRA de la posición (sobrecompra/sobreventa, momentum débil, noticias negativas, extensión excesiva del precio respecto a sus medias). No ignores ni minimices las señales bajistas.
- Un RSI cercano o por encima de 70 es una señal de riesgo real de corrección, no un detalle menor a pasar por alto.
- MANTENER y VENDER son resultados igual de válidos que COMPRAR — no los uses solo como excepción. Si la evidencia es mixta o el precio ya corrió mucho en el corto plazo, elegí MANTENER o VENDER en vez de forzar un COMPRAR optimista.
- La confianza (confidence) debe reflejar incertidumbre real: reservá valores por encima de 80 solo para casos con señales técnicas y de noticias claramente alineadas en la misma dirección; con señales mixtas, usá 40-65.
${levelsInstruction}

Analizá el siguiente ticker y devolvé SOLO un JSON válido, sin markdown ni texto adicional, con este formato exacto:
{"action": "COMPRAR" | "VENDER" | "MANTENER", "confidence": number entre 0 y 100, "horizon": "horizonte sugerido en días u semanas, ej: '3-5 días' o '1-2 semanas'", "reasoning": "explicación breve en español, 2-4 oraciones, que mencione explícitamente al menos un riesgo o contraargumento aunque la recomendación sea COMPRAR", "buyTarget": number | null, "sellTarget": number | null, "stopLoss": number | null}

Ticker: ${market.ticker}
Precio actual: ${market.lastPrice} ${market.currency}
Variación reciente: ${market.changePercent.toFixed(2)}%

Indicadores técnicos:
- RSI(14): ${indicators.rsi14?.toFixed(1) ?? "N/D"}
- SMA20: ${indicators.sma20?.toFixed(2) ?? "N/D"}
- SMA50: ${indicators.sma50?.toFixed(2) ?? "N/D"}
- MACD: ${indicators.macd?.toFixed(3) ?? "N/D"} / Señal: ${indicators.macdSignal?.toFixed(3) ?? "N/D"}
- Señales detectadas: ${indicators.signals.join("; ") || "ninguna"}

Noticias recientes:
${newsBlock}

Recordá: esto es solo información educativa para trading de corto plazo, no es asesoramiento financiero profesional ni una tesis de inversión de largo plazo. Devolvé únicamente el JSON.`;
}

function parseSuggestion(raw: string, model: string): TradingSuggestion {
  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("El modelo no devolvió un JSON válido");

  const parsed = JSON.parse(jsonMatch[0]);
  const action = parsed.action;
  if (!["COMPRAR", "VENDER", "MANTENER"].includes(action)) {
    throw new Error(`Acción inválida devuelta por el modelo: ${action}`);
  }

  const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

  return {
    action,
    confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 0)),
    horizon: String(parsed.horizon ?? "Corto plazo"),
    reasoning: String(parsed.reasoning ?? ""),
    model,
    buyTarget: num(parsed.buyTarget),
    sellTarget: num(parsed.sellTarget),
    stopLoss: num(parsed.stopLoss),
  };
}

async function callGemini(prompt: string): Promise<TradingSuggestion> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY no configurada");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-flash-latest",
    generationConfig: { temperature: 0.3 },
  });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return parseSuggestion(text, "gemini-flash-latest");
}

async function callGroq(prompt: string): Promise<TradingSuggestion> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY no configurada");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    throw new Error(`Groq error: HTTP ${res.status}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  return parseSuggestion(text, "llama-3.3-70b-versatile (groq)");
}

async function callOpenRouter(prompt: string): Promise<TradingSuggestion> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY no configurada");

  // Los modelos gratuitos de OpenRouter (con razonamiento) pueden ser lentos;
  // no vale la pena esperarlos si Gemini/Groq ya respondieron rápido.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  let res: Response;
  try {
    res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b:free",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 800,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error(`OpenRouter error: HTTP ${res.status}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  return parseSuggestion(text, "gpt-oss-20b (openrouter)");
}

async function callNvidiaNim(prompt: string): Promise<TradingSuggestion> {
  const apiKey = process.env.NVIDIA_NIM_API_KEY;
  if (!apiKey) throw new Error("NVIDIA_NIM_API_KEY no configurada");

  const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta/llama-3.1-70b-instruct",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    throw new Error(`NVIDIA NIM error: HTTP ${res.status}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  return parseSuggestion(text, "llama-3.1-70b-instruct (nvidia-nim)");
}

export class SuggestionUnavailableError extends Error {
  constructor(public providerErrors: string[]) {
    super("Ningún proveedor de IA disponible");
    this.name = "SuggestionUnavailableError";
  }
}

/**
 * Consulta Gemini, Groq y OpenRouter en paralelo para comparar hasta 3 opiniones
 * independientes. Si las tres fallan, recurre a NVIDIA NIM como último respaldo.
 */
export async function generateSuggestions(
  market: MarketData,
  indicators: IndicatorSnapshot,
  news: NewsItem[],
  entryPrice?: number
): Promise<TradingSuggestion[]> {
  const prompt = buildPrompt(market, indicators, news, entryPrice);

  const [geminiResult, groqResult, openRouterResult] = await Promise.allSettled([
    callGemini(prompt),
    callGroq(prompt),
    callOpenRouter(prompt),
  ]);

  const suggestions: TradingSuggestion[] = [];
  const errors: string[] = [];

  if (geminiResult.status === "fulfilled") suggestions.push(geminiResult.value);
  else errors.push(`Gemini: ${geminiResult.reason.message}`);

  if (groqResult.status === "fulfilled") suggestions.push(groqResult.value);
  else errors.push(`Groq: ${groqResult.reason.message}`);

  if (openRouterResult.status === "fulfilled") suggestions.push(openRouterResult.value);
  else errors.push(`OpenRouter: ${openRouterResult.reason.message}`);

  if (suggestions.length > 0) return suggestions;

  try {
    return [await callNvidiaNim(prompt)];
  } catch (err) {
    errors.push(`NVIDIA NIM: ${(err as Error).message}`);
  }

  throw new SuggestionUnavailableError(errors);
}
