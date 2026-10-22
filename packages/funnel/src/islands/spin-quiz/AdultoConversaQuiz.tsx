import { useEffect, useRef, useState } from 'react'
import type { SelecaoStep } from '../../content/quiz-config'
import type { QuizAnswers, QuizAnswerValue } from '../../lib/quiz-types'
import { Manchete } from './KidsConversaQuiz'
import {
  INTRO,
  linkWithAttribution,
  orderedOptions,
  REVIEW,
  type SpinEngine,
  useSpinQuiz,
} from './useSpinQuiz'

// O quiz adulto em conversa (Comunidade v1, 20/10/2026; Desafio v1, 21/10/2026): a entrada tem só o
// motivo de responder, "Começar" e o link "Tenho menos de 18 anos" (a saída para o quiz Kids, sem
// nada gravado sobre idade); depois, uma pergunta por tela. Tocar numa opção já grava e segue. A
// pele é a arcade (`.qz--adulto`, tokens `--cda-*` do theme-arcade). Cada funil passa a sua
// configuração (`AdultoQuizConfig`) por uma ilha fina.

const MINOR = 'menor-de-18'

export interface AdultoQuizConfig {
  engine: SpinEngine
  completesQuiz: (answers: QuizAnswers, key: string, value: QuizAnswerValue) => boolean
  /** A pergunta como a pessoa a vê (ex.: a calculadora da Comunidade); sem ela, a pergunta crua. */
  stepOnScreen?: (step: SelecaoStep, answers: QuizAnswers) => SelecaoStep
  headlines: Record<string, { title: string; emphasis: string }>
  quizHeadlineId: (param: string | null | undefined) => string
  entry: {
    eyebrow: string
    description: string
    chips: readonly string[]
    button: string
    minorLink: string
    note: string
    minor: { title: string; text: string; button: string; href: string }
  }
  stages: Record<string, string>
  /** O nome ao lado da logo no topo; sem ele, só a logo (o Desafio não se nomeia antes do resultado). */
  brandName?: string
  /** Prefixo dos `data-analytics-id` próprios do quiz. */
  analyticsPrefix: string
}

export interface AdultoQuizProps {
  funnel: string
  basePath: string
  quizDefinitionId?: string
  /** Variante da manchete resolvida no servidor (`?manchete=`); vai na atribuição do lead. */
  headline?: string
  /** O quiz Kids, para a saída de quem tem menos de 18 (o funil Kids está sempre no ar). */
  kidsQuizPath?: string
  /** Para onde "Sair" leva (a bio). */
  exitPath?: string
}

const answerList = (value: QuizAnswerValue | undefined): string[] =>
  Array.isArray(value) ? value : []

function Topo({ exitPath, brandName }: { exitPath: string; brandName?: string }) {
  return (
    <header className="qz-topo">
      <span className="qz-marca-topo">
        <img className="qz-logo" src="/logo_dark.svg" alt="Sistema Zero" width="515" height="44" />
        {brandName && <span className="qz-marca-nome">{brandName}</span>}
      </span>
      <a className="qz-sair" href={exitPath}>
        Sair
      </a>
    </header>
  )
}

export default function AdultoConversaQuiz({
  config: c,
  funnel,
  basePath,
  quizDefinitionId,
  headline: headlineParam,
  kidsQuizPath = c.entry.minor.href,
  exitPath = '/',
}: AdultoQuizProps & { config: AdultoQuizConfig }) {
  const QUIZ_ENTRY = c.entry
  const stepOnScreen = c.stepOnScreen ?? ((step: SelecaoStep) => step)
  const headline = c.quizHeadlineId(headlineParam)
  const manchete = c.headlines[headline] ?? { title: '', emphasis: '' }
  const quiz = useSpinQuiz({ funnel, basePath, quizDefinitionId, headline, engine: c.engine })
  const { current, steps, busy, error, conflict, updated, session } = quiz
  // A saída de menor de 18 é só da tela: não grava nada, e voltar dela devolve à entrada.
  const [minor, setMinor] = useState(false)
  const cursor = minor ? MINOR : quiz.cursor
  const heading = useRef<HTMLHeadingElement>(null)
  const anterior = useRef(cursor)

  // O foco vai ao título de cada tela; na entrada, só quando se volta a ela (na primeira abertura a
  // página começa do topo, sem roubar o foco).
  useEffect(() => {
    if (cursor !== INTRO || anterior.current !== INTRO) heading.current?.focus()
    anterior.current = cursor
  }, [cursor])

  const go = (key: string) => {
    setMinor(false)
    quiz.go(key)
  }

  const errorView = error && (
    <div className="qz-erro" role="alert">
      <p>{updated ? 'O quiz foi atualizado. Atualize a página para continuar.' : error}</p>
      {updated ? (
        <button className="qz-link" type="button" onClick={() => window.location.reload()}>
          Atualizar página
        </button>
      ) : (
        (!session || conflict) && (
          <button
            className="qz-link"
            type="button"
            disabled={busy}
            onClick={() => void quiz.load()}
          >
            Retomar respostas salvas
          </button>
        )
      )}
    </div>
  )

  const shell = (content: React.ReactNode) => (
    <div className="qz qz--adulto">
      <div className="qz-tela">
        <Topo exitPath={exitPath} brandName={c.brandName} />
        {content}
      </div>
    </div>
  )

  if (cursor === MINOR)
    return shell(
      <main id="quiz" className="qz-corpo">
        <h1 ref={heading} tabIndex={-1} className="qz-titulo">
          {QUIZ_ENTRY.minor.title}
        </h1>
        <p className="qz-descricao">{QUIZ_ENTRY.minor.text}</p>
        <div className="qz-acoes qz-acoes--fim">
          <a
            className="qz-botao"
            href={linkWithAttribution(kidsQuizPath)}
            data-analytics-id={`${c.analyticsPrefix}-saida-kids`}
          >
            {QUIZ_ENTRY.minor.button}
          </a>
          <button className="qz-link qz-link--centro" type="button" onClick={() => go(INTRO)}>
            <span aria-hidden="true">←</span> Voltar
          </button>
        </div>
      </main>,
    )

  if (cursor === INTRO) {
    const started = quiz.revision > 0
    const first = steps[0]?.key
    return shell(
      <main id="quiz" className="qz-corpo qz-entrada">
        <span className="qz-selo">{QUIZ_ENTRY.eyebrow}</span>
        <Manchete headline={manchete} headingRef={heading} />
        <p className="qz-descricao">{QUIZ_ENTRY.description}</p>
        <ul className="qz-chips">
          {QUIZ_ENTRY.chips.map((chip) => (
            <li key={chip} className="qz-chip">
              {chip.toUpperCase()}
            </li>
          ))}
        </ul>
        {errorView}
        <div className="qz-acoes qz-acoes--fim">
          {started ? (
            <>
              <button
                className="qz-botao"
                type="button"
                disabled={busy}
                onClick={() =>
                  quiz.complete
                    ? window.location.assign(quiz.resultPath)
                    : go(quiz.firstMissing ?? first ?? INTRO)
                }
              >
                {quiz.complete ? 'Ver meu resultado' : 'Continuar de onde parei'}
              </button>
              <button className="qz-link qz-link--centro" type="button" onClick={() => go(REVIEW)}>
                Rever respostas
              </button>
            </>
          ) : (
            <>
              <button
                className="qz-botao"
                type="button"
                disabled={!session || busy}
                data-analytics-id={`${c.analyticsPrefix}-comecar`}
                onClick={() => first && go(first)}
              >
                {QUIZ_ENTRY.button}
              </button>
              <button
                className="qz-link qz-link--centro"
                type="button"
                data-analytics-id={`${c.analyticsPrefix}-menor-de-18`}
                onClick={() => setMinor(true)}
              >
                {QUIZ_ENTRY.minorLink}
              </button>
            </>
          )}
        </div>
        {!session && !error && <p className="qz-nota">Preparando o quiz…</p>}
        <p className="qz-nota">{QUIZ_ENTRY.note}</p>
      </main>,
    )
  }

  if (cursor === REVIEW)
    return shell(
      <main id="quiz" className="qz-corpo">
        <h1 ref={heading} tabIndex={-1} className="qz-titulo">
          Suas respostas
        </h1>
        <p className="qz-descricao">
          Você pode mudar qualquer resposta. O resultado acompanha o que ficar salvo.
        </p>
        <ol className="qz-revisao">
          {steps.map((raw) => {
            const s = stepOnScreen(raw, current)
            const escolhidas = s.opcoes
              .filter(
                (o) => answerList(current[s.key]).includes(o.value) || current[s.key] === o.value,
              )
              .map((o) => o.label)
              .join(' · ')
            return (
              <li key={s.key}>
                <div>
                  <strong>{s.titulo}</strong>
                  <p>{escolhidas || 'Ainda sem resposta'}</p>
                </div>
                <button
                  className="qz-link"
                  type="button"
                  onClick={() => go(s.key)}
                  aria-label={`Mudar: ${s.titulo}`}
                >
                  Mudar
                </button>
              </li>
            )
          })}
        </ol>
        {errorView}
        <div className="qz-acoes">
          {quiz.complete ? (
            <a className="qz-botao" href={quiz.resultPath}>
              Voltar ao resultado
            </a>
          ) : (
            <button
              className="qz-botao"
              type="button"
              onClick={() => go(quiz.firstMissing ?? steps[0]?.key ?? INTRO)}
            >
              Continuar o quiz
            </button>
          )}
          <button
            className="qz-link"
            type="button"
            disabled={busy}
            onClick={() => void quiz.load(true)}
          >
            Responder de novo do começo
          </button>
        </div>
      </main>,
    )

  const step = steps.find((s) => s.key === cursor)
  if (!step) return null
  const shown = stepOnScreen(step, current)
  const position = steps.findIndex((s) => s.key === step.key)
  // A pergunta extra de um perfil só se abre no fim; ela aparece como "Pergunta extra", sem mudar o
  // total (antes, quem caía em B ou D via "10 de 10" e depois "11 de 11").
  const contadas = steps.filter((s) => !s.condicional)
  const total = contadas.length
  const extra = step.condicional === true
  const numero = extra ? total : contadas.findIndex((s) => s.key === step.key) + 1
  const rotulo = extra ? 'Pergunta extra' : `Pergunta ${numero} de ${total}`
  const etapa = c.stages[step.etapa] ?? ''
  const voltar = position === 0 ? INTRO : (steps[position - 1]?.key ?? INTRO)
  return shell(
    <main
      id="quiz"
      className="qz-corpo"
      data-analytics-question={step.key}
      data-analytics-quiz={quizDefinitionId}
      data-analytics-attempt={session?.id}
      data-analytics-position={position + 1}
    >
      <div className="qz-progresso">
        <div className="qz-progresso-linha">
          <span>{extra ? 'Pergunta extra' : `${numero} de ${total}`}</span>
          <span className="qz-etapa">{etapa}</span>
        </div>
        <div
          className="qz-barra"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={numero}
          aria-label={rotulo}
        >
          <span style={{ width: `${Math.round((numero / total) * 100)}%` }} />
        </div>
      </div>
      <h1 className="qz-titulo" ref={heading} tabIndex={-1}>
        {shown.titulo}
      </h1>
      {shown.subtitulo && <p className="qz-ajuda">{shown.subtitulo}</p>}
      <Opcoes
        step={shown}
        value={current[step.key]}
        seed={session?.id ?? ''}
        disabled={busy || conflict}
        completa={(value) => c.completesQuiz(current, step.key, value)}
        onEscolha={(value) => void quiz.save(step.key, value)}
      />
      {errorView}
      <div className="qz-rodape">
        <button className="qz-link" type="button" disabled={busy} onClick={() => go(voltar)}>
          <span aria-hidden="true">←</span> Voltar
        </button>
        <span>{busy ? 'Salvando…' : 'Toque numa opção'}</span>
      </div>
    </main>,
  )
}

/** As opções como botões: tocar numa grava e segue. */
function Opcoes({
  step,
  value,
  seed,
  disabled,
  completa,
  onEscolha,
}: {
  step: SelecaoStep
  value?: QuizAnswerValue
  seed: string
  disabled: boolean
  /** Se esta opção termina o quiz (o leitor de tela ouve "e ver o resultado"). */
  completa: (value: string) => boolean
  onEscolha: (value: string) => void
}) {
  return (
    <ul className="qz-opcoes">
      {orderedOptions(step, seed).map((o) => (
        <li key={o.value}>
          <button
            type="button"
            className="qz-opcao"
            aria-pressed={value === o.value}
            disabled={disabled}
            onClick={() => onEscolha(o.value)}
          >
            <span className="qz-marca" aria-hidden="true" />
            <span>{o.label}</span>
            {completa(o.value) && <span className="sr-only"> e ver o resultado</span>}
          </button>
        </li>
      ))}
    </ul>
  )
}
