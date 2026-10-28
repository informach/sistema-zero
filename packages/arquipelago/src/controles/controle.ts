/**
 * O que a pessoa está pedindo agora (teclado, toque ou controle). Mutável e lido a cada quadro
 * pelo personagem, fora do React, para não re-renderizar a cena a cada tecla.
 */
export interface Controle {
  /** -1 a 1: esquerda/direita e trás/frente, relativo à câmera. */
  eixoX: number
  eixoZ: number
  correr: boolean
  pular: boolean
  /** Conta os pedidos de "usar" (o personagem compara com o último que atendeu). */
  usar: number
  /**
   * Conta os toques de pular: soltar o cipó e pular do tronco atendem cada toque, até o que desce
   * e sobe dentro do mesmo quadro (`pular` sozinho perderia esse).
   */
  pulos: number
}

export function criarControle(): Controle {
  return { eixoX: 0, eixoZ: 0, correr: false, pular: false, usar: 0, pulos: 0 }
}

const FRENTE = new Set(['KeyW', 'ArrowUp'])
const TRAS = new Set(['KeyS', 'ArrowDown'])
const ESQUERDA = new Set(['KeyA', 'ArrowLeft'])
const DIREITA = new Set(['KeyD', 'ArrowRight'])

function digitando(alvo: EventTarget | null): boolean {
  const el = alvo as HTMLElement | null
  return Boolean(
    el &&
      (el.isContentEditable ||
        el.closest?.('button, a, input, textarea, select, [role=button], [contenteditable=true]')),
  )
}

/** Liga o teclado ao controle. Devolve a função que desliga. */
export function ligarTeclado(c: Controle, alvo: Window = window): () => void {
  const apertadas = new Set<string>()
  const recalcular = () => {
    const tem = (s: Set<string>) => [...s].some((k) => apertadas.has(k))
    c.eixoZ = (tem(FRENTE) ? 1 : 0) - (tem(TRAS) ? 1 : 0)
    c.eixoX = (tem(DIREITA) ? 1 : 0) - (tem(ESQUERDA) ? 1 : 0)
    c.correr = apertadas.has('ShiftLeft') || apertadas.has('ShiftRight')
    c.pular = apertadas.has('Space')
  }
  const desce = (e: KeyboardEvent) => {
    if (digitando(e.target)) return
    if (e.code === 'KeyE' && !e.repeat) c.usar++
    if (e.code === 'Space' && !e.repeat) c.pulos++
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault()
    apertadas.add(e.code)
    recalcular()
  }
  const sobe = (e: KeyboardEvent) => {
    apertadas.delete(e.code)
    recalcular()
  }
  const perdeuFoco = () => {
    apertadas.clear()
    recalcular()
  }
  alvo.addEventListener('keydown', desce)
  alvo.addEventListener('keyup', sobe)
  alvo.addEventListener('blur', perdeuFoco)
  return () => {
    alvo.removeEventListener('keydown', desce)
    alvo.removeEventListener('keyup', sobe)
    alvo.removeEventListener('blur', perdeuFoco)
  }
}
