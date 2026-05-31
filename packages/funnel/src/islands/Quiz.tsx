import { useEffect, useState } from 'react'
import {
  type CalculadoraStep,
  type InputNumeroStep,
  type MultiplaEscolhaStep,
  QUIZ_STEPS_RESTANTES,
  type QuizStep,
  type SimNaoStep,
  type SliderStep,
  TOTAL_PERGUNTAS,
} from '../content/quiz-config'
import { apiPatch, apiTryGet } from '../lib/api-fetch'
import Calculadora from './questions/Calculadora'
import InputNumero from './questions/InputNumero'
import MultiplaEscolha from './questions/MultiplaEscolha'
import SimNao from './questions/SimNao'
import Slider from './questions/Slider'
import type { AnswerPair, Answers, BaseQuestionProps } from './questions/types'

function firstUnanswered(answers: Answers): number {
  for (let i = 0; i < QUIZ_STEPS_RESTANTES.length; i++) {
    const step = QUIZ_STEPS_RESTANTES[i]
    if (!step) continue
    const key = step.tipo === 'calculadora' ? step.resultadoKey : step.key
    if (answers[key] == null) return i
  }
  return QUIZ_STEPS_RESTANTES.length
}

export default function Quiz() {
  const [answers, setAnswers] = useState<Answers>({})
  const [index, setIndex] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    apiTryGet<{ answers: Answers }>('/api/leads').then((data) => {
      if (!active) return
      if (!data) {
        window.location.href = '/'
        return
      }
      const start = firstUnanswered(data.answers)
      if (start >= QUIZ_STEPS_RESTANTES.length) {
        window.location.href = '/resultado'
        return
      }
      setAnswers(data.answers)
      setIndex(start)
    })
    return () => {
      active = false
    }
  }, [])

  if (index == null) {
    return <p className="py-20 text-center text-muted">Carregando…</p>
  }

  const step = QUIZ_STEPS_RESTANTES[index] as QuizStep
  const progress = Math.round((step.id / TOTAL_PERGUNTAS) * 100)

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
      if (next >= QUIZ_STEPS_RESTANTES.length) {
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

  return (
    <div className="flex min-h-screen flex-col">
      <div className="fixed inset-x-0 top-0 z-10 h-1.5 bg-card">
        <div
          className="h-full bg-lime transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-16">
        <p className="mb-2 text-sm font-semibold text-cyan">
          Pergunta {step.id} de {TOTAL_PERGUNTAS}
        </p>
        <h1 className="mb-8 text-2xl font-bold leading-snug text-ink sm:text-3xl">{step.titulo}</h1>
        <QuestionRenderer
          step={step}
          answers={answers}
          submitting={submitting}
          onSubmit={handleSubmit}
        />
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
