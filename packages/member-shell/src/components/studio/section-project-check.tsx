'use client'

import { awaitWithSignal } from '@sistemazero/core/http'
import type { ProjectObjectiveResult, SectionProjectLiveContext } from '@sistemazero/core/learning'
import type { StudioHandle } from '@sistemazero/studio'
import { Button } from '@sistemazero/ui/button'
import { ChevronDown, RefreshCw, Sparkles, Target } from 'lucide-react'
import { type RefObject, useEffect, useId, useRef, useState } from 'react'
import { apiSend } from '../../lib/api'
import { codigoDoErro } from '../../lib/lesson-copy'
import type { GamificationDelta } from '../../lib/types'
import { useLessonCopy } from '../lesson-copy-context'
import { useLessonPlayer } from '../lesson-player-context'
import { type EstadoDoObjetivo as Estado, ObjectiveList } from './objective-list'

/** O que o bloco avisa quando o projeto muda (o `onChange` do Estúdio, que traz o `updatedAt`). */
export type ProjectChangeSubscriber = (
  listener: (project: { updatedAt?: number }) => void,
) => () => void

/**
 * Os OBJETIVOS da parte, embaixo do Estúdio. A faixa mantém o progresso e a verificação visíveis;
 * os detalhes recolhíveis separam obrigatórios e extras. Quem confere é o servidor: a criança manda
 * o projeto e recebe o resultado de cada objetivo, que fica guardado e volta ao reabrir a aula.
 */
export function SectionProjectCheck({
  blockId,
  handleRef,
  subscribeProjectChanges,
  live,
}: {
  blockId: string
  handleRef: RefObject<StudioHandle | null>
  subscribeProjectChanges?: ProjectChangeSubscriber
  live?: { key: string; prepare(signal: AbortSignal): Promise<SectionProjectLiveContext> }
}) {
  const player = useLessonPlayer()
  const check = player?.sectionProjectCheck
  if (!player || !check || check.blockId !== blockId || !check.objectives?.length) return null
  return (
    <ObjectivesCard
      key={`${player.viewerId}:${player.lessonId}:${check.sectionId}:${check.revision}:${live?.key ?? ''}`}
      handleRef={handleRef}
      subscribeProjectChanges={subscribeProjectChanges}
      live={live}
    />
  )
}

type CheckResponse = {
  passed: boolean
  results: ProjectObjectiveResult[]
  gamification?: GamificationDelta | null
}

function ObjectivesCard({
  handleRef,
  subscribeProjectChanges,
  live,
}: {
  handleRef: RefObject<StudioHandle | null>
  subscribeProjectChanges?: ProjectChangeSubscriber
  live?: { key: string; prepare(signal: AbortSignal): Promise<SectionProjectLiveContext> }
}) {
  const player = useLessonPlayer()
  const { verificacao, erroDoServidor } = useLessonCopy()
  const titleId = useId()
  const detailsId = useId()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ text: string; tone: 'ok' | 'falta' | 'erro' } | null>(
    null,
  )
  const [xp, setXp] = useState<number | null>(null)
  // O resultado DESTA tela vence o guardado (é mais novo); sem verificar aqui, vale o guardado.
  const [results, setResults] = useState<ProjectObjectiveResult[] | null>(null)
  const [stale, setStale] = useState(false)
  // O instante do projeto que o resultado mostrado descreve. O guardado é de antes desta tela: a
  // primeira edição depois de abrir já o deixa "de antes da mudança".
  const conferidoEm = useRef(Date.now())
  // A última edição avisada pelo Estúdio. Uma edição que chega ENQUANTO a verificação está no ar
  // é mais nova que o projeto conferido: a resposta não pode apagar o aviso dela.
  const editadoEm = useRef(0)
  const active = useRef<AbortController | null>(null)
  const unsubscribe = useRef<(() => void) | undefined>(undefined)
  const mounted = useRef(false)
  const inFlight = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      unsubscribe.current?.()
      active.current?.abort()
      active.current = null
      inFlight.current = false
    }
  }, [])

  useEffect(() => {
    if (!subscribeProjectChanges) return
    return subscribeProjectChanges((project) => {
      const quando = project.updatedAt ?? Number.POSITIVE_INFINITY
      editadoEm.current = Math.max(editadoEm.current, quando)
      if (quando > conferidoEm.current) setStale(true)
    })
  }, [subscribeProjectChanges])

  const check = player?.sectionProjectCheck
  const objectives = check?.objectives ?? []
  const shown = results ?? check?.savedResults ?? null
  const estadoDe = (id: string): Estado => {
    const r = shown?.find((item) => item.id === id)
    return r ? (r.passed ? 'passed' : 'failed') : 'unchecked'
  }
  const required = objectives.filter((o) => !o.optional)
  const extras = objectives.filter((o) => o.optional)
  const progressItems = required.length > 0 ? required : extras
  const completed = progressItems.filter((o) => estadoDe(o.id) === 'passed').length
  // "O jogo faz algo" e "a função responde certo" abrem o jogo num navegador do servidor.
  const runsGame = objectives.some(
    (o) => o.kind === 'game' || o.kind === 'function' || o.kind === 'script',
  )

  async function verify() {
    const handle = handleRef.current
    if (!check || !handle || !player || !mounted.current || inFlight.current) return
    unsubscribe.current?.()
    active.current?.abort()
    const controller = new AbortController()
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(170_000)])
    active.current = controller
    inFlight.current = true
    setBusy(true)
    setFeedback(null)
    setXp(null)
    const assertOwner = () => {
      signal.throwIfAborted()
      if (!mounted.current || active.current !== controller || handleRef.current !== handle)
        throw new DOMException('O editor desta verificação foi retirado.', 'AbortError')
    }
    const invalidate = () => {
      controller.abort()
      if (active.current !== controller || !mounted.current) return
      active.current = null
      inFlight.current = false
      setBusy(false)
      setFeedback(null)
      setXp(null)
      setStale(true)
    }
    try {
      // Wait for the same editor's bridge parser, never an abandoned snapshot.
      let project = handle.getProject()
      for (let tries = 0; project?.bridgeCodeAhead && tries < 15; tries++) {
        await awaitWithSignal(
          () => new Promise<void>((resolve) => setTimeout(resolve, 200)),
          signal,
        )
        assertOwner()
        project = handle.getProject()
      }
      assertOwner()
      const liveContext = live
        ? await awaitWithSignal(() => live.prepare(signal), signal)
        : undefined
      assertOwner()
      if (!live) await awaitWithSignal(() => handle.save(), signal)
      assertOwner()
      project = handle.getProject()
      if (!project) return
      const submitted = JSON.stringify(project)
      unsubscribe.current = handle.onProjectChange?.(invalidate)
      const assertCurrent = () => {
        assertOwner()
        if (JSON.stringify(handle.getProject()) !== submitted) {
          invalidate()
          throw new DOMException('O projeto mudou durante a verificação.', 'AbortError')
        }
      }
      assertCurrent()
      const result = await awaitWithSignal(
        () =>
          apiSend<CheckResponse>(
            `/api/members/lessons/${encodeURIComponent(player.lessonId)}/sections/${encodeURIComponent(check.sectionId)}/project-check`,
            'POST',
            { revision: check.revision, project, ...(liveContext ? { liveContext } : {}) },
            { 'x-sz-viewer': player.viewerId ?? '' },
            { signal },
          ),
        signal,
      )
      assertCurrent()
      conferidoEm.current = project.updatedAt ?? Date.now()
      setResults(result.results)
      if (result.results.some((objective) => !objective.passed)) setDetailsOpen(true)
      setStale(editadoEm.current > conferidoEm.current)
      const extraFaltando = extras.some((o) => !result.results.find((r) => r.id === o.id)?.passed)
      // Parte só com desafios extras: o servidor diz `passed: false` (não há obrigatório para
      // cumprir), mas para a criança nada FALTA. Ela lê o estado dos extras.
      setFeedback(
        required.length === 0
          ? {
              text: extraFaltando ? verificacao.soExtras : verificacao.cumprido,
              tone: 'ok',
            }
          : result.passed
            ? {
                text: extraFaltando ? verificacao.cumpridoComExtra : verificacao.cumprido,
                tone: 'ok',
              }
            : { text: verificacao.faltou, tone: 'falta' },
      )
      const ganho = result.gamification?.xpAwarded ?? 0
      setXp(ganho > 0 ? ganho : null)
      // Só quando passou (11/10/2026), como o "Verificar minha ação": a resposta "ainda não" não
      // muda nada na aula, e cada atualização da página custava o modo ampliado (com build novo no
      // servidor ela vira recarregamento) e refazia a página inteira no servidor. O resultado de
      // cada objetivo já veio na resposta e fica nesta tela.
      if (result.passed) player.refreshAfterLearning?.()
    } catch (error) {
      if (
        !mounted.current ||
        controller.signal.aborted ||
        active.current !== controller ||
        handleRef.current !== handle
      )
        return
      // ⚠️ O erro da API é um objeto simples (`ApiError`), não um `Error`: quem decide a frase é
      // o `erroDoServidor` (a rede sem `code` cai no padrão).
      setFeedback({
        text:
          codigoDoErro(error) === 'PAYLOAD_TOO_LARGE'
            ? verificacao.grandeDemais
            : erroDoServidor(error, verificacao.erro),
        tone: 'erro',
      })
    } finally {
      if (active.current === controller) {
        inFlight.current = false
        setBusy(false)
      }
    }
  }

  return (
    <section
      className="sz-lesson-objectives flex shrink-0 flex-col gap-2 rounded-xl border bg-card px-3 py-2"
      aria-labelledby={titleId}
      data-stale={stale ? 'true' : undefined}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h3 id={titleId} className="sz-lesson-objectives-title min-w-0 font-semibold">
          <button
            type="button"
            className="flex min-h-11 items-center gap-2 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-ring"
            aria-expanded={detailsOpen}
            aria-controls={detailsId}
            onClick={() => setDetailsOpen((open) => !open)}
          >
            <Target className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="flex flex-wrap items-baseline gap-x-3">
              <span>{verificacao.objetivos}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {required.length === 0 ? `${verificacao.extras}: ` : ''}
                {verificacao.progresso(completed, progressItems.length)}
              </span>
            </span>
            <ChevronDown
              className={`size-4 shrink-0 ${detailsOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            className="sz-lesson-objectives-action"
            variant={stale || !shown ? 'default' : 'outline'}
            disabled={busy}
            onClick={() => void verify()}
          >
            {busy ? (runsGame ? verificacao.testando : verificacao.verificando) : verificacao.botao}
          </Button>
          {xp ? (
            <span className="sz-lesson-objectives-xp text-sm font-semibold text-primary">
              {verificacao.xp(xp)}
            </span>
          ) : null}
        </div>
      </div>
      <div
        id={detailsId}
        hidden={!detailsOpen}
        className="sz-lesson-objectives-details max-h-48 space-y-3 overflow-y-auto overscroll-contain pr-1"
      >
        {required.length > 0 ? (
          <ObjectiveList items={required} estadoDe={estadoDe} stale={stale} />
        ) : null}
        {extras.length > 0 ? (
          <div className="sz-lesson-objectives-extras space-y-2">
            <p className="sz-lesson-objectives-extras-title flex flex-wrap items-baseline gap-x-2 text-sm font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="size-4 text-primary" aria-hidden="true" />
                {verificacao.extras}
              </span>
              <span className="sz-lesson-objectives-extras-note text-xs font-normal text-muted-foreground">
                {verificacao.extrasNota}
              </span>
            </p>
            <ObjectiveList items={extras} estadoDe={estadoDe} stale={stale} extra />
          </div>
        ) : null}
      </div>
      {stale && shown ? (
        <p className="sz-lesson-objectives-stale flex items-start gap-2 text-sm text-muted-foreground">
          <RefreshCw className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {verificacao.mudou}
        </p>
      ) : null}
      {/* Sempre montada (região viva só anuncia o que muda dentro dela). */}
      <p
        role="status"
        className="sz-lesson-objectives-feedback text-sm empty:hidden"
        data-tone={feedback?.tone}
      >
        {feedback?.text ?? ''}
      </p>
    </section>
  )
}
