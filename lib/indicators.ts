export interface IndicatorSnapshot {
  rsi14: number | null;
  sma20: number | null;
  sma50: number | null;
  ema12: number | null;
  ema26: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  signals: string[];
}

function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(values.length - period);
  return slice.reduce((sum, v) => sum + v, 0) / period;
}

function emaSeries(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return result;

  const k = 2 / (period + 1);
  let prevEma = values.slice(0, period).reduce((sum, v) => sum + v, 0) / period;
  result[period - 1] = prevEma;

  for (let i = period; i < values.length; i++) {
    prevEma = values[i] * k + prevEma * (1 - k);
    result[i] = prevEma;
  }
  return result;
}

function rsi(values: number[], period = 14): number | null {
  if (values.length < period + 1) return null;

  let gains = 0;
  let losses = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const delta = values[i] - values[i - 1];
    if (delta >= 0) gains += delta;
    else losses -= delta;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function computeIndicators(closes: number[]): IndicatorSnapshot {
  const signals: string[] = [];

  const rsi14 = rsi(closes, 14);
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);

  const ema12Series = emaSeries(closes, 12);
  const ema26Series = emaSeries(closes, 26);
  const ema12 = ema12Series[ema12Series.length - 1];
  const ema26 = ema26Series[ema26Series.length - 1];

  let macd: number | null = null;
  let macdSignal: number | null = null;
  let macdHistogram: number | null = null;

  if (ema12 !== null && ema26 !== null) {
    const macdSeries: number[] = [];
    for (let i = 0; i < closes.length; i++) {
      const a = ema12Series[i];
      const b = ema26Series[i];
      if (a !== null && b !== null) macdSeries.push(a - b);
    }
    macd = macdSeries[macdSeries.length - 1] ?? null;
    const signalSeries = emaSeries(macdSeries, 9);
    macdSignal = signalSeries[signalSeries.length - 1];
    if (macd !== null && macdSignal !== null) {
      macdHistogram = macd - macdSignal;
    }
  }

  if (rsi14 !== null) {
    if (rsi14 < 30) signals.push(`RSI en sobreventa (${rsi14.toFixed(1)})`);
    else if (rsi14 > 70) signals.push(`RSI en sobrecompra (${rsi14.toFixed(1)})`);
  }

  if (sma20 !== null && sma50 !== null) {
    if (sma20 > sma50) signals.push("Cruce alcista: SMA20 por encima de SMA50");
    else signals.push("Cruce bajista: SMA20 por debajo de SMA50");
  }

  if (macdHistogram !== null) {
    if (macdHistogram > 0) signals.push("MACD por encima de la señal (momentum alcista)");
    else signals.push("MACD por debajo de la señal (momentum bajista)");
  }

  return { rsi14, sma20, sma50, ema12, ema26, macd, macdSignal, macdHistogram, signals };
}
