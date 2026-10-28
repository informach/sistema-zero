import { atualizarEntrada, type Controle, soltarEntrada } from './controle'

/**
 * O controle físico (Gamepad API do navegador), no mesmo `Controle` do teclado e do toque: a ação
 * não sabe de onde veio. Mapeamento "padrão" (`mapping: 'standard'`) dos controles de console:
 * analógico esquerdo anda (empurrado até o fim, corre), direito gira a câmera; botão de baixo pula,
 * o da direita usa, gatilho direito ou ombro direito correm, clique no analógico direito
 * recentraliza a câmera, Start abre o menu.
 */

/** Abaixo disto o analógico conta como solto (o desgaste deixa ele um pouco fora do centro). */
export const ZONA_MORTA = 0.15

export const BOTOES = {
  pular: 0,
  usar: 1,
  ombroDireito: 5,
  gatilhoDireito: 7,
  menu: 9,
  recentrar: 11,
} as const

/** O analógico (x, y) com a zona morta em volta do centro e o resto reescalado para 0..1. */
export function semZonaMorta(x: number, y: number, zona = ZONA_MORTA): { x: number; y: number } {
  const t = Math.hypot(x, y)
  if (t <= zona) return { x: 0, y: 0 }
  const util = Math.min(1, (t - zona) / (1 - zona))
  return { x: (x / t) * util, y: (y / t) * util }
}

export interface LeituraDoGamepad {
  axes: readonly number[]
  buttons: readonly { pressed: boolean; value: number }[]
}

/** O que o controle pede agora (sem memória: os toques de botão saem da comparação com antes). */
export interface PedidoDoGamepad {
  andarX: number
  andarZ: number
  cameraX: number
  cameraY: number
  correr: boolean
  pular: boolean
  usar: boolean
  recentrar: boolean
  menu: boolean
}

export function lerPedido(p: LeituraDoGamepad): PedidoDoGamepad {
  const apertado = (i: number) => Boolean(p.buttons[i]?.pressed)
  const andar = semZonaMorta(p.axes[0] ?? 0, p.axes[1] ?? 0)
  const camera = semZonaMorta(p.axes[2] ?? 0, p.axes[3] ?? 0)
  return {
    andarX: andar.x,
    // Para cima no analógico é y negativo; no jogo, frente é z positivo.
    andarZ: -andar.y,
    cameraX: camera.x,
    cameraY: camera.y,
    correr:
      apertado(BOTOES.gatilhoDireito) ||
      apertado(BOTOES.ombroDireito) ||
      Math.hypot(andar.x, andar.y) > 0.95,
    pular: apertado(BOTOES.pular),
    usar: apertado(BOTOES.usar),
    recentrar: apertado(BOTOES.recentrar),
    menu: apertado(BOTOES.menu),
  }
}

/**
 * Aplica o pedido ao controle, comparando com o anterior: toques contam uma vez (pular, usar,
 * recentrar, menu). O canal do gamepad não apaga teclas nem toques ainda pressionados.
 */
export function aplicarPedido(
  c: Controle,
  agora: PedidoDoGamepad,
  antes: PedidoDoGamepad | null,
  abrirMenu: () => void,
): void {
  atualizarEntrada(c, 'gamepad', {
    eixoX: agora.andarX,
    eixoZ: agora.andarZ,
    correr: agora.correr,
    pular: agora.pular,
  })
  c.cameraX = agora.cameraX
  c.cameraY = agora.cameraY
  if (agora.pular && !antes?.pular) c.pulos++
  if (agora.usar && !antes?.usar) c.usar++
  if (agora.recentrar && !antes?.recentrar) c.recentrar++
  if (agora.menu && !antes?.menu) abrirMenu()
}

/**
 * Lê o primeiro controle conectado a cada quadro do navegador. Devolve a função que desliga. Sem
 * Gamepad API (ou sem controle), não faz nada.
 */
export function ligarGamepad(c: Controle, abrirMenu: () => void): () => void {
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
    return () => {}
  }
  let antes: PedidoDoGamepad | null = null
  let quadro = 0
  let focado = true
  const soltar = () => {
    soltarEntrada(c, 'gamepad')
    c.cameraX = 0
    c.cameraY = 0
    antes = null
  }
  const perderFoco = () => {
    focado = false
    soltar()
  }
  const ganharFoco = () => {
    focado = true
  }
  const ler = () => {
    quadro = requestAnimationFrame(ler)
    if (!focado) return
    const pad = [...navigator.getGamepads()].find((g) => g?.connected)
    if (!pad) {
      if (antes) {
        // Desconectou no meio: solta tudo o que ele segurava.
        aplicarPedido(c, lerPedido({ axes: [], buttons: [] }), antes, abrirMenu)
        antes = null
      }
      return
    }
    const agora = lerPedido(pad)
    aplicarPedido(c, agora, antes, abrirMenu)
    antes = agora
  }
  quadro = requestAnimationFrame(ler)
  window.addEventListener('blur', perderFoco)
  window.addEventListener('focus', ganharFoco)
  return () => {
    cancelAnimationFrame(quadro)
    window.removeEventListener('blur', perderFoco)
    window.removeEventListener('focus', ganharFoco)
    soltar()
  }
}
