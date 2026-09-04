/**
 * Medições leves de desempenho, ligadas SÓ quando alguém pede —
 * `localStorage['sz:perf'] = '1'` ou `?szperf=1` na URL. Desligado, cada ponto
 * custa um `if`. Helper idêntico no Pinta, no Studio e no host kids: copiar em
 * vez de compartilhar mantém os pacotes sem dependência nova.
 */

const FLAG_KEY = 'sz:perf'
let enabled: boolean | null = null

function readFlag(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const param = new URLSearchParams(window.location.search).get('szperf')
    if (param === '1' || param === '0') {
      window.localStorage.setItem(FLAG_KEY, param)
    }
    return window.localStorage.getItem(FLAG_KEY) === '1'
  } catch {
    return false
  }
}

export function perfEnabled(): boolean {
  if (enabled === null) enabled = readFlag()
  return enabled
}

export function resetPerfFlagForTests(): void {
  enabled = null
}

function hasPerformance(): boolean {
  return typeof performance !== 'undefined' && typeof performance.mark === 'function'
}

export function perfMark(name: string): void {
  if (!perfEnabled() || !hasPerformance()) return
  try {
    performance.mark(name)
  } catch {
    // A medição nunca pode derrubar a tela.
  }
}

export function perfMeasure(
  name: string,
  startMark: string,
  endMark?: string,
  detail?: Record<string, unknown>,
): void {
  if (!perfEnabled() || !hasPerformance()) return
  try {
    const entry = performance.measure(name, {
      start: startMark,
      ...(endMark ? { end: endMark } : {}),
      ...(detail ? { detail } : {}),
    })
    console.debug(`[sz:perf] ${name} ${entry.duration.toFixed(1)}ms`, detail ?? '')
  } catch {
    // Marca de início ausente: ignora.
  }
}

export function perfSpan<T>(name: string, fn: () => T, detail?: Record<string, unknown>): T {
  if (!perfEnabled() || !hasPerformance()) return fn()
  const start = `${name}:start`
  perfMark(start)
  try {
    return fn()
  } finally {
    perfMeasure(name, start, undefined, detail)
  }
}

export async function perfSpanAsync<T>(
  name: string,
  fn: () => Promise<T>,
  detail?: Record<string, unknown>,
): Promise<T> {
  if (!perfEnabled() || !hasPerformance()) return fn()
  const start = `${name}:start`
  perfMark(start)
  try {
    return await fn()
  } finally {
    perfMeasure(name, start, undefined, detail)
  }
}
