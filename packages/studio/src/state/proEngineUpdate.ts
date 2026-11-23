import { javaScriptProject } from '../core/editableProject'
import type { ProjectTree } from '../core/proProject'
import type { ProEngineInventory } from '../modes/pro/proEngineCopies'
import { proHistoryRecorder } from './proHistoryRecorder'
import { flushProjectOperations, projectPersistence } from './projectOperations'
import { captureProjectStorageScope } from './projectStorageRuntime'
import type { ProjectStoreApi } from './projectStore'

export const PRO_ENGINE_UPDATE_LABEL = 'Atualizar o motor do jogo'
export const PRO_ENGINE_UPDATE_SAVE_FAILED =
  'Não consegui guardar o motor novo neste aparelho. O jogo continua como estava.'

/**
 * Troca as cópias antigas e intactas do motor 2D de um projeto Pro pelo motor de agora, numa
 * publicação só do editor (uma revisão local e uma versão no Histórico do projeto). Programa,
 * outros arquivos, materiais e configuração ficam como estão.
 *
 * O documento completo é gravado neste aparelho antes de a troca contar como feita. Se a gravação
 * falha, a árvore anterior volta na mesma hora e o disco nunca recebeu a troca: o projeto fica como
 * estava. Só quando a criança já editou outra coisa nesse meio tempo a troca continua aberta,
 * esperando o salvamento automático, como qualquer edição dela.
 *
 * Não passa pelas aplicações recuperáveis (`applyProEditorChange`): a volta é a versão que fica no
 * Histórico do projeto ("Voltar para esta versão"), que devolve o motor antigo byte a byte (a
 * revisão do Pro aceita as cópias publicadas do motor fora do teto por arquivo da criança).
 *
 * Devolve `false` quando não há nada a trocar.
 */
export async function updateProEngineCopies(
  store: ProjectStoreApi,
  options: {
    signal?: AbortSignal
    onPublish?: (tree: ProjectTree) => void
    /** Inventário das cópias publicadas; os testes trocam por um conhecido. */
    known?: ProEngineInventory
  } = {},
): Promise<boolean> {
  const entry = store.getState().project
  if (!entry) return false
  const scope = captureProjectStorageScope()
  const adapter = projectPersistence(store)
  const current = () => {
    options.signal?.throwIfAborted()
    scope.signal?.throwIfAborted()
    if (store.getState().editingAccess !== 'author')
      throw new Error('Este projeto está em observação.')
    if (
      store.getState().project !== entry ||
      projectPersistence(store) !== adapter ||
      captureProjectStorageScope() !== scope
    )
      throw new Error('O projeto mudou enquanto o motor era preparado. Nada foi trocado.')
  }
  current()
  await flushProjectOperations(store, entry.id)
  current()
  const project = javaScriptProject(entry)
  if (project?.kind !== 'pro' || !project.tree) return false
  const { proEngineUpdatePlan } = await import('../modes/pro/proEngineCopies')
  const plan = await proEngineUpdatePlan(project.tree, options.known)
  current()
  if (!plan) return false
  const before = project.tree
  const next: ProjectTree = { ...before }
  for (const update of plan) next[update.path] = { kind: 'file', content: update.content }
  const refused = store.getState().reconcileProFiles(project.id, before, next)
  if (refused) throw new Error(refused)
  const published = store.getState().project
  if (!published?.tree) throw new Error('O projeto mudou enquanto o motor era preparado.')
  options.onPublish?.(published.tree)
  if (adapter) {
    try {
      await adapter.save(published)
    } catch (cause) {
      const live = store.getState().project
      if (
        live === published &&
        !store.getState().reconcileProFiles(project.id, published.tree, before)
      ) {
        const tree = store.getState().project?.tree
        if (tree) options.onPublish?.(tree)
        throw new Error(PRO_ENGINE_UPDATE_SAVE_FAILED, { cause })
      }
      // Outra edição já está por cima da troca: ela segue com o salvamento automático, como sempre.
      if (live?.id === project.id)
        store
          .getState()
          .markSaveFailed(cause instanceof Error ? cause.message : 'A gravação local falhou.')
      throw new Error(
        'O motor novo ainda não foi guardado neste aparelho. Ele será guardado junto com a sua próxima alteração.',
        { cause },
      )
    }
    if (store.getState().project === published) store.getState().markSaved()
  }
  // A versão de antes entra no Histórico do projeto só quando a troca de fato aconteceu.
  proHistoryRecorder(store)?.(before, 'operation', {
    projectId: project.id,
    label: PRO_ENGINE_UPDATE_LABEL,
  })
  return true
}
