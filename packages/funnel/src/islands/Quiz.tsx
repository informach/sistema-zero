import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { LANDING } from '../content/copy'
import {
  type CalculadoraStep,
  type InputNumeroStep,
  type MultiplaEscolhaStep,
  QUIZ_STEPS,
  type QuizStep,
  type SimNaoStep,
  type SliderStep,
  TOTAL_PERGUNTAS,
} from '../content/quiz-config'
import { apiPatch, apiPost, apiTryGet } from '../lib/api-fetch'
import Calculadora from './questions/Calculadora'
import InputNumero from './questions/InputNumero'
import MultiplaEscolha from './questions/MultiplaEscolha'
import SimNao from './questions/SimNao'
import Slider from './questions/Slider'
import type { AnswerPair, Answers, BaseQuestionProps } from './questions/types'

function firstUnanswered(answers: Answers): number {
  for (let i = 0; i < QUIZ_STEPS.length; i++) {
    const step = QUIZ_STEPS[i]
    if (!step) continue
    const key = step.tipo === 'calculadora' ? step.resultadoKey : step.key
    if (answers[key] == null) return i
  }
  return QUIZ_STEPS.length
}

export default function Quiz() {
  const [answers, setAnswers] = useState<Answers>({})
  const [index, setIndex] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const reduce = useReducedMotion()

  // Entrada do funil: `/` redireciona pra cá. Se não há lead (cookie), cria um
  // (POST /api/leads → dispara `entrou_landing`) e começa na P1. Se há, retoma na
  // primeira pergunta não respondida; se tudo respondido, vai pro resultado.
  useEffect(() => {
    let active = true
    ;(async () => {
      let data = await apiTryGet<{ answers: Answers }>('/api/leads')
      if (!data) {
        try {
          await apiPost('/api/leads')
        } catch {
          /* sem lead: o PATCH abaixo falharia, mas seguimos exibindo a P1 */
        }
        data = { answers: {} }
      }
      if (!active) return
      const start = firstUnanswered(data.answers)
      if (start >= QUIZ_STEPS.length) {
        window.location.href = '/resultado'
        return
      }
      setAnswers(data.answers)
      setIndex(start)
    })()
    return () => {
      active = false
    }
  }, [])

  if (index == null) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-muted">Carregando…</p>
      </div>
    )
  }

  const step = QUIZ_STEPS[index] as QuizStep
  const progress = Math.round((step.id / TOTAL_PERGUNTAS) * 100)
  const isFirst = index === 0

  async function handleSubmit(pairs: AnswerPair[]) {
    if (submitting || index == null) return
    setSubmitting(true)
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
      if (next >= QUIZ_STEPS.length) {
        window.location.href = '/resultado'
        return
      }
      setAnswers(merged)
      setIndex(next)
      setSubmitting(false)
    } catch {
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
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_75%_55%_at_50%_-12%,rgba(196,240,66,0.10),transparent_60%)]"
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
                  {LANDING.h1}
                </h1>
                <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
                  {LANDING.subtitulo}
                </p>
                <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-line/70 bg-card/40 px-4 py-1.5 text-sm text-cyan">
                  <span aria-hidden="true">⏱</span> {LANDING.tempo}
                </p>
                <h2 className="mt-12 text-xl font-bold text-ink sm:text-2xl">{step.titulo}</h2>
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
                  Pergunta {step.id} de {TOTAL_PERGUNTAS}
                </p>
                <h1 className="mb-8 text-2xl font-bold leading-snug text-ink sm:text-3xl">
                  {step.titulo}
                </h1>
                <QuestionRenderer
                  step={step}
                  answers={answers}
                  submitting={submitting}
                  onSubmit={handleSubmit}
                />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function QuestionRenderer({ step, ...rest }: { step: QuizStep } & BaseQuestionProps) {
  switch (step.tipo) {
    case 'multipla_escolha':
      return <MultiplaEscolha step={step as MultiplaEscolhaStep} {...rest} />
    case 'sim_nao':
      return <SimNao step={step as SimNaoStep} {...rest} />
    case 'slider':
      return <Slider step={step as SliderStep} {...rest} />
    case 'input_numero':
      return <InputNumero step={step as InputNumeroStep} {...rest} />
    case 'calculadora':
      return <Calculadora step={step as CalculadoraStep} {...rest} />
    default:
      return null
  }
}
