import { expect, it } from 'bun:test'
import { renderHook, waitFor } from '@testing-library/react'
import { investigationWindowFor } from '../../state/devtools'
import { useFreshInvestigationPerRun } from './useFreshInvestigationPerRun'

// Revisão do lote 5 (21/11/2026): no Python, o erro de uma execução não pode ficar preso na janela
// do Investigar (e no contexto do Zappy) depois que a criança conserta e roda de novo.
const failed = {
  frame: null,
  paused: false,
  canPause: false,
  pauseLater: false,
  values: [{ name: 'vidas', text: '0' }],
  error: { lines: [], trace: [{ file: 'main.py', line: 3 }] },
}

it('cada execução nova começa sem o erro da anterior, e a mesma execução não limpa de novo', async () => {
  const ui = {}
  const window = investigationWindowFor(ui)
  const { rerender } = renderHook(
    ({ runId, investigating }) => useFreshInvestigationPerRun(ui, investigating, runId),
    { initialProps: { runId: 'run-1' as string | null, investigating: true } },
  )
  await waitFor(() => expect(window.getState().ready).toBe(false))
  window.getState().receive(failed)
  expect(window.getState().stopped).not.toBeNull()
  // A mesma execução (por exemplo, o fim dela) não apaga o erro que a aba mostra.
  rerender({ runId: 'run-1', investigating: true })
  await new Promise((resolve) => setTimeout(resolve, 20))
  expect(window.getState().stopped).not.toBeNull()
  // A criança consertou e rodou de novo: a janela recomeça vazia.
  rerender({ runId: 'run-2', investigating: true })
  await waitFor(() => expect(window.getState().stopped).toBeNull())
  expect(window.getState().values).toEqual([])
})

it('com a aba desligada nada é limpo', async () => {
  const ui = {}
  const window = investigationWindowFor(ui)
  window.getState().receive(failed)
  const { rerender } = renderHook(({ runId }) => useFreshInvestigationPerRun(ui, false, runId), {
    initialProps: { runId: 'run-1' },
  })
  rerender({ runId: 'run-2' })
  await new Promise((resolve) => setTimeout(resolve, 20))
  expect(window.getState().stopped).not.toBeNull()
})
