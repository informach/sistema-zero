'use client'

import type { ProjectObjectiveResult, ProjectObjectiveView } from '@sistemazero/core/learning'
import type { StudioHandle } from '@sistemazero/studio'
import { Button } from '@sistemazero/ui/button'
import {
  CheckCircle2,
  Circle,
  CircleDot,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Target,
} from 'lucide-react'
import { type RefObject, useEffect, useId, useRef, useState } from 'react'
import { apiSend } from '../../lib/api'
import { codigoDoErro } from '../../lib/lesson-copy'
import type { GamificationDelta } from '../../lib/types'
import { useLessonCopy } from '../lesson-copy-context'
import { useLessonPlayer } from '../lesson-player-context'

/** O que o bloco avisa quando o projeto muda (o `onChange` do Estúdio, que traz o `updatedAt`). */
export type ProjectChangeSubscriber = (
  listener: (project: { updatedAt?: number }) => void,
) => () => void

/**
 * Os OBJETIVOS da parte, embaixo do Estúdio (18/10/2026). Um botão só ("Verificar esta parte"),
 * a lista dos obrigatórios e, separada, a dos extras. Quem confere é o servidor: a criança manda
 * o projeto e recebe o resultado de cada objetivo, que fica guardado e volta ao reabrir a fase.
 */
export function SectionProjectCheck({
  blockId,
  handleRef,
  subscribeProjectChanges,
}: {
  blockId: string
  handleRef: RefObject<StudioHandle | null>
  subscribeProjectChanges?: ProjectChangeSubscriber
}) {
  const player = useLessonPlayer()
  const check = player?.sectionProjectCheck
  if (!player || !check || check.blockId !== blockId || !check.objectives?.length) return null
  return (
    <ObjectivesCard
      key={`${player.viewerId}:${check.sectionId}:${check.revision}`}
      handleRef={handleRef}
      subscribeProjectChanges={subscribeProjectChanges}
    />
  )
}

type CheckResponse = {
  passed: boolean
  results: ProjectObjectiveResult[]
  gamification?: GamificationDelta | null
}

type Estado = 'passed' | 'failed' | 'unchecked'

function ObjectivesCard({
  handleRef,
  subscribeProjectChanges,
}: {
  handleRef: RefObject<StudioHandle | null>
  subscribeProjectChanges?: ProjectChangeSubscriber
}) {
  const player = useLessonPlayer()
  const { verificacao, erroDoServidor } = useLessonCopy()
  const titleId = useId()
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
  // "O jogo faz algo" e "a função responde certo" abrem o jogo num navegador do servidor.
  const runsGame = objectives.some(
    (o) => o.kind === 'game' || o.kind === 'function' || o.kind === 'script',
  )

  async function verify() {
    if (!check || !handleRef.current || !player || busy) return
    setBusy(true)
    setFeedback(null)
    setXp(null)
    try {
      // Com o código da Ponte mais novo que os blocos, o Estúdio ainda está lendo o que a criança
      // digitou: espera um pouco (o servidor recusa esse retrato com STUDIO_PROJECT_SYNCING).
      let project = handleRef.current.getProject()
      for (let tries = 0; project?.bridgeCodeAhead && tries < 15; tries++) {
        await new Promise((resolve) => setTimeout(resolve, 200))
        project = handleRef.current?.getProject() ?? project
      }
      if (!project) return
      const result = await apiSend<CheckResponse>(
        `/api/members/lessons/${encodeURIComponent(player.lessonId)}/sections/${encodeURIComponent(check.sectionId)}/project-check`,
        'POST',
        { revision: check.revision, project },
        { 'x-sz-viewer': player.viewerId ?? '' },
      )
      conferidoEm.current = project.updatedAt ?? Date.now()
      setResults(result.results)
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
      setBusy(false)
    }
  }

  return (
    <section
      className="sz-lesson-objectives space-y-3 rounded-xl border bg-card p-4"
      aria-labelledby={titleId}
      data-stale={stale ? 'true' : undefined}
    >
      <h3 id={titleId} className="sz-lesson-objectives-title flex items-center gap-2 font-semibold">
        <Target className="size-4 text-primary" aria-hidden="true" />
        {verificacao.objetivos}
      </h3>
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
      {stale && shown ? (
        <p className="sz-lesson-objectives-stale flex items-start gap-2 text-sm text-muted-foreground">
          <RefreshCw className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {verificacao.mudou}
        </p>
      ) : null}
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

function ObjectiveList({
  items,
  estadoDe,
  stale,
  extra = false,
}: {
  items: ProjectObjectiveView[]
  estadoDe: (id: string) => Estado
  stale: boolean
  extra?: boolean
}) {
  const { verificacao } = useLessonCopy()
  return (
    <ul className="sz-lesson-objectives-list space-y-2">
      {items.map((objective) => {
        const estado = estadoDe(objective.id)
        const Icone = estado === 'passed' ? CheckCircle2 : estado === 'failed' ? CircleDot : Circle
        return (
          <li
            key={objective.id}
            className="sz-lesson-objective flex items-start gap-2.5 text-sm"
            data-state={estado}
            data-extra={extra ? 'true' : undefined}
            data-stale={stale && estado !== 'unchecked' ? 'true' : undefined}
          >
            <Icone
              className={`sz-lesson-objective-icon mt-0.5 size-5 shrink-0 ${
                estado === 'passed'
                  ? 'text-success'
                  : estado === 'failed'
                    ? 'text-primary'
                    : 'text-muted-foreground'
              }`}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              <span
                className={`sz-lesson-objective-label ${
                  stale && estado !== 'unchecked' ? 'text-muted-foreground' : ''
                }`}
              >
                {objective.label}
              </span>
              <span className="sr-only">
                {': '}
                {estado === 'passed'
                  ? verificacao.estadoCumprido
                  : estado === 'failed'
                    ? verificacao.estadoFalta
                    : verificacao.estadoNaoVerificado}
              </span>
              {/* A dica só aparece quando ajuda: depois de uma verificação em que o objetivo
                  ainda não passou. Antes disso ela tiraria a descoberta. */}
              {estado === 'failed' && objective.hint ? (
                <span className="sz-lesson-objective-hint mt-1 flex items-start gap-1.5 text-muted-foreground">
                  <Lightbulb className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    <b className="font-semibold">{verificacao.dica}:</b> {objective.hint}
                  </span>
                </span>
              ) : null}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
