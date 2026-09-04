'use client'

import type { AiCreditsView } from '@sistemazero/core/ai-credits'
// O CSS do Estúdio (tokens + @theme que GERA as utilitárias sz-*) é carregado pelo
// `@import` em `app/globals.css`, DENTRO do pipeline Tailwind — um JS-import aqui só
// traz os tokens, NÃO registra as cores p/ gerar as utilitárias (sem isso os modais e
// menus do editor saem sem fundo/cor). Ver o comentário no globals.css.
import { dataUrlBase64ToBlob } from '@sistemazero/member-shell/lib/data-url'
import { requestPersistentStorage } from '@sistemazero/member-shell/lib/persistent-storage'
import type { StudioTier } from '@sistemazero/member-shell/lib/studio-tier'
import { createStudioZappyAdapter } from '@sistemazero/member-shell/lib/studio-zappy-adapter'
import { useIsDesktop } from '@sistemazero/member-shell/lib/use-is-desktop'
import type {
  StudioMoldaLibraryAdapter,
  StudioPintaLibraryAdapter,
  StudioShareAdapter,
  StudioTaskSession,
  StudioTutorConfig,
} from '@sistemazero/studio'
import { RefreshCw } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type CreationsCloud, createCreationsCloud } from '../../lib/creations-cloud'
import { pensaStudioLinkKey, pensaStudioProjectId } from '../../lib/pensa-studio-link'
import { createStudioCloudSync } from '../../lib/studio-cloud'
import { openStudioZappyLesson } from '../../lib/studio-zappy-navigation'
import { CloudSaveBadge } from './cloud-save-badge'
import { EMBEDDED_STUDIO_FRAME, EmbeddedAppLoadingBody } from './embedded-app-loading'
import { StudioFullEditor } from './studio-full-editor'
import { useStudioTaskHandoff } from './use-pensa-task-handoff'

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
  pintaOwned = false,
  moldaOwned = false,
}: {
  viewerId: string | null
  /**
   * DESAFIO do mês (game jam) — presente SÓ quando a criança possui Clube +
   * Estúdio (a página checa as refs): liga o checkbox "Participar do Desafio"
   * no Compartilhar. O gate REAL da tag é o do hub no publish.
   */
  challenge?: { key: string; title: string } | null
  /** Modos + perfil de blocos derivados do RANK do aluno (ver `resolveStudioTier`). */
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
  /**
   * Posse do PINTA (a página checa `refs=pinta,estudio-completo` numa ida) —
   * liga o "Trazer do Pinta" no painel de Imagens. Produtos vendidos à parte:
   * sem posse, o adapter nem é criado e o Estúdio esconde o botão.
   */
  pintaOwned?: boolean
  /**
   * Posse do MOLDA (a mesma ida `refs=estudio-completo,pinta,molda`) — liga o "Trazer
   * do Molda" no painel de Imagens (modelos .glb, texturas .png, céus .hdr). Sem
   * posse, o adapter nem é criado e o Estúdio esconde o botão.
   */
  moldaOwned?: boolean
}) {
  const [mod, setMod] = useState<StudioModule | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [view, setView] = useState<View>({ name: 'list' })
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
  const [taskError, setTaskError] = useState<string | null>(null)
  const [missingTaskProject, setMissingTaskProject] = useState<{
    projectId: string
    projectName: string
  } | null>(null)
  const openedTaskKeyRef = useRef<string | null>(null)
  // O Estúdio SEGUE o tema da comunidade (next-themes) — sem toggle próprio e sem
  // destoar do app ao redor. `resolvedTheme` é undefined no 1º render → cai em claro.
  const { resolvedTheme } = useTheme()
  const studioTheme: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light'
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
          const nextCloud = createCreationsCloud({ tool: 'studio', viewerId, idleMs: 10_000 })
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
      const persistence = mod.createLocalPersistenceAdapter()
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
          if (active) setTaskError('A tarefa mudou em outro lugar. Recarreguei o guia para você.')
          return
        } else if (active && response.ok && updated?.task) {
          updateTaskProgress(updated.task.progress)
        } else if (!response.ok || !updated?.task) {
          throw new Error('Não consegui vincular o projeto a esta tarefa.')
        }
      }
      if (active) setView({ name: 'editor', projectId })
    })().catch(() => {
      openedTaskKeyRef.current = null
      if (active) setTaskError('Não consegui criar ou restaurar o projeto desta tarefa.')
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

  const taskSession = useMemo<StudioTaskSession | undefined>(
    () =>
      taskHandoff
        ? {
            taskId: taskHandoff.task.id,
            title: taskHandoff.task.title,
            summary: taskHandoff.task.summary,
            project: taskHandoff.project,
            cycle: taskHandoff.cycle,
            guide: taskHandoff.task.guide,
            blocks: taskHandoff.task.context.blocks,
            progress: taskHandoff.task.progress,
            onProgress: async (input) => {
              const response = await fetch(
                `/api/pensa/tasks/${encodeURIComponent(taskHandoff.task.id)}/progress`,
                {
                  method: 'PATCH',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({
                    ...input,
                    expectedUpdatedAt: taskHandoff.task.progress.updatedAt,
                  }),
                },
              )
              const body = (await response.json().catch(() => null)) as {
                task?: { progress: StudioTaskSession['progress'] }
                error?: { message?: string }
              } | null
              if (response.status === 409) {
                retryTaskHandoff()
                throw new Error('A tarefa mudou em outro lugar. Recarreguei o guia para você.')
              }
              if (!response.ok || !body?.task)
                throw new Error(body?.error?.message ?? 'Não consegui sincronizar a tarefa.')
              updateTaskProgress(body.task.progress)
            },
          }
        : undefined,
    [taskHandoff, updateTaskProgress, retryTaskHandoff],
  )

  // Adapter de COMPARTILHAR (Mural) — standalone (SEM aula): `describe` rascunha a
  // descrição via IA no servidor (fail-soft) e `publish` sobe projeto + capa por
  // multipart à rota standalone, que devolve os links. Memoizado (o Studio o latcha).
  const share = useMemo<StudioShareAdapter>(
    () => ({
      // Desafio do mês: liga o checkbox no ShareDialog (posse checada na página).
      ...(challenge ? { challenge } : {}),
      async generateDescription({ project, title }) {
        try {
          const res = await fetch('/api/studio/describe', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              files: {
                html: project.files['index.html'],
                css: project.files['style.css'],
                js: project.files['script.js'],
              },
              title,
            }),
          })
          if (!res.ok) return ''
          const body = (await res.json()) as {
            description?: string
            quotaExceeded?: boolean
            scope?: 'day' | 'month'
          }
          // Teto de IA da conta atingido → o ShareDialog esconde o "Gerar" e cai
          // no modo manual (o throw com code é duck-typed lá).
          if (body.quotaExceeded) {
            // ⚠️ O `scope` PRECISA viajar: sem ele o dialog dizia "a ajuda de HOJE
            // acabou" mesmo quando o teto estourado era o do MÊS, mandando a
            // criança voltar amanhã para nada.
            throw Object.assign(new Error('quota de IA esgotada'), {
              code: 'AI_QUOTA_EXCEEDED' as const,
              scope: body.scope,
            })
          }
          return body.description ?? ''
        } catch (error) {
          if ((error as { code?: string })?.code === 'AI_QUOTA_EXCEEDED') throw error
          return '' // fail-soft: a criança escreve do zero
        }
      },
      async publish({ project, coverDataUrl, title, description, challengeKey }) {
        const form = new FormData()
        form.set('title', title)
        form.set('description', description)
        form.set('clientIdempotencyKey', crypto.randomUUID())
        // Tag do desafio (checkbox marcado) — o hub valida posse+mês (drop silencioso).
        if (challengeKey) form.set('challengeKey', challengeKey)
        form.set(
          'project',
          new File([JSON.stringify(project)], 'project.json', { type: 'application/json' }),
        )
        if (coverDataUrl) {
          // ⚠️ NÃO usar fetch(data:) — a CSP (connect-src) bloqueia → "Failed to fetch".
          const blob = dataUrlBase64ToBlob(coverDataUrl)
          form.set('cover', new File([blob], 'cover', { type: blob.type || 'image/png' }))
        }
        const res = await fetch('/api/studio/publish-standalone', { method: 'POST', body: form })
        const body = (await res.json().catch(() => null)) as {
          muralUrl?: string
          playUrl?: string
          error?: { message?: string }
        } | null
        if (!res.ok) {
          throw new Error(body?.error?.message ?? 'Não foi possível publicar agora.')
        }
        return { muralUrl: body?.muralUrl, playUrl: body?.playUrl }
      },
    }),
    [challenge],
  )
  const tutor = useMemo<StudioTutorConfig | undefined>(
    () =>
      zappyEnabled
        ? {
            adapter: createStudioZappyAdapter(),
            openLesson: openStudioZappyLesson,
            cooldownMs: 1_500,
            credits: aiCredits,
          }
        : undefined,
    [zappyEnabled, aiCredits],
  )

  // "Trazer do Pinta" (fluxo pull): o Estúdio lista a galeria do Pinta e importa
  // um desenho por id. O import GRAVA em personal-assets antes de devolver — é o
  // que liga o auto-update dos jogos (guard `getPersonalAsset` do resyncToStudio
  // no pinta-client) e o botão "editar desenho". Import dinâmico do SUBPATH
  // `studio-library` (⚠️ NUNCA a raiz `@sistemazero/pinta` — puxaria o app
  // inteiro do Pinta pro bundle do /estudio); namespaces re-setados DENTRO de
  // cada método (nunca confiar em "já setei" — StrictMode/trocas de perfil).
  const pintaLibrary = useMemo<StudioPintaLibraryAdapter | undefined>(() => {
    if (!pintaOwned) return undefined
    return {
      async list() {
        const lib = await import('@sistemazero/pinta/studio-library')
        lib.setPintaStorageNamespace(viewerId ?? '')
        const drawings = await lib.listGalleryForStudio()
        return drawings.map((d) => ({
          id: d.id,
          name: d.name,
          role: d.role,
          style: d.style ?? undefined,
          updatedAt: d.updatedAt,
          thumbDataUrl: d.thumbDataUrl,
          ...(d.projectName ? { projectName: d.projectName } : {}),
        }))
      },
      async import(drawingId) {
        const lib = await import('@sistemazero/pinta/studio-library')
        lib.setPintaStorageNamespace(viewerId ?? '')
        const result = await lib.exportAssetForStudio(drawingId)
        if (!result.ok) {
          if (result.reason === 'not-found') {
            return {
              ok: false,
              error: 'Esse desenho não está mais na galeria do Pinta.',
              code: 'not-found',
            }
          }
          if (result.reason === 'asset-too-big' || result.reason === 'sheet-too-big') {
            return {
              ok: false,
              error: 'Esse desenho é grande demais para o Estúdio.',
              code: 'too-big',
            }
          }
          return {
            ok: false,
            error: 'Não consegui preparar esse desenho agora. Tente de novo.',
            code: 'raster-failed',
          }
        }
        const bridge = await import('@sistemazero/studio/personal-assets')
        bridge.setPersonalAssetsNamespace(viewerId ?? '')
        const saved = await bridge.savePersonalAsset(result.asset)
        if (!saved.ok) {
          return {
            ok: false,
            error: saved.error ?? 'Não consegui trazer esse desenho agora. Tente de novo.',
          }
        }
        // O upsert pode sufixar o nome (colisão com OUTRO desenho) — o Estúdio
        // usa o nome salvo, senão os blocos referenciariam um nome divergente.
        return {
          ok: true,
          asset: {
            ...result.asset,
            name: saved.name ?? result.asset.name,
            libRevision: saved.updatedAt,
          },
        }
      },
    }
  }, [pintaOwned, viewerId])

  // "Trazer do Molda" (fluxo pull, irmão do de cima): lista a galeria 3D e importa uma
  // criação por id. O `exportAssetForStudio` já devolve o binário validado pelos tetos
  // do Estúdio (modelo .glb, textura .png, céu .hdr); o import GRAVA em personal-assets
  // (com o `kind` e o nome do arquivo) antes de devolver, pelo selo "✓ no projeto".
  // Import dinâmico do SUBPATH `studio-library` (⚠️ NUNCA a raiz `@sistemazero/molda`,
  // que puxaria o app inteiro, com three.js, pro bundle do /estudio).
  const moldaLibrary = useMemo<StudioMoldaLibraryAdapter | undefined>(() => {
    if (!moldaOwned) return undefined
    return {
      async list() {
        const lib = await import('@sistemazero/molda/studio-library')
        lib.setMoldaStorageNamespace(viewerId ?? '')
        const items = await lib.listGalleryForStudio()
        return items.map((item) => ({
          id: item.id,
          name: item.name,
          kind: item.kind,
          updatedAt: item.updatedAt,
          thumbDataUrl: item.thumbDataUrl,
        }))
      },
      async import(creationId) {
        const lib = await import('@sistemazero/molda/studio-library')
        lib.setMoldaStorageNamespace(viewerId ?? '')
        const result = await lib.exportAssetForStudio(creationId)
        if (!result.ok) {
          if (result.reason === 'not-found') {
            return {
              ok: false,
              error: 'Essa criação não está mais na galeria do Molda.',
              code: 'not-found',
            }
          }
          if (result.reason === 'asset-too-big') {
            return {
              ok: false,
              error: 'Essa criação é grande demais para o Estúdio.',
              code: 'too-big',
            }
          }
          return {
            ok: false,
            error: 'Não consegui preparar essa criação agora. Tente de novo.',
            code: 'encode-failed',
          }
        }
        const bridge = await import('@sistemazero/studio/personal-assets')
        bridge.setPersonalAssetsNamespace(viewerId ?? '')
        const saved = await bridge.savePersonalAsset({
          id: result.asset.id,
          name: result.asset.name,
          kind: result.asset.kind,
          // A textura é imagem, mas NÃO é desenho do Pinta: sem a origem o painel
          // ofereceria "editar desenho" e abriria o Pinta num id do Molda.
          origin: 'molda',
          dataUrl: result.asset.dataUrl,
          originalFileName: result.asset.originalFileName,
          ...(result.asset.width !== undefined ? { width: result.asset.width } : {}),
          ...(result.asset.height !== undefined ? { height: result.asset.height } : {}),
        })
        if (!saved.ok) {
          return {
            ok: false,
            error: saved.error ?? 'Não consegui trazer essa criação agora. Tente de novo.',
          }
        }
        // O upsert pode sufixar o nome (colisão com OUTRA criação) — o Estúdio usa o
        // nome salvo, senão os blocos referenciariam um nome divergente.
        return {
          ok: true,
          asset: {
            id: result.asset.id,
            name: saved.name ?? result.asset.name,
            kind: result.asset.kind,
            dataUrl: result.asset.dataUrl,
            originalFileName: result.asset.originalFileName,
            ...(result.asset.width !== undefined ? { width: result.asset.width } : {}),
            ...(result.asset.height !== undefined ? { height: result.asset.height } : {}),
            ...(saved.updatedAt !== undefined ? { libRevision: saved.updatedAt } : {}),
          },
        }
      },
    }
  }, [moldaOwned, viewerId])

  const openProject = useCallback((projectId: string) => setView({ name: 'editor', projectId }), [])
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
    if (taskId) window.location.assign('/pensa')
    else backToList()
  }, [backToList, taskId])

  // O editor PREENCHE o espaço disponível: `flex-1` dentro do <main> do MainContainer
  // (no /estudio o main é `flex flex-col` de largura+altura totais). `min-h-[34rem]`
  // mantém a usabilidade em telas baixas (a página rola se não couber — quem
  // garante isso TAMBÉM no desktop é o `md:min-h-[36rem]` do MainContainer,
  // par deste piso + 2rem de py; mexeu num, mexa no outro).
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
        <div className="grid h-full place-items-center p-6 text-center">
          <p className="max-w-sm font-semibold">{taskHandoff.capability.blockedReason}</p>
        </div>
      ) : missingTaskProject ? (
        <div className="grid h-full place-items-center p-6 text-center">
          <div className="flex max-w-md flex-col items-center gap-3">
            <h2 className="font-black text-xl">Este projeto não está neste aparelho</h2>
            <p className="text-muted-foreground">
              O guia e o progresso continuam salvos. Você pode recriar o projeto associado com o
              mesmo identificador e continuar por aqui.
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
      ) : // Espera do guia da tarefa (deep link do Pensa) e espera do pacote viram
      // UMA só: os dois correm em paralelo, e mostrar dois textos diferentes em
      // sequência fazia `/estudio?tarefa=` ter uma tela a mais.
      taskHandoffStatus === 'loading' || mod === null ? (
        <EmbeddedAppLoadingBody label="Carregando o Estúdio…" />
      ) : view.name === 'list' ? (
        // O selo é uma CAMADA por cima (absoluto): a moldura é BLOCO e a lista se
        // dimensiona por `h-full` — um selo no fluxo empurrava a lista para fora do
        // `overflow-hidden`. `relative` só neste ramo, para não mexer no editor.
        <div className="relative h-full">
          <div className="pointer-events-none absolute top-1 right-2 z-10">
            <CloudSaveBadge cloud={cloud} syncing={syncing} />
          </div>
          <mod.ProjectList
            onOpenProject={openProject}
            theme={studioTheme}
            professional={proAvailable}
            initialExtensions={tier.initialExtensions}
            allowedExtensions={tier.allowedExtensions}
            showExamples={showExamples}
          />
        </div>
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
        />
      )}
    </div>
  )
}
