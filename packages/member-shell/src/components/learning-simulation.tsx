'use client'

import {
  LEARNING_SCENE_DEFINITIONS,
  type LearningAnswers,
  readSimulationParameters,
  recordSimulationTrial,
  type SimulationActivity,
  simulationFrame,
  simulationGoals,
  simulationTrials,
} from '@sistemazero/core/learning'
import { Button } from '@sistemazero/ui/button'
import { Check, Pause, Play, RotateCcw, StepForward } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { LearningSimulationScene } from './learning-simulation-scene'

export function LearningSimulation({
  activity,
  answers,
  onChange,
  onTrial,
}: {
  activity: SimulationActivity
  answers: LearningAnswers
  onChange: (answers: LearningAnswers) => void
  onTrial: (answers: LearningAnswers) => void
}) {
  const id = useId()
  const definition = LEARNING_SCENE_DEFINITIONS[activity.scene]
  const parameters = readSimulationParameters(activity, answers)
  const goals = simulationGoals(activity, answers)
  const trials = simulationTrials(activity, answers)
  const [position, setPosition] = useState(0)
  const positionRef = useRef(0)
  const [playing, setPlaying] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const audio = useRef<AudioContext | null>(null)
  const latest = useRef({ activity, answers, parameters, onTrial })
  latest.current = { activity, answers, parameters, onTrial }
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => {
      setReducedMotion(media.matches)
      if (media.matches) setPlaying(false)
    }
    change()
    media.addEventListener('change', change)
    return () => {
      media.removeEventListener('change', change)
      void audio.current?.close()
    }
  }, [])
  function move(next: number) {
    positionRef.current = Math.min(1, next)
    setPosition(positionRef.current)
    if (next >= 1) {
      setPlaying(false)
      const current = latest.current
      current.onTrial(recordSimulationTrial(current.activity, current.answers, current.parameters))
    }
  }
  const moveRef = useRef(move)
  moveRef.current = move
  useEffect(() => {
    if (!playing) return
    let frame = 0
    let previous: number | null = null
    const tick = (now: number) => {
      if (previous !== null)
        moveRef.current(positionRef.current + Math.min(now - previous, 100) / 4500)
      previous = now
      if (positionRef.current < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing])
  function change(key: string, value: number) {
    setPlaying(false)
    positionRef.current = 0
    setPosition(0)
    onChange({ ...answers, simulation: { ...parameters, [key]: value } })
  }
  function sound() {
    if (
      activity.scene !== 'jump-sound' ||
      !soundEnabled ||
      !simulationFrame(activity.scene, parameters, 0.1).sound ||
      typeof AudioContext === 'undefined'
    )
      return
    audio.current ??= new AudioContext()
    const context = audio.current
    void context
      .resume()
      .then(() => {
        const note = context.createOscillator(),
          gain = context.createGain()
        note.frequency.setValueAtTime(460, context.currentTime)
        note.frequency.exponentialRampToValueAtTime(820, context.currentTime + 0.15)
        gain.gain.setValueAtTime(0.1, context.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.2)
        note.connect(gain).connect(context.destination)
        note.start()
        note.stop(context.currentTime + 0.2)
        note.onended = () => {
          note.disconnect()
          gain.disconnect()
        }
      })
      .catch(() => setSoundEnabled(false))
  }
  const frame = simulationFrame(activity.scene, parameters, position)
  return (
    <div className="space-y-4">
      <LearningSimulationScene
        scene={activity.scene}
        parameters={parameters}
        progress={position}
        onDistanceChange={(distance) => change('distance', distance)}
      />
      <div className="flex flex-wrap items-center gap-2">
        {!reducedMotion && (
          <Button
            type="button"
            onClick={() => {
              if (playing) {
                setPlaying(false)
                return
              }
              if (position >= 1) {
                positionRef.current = 0
                setPosition(0)
              }
              if (positionRef.current === 0) sound()
              setPlaying(true)
            }}
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            {playing ? 'Pausar' : position > 0 && position < 1 ? 'Continuar teste' : 'Testar'}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={playing || position >= 1}
          onClick={() => {
            if (!position) sound()
            move(Math.min(1, Math.round((position + 0.1) * 10) / 10))
          }}
        >
          <StepForward className="size-4" />
          Um passo
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-label="Voltar ao começo do teste"
          onClick={() => {
            setPlaying(false)
            move(0)
          }}
        >
          <RotateCcw className="size-4" />
          Recomeçar
        </Button>
        {activity.scene === 'jump-sound' && (
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(event) => setSoundEnabled(event.target.checked)}
            />
            Ouvir o som
          </label>
        )}
      </div>
      <p
        className="min-h-12 rounded-xl bg-muted/40 p-3 text-sm"
        role="status"
        aria-live={playing ? 'off' : 'polite'}
      >
        {frame.caption}
      </p>
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Mude o modelo e teste sua ideia</legend>
        {definition.controls.map((control) => (
          <label
            key={control.key}
            htmlFor={`${id}-${control.key}`}
            className="space-y-2 rounded-xl border border-border p-3 text-sm font-medium"
          >
            <span className="block">{control.label}</span>
            {control.options ? (
              <select
                id={`${id}-${control.key}`}
                className="min-h-11 w-full rounded-lg border border-border bg-card px-3"
                value={parameters[control.key]}
                onChange={(event) => change(control.key, Number(event.target.value))}
              >
                {control.options.map((option, index) => (
                  <option key={option} value={index}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <output className="block tabular-nums" htmlFor={`${id}-${control.key}`}>
                  {parameters[control.key]}
                </output>
                <input
                  id={`${id}-${control.key}`}
                  type="range"
                  className="h-11 w-full accent-primary"
                  min={control.min}
                  max={control.max}
                  step={control.step}
                  value={parameters[control.key]}
                  onChange={(event) => change(control.key, Number(event.target.value))}
                />
              </>
            )}
          </label>
        ))}
      </fieldset>
      <ul aria-label="Descobertas desta exploração" className="space-y-2">
        {goals.map((goal) => (
          <li key={goal.id} className="flex items-center gap-2 text-sm">
            <span className="grid size-6 shrink-0 place-items-center rounded-full border border-primary/30 text-primary">
              {goal.complete ? (
                <Check className="size-4" aria-label="Feito" />
              ) : (
                <>
                  <span aria-hidden="true">○</span>
                  <span className="sr-only">Por explorar</span>
                </>
              )}
            </span>
            {goal.label}
          </li>
        ))}
      </ul>
      {trials.length > 0 && (
        <details className="rounded-xl border border-border p-3">
          <summary className="min-h-11 cursor-pointer text-sm font-medium">
            Comparar meus testes · {trials.length}
          </summary>
          <div className="flex flex-wrap gap-2">
            {trials.map((trial, index) => (
              <Button
                key={JSON.stringify(trial)}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setPlaying(false)
                  move(0)
                  onChange({ ...answers, simulation: trial })
                }}
              >
                Teste {index + 1}
              </Button>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
