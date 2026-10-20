import { useCallback, useEffect, useRef, useState } from 'react'
import type { SelecaoStep } from '../content/quiz-config'
import {
  activeCommunitySteps,
  answerList,
  childGender,
  completesQuiz,
  isCommunityQuizComplete,
  isOutsideCommunityAge,
  QUIZ_VERSION,
  quizRevision,
  stepOnScreen,
  validChoice,
} from '../funnels/comunidade-dos-criadores/quiz/engine'
import {
  QUIZ_ENTRY,
  QUIZ_HEADLINES,
  type QuizHeadlineId,
  quizHeadlineId,
} from '../funnels/comunidade-dos-criadores/quiz/entry-copy'
import { flexionar } from '../funnels/comunidade-dos-criadores/quiz/genero'
import { COMMUNITY_QUESTIONS } from '../funnels/comunidade-dos-criadores/quiz/questions'
import { ApiError, apiPatch, apiPost } from '../lib/api-fetch'
import { leadAttributionFromLocation } from '../lib/lead-attribution'
import type { QuizAnswers, QuizAnswerValue } from '../lib/quiz-types'

interface Props {
  funnel: string
  basePath: string
  imagesBase: string
  quizDefinitionId?: string
  /** Variante da manchete resolvida no servidor (`?manchete=`); vai na atribuição do lead. */
  headline?: string
}
interface Session {
  id: string
  answers: QuizAnswers
  sessionToken: string
}
// SPIN em três etapas: a rotina (situação), o que acontece em casa (problema e implicação) e o
// que a família quer ver (necessidade e diagnóstico final).
const stages = [
  ['rotina', 'A rotina'],
  ['casa', 'O que acontece em casa'],
  ['desejo', 'O que você quer'],
] as const

/** O chip de cada etapa: o mesmo desenho dos capítulos da oferta (ícone e cor de unidade). */
const STAGE_CHIP = {
  rotina: { cor: 'cor-azul', icone: 'schedule', texto: 'A rotina dele' },
  casa: { cor: 'cor-rosa', icone: 'home', texto: 'O que acontece em casa' },
  desejo: { cor: 'cor-verde', icone: 'favorite', texto: 'O que você quer' },
} as const

const FIRST_STEP = COMMUNITY_QUESTIONS[0]!

function Eyebrow({ icon, children }: { icon: string; children: string }) {
  return (
    <span className="kof-eyebrow">
      <span className="material-symbols-rounded" aria-hidden="true">
        {icon}
      </span>
      {children}
    </span>
  )
}

/** A manchete com o trecho em destaque (o mesmo `<em>` das ofertas). */
function Headline({ id }: { id: QuizHeadlineId }) {
  const { title, emphasis } = QUIZ_HEADLINES[id]
  const at = title.indexOf(emphasis)
  if (at < 0) return <h1 className="kof-display">{title}</h1>
  return (
    <h1 className="kof-display">
      {title.slice(0, at)}
      <em>{emphasis}</em>
      {title.slice(at + emphasis.length)}
    </h1>
  )
}

/** Stable within a lead, including refreshes; ordering never changes the decision. */
export function orderedOptions(step: SelecaoStep, seed: string): SelecaoStep['opcoes'] {
  if (!step.shuffle) return step.opcoes
  const movable = step.opcoes.filter((o) => !step.fixedLast?.includes(o.value))
  let hash = 2166136261
  for (const char of `${seed}:${step.key}`)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0
  for (let i = movable.length - 1; i > 0; i--) {
    hash = (Math.imul(hash, 1664525) + 1013904223) >>> 0
    const j = hash % (i + 1)
    ;[movable[i], movable[j]] = [movable[j]!, movable[i]!]
  }
  return [...movable, ...step.opcoes.filter((o) => step.fixedLast?.includes(o.value))]
}

export default function ComunidadeQuiz({
  funnel,
  basePath,
  imagesBase,
  quizDefinitionId,
  headline: headlineParam,
}: Props) {
  const headline = quizHeadlineId(headlineParam)
  const [session, setSession] = useState<Session | null>(null)
  const [cursor, setCursor] = useState('intro')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [updated, setUpdated] = useState(false)
  const locked = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const answers = session?.answers ?? {}
  const current = answers._quiz_version === QUIZ_VERSION ? answers : {}
  const steps = activeCommunitySteps(current)
  const step = steps.find((s) => s.key === cursor)
  const complete = isCommunityQuizComplete(current)
  const firstMissing = steps.find((s) => !validChoice(s, current[s.key]))?.key ?? FIRST_STEP.key
  const genero = childGender(current)
  // A variante da manchete viaja na atribuição (first-touch) para o teste A/B do /admin.
  const attribution = () => ({
    ...(leadAttributionFromLocation(window.location) ?? { landingPath: window.location.pathname }),
    quizHeadline: headline,
  })

  const receive = useCallback((data: Session, restart = false, navigate = true) => {
    setSession(data)
    setError('')
    setConflict(false)
    if (!navigate) return
    const a = data.answers._quiz_version === QUIZ_VERSION ? data.answers : {}
    const hash = window.location.hash.slice(1)
    if (restart) setCursor('intro')
    else if (hash === 'rever') setCursor('review')
    else if (activeCommunitySteps(a).some((s) => s.key === hash)) setCursor(hash)
    else if (isOutsideCommunityAge(a)) setCursor('age')
    else setCursor('intro')
  }, [])

  async function load(restart = false) {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    setError('')
    try {
      const data = await apiPost<Session>('/api/leads', {
        funnel,
        restartQuiz: restart,
        quizDefinitionId,
        attribution: attribution(),
      })
      if (restart)
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      receive(data, restart)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'QUIZ_UPDATED') setUpdated(true)
      setError('Não foi possível abrir suas respostas. Confira a conexão e tente novamente.')
    } finally {
      locked.current = false
      setBusy(false)
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: a sessão abre uma vez por funil; a atribuição é lida da URL nesse momento.
  useEffect(() => {
    let active = true
    apiPost<Session>('/api/leads', { funnel, quizDefinitionId, attribution: attribution() })
      .then((data) => {
        if (!active) return
        receive(data)
        // "Responder pensando em outra criança" no resultado chega aqui: a sessão nova nasce com
        // a definição do quiz e a manchete (o resultado não conhece nenhuma das duas).
        if (window.location.hash === '#outra-crianca') void load(true)
      })
      .catch((err) => {
        if (err instanceof ApiError && err.code === 'QUIZ_UPDATED') setUpdated(true)
        if (active) setError('Não foi possível abrir o quiz. Confira a conexão e tente novamente.')
      })
    return () => {
      active = false
    }
  }, [funnel, receive, quizDefinitionId])

  useEffect(() => {
    if (cursor !== 'intro') heading.current?.focus()
  }, [cursor])

  function go(key: string) {
    setError('')
    setCursor(key)
  }

  async function save(key: string, value: QuizAnswerValue) {
    if (locked.current || !session) return
    locked.current = true
    setBusy(true)
    setError('')
    try {
      const data = await apiPatch<{ answers: QuizAnswers; complete: boolean }>('/api/leads', {
        quizDefinitionId,
        key,
        value,
        revision: quizRevision(answers),
        sessionToken: session.sessionToken,
        funnel,
      })
      setSession({ ...session, answers: data.answers })
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      if (isOutsideCommunityAge(data.answers)) setCursor('age')
      else if (data.complete) window.location.assign(`${basePath}/resultado`)
      else {
        const next = activeCommunitySteps(data.answers).find(
          (s) => !validChoice(s, data.answers[s.key]),
        )
        setCursor(next?.key ?? 'review')
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'QUIZ_UPDATED') setUpdated(true)
      const stale = err instanceof ApiError && [401, 404, 409].includes(err.status)
      setConflict(stale)
      setError(
        stale
          ? 'As respostas desta sessão mudaram. Retome o que está salvo antes de continuar.'
          : 'Não conseguimos salvar esta resposta. Sua escolha continua aqui. Tente novamente.',
      )
    } finally {
      locked.current = false
      setBusy(false)
    }
  }

  const errorView = error && (
    <div className="cq-error" role="alert">
      <p>{updated ? 'O quiz foi atualizado. Atualize a página para continuar.' : error}</p>
      {updated && (
        <button className="cq-link" type="button" onClick={() => window.location.reload()}>
          Atualizar página
        </button>
      )}
      {!updated && (!session || conflict) && (
        <button className="cq-link" type="button" disabled={busy} onClick={() => void load()}>
          Retomar respostas salvas
        </button>
      )}
    </div>
  )
  if (cursor === 'intro') {
    const started = quizRevision(current) > 0
    return (
      <main id="quiz" className="wrap cq-intro">
        <div className="cq-intro-copy">
          <Eyebrow icon="family_star">{QUIZ_ENTRY.eyebrow}</Eyebrow>
          <Headline id={headline} />
          <p className="kof-lead">{QUIZ_ENTRY.description}</p>
          {errorView}
          {started ? (
            <div className="cq-actions">
              <button
                className="kof-btn kof-btn--grande"
                type="button"
                disabled={busy}
                onClick={() =>
                  complete ? window.location.assign(`${basePath}/resultado`) : go(firstMissing)
                }
              >
                {complete ? 'Ver meu resultado' : 'Continuar de onde parei'}
                <span aria-hidden="true">→</span>
              </button>
              <button className="cq-link" type="button" onClick={() => go('review')}>
                Rever respostas
              </button>
            </div>
          ) : (
            // A P1 fica na própria entrada: clicar na criança e na idade já começa o quiz.
            <section
              className="cq-p1"
              aria-labelledby="titulo-p1"
              data-analytics-question={FIRST_STEP.key}
              data-analytics-quiz={quizDefinitionId}
              data-analytics-attempt={session?.id}
              data-analytics-position={1}
            >
              <h2 id="titulo-p1" className="kof-display">
                {FIRST_STEP.titulo}
              </h2>
              <p className="cq-description">{FIRST_STEP.subtitulo}</p>
              <ul className="cq-p1-opcoes">
                {FIRST_STEP.opcoes.map((o) => (
                  <li key={o.value}>
                    <button
                      className="cq-option"
                      type="button"
                      disabled={!session || busy}
                      onClick={() => void save(FIRST_STEP.key, o.value)}
                    >
                      <span>{o.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {!session && !error && <p className="cq-note">Preparando o quiz…</p>}
            </section>
          )}
          <p className="cq-note">{QUIZ_ENTRY.note}</p>
        </div>
        <div className="cq-hero-art">
          <Eyebrow icon="visibility">{QUIZ_ENTRY.lookAtTitle}</Eyebrow>
          <ul className="cq-possibilities cq-possibilities--curtas">
            {QUIZ_ENTRY.lookAt.map((item) => (
              <li key={item.icon}>
                <span className="material-symbols-rounded" aria-hidden="true">
                  {item.icon}
                </span>
                <div>
                  <strong>{item.title}</strong>
                </div>
              </li>
            ))}
          </ul>
          <img
            className="cq-mascot"
            src={`${imagesBase}/zappy-happy.webp`}
            alt=""
            width="300"
            height="300"
          />
        </div>
      </main>
    )
  }

  if (cursor === 'age')
    return (
      <main id="quiz" className="wrap cq-flow">
        <div className="cq-panel">
          <Eyebrow icon="cake">Sobre a faixa de idade</Eyebrow>
          <h1 ref={heading} tabIndex={-1} className="kof-display">
            Esta orientação foi pensada para famílias com crianças de 9 a 14 anos.
          </h1>
          <p>
            As perguntas e o resultado deste quiz partem do que costuma acontecer com crianças de 9
            a 14 anos, e para outra idade a orientação não seria certa. Se a idade foi marcada por
            engano, é só corrigir. Se há outra criança nessa faixa em casa, você pode responder
            pensando nela.
          </p>
          {errorView}
          <div className="cq-actions">
            <button className="cq-link" type="button" onClick={() => go(FIRST_STEP.key)}>
              Corrigir a idade
            </button>
            <button
              className="cq-link"
              type="button"
              disabled={busy}
              onClick={() => void load(true)}
            >
              Responder pensando em outra criança
            </button>
          </div>
        </div>
      </main>
    )

  if (cursor === 'review')
    return (
      <main id="quiz" className="wrap cq-flow">
        <div className="cq-panel">
          <Eyebrow icon="checklist">Suas respostas</Eyebrow>
          <h1 ref={heading} tabIndex={-1} className="kof-display">
            O que você gostaria de ajustar?
          </h1>
          <p>Você pode rever qualquer resposta. O resultado muda com o que ficar salvo.</p>
          <ol className="cq-review">
            {steps.map((raw) => {
              const s = stepOnScreen(raw, current)
              return (
                <li key={s.key}>
                  <div>
                    <strong>{s.titulo}</strong>
                    <p>
                      {s.opcoes
                        .filter(
                          (o) =>
                            answerList(current[s.key]).includes(o.value) ||
                            current[s.key] === o.value,
                        )
                        .map((o) => o.label)
                        .join(' · ') || 'Ainda sem resposta'}
                    </p>
                  </div>
                  <button
                    className="cq-link"
                    type="button"
                    onClick={() => go(s.key)}
                    aria-label={`Editar: ${s.titulo}`}
                  >
                    Editar
                  </button>
                </li>
              )
            })}
          </ol>
          {errorView}
          <div className="cq-actions">
            {complete ? (
              <a className="kof-btn" href={`${basePath}/resultado`}>
                Voltar ao resultado
              </a>
            ) : (
              <button className="kof-btn" type="button" onClick={() => go(firstMissing)}>
                Continuar o quiz
              </button>
            )}
            <button
              className="cq-link"
              type="button"
              disabled={busy}
              onClick={() => void load(true)}
            >
              Responder pensando em outra criança
            </button>
          </div>
        </div>
      </main>
    )

  if (!step) return null
  const shown = stepOnScreen(step, current)
  const position = steps.findIndex((s) => s.key === step.key)
  const stageIndex = stages.findIndex(([id]) => id === step.etapa)
  const chip = STAGE_CHIP[step.etapa as keyof typeof STAGE_CHIP] ?? STAGE_CHIP.rotina
  return (
    <main
      id="quiz"
      className="wrap cq-flow"
      data-analytics-question={step.key}
      data-analytics-quiz={quizDefinitionId}
      data-analytics-attempt={session?.id}
      data-analytics-position={steps.indexOf(step) + 1}
    >
      <ol className="cq-stages" aria-label="Etapas do quiz">
        {stages.map(([id, title], i) => (
          <li
            key={id}
            aria-current={step.etapa === id ? 'step' : undefined}
            data-estado={i < stageIndex ? 'feita' : i === stageIndex ? 'atual' : 'depois'}
          >
            <span>
              {i < stageIndex ? (
                <span className="material-symbols-rounded" aria-hidden="true">
                  check
                </span>
              ) : (
                i + 1
              )}
            </span>
            {title}
            {i < stageIndex && <span className="sr-only"> (concluída)</span>}
          </li>
        ))}
      </ol>
      <div className={`cq-panel ${chip.cor}`}>
        <span className="cap-chip">
          <span className="material-symbols-rounded cap-chip-icone" aria-hidden="true">
            {chip.icone}
          </span>
          <span className="cap-chip-texto">{flexionar(chip.texto, genero)}</span>
        </span>
        <h1 className="kof-display" ref={heading} tabIndex={-1}>
          {shown.titulo}
        </h1>
        {shown.subtitulo && (
          <p id="question-help" className="cq-description">
            {shown.subtitulo}
          </p>
        )}
        <Question
          key={`${step.key}:${session?.id}:${quizRevision(answers)}`}
          step={shown}
          value={current[step.key]}
          seed={session?.id ?? ''}
          busy={busy}
          blocked={conflict}
          labelFor={(value) =>
            completesQuiz(current, step.key, value) ? 'Ver o resultado' : 'Continuar'
          }
          onSave={(value) => save(step.key, value)}
        />
        {errorView}
        <div className="cq-question-nav">
          <button
            className="cq-link"
            type="button"
            disabled={busy}
            onClick={() => go(steps[position - 1]?.key ?? 'intro')}
          >
            ← Voltar
          </button>
          <button className="cq-link" type="button" disabled={busy} onClick={() => go('review')}>
            Rever respostas
          </button>
        </div>
      </div>
      <p className="cq-note cq-save-note">
        Você pode retomar suas respostas neste navegador, voltar e ajustar.
      </p>
    </main>
  )
}

function Question({
  step,
  value,
  seed,
  busy,
  blocked,
  labelFor,
  onSave,
}: {
  step: SelecaoStep
  value?: QuizAnswerValue
  seed: string
  busy: boolean
  blocked: boolean
  /** O rótulo do botão pela resposta escolhida: "Ver o resultado" quando ela completa o quiz. */
  labelFor: (value: QuizAnswerValue) => string
  onSave: (value: QuizAnswerValue) => Promise<void>
}) {
  const [selected, setSelected] = useState<string[]>(
    Array.isArray(value) ? value : typeof value === 'string' ? [value] : [],
  )
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  function choose(value: string) {
    setError('')
    setNotice('')
    if (!step.multiple) {
      setSelected([value])
      return
    }
    if (selected.includes(value)) {
      setSelected(selected.filter((v) => v !== value))
      return
    }
    if (step.exclusive?.includes(value)) {
      if (selected.length) setNotice('Esta opção substituiu as outras escolhas.')
      setSelected([value])
      return
    }
    const next = [...selected.filter((v) => !step.exclusive?.includes(v)), value]
    if (next.length > (step.maxSelections ?? 4)) {
      setError(`Escolha até ${step.maxSelections} opções. Desmarque uma para trocar.`)
      return
    }
    setSelected(next)
  }
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const answer = step.multiple ? selected : (selected[0] ?? '')
        if (!validChoice(step, answer)) {
          setError('Escolha uma resposta para continuar.')
          return
        }
        void onSave(answer)
      }}
    >
      <fieldset
        className="cq-options"
        disabled={busy || blocked}
        aria-describedby={step.subtitulo ? 'question-help' : undefined}
      >
        <legend className="sr-only">{step.titulo}</legend>
        {orderedOptions(step, seed).map((option) => (
          <label className="cq-option" key={option.value}>
            <input
              type={step.multiple ? 'checkbox' : 'radio'}
              name={step.key}
              value={option.value}
              checked={selected.includes(option.value)}
              onChange={() => choose(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>
      <div aria-live="polite">{notice && <p className="cq-note">{notice}</p>}</div>
      {error && (
        <p className="cq-error" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        className="kof-btn kof-btn--grande cq-continue"
        disabled={busy || blocked}
      >
        {busy ? 'Salvando…' : labelFor(step.multiple ? selected : (selected[0] ?? ''))}
        <span aria-hidden="true">→</span>
      </button>
    </form>
  )
}
