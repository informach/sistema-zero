import type { LiveCursorTarget } from '@sistemazero/core/live'

export function cursorAnchor(root: HTMLElement, element: Element | null) {
  const anchor = element?.closest('[data-live-target], .blocklyBlockCanvas g[data-id]')
  if (!anchor || !root.contains(anchor) || anchor.closest('.blocklyFlyout')) return null
  const control = anchor.getAttribute('data-live-target')
  const target: LiveCursorTarget = {
    kind: control ? 'control' : 'block',
    id: control ?? anchor.getAttribute('data-id')!,
  }
  return { target, rect: anchor.getBoundingClientRect() }
}

/** Resolve the actual control/block on this screen, never another viewport's coordinates. */
export function cursorPosition(root: HTMLElement, target: LiveCursorTarget, x: number, y: number) {
  if (target.kind === 'code') return null // Code positions come from this Studio's Monaco instance.
  const attribute = target.kind === 'control' ? 'data-live-target' : 'data-id'
  const selector =
    target.kind === 'control' ? '[data-live-target]' : '.blocklyBlockCanvas g[data-id]'
  const element = [...root.querySelectorAll(selector)].find(
    (item) => item.getAttribute(attribute) === target.id,
  )
  if (!element || element.closest('.blocklyFlyout')) return null
  const rect = element.getBoundingClientRect(),
    container = root.getBoundingClientRect()
  if (!rect.width || !rect.height) return null
  const left = rect.left + rect.width * x,
    top = rect.top + rect.height * y
  // Ancestor overflow and SVG viewport can hide a block even while its own rect is nonzero.
  let ancestor: Element | null = element
  while (ancestor && root.contains(ancestor)) {
    const style = getComputedStyle(ancestor)
    if (
      ancestor === root ||
      /hidden|clip|scroll|auto/.test(`${style.overflow} ${style.overflowX} ${style.overflowY}`)
    ) {
      const clip = ancestor.getBoundingClientRect()
      if (left < clip.left || left > clip.right || top < clip.top || top > clip.bottom) return null
    }
    ancestor = ancestor.parentElement
  }
  return { left: left - container.left, top: top - container.top }
}
