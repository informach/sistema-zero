'use client'

import {
  appendExplorationAction,
  EXPLORATION_DEFINITIONS,
  type ExplorationAction,
  type ExplorationActivity,
  type ExplorationObservation,
  evaluateExploration,
  explorationGoals,
  type LearningAnswers,
  learningHints,
  replayExploration,
} from '@sistemazero/core/learning'
import { Button } from '@sistemazero/ui/button'
import {
  Check,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  StepForward,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  cancelLessonMediaFocus,
  hasLessonMediaFocus,
  registerLessonMedia,
  requestLessonMediaFocus,
} from '../lib/lesson-media-focus'
import { DialogueBlockView } from './dialogue-block'
import { ExplorationPieces } from './exploration-pieces'
import {
  CactusFigure,
  DinoFigure,
  ExplorationStage,
  SceneButton,
  TreeFigure,
} from './exploration-stage'
import { useLessonPlayer } from './lesson-player-context'

function ComparisonCard({
  observation: o,
  activity,
}: {
  observation: ExplorationObservation
  activity: ExplorationActivity
}) {
  const m = activity.mission
  const motion = m === 'gravity' || m === 'impulse'
  const peakY = Math.max(30, 128 - o.height * 0.6)
  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-background">
      <svg viewBox="0 0 270 154" className="w-full bg-[#f8f6e9]" role="img" aria-label={o.label}>
        <path d="M0 128H270" stroke="#8ba077" />
        {motion ? (
          <>
            <path
              d={`M100 128V${peakY}`}
              stroke={o.gravity ? '#315f92' : '#c67431'}
              strokeWidth="3"
              strokeDasharray="5 3"
            />
            <g className="text-primary" transform={`translate(100 ${peakY}) scale(0.5)`}>
              <DinoFigure x={0} y={0} ghost />
            </g>
            <text x="145" y="68" fill="#42503a" fontSize="13">
              {o.gravity ? 'gravidade aplicada' : 'sem aplicar'}
            </text>
            <text x="145" y="90" fill="#42503a" fontSize="13">
              impulso {o.force}
            </text>
          </>
        ) : m === 'hitbox' ? (
          <>
            <g className="text-primary">
              <DinoFigure x={85} y={128} />
            </g>
            <CactusFigure x={85 + o.distance * 0.6} y={128} />
            <rect
              x={85 - o.width * 0.3}
              y="76"
              width={o.width * 0.6}
              height="52"
              stroke={o.collision ? '#ae3e2c' : '#315f92'}
              fill="none"
              strokeWidth="2"
            />
            <text x="12" y="24" fill="#42503a" fontSize="12">
              mesma posição · área {o.width}
            </text>
          </>
        ) : m === 'layers' ? (
          <>
            {!o.front && (
              <g className="text-primary">
                <DinoFigure x={130} y={128} />
              </g>
            )}
            <TreeFigure x={130} y={128} scale={0.74} />
            {o.front && (
              <g className="text-primary">
                <DinoFigure x={130} y={128} />
              </g>
            )}
          </>
        ) : m === 'random' || m === 'acceleration' ? (
          <>
            <CactusFigure x={o.x * 0.35} y={128} />
            <path
              d={`M${o.x * 0.35} 40h${o.velocity * 10}l8 -5m-8 5l8 5`}
              stroke="#315f92"
              strokeWidth="3"
              fill="none"
            />
            <text x="16" y="30" fill="#42503a" fontSize="13">
              {o.velocity}
            </text>
            <text x="16" y="62" fill="#42503a" fontSize="13">
              nasceu em {o.x}
            </text>
          </>
        ) : (
          <>
            <text x="135" y="62" textAnchor="middle" fill="#42503a" fontSize="27" fontWeight="600">
              {m === 'score'
                ? `${o.points} pontos`
                : m === 'world'
                  ? 'Mesmo Dino'
                  : ['spawn', 'cleanup', 'game-state'].includes(m)
                    ? `${o.stored} no grupo`
                    : o.screen === 'playing'
                      ? 'Jogando'
                      : o.screen === 'end'
                        ? 'Fim'
                        : 'Sua descoberta'}
            </text>
            <text x="135" y="90" textAnchor="middle" fill="#42503a" fontSize="13">
              {['spawn', 'cleanup'].includes(m)
                ? `${o.visible} na tela`
                : 'Observe o que mudou na montagem'}
            </text>
          </>
        )}
      </svg>
      <figcaption className="p-3 text-sm leading-relaxed">{o.label}</figcaption>
    </figure>
  )
}

export function LearningExploration({
  activity,
  answers,
  onChange,
  onEvidence,
  hints,
}: {
  activity: ExplorationActivity
  answers: LearningAnswers
  onChange: (answers: LearningAnswers, hintsUsed: number) => void
  onEvidence: (answers: LearningAnswers, hintsUsed: number) => void
  hints: string[]
}) {
  const player = useLessonPlayer()
  const definition = EXPLORATION_DEFINITIONS[activity.mission]
  const availableHints = learningHints({ activity, hints })
  const replay = replayExploration(activity, answers)
  const state = replay.state
  const goals = explorationGoals(activity, state)
  const passed = evaluateExploration(activity, answers).passed
  const [playing, setPlaying] = useState(false)
  const [slow, setSlow] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [more, setMore] = useState(false)
  const [sound, setSound] = useState(false)
  const [audioError, setAudioError] = useState('')
  const [recordingFull, setRecordingFull] = useState(false)
  const narration = useRef<HTMLAudioElement | null>(null)
  const soundContext = useRef<AudioContext | null>(null)
  const audioOwner = useRef(Symbol('exploration-audio'))
  const latest = useRef({ activity, answers, onChange, onEvidence })
  latest.current = { activity, answers, onChange, onEvidence }
  const isMotion = ['gravity', 'impulse', 'jump-sound'].includes(activity.mission)
  const temporal = ['spawn', 'cleanup', 'game-state', 'score', 'random', 'acceleration'].includes(
    activity.mission,
  )
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => {
      setReducedMotion(media.matches)
      if (media.matches) setPlaying(false)
    }
    update()
    media.addEventListener('change', update)
    try {
      setSound(localStorage.getItem('sz:lesson-sound') === 'on')
    } catch {
      /* Preference is optional. */
    }
    const stop = (event: Event) => {
      if (event.target !== narration.current) narration.current?.pause()
    }
    document.addEventListener('play', stop, true)
    const unregisterAudio = registerLessonMedia(audioOwner.current, () => {
      narration.current?.pause()
      return soundContext.current?.suspend()
    })
    const hidden = () => {
      if (document.visibilityState === 'hidden') setPlaying(false)
    }
    document.addEventListener('visibilitychange', hidden)
    return () => {
      media.removeEventListener('change', update)
      document.removeEventListener('play', stop, true)
      unregisterAudio()
      document.removeEventListener('visibilitychange', hidden)
      narration.current?.pause()
      const context = soundContext.current
      soundContext.current = null
      void context?.close()
    }
  }, [])

  function dispatch(action: ExplorationAction) {
    const current = latest.current
    const before = replayExploration(current.activity, current.answers).state
    const next = appendExplorationAction(current.activity, current.answers, action)
    if (next === current.answers) {
      setRecordingFull(true)
      setPlaying(false)
      return
    }
    const after = replayExploration(current.activity, next).state
    latest.current = { ...current, answers: next }
    current.onChange(next, Math.min(after.hints, availableHints.length))
    if (evaluateExploration(current.activity, next).passed)
      current.onEvidence(next, Math.min(after.hints, availableHints.length))
    if (
      action.type === 'jump' &&
      before.flightTime === null &&
      !reducedMotion &&
      current.activity.mission !== 'jump-sound'
    )
      setPlaying(true)
    if (action.type === 'reset' || action.type === 'undo' || action.type === 'connect')
      setPlaying(false)
    if (
      after.soundCount > before.soundCount &&
      sound &&
      (!narration.current || narration.current.paused) &&
      typeof AudioContext !== 'undefined'
    ) {
      soundContext.current ??= new AudioContext()
      const context = soundContext.current
      void requestLessonMediaFocus(audioOwner.current)
        .then((ready) => {
          if (!hasLessonMediaFocus(audioOwner.current)) return
          if (!ready) throw new Error('Audio busy')
          return context.resume()
        })
        .then(() => {
          if (!hasLessonMediaFocus(audioOwner.current) || context.state === 'closed') return
          const oscillator = context.createOscillator(),
            gain = context.createGain()
          oscillator.frequency.setValueAtTime(520, context.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(800, context.currentTime + 0.12)
          gain.gain.setValueAtTime(0.07, context.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.15)
          oscillator.connect(gain).connect(context.destination)
          oscillator.start()
          oscillator.stop(context.currentTime + 0.15)
          oscillator.onended = () => {
            oscillator.disconnect()
            gain.disconnect()
          }
        })
        .catch(() =>
          setAudioError(
            'O som não ficou disponível. O indicador ♪ mostra os mesmos acontecimentos.',
          ),
        )
    }
  }
  const dispatchRef = useRef(dispatch)
  dispatchRef.current = dispatch
  useEffect(() => {
    if (!playing) return
    let frame = 0,
      previous: number | null = null,
      elapsed = 0
    function tick(now: number) {
      if (previous !== null) elapsed += (Math.min(100, now - previous) / 1000) * (slow ? 0.5 : 1)
      previous = now
      if (elapsed >= 0.04) {
        dispatchRef.current({ type: 'advance', seconds: elapsed })
        elapsed = 0
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, slow])
  useEffect(() => {
    if (isMotion && state.flightTime === null) setPlaying(false)
  }, [isMotion, state.flightTime])

  const comparisonIds =
    activity.mission === 'hitbox'
      ? ['area-before', 'area-contrast']
      : activity.mission === 'random'
        ? state.discoveries.includes('velocities')
          ? ['velocity--5', 'velocity--6']
          : ['position-1', 'position-2']
        : goals.slice(0, 2).map((g) => g.id)
  const comparisons = comparisonIds.flatMap((id) => {
    const o = state.observations.find((o) => o.id === id)
    return o ? [o] : []
  })
  const hint = availableHints[state.hints - 1]
  function say(text: string, pose: 'speaking' | 'thinking' | 'celebrating' = 'speaking') {
    return player?.renderInstruction ? (
      player.renderInstruction(text, pose)
    ) : (
      <DialogueBlockView content={{ kind: 'dialogue', text, pose }} />
    )
  }
  return (
    <div className="space-y-4">
      {!replay.valid && (
        <p role="status" className="rounded-xl bg-muted p-3 text-sm">
          Esta missão tem uma nova versão. Recomece a descoberta; o projeto e as conclusões
          confirmadas continuam guardados.
          <Button variant="outline" onClick={() => dispatch({ type: 'reset' })}>
            Recomeçar descoberta
          </Button>
        </p>
      )}
      <ExplorationStage activity={activity} state={state} dispatch={dispatch} paused={!playing} />
      {recordingFull && (
        <div role="alert" className="space-y-2 rounded-xl border p-3 text-sm">
          <p>
            Este registro ficou cheio de testes. Você pode salvar o que descobriu ou começar outro
            registro. As etapas já confirmadas continuam concluídas.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              latest.current.onChange({}, 0)
              setRecordingFull(false)
              setPlaying(false)
            }}
          >
            Começar outro registro desta exploração
          </Button>
        </div>
      )}
      {state.caption && (
        <p
          role="status"
          aria-live="polite"
          className="min-h-6 text-center text-sm font-medium text-foreground"
        >
          {state.caption}
        </p>
      )}
      <ExplorationPieces activity={activity} state={state} dispatch={dispatch} more={more} />
      {(isMotion || temporal) && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/40 p-2">
          <SceneButton
            onClick={() => setPlaying(!playing)}
            disabled={isMotion && state.flightTime === null}
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            {playing ? 'Pausar' : 'Ver movimento'}
          </SceneButton>
          <SceneButton
            onClick={() => {
              setPlaying(false)
              dispatch({ type: 'advance', seconds: isMotion ? 0.1 : 2 })
            }}
            disabled={isMotion && state.flightTime === null}
          >
            <StepForward className="size-4" />
            {isMotion ? 'Um passo' : 'Avançar 2 segundos'}
          </SceneButton>
          <SceneButton aria-pressed={slow} onClick={() => setSlow(!slow)}>
            {slow ? 'Câmera lenta: ½×' : 'Tempo do modelo: 1×'}
          </SceneButton>
          {activity.mission === 'jump-sound' && (
            <p className="basis-full px-2 text-xs text-muted-foreground">
              O movimento começa pausado: avance um passo e experimente outro comando no ar, sem
              pressa.
            </p>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          disabled={!replay.canUndo}
          onClick={() => dispatch({ type: 'undo' })}
        >
          <Undo2 className="size-4" />
          Desfazer
        </Button>
        <Button variant="ghost" onClick={() => dispatch({ type: 'reset' })}>
          <RotateCcw className="size-4" />
          Recomeçar esta experiência
        </Button>
        <Button
          variant="ghost"
          disabled={state.hints >= availableHints.length}
          onClick={() => dispatch({ type: 'hint', level: state.hints + 1 })}
        >
          <Lightbulb className="size-4" />
          {state.hints ? 'Outra pista' : 'Quero uma pista'}
        </Button>
        {(activity.instructionAudioUrl || activity.mission === 'jump-sound') && (
          <Button
            variant="ghost"
            aria-pressed={sound}
            onClick={() => {
              setSound(!sound)
              if (sound) {
                cancelLessonMediaFocus(audioOwner.current)
                narration.current?.pause()
                void soundContext.current?.suspend()
              }
              try {
                localStorage.setItem('sz:lesson-sound', sound ? 'off' : 'on')
              } catch {
                /* Current preference still applies. */
              }
            }}
          >
            {sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            {sound ? 'Som ligado' : 'Som desligado'}
          </Button>
        )}
        {activity.instructionAudioUrl && (
          <>
            <audio ref={narration} src={activity.instructionAudioUrl} preload="none">
              <track kind="captions" />
            </audio>
            <Button
              variant="ghost"
              disabled={!sound}
              onClick={() => {
                setAudioError('')
                void requestLessonMediaFocus(audioOwner.current)
                  .then((ready) => {
                    if (!hasLessonMediaFocus(audioOwner.current)) return
                    if (!ready) throw new Error('Audio busy')
                    return narration.current?.play()
                  })
                  .catch(() =>
                    setAudioError('Não foi possível ouvir agora. A orientação continua no balão.'),
                  )
              }}
            >
              <Volume2 className="size-4" />
              Ouvir instrução
            </Button>
          </>
        )}
      </div>
      {audioError && (
        <p role="status" className="text-sm text-muted-foreground">
          {audioError}
        </p>
      )}
      {hint &&
        say(`${goals.find((g) => !g.complete)?.label ?? 'Experimente mais'}: ${hint}`, 'thinking')}
      {comparisons.length >= 2 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Olhe o que mudou</p>
          <div className="grid grid-cols-2 gap-3">
            {comparisons.map((o) => (
              <ComparisonCard key={o.id} activity={activity} observation={o} />
            ))}
          </div>
        </div>
      )}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          {passed ? (
            <Check className="size-5 text-primary" />
          ) : (
            <span className="text-primary">◌</span>
          )}
          {passed ? 'Descoberta realizada' : goals.find((g) => !g.complete)?.label}
        </div>
        <div
          className="mt-2 flex gap-1.5"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={goals.length}
          aria-valuenow={goals.filter((g) => g.complete).length}
          aria-label={`${goals.filter((g) => g.complete).length} de ${goals.length} descobertas`}
        >
          {goals.map((g) => (
            <span
              key={g.id}
              title={g.label}
              className={`h-1.5 flex-1 rounded-full ${g.complete ? 'bg-primary' : 'bg-primary/15'}`}
            />
          ))}
        </div>
      </div>
      {passed && (
        <div className="space-y-3">
          {say(definition.success, 'celebrating')}
          <Button variant="outline" aria-expanded={more} onClick={() => setMore(!more)}>
            {more ? 'Fechar convite extra' : 'Quero experimentar mais'}
          </Button>
          {more && say(definition.extra)}
        </div>
      )}
    </div>
  )
}
