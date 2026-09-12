'use client'

import {
  defaultLessonSection,
  isInteractiveBlock,
  type LearningBlockProgress,
  type LessonLearningProgress,
  lessonCompletionRequirements,
} from '@sistemazero/core/learning'
import { Button } from '@sistemazero/ui/button'
import { ArrowLeft, ArrowRight, Check, ExternalLink, List, Lock, MessageCircle } from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { apiSend } from '../lib/api'
import { cn } from '../lib/cn'
import type { LessonBlockView, LessonDetailView } from '../lib/types'
import { InteractiveLessonBlock } from './learning-activity'
import { LessonPlayerProvider, useLessonPlayer } from './lesson-player-context'

export function useLessonLearning(lesson: LessonDetailView, viewerId: string | null) {
  const scope = `${viewerId}:${lesson.id}`
  const activeScope = useRef(scope)
  activeScope.current = scope
  const [updates, setUpdates] = useState<{
    scope: string
    values: Record<string, LearningBlockProgress>
  }>({ scope, values: {} })
  const progress = useMemo<LessonLearningProgress>(() => {
    const map = new Map((lesson.learningProgress?.blocks ?? []).map((p) => [p.blockId, p]))
    for (const p of Object.values(updates.scope === scope ? updates.values : {})) {
      const saved = map.get(p.blockId)
      if (
        (!saved || saved.updatedAt <= p.updatedAt) &&
        lesson.blocks.some((b) => b.id === p.blockId && b.blockRevision === p.revision)
      )
        map.set(p.blockId, p)
    }
    return { sectionId: lesson.learningProgress?.sectionId ?? null, blocks: [...map.values()] }
  }, [lesson.blocks, lesson.learningProgress, updates, scope])
  const onProgress = useCallback(
    (value: LearningBlockProgress) =>
      setUpdates((all) =>
        activeScope.current === scope
          ? {
              scope,
              values: { ...(all.scope === scope ? all.values : {}), [value.blockId]: value },
            }
          : all,
      ),
    [scope],
  )
  return { progress, onProgress }
}

/** Scopes video resume to this block and disables the old whole-lesson video auto-completion. */
function BlockScope({
  block,
  lesson,
  children,
}: {
  block: LessonBlockView
  lesson: LessonDetailView
  children: ReactNode
}) {
  const parent = useLessonPlayer()
  const saved = parent?.learningProgress?.blocks.find(
    (p) => p.blockId === block.id && p.revision === block.blockRevision,
  )
  const initial =
    saved?.positionSeconds ??
    (lesson.blocks.find((b) => b.kind === 'video')?.id === block.id ? lesson.positionSeconds : null)
  const seconds = useRef(initial ?? 0)
  const savedSeconds = useRef(initial ?? 0)
  const savedAt = useRef(0)
  const queue = useRef<Promise<void>>(Promise.resolve())
  const callback = useRef(parent?.onLearningProgress)
  callback.current = parent?.onLearningProgress
  const save = useCallback(
    (position: number) => {
      const rounded = Math.max(0, Math.floor(position))
      if (block.kind !== 'video' || !block.blockRevision || rounded === savedSeconds.current) return
      savedAt.current = Date.now()
      savedSeconds.current = rounded
      const body = {
        revision: block.blockRevision,
        answers: {},
        hintsUsed: 0,
        positionSeconds: rounded,
      }
      queue.current = queue.current.then(async () => {
        try {
          const response = await fetch(
            `/api/members/lessons/${encodeURIComponent(lesson.id)}/blocks/${encodeURIComponent(block.id)}/learning-progress`,
            {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                'x-sz-viewer': parent?.viewerId ?? '',
              },
              body: JSON.stringify(body),
              keepalive: true,
            },
          )
          if (!response.ok) savedSeconds.current = -1
          else callback.current?.(await response.json())
        } catch {
          savedSeconds.current = -1
        }
      })
    },
    [block.id, block.kind, block.blockRevision, lesson.id, parent?.viewerId],
  )
  useEffect(() => {
    const flush = () => save(seconds.current)
    const hide = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', hide)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', hide)
      flush()
    }
  }, [save])
  if (!parent) return children
  return (
    <LessonPlayerProvider
      value={{
        ...parent,
        initialPositionSeconds: initial,
        onVideoProgress: (position) => {
          seconds.current = position
          if (Date.now() - savedAt.current >= 10000) save(position)
        },
        onVideoFlush: (position) => {
          seconds.current = position
          save(position)
        },
      }}
    >
      {children}
    </LessonPlayerProvider>
  )
}

/** Largura da JANELA a partir da qual o lado a lado existe (o `2xl` do Tailwind). */
const SPLIT_MIN_WIDTH_PX = 1536

/** Chave do layout guardado. Mudou o `defaultSize` dos painéis? SUBA a versão. */
const SPLIT_LAYOUT_KEY = 'sz:lesson-split:v2'

/**
 * Só para DESABILITAR a divisória onde ela está escondida — o layout continua
 * decidido pelo CSS, que não pisca. Começa em `false` e aplica o valor real num
 * efeito: ler `matchMedia` no inicializador do estado quebra a hidratação
 * (React #418), pisão já documentado no modo foco do kids.
 */
function useWideEnoughForSplit(): boolean {
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${SPLIT_MIN_WIDTH_PX}px)`)
    const sync = () => setWide(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return wide
}

export function LessonSections(props: {
  lesson: LessonDetailView
  renderBlocks: (blocks: LessonBlockView[]) => ReactNode
  kids?: boolean
  /** Onde a criança está no percurso. Chamado na montagem e a cada troca de seção. */
  onSectionChange?: (posicao: { index: number; total: number }) => void
}) {
  const player = useLessonPlayer()
  return <LessonSectionsContent key={`${player?.viewerId}:${props.lesson.id}`} {...props} />
}

function LessonSectionsContent({
  lesson,
  renderBlocks,
  kids = false,
  onSectionChange,
}: {
  lesson: LessonDetailView
  renderBlocks: (blocks: LessonBlockView[]) => ReactNode
  kids?: boolean
  onSectionChange?: (posicao: { index: number; total: number }) => void
}) {
  const player = useLessonPlayer()
  const preview = player === null
  const sections = useMemo(
    () =>
      lesson.sections?.length
        ? lesson.sections
        : [
            defaultLessonSection(
              lesson.id,
              lesson.title,
              lesson.blocks.map((b) => b.id),
            ),
          ],
    [lesson.id, lesson.title, lesson.sections, lesson.blocks],
  )
  const state = lesson.sectionProgress
  const locked = (id: string) =>
    !preview && state?.sections.some((s) => s.id === id && s.status === 'locked') === true
  const savedSection = lesson.learningProgress?.sectionId
  const linkedSection = useRef('')
  const [selected, setSelected] = useState(
    () =>
      sections.find((s) => s.id === savedSection && !locked(s.id))?.id ??
      state?.sections.find((s) => s.status === 'available')?.id ??
      sections[0]?.id,
  )
  const index = Math.max(
    0,
    sections.findIndex(
      (s) =>
        s.id ===
        (locked(selected ?? '')
          ? state?.sections.find((p) => p.status === 'available')?.id
          : selected),
    ),
  )
  const section = sections[index]
  useEffect(() => {
    const hash = window.location.hash
    if (!hash.startsWith('#section=') || linkedSection.current === hash) return
    linkedSection.current = hash
    const target = hash.slice('#section='.length)
    if (
      sections.some((s) => s.id === target) &&
      (preview || !state?.sections.some((s) => s.id === target && s.status === 'locked'))
    )
      setSelected(target)
  }, [sections, state, preview])
  const [visited, setVisited] = useState<Set<string>>(
    () =>
      new Set(
        section
          ? [...section.blockIds, ...(section.workspaceBlockId ? [section.workspaceBlockId] : [])]
          : [],
      ),
  )
  const [error, setError] = useState('')
  // Nem todo erro de navegação é repetível: ver o 409 no `catch` do `navigate`.
  const [retryable, setRetryable] = useState(true)
  const [helpOpen, setHelpOpen] = useState(false)
  const [help, setHelp] = useState('')
  const [helpStatus, setHelpStatus] = useState('')
  const [helpThreadId, setHelpThreadId] = useState<string | null>(null)
  const helpRequest = useRef<{ body: string; sectionId: string; id: string } | null>(null)
  const [sending, setSending] = useState(false)
  const requirements = lessonCompletionRequirements({
    ...lesson,
    learningProgress: player?.learningProgress ?? lesson.learningProgress,
  })
  const pending = requirements.filter((r) => !r.complete)
  const [destination, setDestination] = useState<string | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const indexMenu = useRef<HTMLDetailsElement>(null)
  const requirementsMenu = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    if (!destination) return
    const element =
      destination === 'heading'
        ? heading.current
        : document.getElementById(`lesson-block-${destination}`)
    element?.focus()
    element?.scrollIntoView({
      block: destination === 'heading' ? 'start' : 'center',
      behavior: 'instant',
    })
    setDestination(null)
  }, [destination])
  const navigationBusy = useRef(false)
  const lastNavigation = useRef<{ sectionId: string; blockId?: string } | null>(null)
  const [navigating, setNavigating] = useState(false)
  // ⚠️ ANTES do return antecipado abaixo: hook chamado depois de um `return` roda
  // condicionalmente e desalinha a ordem dos hooks entre renders.
  const wideEnough = useWideEnoughForSplit()
  const registrouAbertura = useRef(false)
  // Abrir a aula REGISTRA a seção em que a criança entrou. A navegação só grava em
  // TRANSIÇÃO, então quem abre e fica na primeira seção nunca criava linha — e é o
  // `updated_at` dela que alimenta o "continuar de onde parou" do card do curso.
  // Silencioso de propósito: isto é telemetria de retomada, e falhar aqui não pode
  // virar erro na cara da criança (a navegação de verdade, essa sim, avisa).
  // biome-ignore lint/correctness/useExhaustiveDependencies: montagem, uma vez só
  useEffect(() => {
    if (registrouAbertura.current || preview || !selected) return
    registrouAbertura.current = true
    void apiSend(
      `/api/members/lessons/${encodeURIComponent(lesson.id)}/navigation`,
      'POST',
      { sectionId: selected },
      { 'x-sz-viewer': player?.viewerId ?? '' },
      { keepalive: true },
    ).catch(() => {})
  }, [])
  // A barra do topo mora FORA daqui (no player de cada app) e o índice é estado
  // DAQUI, que muda no CLIENTE ao avançar de seção — o `learningProgress.sectionId`
  // do servidor só se mexe num refresh, então a barra congelaria na seção de entrada.
  // ⚠️ O índice é DERIVADO (ele muda também quando a seção escolhida vem `locked` e
  // quando o servidor devolve um `sectionProgress` novo), por isso o aviso mora num
  // efeito e não dentro do `navigate()`, que perderia esses dois caminhos.
  // ⚠️ O callback vai num REF: quem passar uma função INLINE trocaria a identidade a
  // cada render do pai e, com ela nas deps, o efeito reentraria em laço (pai
  // setState → render → efeito → setState…). Nas deps ficam só os dois números.
  const avisarSecao = useRef(onSectionChange)
  avisarSecao.current = onSectionChange
  const totalSecoes = sections.length
  useEffect(() => {
    if (totalSecoes > 0) avisarSecao.current?.({ index, total: totalSecoes })
  }, [index, totalSecoes])
  if (!section) return null
  const activeIds = new Set([
    ...section.blockIds,
    ...(section.workspaceBlockId ? [section.workspaceBlockId] : []),
  ])
  const supportIds = new Set(lesson.supportBlockIds ?? [])
  const tools = lesson.blocks.filter(
    (b) => (b.kind === 'studio' || b.kind === 'pinta') && !supportIds.has(b.id),
  )
  const hasWorkspace = tools.some((b) => activeIds.has(b.id))
  // A divisória só é interativa onde ela APARECE. Ver o comentário no handle.
  const arrastavel = hasWorkspace && wideEnough
  async function navigate(target: number, blockId?: string) {
    const next = sections[target]
    if (!next || locked(next.id) || navigationBusy.current) return
    lastNavigation.current = { sectionId: next.id, blockId }
    navigationBusy.current = true
    setNavigating(true)
    setError('')
    try {
      if (!preview)
        await apiSend(
          `/api/members/lessons/${encodeURIComponent(lesson.id)}/navigation`,
          'POST',
          { sectionId: next.id },
          { 'x-sz-viewer': player?.viewerId ?? '' },
          // `keepalive`: trocar de seção e fechar a aba é comum, e sem isso o
          // navegador cancela o pedido no unload.
          { keepalive: true },
        )
      setSelected(next.id)
      setHelpOpen(false)
      setHelp('')
      setHelpStatus('')
      setHelpThreadId(null)
      setVisited(
        (old) =>
          new Set([
            ...old,
            ...next.blockIds,
            ...(next.workspaceBlockId ? [next.workspaceBlockId] : []),
          ]),
      )
      if (indexMenu.current) indexMenu.current.open = false
      if (requirementsMenu.current) requirementsMenu.current.open = false
      setDestination(blockId && blockId !== next.id ? blockId : 'heading')
    } catch (e) {
      // Trocar de perfil no meio da aula devolve 409 VIEWER_CHANGED: aqui repetir
      // NUNCA funciona, então quem fala é o servidor e o botão some. Sem isto a
      // criança lê "tente novamente" para um erro que só passa reabrindo a aula.
      if ((e as { code?: string } | null)?.code === 'VIEWER_CHANGED') {
        setError((e as { message?: string }).message ?? 'O perfil mudou. Abra a aula de novo.')
        setRetryable(false)
      } else {
        setError(
          'Não foi possível abrir esta seção. Suas respostas foram mantidas. Tente novamente.',
        )
        setRetryable(true)
      }
    } finally {
      navigationBusy.current = false
      setNavigating(false)
    }
  }
  async function sendHelp() {
    if (!section || !help.trim() || sending) return
    if (
      helpRequest.current?.body !== help.trim() ||
      helpRequest.current?.sectionId !== section.id
    ) {
      helpRequest.current = { body: help.trim(), sectionId: section.id, id: crypto.randomUUID() }
    }
    setSending(true)
    try {
      const result = await apiSend<{ threadId: string }>(
        `/api/members/lessons/${encodeURIComponent(lesson.id)}/section-help`,
        'POST',
        { sectionId: section.id, body: help.trim(), requestId: helpRequest.current.id },
        { 'x-sz-viewer': player?.viewerId ?? '' },
      )
      setHelp('')
      setHelpStatus('Pedido enviado. A resposta aparecerá nos seus recados.')
      setHelpThreadId(result.threadId)
      helpRequest.current = null
      setHelpOpen(false)
    } catch {
      setHelpStatus('Não foi possível enviar. Seu texto continua aqui para tentar novamente.')
    } finally {
      setSending(false)
    }
  }
  const blockById = new Map(lesson.blocks.map((b) => [b.id, b]))
  const render = (block: LessonBlockView) => (
    <div
      key={`${block.id}:${block.blockRevision ?? ''}`}
      id={`lesson-block-${block.id}`}
      tabIndex={-1}
      // `sz-lesson-block`: gancho ESTÁVEL do tema do kids (cada bloco vira um cartão
      // lá). Sem regra aqui: a comunidade adulta não carrega aquele CSS.
      className="sz-lesson-block space-y-2 scroll-mt-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {requirements.some((r) => r.blockId === block.id) && (
        // `sz-lesson-requirement` + `data-done`: ganchos do tema do kids (a concluída
        // vira verde com o ✓ lá). O texto é o mesmo nos dois apps.
        <p
          className="sz-lesson-requirement text-sm font-medium text-muted-foreground"
          data-done={requirements.find((r) => r.blockId === block.id)?.complete || undefined}
        >
          {requirements.find((r) => r.blockId === block.id)?.complete
            ? 'Atividade concluída'
            : 'Atividade obrigatória'}
        </p>
      )}
      <BlockScope block={block} lesson={lesson}>
        {block.kind === 'interactive' && preview && !isInteractiveBlock(block.content) ? (
          <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
            Complete a descoberta interativa para experimentar a prévia.
          </p>
        ) : block.kind === 'interactive' ? (
          <InteractiveLessonBlock
            block={block}
            previewContent={
              preview && isInteractiveBlock(block.content) ? block.content : undefined
            }
          />
        ) : (
          renderBlocks([block])
        )}
      </BlockScope>
    </div>
  )
  return (
    <LessonPlayerProvider
      value={
        player
          ? {
              ...player,
              sectionProjectCheck:
                section.completion?.projectChecks?.length && section.workspaceBlockId && state
                  ? {
                      sectionId: section.id,
                      revision: state.revision,
                      blockId: section.workspaceBlockId,
                      objectives: section.completion.projectChecks,
                    }
                  : undefined,
              submissionAllowedBlockIds: state
                ? sections.filter((s) => !locked(s.id)).flatMap((s) => s.blockIds)
                : undefined,
            }
          : null
      }
    >
      <div className={cn('space-y-5', kids && 'sz-lesson-sections')}>
        {/* `sz-lesson-toolbar`: gancho ESTÁVEL para o tema do kids. Por posição não
            funciona — a barra já perdeu um `:first-of-type` quando outro elemento
            entrou na frente dela. */}
        <div className="sz-lesson-toolbar flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 sm:px-5">
          <details ref={requirementsMenu} className="relative">
            <summary className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
              O que falta para concluir · {pending.length}
            </summary>
            <div className="absolute left-0 z-30 mt-2 max-h-96 w-80 max-w-[85vw] overflow-y-auto rounded-xl border border-border bg-card p-3 shadow-lg">
              {requirements.length === 0 ? (
                <p className="p-2 text-sm text-muted-foreground">
                  Explore o conteúdo e conclua a aula quando terminar.
                </p>
              ) : (
                requirements.map((r) => (
                  <button
                    key={r.blockId}
                    type="button"
                    disabled={navigating || Boolean(r.sectionId && locked(r.sectionId))}
                    className="flex min-h-12 w-full flex-col gap-1 rounded-lg p-3 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                    onClick={() => {
                      const target = sections.findIndex((s) => s.id === r.sectionId)
                      if (target >= 0) navigate(target, r.blockId)
                    }}
                  >
                    <span className="text-sm font-medium">
                      {r.complete ? '✓ ' : ''}
                      {r.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {r.complete ? 'Concluído' : r.action}
                    </span>
                  </button>
                ))
              )}
            </div>
          </details>
          <details ref={indexMenu} className="relative">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-3 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
              <List className="size-4" />
              Índice da aula
            </summary>
            <nav
              aria-label="Seções da aula"
              className="absolute right-0 z-30 mt-2 max-h-96 w-72 max-w-[85vw] overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-lg"
            >
              {sections.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={navigating || locked(s.id)}
                  aria-current={s.id === section.id ? 'step' : undefined}
                  onClick={() => navigate(i)}
                  className={cn(
                    'flex min-h-12 w-full gap-3 rounded-lg px-3 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-ring',
                    s.id === section.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
                  )}
                >
                  <span className="tabular-nums">
                    {locked(s.id) ? (
                      <Lock className="size-4" aria-label="Bloqueada" />
                    ) : state?.sections.find((p) => p.id === s.id)?.status === 'completed' ? (
                      <Check className="size-4" aria-label="Concluída" />
                    ) : (
                      `${i + 1}.`
                    )}
                  </span>
                  <span>
                    {s.title}
                    {locked(s.id) ? (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Abre após concluir a anterior
                      </span>
                    ) : (
                      pending.some((r) => r.sectionId === s.id) && (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          Atividade pendente
                        </span>
                      )
                    )}
                  </span>
                </button>
              ))}
            </nav>
          </details>
        </div>
        {/* ⚠️ Era um grid `0.8fr/1.2fr`. Foi ELE que derrubou a largura do vídeo de
            ~900-1290px para ~350-505px, e o Vimeo escolhe a rendition pelo tamanho
            renderizado do iframe — daí o "vídeo ruim em tela cheia" que a dona
            reportou. Agora a criança decide onde fica a divisória. */}
        <PanelGroup
          direction="horizontal"
          // Por PERFIL, não por aula: a criança ajusta a divisória uma vez e ela vale
          // para as próximas. Na prévia do admin (`preview`) não persiste nada.
          // ⚠️⚠️ A chave é VERSIONADA (`:v2`) porque a lib guarda o layout por
          // (autoSaveId, ids dos Panel) e o que está guardado VENCE o `defaultSize` —
          // e ele é gravado na MONTAGEM, sem ninguém arrastar (o estado nasce `[]`, o
          // primeiro layout já difere e cai no autosave). Ou seja: o 55/45 antigo está
          // no localStorage de todo mundo que abriu uma aula. Mudou o padrão? Suba a
          // versão, senão o valor novo é letra morta.
          autoSaveId={player?.viewerId ? `${SPLIT_LAYOUT_KEY}:${player.viewerId}` : null}
          className={cn(
            // A lib injeta `display:flex; height:100%; overflow:hidden` INLINE. A página
            // de aula é fluxo de documento (quem rola é a janela) e os painéis têm popover
            // e `sticky` dentro, então os três precisam ser desfeitos.
            'block! h-auto! items-start overflow-visible!',
            hasWorkspace && '2xl:flex!',
          )}
        >
          <Panel
            id="lesson-content"
            order={1}
            defaultSize={50}
            minSize={30}
            className="min-w-0 space-y-6 overflow-visible!"
          >
            {/* `sz-lesson-section-head`: gancho ESTÁVEL do tema do kids, onde o título
                abre o primeiro cartão da seção. */}
            <header className="sz-lesson-section-head space-y-2 px-1">
              <h2
                ref={heading}
                tabIndex={-1}
                className={cn(
                  'scroll-mt-6 text-2xl font-semibold tracking-tight outline-none sm:text-3xl',
                  kids && 'sz-display',
                )}
              >
                {section.title}
              </h2>
            </header>
            {section.blockIds
              .map((id) => blockById.get(id))
              .filter(
                (b): b is LessonBlockView =>
                  Boolean(b) && b?.kind !== 'studio' && b?.kind !== 'pinta',
              )
              .map(render)}
            {section.externalTool && (
              <a
                href={`/${section.externalTool}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-primary/25 bg-primary/5 px-5 py-4 font-medium text-primary"
              >
                Abrir {section.externalTool === 'pinta' ? 'meu Pinta' : 'meu Estúdio'}
                <ExternalLink className="size-5" />
                <span className="sr-only">em outra aba</span>
              </a>
            )}
          </Panel>
          {/* SEMPRE montado, como os dois Panel: tirar e pôr um filho do PanelGroup
              reordena a árvore e REMONTA o editor da direita (Blockly caro, rascunho
              re-semeado). Só as classes mudam.
              ⚠️ Mas montado E escondido não basta: a lib registra a área de arrasto no
              mount e a acha por `getBoundingClientRect()`, que num `display:none` é
              {0,0,0,0} — e o guarda de "tem elemento por cima" usa comparação estrita,
              então retângulo de área zero nunca é descartado. O resultado era uma zona
              de arrasto FANTASMA no canto (0,0) da tela, com a folga de toque de 20px:
              a criança encostava no canto do tablet, o `pointerdown` morria na captura
              do body e um arrasto invisível gravava lixo na divisória do perfil. Por
              isso `disabled`, que a lib respeita pulando o registro sem desmontar. */}
          <PanelResizeHandle
            disabled={!arrastavel}
            // Parada de Tab só onde ela ARRASTA: a lib mantém `tabIndex` 0 mesmo
            // desabilitada, mas o teclado dela é gateado por `disabled` — seria um
            // foco que não faz nada.
            tabIndex={arrastavel ? 0 : -1}
            // `role="separator"` focável precisa de NOME: a lib põe `aria-controls` e
            // `aria-valuemin/max/now` por JS, mas nenhum rótulo (o leitor dizia só
            // "separador, 50"). A seção pode ter Estúdio OU Pinta, então o texto não
            // nomeia a ferramenta.
            aria-label={
              kids
                ? 'Mudar o tamanho dos dois lados'
                : 'Ajustar a divisão entre o conteúdo e a ferramenta'
            }
            // 24px de traço + 20 de folga de cada lado = alvo bem acima dos 44px da casa.
            hitAreaMargins={{ coarse: 20, fine: 6 }}
            className={cn(
              // `sz-lesson-split-handle`/`-grip`: ganchos ESTÁVEIS do tema (invariante
              // 8). Sem regra aqui — cada app veste no CSS dele.
              'sz-lesson-split-handle group/split relative hidden w-6 shrink-0 cursor-col-resize rounded-full',
              // ⚠️⚠️ `self-stretch`: o PanelGroup é `items-start`, então filho sem
              // altura PRÓPRIA mede zero no eixo cruzado — e o traço daqui é
              // `inset-y-0` DENTRO dele. A divisória tinha 24x0: invisível, e
              // agarrável só numa tira no alto da coluna (a lib acha a zona de
              // arrasto por `getBoundingClientRect()` + a folga). Era por isso que
              // "não tinha resize".
              'self-stretch',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              // `flex` + centro: CENTRA a pega que o tema desenhar, sem o app ter de
              // repetir o 1536 num `@media` próprio.
              hasWorkspace && '2xl:flex 2xl:items-center 2xl:justify-center',
            )}
          >
            <span
              aria-hidden="true"
              className="sz-lesson-split-grip pointer-events-none absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-border transition-colors group-hover/split:bg-primary group-data-[resize-handle-state=drag]/split:bg-primary"
            />
          </PanelResizeHandle>
          <Panel
            id="lesson-tool"
            order={2}
            defaultSize={50}
            minSize={30}
            className={cn(
              // Fora do flex (empilhado) o `gap-6` do grid antigo não existe mais.
              'mt-6 overflow-visible! 2xl:mt-0',
              hasWorkspace ? 'min-w-0 space-y-6' : 'hidden',
            )}
          >
            {tools.map((block) => (
              <div key={block.id} style={{ display: activeIds.has(block.id) ? undefined : 'none' }}>
                {(visited.has(block.id) || activeIds.has(block.id)) && render(block)}
              </div>
            ))}
          </Panel>
        </PanelGroup>
        {supportIds.size > 0 && (
          <details className="rounded-2xl border border-border bg-card p-4">
            <summary className="min-h-11 cursor-pointer py-2 font-medium focus-visible:outline-2 focus-visible:outline-ring">
              Materiais de apoio
            </summary>
            <div className="space-y-6 pt-4">
              {lesson.blocks.filter((b) => supportIds.has(b.id)).map(render)}
            </div>
          </details>
        )}
        {state?.sections
          .find((s) => s.id === section.id)
          ?.pending.map((message) => (
            <p key={message} className="text-sm text-muted-foreground">
              {message}
            </p>
          ))}
        {/* `sz-lesson-nav`: gancho ESTÁVEL, mesmo espírito do `sz-lesson-toolbar`.
            Sem ele o kids teria de mirar por estrutura ("a div com border-t"). */}
        <div className="sz-lesson-nav flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
          <Button
            variant="outline"
            className="sz-lesson-nav-prev"
            disabled={index === 0 || navigating}
            onClick={() => navigate(index - 1)}
          >
            <ArrowLeft className="size-4" />
            Anterior
          </Button>
          {!preview && (
            <Button
              variant="ghost"
              className="sz-lesson-nav-help"
              onClick={() => setHelpOpen((open) => !open)}
              aria-expanded={helpOpen}
            >
              <MessageCircle className="size-4" />
              Preciso de ajuda
            </Button>
          )}
          <Button
            className="sz-lesson-nav-next"
            disabled={
              index === sections.length - 1 || navigating || locked(sections[index + 1]?.id ?? '')
            }
            onClick={() => navigate(index + 1)}
          >
            Próxima seção
            <ArrowRight className="size-4" />
          </Button>
        </div>
        {helpOpen && (
          <form
            className="space-y-3 rounded-xl border border-border bg-card p-4"
            onSubmit={(e) => {
              e.preventDefault()
              void sendHelp()
            }}
          >
            <label htmlFor={`section-help-${lesson.id}`} className="block font-medium">
              Em qual parte você ficou com dúvida?
            </label>
            <textarea
              id={`section-help-${lesson.id}`}
              value={help}
              onChange={(e) => setHelp(e.target.value)}
              maxLength={8000}
              rows={3}
              className="w-full rounded-lg border border-border bg-background p-3"
            />
            <p className="text-sm text-muted-foreground">
              O professor receberá o nome desta aula e desta seção.
            </p>
            <Button type="submit" disabled={sending || !help.trim()}>
              {sending ? 'Enviando…' : 'Enviar ao professor'}
            </Button>
          </form>
        )}
        {helpStatus && (
          <p role="status" className="text-sm">
            {helpStatus}
            {helpThreadId && (
              <a className="ml-2 underline" href={`/recados/${encodeURIComponent(helpThreadId)}`}>
                Ver conversa
              </a>
            )}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}{' '}
            {retryable && (
              <button
                type="button"
                className="underline"
                onClick={() => {
                  const retry = lastNavigation.current
                  if (retry)
                    void navigate(
                      sections.findIndex((s) => s.id === retry.sectionId),
                      retry.blockId,
                    )
                }}
              >
                Tentar novamente
              </button>
            )}
          </p>
        )}
        {index === sections.length - 1 && !lesson.completed && (
          <p className="text-center text-sm text-muted-foreground">
            Quando terminar as atividades e a criação desta aula, use o botão de concluir abaixo.
          </p>
        )}
      </div>
    </LessonPlayerProvider>
  )
}
