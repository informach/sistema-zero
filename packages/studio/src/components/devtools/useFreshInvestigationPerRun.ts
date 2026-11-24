import { useEffect, useRef } from 'react'

/**
 * Cada execução do Python começa com a janela do Investigar limpa (revisão do lote 5, 21/11/2026).
 * Sem isso, o erro da execução anterior ficava preso (a janela guarda o PRIMEIRO erro) e a aba e o
 * Zappy continuavam dizendo que o programa parou com erro depois do conserto. A ponte do
 * JavaScript limpa a cada documento novo; no Python, a execução nova é o `runId`. O módulo das
 * janelas entra sob demanda, como no resto da prévia.
 */
export function useFreshInvestigationPerRun(
  ui: object,
  investigating: boolean,
  runId: string | null,
): void {
  const clearedRun = useRef<string | null>(null)
  useEffect(() => {
    if (!investigating || runId === null || clearedRun.current === runId) return
    clearedRun.current = runId
    void import('../../state/devtools').then(({ investigationWindowFor }) =>
      investigationWindowFor(ui).getState().clear(),
    )
  }, [investigating, runId, ui])
}
