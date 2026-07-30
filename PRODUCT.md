# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Usuario único (uso personal, sin multiusuario), consultando principalmente desde el celular en momentos puntuales — quiere chequear un ticker rápido antes de decidir, y a veces revisa la watchlist completa desde escritorio.

## Product Purpose

PWA que genera sugerencias de trading de **corto plazo** (posiciones de días a un máximo de 2-3 semanas), **exclusivamente on-demand** (el usuario dispara el análisis desde la app; no hay jobs en segundo plano ni notificaciones), combinando indicadores técnicos, calificación de TradingView, noticias recientes y hasta dos modelos de lenguaje en paralelo (Gemini + Groq) que se comparan entre sí para dar una opinión más robusta. No es para inversión de largo plazo, no ejecuta operaciones ni sustituye asesoramiento financiero profesional.

## Positioning

A diferencia de mirar Yahoo Finance o TradingView por separado, esta app resume en una sola pantalla: dato de precio (con fallback automático a TradingView cuando Yahoo no cubre BYMA/pesos), indicadores propios, calificación técnica externa y una explicación en lenguaje natural — todo en un solo tap, sin cuenta ni suscripción.

## Operating Context

- Watchlist persistida server-side (Redis/Upstash), consultada desde cualquier dispositivo.
- Sin jobs en segundo plano: todo análisis lo dispara el usuario manualmente desde la PWA.
- Gate de acceso por contraseña simple (uso personal, sin sistema de cuentas).
- Presupuesto $0: todas las fuentes de datos (Yahoo Finance, TradingView, Google News) son gratuitas y sin API key; los LLMs (Gemini, Groq, NVIDIA NIM) tienen free tier.

## Capabilities and Constraints

- Mercado: acciones de EEUU y Argentina (CEDEARs en dólares + BYMA en pesos vía fallback TradingView).
- Sin ejecución de operaciones reales ni conexión a brokers.
- Sin sistema de cuentas/roles — un solo usuario protegido por password compartida.
- Cuota diaria de Gemini free tier (20 requests/día) es una limitación conocida y activa.

## Brand Commitments

- Nombre: "Trading Suggestions".
- Tema **dark-only** (sin modo claro) — compromiso fijo del usuario.
- Paleta base heredada de un mockup de referencia (primary azul `#8ed5ff`, secondary verde `#4edea3` para señales alcistas, error rojo `#ffb4ab` para señales bajistas) — punto de partida, no hay logo ni identidad de marca más allá de esto.

## Evidence on Hand

Ninguna (sin testimonios, casos de estudio ni datos de uso real todavía — producto personal recién lanzado).

## Product Principles

1. Cada dato mostrado debe ser real y trazable a una fuente (Yahoo/TradingView/Gemini) — nunca fabricar precios, sparklines o históricos que no tenemos.
2. Mobile-first: el flujo principal (buscar → analizar → leer sugerencia) debe sentirse rápido e inmediato en un celular.
3. La app es una herramienta informativa, no un simulador de trading — evitar cualquier elemento visual que sugiera ejecución de operaciones reales.
4. Polish y microinteracciones (animaciones, transiciones, feedback táctil) son prioridad explícita del usuario, siempre que no compliquen el mantenimiento del código.
5. Dark theme es un compromiso fijo, no una opción de configuración.
6. Horizonte de corto plazo es un compromiso fijo: prompts, indicadores, rango de gráfico y copy deben reflejar días-semanas, nunca inversión de largo plazo.

## Accessibility & Inclusion

Sin requisito específico confirmado más allá de buen contraste en tema oscuro (ya considerado en la paleta actual).
