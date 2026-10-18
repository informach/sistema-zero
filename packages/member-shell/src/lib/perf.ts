/**
 * Medições leves de desempenho (19/08/2026): marcas de tempo nos pontos quentes
 * (carga da galeria, autosave, pintura de miniaturas…), ligadas SÓ quando alguém
 * pede — `localStorage['sz:perf'] = '1'` ou `?szperf=1` na URL (que grava a chave
 * para valer na navegação da SPA; `?szperf=0` desliga). Desligado, cada ponto
 * custa um `if`.
 *
 * Saída: `performance.mark`/`performance.measure` (User Timing — aparece na aba
 * Performance do DevTools) + `console.debug('[sz:perf] nome 12.3ms')`. Nada sobe
 * para servidor nenhum; é instrumento de bancada, não telemetria.
 *
 * Helper idêntico no Pinta (`packages/pinta/src/core/perf.ts`) e no Estúdio
 * (`packages/studio/src/core/perf.ts`): copiar em vez de compartilhar mantém os pacotes sem
 * dependência nova e o arquivo é minúsculo.
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

/** Está ligado nesta carga? (Avaliado uma vez; `resetPerfFlagForTests` refaz.) */
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
    // Nome inválido ou API parcial: a medição nunca pode derrubar a tela.
  }
}

/** Mede de `startMark` até agora (ou até `endMark`) e registra no console. */
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
    // Marca de início ausente (fluxo que não começou por aqui): ignora.
  }
}

/** Mede um trecho síncrono. */
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

/** Mede um trecho assíncrono (mede mesmo quando a promessa rejeita). */
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
