'use client'

import type { AiCreditsView } from '@sistemazero/core/ai-credits'
// O CSS do Estúdio (tokens + @theme que GERA as utilitárias sz-*) é carregado pelo
// `@import` em `app/globals.css`, DENTRO do pipeline Tailwind — um JS-import aqui só
// traz os tokens, NÃO registra as cores p/ gerar as utilitárias (sem isso os modais e
// menus do editor saem sem fundo/cor). Ver o comentário no globals.css.
import { dataUrlBase64ToBlob } from '@sistemazero/member-shell/lib/data-url'
import type { StudioTier } from '@sistemazero/member-shell/lib/studio-tier'
import { createStudioZappyAdapter } from '@sistemazero/member-shell/lib/studio-zappy-adapter'
import { useIsDesktop } from '@sistemazero/member-shell/lib/use-is-desktop'
import type {
  StudioPintaLibraryAdapter,
  StudioShareAdapter,
  StudioTaskSession,
  StudioTutorConfig,
} from '@sistemazero/studio'
import { RefreshCw } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { pensaStudioLinkKey, pensaStudioProjectId } from '../../lib/pensa-studio-link'
import { openStudioZappyLesson } from '../../lib/studio-zappy-navigation'
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
}) {
  const [mod, setMod] = useState<StudioModule | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [view, setView] = useState<View>({ name: 'list' })
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
      try {
        const m = await import('@sistemazero/studio')
        if (isCurrent && !isCurrent()) return
        // Isola o armazenamento LOCAL por PERFIL (kids): irmãos no mesmo navegador NÃO compartilham
        // a lista de projetos. ANTES de renderizar a ProjectList. Vazio (sem sessão) = store padrão.
        m.setStudioStorageNamespace(viewerId ?? '')
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
    }
  }, [loadStudio])

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
      const project = mod.createEmptyProject(
        missingTaskProject.projectId,
        missingTaskProject.projectName,
      )
      await persistence.save(project)
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
  }, [handoffProjectId, missingTaskProject, mod, viewerId])

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
        return { ok: true, asset: { ...result.asset, name: saved.name ?? result.asset.name } }
      },
    }
  }, [pintaOwned, viewerId])

  const openProject = useCallback((projectId: string) => setView({ name: 'editor', projectId }), [])
  const backToList = useCallback(() => setView({ name: 'list' }), [])
  const exitEditor = useCallback(() => {
    if (taskId) window.location.assign('/pensa')
    else backToList()
  }, [backToList, taskId])

  // O editor PREENCHE o espaço disponível: `flex-1` dentro do <main> do MainContainer
  // (no /estudio o main é `flex flex-col` de largura+altura totais). `min-h-[34rem]`
  // mantém a usabilidade em telas baixas (a página rola se não couber).
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
        <mod.ProjectList
          onOpenProject={openProject}
          theme={studioTheme}
          professional={proAvailable}
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
        />
      )}
    </div>
  )
}
