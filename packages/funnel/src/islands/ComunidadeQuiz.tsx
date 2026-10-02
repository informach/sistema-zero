import { useCallback, useEffect, useRef, useState } from 'react'
import type { SelecaoStep } from '../content/quiz-config'
import {
  activeCommunitySteps,
  answerList,
  isCommunityQuizComplete,
  isOutsideCommunityAge,
  QUIZ_VERSION,
  quizRevision,
  validChoice,
} from '../funnels/comunidade-dos-criadores/quiz/engine'
import { QUIZ_ENTRY } from '../funnels/comunidade-dos-criadores/quiz/entry-copy'
import { COMMUNITY_QUESTIONS } from '../funnels/comunidade-dos-criadores/quiz/questions'
import { ApiError, apiPatch, apiPost } from '../lib/api-fetch'
import { leadAttributionFromLocation } from '../lib/lead-attribution'
import type { QuizAnswers, QuizAnswerValue } from '../lib/quiz-types'

interface Props {
  funnel: string
  basePath: string
  imagesBase: string
}
interface Session {
  id: string
  answers: QuizAnswers
  sessionToken: string
}
const stages = [
  ['filho', 'Sobre seu filho'],
  ['objetivos', 'O que vocês procuram'],
  ['comeco', 'A rotina de vocês'],
] as const

/** O chip de cada etapa: o mesmo desenho dos capítulos da oferta (ícone e cor de unidade). */
const STAGE_CHIP = {
  filho: { cor: 'cor-azul', icone: 'face', texto: 'O que chama a atenção dele' },
  objetivos: { cor: 'cor-rosa', icone: 'favorite', texto: 'O que importa para você' },
  comeco: { cor: 'cor-verde', icone: 'schedule', texto: 'O que cabe na rotina de vocês' },
} as const

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

/** Stable within a lead, including refreshes; ordering never changes the decision. */
export function orderedOptions(step: SelecaoStep, seed: string): SelecaoStep['opcoes'] {
  if (step.key === 'qt') {
    const objectives = COMMUNITY_QUESTIONS.find((s) => s.key === 'q4')!
    const order = [...orderedOptions(objectives, seed).map((o) => o.value), 'iguais']
    return [...step.opcoes].sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value))
  }
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

export default function ComunidadeQuiz({ funnel, basePath, imagesBase }: Props) {
  const [session, setSession] = useState<Session | null>(null)
  const [cursor, setCursor] = useState('intro')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const locked = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const answers = session?.answers ?? {}
  const current = answers._quiz_version === QUIZ_VERSION ? answers : {}
  const steps = activeCommunitySteps(current)
  const step = steps.find((s) => s.key === cursor)
  const complete = isCommunityQuizComplete(current)
  const firstMissing = steps.find((s) => !validChoice(s, current[s.key]))?.key ?? 'q1'

  const receive = useCallback((data: Session, restart = false, navigate = true) => {
    setSession(data)
    setError('')
    setConflict(false)
    if (!navigate) return
    const a = data.answers._quiz_version === QUIZ_VERSION ? data.answers : {}
    const hash = window.location.hash.slice(1)
    if (restart) setCursor('q1')
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
        attribution: leadAttributionFromLocation(window.location),
      })
      if (restart)
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      receive(data, restart)
    } catch {
      setError('Não foi possível abrir suas respostas. Confira a conexão e tente novamente.')
    } finally {
      locked.current = false
      setBusy(false)
    }
  }

  useEffect(() => {
    let active = true
    apiPost<Session>('/api/leads', {
      funnel,
      attribution: leadAttributionFromLocation(window.location),
    })
      .then((data) => {
        if (active) receive(data)
      })
      .catch(() => {
        if (active) setError('Não foi possível abrir o quiz. Confira a conexão e tente novamente.')
      })
    return () => {
      active = false
    }
  }, [funnel, receive])

  useEffect(() => {
    if (cursor !== 'intro') heading.current?.focus()
  }, [cursor])

  function go(key: string) {
    setError('')
    setCursor(key)
  }

  async function save(value: QuizAnswerValue) {
    if (!step || locked.current || !session) return
    locked.current = true
    setBusy(true)
    setError('')
    try {
      const data = await apiPatch<{ answers: QuizAnswers; complete: boolean }>('/api/leads', {
        key: step.key,
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
      <p>{error}</p>
      {(!session || conflict) && (
        <button className="cq-link" type="button" disabled={busy} onClick={() => void load()}>
          Retomar respostas salvas
        </button>
      )}
    </div>
  )
  if (cursor === 'intro')
    return (
      <main id="quiz" className="wrap cq-intro">
        <div className="cq-intro-copy">
          <Eyebrow icon="family_star">Uma descoberta para a família · 9 a 14 anos</Eyebrow>
          <h1 className="kof-display">
            {QUIZ_ENTRY.titleStart}
            <em>{QUIZ_ENTRY.emphasis}</em>
          </h1>
          <p className="kof-lead">{QUIZ_ENTRY.lead}</p>
          <p>{QUIZ_ENTRY.delivery}</p>
          <ul className="cq-intro-points">
            {QUIZ_ENTRY.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <p>Responda pensando em um filho de cada vez. Você pode indicar o que ainda não sabe.</p>
          {errorView}
          <div className="cq-actions">
            <button
              className="kof-btn kof-btn--grande"
              type="button"
              disabled={!session || busy}
              onClick={() =>
                complete ? window.location.assign(`${basePath}/resultado`) : go(firstMissing)
              }
            >
              {!session && !error
                ? 'Preparando o quiz…'
                : complete
                  ? 'Ver meu resultado'
                  : quizRevision(current) > 0
                    ? 'Continuar de onde parei'
                    : QUIZ_ENTRY.cta}
              <span aria-hidden="true">→</span>
            </button>
            {session && quizRevision(current) > 0 && (
              <button className="cq-link" type="button" onClick={() => go('review')}>
                Rever respostas
              </button>
            )}
          </div>
          <p className="cq-note">
            Uma orientação do Sistema Zero Kids para mães, pais e responsáveis. Você pode responder
            pelo celular.
          </p>
        </div>
        <div className="cq-hero-art">
          <Eyebrow icon="auto_awesome">Um interesse. Várias possibilidades.</Eyebrow>
          <ul className="cq-possibilities">
            {QUIZ_ENTRY.possibilities.map((item) => (
              <li key={item.icon}>
                <span className="material-symbols-rounded" aria-hidden="true">
                  {item.icon}
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </div>
              </li>
            ))}
          </ul>
          <p>O começo pode estar no que já chama a atenção dele.</p>
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

  if (cursor === 'age')
    return (
      <main id="quiz" className="wrap cq-flow">
        <div className="cq-panel">
          <Eyebrow icon="cake">Sobre a faixa de idade</Eyebrow>
          <h1 ref={heading} tabIndex={-1} className="kof-display">
            Esta orientação foi pensada para famílias com filhos de 9 a 14 anos.
          </h1>
          <p>
            Os exemplos e as sugestões deste quiz foram preparados para essa faixa. A idade
            informada, sozinha, não diz o que seu filho consegue fazer.
          </p>
          <p>
            Para escolher uma atividade em outra fase, vale observar os interesses dele, a linguagem
            da orientação e o apoio de que precisa. Este quiz não vai indicar um caminho específico
            para essa idade.
          </p>
          {errorView}
          <div className="cq-actions">
            <button className="cq-link" type="button" onClick={() => go('q1')}>
              Corrigir a faixa de idade
            </button>
            <button
              className="cq-link"
              type="button"
              disabled={busy}
              onClick={() => void load(true)}
            >
              Responder pensando em outro filho
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
          <p>
            Você pode rever qualquer resposta. A sugestão será atualizada com o que ficar salvo.
          </p>
          <ol className="cq-review">
            {steps.map((s) => (
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
            ))}
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
              Responder pensando em outro filho
            </button>
          </div>
        </div>
      </main>
    )

  if (!step) return null
  const position = steps.findIndex((s) => s.key === step.key)
  const stageIndex = stages.findIndex(([id]) => id === step.etapa)
  const chip = STAGE_CHIP[step.etapa as keyof typeof STAGE_CHIP] ?? STAGE_CHIP.filho
  return (
    <main id="quiz" className="wrap cq-flow">
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
          <span className="cap-chip-texto">{chip.texto}</span>
        </span>
        <h1 className="kof-display" ref={heading} tabIndex={-1}>
          {step.titulo}
        </h1>
        {step.subtitulo && (
          <p id="question-help" className="cq-description">
            {step.subtitulo}
          </p>
        )}
        <Question
          key={`${step.key}:${session?.id}:${quizRevision(answers)}`}
          step={step}
          value={current[step.key]}
          seed={session?.id ?? ''}
          busy={busy}
          blocked={conflict}
          submitLabel={
            step.key === 'q8' &&
            steps.every((s) => s.key === step.key || validChoice(s, current[s.key]))
              ? 'Ver a sugestão para meu filho'
              : 'Continuar'
          }
          onSave={save}
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
          {step.key === 'qt' && (
            <button className="cq-link" type="button" disabled={busy} onClick={() => go('q4')}>
              Rever os objetivos que marquei
            </button>
          )}
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
  submitLabel,
  onSave,
}: {
  step: SelecaoStep
  value?: QuizAnswerValue
  seed: string
  busy: boolean
  blocked: boolean
  submitLabel: string
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
        {busy ? 'Salvando…' : submitLabel}
        <span aria-hidden="true">→</span>
      </button>
    </form>
  )
}
