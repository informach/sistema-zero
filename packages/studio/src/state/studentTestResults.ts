import { createStore, type StoreApi } from 'zustand/vanilla'
import type { StudentTestOutcome } from '../studentTests/runner'

/**
 * Os resultados da última rodada da aba "Meus testes", por instância do Estúdio (no molde da
 * janela de medidas do Desempenho, `devtools.ts`): trocar de aba e voltar não apaga o que a
 * criança acabou de ver. Os resultados são do projeto que rodou (`projectId`); outro projeto
 * aberto na mesma instância começa sem resultado. Não vão para o projeto: rodar não muda nada.
 */
export interface StudentTestResults {
  projectId: string | null
  outcomes: Readonly<Record<string, StudentTestOutcome>>
  /** A rodada em andamento: qual teste está rodando, de quantos. */
  running: { current: number; total: number } | null
}

const results = new WeakMap<object, StoreApi<StudentTestResults>>()

export function studentTestResultsFor(instance: object): StoreApi<StudentTestResults> {
  let store = results.get(instance)
  if (!store) {
    store = createStore<StudentTestResults>(() => ({
      projectId: null,
      outcomes: {},
      running: null,
    }))
    results.set(instance, store)
  }
  return store
}
