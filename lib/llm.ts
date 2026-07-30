import { GoogleGenerativeAI } from "@google/generative-ai";
import type { MarketData } from "./market-data";
import type { IndicatorSnapshot } from "./indicators";
import type { NewsItem } from "./news";

export interface TradingSuggestion {
  action: "COMPRAR" | "VENDER" | "MANTENER";
  confidence: number;
  reasoning: string;
  model: string;
}

function buildPrompt(market: MarketData, indicators: IndicatorSnapshot, news: NewsItem[]): string {
  const newsBlock = news.length
    ? news.map((n) => `- ${n.title} (${n.source})`).join("\n")
    : "- Sin noticias recientes disponibles";

  return `Sos un analista financiero. Analizá el siguiente ticker y devolvé SOLO un JSON válido, sin markdown ni texto adicional, con este formato exacto:
{"action": "COMPRAR" | "VENDER" | "MANTENER", "confidence": number entre 0 y 100, "reasoning": "explicación breve en español, 2-4 oraciones"}

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

Recordá: esto es solo información educativa, no es asesoramiento financiero profesional. Devolvé únicamente el JSON.`;
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

  return {
    action,
    confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 0)),
    reasoning: String(parsed.reasoning ?? ""),
    model,
  };
}

async function callGemini(prompt: string): Promise<TradingSuggestion> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY no configurada");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return parseSuggestion(text, "gemini-flash-latest");
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

export async function generateSuggestion(
  market: MarketData,
  indicators: IndicatorSnapshot,
  news: NewsItem[]
): Promise<TradingSuggestion> {
  const prompt = buildPrompt(market, indicators, news);

  try {
    return await callGemini(prompt);
  } catch (geminiError) {
    try {
      return await callNvidiaNim(prompt);
    } catch (nimError) {
      throw new Error(
        `Fallaron ambos proveedores de LLM. Gemini: ${(geminiError as Error).message}. NVIDIA NIM: ${
          (nimError as Error).message
        }`
      );
    }
  }
}
