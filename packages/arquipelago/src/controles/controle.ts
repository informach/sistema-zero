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
  descer: boolean
  /** Conta os pedidos de "usar" (o personagem compara com o último que atendeu). */
  usar: number
  /**
   * Conta os toques de pular: soltar o cipó e pular do tronco atendem cada toque, até o que desce
   * e sobe dentro do mesmo quadro (`pular` sozinho perderia esse).
   */
  pulos: number
  /** -1 a 1: girar e inclinar a câmera (analógico direito do controle físico). */
  cameraX: number
  cameraY: number
  /** Conta os pedidos de pôr a câmera nas costas (tecla C, clique no analógico direito). */
  recentrar: number
}

export function criarControle(): Controle {
  return {
    eixoX: 0,
    eixoZ: 0,
    correr: false,
    pular: false,
    descer: false,
    usar: 0,
    pulos: 0,
    cameraX: 0,
    cameraY: 0,
    recentrar: 0,
  }
}

type Fonte = 'teclado' | 'toque' | 'gamepad'
type Entrada = Pick<Controle, 'eixoX' | 'eixoZ' | 'correr' | 'pular' | 'descer'>
interface Canal extends Entrada {
  ordem: number
}
const canais = new WeakMap<Controle, Map<Fonte, Canal>>()

/**
 * Cada dispositivo conserva seus botões. O último a mudar a direção assume o movimento;
 * ao soltá-lo, volta o dispositivo que ainda estiver pressionado. Ler o gamepad a cada quadro
 * não o torna uma entrada nova e não apaga uma tecla ou um toque ainda ativos.
 */
export function atualizarEntrada(c: Controle, fonte: Fonte, parte: Partial<Entrada>): void {
  let fontes = canais.get(c)
  if (!fontes) {
    fontes = new Map()
    canais.set(c, fontes)
  }
  const antes = fontes.get(fonte) ?? {
    eixoX: 0,
    eixoZ: 0,
    correr: false,
    pular: false,
    descer: false,
    ordem: 0,
  }
  const proxima = { ...antes, ...parte }
  if (
    fontes.has(fonte) &&
    proxima.eixoX === antes.eixoX &&
    proxima.eixoZ === antes.eixoZ &&
    proxima.correr === antes.correr &&
    proxima.pular === antes.pular &&
    proxima.descer === antes.descer
  )
    return
  if (proxima.eixoX !== antes.eixoX || proxima.eixoZ !== antes.eixoZ) {
    for (const canal of fontes.values()) proxima.ordem = Math.max(proxima.ordem, canal.ordem)
    proxima.ordem++
  }
  fontes.set(fonte, proxima)
  let direcao: Canal | undefined
  let correr = false
  let pular = false
  let descer = false
  for (const canal of fontes.values()) {
    if ((canal.eixoX !== 0 || canal.eixoZ !== 0) && (!direcao || canal.ordem > direcao.ordem))
      direcao = canal
    correr ||= canal.correr
    pular ||= canal.pular
    descer ||= canal.descer
  }
  c.eixoX = direcao?.eixoX ?? 0
  c.eixoZ = direcao?.eixoZ ?? 0
  c.correr = correr
  c.pular = pular
  c.descer = descer
}

export function soltarEntrada(c: Controle, fonte: Fonte): void {
  atualizarEntrada(c, fonte, { eixoX: 0, eixoZ: 0, correr: false, pular: false, descer: false })
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
    atualizarEntrada(c, 'teclado', {
      eixoZ: (tem(FRENTE) ? 1 : 0) - (tem(TRAS) ? 1 : 0),
      eixoX: (tem(DIREITA) ? 1 : 0) - (tem(ESQUERDA) ? 1 : 0),
      correr: apertadas.has('ShiftLeft') || apertadas.has('ShiftRight'),
      pular: apertadas.has('Space'),
      descer: apertadas.has('KeyQ'),
    })
  }
  const desce = (e: KeyboardEvent) => {
    if (digitando(e.target)) return
    if (e.code === 'KeyE' && !e.repeat) c.usar++
    if (e.code === 'Space' && !e.repeat) c.pulos++
    if (e.code === 'KeyC' && !e.repeat) c.recentrar++
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
    perdeuFoco()
  }
}
