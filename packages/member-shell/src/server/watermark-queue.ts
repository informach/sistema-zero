import 'server-only'

/**
 * Gate de concorrência da marca d'água: marcar exige MATERIALIZAR o arquivo em
 * memória (≤200MB — casado com o teto de upload do admin) e o pdf-lib/sharp
 * criam cópias internas — sem teto, uma turma baixando o mesmo PDF grande ao
 * mesmo tempo estoura a memória do host (OOM). No máximo `maxConcurrent`
 * marcações rodam de cada vez; as demais ESPERAM em fila (o download já leva
 * segundos — esperar é melhor que 503). A memória fica limitada a
 * ~maxConcurrent × teto × fator das libs; quem espera segura só um closure
 * (e o stream do R2 ainda não consumido), não o buffer.
 *
 * ⚠️ Incidente 07/09/2026 ("preparando seu e-book" para sempre, depois 524 do
 * Cloudflare): a fila NÃO tinha prazo nem enxergava o cliente ir embora. Cada
 * marcação de um caderno leva 6–15s de CPU; com concorrência 1, uma turma
 * abrindo cadernos + recarregando a página (cada recarga enfileira OUTRO
 * trabalho, o antigo continua na fila) passou dos 100s do Cloudflare, e a partir
 * daí toda recarga só alimentava a fila — travando TODOS os e-books do serviço.
 * Por isso quem espera agora (a) sai da fila quando a request é abortada
 * (`signal`) e (b) desiste depois de `waitTimeoutMs` com `WatermarkQueueBusyError`
 * (→ 503 + Retry-After, que o cliente entende), em vez de virar 524.
 *
 * O estado vive em `globalThis` (Symbol.for) — mesma lição do single-flight do
 * refresh: o Turbopack pode duplicar o módulo por bundle (proxy/RSC/handlers);
 * um contador de módulo daria um teto POR CÓPIA, não por processo.
 */

export interface GateRunOptions {
  /** Request do cliente: abortada (aba fechada, recarga) → sai da fila sem ocupar vaga. */
  signal?: AbortSignal
  /** Prazo máximo ESPERANDO a vaga (não conta o trabalho em si). Ausente = espera sem prazo. */
  waitTimeoutMs?: number
}

export interface ConcurrencyGate {
  run<T>(fn: () => Promise<T>, opts?: GateRunOptions): Promise<T>
}

/** A fila está cheia demais para esperar: o cliente deve tentar de novo em instantes (503). */
export class WatermarkQueueBusyError extends Error {
  readonly code = 'WATERMARK_BUSY'
  constructor(message = 'Muita gente abrindo materiais agora. Tente de novo em instantes.') {
    super(message)
    this.name = 'WatermarkQueueBusyError'
  }
}

/** O cliente desistiu (request abortada) enquanto esperava a vaga. */
export class WatermarkQueueAbortedError extends Error {
  readonly code = 'WATERMARK_ABORTED'
  constructor(message = 'Download cancelado pelo cliente.') {
    super(message)
    this.name = 'WatermarkQueueAbortedError'
  }
}

interface Waiter {
  /** Falso depois de acordar, expirar ou ser abortado — `wakeNext` pula os mortos. */
  live: boolean
  wake: () => void
}

/** Prazo padrão esperando a vaga: bem abaixo dos 100s em que o Cloudflare devolve 524. */
export const WATERMARK_WAIT_TIMEOUT_MS = 30_000

/** Gate FIFO puro (testável): no máximo `maxConcurrent` execuções simultâneas. */
export function createGate(maxConcurrent: number): ConcurrencyGate {
  let active = 0
  const queue: Waiter[] = []

  // Acorda o PRIMEIRO esperador vivo. Um esperador que expirou/abortou já saiu
  // da conta (live=false): pulá-lo evita que o wake-up morra com ele e a vaga
  // fique presa com a fila cheia.
  const wakeNext = () => {
    while (queue.length > 0) {
      const next = queue.shift() as Waiter
      if (next.live) {
        next.live = false
        next.wake()
        return
      }
    }
  }

  const waitForTurn = (opts: GateRunOptions) =>
    new Promise<void>((resolve, reject) => {
      const waiter: Waiter = { live: true, wake: () => {} }
      let timer: ReturnType<typeof setTimeout> | null = null
      const cleanup = () => {
        if (timer) clearTimeout(timer)
        opts.signal?.removeEventListener('abort', onAbort)
      }
      const leave = (error: Error) => {
        if (!waiter.live) return // já acordou: a vaga é dele, deixa seguir
        waiter.live = false
        cleanup()
        reject(error)
      }
      const onAbort = () => leave(new WatermarkQueueAbortedError())
      waiter.wake = () => {
        cleanup()
        resolve()
      }
      if (opts.waitTimeoutMs !== undefined) {
        timer = setTimeout(() => leave(new WatermarkQueueBusyError()), opts.waitTimeoutMs)
      }
      opts.signal?.addEventListener('abort', onAbort, { once: true })
      queue.push(waiter)
    })

  return {
    async run<T>(fn: () => Promise<T>, opts: GateRunOptions = {}): Promise<T> {
      if (opts.signal?.aborted) throw new WatermarkQueueAbortedError()
      // Re-checa após acordar: entre o release e o microtask deste waiter, um
      // chamador novo pode ter tomado a vaga — o teto é o invariante, não a ordem.
      while (active >= maxConcurrent) {
        await waitForTurn(opts)
      }
      active++
      try {
        return await fn()
      } finally {
        active--
        wakeNext()
      }
    },
  }
}

/**
 * 1 × 200MB × fator interno das libs (pdf-lib reescreve o doc ~2-3×) ≈ ~600MB de
 * pico. Era 2 quando o teto era 50MB (~300MB); ao subir o teto p/ 200MB,
 * baixamos p/ 1 para o pico não dobrar de novo (OOM = crash, não erro tratável).
 * Se a RAM do serviço community for elevada (≥2GB) no Railway, dá p/ voltar a 2.
 * O gargalo real de vazão saiu daqui: o PDF marcado é CACHEADO por aluno (ver
 * `private-delivery.ts`), então cada caderno passa pelo pdf-lib UMA vez por aluno.
 */
const MAX_CONCURRENT_WATERMARKS = 1

const GATE_KEY = Symbol.for('@sistemazero/community:watermark-gate')

/** Gate singleton do processo (ver nota do `globalThis` acima). */
export function watermarkGate(): ConcurrencyGate {
  const store = globalThis as Record<symbol, unknown>
  let gate = store[GATE_KEY] as ConcurrencyGate | undefined
  if (!gate) {
    gate = createGate(MAX_CONCURRENT_WATERMARKS)
    store[GATE_KEY] = gate
  }
  return gate
}
