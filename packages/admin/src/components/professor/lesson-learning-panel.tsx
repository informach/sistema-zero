'use client'

import type {
  LearningAnswers,
  LessonLearningReport,
  PublicInteractiveBlock,
} from '@sistemazero/core/learning'
import {
  castText,
  evaluateExperimentation,
  NAVE_FOGO,
  onionFireLength,
  quantos,
  readDemonstrationSession,
  readExperimentSession,
  type SceneId,
  type SceneState,
  sceneGoals,
  sceneModelFor,
  sceneReadout,
  sceneTargets,
} from '@sistemazero/core/learning/scene'
import { Button } from '@sistemazero/ui/button'
import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'
import { LessonEvidenceHistory } from './lesson-evidence-history'

/**
 * A frase que a criança escolheu na pergunta anexa do bloco, quando ela respondeu.
 *
 * ⚠️⚠️ Ela vale para os QUATRO tipos, e é por isso que sai numa função. Os dois ramos de cena
 * fazem `return` com as próprias linhas, e a linha da conclusão só existia depois deles — então
 * quando a cena voltou a aceitar pergunta anexa (15/09/2026), o campo que passou a decidir o
 * `passed` ficou invisível justamente para quem precisa dele para intervir.
 */
function conclusaoLines(answers: LearningAnswers, content?: PublicInteractiveBlock): string[] {
  if (typeof answers.checkpoint !== 'string') return []
  const escolha = content?.checkpoint?.choices.find((c) => c.id === answers.checkpoint)
  return [`Conclusão: ${escolha?.label ?? opcaoQueSaiu(answers.checkpoint, content?.checkpoint)}`]
}

/**
 * ⚠️ O id cru de uma escolha que a pergunta de HOJE não tem mais (full review final de dados e deploy,
 * BAIXO-5): 32 previsões e 15 explicações do modelo trocaram de ids nos lotes do Raio-X, e o professor lia
 * "fica" ou "podem" sem saber o que era. A resposta guardada não é reinterpretada: só dita como antiga.
 */
function opcaoQueSaiu(id: string, pergunta?: { choices: { id: string }[] }): string {
  return pergunta ? `${id} (opção que não existe mais)` : id
}

/**
 * A montagem que a criança deixou na cena, com as MESMAS palavras da faixa que ela leu.
 *
 * ⚠️⚠️ É o `sceneReadout` do core, e não uma terceira descrição do estado (full review de 16/09/2026). A
 * cópia daqui dizia "de cima e de baixo" onde a faixa diz "cima e baixo", "partida" onde a tela diz
 * "Jogando", "área do Dino 51.2" onde a bancada diz "80%", "-9" sem o sinal de menos, "quadro(s)", e ainda
 * falava da "pergunta contínua" da `contact`, uma regra que saiu da cena (o campo `hit.mode` não é lido
 * por nada). O complemento por cena (`complementoDaMontagem`) é só o que a faixa NÃO mostra e o professor
 * precisa para intervir.
 * ⚠️ SEM o elenco aqui: quem veste é o chamador (`castText` na frase inteira), uma vez só.
 */
function montagem(scene: SceneId, state: SceneState): string {
  return [
    ...sceneReadout(scene, state).map((r) => `${r.label} ${r.value}`),
    ...complementoDaMontagem(scene, state),
  ].join('; ')
}

/** O que a faixa da criança não mostra e o professor precisa ver (os contadores de gesto, as chaves). */
function complementoDaMontagem(scene: SceneId, state: SceneState): string[] {
  switch (scene) {
    case 'screen-reader':
      return state.description.text ? [`texto: "${state.description.text}"`] : []
    case 'draw-loop':
      return [
        `Desenhar o Dino ${state.render.loop ? 'a cada quadro' : 'só no começo'}`,
        `Limpar a tela antes ${state.render.erase ? 'ligado' : 'desligado'}`,
      ]
    case 'frames':
      return [`${quantos(state.animation.swaps, 'troca', 'trocas')} de quadro até agora`]
    case 'onion-skin':
      return [
        `fogo 2 com ${quantos(onionFireLength(state.animation.shift), 'quadradinho', 'quadradinhos')} (o fogo 1 tem ${NAVE_FOGO.pequeno})`,
      ]
    case 'cleanup':
      return [quantos(state.crowd.removed, 'removido', 'removidos')]
    case 'lives':
      return [`fio da vida ${state.lifeline.onHit ? 'ligado' : 'desligado'}`]
    case 'group-loop':
      return [`${state.hunt.looked.length} de 3 olhados`]
    case 'enemy-type':
      return [quantos(state.blueprint.born, 'nascido', 'nascidos')]
    case 'entity-state':
      return [`o estado mora ${state.brains.shared ? 'no jogo' : 'em cada torre'}`]
    case 'camera-3d':
      return [`menos cores já vistas de uma vez: ${state.orbit.fewest}`]
    case 'pick-ray':
      return [
        `mira em ${state.ray.x}, ${state.ray.y}`,
        quantos(state.ray.hits.length, 'caixa já acertada', 'caixas já acertadas'),
      ]
    case 'shading':
      return [`sombra e luz ${state.light.shade ? 'ligadas' : 'desligadas'}`]
    default:
      return []
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
  return [
    `Palpite antes de mexer: ${escolha?.label ?? opcaoQueSaiu(answers.prediction, content?.prediction)}`,
  ]
}

function answerLines(
  answers: LearningAnswers,
  content?: PublicInteractiveBlock,
  /** O resultado GRAVADO já aprovou: metas pendentes ao lado dele são de uma versão mais nova da cena. */
  aprovada = false,
): string[] {
  const activity = content?.activity
  const previsao = [...predictionLines(answers, content), ...conclusaoLines(answers, content)]

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
    const metas = sceneGoals(activity.scene, state, activity.cast, sceneTargets(activity))
    return [
      ...previsao,
      // O acompanhamento do professor lê a cena com o ELENCO da atividade: ele precisa ver
      // os mesmos nomes que a criança viu, senão o relatório fala de outro personagem.
      `Cena: ${sceneModelFor(activity).title}`,
      // ⚠️ BAIXO-5 do full review final de dados e deploy: o members não reavalia tentativa, e 188 de 3.440
      // retratos aprovados antes dos lotes do Raio-X abrem com uma meta nova "Pendente" ao lado. Nada é
      // rebaixado; o professor só precisa saber de onde vem a diferença.
      aprovada && metas.some((g) => !g.complete)
        ? 'Aprovada numa versão anterior da cena: as descobertas pendentes abaixo entraram depois.'
        : '',
      ...metas.map((g) => `${g.complete ? 'Descobriu' : 'Pendente'}: ${g.label}`),
      ...state.evidence.observations
        .filter((o) => state.evidence.discoveries.includes(o.id))
        .map((o) => `Observou: ${o.label}`),
      `Montagem atual: ${castText(montagem(activity.scene, state), activity.cast)}`,
      `Pistas utilizadas: ${state.evidence.hints}`,
      `Comparações guardadas: ${session.trials.length}`,
      evaluateExperimentation(activity.scene, state, true, activity.cast, sceneTargets(activity))
        .feedback,
      'A cena registra o que ela fez ali. A transferência se observa no projeto e nos critérios da seção.',
    ].filter(Boolean)
  }

  const lines: string[] = [...previsao]
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
                              {answerLines(
                                saved.answers,
                                activity.content,
                                saved.result?.passed === true,
                              ).map((line) => (
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
                                    {answerLines(
                                      attempt.answers,
                                      activity.content,
                                      attempt.result.passed,
                                    ).map((line) => (
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
