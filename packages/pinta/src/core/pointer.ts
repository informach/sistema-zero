/**
 * `setPointerCapture` LANÇA (NotFoundError) se o ponteiro já não está ativo —
 * acontece com tap ultrarrápido (solta antes do handler rodar) e com eventos
 * sintéticos de teste. Perder o capture é degradação aceitável; quebrar o
 * gesto inteiro não.
 */
export function safeSetPointerCapture(element: Element, pointerId: number): boolean {
  try {
    if (typeof element.setPointerCapture !== 'function') return false
    element.setPointerCapture(pointerId)
    return true
  } catch {
    // Sem capture o gesto ainda funciona enquanto o ponteiro estiver sobre o alvo;
    // quem chama pode instalar os listeners no `document` para o solto FORA dele.
    return false
  }
}
