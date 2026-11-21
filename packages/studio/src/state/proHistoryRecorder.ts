import type { ProjectTree } from '../core/proProject'
import type { ProHistoryTrigger } from './proProjectHistory'

/**
 * Quem guarda as versões do Histórico do projeto para cada instância do Studio (proposta aprovada
 * em 21/11/2026). Só a área de trabalho do Pro registra um (`useProHistory`): fora dela (aula,
 * testes, Admin) nada é guardado e o banco não ganha leitura nenhuma. O ponto comum das aplicações
 * (`applyProDocument`, que serve às operações com arquivos, à mudança do Zappy e às recuperações)
 * chama antes de mudar a árvore, com a árvore de antes.
 */
export type ProHistoryRecorder = (
  tree: ProjectTree,
  trigger: ProHistoryTrigger,
  label?: string,
) => void

const recorders = new WeakMap<object, ProHistoryRecorder>()

export function setProHistoryRecorder(store: object, recorder: ProHistoryRecorder | null): void {
  if (recorder) recorders.set(store, recorder)
  else recorders.delete(store)
}

export function proHistoryRecorder(store: object): ProHistoryRecorder | undefined {
  return recorders.get(store)
}
