'use client'

import type {
  LearningAnswers,
  LessonLearningReport,
  PublicInteractiveBlock,
} from '@sistemazero/core/learning'
import { Button } from '@sistemazero/ui/button'
import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'
import { LessonEvidenceHistory } from './lesson-evidence-history'

function answerLines(answers: LearningAnswers, content?: PublicInteractiveBlock): string[] {
  const activity = content?.activity
  const choices =
    activity?.type === 'prediction'
      ? activity.choices
      : activity?.type === 'sequence'
        ? activity.items
        : []
  const label = (id: string) => choices.find((choice) => choice.id === id)?.label ?? id
  const lines: string[] = []
  if (typeof answers.prediction === 'string') lines.push(`Previsão: ${label(answers.prediction)}`)
  if (Array.isArray(answers.order))
    lines.push(
      activity?.type === 'sequence' && activity.mode === 'match'
        ? answers.order.map((id, i) => `${activity.targets[i]} → ${label(id)}`).join('; ')
        : `Ordem: ${answers.order.map(label).join(' → ')}`,
    )
  if (typeof answers.checkpoint === 'string')
    lines.push(
      `Conclusão: ${content?.checkpoint?.choices.find((c) => c.id === answers.checkpoint)?.label ?? answers.checkpoint}`,
    )
  if (typeof answers.experiments === 'number')
    lines.push(`Experimentos executados: ${answers.experiments}`)
  if (activity?.type === 'experiment') {
    const parameter =
      activity.preset === 'motion'
        ? 'Gravidade'
        : activity.preset === 'population'
          ? 'Intervalo entre objetos (segundos)'
          : 'Raio da colisão'
    if (Array.isArray(answers.testedValues) && answers.testedValues.length > 0)
      lines.push(`${parameter} · valores testados: ${answers.testedValues.join('; ')}`)
    if (typeof answers.tested === 'number') lines.push(`Último valor testado: ${answers.tested}`)
  }
  if (answers.leftObserved || answers.rightObserved)
    lines.push(
      `Comparação: ${answers.leftObserved ? 'observou A' : 'A pendente'}; ${answers.rightObserved ? 'observou B' : 'B pendente'}`,
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
  if (answers.participated === true) lines.push('Participação registrada na exploração.')
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
