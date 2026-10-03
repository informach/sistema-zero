import { useCallback, useEffect, useRef, useState } from 'react'
import {
  activeDesafioSteps,
  answerList,
  DESAFIO_QUIZ_VERSION,
  isDesafioQuizComplete,
  isOutsideDesafioAge,
  quizRevision,
  validChoice,
} from '../funnels/desafio-primeiro-jogo/quiz/engine'
import type { DesafioQuestion as SelecaoStep } from '../funnels/desafio-primeiro-jogo/quiz/questions'
import { ApiError, apiPatch, apiPost } from '../lib/api-fetch'
import { funnelLinkWithAttribution, leadAttributionFromLocation } from '../lib/lead-attribution'
import type { QuizAnswers, QuizAnswerValue } from '../lib/quiz-types'

interface Props {
  funnel: string
  basePath: string
  imagesBase: string
  priceLabel: string | null
  quizDefinitionId?: string
}
interface Session {
  id: string
  answers: QuizAnswers
  sessionToken: string
}
const stages = [
  ['familia', 'Para quem'],
  ['comeco', 'O começo'],
  ['procura', 'O que vocês procuram'],
  ['orientacao', 'Sua orientação'],
] as const
const STAGE_CHIP = {
  familia: { cor: 'cor-azul', icone: 'family_star', texto: 'Uma criança de cada vez' },
  comeco: { cor: 'cor-verde', icone: 'sports_esports', texto: 'O que você observa em casa' },
  procura: { cor: 'cor-rosa', icone: 'favorite', texto: 'O que importa para você' },
  orientacao: { cor: 'cor-roxo', icone: 'explore', texto: 'Uma experiência para conhecer' },
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

export default function DesafioQuiz({
  funnel,
  basePath,
  imagesBase,
  quizDefinitionId,
  priceLabel,
}: Props) {
  const [session, setSession] = useState<Session | null>(null)
  const [cursor, setCursor] = useState('intro')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [updated, setUpdated] = useState(false)
  const locked = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const answers = session?.answers ?? {}
  const current = answers._quiz_version === DESAFIO_QUIZ_VERSION ? answers : {}
  const steps = activeDesafioSteps(current)
  const step = steps.find((s) => s.key === cursor)
  const complete = isDesafioQuizComplete(current)
  const firstMissing = steps.find((s) => !validChoice(s, current[s.key]))?.key ?? 'idade'

  const receive = useCallback((data: Session, restart = false, navigate = true) => {
    setSession(data)
    setError('')
    setConflict(false)
    if (!navigate) return
    const a = data.answers._quiz_version === DESAFIO_QUIZ_VERSION ? data.answers : {}
    const hash = window.location.hash.slice(1)
    if (restart) setCursor('idade')
    else if (hash === 'rever' || hash === 'outro-filho') setCursor('review')
    else if (activeDesafioSteps(a).some((s) => s.key === hash)) setCursor(hash)
    else if (isOutsideDesafioAge(a)) setCursor('age')
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
        attribution: leadAttributionFromLocation(window.location),
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

  useEffect(() => {
    let active = true
    apiPost<Session>('/api/leads', {
      funnel,
      quizDefinitionId,
      attribution: leadAttributionFromLocation(window.location),
    })
      .then((data) => {
        if (active) receive(data)
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

  async function save(value: QuizAnswerValue) {
    if (!step || locked.current || !session) return
    locked.current = true
    setBusy(true)
    setError('')
    try {
      const data = await apiPatch<{ answers: QuizAnswers; complete: boolean }>('/api/leads', {
        quizDefinitionId,
        key: step.key,
        value,
        revision: quizRevision(answers),
        sessionToken: session.sessionToken,
        funnel,
      })
      setSession({ ...session, answers: data.answers })
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      if (isOutsideDesafioAge(data.answers)) setCursor('age')
      else if (step.key === 'equipamento' && data.answers.equipamento === 'sem_computador')
        setCursor('equipment')
      else if (data.complete) window.location.assign(link(`${basePath}/resultado`))
      else {
        const next = activeDesafioSteps(data.answers).find(
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

  const link = (path: string) =>
    typeof window === 'undefined' ? path : funnelLinkWithAttribution(path, window.location)
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
  if (cursor === 'intro')
    return (
      <main id="quiz" className="wrap cq-intro" data-analytics-id="desafio-quiz-entrada">
        <div className="cq-intro-copy">
          <Eyebrow icon="family_star">Para mães, pais e responsáveis · 9 a 14 anos</Eyebrow>
          <h1 className="kof-display">
            Descubra por onde seu filho pode <em>começar a criar jogos</em>
          </h1>
          <p className="kof-lead">
            Talvez ele goste de jogar, desenhe personagens ou ainda não tenha pensado em criar um
            jogo. Conte o que você observa em casa e o que gostaria de experimentar com ele.
          </p>
          <p>
            Você recebe um próximo passo explicado para a situação de vocês: como apresentar a ideia
            ao seu filho, o que observar na primeira tentativa e que apoio procurar. Ao final,
            mostramos também uma aventura de programação e se o nosso Desafio do Primeiro Jogo
            corresponde ao que vocês querem conhecer.
          </p>
          <ul className="cq-intro-points">
            <li>Resultado gratuito na tela, sem cadastro.</li>
            <li>Responda pensando em um filho de cada vez.</li>
            <li>Você pode responder pelo celular, sem ele estar junto.</li>
          </ul>
          {errorView}
          <div className="cq-actions">
            <button
              className="kof-btn kof-btn--grande"
              type="button"
              disabled={!session || busy}
              onClick={() =>
                complete
                  ? window.location.assign(link(`${basePath}/resultado`))
                  : go(isOutsideDesafioAge(current) ? 'age' : firstMissing)
              }
              data-analytics-id="desafio-quiz-iniciar"
            >
              {!session && !error
                ? 'Preparando o quiz…'
                : complete
                  ? 'Ver minha orientação'
                  : quizRevision(current) > 0
                    ? 'Continuar de onde parei'
                    : 'Encontrar um primeiro passo'}
              <span aria-hidden="true">→</span>
            </button>
            {session && quizRevision(current) > 0 && (
              <button className="cq-link" type="button" onClick={() => go('review')}>
                Rever respostas
              </button>
            )}
            <a className="kof-link" href={link(`${basePath}/oferta`)}>
              Já quero conhecer o Desafio
            </a>
          </div>
        </div>
        <figure className="df-quiz-art">
          <div className="kof-tela kof-tela--sombra">
            <div className="kof-tela__barra" aria-hidden="true">
              <i />
              <i />
              <i />
              <span className="kof-tela__url">A Chave do Farol</span>
            </div>
            <img
              src={`${imagesBase}/farol-jogo.png`}
              alt="Jogo A Chave do Farol, com o personagem, a chave e o farol na costa."
              width="1280"
              height="720"
              fetchPriority="high"
            />
          </div>
          <figcaption>
            Um projeto para conhecer: descobrir como os blocos fazem o personagem andar e a porta
            responder. A orientação do quiz é gratuita; o curso é uma compra separada.
          </figcaption>
        </figure>
      </main>
    )
  if (cursor === 'equipment')
    return (
      <main id="quiz" className="wrap cq-flow">
        <div className="cq-panel">
          <Eyebrow icon="computer">Antes de continuar</Eyebrow>
          <h1 className="kof-display" ref={heading} tabIndex={-1}>
            Para montar o jogo, vocês vão precisar de um computador.
          </h1>
          <p>
            Você pode responder a este quiz no celular. Para fazer o curso, porém, seu filho precisa
            de computador ou notebook com internet, mouse e teclado. Celular e tablet não substituem
            esse equipamento na montagem.
          </p>
          <p>
            Se quiser, podemos continuar a orientação para planejar um começo futuro. Vamos manter
            essa condição nas sugestões; continuar não significa que o equipamento já está
            disponível.
          </p>
          {errorView}
          <div className="cq-actions">
            <button
              className="kof-btn"
              type="button"
              onClick={() =>
                complete ? window.location.assign(link(`${basePath}/resultado`)) : go(firstMissing)
              }
            >
              Continuar a orientação
            </button>
            <button className="cq-link" type="button" onClick={() => go('equipamento')}>
              Corrigir minha resposta
            </button>
            <a className="cq-link" href={link(`${basePath}/oferta#requisitos`)}>
              Conferir os requisitos
            </a>
          </div>
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
            <button className="cq-link" type="button" onClick={() => go('idade')}>
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
              <a className="kof-btn" href={link(`${basePath}/resultado`)}>
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
  const stageIndex = stages.findIndex(([id]) => id === step.stage)
  const chip = STAGE_CHIP[step.stage as keyof typeof STAGE_CHIP] ?? STAGE_CHIP.familia
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
            aria-current={step.stage === id ? 'step' : undefined}
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
        {step.key === 'interesse_no_projeto' && (
          <div className="df-project-intro prosa">
            <figure>
              <img
                src={`${imagesBase}/farol-jogo.png`}
                alt="Personagem a caminho da chave no jogo do Farol."
                width="1280"
                height="720"
              />
              <figcaption>A aventura que ele vai conhecer antes de montar.</figcaption>
            </figure>
            <p>
              No jogo A Chave do Farol, o personagem precisa encontrar uma chave e acender a luz
              para um barco chegar. O cenário, os desenhos e o movimento do barco já vêm preparados.
              Seu filho acompanha explicações gravadas, monta as regras com blocos e testa no
              Estúdio da aula.
            </p>
            <figure>
              <img
                src={`${imagesBase}/farol-blocos.png`}
                alt="Esquema do Caderno do Aluno: conferir a informação da chave na porta."
                width="1280"
                height="1276"
              />
              <figcaption>
                Esquema do Caderno do Aluno, com as cores dos blocos do Estúdio. A aula orienta a
                montar e testar essa regra.
              </figcaption>
            </figure>
            <p>
              Ele pode pausar e rever; as dúvidas seguem por mensagens, com possível espera. O curso
              é feito no computador.{' '}
              {priceLabel
                ? `A compra custa ${priceLabel}, pagamento único.`
                : 'O valor está temporariamente indisponível; confira o preço na oferta antes de decidir.'}{' '}
              São 30 dias de curso e Mural completo a partir da aprovação do pagamento. Depois,
              permanece o Mural visitante para ver e jogar. O Desafio é uma oferta do Sistema Zero.
            </p>
          </div>
        )}
        <Question
          key={`${step.key}:${session?.id}:${quizRevision(answers)}`}
          step={step}
          value={current[step.key]}
          busy={busy}
          blocked={conflict}
          submitLabel={
            (step.key === 'interesse_no_projeto' || step.key === 'desencontro') &&
            steps.every((s) => s.key === step.key || validChoice(s, current[s.key]))
              ? 'Ver minha orientação'
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
          {step.key === 'prioridade' && (
            <button className="cq-link" type="button" disabled={busy} onClick={() => go('motivos')}>
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
  busy,
  blocked,
  submitLabel,
  onSave,
}: {
  step: SelecaoStep
  value?: QuizAnswerValue
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
        {step.opcoes.map((option) => (
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
