'use client'
import { openScene, stepScene } from '@sistemazero/core/learning/scene'
import { useEffect, useState } from 'react'
import { Stage } from './scene-discovery-controls'
import { Note } from './scene-discovery-frame'
import { EdgeComparison } from './scene-discovery-visuals'

/** Show the same physical rule after any prediction; grading belongs to the server. */
export function QuizScene({ index, phase }: { index: number; phase: number }) {
  const door = openScene({ scene: 'lighthouse-key' })
  const memory = openScene({ scene: 'collect-and-remember' })
  if (index === 0) {
    return (
      <>
        <EdgeComparison result={phase > 0} correct />
        <Note label={phase ? 'Resultado do quadro' : 'Antes do próximo quadro'} tone="blue">
          {phase
            ? 'Moveu e depois conferiu o limite. Ficou dentro.'
            : 'O personagem está junto à borda da tela.'}
        </Note>
      </>
    )
  }
  if (index === 1) {
    if (phase < 2) {
      const s = phase
        ? stepScene({ scene: 'collect-and-remember' }, memory, { type: 'collect-key' })
        : memory
      return (
        <>
          <Stage kind="memoria" state={s} />
          <Note label="Três efeitos separados" tone="pink">
            {phase
              ? 'Chave retirada · aviso mudou · temChave continua falso'
              : 'A chave ainda está no chão.'}
          </Note>
        </>
      )
    }
    const s = stepScene({ scene: 'lighthouse-key' }, door, { type: 'try-lighthouse-door' })
    return (
      <>
        <Stage kind="porta" state={s} />
        <Note label="O que a porta consultou" tone="pink">
          temChave = falso → avisar que falta a chave
        </Note>
      </>
    )
  }
  if (index === 2) {
    const s = phase
      ? stepScene({ scene: 'lighthouse-key' }, door, { type: 'try-lighthouse-door' })
      : door
    return (
      <>
        <Stage kind="porta" state={s} />
        <Note label={phase ? 'Resultado da regra' : 'Antes da tentativa'} tone="gold">
          {phase ? 'senão → manter apagado e avisar' : 'Personagem sem chave · temChave = falso'}
        </Note>
      </>
    )
  }
  const hasKey = phase === 0
  let s = stepScene({ scene: 'lighthouse-key' }, door, { type: 'key-state', hasKey })
  if (phase === 0 || phase >= 2)
    s = stepScene({ scene: 'lighthouse-key' }, s, { type: 'try-lighthouse-door' })
  return (
    <>
      <Stage kind="porta" state={s} />
      <Note
        label={phase ? 'Situação que você testou' : 'O que já foi testado'}
        tone={phase ? 'green' : 'gold'}
      >
        {phase
          ? 'Partida nova, sem chave: agora o teste sem chave também foi feito.'
          : 'Com chave: o farol acendeu. Falta conferir outra situação.'}
      </Note>
    </>
  )
}

export function LighthouseQuizScene({
  scene,
  result,
  onAnimating,
}: {
  scene: string
  result: boolean
  onAnimating: (v: boolean) => void
}) {
  const index = [
    'lighthouse-order',
    'lighthouse-memory',
    'lighthouse-door',
    'lighthouse-retest',
  ].indexOf(scene)
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    if (!result) {
      setPhase(0)
      onAnimating(false)
      return
    }
    onAnimating(true)
    setPhase(1)
    const timer = setTimeout(() => {
      setPhase(2)
      onAnimating(false)
    }, 1300)
    return () => {
      clearTimeout(timer)
    }
  }, [result, onAnimating])
  return (
    <div className="sz-discovery-quiz-scene" aria-live="polite">
      <QuizScene index={index} phase={result ? phase : 0} />
    </div>
  )
}
