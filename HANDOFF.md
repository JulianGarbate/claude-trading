# Handoff — Trading Suggestions PWA

Este documento resume todo lo construido en la sesión anterior de Claude Code, para que una sesión nueva (local o en la nube) pueda retomar el trabajo sin el historial de chat original.

## Qué es el proyecto

PWA personal (uso de un solo usuario) que da sugerencias de trading de **corto plazo** (posiciones de días a 2-3 semanas) sobre acciones de EEUU y CEDEARs/BYMA argentinos. Combina datos de mercado, indicadores técnicos propios, calificación de TradingView, y **hasta varios modelos de IA en paralelo** (comparados entre sí) para dar una opinión más robusta que un solo LLM.

- **Repo**: https://github.com/JulianGarbate/claude-trading (rama `main`)
- **Producción**: https://trading-seven-virid.vercel.app
- **Deploy**: Vercel, proyecto `trading`, cuenta `juliangarbates-projects` (plan **Hobby/gratis** — importante, ver limitaciones abajo)
- **Presupuesto**: $0. Todo corre en free tier.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind v4. Sin backend separado — todo vive en `app/api/*` route handlers.

## Arquitectura de datos

- **Precios/velas**: Yahoo Finance (`lib/market-data.ts`, sin API key) como fuente primaria. Fallback automático a **TradingView** (`lib/tradingview.ts`, endpoints públicos no oficiales) cuando Yahoo no cubre el ticker — típicamente BYMA/pesos argentinos.
- **Indicadores técnicos**: RSI14, SMA20/50, MACD calculados a mano en `lib/indicators.ts` (sin librerías externas).
- **Noticias**: Google News RSS (`lib/news.ts`, sin API key).
- **Gráfico**: `lightweight-charts` (librería open-source de TradingView) en `components/CandlestickChart.tsx`. Selector de período (1D/5D/1M/3M/6M/1A) vía `/api/prices`, líneas de SMA superpuestas, marcador de la señal de IA, y líneas horizontales de precio objetivo (entrada/compra/venta/stop-loss).
- **Watchlist**: Redis (Upstash, vía Vercel Marketplace) — `lib/watchlist-store.ts`.
- **Precios objetivo**: `lib/price-targets-store.ts`. El usuario ingresa un precio de entrada, la IA calcula buy/sell/stop-loss target, se guarda en Redis y se dibuja en el gráfico.

## IA: comparación de modelos configurable

`lib/llm.ts` + `lib/llm-models.ts`. Hay **7 modelos disponibles**, agrupados por proveedor, todos gratis:

| Proveedor | Modelos |
|---|---|
| Gemini (Google AI Studio) | `gemini-flash-latest` |
| Groq | `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `openai/gpt-oss-120b` |
| OpenRouter | `nvidia/nemotron-3-super-120b-a12b:free`, `google/gemma-4-31b-it:free`, `openai/gpt-oss-20b:free` |

El usuario elige cuáles participan (mínimo 1) desde `components/ModelPicker.tsx`, persistido en `localStorage` (`lib/model-prefs.ts`), default = Gemini + Groq 70B + Nemotron. Se llaman todos **en paralelo** (`Promise.allSettled`) vía `generateSuggestions()`. Si ninguno responde, cae a NVIDIA NIM como último respaldo. El prompt (`buildPrompt` en `lib/llm.ts`) tiene instrucciones explícitas anti-sesgo-optimista (los LLM tienden a recomendar COMPRAR de más).

**UI**: `components/SuggestionCard.tsx` muestra cada opinión en su propia card (grid de máx. 2 columnas, filas infinitas), con un banner de consenso ("N de M modelos coinciden en X" o "señales mixtas").

### Cosas importantes que aprendimos sobre los proveedores gratis
- **Gemini free tier**: 20 requests/día. Se agota rápido testeando.
- **OpenRouter free tier**: límite diario **compartido entre todos los modelos gratis por cuenta** — bajo (~50/día) si nunca cargaste crédito, alto (~1000/día) si cargaste aunque sea $1. El usuario nunca cargó crédito, así que está en el límite bajo.
- **Los modelos gratis de OpenRouter cambian de disponibilidad seguido** — un modelo que hoy es `:free` puede dejar de estarlo. Si `callOpenRouterModel` empieza a fallar, revisar `https://openrouter.ai/api/v1/models` filtrando por `id.endsWith(':free')`.
- **Bug real ya arreglado**: algunos modelos lentos de OpenRouter (Nemotron) a veces devuelven líneas de keep-alive (espacios) antes del JSON real. `callOpenRouterModel` ya lo maneja buscando el primer `{` en el texto crudo antes de parsear — no usar `res.json()` directo ahí.
- **Groq** corre en hardware propio (LPU), es rápido y confiable independientemente del modelo — no tiene el problema de latencia variable de OpenRouter.

## Cron y push notifications

Hubo dos iteraciones de esto — la actual es la que vale:

1. **Se sacó** un cron que escaneaba toda la watchlist con IA 2x/día (gastaba cuota sin que el usuario lo pidiera).
2. **Se agregó** en su lugar: análisis 100% on-demand + un cron **liviano** (`app/api/cron/check-targets/route.ts`) que **no llama a la IA**, solo compara el precio actual contra los price-targets guardados y dispara push si se cruza un nivel (`notifiedSell`/`notifiedStopLoss`/`notifiedBuy` evitan re-notificar).
3. **Push**: VAPID + `lib/push.ts` + `/api/subscribe` + listeners en `public/sw.js`. Botón "Activar notificaciones" en `components/InstallPrompt.tsx`.

### ⚠️ Limitación del plan Hobby de Vercel
**Cron jobs en plan gratis solo pueden correr 1 vez por día**, no más seguido. El cron de check-targets está en `vercel.json` corriendo a las 20:00 UTC (cerca del cierre del mercado de EEUU). Si en algún momento se quiere chequeo más frecuente, hay que upgradear a Vercel Pro.

## Auth

Password simple compartida (`APP_PASSWORD` env var) protegiendo todos los endpoints. El frontend (`lib/api-client.ts`) la pide una vez vía prompt del navegador y la guarda en `localStorage`, mandándola en el header `x-app-password` en cada request. `components/PasswordGate.tsx` es la pantalla de login.

## Env vars (ver `.env.example` para la lista completa)

Todas ya están cargadas en Vercel producción. Las que hacen falta para levantar local: copiar `.env.example` a `.env.local` y completar. Claves ya obtenidas por el usuario: Gemini, Groq, OpenRouter, VAPID (generadas), Upstash Redis (vía Vercel Marketplace), `APP_PASSWORD`, `CRON_SECRET`. `NVIDIA_NIM_API_KEY` nunca se configuró (opcional, solo fallback de último recurso).

## Diseño

Tema oscuro fijo (sin modo claro), paleta y tipografía definidas en `app/globals.css` (`@theme` de Tailwind v4). Se usaron skills de diseño instaladas vía `npx skills add emilkowalski/skills` e `npx impeccable install` (quedaron en `.claude/skills/`, gitignoreadas — reinstalar si hace falta, ver `skills-lock.json`). Animaciones con easing custom, feedback de presión en botones, respeta `prefers-reduced-motion`.

## Pendiente / ideas no implementadas

- Multi-position tracking (hoy solo 1 price-target activo por ticker, se sobreescribe).
- Historial de sugerencias pasadas.
- Ejecución real de operaciones — **fuera de alcance a propósito**, la app es puramente informativa.

## Cómo levantar local

```bash
npm install
cp .env.example .env.local   # completar con las keys reales
npm run dev
```

## Cómo deployar

```bash
npx vercel deploy --prod
```
(Requiere estar logueado con `npx vercel login` y tener el proyecto linkeado — ya está linkeado a `juliangarbates-projects/trading`.)
