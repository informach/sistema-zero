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
  type SceneId,
  type SceneState,
  sceneGoals,
  sceneModelFor,
} from '@sistemazero/core/learning/scene'
import { Button } from '@sistemazero/ui/button'
import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'
import { LessonEvidenceHistory } from './lesson-evidence-history'

/** A montagem que a criança deixou na cena, em uma frase que o professor lê sem decifrar. */
function montagem(scene: SceneId, state: SceneState): string {
  const tela = { start: 'início', playing: 'partida', end: 'fim' }[state.match.screen]
  switch (scene) {
    case 'coordinates':
      return `Dino em x ${state.place.x}, y ${state.place.y}`
    case 'screen-reader':
      return state.description.text
        ? `descrição escrita: "${state.description.text}"`
        : 'descrição ainda vazia'
    case 'stage-size':
      return `tela de ${state.stage.width} por ${state.stage.height}; borda ${state.stage.border ? 'à vista' : 'escondida'}`
    case 'draw-loop':
      return `desenho a cada quadro ${state.render.loop ? 'ligado' : 'desligado'}; limpeza ${state.render.erase ? 'ligada' : 'desligada'}`
    case 'frames':
      return `quadro ${state.animation.frame} de 2; troca ${
        state.animation.playing ? `andando a ${state.animation.rate} por segundo` : 'parada'
      }; ${state.animation.swaps} trocas até agora`
    case 'onion-skin':
      return `quadro ${state.animation.frame} de 2; fantasma ${
        state.animation.onion ? 'ligado' : 'desligado'
      }; passo do quadro 2 em ${state.animation.shift}`
    case 'symmetry':
      return `espelho ${state.mirror.on ? `ligado na linha ${state.mirror.line}` : 'desligado'}; ${
        state.mirror.painted.length
      } traços no papel`
    case 'pixel-vector':
      return `lupa de ${state.pixels.zoom} sobre a pedra de ${
        state.pixels.kind === 'pixel' ? 'pixel' : 'vetor'
      }`
    case 'sheet-vs-sprite':
      return `pedaço ${state.sheet.cell} de 4 recortado; ${state.sheet.size} de tamanho no jogo`
    case 'lives':
      return `${state.lifeline.lives} vidas e ${state.lifeline.points} pontos; ${
        state.lifeline.hits
      } batidas; fio da vida ${state.lifeline.onHit ? 'ligado' : 'desligado'}`
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

/**
 * O palpite de antes, quando a atividade pediu um.
 *
 * ⚠️ Sem "acertou/errou": a projeção pública tira o `correctChoiceId` do bloco, e é
 * deliberado — a previsão não vale nota. O que o professor precisa ver é o que a turma achou
 * que ia acontecer, que é onde mora a ideia anterior de cada criança.
 */
function predictionLines(answers: LearningAnswers, content?: PublicInteractiveBlock): string[] {
  if (typeof answers.prediction !== 'string') return []
  const escolha = content?.prediction?.choices.find((c) => c.id === answers.prediction)
  return [`Palpite antes de mexer: ${escolha?.label ?? answers.prediction}`]
}

function answerLines(answers: LearningAnswers, content?: PublicInteractiveBlock): string[] {
  const activity = content?.activity
  const previsao = predictionLines(answers, content)

  if (activity?.type === 'demonstration') {
    const session = readDemonstrationSession(activity.scene, answers.sceneCheckpoint)
    if (!session)
      return [
        ...previsao,
        answers.sceneCheckpoint === undefined
          ? 'A criança ainda não abriu esta demonstração.'
          : 'Registro guardado não confere com esta cena. Não foi reinterpretado.',
      ]
    return [
      ...previsao,
      `Demonstração: ${sceneModelFor(activity).title}`,
      session.viewed ? 'Roteiro acompanhado até o fim.' : 'Roteiro ainda não concluído.',
      'A evidência registra o acompanhamento. A experimentação, quando existe, é avaliada em outro bloco.',
    ]
  }

  if (activity?.type === 'experimentation') {
    const session = readExperimentSession(activity.scene, answers.sceneCheckpoint)
    if (!session)
      return [
        ...previsao,
        answers.sceneCheckpoint === undefined
          ? 'A criança ainda não abriu esta experimentação.'
          : 'Registro guardado não confere com esta cena. Não foi reinterpretado.',
      ]
    const state = session.state
    return [
      ...previsao,
      // O acompanhamento do professor lê a cena com o ELENCO da atividade: ele precisa ver
      // os mesmos nomes que a criança viu, senão o relatório fala de outro personagem.
      `Cena: ${sceneModelFor(activity).title}`,
      ...sceneGoals(activity.scene, state, activity.cast).map(
        (g) => `${g.complete ? 'Descobriu' : 'Pendente'}: ${g.label}`,
      ),
      ...state.evidence.observations
        .filter((o) => state.evidence.discoveries.includes(o.id))
        .map((o) => `Observou: ${o.label}`),
      `Montagem atual: ${montagem(activity.scene, state)}`,
      `Pistas utilizadas: ${state.evidence.hints}`,
      `Comparações guardadas: ${session.trials.length}`,
      evaluateExperimentation(activity.scene, state, true, activity.cast).feedback,
      'A cena registra o que ela fez ali. A transferência se observa no projeto e nos critérios da seção.',
    ].filter(Boolean)
  }

  const lines: string[] = [...previsao]
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
                      // ⚠️ Também pela REVISÃO, como as tentativas logo abaixo. Hoje o members
                      // já filtra e a chave do progresso é (aluno, bloco), então no máximo uma
                      // linha chega — mas isso é defesa que mora em outro pacote. Sem a
                      // conferência aqui, um registro de outra revisão seria lido com o conteúdo
                      // atual, e o professor veria a criança numa cena que ela nunca abriu.
                      const saved = blocks.find(
                        (block) =>
                          block.blockId === activity.id && block.revision === activity.revision,
                      )
                      const attempts = report.attempts.filter(
                        (attempt) =>
                          attempt.blockId === activity.id && attempt.revision === activity.revision,
                      )
                      // ⚠️ "Sem registro" e "registro de outra revisão" são coisas DIFERENTES: a
                      // primeira é informação sobre a criança (não abriu ainda), a segunda é um
                      // aviso sobre o BLOCO (você editou a atividade depois que ela respondeu, e o
                      // que ela deixou não pode ser lido com o conteúdo de agora). Contadas como a
                      // mesma coisa, a professora conclui que a turma não fez nada.
                      const deOutraRevisao =
                        saved === undefined && blocks.some((block) => block.blockId === activity.id)
                      return (
                        <div key={activity.id} className="space-y-1 text-sm">
                          <p className="font-medium">
                            {activity.content.title} ·{' '}
                            {saved?.result?.passed
                              ? 'Concluída'
                              : saved
                                ? 'Em andamento'
                                : deOutraRevisao
                                  ? 'Registro de outra versão'
                                  : 'Sem registro'}
                          </p>
                          {deOutraRevisao ? (
                            <p>
                              A criança respondeu antes da última edição deste bloco. O que ela
                              deixou é de outra versão da atividade e não é reinterpretado com o
                              conteúdo atual.
                            </p>
                          ) : null}
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
