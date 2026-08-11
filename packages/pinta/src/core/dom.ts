/**
 * Guards compartilhados pelos atalhos globais do editor. `closest` também
 * cobre eventos cujo alvo é um ícone/filho dentro do controle.
 */
function targetElement(target: EventTarget | null): Element | null {
  if (target instanceof Element) return target
  return target instanceof Node ? target.parentElement : null
}

export function isTextEntryTarget(target: EventTarget | null): boolean {
  return Boolean(
    targetElement(target)?.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
    ),
  )
}

export function isInteractiveControlTarget(target: EventTarget | null): boolean {
  if (isTextEntryTarget(target)) return true
  return Boolean(targetElement(target)?.closest('button, a[href], summary, [role="button"]'))
}
