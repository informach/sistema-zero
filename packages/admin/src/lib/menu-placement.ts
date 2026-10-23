import type { CSSProperties } from 'react'

/**
 * Onde um menu suspenso fica na tela, em coordenadas da janela (`position: fixed`). Puro, para
 * os três menus "Mais"/"Ações" da sala da equipe usarem a mesma conta (e o teste conferir).
 */
export interface MenuPlacement {
  /** Um dos dois: `top` quando abre para baixo do gatilho, `bottom` quando abre para cima. */
  top?: number
  bottom?: number
  left: number
  /** Altura máxima que cabe do lado escolhido; o resto rola dentro do menu. */
  maxHeight: number
  /** Largura máxima que cabe entre as duas margens da janela. */
  maxWidth: number
}

export interface PlaceMenuInput {
  trigger: { top: number; bottom: number; left: number; right: number }
  menu: { width: number; height: number }
  viewport: { width: number; height: number }
  /** `end`: a borda direita do menu acompanha a do gatilho; `start`: a esquerda. */
  align?: 'start' | 'end'
}

/** Espaço entre o gatilho e o menu. */
export const MENU_GAP = 4
/** Distância mínima entre o menu e cada borda da janela. */
export const VIEWPORT_MARGIN = 8

/**
 * Abre para baixo do gatilho quando o menu cabe ali; senão, para cima, se em cima houver mais
 * espaço. Na horizontal, segue o alinhamento pedido, mas nunca passa das margens de 8px de
 * nenhum dos dois lados (no celular, um gatilho perto da borda empurra o menu para dentro).
 */
export function placeMenu({
  trigger,
  menu,
  viewport,
  align = 'end',
}: PlaceMenuInput): MenuPlacement {
  const maxWidth = Math.max(viewport.width - 2 * VIEWPORT_MARGIN, 0)
  const width = Math.min(menu.width, maxWidth)
  const wanted = align === 'end' ? trigger.right - width : trigger.left
  const left = Math.min(
    Math.max(wanted, VIEWPORT_MARGIN),
    Math.max(viewport.width - VIEWPORT_MARGIN - width, VIEWPORT_MARGIN),
  )

  const below = viewport.height - trigger.bottom - MENU_GAP - VIEWPORT_MARGIN
  const above = trigger.top - MENU_GAP - VIEWPORT_MARGIN
  if (menu.height > below && above > below) {
    return {
      bottom: viewport.height - trigger.top + MENU_GAP,
      left,
      maxHeight: above,
      maxWidth,
    }
  }
  return { top: trigger.bottom + MENU_GAP, left, maxHeight: Math.max(below, 0), maxWidth }
}

/** O gatilho saiu da janela (em qualquer direção): o menu preso a ele deve fechar. */
export function triggerOutOfView(
  trigger: { top: number; bottom: number; left: number; right: number },
  viewport: { width: number; height: number },
): boolean {
  return (
    trigger.bottom < 0 ||
    trigger.top > viewport.height ||
    trigger.right < 0 ||
    trigger.left > viewport.width
  )
}

/** Atalho para os componentes: mede o gatilho e a janela de agora. */
export function placeMenuFrom(
  trigger: Element,
  menu: { width: number; height: number },
  align: 'start' | 'end' = 'end',
): MenuPlacement {
  return placeMenu({
    trigger: trigger.getBoundingClientRect(),
    menu,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    align,
  })
}

/** O estilo `position: fixed` que corresponde a uma posição calculada. */
export function menuPlacementStyle(place: MenuPlacement): CSSProperties {
  return {
    top: place.top,
    bottom: place.bottom,
    left: place.left,
    maxHeight: place.maxHeight,
    maxWidth: place.maxWidth,
  }
}
