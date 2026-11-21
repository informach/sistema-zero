import { useCallback, useEffect, useRef, useState } from 'react'
import type { ProjectTree } from '../../../core/proProject'
import { setProHistoryRecorder } from '../../../state/proHistoryRecorder'
import { projectPersistence } from '../../../state/projectOperations'
import { useProjectStoreApi } from '../../../state/projectStore'
import type { ProHistoryTrigger, ProHistoryVersion } from '../../../state/proProjectHistory'
import { useProRunApi } from '../../../state/proRun'

/**
 * O Histórico do projeto na área de trabalho do Pro (proposta aprovada em 21/11/2026): registra
 * quem guarda as versões desta instância (o ponto comum das aplicações chama antes de cada operação
 * com arquivos e de cada mudança do Zappy), guarda uma versão quando o jogo passa a rodar e lista
 * as versões. O módulo do histórico entra sob demanda. Guardar nunca atrapalha o que a criança
 * está fazendo: uma falha só deixa de guardar aquela versão.
 */
export function useProHistory(projectId: string | undefined) {
  const store = useProjectStoreApi()
  const proRun = useProRunApi()
  const [versions, setVersions] = useState<ProHistoryVersion[]>([])
  const epoch = useRef(0)
  const scopeOf = useCallback(() => projectPersistence(store)?.localScope, [store])
  const refresh = useCallback(() => {
    const scope = scopeOf()
    if (!scope || !projectId) return
    const mine = ++epoch.current
    void import('../../../state/proProjectHistory')
      .then(({ listProHistory }) => listProHistory(scope, projectId))
      .then((list) => {
        if (mine === epoch.current) setVersions(list)
      })
      .catch(() => undefined)
  }, [scopeOf, projectId])
  const record = useCallback(
    (tree: ProjectTree, trigger: ProHistoryTrigger, label?: string) => {
      const scope = scopeOf()
      if (!scope || !projectId) return
      void import('../../../state/proProjectHistory')
        .then(({ recordProHistoryVersion }) =>
          recordProHistoryVersion(scope, projectId, tree, trigger, { label }),
        )
        .then((saved) => {
          if (saved) refresh()
        })
        .catch(() => undefined)
    },
    [scopeOf, projectId, refresh],
  )
  useEffect(() => {
    if (!projectId) return
    setProHistoryRecorder(store, record)
    return () => setProHistoryRecorder(store, null)
  }, [store, projectId, record])
  // Ao Rodar: a árvore do momento em que o jogo passa a rodar (o histórico limita a uma versão de
  // Rodar a cada 2 minutos e não guarda o que não mudou).
  useEffect(() => {
    if (!projectId) return
    let previous = proRun.getState().state?.phase ?? null
    return proRun.subscribe((state) => {
      const phase = state.state?.phase ?? null
      if (phase === 'running' && previous !== 'running') {
        const project = store.getState().project
        if (
          project?.id === projectId &&
          project.kind === 'pro' &&
          'tree' in project &&
          project.tree
        )
          record(project.tree, 'run')
      }
      previous = phase
    })
  }, [proRun, store, projectId, record])
  useEffect(() => {
    refresh()
    return () => {
      epoch.current++
    }
  }, [refresh])
  const treeOf = useCallback(
    async (versionId: string) => {
      const scope = scopeOf()
      if (!scope || !projectId) throw new Error('O histórico deste projeto não está disponível.')
      const { readProHistoryTree } = await import('../../../state/proProjectHistory')
      return readProHistoryTree(scope, projectId, versionId)
    },
    [scopeOf, projectId],
  )
  return { versions, refresh, treeOf }
}

export type ProHistory = ReturnType<typeof useProHistory>
