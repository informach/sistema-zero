/**
 * A geometria do vídeo flutuante da aula (03/10/2026): onde ele mora, de que tamanho, e o que
 * fica guardado por perfil. Pura de propósito — o componente só mede a janela e liga os gestos.
 *
 * O vídeo flutua num CANTO da janela, nunca solto no meio: ao soltar o arrasto ele encaixa no
 * canto mais perto. Canto é o que a criança lembra ("o vídeo fica lá em cima"), e um par de
 * números soltos não sobreviveria a uma janela de outro tamanho.
 */

export type FloatCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export type FloatGeometry = { corner: FloatCorner; width: number }

export type FloatViewport = {
  width: number
  height: number
  /** Onde os cantos de CIMA começam (abaixo da saída da tela ampliada). */
  topInset?: number
  /**
   * A tela ampliada é um EDITOR (Estúdio, Pinta): logo abaixo da saída começa a barra de
   * ferramentas dele (⋯, Compartilhar, desfazer), então quem ainda não escolheu nasce embaixo.
   */
  prefersBottom?: boolean
}

export type FloatRect = { left: number; top: number; width: number; height: number }

const CORNERS: readonly FloatCorner[] = ['top-left', 'top-right', 'bottom-right', 'bottom-left']

/** Respiro entre o vídeo e a borda da janela. */
export const FLOAT_MARGIN = 16

/**
 * Os cantos de CIMA começam abaixo da SAÍDA da tela ampliada: é lá que mora o "Voltar à aula"
 * (e o "Reduzir" do Estúdio e do Pinta), e o vídeo não pode cobri-la. O componente mede o botão
 * (`topInsetBelow`); este número é só a reserva para quando não há o que medir.
 */
export const FLOAT_TOP_INSET = 76

/** Respiro entre a saída da tela ampliada e o vídeo. */
const BELOW_EXIT = 12

/** O topo dos cantos de cima, a partir de onde termina o botão de sair (medido na tela). */
export function topInsetBelow(exitBottom: number | null): number {
  if (exitBottom === null || !Number.isFinite(exitBottom)) return FLOAT_TOP_INSET
  return Math.max(FLOAT_MARGIN, Math.round(exitBottom + BELOW_EXIT))
}

/** A barra de título do flutuante (alça de arrastar + botões de 44px). */
export const FLOAT_BAR_HEIGHT = 44

/** O passo do teclado na alça de tamanho. */
export const FLOAT_RESIZE_STEP = 24

export const FLOAT_DEFAULT: FloatGeometry = { corner: 'top-right', width: 320 }

/**
 * O lugar de quem ainda não escolheu. No computador, em cima à direita, logo abaixo da saída (o
 * "ali em cima" da dona). No celular a atividade ocupa o alto da tela e sobra espaço embaixo: o
 * vídeo nasce lá, menor, para não cobrir o jogo. No Estúdio e no Pinta, embaixo à direita: em
 * cima está a barra de ferramentas do editor (full review de 03/10/2026).
 */
export function defaultFloatGeometry(viewportWidth: number, prefersBottom = false): FloatGeometry {
  if (viewportWidth < 640) return { corner: 'bottom-right', width: 176 }
  return prefersBottom ? { corner: 'bottom-right', width: FLOAT_DEFAULT.width } : FLOAT_DEFAULT
}

/** Celular é o que tem menos de 640px de janela: lá o vídeo pode ficar menor. */
export function floatWidthLimits(viewportWidth: number): { min: number; max: number } {
  const min = viewportWidth < 640 ? 160 : 200
  // Nunca mais que a metade e pouco da janela: a atividade é o que a criança está fazendo.
  const max = Math.max(min, Math.min(560, Math.floor(viewportWidth * 0.55)))
  return { min, max }
}

export function clampFloatWidth(width: number, viewportWidth: number): number {
  const { min, max } = floatWidthLimits(viewportWidth)
  if (!Number.isFinite(width)) return Math.min(max, Math.max(min, FLOAT_DEFAULT.width))
  return Math.round(Math.min(max, Math.max(min, width)))
}

/** O vídeo é 16:9; a barra vai em cima. */
export function floatHeight(width: number): number {
  return Math.round((width * 9) / 16) + FLOAT_BAR_HEIGHT
}

/**
 * Onde o vídeo fica de verdade nesta janela. `corner` pode diferir do pedido: ver abaixo.
 *
 * ⚠️⚠️ A SAÍDA da tela ampliada nunca fica coberta, nem em janela baixa (celular deitado, 340px
 * úteis no Safari; achado do full review de 03/10/2026). Num canto de cima que não cabe abaixo
 * da saída, o vídeo ENCOLHE até caber; se nem o tamanho mínimo cabe, ele desce para o canto de
 * baixo do mesmo lado. Antes, a régua "não sair da tela" vencia e o empurrava por cima da saída.
 */
export function floatRect(
  geometry: FloatGeometry,
  viewport: FloatViewport,
): FloatRect & { corner: FloatCorner } {
  let width = clampFloatWidth(geometry.width, viewport.width)
  let corner = geometry.corner
  if (corner.startsWith('top')) {
    const room = viewport.height - (viewport.topInset ?? FLOAT_TOP_INSET) - FLOAT_MARGIN
    if (floatHeight(width) > room) {
      const fit = Math.floor(((room - FLOAT_BAR_HEIGHT) * 16) / 9)
      if (fit >= floatWidthLimits(viewport.width).min) width = fit
      else corner = corner.endsWith('left') ? 'bottom-left' : 'bottom-right'
    }
  }
  const height = floatHeight(width)
  const left = corner.endsWith('left')
    ? FLOAT_MARGIN
    : Math.max(FLOAT_MARGIN, viewport.width - width - FLOAT_MARGIN)
  const wanted = corner.startsWith('top')
    ? (viewport.topInset ?? FLOAT_TOP_INSET)
    : viewport.height - height - FLOAT_MARGIN
  // O vídeo nunca sai por cima nem por baixo da janela.
  const top = Math.max(FLOAT_MARGIN, Math.min(wanted, viewport.height - height - FLOAT_MARGIN))
  return { left, top, width, height, corner }
}

/** Onde o vídeo encaixa ao soltar: o canto do quadrante em que o CENTRO dele parou. */
export function nearestCorner(
  center: { x: number; y: number },
  viewport: FloatViewport,
): FloatCorner {
  const vertical = center.y < viewport.height / 2 ? 'top' : 'bottom'
  const horizontal = center.x < viewport.width / 2 ? 'left' : 'right'
  return `${vertical}-${horizontal}`
}

/** As setas na alça de mover: andam um canto na direção pedida (na borda, ficam). */
export function moveCorner(
  corner: FloatCorner,
  direction: 'left' | 'right' | 'up' | 'down',
): FloatCorner {
  const [vertical, horizontal] = corner.split('-') as ['top' | 'bottom', 'left' | 'right']
  if (direction === 'left') return `${vertical}-left`
  if (direction === 'right') return `${vertical}-right`
  if (direction === 'up') return `top-${horizontal}`
  return `bottom-${horizontal}`
}

/** Enter/Espaço na alça de mover: o próximo canto, no sentido do relógio. */
export function nextCorner(corner: FloatCorner): FloatCorner {
  return CORNERS[(CORNERS.indexOf(corner) + 1) % CORNERS.length] ?? FLOAT_DEFAULT.corner
}

/**
 * A alça de tamanho mora no canto de BAIXO voltado para o MEIO da tela, e o canto ancorado não
 * se mexe: num vídeo à direita, puxar a alça para a esquerda AUMENTA.
 */
export function resizedWidth(corner: FloatCorner, startWidth: number, deltaX: number): number {
  return corner.endsWith('right') ? startWidth - deltaX : startWidth + deltaX
}

/** O lado da alça de tamanho (o contrário do lado em que o vídeo encosta). */
export function gripSide(corner: FloatCorner): 'left' | 'right' {
  return corner.endsWith('right') ? 'left' : 'right'
}

export function floatStorageKey(viewerId: string | null): string | null {
  return viewerId ? `sz:lesson-video-float:v1:${viewerId}` : null
}

/** O guardado é do navegador: qualquer coisa torta volta ao padrão, nunca quebra a aula. */
export function readFloatGeometry(
  raw: string | null,
  fallback: FloatGeometry = FLOAT_DEFAULT,
): FloatGeometry {
  if (!raw) return fallback
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return fallback
    const corner = 'corner' in value ? value.corner : undefined
    const width = 'width' in value ? value.width : undefined
    return {
      corner: CORNERS.includes(corner as FloatCorner) ? (corner as FloatCorner) : fallback.corner,
      width: typeof width === 'number' && Number.isFinite(width) ? width : fallback.width,
    }
  } catch {
    return fallback
  }
}

export function serializeFloatGeometry(geometry: FloatGeometry): string {
  return JSON.stringify({ corner: geometry.corner, width: Math.round(geometry.width) })
}
