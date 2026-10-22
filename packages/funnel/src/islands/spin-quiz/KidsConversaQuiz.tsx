import { useEffect, useRef } from 'react'
import type { SelecaoStep } from '../../content/quiz-config'
import { flexionar, type Genero } from '../../funnels/comunidade-dos-criadores/quiz/genero'
import type { QuizAnswers, QuizAnswerValue } from '../../lib/quiz-types'
import { INTRO, orderedOptions, REVIEW, type SpinEngine, useSpinQuiz } from './useSpinQuiz'

// O quiz Kids em conversa (Comunidade v6, 20/10/2026; Desafio v5, 21/10/2026): filho ou filha em
// duas cartas na entrada, a idade em três cartas e as perguntas do ramo, uma por tela. Tocar numa
// opção já grava e segue. O ramo menor de 9 ganha a pele pastel; 18 ou mais termina na saída para
// o quiz adulto. Cada funil passa a sua configuração (`KidsQuizConfig`) por uma ilha fina, porque
// funções não atravessam as props do Astro.

export const KIDS_EXIT = 'saida-adulto'

export interface KidsQuizConfig {
  /** O motor; `exitCursor` deve devolver `KIDS_EXIT` na saída de 18 ou mais. */
  engine: SpinEngine
  isAdultExit: (answers: QuizAnswers) => boolean
  childGender: (answers: QuizAnswers) => Genero
  branchOf: (answers: QuizAnswers) => string | null
  completesQuiz: (answers: QuizAnswers, key: string, value: QuizAnswerValue) => boolean
  stepOnScreen: (step: SelecaoStep, answers: QuizAnswers) => SelecaoStep
  headlines: Record<string, { title: string; emphasis: string }>
  quizHeadlineId: (param: string | null | undefined) => string
  entry: {
    eyebrow: string
    description: string
    note: string
    sair: string
    sobre: string
    voltar: string
    tocar: string
  }
  stageLabels: Record<'9a17' | 'm9', Record<'rotina' | 'casa' | 'desejo', string>>
  adultExit: { title: string; text: string; action: string; fallbackAction: string; fix: string }
  generoStep: SelecaoStep
  idadeStep: SelecaoStep
  /** O total da contagem antes de a idade abrir um ramo. */
  defaultTotal: number
  /** Prefixo dos `data-analytics-id` próprios do quiz. */
  analyticsPrefix: string
}

export interface KidsQuizProps {
  funnel: string
  basePath: string
  quizDefinitionId?: string
  /** Variante da manchete resolvida no servidor (`?manchete=`); vai na atribuição do lead. */
  headline?: string
  /** O quiz adulto, quando o funil adulto está no ar; sem ele, a saída volta à página inicial. */
  adultQuizPath?: string
  /** Para onde "Sair" leva (a bio). */
  exitPath?: string
}

const answerList = (value: QuizAnswerValue | undefined): string[] =>
  Array.isArray(value) ? value : []

const LOGO_KIDS = '/img/comunidade-dos-criadores/logo-kids-claro.svg'

function Topo({ exitPath, sair }: { exitPath: string; sair: string }) {
  return (
    <header className="qz-topo">
      <img className="qz-logo" src={LOGO_KIDS} alt="Sistema Zero Kids" width="287" height="22" />
      <a className="qz-sair" href={exitPath}>
        {sair}
      </a>
    </header>
  )
}

/** A manchete com o trecho em destaque. */
export function Manchete({
  headline,
  headingRef,
}: {
  headline: { title: string; emphasis: string }
  headingRef?: React.Ref<HTMLHeadingElement>
}) {
  const { title, emphasis } = headline
  const at = title.indexOf(emphasis)
  if (at < 0)
    return (
      <h1 className="qz-manchete" ref={headingRef} tabIndex={-1}>
        {title}
      </h1>
    )
  return (
    <h1 className="qz-manchete" ref={headingRef} tabIndex={-1}>
      {title.slice(0, at)}
      <em>{emphasis}</em>
      {title.slice(at + emphasis.length)}
    </h1>
  )
}

export default function KidsConversaQuiz({
  config: c,
  funnel,
  basePath,
  quizDefinitionId,
  headline: headlineParam,
  adultQuizPath,
  exitPath = '/',
}: KidsQuizProps & { config: KidsQuizConfig }) {
  const {
    entry: QUIZ_ENTRY,
    adultExit: ADULT_EXIT,
    generoStep: GENERO_STEP,
    idadeStep: IDADE_STEP,
    isAdultExit,
    stepOnScreen,
  } = c
  const EXIT = KIDS_EXIT
  const headline = c.quizHeadlineId(headlineParam)
  const manchete = c.headlines[headline] ?? { title: '', emphasis: '' }
  const quiz = useSpinQuiz({ funnel, basePath, quizDefinitionId, headline, engine: c.engine })
  const { current, steps, cursor, busy, error, conflict, updated, session } = quiz
  const heading = useRef<HTMLHeadingElement>(null)
  const anterior = useRef(cursor)
  const genero = c.childGender(current)
  const branch = c.branchOf(current)
  const pele = branch === 'm9' ? 'qz--m9' : 'qz--kids'

  // O foco vai ao título de cada tela; na entrada, só quando se volta a ela (na primeira abertura a
  // página começa do topo, sem roubar o foco).
  useEffect(() => {
    if (cursor !== INTRO || anterior.current !== INTRO) heading.current?.focus()
    anterior.current = cursor
  }, [cursor])

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
    <div className={`qz ${pele}`}>
      <div className="qz-tela">
        <Topo exitPath={exitPath} sair={QUIZ_ENTRY.sair} />
        {content}
      </div>
    </div>
  )

  if (cursor === INTRO) {
    const started = quiz.revision > 0
    return shell(
      <main id="quiz" className="qz-corpo qz-entrada">
        <span className="qz-selo">{QUIZ_ENTRY.eyebrow}</span>
        <Manchete headline={manchete} headingRef={heading} />
        <p className="qz-descricao">{QUIZ_ENTRY.description}</p>
        {errorView}
        {started ? (
          <div className="qz-acoes">
            <button
              className="qz-botao"
              type="button"
              disabled={busy}
              onClick={() =>
                quiz.complete
                  ? window.location.assign(quiz.resultPath)
                  : quiz.go(isAdultExit(current) ? EXIT : (quiz.firstMissing ?? GENERO_STEP.key))
              }
            >
              {quiz.complete ? 'Ver meu resultado' : 'Continuar de onde parei'}
            </button>
            <button className="qz-link" type="button" onClick={() => quiz.go(REVIEW)}>
              Rever respostas
            </button>
          </div>
        ) : (
          <section
            className="qz-genero"
            aria-labelledby="qz-genero-titulo"
            data-analytics-question={GENERO_STEP.key}
            data-analytics-quiz={quizDefinitionId}
            data-analytics-attempt={session?.id}
            data-analytics-position={1}
          >
            <h2 id="qz-genero-titulo" className="qz-pergunta-entrada">
              {GENERO_STEP.titulo}
            </h2>
            <p className="qz-ajuda">{GENERO_STEP.subtitulo}</p>
            <div className="qz-cartas-genero">
              {GENERO_STEP.opcoes.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={`qz-carta-genero qz-carta-genero--${o.value}`}
                  disabled={!session || busy}
                  onClick={() => void quiz.save(GENERO_STEP.key, o.value)}
                >
                  {o.image && <img src={o.image} alt="" width="120" height="160" />}
                  <strong>{o.label}</strong>
                </button>
              ))}
            </div>
            {!session && !error && <p className="qz-nota">Preparando o quiz…</p>}
          </section>
        )}
        <p className="qz-nota">{QUIZ_ENTRY.note}</p>
      </main>,
    )
  }

  if (cursor === EXIT)
    return shell(
      <main id="quiz" className="qz-corpo">
        <h1 ref={heading} tabIndex={-1} className="qz-titulo">
          {ADULT_EXIT.title}
        </h1>
        <p className="qz-descricao">{ADULT_EXIT.text}</p>
        {errorView}
        <div className="qz-acoes">
          <a
            className="qz-botao"
            href={adultQuizPath ?? exitPath}
            data-analytics-id={`${c.analyticsPrefix}-saida-adulto`}
          >
            {adultQuizPath ? ADULT_EXIT.action : ADULT_EXIT.fallbackAction}
          </a>
          <button className="qz-link" type="button" onClick={() => quiz.go(IDADE_STEP.key)}>
            {ADULT_EXIT.fix}
          </button>
        </div>
      </main>,
    )

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
                  onClick={() => quiz.go(s.key)}
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
              onClick={() =>
                quiz.go(isAdultExit(current) ? EXIT : (quiz.firstMissing ?? GENERO_STEP.key))
              }
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
            Responder pensando em outra criança
          </button>
        </div>
      </main>,
    )

  const step = steps.find((s) => s.key === cursor)
  if (!step) return null
  const shown = stepOnScreen(step, current)
  const position = steps.findIndex((s) => s.key === step.key)
  // A carta de filho ou filha fica fora da contagem: a idade é a primeira pergunta. A pergunta extra
  // de um perfil só se abre no fim; ela aparece como "Pergunta extra", sem mudar o total.
  const contadas = steps.filter((s) => !s.condicional && s.key !== GENERO_STEP.key)
  const total = branch === '9a17' || branch === 'm9' ? contadas.length : c.defaultTotal
  const extra = step.condicional === true
  const numero = extra ? total : Math.max(contadas.findIndex((s) => s.key === step.key) + 1, 1)
  const rotulo = extra ? 'Pergunta extra' : `Pergunta ${numero} de ${total}`
  const etapa =
    step.key === IDADE_STEP.key
      ? flexionar(QUIZ_ENTRY.sobre, genero)
      : flexionar(
          c.stageLabels[branch === 'm9' ? 'm9' : '9a17'][
            step.etapa as 'rotina' | 'casa' | 'desejo'
          ] ?? '',
          genero,
        )
  // Da idade, Voltar leva à pergunta de filho ou filha (na entrada ela não aparece mais depois de
  // respondida); dela, à entrada.
  const voltar = position === 0 ? INTRO : (steps[position - 1]?.key ?? INTRO)
  const contagem = step.key !== GENERO_STEP.key
  return shell(
    <main
      id="quiz"
      className="qz-corpo"
      data-analytics-question={step.key}
      data-analytics-quiz={quizDefinitionId}
      data-analytics-attempt={session?.id}
      data-analytics-position={position + 1}
    >
      {/* A pergunta de filho ou filha fica fora da contagem, como na entrada. */}
      {contagem && (
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
      )}
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
        idadeKey={IDADE_STEP.key}
        onEscolha={(value) => void quiz.save(step.key, value)}
      />
      {errorView}
      <div className="qz-rodape">
        <button className="qz-link" type="button" disabled={busy} onClick={() => quiz.go(voltar)}>
          <span aria-hidden="true">←</span> {QUIZ_ENTRY.voltar}
        </button>
        <span>{busy ? 'Salvando…' : QUIZ_ENTRY.tocar}</span>
      </div>
    </main>,
  )
}

/**
 * As opções como botões: tocar numa grava e segue. A da idade vira três cartas grandes, e "18 ou
 * mais" fica como link pequeno embaixo delas.
 */
function Opcoes({
  step,
  value,
  seed,
  disabled,
  completa,
  idadeKey,
  onEscolha,
}: {
  step: SelecaoStep
  value?: QuizAnswerValue
  seed: string
  disabled: boolean
  /** Se esta opção termina o quiz (o leitor de tela ouve "e ver o resultado"). */
  completa: (value: string) => boolean
  idadeKey: string
  onEscolha: (value: string) => void
}) {
  const idade = step.key === idadeKey
  const opcoes = orderedOptions(step, seed)
  const principais = idade ? opcoes.filter((o) => o.value !== '18_mais') : opcoes
  const adulto = idade ? opcoes.find((o) => o.value === '18_mais') : undefined
  return (
    <div className="qz-opcoes-bloco">
      <ul className={idade ? 'qz-opcoes qz-opcoes--cartas' : 'qz-opcoes'}>
        {principais.map((o) => (
          <li key={o.value}>
            <button
              type="button"
              className="qz-opcao"
              aria-pressed={value === o.value}
              disabled={disabled}
              onClick={() => onEscolha(o.value)}
            >
              {!idade && <span className="qz-marca" aria-hidden="true" />}
              <span>{o.label}</span>
              {completa(o.value) && <span className="sr-only"> e ver o resultado</span>}
            </button>
          </li>
        ))}
      </ul>
      {adulto && (
        <button
          type="button"
          className="qz-link qz-link--centro"
          disabled={disabled}
          onClick={() => onEscolha(adulto.value)}
        >
          {adulto.label}
        </button>
      )}
    </div>
  )
}
