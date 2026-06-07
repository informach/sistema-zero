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
 * O estado vive em `globalThis` (Symbol.for) — mesma lição do single-flight do
 * refresh: o Turbopack pode duplicar o módulo por bundle (proxy/RSC/handlers);
 * um contador de módulo daria um teto POR CÓPIA, não por processo.
 */

export interface ConcurrencyGate {
  run<T>(fn: () => Promise<T>): Promise<T>
}

/** Gate FIFO puro (testável): no máximo `maxConcurrent` execuções simultâneas. */
export function createGate(maxConcurrent: number): ConcurrencyGate {
  let active = 0
  const queue: Array<() => void> = []
  return {
    async run<T>(fn: () => Promise<T>): Promise<T> {
      // Re-checa após acordar: entre o release e o microtask deste waiter, um
      // chamador novo pode ter tomado a vaga — o teto é o invariante, não a ordem.
      while (active >= maxConcurrent) {
        await new Promise<void>((resolve) => queue.push(resolve))
      }
      active++
      try {
        return await fn()
      } finally {
        active--
        queue.shift()?.()
      }
    },
  }
}

/**
 * 1 × 200MB × fator interno das libs (pdf-lib reescreve o doc ~2-3×) ≈ ~600MB de
 * pico. Era 2 quando o teto era 50MB (~300MB); ao subir o teto p/ 200MB,
 * baixamos p/ 1 para o pico não dobrar de novo (OOM = crash, não erro tratável).
 * Se a RAM do serviço community for elevada (≥2GB) no Railway, dá p/ voltar a 2.
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
