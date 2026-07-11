import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import type {
  CalculadoraPrefilledStep,
  CalculadoraStep,
  InputNumeroStep,
  MultiplaEscolhaStep,
  QuizStep,
  SimNaoStep,
  SliderStep,
} from '../content/quiz-config'
import { apiPatch, apiPost } from '../lib/api-fetch'
import Calculadora from './questions/Calculadora'
import CalculadoraPrefilled from './questions/CalculadoraPrefilled'
import InputNumero from './questions/InputNumero'
import MultiplaEscolha from './questions/MultiplaEscolha'
import SimNao from './questions/SimNao'
import Slider from './questions/Slider'
import type { AnswerPair, Answers, BaseQuestionProps } from './questions/types'

/** Conteúdo + navegação do funil, injetados pela página (a ilha não lê a rota). */
export interface QuizProps {
  /** Perguntas do funil (antes era a constante única QUIZ_STEPS). */
  steps: QuizStep[]
  /** Total de perguntas (para a barra de progresso). */
  total: number
  landing: { h1: string; subtitulo: string; tempo: string }
  /** Chave do funil (`pro/no-comando-da-ia`) — gravada na criação do lead. */
  funnel: string
  /** Para onde ir ao concluir o quiz (resultado do funil, ou direto à oferta). */
  donePath: string
}

function firstUnanswered(answers: Answers, steps: QuizStep[]): number {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    if (!step) continue
    const key =
      step.tipo === 'calculadora' || step.tipo === 'calculadora_prefilled'
        ? step.resultadoKey
        : step.key
    if (answers[key] == null) return i
  }
  return steps.length
}

export default function Quiz({ steps, total, landing, funnel, donePath }: QuizProps) {
  const [answers, setAnswers] = useState<Answers>({})
  const [index, setIndex] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const reduce = useReducedMotion()

  // Entrada do funil: `/` redireciona pra cá. UMA ida ao servidor: POST /api/leads
  // (idempotente) cria o lead se não houver cookie (dispara `entrou_landing`) ou
  // devolve o atual JÁ com as respostas. Daí retoma na 1ª pergunta não respondida;
  // se tudo respondido, vai pro resultado.
  useEffect(() => {
    let active = true
    ;(async () => {
      let data: { answers?: Answers } | null = null
      try {
        data = await apiPost<{ answers?: Answers }>('/api/leads', { funnel })
      } catch {
        /* sem lead: o PATCH falharia, mas seguimos exibindo a P1 */
        data = { answers: {} }
      }
      if (!active) return
      const answers = data?.answers ?? {}
      const start = firstUnanswered(answers, steps)
      if (start >= steps.length) {
        window.location.href = donePath
        return
      }
      setAnswers(answers)
      setIndex(start)
    })()
    return () => {
      active = false
    }
  }, [funnel, donePath, steps])

  if (index == null) return <QuizSkeleton />

  const step = steps[index] as QuizStep
  const progress = Math.round((step.id / total) * 100)
  const isFirst = index === 0

  async function handleSubmit(pairs: AnswerPair[]) {
    if (submitting || index == null) return
    setSubmitting(true)
    setErro(null)
    try {
      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i]
        if (!pair) continue
        const last = i === pairs.length - 1
        await apiPatch('/api/leads', {
          key: pair.key,
          value: pair.value,
          ...(last ? { lastStep: step.lastStep, eventName: step.eventName } : {}),
        })
      }
      const merged: Answers = { ...answers }
      for (const p of pairs) merged[p.key] = p.value
      const next = index + 1
      if (next >= steps.length) {
        window.location.href = donePath
        return
      }
      setAnswers(merged)
      setIndex(next)
      setSubmitting(false)
    } catch {
      // Sem avançar a pergunta (o avanço só ocorre após o PATCH OK). Mostra o
      // erro p/ o usuário re-tentar em vez de "não aconteceu nada".
      setErro('Não consegui salvar sua resposta. Verifique a conexão e tente de novo.')
      setSubmitting(false)
    }
  }

  const fade = reduce
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -18 },
      }

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Atmosfera: brilho radial sutil no topo (sem header/footer no quiz). */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_75%_55%_at_50%_-12%,color-mix(in_srgb,var(--color-lime)_12%,transparent),transparent_60%)]"
      />

      {/* Barra de progresso fixa (presente desde a P1). */}
      <div className="fixed inset-x-0 top-0 z-20 h-1.5 bg-card/70">
        <motion.div
          className="h-full rounded-r-full bg-gradient-to-r from-cyan to-lime"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: reduce ? 0 : 0.45, ease: 'easeOut' }}
        />
      </div>

      <div
        className={`mx-auto flex w-full flex-1 flex-col justify-center px-4 py-16 ${
          isFirst ? 'max-w-3xl' : 'max-w-xl'
        }`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={fade.initial}
            animate={fade.animate}
            exit={fade.exit}
            transition={{ duration: reduce ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {isFirst ? (
              <div className="text-center">
                <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-cyan">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan" />
                  Diagnóstico gratuito
                </p>
                <h1 className="mx-auto mt-5 max-w-2xl text-3xl font-extrabold leading-[1.08] text-ink sm:text-[2.6rem]">
                  {landing.h1}
                </h1>
                <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
                  {landing.subtitulo}
                </p>
                <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-line/70 bg-card/40 px-4 py-1.5 text-sm text-cyan">
                  <span aria-hidden="true">⏱</span> {landing.tempo}
                </p>
                <h2 className="mt-12 text-xl font-bold text-ink sm:text-2xl">{step.titulo}</h2>
                {step.subtitulo && (
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted">
                    {step.subtitulo}
                  </p>
                )}
                <div className="mt-7 text-left">
                  <QuestionRenderer
                    step={step}
                    answers={answers}
                    submitting={submitting}
                    onSubmit={handleSubmit}
                  />
                </div>
              </div>
            ) : (
              <>
                <p className="mb-2 text-sm font-semibold text-cyan">
                  Pergunta {step.id} de {total}
                </p>
                <h1 className="text-2xl font-bold leading-snug text-ink sm:text-3xl">
                  {step.titulo}
                </h1>
                {step.subtitulo && (
                  <p className="mt-3 text-sm leading-relaxed text-muted">{step.subtitulo}</p>
                )}
                <div className="mt-8">
                  <QuestionRenderer
                    step={step}
                    answers={answers}
                    submitting={submitting}
                    onSubmit={handleSubmit}
                  />
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
        {erro && (
          <p role="alert" className="mt-4 text-center text-sm text-red-400">
            {erro}
          </p>
        )}
      </div>
    </div>
  )
}

function QuestionRenderer({ step, ...rest }: { step: QuizStep } & BaseQuestionProps) {
  switch (step.tipo) {
    case 'multipla_escolha':
      return <MultiplaEscolha step={step as MultiplaEscolhaStep} {...rest} />
    case 'calculadora':
      return <Calculadora step={step as CalculadoraStep} {...rest} />
    case 'calculadora_prefilled':
      return <CalculadoraPrefilled step={step as CalculadoraPrefilledStep} {...rest} />
    case 'input_numero':
      return <InputNumero step={step as InputNumeroStep} {...rest} />
    case 'slider':
      return <Slider step={step as SliderStep} {...rest} />
    case 'sim_nao':
      return <SimNao step={step as SimNaoStep} {...rest} />
    default:
      return null
  }
}

// Esqueleto com a cara da P1 (barra + etiqueta + título + tempo + 4 cards). Dá um
// feedback de "carregando" muito melhor que um texto, e some assim que a 1ª
// pergunta resolve (1 ida ao servidor).
function QuizSkeleton() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="fixed inset-x-0 top-0 z-20 h-1.5 bg-card/70" />
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-16">
        <div className="animate-pulse">
          <div className="text-center">
            <div className="mx-auto h-3 w-40 rounded-full bg-card-2" />
            <div className="mx-auto mt-6 h-7 w-3/4 rounded-lg bg-card-2" />
            <div className="mx-auto mt-3 h-7 w-2/3 rounded-lg bg-card-2" />
            <div className="mx-auto mt-6 h-4 w-1/2 rounded bg-card-2/70" />
            <div className="mx-auto mt-7 h-8 w-44 rounded-full bg-card-2/60" />
            <div className="mx-auto mt-12 h-6 w-1/2 rounded bg-card-2" />
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="min-h-56 rounded-2xl border border-line bg-card-2 sm:min-h-64"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
