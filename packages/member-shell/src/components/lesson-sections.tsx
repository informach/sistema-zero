'use client'

import {
  defaultLessonSection,
  isInteractiveBlock,
  type LearningBlockProgress,
  type LessonLearningProgress,
  lessonCompletionRequirements,
} from '@sistemazero/core/learning'
import { Button } from '@sistemazero/ui/button'
import { ArrowLeft, ArrowRight, ExternalLink, List, MessageCircle } from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

export function LessonSections({
  lesson,
  renderBlocks,
  kids = false,
}: {
  lesson: LessonDetailView
  renderBlocks: (blocks: LessonBlockView[]) => ReactNode
  kids?: boolean
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
  const savedSection = lesson.learningProgress?.sectionId
  const [selected, setSelected] = useState(
    () => sections.find((s) => s.id === savedSection)?.id ?? sections[0]?.id,
  )
  const index = Math.max(
    0,
    sections.findIndex((s) => s.id === selected),
  )
  const section = sections[index]
  const [visited, setVisited] = useState<Set<string>>(
    () =>
      new Set(
        section
          ? [...section.blockIds, ...(section.workspaceBlockId ? [section.workspaceBlockId] : [])]
          : [],
      ),
  )
  const [error, setError] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const [help, setHelp] = useState('')
  const [helpStatus, setHelpStatus] = useState('')
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
  const navigationQueue = useRef<Promise<void>>(Promise.resolve())
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
  function navigate(target: number, blockId?: string) {
    const next = sections[target]
    if (!next) return
    setSelected(next.id)
    setError('')
    setHelpOpen(false)
    setHelp('')
    setHelpStatus('')
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
    setDestination(blockId ?? 'heading')
    if (preview) return
    navigationQueue.current = navigationQueue.current.then(async () => {
      try {
        await apiSend(
          `/api/members/lessons/${encodeURIComponent(lesson.id)}/navigation`,
          'POST',
          { sectionId: next.id },
          { 'x-sz-viewer': player?.viewerId ?? '' },
        )
      } catch {
        setError('Não foi possível salvar a seção atual. Você pode continuar e tentar novamente.')
      }
    })
  }
  async function sendHelp() {
    if (!section || !help.trim() || sending) return
    setSending(true)
    try {
      await apiSend(
        `/api/members/lessons/${encodeURIComponent(lesson.id)}/section-help`,
        'POST',
        { sectionId: section.id, body: help.trim() },
        { 'x-sz-viewer': player?.viewerId ?? '' },
      )
      setHelp('')
      setHelpStatus('Pedido enviado. A resposta aparecerá nos seus recados.')
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
      className="space-y-2 scroll-mt-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {requirements.some((r) => r.blockId === block.id) && (
        <p className="text-sm font-medium text-muted-foreground">
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
    <div className={cn('space-y-5', kids && 'sz-lesson-sections')}>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 sm:px-5">
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
                aria-current={s.id === section.id ? 'step' : undefined}
                onClick={() => navigate(i)}
                className={cn(
                  'flex min-h-12 w-full gap-3 rounded-lg px-3 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-ring',
                  s.id === section.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
                )}
              >
                <span className="tabular-nums">{i + 1}.</span>
                <span>
                  {s.title}
                  {pending.some((r) => r.sectionId === s.id) && (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Atividade pendente
                    </span>
                  )}
                </span>
              </button>
            ))}
          </nav>
        </details>
      </div>
      <div
        className={cn(
          'grid items-start gap-6',
          hasWorkspace && '2xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]',
        )}
      >
        <div className="min-w-0 space-y-6">
          <header className="space-y-2 px-1">
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
        </div>
        <div className={hasWorkspace ? 'min-w-0 space-y-6' : 'hidden'}>
          {tools.map((block) => (
            <div key={block.id} style={{ display: activeIds.has(block.id) ? undefined : 'none' }}>
              {(visited.has(block.id) || activeIds.has(block.id)) && render(block)}
            </div>
          ))}
        </div>
      </div>
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <Button variant="outline" disabled={index === 0} onClick={() => navigate(index - 1)}>
          <ArrowLeft className="size-4" />
          Anterior
        </Button>
        {!preview && (
          <Button
            variant="ghost"
            onClick={() => setHelpOpen((open) => !open)}
            aria-expanded={helpOpen}
          >
            <MessageCircle className="size-4" />
            Preciso de ajuda
          </Button>
        )}
        <Button disabled={index === sections.length - 1} onClick={() => navigate(index + 1)}>
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
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}{' '}
          <button type="button" className="underline" onClick={() => navigate(index)}>
            Tentar novamente
          </button>
        </p>
      )}
      {index === sections.length - 1 && !lesson.completed && (
        <p className="text-center text-sm text-muted-foreground">
          Quando terminar as atividades e a criação desta aula, use o botão de concluir abaixo.
        </p>
      )}
    </div>
  )
}
