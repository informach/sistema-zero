import type { PythonGraphicsReply } from './protocol'

/**
 * Pausar e Avançar 1 quadro no Python (aba Investigar, proposta aprovada em 20/11/2026: "no
 * Python, o Estúdio segura a resposta do próximo quadro; o programa da criança não muda").
 *
 * O quadro pausa NA TROCA DE QUADRO: com a pausa pedida, a resposta do próximo quadro pintado leva
 * `hold: true`, e a ponte do Python (o `present` do Pygame Zero, do pygame-ce e da Raylib, e a
 * troca do Turtle) fica num laço de pedidos curtos (`PYTHON_HOLD_REQUEST`) que este quadro só
 * responde quando:
 * - chega uma leitura dos valores (a sonda das missões): responde `hold: true`, a ponte roda o
 *   ponto de checagem (que responde a sonda) e pede de novo; o programa não anda;
 * - a criança continua: responde `hold: false` e o programa segue;
 * - a criança avança 1 quadro: responde `hold: false` e segura de novo no quadro seguinte.
 *
 * O Turtle só pinta quando o desenho muda (um desenho pronto, parado no `mainloop`, não pinta
 * mais nada): nele a pausa vale na PRÓXIMA resposta (`anyReply`), e o quadro acorda a espera do
 * Turtle para essa resposta chegar. A ponte dele confere o `hold` em toda troca.
 *
 * Parar encerra o worker inteiro, então uma pausa nunca deixa o executor preso.
 */

/** O pedido curto de quem espera, como a ponte do Python o escreve (`json.dumps`, sem espaços). */
export const PYTHON_HOLD_REQUEST = '{"hold":true}'
const RELEASE = '{"hold":false}'
const AGAIN = '{"hold":true}'

export interface FramePause {
  /** Pedir a pausa (no próximo quadro pintado) ou continuar. */
  set(on: boolean): void
  /** Avançar 1 quadro: só com o programa pausado (devolve se avançou). */
  step(): boolean
  /** Chegou uma leitura com o programa pausado: solta um pedido curto sem continuar. */
  wake(): void
  /**
   * A troca de um pedido gráfico do programa, com a pausa no meio. `anyReply`: a pausa vale na
   * próxima resposta, pintando ou não (o Turtle); sem ele, só na resposta que pintou um quadro.
   */
  exchange(
    request: string,
    real: () => Promise<PythonGraphicsReply>,
    painted: () => number,
    anyReply?: boolean,
  ): Promise<PythonGraphicsReply>
  /** O quadro fechou: solta quem espera. */
  dispose(): void
  readonly held: boolean
}

/** A resposta do quadro com `hold: true` (o resto da resposta continua igual). */
function withHold(reply: PythonGraphicsReply): PythonGraphicsReply {
  const mark = (text: string) => {
    try {
      const value: unknown = JSON.parse(text)
      if (typeof value === 'object' && value !== null && !Array.isArray(value))
        return JSON.stringify({ ...value, hold: true })
    } catch {
      // Uma resposta que não é objeto JSON segue como veio (a ponte só pausa com objeto).
    }
    return text
  }
  return typeof reply === 'string' ? mark(reply) : { text: mark(reply.text), bytes: reply.bytes }
}

export function createFramePause(options: { onHeld(frame: number): void }): FramePause {
  let state: 'off' | 'armed' | 'held' = 'off'
  let waiter: ((reply: string) => void) | null = null
  const release = (reply: string) => {
    const resolve = waiter
    waiter = null
    resolve?.(reply)
  }
  return {
    get held() {
      return state === 'held'
    },
    set(on) {
      if (on) {
        if (state === 'off') state = 'armed'
        return
      }
      state = 'off'
      release(RELEASE)
    },
    step() {
      if (state !== 'held') return false
      state = 'armed'
      release(RELEASE)
      return true
    },
    wake() {
      if (state === 'held') release(AGAIN)
    },
    async exchange(request, real, painted, anyReply = false) {
      if (request === PYTHON_HOLD_REQUEST) {
        if (state !== 'held') return RELEASE
        // Um pedido de cada vez (a ponte espera a resposta antes de pedir de novo).
        release(RELEASE)
        return new Promise<string>((resolve) => {
          waiter = resolve
        })
      }
      const before = painted()
      const reply = await real()
      if (state === 'armed' && (anyReply || painted() > before)) {
        state = 'held'
        options.onHeld(painted())
        return withHold(reply)
      }
      return reply
    },
    dispose() {
      state = 'off'
      release(RELEASE)
    },
  }
}
