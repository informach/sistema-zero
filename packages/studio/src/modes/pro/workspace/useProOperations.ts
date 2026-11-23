import { STUDIO_PRO_REVISION_LIMITS } from '@sistemazero/core/studio'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ProjectTree } from '../../../core/proProject'
import { updateProEngineCopies } from '../../../state/proEngineUpdate'
import { projectPersistence } from '../../../state/projectOperations'
import { useProjectStoreApi } from '../../../state/projectStore'
import {
  applyProEditorChange,
  listProApplications,
  listProSessionApplications,
  type ProApplicationRecord,
  retryProApplication,
  undoProApplication,
} from '../../../state/proRevision'
import {
  applyPreparedProWorkspaceOperation,
  describeProTreeChange,
  type ProWorkspaceIntent,
  type ProWorkspaceOperation,
  prepareProWorkspaceOperation,
} from '../../../state/proWorkspaceOperations'
import type { ProWorkspaceLanguage } from './language'

export function useProOperations(
  projectId: string | undefined,
  publish: (tree: ProjectTree, pathMap: Record<string, string>) => void,
) {
  const store = useProjectStoreApi()
  const language = useRef<ProWorkspaceLanguage | null>(null)
  const onPublish = useRef(publish)
  onPublish.current = publish
  const [pending, setPending] = useState<ProWorkspaceOperation | null>(null)
  const [busy, setBusy] = useState(false)
  const running = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [history, setHistory] = useState<ProApplicationRecord[]>([])
  const [pendingSave, setPendingSave] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const historyEpoch = useRef(0)
  const refreshHistory = useCallback(() => {
    if (!projectId) return
    const epoch = ++historyEpoch.current
    const scope = projectPersistence(store)?.localScope
    void (async () => {
      const saved = scope ? await listProApplications(scope, projectId) : []
      const session = listProSessionApplications(store, projectId).map((entry) => entry.record)
      if (epoch === historyEpoch.current)
        setHistory(
          [...new Map([...saved, ...session].map((entry) => [entry.operationId, entry])).values()]
            .filter((entry) => entry.source === 'editor')
            .sort((a, b) => b.createdAt - a.createdAt),
        )
    })().catch((cause: unknown) => {
      if (epoch === historyEpoch.current)
        setError(cause instanceof Error ? cause.message : 'Não foi possível ler o histórico.')
    })
  }, [store, projectId])
  useEffect(() => {
    refreshHistory()
    return () => {
      historyEpoch.current++
    }
  }, [refreshHistory])
  useEffect(() => {
    if (historyOpen) refreshHistory()
  }, [historyOpen, refreshHistory])
  const run = async (action: () => Promise<void>) => {
    if (running.current || !projectId) return
    running.current = true
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a operação.')
    } finally {
      running.current = false
      setBusy(false)
    }
  }
  const receiptNotice = (receipt: Awaited<ReturnType<typeof applyProEditorChange>>) => {
    setPendingSave(receipt.status === 'pending' ? receipt.operationId : null)
    setNotice(
      receipt.status === 'pending'
        ? `Alteração aplicada; falta guardar neste aparelho. ${receipt.error ?? ''}`
        : receipt.status === 'session'
          ? 'Alteração aplicada nesta sessão. O histórico desta sessão permite recuperar a operação.'
          : 'Alteração guardada neste aparelho. Você pode recuperá-la no histórico.',
    )
    refreshHistory()
  }
  return {
    language,
    pending,
    busy,
    error,
    notice,
    history,
    historyOpen,
    setHistoryOpen,
    pendingSave,
    dismiss: () => {
      setError(null)
      setNotice(null)
    },
    cancel: () => {
      if (!running.current) setPending(null)
    },
    prepare: (intent: ProWorkspaceIntent) =>
      run(async () => {
        if (!language.current && intent.kind !== 'material-delete')
          throw new Error(
            'A análise do código ainda não está pronta. Tente novamente quando ela terminar.',
          )
        const operation = await prepareProWorkspaceOperation(
          store,
          projectId!,
          language.current,
          intent,
        )
        setPending(operation)
      }),
    apply: () =>
      run(async () => {
        if (!pending) return
        const receipt = await applyPreparedProWorkspaceOperation(store, pending, (tree) => {
          language.current?.synchronizeDocument(tree, pending.pathMap)
          onPublish.current(tree, pending.pathMap)
        })
        setPending(null)
        receiptNotice(receipt)
      }),
    recover: (operationId: string) =>
      run(async () => {
        const receipt = await undoProApplication(
          store,
          projectId!,
          operationId,
          `editor:${crypto.randomUUID()}`,
          (tree, pathMap) => {
            language.current?.synchronizeDocument(tree, pathMap)
            onPublish.current(tree, pathMap)
          },
        )
        receiptNotice(receipt)
      }),
    /**
     * Voltar para uma versão do Histórico do projeto (proposta aprovada em 21/11/2026). Passa pelo
     * mesmo caminho das operações: o ponto comum guarda a versão de agora antes, a volta fica no
     * registro e pode ser recuperada, e o editor, a análise e a prévia acompanham.
     */
    restoreVersion: (tree: ProjectTree, summary: string, restoredFrom: number) =>
      run(async () => {
        const project = store.getState().project
        if (!project || project.id !== projectId || project.kind !== 'pro')
          throw new Error('O projeto aberto mudou.')
        const change = await describeProTreeChange(project, tree, summary)
        const sameDirectories =
          JSON.stringify(change.directories?.before ?? []) ===
          JSON.stringify(change.directories?.after ?? [])
        if (change.patches.length === 0 && sameDirectories) {
          setNotice('Esta versão é igual ao projeto de agora.')
          return
        }
        if (change.patches.length > STUDIO_PRO_REVISION_LIMITS.maxPatches)
          throw new Error(
            `Esta versão tem mais de ${STUDIO_PRO_REVISION_LIMITS.maxPatches} arquivos diferentes de agora, e a volta precisa caber numa recuperação só. Volte antes para uma versão mais recente.`,
          )
        const receipt = await applyProEditorChange(
          store,
          projectId!,
          {
            operationId: `editor:${crypto.randomUUID()}`,
            change,
            history: { trigger: 'restore', restoredFrom },
          },
          (next) => {
            language.current?.synchronizeDocument(next, {})
            onPublish.current(next, {})
          },
        )
        receiptNotice(receipt)
      }),
    retry: () =>
      run(async () => {
        if (pendingSave) receiptNotice(await retryProApplication(store, projectId!, pendingSave))
      }),
    /**
     * "Atualizar o motor" (decisão de 23/11/2026): troca só as cópias antigas e intactas do motor 2D
     * pelo motor de agora. O editor, a análise e a prévia acompanham, como nas operações.
     */
    updateEngine: () =>
      run(async () => {
        setNotice(null)
        const updated = await updateProEngineCopies(store, {
          onPublish: (tree) => {
            language.current?.synchronizeDocument(tree, {})
            onPublish.current(tree, {})
          },
        })
        setNotice(
          updated
            ? 'Pronto! O jogo agora usa o motor novo, e o seu código continua igual.'
            : 'O motor deste jogo já está em dia.',
        )
      }),
  }
}

export type ProOperations = ReturnType<typeof useProOperations>
