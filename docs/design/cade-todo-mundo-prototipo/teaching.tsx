import {
  ArrowDown,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  Hand,
  Link2,
  Link2Off,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { DialogueBlockView } from '../../../packages/member-shell/src/components/dialogue-block'
import { SceneButton } from '../../../packages/member-shell/src/components/exploration-stage'
import { ProposalQuestions } from './data'
import { PrototypeMascot, PrototypeQuizScene } from './shared'

/** Teaching colors explain a role, within the application's fonts, surfaces and controls. */
export function TouchRule({ enabled, chosen }: { enabled: boolean; chosen: string | null }) {
  return (
    <div className="teaching-rule" data-proposal="rule" data-enabled={enabled}>
      <p className="teaching-eyebrow">A regra do jogo</p>
      <div className="teaching-node" data-tone="event">
        <Hand size={20} aria-hidden />
        <div>
          <span>Quando acontecer</span>
          <strong>Um toque no esconderijo</strong>
        </div>
      </div>
      <div className="teaching-wire" data-connected={enabled}>
        <span className="teaching-wire-line" aria-hidden />
        <span className="teaching-chosen">
          <span>Escolhido:</span> <strong>{chosen ?? 'nenhum ainda'}</strong>
        </span>
        <ArrowDown size={20} aria-hidden />
      </div>
      <div className="teaching-node" data-tone={enabled ? 'reaction' : 'off'}>
        <Eye size={20} aria-hidden />
        <div>
          <span>A reação</span>
          <strong>Deixar escolhido invisível</strong>
        </div>
      </div>
      <p className="teaching-link-status">
        {enabled ? <Link2 size={16} aria-hidden /> : <Link2Off size={16} aria-hidden />}
        <strong>{enabled ? 'Ligação ativa' : 'Reação desligada'}</strong>
      </p>
      <p className="teaching-caption">
        {enabled
          ? 'O toque executa a reação só no esconderijo escolhido. Os outros continuam como estavam.'
          : 'O toque pode acontecer sem revelar ninguém. Primeiro teste; depois ligue a reação.'}
      </p>
    </div>
  )
}

export type ValueUpdate = {
  before: number
  after: number
  kind: 'initial' | 'add' | 'empty' | 'repeat' | 'reset'
}
export function CounterValue({
  value,
  update,
  trace,
}: {
  value: number
  update: ValueUpdate
  trace: string
}) {
  const added = update.kind === 'add'
  return (
    <div className="teaching-value-group" data-proposal="value">
      <div className="teaching-value" key={trace} data-changed={added || update.kind === 'reset'}>
        <p className="teaching-eyebrow">O que o jogo guarda</p>
        <strong className="teaching-variable-name">achados</strong>
        <output
          className="teaching-number sz-display"
          data-current-value
          aria-label="Valor atual de achados"
        >
          {value}
        </output>
        <span className="teaching-caption">um único valor atual</span>
        <div className="teaching-update">
          <p className="teaching-eyebrow">
            {added
              ? 'Última mudança'
              : update.kind === 'empty'
                ? 'Toque no vazio'
                : update.kind === 'repeat'
                  ? 'Toque repetido'
                  : update.kind === 'reset'
                    ? 'Uma nova busca'
                    : 'No começo da busca'}
          </p>
          {added ? (
            <div className="teaching-equation">
              <span>
                <small>antes</small>
                <b>{update.before}</b>
              </span>
              <span className="teaching-operation">
                <small>somar</small>
                <b>
                  <Plus size={16} aria-hidden />1
                </b>
              </span>
              <ArrowRight size={20} aria-hidden />
              <span>
                <small>agora</small>
                <b>{update.after}</b>
              </span>
            </div>
          ) : (
            <strong className="teaching-update-label">
              {update.kind === 'empty' || update.kind === 'repeat'
                ? `Nenhuma soma · continua ${value}`
                : 'achados recebe 0'}
            </strong>
          )}
          <p className="sr-only" data-trace>
            {trace}
          </p>
        </div>
      </div>
      <p className="teaching-readout">
        <ArrowRight size={16} aria-hidden />O placar lê este valor.
      </p>
      <div className="teaching-mini-rule">
        <Plus size={20} aria-hidden />
        <div>
          <span>A cada novo personagem encontrado:</span>
          <strong>somar 1 em achados</strong>
        </div>
      </div>
      <p className="teaching-caption">
        Recomeçar zera o valor e esconde os personagens. A regra de somar continua ligada.
      </p>
    </div>
  )
}

export function LearningRecap({ kind }: { kind: 'touch-response' | 'found-counter' }) {
  return (
    <div className="teaching-recap" role="status" data-recap={kind}>
      <CheckCircle2 size={24} aria-hidden />
      <div>
        <strong>
          {kind === 'touch-response'
            ? 'A regra acompanha o toque.'
            : 'Encontrar, guardar e atualizar.'}
        </strong>
        <p>
          {kind === 'touch-response'
            ? '“Escolhido” é o esconderijo que recebeu aquele toque. Os outros continuam como estavam.'
            : 'Um novo personagem soma 1. O toque vazio e o repetido mantêm o valor. Uma nova busca começa em 0.'}
        </p>
      </div>
    </div>
  )
}

/** Same radio-card recipe as KidsQuiz; the approved prediction flow needs immediate feedback. */
export function PredictionQuiz({ onComplete }: { onComplete: () => void }) {
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)
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
  const question = ProposalQuestions[index]
  const captions = [
    'As pedras vão receber o toque. Os outros esconderijos também estão visíveis.',
    'Um personagem já foi encontrado. A sequência será: jardim vazio → flores.',
    'O arbusto já ficou invisível, e o coelho está à vista.',
  ]
  const move = (retry: boolean) => {
    setSelected(null)
    setChecked(false)
    if (!retry) setIndex((i) => i + 1)
    setFocusRevision((revision) => revision + 1)
  }
  if (!question)
    return (
      <div className="teaching-quiz-finish rounded-[1.25rem] bg-background p-5 md:p-6">
        <div className="teaching-finish-mark">
          <Sparkles size={30} aria-hidden />
        </div>
        <p className="teaching-eyebrow">Três de três</p>
        <h3 className="sz-display text-2xl" ref={heading} tabIndex={-1}>
          Você relembrou as regras.
        </h3>
        <div className="teaching-remember">
          <span>01</span>
          <p>
            O toque executa a reação no <strong>esconderijo escolhido</strong>.
          </p>
        </div>
        <div className="teaching-remember">
          <span>02</span>
          <p>
            <strong>Achados guarda um valor.</strong> Cada novo personagem soma 1.
          </p>
        </div>
        <p className="text-sm">O toque vazio e o repetido não somam. Uma nova busca começa em 0.</p>
        <SceneButton tom="gesto" onClick={onComplete}>
          Ver os objetivos no Estúdio <ArrowRight size={16} aria-hidden />
        </SceneButton>
        <SceneButton
          onClick={() => {
            setIndex(0)
            setSelected(null)
            setChecked(false)
          }}
        >
          <RotateCcw size={16} aria-hidden />
          Refazer revisão
        </SceneButton>
      </div>
    )
  const correct = selected !== null && question.correctChoiceIds.includes(selected)
  const selectedIndex = question.choices.findIndex((c) => c.id === selected)
  const rovingIndex = Math.max(selectedIndex, 0)
  return (
    <div className="teaching-quiz rounded-[1.25rem] bg-background p-5 md:p-6">
      <div className="flex gap-1.5" aria-hidden>
        {ProposalQuestions.map((q, i) => (
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
        Pergunta {index + 1} de 3 · Escolha, teste e compare
      </p>
      <DialogueBlockView
        key={question.id}
        content={{ kind: 'dialogue', text: question.prompt }}
        speech={{
          texts: [
            question.prompt +
              ' ' +
              question.choices
                .map((c, i) => `Letra ${String.fromCharCode(65 + i)}: ${c.label}`)
                .join(' '),
          ],
          fallbackToBrowser: true,
        }}
        mascot={<PrototypeMascot />}
      >
        <h3
          ref={heading}
          tabIndex={-1}
          id="prediction-prompt"
          className="sz-display text-lg md:text-xl"
        >
          {question.prompt}
        </h3>
      </DialogueBlockView>
      <div className="teaching-quiz-layout">
        <div className="teaching-quiz-world">
          <span
            ref={sceneHeading}
            tabIndex={-1}
            className="teaching-state-label"
            data-result={checked}
          >
            {checked ? <CheckCircle2 size={16} aria-hidden /> : <Hand size={16} aria-hidden />}
            {checked ? 'Resultado da experiência' : 'Antes do toque'}
          </span>
          <PrototypeQuizScene questionId={question.id} result={checked} />
          <p className="teaching-caption">
            {checked ? 'Observe o resultado antes de continuar.' : captions[index]}
          </p>
          {checked && index === 1 && (
            <ol className="teaching-sequence">
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
        <div className="teaching-quiz-answer">
          <div
            ref={group}
            role="radiogroup"
            aria-labelledby="prediction-prompt"
            aria-disabled={checked}
            className="flex flex-col gap-3"
            onKeyDown={(e) => {
              if (checked) return
              let next: number
              if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (rovingIndex + 1) % 3
              else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (rovingIndex + 2) % 3
              else if (e.key === 'Home') next = 0
              else if (e.key === 'End') next = 2
              else return
              e.preventDefault()
              setSelected(question.choices[next].id)
              group.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus()
            }}
          >
            {question.choices.map((choice, i) => {
              const chosen = selected === choice.id
              const right = question.correctChoiceIds.includes(choice.id)
              return (
                // biome-ignore lint/a11y/useSemanticElements: matches KidsQuiz's accessible radio cards with roving focus and keyboard navigation.
                <button
                  key={choice.id}
                  type="button"
                  role="radio"
                  aria-checked={chosen}
                  aria-disabled={checked}
                  tabIndex={i === rovingIndex ? 0 : -1}
                  onClick={() => {
                    if (!checked) setSelected(choice.id)
                  }}
                  className={
                    'teaching-choice kids-3d flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left font-semibold text-base ' +
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
                    {choice.label}
                    {checked && right && (
                      <small className="teaching-answer-label">É o que acontece na cena</small>
                    )}
                    {checked && chosen && !right && (
                      <small className="teaching-answer-label">
                        Sua previsão · compare com a cena
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
            <SceneButton tom="gesto" disabled={selected === null} onClick={() => setChecked(true)}>
              <Play size={16} aria-hidden />
              Ver o que acontece
            </SceneButton>
          ) : (
            <>
              <div className="teaching-quiz-feedback" data-correct={correct} role="status">
                <strong>{correct ? 'Isso mesmo.' : 'Vamos comparar com o resultado.'}</strong>
                <p>{question.explanation}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <SceneButton tom="gesto" onClick={() => move(!correct)}>
                  {correct
                    ? index === 2
                      ? 'Concluir revisão'
                      : 'Próxima pergunta'
                    : 'Tentar de novo'}
                  {correct && <ArrowRight size={16} aria-hidden />}
                </SceneButton>
                {correct && (
                  <SceneButton
                    onClick={() => {
                      setChecked(false)
                      setSelected(null)
                    }}
                  >
                    <RotateCcw size={16} aria-hidden />
                    Testar novamente
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
