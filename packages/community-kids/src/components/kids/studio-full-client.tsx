'use client'

import type { AiCreditsView } from '@sistemazero/core/ai-credits'
import { STUDIO_PROJECT_FORMAT_VERSION } from '@sistemazero/core/studio'
// O CSS do Estúdio (tokens + @theme que GERA as utilitárias sz-*) é carregado pelo
// `@import` em `app/globals.css`, DENTRO do pipeline Tailwind — um JS-import aqui só
// traz os tokens, NÃO registra as cores p/ gerar as utilitárias (sem isso os modais e
// menus do editor saem sem fundo/cor). Ver o comentário no globals.css.
import { requestPersistentStorage } from '@sistemazero/member-shell/lib/persistent-storage'
import { sessionFetch as fetch } from '@sistemazero/member-shell/lib/session-fetch'
import type { StudioTier } from '@sistemazero/member-shell/lib/studio-tier'
import { useIsDesktop } from '@sistemazero/member-shell/lib/use-is-desktop'
import type { StudioTaskSession } from '@sistemazero/studio'
import { RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { type CreationsCloud, createCreationsCloud } from '../../lib/creations-cloud'
import { createStoredSyncedMarks } from '../../lib/creations-sync'
import {
  clearPensaRestore,
  isPensaRestorePending,
  PensaOpenRefused,
  pensaRestoreRevision,
  reconcilePensaOpen,
} from '../../lib/pensa-restore-pending'
import { pensaStudioLinkKey, pensaStudioProjectId } from '../../lib/pensa-studio-link'
import { resumeExistingCreation } from '../../lib/resume-creation'
import { createStudioCloudSync } from '../../lib/studio-cloud'
import { EMBEDDED_STUDIO_FRAME, EmbeddedAppLoadingBody } from './embedded-app-loading'
import { PensaMissionBlocked } from './pensa-mission-blocked'
import { StudioFullEditor } from './studio-full-editor'
import { HostChromeAnnouncer, useHostChrome } from './use-host-chrome'
import { useStudioTaskHandoff } from './use-pensa-task-handoff'
import { usePensaTeamLibrary } from './use-pensa-team-library'
import { useStudioCreationLibraries } from './use-studio-creation-libraries'
import { useStudioShare } from './use-studio-share'
import { useStudioTaskSession } from './use-studio-task-session'
import { useKidsStudioTutor } from './use-studio-tutor'

// O package do Estúdio é pesado (Monaco/Blockly/IndexedDB) e NÃO roda no SSR — por
// isso carregamos o módulo inteiro DENTRO de um effect (igual ao public-player) e o
// server renderiza só o placeholder. `mod` guarda os exports carregados.
type StudioModule = typeof import('@sistemazero/studio')
type View = { name: 'list' } | { name: 'editor'; projectId: string }

/**
 * Estúdio Completo embarcado na comunidade kids (produto vendável). Hospeda a navegação
 * lista ⇄ editor (o package não tem router — quem roteia é o host; aqui é estado local)
 * com persistência LOCAL (IndexedDB do navegador, a experiência do playground). Recursos
 * CLÁSSICOS: o `<StudioEditor>` já vem com terminal/IA/profissional OFF por default —
 * por isso NÃO passamos `features` (sem WebContainer = sem necessidade de COOP/COEP). O
 * botão "Compartilhar" publica no Mural via o caminho standalone (sem aula).
 */
export function StudioFullClient({
  viewerId,
  challenge = null,
  tier,
  showExamples = false,
  zappyEnabled = false,
  aiCredits = null,
  taskId = null,
  initialProjectId = null,
  pintaOwned = false,
  moldaOwned = false,
  narrationEnabled = false,
  voiceInputEnabled = false,
  proCreationTemplates,
}: {
  viewerId: string | null
  /**
   * DESAFIO do mês (game jam) — presente SÓ quando a criança possui Clube +
   * Estúdio (a página checa as refs): liga o checkbox "Participar do Desafio"
   * no Compartilhar. O gate REAL da tag é o do hub no publish.
   */
  challenge?: { key: string; title: string } | null
  /** Modos pelo RANK e blocos pelos CURSOS concluídos (ver `earnedStudioTier`). */
  tier: StudioTier
  /**
   * Mostrar os EXEMPLOS prontos — a vitrine "Que jogo você quer criar?" na lista
   * E os "Exemplos clássicos" no painel de Extensões. Ligado SÓ p/ a equipe
   * interna enquanto o catálogo é validado (a página deriva de `session.role`);
   * o cliente segue sem exemplos. Default `false`.
   */
  showExamples?: boolean
  /** Capacidade de oferta derivada no servidor; o BFF mantém o gate autoritativo. */
  zappyEnabled?: boolean
  /** Saldo lido no Server Component. Nulo = não sei → o medidor não aparece. */
  aiCredits?: AiCreditsView | null
  /** Cartão de Criação aberto por `/estudio?tarefa=<id>`. */
  taskId?: string | null
  /** Resume an existing item from the creator hub; never creates a replacement. */
  initialProjectId?: string | null
  /**
   * Posse do PINTA (a página checa `refs=pinta,estudio-completo` numa ida) —
   * liga o "Trazer do Pinta" na aba "Imagens". Produtos vendidos à parte:
   * sem posse, o adapter nem é criado e o Estúdio esconde o botão.
   */
  pintaOwned?: boolean
  /**
   * Posse do MOLDA (a mesma ida `refs=estudio-completo,pinta,molda`) — liga o "Trazer
   * do Molda" na aba "Modelos 3D" (modelos .glb, texturas .png, céus .hdr). Sem
   * posse, o adapter nem é criado e o Estúdio esconde o botão.
   */
  moldaOwned?: boolean
  narrationEnabled?: boolean
  voiceInputEnabled?: boolean
  proCreationTemplates?: readonly import('@sistemazero/core/studio').StudioProTemplateId[]
}) {
  const router = useRouter()
  const [mod, setMod] = useState<StudioModule | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [view, setView] = useState<View>({ name: 'list' })
  const [openingProject, setOpeningProject] = useState<'loading' | 'error' | null>(
    initialProjectId && !taskId ? 'loading' : null,
  )
  // A frase que explica por que o jogo não abriu, quando há uma melhor que o recado genérico
  // (ex.: "Feche o jogo em outras abas"). `null` = o recado de sempre.
  const [openingError, setOpeningError] = useState<string | null>(null)
  // "Guardado na sua conta": a fila da nuvem por perfil (o selo lê daqui) JUNTO do
  // desligar do espelho DELA — o par vive num estado só, para o cleanup de uma fila
  // nunca desligar o espelho da fila seguinte (era o que um ref compartilhado fazia).
  const [cloudSync, setCloudSync] = useState<{
    cloud: CreationsCloud
    detach: () => void
    cancelPull: () => void
    /** A descida (single-flight): de novo ao voltar à lista, para o que ficou de fora entrar. */
    pullMissing: () => Promise<void>
    /** Baixa E restaura um projeto (marca de sincronia avançada só depois de gravar). */
    restoreProject: (id: string) => Promise<boolean>
  } | null>(null)
  // A DESCIDA está em andamento (a lista já está na tela; o selo avisa "buscando…").
  const [syncing, setSyncing] = useState(false)
  const pullCancellationRef = useRef<{
    viewerId: string
    cancelPull: () => void
  } | null>(null)
  const cloud = cloudSync?.cloud ?? null
  /** Antes de abrir um jogo do Pensa: só age com uma restauração v2 pendente (ver o lib). */
  const preparePensaOpen = useCallback(
    async (projectId: string): Promise<void> => {
      if (!viewerId) return
      const marks = createStoredSyncedMarks(`sz:creations-synced:studio:${viewerId}`)
      await reconcilePensaOpen({
        restoreRevision: pensaRestoreRevision(viewerId, projectId),
        syncedRevision: () => marks.revision(projectId),
        clear: () => clearPensaRestore(viewerId, projectId),
        pull: cloudSync ? () => cloudSync.pullMissing() : null,
        peek: cloudSync ? () => cloudSync.cloud.peek(projectId) : null,
      })
    },
    [cloudSync, viewerId],
  )
  const precisaPrepararAbertura = useCallback(
    (projectId: string): boolean => {
      if (!viewerId) return false
      const restoreRevision = pensaRestoreRevision(viewerId, projectId)
      if (restoreRevision === null) return false
      const marks = createStoredSyncedMarks(`sz:creations-synced:studio:${viewerId}`)
      return isPensaRestorePending(restoreRevision, marks.revision(projectId))
    },
    [viewerId],
  )
  useEffect(() => {
    if (!mod || !initialProjectId || taskId) return
    let active = true
    setOpeningProject('loading')
    setOpeningError(null)
    const persistence = mod.createLocalPersistenceAdapter({ namespace: viewerId ?? '' })
    void resumeExistingCreation(
      initialProjectId,
      (id) => persistence.load(id),
      cloudSync?.restoreProject ?? null,
      () => preparePensaOpen(initialProjectId),
    )
      .then((project) => {
        if (!active) return
        if (!project) {
          setOpeningProject('error')
          return
        }
        setView({ name: 'editor', projectId: initialProjectId })
        setOpeningProject(null)
      })
      .catch((error: unknown) => {
        if (!active) return
        setOpeningError(error instanceof PensaOpenRefused ? error.message : null)
        setOpeningProject('error')
      })
    return () => {
      active = false
    }
  }, [mod, initialProjectId, taskId, viewerId, cloudSync, preparePensaOpen])
  const [taskError, setTaskError] = useState<string | null>(null)
  const [missingTaskProject, setMissingTaskProject] = useState<{
    projectId: string
    projectName: string
  } | null>(null)
  const openedTaskKeyRef = useRef<string | null>(null)
  // O Estúdio SEGUE a plataforma (hoje só claro) — sem toggle próprio e sem
  // destoar do app ao redor. `resolvedTheme` é undefined no 1º render → cai em claro.
  // ⚠️ O tema escuro não existe nesta plataforma desde 11/09/2026: este valor era uma
  // CONSTANTE calculada por um hook. Trocar por literal é apagar código morto, não mudar
  // comportamento. Se o eixo claro/escuro voltar, ele volta com atributo e hook próprios.
  const studioTheme: 'light' | 'dark' = 'light'
  // Só a Lenda/admin (tier.pro) E no desktop pode criar projetos PRO (modo Código):
  // o WebContainer não roda no celular/tablet, então nem oferecemos a escolha lá. É
  // um PRÉ-FILTRO; o gate real é a capacidade (`canRunProMode`) na rota /estudio/pro.
  const isDesktop = useIsDesktop()
  const proAvailable = tier.pro && isDesktop
  const {
    data: taskHandoff,
    status: taskHandoffStatus,
    error: taskHandoffError,
    retry: retryTaskHandoff,
    updateProgress: updateTaskProgress,
  } = useStudioTaskHandoff(taskId)

  const loadStudio = useCallback(
    async (isCurrent?: () => boolean) => {
      setMod(null)
      setLoadError(false)
      // Os projetos da criança vivem no IndexedDB: pede persistência p/ o navegador não
      // despejá-los (Safari ~7 dias sem visita; pressão de disco). Best-effort, 1×/sessão.
      requestPersistentStorage()
      try {
        const m = await import('@sistemazero/studio')
        if (isCurrent && !isCurrent()) return
        // Isola o armazenamento LOCAL por PERFIL (kids): irmãos no mesmo navegador NÃO compartilham
        // a lista de projetos. ANTES de renderizar a ProjectList. Vazio (sem sessão) = store padrão.
        m.setStudioStorageNamespace(viewerId ?? '')
        // "Guardado na sua conta" (só com PERFIL — sem sessão de perfil não há dono na nuvem):
        // liga o espelho (toda gravação local sobe) e dispara a DESCIDA em SEGUNDO PLANO. A
        // lista aparece já com o que há neste aparelho (décimos de segundo) e os jogos de outro
        // computador vão entrando conforme descem — cada restauro passa por `persistProject`,
        // que avisa `PROJECT_CHANGED_EVENT`, e a lista relê só aquele card. (Antes a lista
        // esperava a descida inteira: até ~10 s de "Carregando…" com tudo já no IndexedDB.)
        // Se a criança abrir um jogo durante a descida, o restauro DELE é recusado pela guarda
        // de projeto aberto e a subida seguinte cai em `onStale` (cópia "(de outro aparelho)").
        if (viewerId) {
          // O projeto INTEIRO sobe a cada folga (vários MB comprimidos): a folga é maior
          // que a do Pinta. `viewerId` vai em toda chamada (`x-sz-viewer`): o BFF recusa se
          // a sessão já trocou de perfil. A fila anterior é desligada pelo cleanup do
          // efeito `[cloudSync]` (nunca aqui dentro nem num updater).
          const nextCloud = createCreationsCloud({
            tool: 'studio',
            viewerId,
            idleMs: 10_000,
            maxFormatVersion: STUDIO_PROJECT_FORMAT_VERSION,
          })
          const sync = createStudioCloudSync({ studio: m, cloud: nextCloud, viewerId })
          const detach = sync.attach()
          pullCancellationRef.current = { viewerId, cancelPull: sync.cancelPull }
          setCloudSync({
            cloud: nextCloud,
            detach,
            cancelPull: sync.cancelPull,
            pullMissing: sync.pullMissing,
            restoreProject: sync.restoreProject,
          })
          setSyncing(true)
          void sync
            .pullMissing()
            .catch(() => {
              // Sem nuvem agora: fica com o que há neste aparelho.
            })
            .finally(() => {
              if (!isCurrent || isCurrent()) setSyncing(false)
            })
        } else {
          setCloudSync(null)
          setSyncing(false)
        }
        setMod(m)
        // Aquece os chunks pesados (Blockly/Monaco) enquanto a criança olha a lista.
        m.prefetchStudioModes()
      } catch {
        if (isCurrent && !isCurrent()) return
        setLoadError(true)
      }
    },
    [viewerId],
  )

  useEffect(() => {
    let active = true
    void loadStudio(() => active)
    return () => {
      active = false
      if (viewerId && pullCancellationRef.current?.viewerId === viewerId) {
        pullCancellationRef.current.cancelPull()
      }
    }
  }, [loadStudio, viewerId])

  // Ao sair da página (ou trocar de fila): o espelho DESTA fila desliga, o que estiver
  // pendente sobe INTEIRO e só então a fila fecha (`dispose()` antes do fim do `flush`
  // deixava só um item subir). Se o pacote já foi trocado por outra fila, o `attach`
  // dela veio depois e vence (o espelho é global no pacote).
  useEffect(() => {
    if (!cloudSync) return
    const { cloud: current, detach, cancelPull } = cloudSync
    return () => {
      cancelPull()
      if (pullCancellationRef.current?.cancelPull === cancelPull) {
        pullCancellationRef.current = null
      }
      detach()
      // Com teto (sem internet a fila espera o backoff): o que ficar sobe na próxima carga.
      void current.flush({ timeoutMs: 5000 }).finally(() => current.dispose())
    }
  }, [cloudSync])

  const handoffTaskId = taskHandoff?.task.id ?? null
  const handoffProjectId = taskHandoff?.project.id ?? null
  const handoffProjectName = taskHandoff?.project.name ?? null
  const handoffOwned = taskHandoff?.capability.owned ?? false
  const handoffStatus = taskHandoff?.task.progress.status ?? null
  const handoffProgressUpdatedAt = taskHandoff?.task.progress.updatedAt ?? null
  const handoffOutputProjectId = taskHandoff?.task.progress.outputRef?.projectId ?? null
  const handoffV2 = taskHandoff?.task.guide.contractVersion === 2

  // O backup e o vínculo vivem no host do Estúdio. O id é determinístico e a
  // chave inclui viewer + projeto Pensa para irmãos/dispositivos não colidirem.
  useEffect(() => {
    if (
      !mod ||
      !handoffOwned ||
      !handoffTaskId ||
      !handoffProjectId ||
      handoffProjectName == null
    ) {
      if (!handoffTaskId) openedTaskKeyRef.current = null
      return
    }
    const openKey = `${handoffTaskId}:${handoffProjectId}`
    if (openedTaskKeyRef.current === openKey) return
    openedTaskKeyRef.current = openKey
    let active = true
    void (async () => {
      const mappingKey = pensaStudioLinkKey(viewerId, handoffProjectId)
      const deterministicId = pensaStudioProjectId(handoffProjectId)
      const projectId = deterministicId
      const persistence = mod.createLocalPersistenceAdapter({ namespace: viewerId ?? '' })
      // Só faz rede com uma restauração v2 pendente neste aparelho (ver `preparePensaOpen`).
      await preparePensaOpen(projectId)
      let project = await persistence.load(projectId)
      if (!project) {
        if (handoffOutputProjectId) {
          if (active) setMissingTaskProject({ projectId, projectName: handoffProjectName })
          return
        }
        project = mod.createEmptyProject(projectId, handoffProjectName)
        await persistence.save(project)
      }
      try {
        localStorage.setItem(mappingKey, projectId)
      } catch {}
      if (!active) return
      setMissingTaskProject(null)
      if (handoffStatus !== 'completed') {
        const response = await fetch(
          `/api/pensa/tasks/${encodeURIComponent(handoffTaskId)}/progress`,
          {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              expectedUpdatedAt: handoffProgressUpdatedAt,
              ...(handoffStatus === 'planned' ? { status: 'in_progress' } : {}),
              outputRef: {
                kind: 'studio_project',
                projectId,
                saveRevision: String(project.updatedAt),
              },
            }),
          },
        )
        const updated = (await response.json().catch(() => null)) as {
          task?: { progress: StudioTaskSession['progress'] }
        } | null
        if (response.status === 409) {
          openedTaskKeyRef.current = null
          retryTaskHandoff()
          if (active)
            setTaskError('A tarefa mudou em outro lugar. Recarreguei o Guia do Pensa para você.')
          return
        } else if (active && response.ok && updated?.task) {
          updateTaskProgress(updated.task.progress)
        } else if (!response.ok || !updated?.task) {
          throw new Error('Não consegui vincular o projeto a esta tarefa.')
        }
      }
      if (active) setView({ name: 'editor', projectId })
    })().catch((error: unknown) => {
      openedTaskKeyRef.current = null
      if (active)
        setTaskError(
          error instanceof PensaOpenRefused
            ? error.message
            : 'Não consegui criar ou restaurar o projeto desta tarefa.',
        )
    })
    return () => {
      active = false
    }
  }, [
    mod,
    handoffOwned,
    handoffTaskId,
    handoffProjectId,
    handoffProjectName,
    handoffStatus,
    handoffProgressUpdatedAt,
    handoffOutputProjectId,
    preparePensaOpen,
    retryTaskHandoff,
    updateTaskProgress,
    viewerId,
  ])

  const recreateMissingTaskProject = useCallback(async () => {
    if (!mod || !missingTaskProject) return
    setTaskError(null)
    try {
      const persistence = mod.createLocalPersistenceAdapter()
      // Antes de criar um projeto VAZIO com o id determinístico: a nuvem pode ter o jogo de
      // verdade (a descida da carga pode ter ficado de fora por tempo/rede). Um vazio subindo
      // com o mesmo id só viraria conflito no outro aparelho.
      let restored = false
      if (cloudSync) {
        try {
          // O adaptador baixa (manifesto + partes → `Project`), restaura E avança a marca de
          // sincronia — sem a marca, a primeira edição subia com base 0 e virava uma cópia
          // "(de outro aparelho)" espúria.
          restored = await cloudSync.restoreProject(missingTaskProject.projectId)
        } catch {
          restored = false
        }
      }
      if (!restored) {
        const project = mod.createEmptyProject(
          missingTaskProject.projectId,
          missingTaskProject.projectName,
        )
        await persistence.save(project)
      }
      if (handoffProjectId) {
        try {
          localStorage.setItem(
            pensaStudioLinkKey(viewerId, handoffProjectId),
            missingTaskProject.projectId,
          )
        } catch {}
      }
      setMissingTaskProject(null)
      setView({ name: 'editor', projectId: missingTaskProject.projectId })
    } catch {
      setTaskError('Não consegui recriar o projeto neste aparelho.')
    }
  }, [cloudSync, handoffProjectId, missingTaskProject, mod, viewerId])

  const navigateTask = useCallback((path: string) => router.push(path), [router])
  const taskSession = useStudioTaskSession({
    handoff: taskHandoff,
    projectId: view.name === 'editor' ? view.projectId : null,
    viewerId,
    cloud,
    retry: retryTaskHandoff,
    updateProgress: updateTaskProgress,
    navigate: navigateTask,
    narrationEnabled,
  })

  const share = useStudioShare(challenge)
  const tutor = useKidsStudioTutor({
    viewerId,
    zappyEnabled,
    aiCredits,
    narrationEnabled,
    voiceInputEnabled,
    taskId: handoffV2 ? handoffTaskId : null,
  })

  const { pintaLibrary, moldaLibrary } = useStudioCreationLibraries(
    viewerId,
    pintaOwned,
    moldaOwned,
  )

  // "Trazer da equipe": só no jogo de um plano do Pensa em equipe, para quem programa, e só
  // quando já há arte entregue (o hook confere no servidor; o editor abre sem esperar).
  const teamLibrary = usePensaTeamLibrary({
    projectId: view.name === 'editor' ? view.projectId : null,
    viewerId,
  })

  const openProject = useCallback(
    async (projectId: string) => {
      // O caminho de sempre abre NA HORA (sem tela de espera): só a restauração pendente espera.
      if (!precisaPrepararAbertura(projectId)) {
        setView({ name: 'editor', projectId })
        return
      }
      setOpeningProject('loading')
      setOpeningError(null)
      try {
        await preparePensaOpen(projectId)
        setView({ name: 'editor', projectId })
        setOpeningProject(null)
      } catch (error) {
        setOpeningError(error instanceof PensaOpenRefused ? error.message : null)
        setOpeningProject('error')
      }
    },
    [precisaPrepararAbertura, preparePensaOpen],
  )
  const backToList = useCallback(() => {
    setView({ name: 'list' })
    // De volta à lista: uma descida de novo (single-flight, barata — a lista da nuvem e a
    // comparação), para o que ficou de fora enquanto um jogo estava ABERTO (a descida nem
    // copia nem restaura um projeto aberto) entrar agora, e não só no próximo F5.
    if (cloudSync) {
      setSyncing(true)
      void cloudSync
        .pullMissing()
        .catch(() => {})
        .finally(() => setSyncing(false))
    }
  }, [cloudSync])
  const exitEditor = useCallback(() => {
    // Volta ao PLANO desta missão (e não à lista de planos): `?plano=` abre o caminho dela.
    if (taskId)
      window.location.assign(
        handoffProjectId ? `/pensa?plano=${encodeURIComponent(handoffProjectId)}` : '/pensa',
      )
    else backToList()
  }, [backToList, taskId, handoffProjectId])

  // O selo "Guardado na sua conta" fica na Topbar do editor e no cabeçalho da lista.
  // O menu lateral é controlado pela alça do shell Kids (`hostChrome.menu` é null).
  // UM provider cobre as duas raízes (lista e editor).
  const { chrome: hostChrome, announcement } = useHostChrome({ cloud, syncing })

  // O editor PREENCHE o espaço disponível: `flex-1` dentro do <main> do MainContainer
  // (no /estudio o main é `flex flex-col` de largura+altura totais). `min-h-[34rem]`
  // mantém a usabilidade em telas baixas (a página rola se não couber — quem
  // garante isso TAMBÉM no desktop é o `md:min-h-[34rem]` do MainContainer,
  // par deste piso + zero de padding; mexeu num, mexa no outro).
  // ⚠️ A moldura é COMPARTILHADA com o `loading.tsx` da rota (ver
  // `embedded-app-loading.tsx`): sem card, porque o Estúdio é uma SEÇÃO da
  // comunidade, e idêntica à da espera anterior — é o que faz a troca ser
  // invisível em vez de um piscar. Segue BLOCO (não coluna flex): os filhos se
  // dimensionam por `h-full` contando com isso.
  return (
    <div className={EMBEDDED_STUDIO_FRAME}>
      {taskHandoffStatus === 'error' || taskError ? (
        <div className="grid h-full place-items-center p-6 text-center">
          <div className="flex max-w-sm flex-col items-center gap-3">
            <p className="font-semibold">{taskHandoffError ?? taskError}</p>
            <button
              type="button"
              onClick={() => {
                setTaskError(null)
                openedTaskKeyRef.current = null
                retryTaskHandoff()
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 font-bold text-primary-foreground"
            >
              <RefreshCw className="size-4" /> Tentar de novo
            </button>
          </div>
        </div>
      ) : taskHandoff && !taskHandoff.capability.owned ? (
        // A missão é de outra pessoa da equipe (ou a conta não tem o Estúdio): sem guia, sem
        // concluir, e com o caminho de volta ao plano.
        <PensaMissionBlocked
          reason={taskHandoff.capability.blockedReason}
          onBackToPlan={() =>
            router.push(`/pensa?plano=${encodeURIComponent(taskHandoff.project.id)}`)
          }
        />
      ) : missingTaskProject ? (
        <div className="grid h-full place-items-center p-6 text-center">
          <div className="flex max-w-md flex-col items-center gap-3">
            <h2 className="font-black text-xl">Este projeto não está neste aparelho</h2>
            <p className="text-muted-foreground">
              O Guia do Pensa e o progresso continuam salvos. Você pode recriar o projeto associado
              com o mesmo identificador e continuar por aqui.
            </p>
            <button
              type="button"
              onClick={() => void recreateMissingTaskProject()}
              className="min-h-11 rounded-full bg-primary px-5 font-bold text-primary-foreground"
            >
              Recriar projeto neste aparelho
            </button>
            <button
              type="button"
              onClick={() => window.location.assign('/pensa')}
              className="min-h-11 rounded-full border border-border px-5 font-bold"
            >
              Voltar ao meu plano
            </button>
          </div>
        </div>
      ) : loadError ? (
        <div className="grid h-full place-items-center p-6 text-center">
          <div className="flex max-w-sm flex-col items-center gap-3">
            <p className="font-semibold">Não consegui carregar o Estúdio.</p>
            <button
              type="button"
              onClick={() => void loadStudio()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 font-bold text-primary-foreground"
            >
              <RefreshCw className="size-4" /> Tentar de novo
            </button>
          </div>
        </div>
      ) : openingProject === 'error' ? (
        <div className="grid h-full place-items-center p-6 text-center">
          <div className="flex max-w-md flex-col gap-3">
            <h2 className="sz-display text-xl">Não conseguimos abrir este jogo</h2>
            <p className="text-sm text-muted-foreground">
              {openingError ??
                'Ele pode estar em outro aparelho ou aguardando conexão. Tente novamente ou procure na sua galeria.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-11 rounded-full bg-primary px-5 font-bold text-primary-foreground"
            >
              Tentar novamente
            </button>
            <a
              href="/estudio"
              className="inline-flex min-h-11 items-center justify-center font-bold text-primary"
            >
              Voltar à galeria
            </a>
          </div>
        </div>
      ) : openingProject === 'loading' ? (
        <EmbeddedAppLoadingBody label="Abrindo seu jogo…" />
      ) : // Espera do guia da tarefa (deep link do Pensa) e espera do pacote viram
      // UMA só: os dois correm em paralelo, e mostrar dois textos diferentes em
      // sequência fazia `/estudio?tarefa=` ter uma tela a mais.
      // ⚠️ Com a missão anterior ainda na mão (troca de missão no MESMO editor), a espera da
      // nova NÃO troca o editor pela tela de carregamento: canvas, desfazer e posição ficam
      // (ver `useStudioTaskHandoff`).
      (taskHandoffStatus === 'loading' && !taskHandoff) || mod === null ? (
        <EmbeddedAppLoadingBody label="Carregando o Estúdio…" />
      ) : (
        // A moldura é BLOCO e a lista/o editor se dimensionam por `h-full`; o Provider
        // não é elemento DOM, então nada entra no fluxo. A região viva do selo fica no
        // host (sr-only, absoluta: também fora do fluxo).
        <mod.StudioHostChromeProvider value={hostChrome}>
          <HostChromeAnnouncer text={announcement} />
          {view.name === 'list' ? (
            <mod.ProjectList
              onOpenProject={openProject}
              theme={studioTheme}
              professional={proAvailable}
              proCreationTemplates={proCreationTemplates}
              initialExtensions={tier.initialExtensions}
              allowedExtensions={tier.allowedExtensions}
              showExamples={showExamples}
            />
          ) : (
            <StudioFullEditor
              mod={mod}
              projectId={view.projectId}
              onExit={exitEditor}
              share={share}
              tutor={tutor}
              theme={studioTheme}
              tier={tier}
              showExamples={showExamples}
              professional={proAvailable && tier.canPromoteToPro}
              taskSession={taskSession}
              pintaLibrary={pintaLibrary}
              moldaLibrary={moldaLibrary}
              teamLibrary={teamLibrary}
            />
          )}
        </mod.StudioHostChromeProvider>
      )}
    </div>
  )
}
