/**
 * Agenda trabalho de baixa prioridade para quando o navegador estiver ocioso,
 * sem competir com o render inicial. Usa `requestIdleCallback` quando existe
 * (com `timeout` para garantir execução) e cai para `setTimeout` no Safari/iOS.
 * Devolve uma função de cancelamento.
 */
export function scheduleIdle(task: () => void, timeout = 2000): () => void {
  if (typeof window === 'undefined') return () => {}
  const ric = (window as unknown as { requestIdleCallback?: typeof requestIdleCallback })
    .requestIdleCallback
  if (typeof ric === 'function') {
    const handle = ric(() => task(), { timeout })
    const cancel = (window as unknown as { cancelIdleCallback?: (h: number) => void })
      .cancelIdleCallback
    return () => cancel?.(handle as unknown as number)
  }
  // Sem requestIdleCallback não existe sinal real de ociosidade; usar o
  // timeout como adiamento conservador evita competir com interações críticas.
  const id = window.setTimeout(task, timeout)
  return () => window.clearTimeout(id)
}
