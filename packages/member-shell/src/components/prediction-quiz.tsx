'use client'
import { gradeLearningQuiz, isManifestQuiz } from '@sistemazero/core/learning'
import { falaDaExplicacaoDoQuiz, falaDaQuestaoDoQuiz } from '@sistemazero/core/learning/scene'
import { ArrowRight, Check, CheckCircle2, Hand, Play, RotateCcw, Sparkles, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { apiSend } from '../lib/api'
import { renderInline, renderMarkdown } from '../lib/markdown'
import type {
  QuizAttemptResultView,
  QuizBlock,
  QuizQuestionResultView,
  QuizStateView,
} from '../lib/types'
import { DialogueBlockView } from './dialogue-block'
import { SceneButton } from './exploration-stage'
import { useLessonPlayer } from './lesson-player-context'
import { useLessonPreview } from './lesson-preview-context'
import { GardenQuizScene } from './quiz-garden-scene'
import { IslandQuizScene } from './quiz-island-scene'
import { JardimQuizScene } from './quiz-jardim-scene'
import { LighthouseQuizScene } from './quiz-lighthouse-scene'
import { MoedasQuizScene } from './quiz-moedas-scene'
import { ZappyOuvirButton } from './zappy-ouvir-button'
/** Same radio-card recipe as KidsQuiz; the approved prediction flow needs immediate feedback. */
export function PredictionQuiz(props: {
  blockId: string
  content: QuizBlock
  quizState: QuizStateView | null
}) {
  const player = useLessonPlayer()
  return (
    <PredictionQuizSession
      key={`${player?.viewerId ?? 'preview'}:${player?.lessonId ?? ''}:${props.blockId}:${JSON.stringify(props.content)}`}
      {...props}
    />
  )
}
function PredictionQuizSession({
  blockId,
  content,
  quizState,
}: {
  blockId: string
  content: QuizBlock
  quizState: QuizStateView | null
}) {
  const player = useLessonPlayer()
  const rehearsal = useLessonPreview()
  const questions = content.questions
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [feedback, setFeedback] = useState<QuizQuestionResultView | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const checked = feedback !== null
  const [scenePlaying, setScenePlaying] = useState(false)
  async function requestGrade(body: Record<string, string[]>, questionId?: string) {
    if (rehearsal) {
      const authored = { ...content, passingScore: content.passingScore || 100 }
      if (!isManifestQuiz(authored)) throw Error('Complete o gabarito na autoria.')
      const definition = questionId
        ? { ...authored, questions: authored.questions.filter((q) => q.id === questionId) }
        : authored
      return gradeLearningQuiz(
        { ...definition, passingScore: content.passingScore ?? undefined },
        body,
      )
    }
    if (!player) throw Error('Abra esta revisão pela aula.')
    return apiSend<QuizAttemptResultView>(
      `/api/members/lessons/${encodeURIComponent(player.lessonId)}/blocks/${encodeURIComponent(blockId)}/quiz-attempts`,
      'POST',
      { answers: body, ...(questionId ? { questionId } : {}) },
    )
  }
  async function reveal() {
    if (!selected || busy || !question) return
    setBusy(true)
    setError('')
    try {
      const result = await requestGrade({ [question.id]: [selected] }, question.id)
      const correction = result.questions.find((q) => q.questionId === question.id)
      if (!correction) throw Error('Correção ausente')
      const nextAnswers = { ...answers, [question.id]: [selected] }
      setAnswers(nextAnswers)
      saveDraft(nextAnswers, index, selected)
      setFeedback(correction)
    } catch {
      setError('Não foi possível conferir a resposta. Tente de novo.')
    } finally {
      setBusy(false)
    }
  }
  async function advance() {
    if (!correct) {
      move(true)
      return
    }
    if (index < questions.length - 1) {
      move(false)
      return
    }
    setBusy(true)
    setError('')
    try {
      const result = await requestGrade(answers)
      if (!result.passed) throw Error('A revisão precisa ser conferida novamente')
      if (rehearsal) await rehearsal.onQuiz(blockId, result)
      else player?.refreshAfterQuiz?.()
      setIndex(questions.length)
      setFocusRevision((v) => v + 1)
    } catch {
      setError('Não foi possível concluir a revisão. Tente de novo.')
    } finally {
      setBusy(false)
    }
  }
  const [index, setIndex] = useState(quizState?.passed ? questions.length : 0)
  const [selected, setSelected] = useState<string | null>(null)
  const signature = JSON.stringify(content)
  const draftKey =
    player && !rehearsal
      ? `sz:prediction-draft:${player.viewerId}:${player.lessonId}:${blockId}`
      : null
  const initialPreviewDraft = useRef(rehearsal?.answers[blockId]?.predictionQuizDraft)
  useEffect(() => {
    if (quizState?.passed) return
    try {
      const raw = draftKey ? localStorage.getItem(draftKey) : initialPreviewDraft.current
      if (typeof raw !== 'string') return
      const draft = JSON.parse(raw)
      if (
        draft?.signature !== signature ||
        !Number.isInteger(draft.index) ||
        draft.index < 0 ||
        draft.index >= questions.length
      )
        return
      const restored: Record<string, string[]> = {}
      for (const q of questions) {
        const answer = draft.answers?.[q.id]
        if (
          Array.isArray(answer) &&
          answer.length === 1 &&
          q.choices.some((c) => c.id === answer[0])
        )
          restored[q.id] = answer
      }
      setAnswers(restored)
      setIndex(draft.index)
      setSelected(
        questions[draft.index]?.choices.some((c) => c.id === draft.selected)
          ? draft.selected
          : null,
      )
      // Feedback is deliberately rechecked; a local draft never grants approval.
    } catch {
      /* A blocked storage must not prevent answering. */
    }
  }, [draftKey, signature, questions, quizState?.passed])
  function saveDraft(
    nextAnswers: Record<string, string[]>,
    nextIndex: number,
    nextSelected: string | null,
  ) {
    const raw = JSON.stringify({
      signature,
      answers: nextAnswers,
      index: nextIndex,
      selected: nextSelected,
    })
    if (rehearsal) rehearsal.onChange(blockId, { predictionQuizDraft: raw }, 0)
    if (draftKey)
      try {
        localStorage.setItem(draftKey, raw)
      } catch {
        /* Submission remains available. */
      }
  }
  function choose(choice: string) {
    setSelected(choice)
    saveDraft(answers, index, choice)
  }
  const [focusRevision, setFocusRevision] = useState(0)
  const group = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const sceneHeading = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    if (focusRevision > 0) heading.current?.focus()
  }, [focusRevision])
  useLayoutEffect(() => {
    if (checked && matchMedia('(max-width: 799px)').matches) {
      sceneHeading.current?.focus({ preventScroll: true })
      sceneHeading.current?.scrollIntoView({ block: 'start' })
    }
  }, [checked])
  const question = questions[index]
  const sceneIndex = ['garden-touch', 'garden-count', 'garden-repeat'].indexOf(
    question?.predictionScene ?? '',
  )
  const questionSpeech = question ? falaDaQuestaoDoQuiz(question) : undefined
  const captions = [
    'As pedras vão receber o toque. Os outros esconderijos também estão visíveis.',
    'Um personagem já foi encontrado. A sequência será: jardim vazio → flores.',
    'O arbusto já ficou invisível, e o coelho está à vista.',
  ]
  const move = (retry: boolean) => {
    setSelected(null)
    setFeedback(null)
    setScenePlaying(false)
    if (!retry) setIndex((i) => i + 1)
    saveDraft(answers, retry ? index : index + 1, null)
    setFocusRevision((revision) => revision + 1)
  }
  if (!question)
    return (
      <div className="sz-garden-quiz-finish rounded-[1.25rem] bg-background p-5 md:p-6">
        <div className="sz-garden-finish-mark">
          <Sparkles size={30} aria-hidden />
        </div>
        <p className="sz-garden-eyebrow">
          {questions.length} de {questions.length}
        </p>
        <h3 className="sz-display text-2xl" ref={heading} tabIndex={-1}>
          Você relembrou as regras.
        </h3>
        {questions.every((q) => q.predictionScene?.startsWith('garden-')) && (
          <>
            <div className="sz-garden-remember">
              <span>01</span>
              <p>
                O toque executa a reação no <strong>esconderijo escolhido</strong>.
              </p>
            </div>
            <div className="sz-garden-remember">
              <span>02</span>
              <p>
                <strong>Achados guarda um valor.</strong> Cada novo personagem soma 1.
              </p>
            </div>
            <p className="text-sm">
              O toque vazio e o repetido não somam. Uma nova busca começa em 0.
            </p>
          </>
        )}
        <p className="text-sm">Revisão concluída. Use o botão da aula para continuar.</p>
        <SceneButton
          onClick={() => {
            setIndex(0)
            setSelected(null)
            setFeedback(null)
            setAnswers({})
            saveDraft({}, 0, null)
          }}
        >
          <RotateCcw size={16} aria-hidden />
          Refazer revisão
        </SceneButton>
      </div>
    )
  const correct = feedback?.correct === true
  const selectedIndex = question.choices.findIndex((c) => c.id === selected)
  const rovingIndex = Math.max(selectedIndex, 0)
  return (
    <div className="sz-garden-quiz rounded-[1.25rem] bg-background p-5 md:p-6">
      <div className="flex gap-1.5" aria-hidden>
        {questions.map((q, i) => (
          <span
            key={q.id}
            className={
              'h-2 flex-1 rounded-full ' +
              (i < index ? 'bg-success' : i === index ? 'bg-primary' : 'bg-muted')
            }
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Pergunta {index + 1} de {questions.length} ·{' '}
        {question.predictionScene ? 'Escolha, teste e compare' : 'Escolha uma resposta'}
      </p>
      <DialogueBlockView
        key={question.id}
        content={{ kind: 'dialogue', text: question.prompt }}
        speech={{
          texts: [questionSpeech?.visibleText ?? question.prompt],
          roteiros: questionSpeech ? [questionSpeech.speechText] : undefined,
          vozes: content.vozes,
          fallbackToBrowser: true,
        }}
        mascot={player?.videoGateMascot}
      >
        <h3
          ref={heading}
          tabIndex={-1}
          id="prediction-prompt"
          className="sz-display text-lg md:text-xl"
        >
          {renderMarkdown(question.prompt)}
        </h3>
      </DialogueBlockView>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="sz-garden-quiz-layout">
        <div className="sz-garden-quiz-world">
          <span
            ref={sceneHeading}
            tabIndex={-1}
            className="sz-garden-state-label"
            data-result={checked}
          >
            {checked ? <CheckCircle2 size={16} aria-hidden /> : <Hand size={16} aria-hidden />}
            {question.predictionScene
              ? checked
                ? 'Resultado da experiência'
                : 'Antes do teste'
              : 'Pense no seu jogo'}
          </span>
          {!question.predictionScene ? (
            <p className="p-5 text-base">
              Leia a pergunta e escolha uma resposta. Depois, veja a explicação.
            </p>
          ) : question.predictionScene.startsWith('moedas-') ? (
            <MoedasQuizScene key={question.id} scene={question.predictionScene} result={checked} />
          ) : question.predictionScene.startsWith('jardim-') ? (
            <JardimQuizScene key={question.id} scene={question.predictionScene} result={checked} />
          ) : question.predictionScene.startsWith('island-') ? (
            <IslandQuizScene
              key={question.id}
              scene={question.predictionScene}
              result={checked}
              onAnimating={setScenePlaying}
            />
          ) : question.predictionScene?.startsWith('lighthouse-') ? (
            <LighthouseQuizScene
              key={question.id}
              scene={question.predictionScene}
              result={checked}
              onAnimating={setScenePlaying}
            />
          ) : (
            <GardenQuizScene
              scene={question.predictionScene as 'garden-touch' | 'garden-count' | 'garden-repeat'}
              result={checked}
            />
          )}
          <p className="sz-garden-caption">
            {checked
              ? question.predictionScene
                ? 'Observe o resultado antes de continuar.'
                : 'Leia a explicação antes de continuar.'
              : (captions[sceneIndex] ?? 'Observe a situação antes de escolher a resposta.')}
          </p>
          {checked && sceneIndex === 1 && (
            <ol className="sz-garden-sequence">
              <li>
                <span>1</span>
                <p>
                  Jardim vazio<strong>Achados continua em 1.</strong>
                </p>
              </li>
              <li>
                <span>2</span>
                <p>
                  Novo personagem nas flores<strong>1 + 1 → Achados passa para 2.</strong>
                </p>
              </li>
            </ol>
          )}
        </div>
        <div className="sz-garden-quiz-answer">
          <div
            ref={group}
            role="radiogroup"
            aria-labelledby="prediction-prompt"
            aria-disabled={checked || busy}
            className="flex flex-col gap-3"
            onKeyDown={(e) => {
              if (checked || busy) return
              let next: number
              if (e.key === 'ArrowDown' || e.key === 'ArrowRight')
                next = (rovingIndex + 1) % question.choices.length
              else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft')
                next = (rovingIndex + question.choices.length - 1) % question.choices.length
              else if (e.key === 'Home') next = 0
              else if (e.key === 'End') next = question.choices.length - 1
              else return
              e.preventDefault()
              const nextChoice = question.choices[next]
              if (!nextChoice) return
              choose(nextChoice.id)
              group.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus()
            }}
          >
            {question.choices.map((choice, i) => {
              const chosen = selected === choice.id
              const right = (feedback?.correctChoiceIds ?? []).includes(choice.id)
              return (
                <button
                  key={choice.id}
                  type="button"
                  role="radio"
                  aria-checked={chosen}
                  aria-disabled={checked || busy}
                  tabIndex={i === rovingIndex ? 0 : -1}
                  onClick={() => {
                    if (!checked && !busy) choose(choice.id)
                  }}
                  className={
                    'sz-garden-choice kids-3d flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left font-semibold text-base ' +
                    (chosen
                      ? 'kids-3d--acao border-primary bg-(--kids-cyan-tint) text-primary'
                      : 'border-border bg-card hover:border-ring/60')
                  }
                  data-answer={
                    checked && (chosen || right) ? (right ? 'correct' : 'wrong') : undefined
                  }
                >
                  <span
                    className={
                      'grid size-8 shrink-0 place-items-center rounded-xl border-2 font-bold text-sm [font-family:var(--font-display)] ' +
                      (chosen
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border text-muted-foreground')
                    }
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1 min-w-0">
                    {renderInline(choice.label, { plainLinks: true })}
                    {checked && right && (
                      <small className="sz-garden-answer-label">
                        {question.predictionScene ? 'É o que acontece na cena' : 'Resposta correta'}
                      </small>
                    )}
                    {checked && chosen && !right && (
                      <small className="sz-garden-answer-label">
                        {question.predictionScene
                          ? 'Sua previsão · compare com a cena'
                          : 'Sua resposta'}
                      </small>
                    )}
                  </span>
                  {checked && (chosen || right) ? (
                    right ? (
                      <Check size={20} className="shrink-0" aria-hidden />
                    ) : (
                      <X size={20} className="shrink-0" aria-hidden />
                    )
                  ) : chosen ? (
                    <Check size={20} className="shrink-0" aria-hidden />
                  ) : null}
                </button>
              )
            })}
          </div>
          {!checked ? (
            <SceneButton
              tom="gesto"
              disabled={selected === null || busy || scenePlaying}
              onClick={() => void reveal()}
            >
              <Play size={16} aria-hidden />
              {question.predictionScene ? 'Ver o que acontece' : 'Responder'}
            </SceneButton>
          ) : (
            <>
              <div className="sz-garden-quiz-feedback" data-correct={correct} role="status">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{correct ? 'Isso mesmo.' : 'Vamos comparar com o resultado.'}</strong>
                  {feedback?.explanation && (
                    <ZappyOuvirButton
                      textos={[falaDaExplicacaoDoQuiz(feedback.explanation)]}
                      audioUrl={feedback.explanationAudioUrl}
                      rotulo={`Ouvir a explicação da pergunta ${index + 1}`}
                    />
                  )}
                </div>
                {feedback?.explanation && (
                  <div className="lesson-prose">{renderMarkdown(feedback.explanation)}</div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <SceneButton
                  tom="gesto"
                  disabled={busy || scenePlaying}
                  onClick={() => void advance()}
                >
                  {correct
                    ? index === questions.length - 1
                      ? 'Concluir revisão'
                      : 'Próxima pergunta'
                    : 'Tentar de novo'}
                  {correct && <ArrowRight size={16} aria-hidden />}
                </SceneButton>
                {correct && (
                  <SceneButton
                    disabled={busy || scenePlaying}
                    onClick={() => {
                      setFeedback(null)
                      setSelected(null)
                    }}
                  >
                    <RotateCcw size={16} aria-hidden />
                    {question.predictionScene ? 'Testar novamente' : 'Responder novamente'}
                  </SceneButton>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
