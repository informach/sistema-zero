/**
 * A geometria do vídeo flutuante da aula (03/10/2026): onde ele mora, de que tamanho, e o que
 * fica guardado por perfil. Pura de propósito — o componente só mede a janela e liga os gestos.
 *
 * O vídeo flutua num CANTO da janela, nunca solto no meio: ao soltar o arrasto ele encaixa no
 * canto mais perto. Canto é o que a criança lembra ("o vídeo fica lá em cima"), e um par de
 * números soltos não sobreviveria a uma janela de outro tamanho.
 */

export type FloatCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

/**
 * O tamanho é um DEGRAU, não um número (03/10/2026, decisão da dona). A alça de arrastar parava
 * em 560px, um terço de uma tela de computador, e a criança puxava, o vídeo não crescia mais e
 * parecia quebrado. Três degraus com − e + dizem o que acontece a cada toque, e o maior é de
 * verdade grande.
 */
export type FloatSize = 'small' | 'medium' | 'large'

export const FLOAT_SIZES: readonly FloatSize[] = ['small', 'medium', 'large']

export type FloatGeometry = { corner: FloatCorner; size: FloatSize }

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

/**
 * A moldura em volta do vídeo, dos lados e embaixo (em cima é a barra). É ESTRUTURA, não só
 * pele: entra na conta da altura, senão o vídeo no canto de baixo passaria da borda da janela.
 * O componente a desenha com `px-1.5 pb-1.5` (6px); mexeu num, mexa no outro.
 */
export const FLOAT_FRAME = 6

export const FLOAT_DEFAULT: FloatGeometry = { corner: 'top-right', size: 'small' }

/** Celular é o que tem menos de 640px de janela: lá os degraus são menores. */
const PHONE_MAX = 640

/** Pequeno e médio são números fixos; o grande é o quanto a janela deixa. */
const FIXED_WIDTH: Record<'small' | 'medium', { phone: number; desktop: number }> = {
  small: { phone: 176, desktop: 300 },
  medium: { phone: 260, desktop: 480 },
}

/** O grande ocupa até 2/3 da largura: a atividade continua aparecendo do lado. */
const LARGE_SHARE = 0.66

/**
 * Dois degraus mais perto que isto viram um só: numa janela pequena o grande quase não passa do
 * médio, e um + que cresce 10px é o mesmo "não funciona" da alça antiga.
 */
const MIN_STEP = 48

/**
 * O lugar de quem ainda não escolheu. No computador, em cima à direita, logo abaixo da saída (o
 * "ali em cima" da dona). No celular a atividade ocupa o alto da tela e sobra espaço embaixo: o
 * vídeo nasce lá, para não cobrir o jogo. No Estúdio e no Pinta, embaixo à direita: em cima está
 * a barra de ferramentas do editor (full review de 03/10/2026). Sempre no degrau pequeno.
 */
export function defaultFloatGeometry(viewportWidth: number, prefersBottom = false): FloatGeometry {
  if (viewportWidth < PHONE_MAX || prefersBottom) return { corner: 'bottom-right', size: 'small' }
  return FLOAT_DEFAULT
}

/** O menor vídeo que ainda dá para assistir. */
export function floatMinWidth(viewportWidth: number): number {
  return viewportWidth < PHONE_MAX ? 160 : 200
}

/** O vídeo é 16:9 dentro da moldura; a barra vai em cima. */
export function floatHeight(width: number): number {
  return Math.round(((width - 2 * FLOAT_FRAME) * 9) / 16) + FLOAT_BAR_HEIGHT + FLOAT_FRAME
}

/** A maior largura cuja altura cabe em `height`. */
function widthForHeight(height: number): number {
  return Math.floor(((height - FLOAT_BAR_HEIGHT - FLOAT_FRAME) * 16) / 9) + 2 * FLOAT_FRAME
}

/**
 * O maior vídeo desta janela: até 2/3 da largura (no celular, a largura toda menos o respiro) e,
 * na altura, o que cabe entre a SAÍDA da tela ampliada e o pé — em qualquer canto, porque um vídeo
 * grande no canto de baixo também subiria até o "Voltar à aula".
 */
export function floatMaxWidth(viewport: FloatViewport): number {
  const byWidth =
    viewport.width < PHONE_MAX
      ? viewport.width - 2 * FLOAT_MARGIN
      : Math.floor(viewport.width * LARGE_SHARE)
  const room = viewport.height - (viewport.topInset ?? FLOAT_TOP_INSET) - FLOAT_MARGIN
  return Math.max(floatMinWidth(viewport.width), Math.min(byWidth, widthForHeight(room)))
}

export type FloatStep = { size: FloatSize; width: number }

/** Os degraus que existem NESTA janela, do menor ao maior (os que ficariam iguais viram um). */
export function floatSizeSteps(viewport: FloatViewport): FloatStep[] {
  const max = floatMaxWidth(viewport)
  const device = viewport.width < PHONE_MAX ? 'phone' : 'desktop'
  const wanted: FloatStep[] = [
    { size: 'small', width: Math.min(max, FIXED_WIDTH.small[device]) },
    { size: 'medium', width: Math.min(max, FIXED_WIDTH.medium[device]) },
    { size: 'large', width: max },
  ]
  const steps: FloatStep[] = []
  for (const step of wanted) {
    const last = steps.at(-1)
    if (!last || step.width - last.width >= MIN_STEP) steps.push(step)
  }
  return steps
}

/**
 * O degrau em que o vídeo está de verdade: o guardado, ou o maior que exista abaixo dele (o
 * "grande" de uma janela pequena pode ter virado o médio).
 */
export function floatStepOf(
  size: FloatSize,
  viewport: FloatViewport,
): { steps: FloatStep[]; index: number } {
  const steps = floatSizeSteps(viewport)
  const wanted = FLOAT_SIZES.indexOf(size)
  let index = 0
  steps.forEach((step, i) => {
    if (FLOAT_SIZES.indexOf(step.size) <= wanted) index = i
  })
  return { steps, index }
}

/** O degrau vizinho (`null` na ponta: o botão daquele lado fica apagado). */
export function resizedFloat(
  size: FloatSize,
  direction: 'grow' | 'shrink',
  viewport: FloatViewport,
): FloatSize | null {
  const { steps, index } = floatStepOf(size, viewport)
  return steps[index + (direction === 'grow' ? 1 : -1)]?.size ?? null
}

/**
 * Onde o vídeo fica de verdade nesta janela. `corner` pode diferir do pedido: ver abaixo.
 *
 * ⚠️⚠️ A SAÍDA da tela ampliada nunca fica coberta, nem em janela baixa (celular deitado, 340px
 * úteis no Safari; achado do full review de 03/10/2026). Todo degrau já cabe abaixo da saída
 * (`floatMaxWidth` olha a altura); se nem o tamanho mínimo cabe, ele desce para o canto de baixo
 * do mesmo lado. Antes, a régua "não sair da tela" vencia e o empurrava por cima da saída.
 */
export function floatRect(
  geometry: FloatGeometry,
  viewport: FloatViewport,
): FloatRect & { corner: FloatCorner } {
  const { steps, index } = floatStepOf(geometry.size, viewport)
  const width = steps[index]?.width ?? floatMinWidth(viewport.width)
  let corner = geometry.corner
  // O degrau já cabe abaixo da saída (`floatMaxWidth`); só a janela baixa demais para o MÍNIMO
  // passa daqui, e aí o vídeo desce para o canto de baixo do mesmo lado.
  if (corner.startsWith('top')) {
    const room = viewport.height - (viewport.topInset ?? FLOAT_TOP_INSET) - FLOAT_MARGIN
    if (floatHeight(width) > room) corner = corner.endsWith('left') ? 'bottom-left' : 'bottom-right'
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
 * ⚠️ `v2` desde os degraus (03/10/2026): o `v1` guardava uma largura em pixels, e lê-la como
 * degrau seria inventar uma conversão para uma escolha que a criança fez com outra ferramenta.
 */
export function floatStorageKey(viewerId: string | null): string | null {
  return viewerId ? `sz:lesson-video-float:v2:${viewerId}` : null
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
    const size = 'size' in value ? value.size : undefined
    return {
      corner: CORNERS.includes(corner as FloatCorner) ? (corner as FloatCorner) : fallback.corner,
      size: FLOAT_SIZES.includes(size as FloatSize) ? (size as FloatSize) : fallback.size,
    }
  } catch {
    return fallback
  }
}

export function serializeFloatGeometry(geometry: FloatGeometry): string {
  return JSON.stringify({ corner: geometry.corner, size: geometry.size })
}
