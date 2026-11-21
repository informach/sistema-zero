import { useCallback, useEffect, useRef, useState } from 'react'
import type { ProjectTree } from '../../../core/proProject'
import { type ProHistoryRecorder, setProHistoryRecorder } from '../../../state/proHistoryRecorder'
import { projectPersistence } from '../../../state/projectOperations'
import { useProjectStoreApi } from '../../../state/projectStore'
import type { ProHistoryTrigger, ProHistoryVersion } from '../../../state/proProjectHistory'
import { useProRunApi } from '../../../state/proRun'
import { useStudioConfig } from '../../../studio/config'

/**
 * O Histórico do projeto na área de trabalho do Pro (proposta aprovada em 21/11/2026): registra
 * quem guarda as versões desta instância (o ponto comum das aplicações chama antes de cada operação
 * com arquivos e de cada mudança do Zappy), guarda uma versão quando o jogo passa a rodar e lista
 * as versões. O módulo do histórico entra sob demanda. Guardar nunca atrapalha o que a criança
 * está fazendo: uma falha só deixa de guardar aquela versão.
 *
 * Só com o recurso ligado (`StudioFeatures.projectHistory`: o Estúdio livre liga, a aula não) e com
 * armazenamento local. Trocar de projeto zera a lista, e o que chega de outro projeto (uma leitura
 * atrasada, uma aplicação de outro id) é ignorado (revisão do lote 7).
 */
export function useProHistory(projectId: string | undefined) {
  const store = useProjectStoreApi()
  const proRun = useProRunApi()
  const enabled = useStudioConfig().projectHistory
  const [versions, setVersions] = useState<ProHistoryVersion[]>([])
  const current = useRef(projectId)
  current.current = projectId
  const epoch = useRef(0)
  const scopeOf = useCallback(
    () => (enabled ? projectPersistence(store)?.localScope : undefined),
    [store, enabled],
  )
  const refresh = useCallback(() => {
    const scope = scopeOf()
    if (!scope || !projectId) return
    const mine = ++epoch.current
    void import('../../../state/proProjectHistory')
      .then(({ listProHistory }) => listProHistory(scope, projectId))
      .then((list) => {
        if (mine === epoch.current && current.current === projectId) setVersions(list)
      })
      .catch(() => undefined)
  }, [scopeOf, projectId])
  const record = useCallback(
    (
      tree: ProjectTree,
      trigger: ProHistoryTrigger,
      options: { label?: string; restoredFrom?: number } = {},
    ) => {
      const scope = scopeOf()
      if (!scope || !projectId) return
      void import('../../../state/proProjectHistory')
        .then(({ recordProHistoryVersion }) =>
          recordProHistoryVersion(scope, projectId, tree, trigger, options),
        )
        .then((saved) => {
          if (saved) refresh()
        })
        .catch(() => undefined)
    },
    [scopeOf, projectId, refresh],
  )
  // Trocar de projeto (ou desligar o recurso) começa com a lista vazia.
  // biome-ignore lint/correctness/useExhaustiveDependencies: o id e o recurso são os GATILHOS.
  useEffect(() => {
    setVersions([])
  }, [projectId, enabled])
  useEffect(() => {
    if (!projectId || !enabled) return
    const recorder: ProHistoryRecorder = (tree, trigger, info) => {
      // Uma aplicação de outro projeto (troca no meio) não entra no histórico deste.
      if (info.projectId !== projectId) return
      record(tree, trigger, {
        ...(info.label ? { label: info.label } : {}),
        ...(info.restoredFrom !== undefined ? { restoredFrom: info.restoredFrom } : {}),
      })
    }
    setProHistoryRecorder(store, recorder)
    return () => setProHistoryRecorder(store, null)
  }, [store, projectId, enabled, record])
  // Ao Rodar: a árvore do momento em que o jogo passa a rodar (o histórico limita a uma versão de
  // Rodar a cada 2 minutos e não guarda o que não mudou).
  useEffect(() => {
    if (!projectId || !enabled) return
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
  }, [proRun, store, projectId, enabled, record])
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
  // A janela só fala de versões quando elas são guardadas mesmo (recurso ligado e armazenamento
  // local); fora disso ela mostra só as operações com arquivos (full review final).
  return { versions, refresh, treeOf, enabled: !!scopeOf() }
}

export type ProHistory = ReturnType<typeof useProHistory>
