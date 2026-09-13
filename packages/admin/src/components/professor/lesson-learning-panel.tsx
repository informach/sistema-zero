'use client'

import type {
  LearningAnswers,
  LessonLearningReport,
  PublicInteractiveBlock,
} from '@sistemazero/core/learning'
import {
  evaluateExperimentation,
  readDemonstrationSession,
  readExperimentSession,
  SCENE_MODELS,
  type SceneId,
  type SceneState,
  sceneGoals,
} from '@sistemazero/core/learning/scene'
import { Button } from '@sistemazero/ui/button'
import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'
import { LessonEvidenceHistory } from './lesson-evidence-history'

/** A montagem que a criança deixou na cena, em uma frase que o professor lê sem decifrar. */
function montagem(scene: SceneId, state: SceneState): string {
  const tela = { start: 'início', playing: 'partida', end: 'fim' }[state.match.screen]
  switch (scene) {
    case 'world':
      return `Dino ${state.world.created ? 'criado' : 'ausente'}; desenho ${state.world.drawn ? 'ligado' : 'desligado'}`
    case 'layers':
      return `Dino ${state.world.front ? 'depois' : 'antes'} da floresta`
    case 'gravity':
    case 'impulse':
      return `gravidade ${state.flight.gravity ? 'aplicada' : 'desligada'}; impulso ${state.flight.force}`
    case 'jump-sound':
      return `som ligado ${state.sound.onJump ? 'ao salto' : 'ao comando'}; ${state.sound.jumps} saltos e ${state.sound.count} sons`
    case 'spawn':
      return state.crowd.timer
        ? `nascimento a cada ${state.crowd.interval} s`
        : 'nascimento a cada quadro'
    case 'cleanup':
      return `limpeza ${state.crowd.cleanup ? 'ligada' : 'desligada'}; ${state.crowd.removed} removidos; ${state.crowd.born - state.crowd.removed} no grupo`
    case 'game-state':
      return `tela de ${tela}; relógio ${state.match.guarded ? 'dentro de Se jogando' : 'em qualquer tela'}`
    case 'controls':
      return `tela de ${tela}; início por Enter e ${state.match.touch ? 'toque conectado' : 'toque desconectado'}`
    case 'restart':
      return `tela de ${tela}; reinício ${state.match.restartConnected ? 'conectado' : 'desconectado'}`
    case 'hitbox':
      return `distância ${state.contact.distance}; área do Dino ${state.contact.width}`
    case 'score':
      return `tela de ${tela}; ${state.match.points} pontos; soma ${state.match.guarded ? 'dentro de Se jogando' : 'em qualquer tela'}`
    case 'random':
      return `posições testadas: ${state.speed.samples.positions.join(', ') || 'nenhuma'}; velocidades: ${state.speed.samples.velocities.join(', ') || 'nenhuma'}`
    case 'acceleration':
      return `base ${state.speed.base}; limite ${state.speed.limited ? 'ligado' : 'desligado'}; última velocidade ${state.speed.samples.velocity}`
  }
}

function answerLines(answers: LearningAnswers, content?: PublicInteractiveBlock): string[] {
  const activity = content?.activity

  if (activity?.type === 'demonstration') {
    const session = readDemonstrationSession(activity.scene, answers.sceneCheckpoint)
    if (!session)
      return [
        answers.sceneCheckpoint === undefined
          ? 'A criança ainda não abriu esta demonstração.'
          : 'Registro guardado não confere com esta cena. Não foi reinterpretado.',
      ]
    return [
      `Demonstração: ${SCENE_MODELS[activity.scene].title}`,
      session.viewed ? 'Roteiro acompanhado até o fim.' : 'Roteiro ainda não concluído.',
      'A evidência registra o acompanhamento. A experimentação, quando existe, é avaliada em outro bloco.',
    ]
  }

  if (activity?.type === 'experimentation') {
    const session = readExperimentSession(activity.scene, answers.sceneCheckpoint)
    if (!session)
      return [
        answers.sceneCheckpoint === undefined
          ? 'A criança ainda não abriu esta experimentação.'
          : 'Registro guardado não confere com esta cena. Não foi reinterpretado.',
      ]
    const state = session.state
    return [
      `Cena: ${SCENE_MODELS[activity.scene].title}`,
      ...sceneGoals(activity.scene, state).map(
        (g) => `${g.complete ? 'Descobriu' : 'Pendente'}: ${g.label}`,
      ),
      ...state.evidence.observations
        .filter((o) => state.evidence.discoveries.includes(o.id))
        .map((o) => `Observou: ${o.label}`),
      `Montagem atual: ${montagem(activity.scene, state)}`,
      `Pistas utilizadas: ${state.evidence.hints}`,
      `Comparações guardadas: ${session.trials.length}`,
      evaluateExperimentation(activity.scene, state).feedback,
      'A cena registra o que ela fez ali. A transferência se observa no projeto e nos critérios da seção.',
    ].filter(Boolean)
  }

  const lines: string[] = []
  if (typeof answers.checkpoint === 'string')
    lines.push(
      `Conclusão: ${content?.checkpoint?.choices.find((c) => c.id === answers.checkpoint)?.label ?? answers.checkpoint}`,
    )
  if (
    answers.parameters &&
    typeof answers.parameters === 'object' &&
    !Array.isArray(answers.parameters)
  )
    lines.push(
      `Valores: ${Object.entries(answers.parameters)
        .map(([key, value]) => `${key} = ${value}`)
        .join('; ')}`,
    )
  if (answers.participated === true) lines.push('Participação registrada na experiência.')
  return lines
}

export function LessonLearningPanel({
  lessonId,
  userId,
  accountId,
  sectionId,
}: {
  lessonId: string
  userId: string
  accountId: string
  sectionId?: string
}) {
  const [open, setOpen] = useState(false)
  const [report, setReport] = useState<LessonLearningReport | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  // biome-ignore lint/correctness/useExhaustiveDependencies: retry explicitly repeats the failed read.
  useEffect(() => {
    if (!open) return
    let active = true
    setReport(null)
    setError('')
    const search = new URLSearchParams({ userId, accountId })
    apiGet<LessonLearningReport>(`/api/members/lessons/${lessonId}/learning-report?${search}`)
      .then((value) => {
        if (active) setReport(value)
      })
      .catch((err: unknown) => {
        if (active)
          setError(
            err instanceof Error ? err.message : 'Não foi possível carregar o acompanhamento.',
          )
      })
    return () => {
      active = false
    }
  }, [open, lessonId, userId, accountId, retry])

  return (
    <section className="rounded-xl border border-border p-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        Acompanhamento da aula
      </Button>
      {open ? (
        <div className="mt-3 space-y-3">
          {error ? (
            <div role="alert">
              <p>{error}</p>
              <Button variant="outline" onClick={() => setRetry((value) => value + 1)}>
                Tentar novamente
              </Button>
            </div>
          ) : !report ? (
            <p role="status">Carregando atividades…</p>
          ) : (
            <>
              <h3 className="font-semibold">{report.lessonTitle}</h3>
              <p className="text-sm text-muted-foreground">
                Os registros mostram interações e respostas, sem classificar a capacidade do aluno.
                Pistas fazem parte do aprendizado.
              </p>
              {report.sections.map((section) => {
                const blocks = report.blocks.filter((block) =>
                  section.blockIds.includes(block.blockId),
                )
                const activities = report.activities.filter((activity) =>
                  section.blockIds.includes(activity.id),
                )
                return (
                  <div
                    key={section.id}
                    className={`space-y-2 rounded-lg border p-3 ${section.id === sectionId ? 'border-primary' : 'border-border'}`}
                  >
                    <h4 className="font-medium">
                      {section.title}
                      {section.id === sectionId ? ' · Origem da dúvida' : ''}
                    </h4>
                    <p className="text-sm text-muted-foreground">{section.objective}</p>
                    {report.sectionProgress?.sections
                      .filter((s) => s.id === section.id)
                      .map((s) => (
                        <div key={s.id} className="text-sm">
                          <strong>
                            {s.status === 'completed'
                              ? 'Concluída'
                              : s.status === 'locked'
                                ? 'Ainda bloqueada'
                                : 'Em andamento'}
                          </strong>
                          {s.pending.length > 0 && (
                            <ul>
                              {s.pending.map((p) => (
                                <li key={p}>{p}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    {report.milestones
                      ?.filter((m) => m.sectionId === section.id && m.completedAt)
                      .map((m) => (
                        <p key={m.sectionId} className="text-xs">
                          Conclusão registrada em{' '}
                          {new Date(m.completedAt ?? '').toLocaleString('pt-BR')}
                        </p>
                      ))}
                    {report.sectionId === section.id ? (
                      <p className="text-xs">Última seção aberta</p>
                    ) : null}
                    {!blocks.length ? (
                      <p className="text-sm text-muted-foreground">
                        Sem interação registrada nesta seção.
                      </p>
                    ) : null}
                    {blocks
                      .filter((block) => block.positionSeconds !== null)
                      .map((block) => (
                        <p key={block.blockId} className="text-sm">
                          Vídeo: retomada em {Math.floor((block.positionSeconds ?? 0) / 60)}min{' '}
                          {Math.floor((block.positionSeconds ?? 0) % 60)}s.
                        </p>
                      ))}
                    {activities.map((activity) => {
                      const saved = blocks.find((block) => block.blockId === activity.id)
                      const attempts = report.attempts.filter(
                        (attempt) =>
                          attempt.blockId === activity.id && attempt.revision === activity.revision,
                      )
                      return (
                        <div key={activity.id} className="space-y-1 text-sm">
                          <p className="font-medium">
                            {activity.content.title} ·{' '}
                            {saved?.result?.passed
                              ? 'Concluída'
                              : saved
                                ? 'Em andamento'
                                : 'Sem registro'}
                          </p>
                          {saved ? (
                            <>
                              <p>
                                {saved.hintsUsed} pistas consultadas · {saved.attemptsCount}{' '}
                                respostas conferidas
                              </p>
                              {answerLines(saved.answers, activity.content).map((line) => (
                                <p key={line}>{line}</p>
                              ))}
                            </>
                          ) : null}
                          {attempts.length ? (
                            <details>
                              <summary className="cursor-pointer">Histórico de respostas</summary>
                              <ol className="mt-2 space-y-2">
                                {attempts.map((attempt) => (
                                  <li key={attempt.id} className="rounded border border-border p-2">
                                    <p>
                                      {new Date(attempt.createdAt).toLocaleString('pt-BR')} ·{' '}
                                      {attempt.hintsUsed} pistas
                                    </p>
                                    {answerLines(attempt.answers, activity.content).map((line) => (
                                      <p key={line}>{line}</p>
                                    ))}
                                    <p className="text-muted-foreground">
                                      {attempt.result.feedback}
                                    </p>
                                  </li>
                                ))}
                              </ol>
                            </details>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
              <LessonEvidenceHistory
                key={`${lessonId}:${accountId}:${userId}`}
                lessonId={lessonId}
                userId={userId}
                accountId={accountId}
                initial={{
                  items: report.evidence ?? [],
                  nextCursor: report.evidenceNextCursor ?? null,
                }}
              />
              {report.attempts.some(
                (attempt) =>
                  !report.activities.some(
                    (activity) =>
                      activity.id === attempt.blockId && activity.revision === attempt.revision,
                  ),
              ) ? (
                <p className="text-xs text-muted-foreground">
                  Há registros de versões anteriores da aula. Eles foram preservados e não entram no
                  progresso atual.
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </section>
  )
}
