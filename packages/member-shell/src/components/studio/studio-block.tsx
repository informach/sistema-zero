'use client'

import '@sistemazero/studio/styles.css'
import type { Project, StudioHandle } from '@sistemazero/studio'
import { Button } from '@sistemazero/ui/button'
import { Spinner } from '@sistemazero/ui/spinner'
import { CheckCircle2, Maximize2, Minimize2, Send } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { type ApiError, apiSend } from '../../lib/api'
import { cn } from '../../lib/cn'
import type { StudioBlock, StudioStateView, StudioSubmissionResultView } from '../../lib/types'
import { useLessonPlayer } from '../lesson-player-context'

interface Props {
  blockId: string
  content: StudioBlock
  /** Estado da entrega vindo do GET da aula (já enviou? quando?). */
  studioState: StudioStateView | null
}

type StudioComponent = typeof import('@sistemazero/studio')['StudioLesson']

/**
 * Bloco Estúdio: renderiza o @sistemazero/studio pré-configurado pelo admin (versão
 * LIMITADA — sem gerenciamento de projetos; terminal/IA/export OFF). O rascunho do
 * aluno persiste LOCAL (IndexedDB nativo da lib, chaveado por bloco); "Enviar para o
 * professor" sobe o MESMO JSON do "Exportar projeto" — destrava a conclusão da aula
 * (gate do backend). "Expandir" leva o editor à tela cheia para trabalhar melhor.
 *
 * Carregado SÓ no client (Monaco/Blockly/IndexedDB não existem no SSR): o import
 * dinâmico do editor roda dentro de um effect — o server renderiza só o placeholder.
 */
export function StudioBlockView({ blockId, content, studioState }: Props) {
  const player = useLessonPlayer()
  const lessonId = player?.lessonId ?? ''
  // Id estável por bloco — o autosave local retoma o WIP no mesmo navegador.
  const projectId = `sz-lesson-studio:${blockId}`

  const [StudioLesson, setStudioLesson] = useState<StudioComponent | null>(null)
  const [seed, setSeed] = useState<Project | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(studioState?.submitted ?? false)
  const [submittedAt, setSubmittedAt] = useState<string | null>(studioState?.submittedAt ?? null)
  const [score, setScore] = useState<number | null>(studioState?.lastScore ?? null)
  const [passed, setPassed] = useState<boolean>(studioState?.passed ?? false)
  const [xp, setXp] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  const activity = content.activity
  const passingScore = activity?.passingScore

  const handleRef = useRef<StudioHandle | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Client-only: carrega o editor e semeia do rascunho LOCAL (se houver) ou do
  // projeto inicial do admin. Semear DEPOIS do read evita re-hidratar por cima do WIP.
  useEffect(() => {
    let active = true
    void (async () => {
      const mod = await import('@sistemazero/studio')
      if (!active) return
      setStudioLesson(() => mod.StudioLesson)
      const existing = await mod
        .createLocalPersistenceAdapter()
        .load(projectId)
        .catch(() => null)
      if (!active) return
      setSeed(existing ?? { ...(content.initialProject as Project), id: projectId })
    })()
    return () => {
      active = false
    }
  }, [projectId, content.initialProject])

  // Sincroniza o estado quando o fullscreen sai pelo Esc/gesto do SO.
  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void el.requestFullscreen?.()
  }, [])

  const submit = useCallback(async () => {
    const project = handleRef.current?.getProject()
    if (!project) return
    setSubmitting(true)
    setError(null)
    try {
      // Resultado da auto-correção rodada no editor (correção híbrida): o servidor
      // RECALCULA a estrutura e registra estes p/ comportamento/teste/código.
      const run = handleRef.current?.getActivityResult() ?? null
      const results = run
        ? run.results.map((r) => ({ checkId: r.checkId, passed: r.passed, message: r.message }))
        : undefined
      const res = await apiSend<StudioSubmissionResultView>(
        `/api/members/lessons/${encodeURIComponent(lessonId)}/blocks/${encodeURIComponent(blockId)}/studio-submission`,
        'POST',
        activity ? { project, results } : { project },
      )
      setSubmitted(true)
      setSubmittedAt(res.submittedAt)
      if (res.score !== undefined) setScore(res.score)
      if (res.passed !== undefined) setPassed(res.passed)
      setXp(res.gamification?.xpAwarded ?? null)
      // Destrava o "Concluir aula" (gate do backend) → re-render da página.
      player?.refreshAfterStudio?.()
    } catch (err) {
      const apiErr = err as ApiError
      setError(
        apiErr?.code === 'PAYLOAD_TOO_LARGE'
          ? 'Seu projeto está muito grande para enviar.'
          : 'Não foi possível enviar o projeto. Tente de novo.',
      )
    } finally {
      setSubmitting(false)
    }
  }, [lessonId, blockId, player, activity])

  const ready = StudioLesson !== null && seed !== null

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="sz-display text-base">Atividade no Estúdio</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleFullscreen} disabled={!ready}>
            {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            {fullscreen ? 'Reduzir' : 'Expandir'}
          </Button>
          <Button size="sm" onClick={submit} disabled={submitting || !ready}>
            {submitting ? <Spinner /> : <Send className="size-4" />}
            {submitted ? 'Reenviar ao professor' : 'Enviar para o professor'}
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={cn(
          'overflow-hidden rounded-lg border border-border bg-muted',
          fullscreen ? 'h-screen' : 'h-[36rem]',
        )}
      >
        {ready ? (
          // StudioLesson já desliga terminal/IA/profissional/export; aqui o
          // aluno corta também as extensões (editor enxuto na aula).
          <StudioLesson
            ref={handleRef}
            initialProject={seed as Project}
            persistence="local"
            level={content.level}
            allowBlocks={content.allowBlocks}
            allowCategories={content.allowCategories}
            allowedModes={content.allowedModes}
            allowLevelReveal={content.allowLevelReveal}
            activity={content.activity}
            features={{ extensions: false }}
            blockUnloadWhenDirty={false}
          />
        ) : (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Spinner /> Carregando o Estúdio...
          </div>
        )}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {/* Nota da auto-correção (quando o bloco tem atividade). O feedback POR
          checagem é instantâneo no painel do editor (botão "Verificar"). */}
      {activity && score !== null ? (
        <p className="inline-flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">Sua nota: {score}/100</span>
          {passingScore !== undefined ? (
            <span className={passed ? 'text-accent dark:text-primary' : 'text-muted-foreground'}>
              {passed
                ? '· você atingiu a nota mínima'
                : `· precisa de ${passingScore} para concluir`}
            </span>
          ) : null}
          {xp ? <span className="text-accent dark:text-primary">· +{xp} XP</span> : null}
        </p>
      ) : null}

      {submitted ? (
        <p className="inline-flex items-center gap-2 text-sm text-accent dark:text-primary">
          <CheckCircle2 className="size-4" />
          Projeto enviado ao professor
          {submittedAt ? ` em ${new Date(submittedAt).toLocaleString('pt-BR')}` : ''}.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {passingScore !== undefined
            ? 'Use "Verificar" no editor e envie ao professor — atinja a nota mínima para concluir a aula.'
            : 'Envie seu projeto ao professor para poder concluir a aula.'}
        </p>
      )}
    </div>
  )
}
