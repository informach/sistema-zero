'use client'

import type { AiCreditsView } from '@sistemazero/core/ai-credits'
import { STUDIO_PROJECT_FORMAT_VERSION } from '@sistemazero/core/studio'

// O CSS do Estúdio é gerado pelo `@import` no globals.css (pipeline Tailwind) — ver
// o comentário no `studio-full-client.tsx`. Aqui só orquestramos o editor PRO.
import { StudioProEditor } from '@sistemazero/member-shell/components/studio/studio-pro-editor'
import { useCallback, useEffect, useState } from 'react'
import { type CreationsCloud, createCreationsCloud } from '../../lib/creations-cloud'
import { createStoredSyncedMarks } from '../../lib/creations-sync'
import {
  clearPensaRestore,
  pensaRestoreRevision,
  reconcilePensaOpen,
} from '../../lib/pensa-restore-pending'
import { pensaStudioProjectId } from '../../lib/pensa-studio-link'
import { createStudioCloudSync } from '../../lib/studio-cloud'
import { reportStudioError } from '../../lib/studio-error'
import { EMBEDDED_STUDIO_FRAME, EmbeddedAppLoadingBody } from './embedded-app-loading'
import { HostChromeAnnouncer, useHostChrome } from './use-host-chrome'
import { useStudioTaskHandoff } from './use-pensa-task-handoff'
import { usePensaTeamLibrary } from './use-pensa-team-library'
import { useStudioActivity } from './use-studio-activity'
import { useStudioCreationLibraries } from './use-studio-creation-libraries'
import { useStudioShare } from './use-studio-share'
import { useStudioTaskSession } from './use-studio-task-session'
import { useKidsStudioTutor } from './use-studio-tutor'

type StudioModule = typeof import('@sistemazero/studio')

/** Teto da espera pela fila ao sair do editor PRO (a fila segue sozinha; o /estudio completa). */
const EXIT_FLUSH_TIMEOUT_MS = 3000

/**
 * Wrapper KIDS fino da rota `/estudio/pro/[id]` (modo Código / WebContainer): provê
 * a plataforma + a volta p/ a lista ao `<StudioProEditor>` do
 * member-shell (reusável pelo adulto). A rota é a ÚNICA com COOP/COEP (headers
 * escopados no next.config) — por isso o PRO abre aqui, não no `/estudio` clássico.
 *
 * Reconcilia a nuvem antes da leitura local, inclusive em links diretos, e mantém
 * o espelho ligado durante a edição. O selo fica na
 * Topbar do editor; o controle do menu pertence à alça do shell Kids. O Provider vem
 * do MESMO módulo `@sistemazero/studio` que o `StudioProEditor` carrega
 * (mesma instância de contexto no bundle do kids), por isso o módulo é importado aqui
 * ANTES de montar o editor — importá-lo depois trocaria a árvore e remontaria o editor.
 */
export function StudioProClient(props: Parameters<typeof StudioProClientSession>[0]) {
  return (
    <StudioProClientSession key={JSON.stringify([props.viewerId, props.projectId])} {...props} />
  )
}

function StudioProClientSession({
  viewerId,
  projectId,
  taskId = null,
  zappyEnabled = false,
  pintaOwned = false,
  moldaOwned = false,
  challenge = null,
  aiCredits = null,
  narrationEnabled = false,
  voiceInputEnabled = false,
}: {
  viewerId: string | null
  projectId: string
  taskId?: string | null
  /** Capacidade de oferta derivada no servidor; o BFF mantém o gate autoritativo. */
  zappyEnabled?: boolean
  pintaOwned?: boolean
  moldaOwned?: boolean
  challenge?: { key: string; title: string } | null
  aiCredits?: AiCreditsView | null
  narrationEnabled?: boolean
  voiceInputEnabled?: boolean
}) {
  // ⚠️ O tema escuro não existe nesta plataforma desde 11/09/2026: este valor era uma
  // CONSTANTE calculada por um hook. Trocar por literal é apagar código morto, não mudar
  // comportamento. Se o eixo claro/escuro voltar, ele volta com atributo e hook próprios.
  const theme: 'light' | 'dark' = 'light'
  const handoff = useStudioTaskHandoff(taskId)
  const boundHandoff =
    handoff.data?.capability.owned &&
    (handoff.data.task.progress.outputRef?.projectId === projectId ||
      pensaStudioProjectId(handoff.data.project.id) === projectId)
      ? handoff.data
      : null
  const teamLibrary = usePensaTeamLibrary({ projectId, viewerId })
  const [mod, setMod] = useState<StudioModule | null>(null)
  const [cloud, setCloud] = useState<CreationsCloud | null>(null)
  const [preparation, setPreparation] = useState<{
    viewerId: string
    run: () => Promise<void>
  } | null>(null)
  const prepareProject = preparation?.viewerId === viewerId ? preparation.run : undefined
  const [loadIssue, setLoadIssue] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const { pintaLibrary, moldaLibrary } = useStudioCreationLibraries(
    viewerId,
    pintaOwned,
    moldaOwned,
  )
  // Carga COMPLETA (não soft-nav): sair da rota PRO larga o cross-origin isolation
  // (COEP) limpo, evitando que o /estudio clássico herde o COEP do documento isolado.
  // Antes de sair, o que estiver pendente sobe — com TETO: sem internet (a fila espera o
  // backoff) ou com um projeto de vários MB, a criança não pode ficar presa no editor. O
  // `pagehide` da fila também cobre, e o `/estudio` reconcilia e sobe o que ficou.
  const onExit = useCallback(() => {
    const leave = () =>
      window.location.assign(
        boundHandoff ? `/pensa?plano=${encodeURIComponent(boundHandoff.project.id)}` : '/estudio',
      )
    if (!cloud) return leave()
    if (cloud.getState().status === 'offline') return leave()
    void cloud.flush({ timeoutMs: EXIT_FLUSH_TIMEOUT_MS }).finally(leave)
  }, [cloud, boundHandoff])
  const navigateTask = useCallback((path: string) => window.location.assign(path), [])
  const taskSession = useStudioTaskSession({
    handoff: boundHandoff,
    projectId,
    viewerId,
    cloud,
    retry: handoff.retry,
    updateProgress: handoff.updateProgress,
    navigate: navigateTask,
    pro: true,
    narrationEnabled,
  })
  const share = useStudioShare(challenge)
  const handleActivity = useStudioActivity(taskSession, false)
  const openDrawing = useCallback((id: string) => {
    window.open(`/pinta?desenho=${encodeURIComponent(id)}`, '_blank', 'noopener,noreferrer')
  }, [])
  const openCreation = useCallback((id: string) => {
    window.open(`/molda?criacao=${encodeURIComponent(id)}`, '_blank', 'noopener,noreferrer')
  }, [])
  const tutor = useKidsStudioTutor({
    viewerId,
    zappyEnabled,
    aiCredits,
    narrationEnabled,
    voiceInputEnabled,
    taskId: boundHandoff?.task.guide.contractVersion === 2 ? boundHandoff.task.id : null,
  })

  // O módulo do Estúdio: é o mesmo que o editor PRO carrega por dentro (chunk já em
  // cache). Sempre, com ou sem perfil — o Provider do chrome precisa dele.
  // biome-ignore lint/correctness/useExhaustiveDependencies: retry repeats a failed chunk load.
  useEffect(() => {
    let active = true
    setLoadIssue(null)
    void import('@sistemazero/studio')
      .then((m) => {
        if (active) setMod(m)
      })
      .catch(() => {
        if (active)
          setLoadIssue('Não consegui carregar o Estúdio. Confira a conexão e tente novamente.')
      })
    return () => {
      active = false
    }
  }, [loadAttempt])

  // Espelho da nuvem (só com PERFIL). O `setStudioCloudMirror` é global no pacote; o
  // namespace por viewer é definido pelo próprio editor antes de gravar.
  useEffect(() => {
    if (!viewerId || !mod) return
    let active = true
    mod.setStudioStorageNamespace(viewerId)
    const created = createCreationsCloud({
      tool: 'studio',
      viewerId,
      idleMs: 10_000,
      maxFormatVersion: STUDIO_PROJECT_FORMAT_VERSION,
    })
    const sync = createStudioCloudSync({ studio: mod, cloud: created, viewerId })
    const detach = sync.attach()
    setPreparation({
      viewerId,
      run: async () => {
        if (!active) throw new Error('O perfil mudou durante a abertura do projeto.')
        setSyncing(true)
        try {
          await sync.pullMissing()
          if (!active) throw new Error('O perfil mudou durante a abertura do projeto.')
          const marks = createStoredSyncedMarks(`sz:creations-synced:studio:${viewerId}`)
          await reconcilePensaOpen({
            restoreRevision: pensaRestoreRevision(viewerId, projectId),
            syncedRevision: () => marks.revision(projectId),
            clear: () => {
              if (active) clearPensaRestore(viewerId, projectId)
            },
            pull: () => sync.pullMissing(),
            peek: () => created.peek(projectId),
          })
        } finally {
          if (active) setSyncing(false)
        }
      },
    })
    setCloud(created)
    return () => {
      active = false
      sync.cancelPull()
      detach()
      void created.flush({ timeoutMs: EXIT_FLUSH_TIMEOUT_MS }).finally(() => created.dispose())
      setCloud(null)
      setPreparation(null)
    }
  }, [viewerId, projectId, mod])

  const { chrome: hostChrome, announcement } = useHostChrome({ cloud, syncing })

  return (
    // O card daqui era órfão: saiu dos outros três em 08/2026 e ficou. Não era só
    // cosmético — o `estudio/loading.tsx` TAMBÉM cobre `/estudio/pro/[id]`, então
    // a espera vinha sem card e o editor entrava dentro de um.
    // A moldura segue BLOCO (o editor se dimensiona por `h-full`).
    <div className={EMBEDDED_STUDIO_FRAME}>
      {loadIssue ? (
        <div
          role="alert"
          className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center"
        >
          <p>{loadIssue}</p>
          <button
            type="button"
            className="underline"
            onClick={() => setLoadAttempt((attempt) => attempt + 1)}
          >
            Tentar novamente
          </button>
        </div>
      ) : mod && (!viewerId || prepareProject) ? (
        <mod.StudioHostChromeProvider value={hostChrome}>
          <HostChromeAnnouncer text={announcement} />
          {taskId &&
            (handoff.status === 'error' || (handoff.status === 'success' && !boundHandoff)) && (
              <div role="alert" className="shrink-0 p-2 text-sm">
                {handoff.error ??
                  'Esta missão não está vinculada a este jogo. Seu projeto continua aberto.'}
                <button type="button" className="ml-2 underline" onClick={handoff.retry}>
                  Tentar novamente
                </button>
              </div>
            )}
          <StudioProEditor
            viewerId={viewerId}
            projectId={projectId}
            theme={theme}
            onExit={onExit}
            tutor={tutor}
            share={share}
            onChange={handleActivity}
            onError={reportStudioError}
            prepareProject={prepareProject}
            pintaLibrary={pintaLibrary}
            moldaLibrary={moldaLibrary}
            teamLibrary={teamLibrary}
            taskSession={taskSession}
            onEditDrawing={pintaLibrary ? openDrawing : undefined}
            onEditCreation={moldaLibrary ? openCreation : undefined}
          />
        </mod.StudioHostChromeProvider>
      ) : (
        <EmbeddedAppLoadingBody label="Carregando o Estúdio…" />
      )}
    </div>
  )
}
