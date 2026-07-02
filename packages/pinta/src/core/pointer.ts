/**
 * `setPointerCapture` LANÇA (NotFoundError) se o ponteiro já não está ativo —
 * acontece com tap ultrarrápido (solta antes do handler rodar) e com eventos
 * sintéticos de teste. Perder o capture é degradação aceitável; quebrar o
 * gesto inteiro não.
 */
export function safeSetPointerCapture(element: Element, pointerId: number): void {
  try {
    element.setPointerCapture?.(pointerId)
  } catch {
    // Sem capture o gesto ainda funciona enquanto o ponteiro estiver sobre o alvo.
  }
}
