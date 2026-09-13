'use client'

import {
  type InteractiveBlock,
  type LearningAttemptView,
  type LearningBlockProgress,
  learningHints,
  type PublicInteractiveBlock,
} from '@sistemazero/core/learning'
import {
  type DemonstrationSession,
  type ExperimentSession,
  evaluateDemonstration,
  evaluateExperimentation,
  SCENE_LIMITS,
  type SceneActivity,
  type SceneCommand,
  sceneGoals,
  sceneHint,
  sceneScript,
  sceneTrial,
} from '@sistemazero/core/learning/scene'
import {
  Camera,
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
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { apiSend } from '../lib/api'
import {
  hasLessonMediaFocus,
  registerLessonMedia,
  requestLessonMediaFocus,
} from '../lib/lesson-media-focus'
import {
  archiveSceneDraft,
  readSceneDraft,
  SceneController,
  writeSceneDraft,
} from '../lib/scene-controller'
import type { LessonBlockView } from '../lib/types'
import { ExperienceComparison, ExperienceScene } from './experience-scene'
import { ExplorationPieces } from './exploration-pieces'
import { ExplorationStage, SceneButton } from './exploration-stage'
import { useLessonPlayer } from './lesson-player-context'
import { useLessonPreview } from './lesson-preview-context'

export function SceneActivityView({
  block,
  content,
  activity,
  previewContent,
}: {
  block: LessonBlockView
  content: PublicInteractiveBlock
  activity: SceneActivity
  previewContent?: InteractiveBlock
}) {
  const player = useLessonPlayer()
  const rehearsal = useLessonPreview()
  const id = useId()
  const hints = learningHints({ activity, hints: content.hints })
  const saved = player?.learningProgress?.blocks.find(
    (p) => p.blockId === block.id && p.revision === block.blockRevision,
  )
  const scope = player?.viewerId
    ? `${player.viewerId}:${player.lessonId}:${block.id}:${block.blockRevision}`
    : null
  const [tabId] = useState(() => {
    if (typeof window === 'undefined' || !scope) return crypto.randomUUID()
    try {
      const key = `sz:experience-tab:${scope}`
      const stored = sessionStorage.getItem(key) ?? crypto.randomUUID()
      sessionStorage.setItem(key, stored)
      return stored
    } catch {
      return crypto.randomUUID()
    }
  })
  const [controller] = useState(() =>
    SceneController.create(activity, tabId, saved?.answers ?? rehearsal?.answers[block.id] ?? {}),
  )
  const session = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  )
  const [ready, setReady] = useState(!scope)
  const [running, setRunning] = useState(false)
  const [slow, setSlow] = useState(false)
  const [muted, setMuted] = useState(true)
  const [hint, setHint] = useState(0)
  const [status, setStatus] = useState(scope ? 'Recuperando sua experiência…' : 'Prévia de autoria')
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [compared, setCompared] = useState(false)
  const [registered, setRegistered] = useState(!!saved?.result?.passed)
  const [reduced, setReduced] = useState(false)
  const owner = useRef(Symbol('experience'))
  const audio = useRef<AudioContext | null>(null)
  const narration = useRef<HTMLAudioElement>(null)
  const saving = useRef(false)
  const attemptId = useRef(crypto.randomUUID())
  const flush = useRef<() => Promise<void>>(async () => {})
  const action = useRef<(command: SceneCommand) => void>(() => {})
  const cacheKey = scope ? `${scope}:${tabId}` : null
  const base = player
    ? `/api/members/lessons/${encodeURIComponent(player.lessonId)}/blocks/${encodeURIComponent(block.id)}`
    : null
  const demoMode = activity.type === 'demonstration'
  const demo = demoMode ? (session as DemonstrationSession) : null
  const lab = demoMode ? null : (session as ExperimentSession)

  const state = session.state
  const m = activity.scene
  const reference = ['gravity', 'impulse', 'hitbox', 'jump-sound'].includes(m)
  const demoStep = demo ? sceneScript(activity)[demo.step] : null
  const result = demo
    ? evaluateDemonstration(demo.viewed)
    : evaluateExperimentation(activity.scene, state)
  const goals = sceneGoals(activity.scene, state)
  const instruction =
    demoStep?.caption ??
    (hint
      ? content.hints.length
        ? (hints[hint - 1] ?? content.instructions)
        : sceneHint(activity.scene, state, hint)
      : content.instructions)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => {
      setReduced(media.matches)
      if (media.matches) setRunning(false)
    }
    update()
    media.addEventListener('change', update)
    const unregister = registerLessonMedia(owner.current, () => {
      narration.current?.pause()
      setRunning(false)
      return audio.current?.suspend()
    })
    return () => {
      media.removeEventListener('change', update)
      unregister()
      void audio.current?.close()
    }
  }, [])
  useEffect(() => {
    if (!cacheKey) return
    let mounted = true
    void readSceneDraft(cacheKey)
      .then(async (draft) => {
        if (mounted) {
          if (draft && !controller.restore(draft)) {
            await archiveSceneDraft(cacheKey, draft)
            // ⚠️ Sem inventar a causa: o rascunho pode estar atrás da conta por outra aba, mas
            // também por um fechar de aba em que o envio chegou e a gravação local não — e aí
            // dizer "outra aba" manda a criança (e quem a ajuda) procurar o que não existe.
            setError(
              'A versão da sua conta estava mais adiantada que a cópia deste navegador. Continuamos da versão da conta; a cópia anterior ficou guardada aqui.',
            )
          }
          setStatus('Sua experiência está pronta.')
        }
      })
      .catch(() => {
        if (mounted)
          setError(
            'O navegador não permitiu guardar uma cópia local. O salvamento na conta continua disponível.',
          )
      })
      .finally(() => {
        if (mounted) setReady(true)
      })
    return () => {
      mounted = false
    }
  }, [cacheKey, controller])

  action.current = (command) => {
    if (!ready || conflict || (!demoMode && result.passed)) return
    const events = controller.dispatch(command)
    if (
      events.some((e) => e.type === 'sound') &&
      !muted &&
      audio.current &&
      hasLessonMediaFocus(owner.current) &&
      audio.current.state === 'running'
    ) {
      const oscillator = audio.current.createOscillator()
      const gain = audio.current.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(620, audio.current.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(920, audio.current.currentTime + 0.08)
      gain.gain.setValueAtTime(0.08, audio.current.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, audio.current.currentTime + 0.14)
      oscillator.connect(gain)
      gain.connect(audio.current.destination)
      oscillator.start()
      oscillator.stop(audio.current.currentTime + 0.15)
      oscillator.onended = () => {
        oscillator.disconnect()
        gain.disconnect()
      }
    }
  }
  async function enableSound() {
    if (!muted) {
      setMuted(true)
      await audio.current?.suspend()
      return
    }
    try {
      audio.current ??= new AudioContext()
      await audio.current.resume()
      if (await requestLessonMediaFocus(owner.current)) setMuted(false)
    } catch {
      setError(
        'O som não abriu neste navegador. Você pode acompanhar pelos contadores de sons e saltos.',
      )
    }
  }
  const dispatch = (command: SceneCommand) => {
    action.current(command)
    if (command.type === 'jump' && !reduced) setRunning(true)
  }
  useEffect(() => {
    if (
      ready &&
      demoMode &&
      !(controller.getSnapshot() as DemonstrationSession).viewed &&
      controller.getSnapshot().state.evidence.actions === 0
    )
      controller.dispatch({ type: 'start' })
  }, [ready, demoMode, controller])
  useEffect(() => {
    if (!result.passed) return
    if (!demoMode) setRunning(false)
    // ⚠️ Fechar a atividade grava NA HORA, sem esperar a batida de um segundo. A criança acabou
    // de ver "concluído": um segundo de "guardando" depois disso é tempo em que ela fecha a aba
    // e perde o registro — e, na prévia do professor, é a seção que não destrava ao vivo.
    void flush.current()
  }, [demoMode, result.passed])
  flush.current = async () => {
    if (!ready || conflict) return
    if (saving.current) {
      if (cacheKey)
        await writeSceneDraft(cacheKey, controller.draft()).catch(() =>
          setError('Não foi possível guardar a cópia local.'),
        )
      return
    }
    saving.current = true
    try {
      // Persist the retry identifier BEFORE the request. A lost response must not create a new command.
      const segment = controller.segment()
      if (cacheKey)
        await writeSceneDraft(cacheKey, controller.draft()).catch(() =>
          setError(
            'Não foi possível atualizar a cópia neste navegador. Mantenha a aula aberta até salvar na conta.',
          ),
        )
      if (!base || !player) {
        // ⚠️ O registro da tentativa NÃO pode depender de haver comando novo. O `previewConfirm`
        // já consumiu os pendentes na primeira ida; se ela falhou, na segunda não sobra segmento
        // e o botão "Tentar salvar" virava um clique morto — o professor conclui que a atividade
        // não registra, quando o que não funciona é a repetição.
        if (segment) {
          const confirmadas = controller.previewConfirm()
          rehearsal?.onChange(
            block.id,
            confirmadas,
            Math.min(controller.getSnapshot().state.evidence.hints, hints.length),
          )
        }
        // ⚠️ E o avaliador é o DO TIPO: cobrar as metas da cena de quem só assistiu nunca
        // registraria uma demonstração no ensaio.
        if (!registered && result.passed && previewContent) {
          if (rehearsal) await rehearsal.onAttempt(block.id, previewContent, controller.answers())
          setRegistered(true)
        }
        return
      }
      if (segment) {
        setStatus('Guardando sua experiência…')
        const progress = await apiSend<LearningBlockProgress>(
          `${base}/learning-progress`,
          'POST',
          {
            revision: block.blockRevision,
            answers: segment,
            hintsUsed: Math.min(controller.getSnapshot().state.evidence.hints, hints.length),
            positionSeconds: null,
          },
          { 'x-sz-viewer': player.viewerId ?? '' },
          { keepalive: true },
        )
        controller.acknowledge(progress.answers)
        player.onLearningProgress?.(progress)
      }
      // ⚠️ Quem decide é o avaliador DO TIPO (`result`), não o da experimentação. Cobrar as metas
      // da cena de quem só assistiu nunca registra a demonstração: medido, em `jump-sound` e
      // `controls` o roteiro do modelo termina SEM fechar as metas, e nas outras doze só fecha
      // por coincidência do último passo — um roteiro autoral quebra a coincidência nos dois
      // sentidos (registra antes do fim, ou nunca).
      if (!registered && result.passed) {
        const response = await apiSend<{
          attempt: LearningAttemptView
          progress: LearningBlockProgress
        }>(
          `${base}/learning-attempts`,
          'POST',
          {
            id: attemptId.current,
            revision: block.blockRevision,
            answers: controller.answers(),
            hintsUsed: Math.min(controller.getSnapshot().state.evidence.hints, hints.length),
          },
          { 'x-sz-viewer': player.viewerId ?? '' },
        )
        setRegistered(response.attempt.result.passed)
        player.onLearningProgress?.(response.progress)
        player.refreshAfterLearning?.()
      }
      // ⚠️ Com `.catch()`: esta era a única gravação local SEM rede-de-proteção, e num navegador
      // sem IndexedDB (aba privada, armazenamento bloqueado) ela derrubava o resto do bloco — a
      // criança lia "aguardando conexão" com o POST tendo voltado 200.
      let copiaLocal = true
      if (cacheKey)
        await writeSceneDraft(cacheKey, controller.draft()).catch(() => {
          copiaLocal = false
        })
      setStatus('Experiência salva na sua conta.')
      setError(
        copiaLocal ? '' : 'O resultado foi salvo na conta. A cópia neste navegador não guardou.',
      )
    } catch (e) {
      const stale = typeof e === 'object' && e !== null && 'status' in e && e.status === 409
      if (stale) {
        setConflict(true)
        setRunning(false)
        setError(
          'Esta experiência foi atualizada em outra aba ou mudou de versão. Sua cópia ficou guardada neste navegador. Reabra a aula para continuar da versão salva.',
        )
      } else if (!player) {
        // ⚠️ No ensaio de autoria não existe conexão a aguardar: a falha veio do próprio ensaio
        // (o professor pediu "falhar na próxima confirmação") ou do avaliador. Traduzir isso
        // para "aguardando conexão" esconde dele exatamente o que ele mandou acontecer.
        setStatus('')
        setError(
          e instanceof Error && e.message
            ? e.message
            : 'Não foi possível registrar este resultado na prévia.',
        )
      } else {
        setStatus('Aguardando conexão para salvar na conta.')
        setError('Suas ações continuam neste navegador. Vamos tentar salvar novamente.')
      }
    } finally {
      saving.current = false
    }
  }
  useEffect(() => {
    if (!ready) return
    const timer = setInterval(() => {
      void flush.current()
    }, 1000)
    const save = () => {
      void flush.current()
    }
    const hidden = () => {
      if (document.hidden) {
        setRunning(false)
        narration.current?.pause()
        save()
      }
    }
    window.addEventListener('online', save)
    window.addEventListener('pagehide', save)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      clearInterval(timer)
      window.removeEventListener('online', save)
      window.removeEventListener('pagehide', save)
      document.removeEventListener('visibilitychange', hidden)
      save()
    }
  }, [ready])
  useEffect(() => {
    if (!running || !ready || conflict) return
    let frame = 0
    let last: number | null = null
    let elapsed = 0
    const tick = (now: number) => {
      if (document.hidden) {
        last = null
        elapsed = 0
        frame = requestAnimationFrame(tick)
        return
      }
      if (last !== null) elapsed += Math.min((now - last) / 1000, 0.1) * (slow ? 0.5 : 1)
      last = now
      if (elapsed >= 0.04) {
        const current = controller.getSnapshot()
        // Numa demonstração o relógio serve ao roteiro; numa experimentação, ao mundo.
        if (demoMode && (current as DemonstrationSession).ready) {
          setRunning(false)
          return
        }
        action.current(
          demoMode ? { type: 'tick', seconds: elapsed } : { type: 'advance', seconds: elapsed },
        )
        elapsed = 0
        // Acabou o salto: parar o relógio em vez de rodar à toa.
        if (
          !demoMode &&
          ['gravity', 'impulse', 'jump-sound'].includes(m) &&
          controller.getSnapshot().state.flight.time === null
        ) {
          setRunning(false)
          return
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [controller, running, ready, conflict, slow, m, demoMode])

  return (
    /* ⚠️ A cena NÃO desenha cartão. Quem desenha é o app, pelo gancho `sz-lesson-scene`:
       no kids todo bloco já é um cartão, e a cena fazia o segundo dentro dele — duas molduras
       aninhadas empurram o desenho para dentro e a criança lê duas bordas antes do que importa.
       Adulto e ensaio do admin vestem este gancho no globals.css deles. */
    <section aria-labelledby={`${id}-title`} className="sz-lesson-scene space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[.16em] text-primary">
            {demoMode ? 'Demonstração' : 'Experimentação'}
          </p>
          <h3 id={`${id}-title`} className="text-xl font-bold sm:text-2xl">
            {content.title}
          </h3>
        </div>
        {!demoMode && (
          /* ⚠️ UM medidor, não uma insígnia por meta: com `role="img"` em cada bolinha o leitor
             de tela anunciava as metas uma a uma a cada descoberta. Aqui ele lê "2 de 3
             descobertas" e as bolinhas ficam sendo o que são — desenho. */
          <div
            className="flex gap-1"
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
                aria-hidden
                className={`grid h-8 w-8 place-items-center rounded-full border ${g.complete ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted'}`}
              >
                {g.complete ? <Check size={16} /> : '·'}
              </span>
            ))}
          </div>
        )}
      </header>
      <div className="space-y-4">
        <div className="min-h-16 rounded-2xl bg-primary/5 px-4 py-3" aria-live="polite">
          {player?.renderInstruction ? (
            player.renderInstruction(
              instruction,
              demo ? 'speaking' : hint ? 'thinking' : 'speaking',
            )
          ) : (
            <p className="text-sm font-medium leading-relaxed sm:text-base">{instruction}</p>
          )}
        </div>
        <fieldset
          disabled={!ready || conflict || (!demoMode && result.passed)}
          className="min-w-0 space-y-4"
        >
          {/* O teto da cena. Ela não ocupa mais o cartão inteiro: fica centralizada e com
              largura de leitura, como no Brilliant. O token vive em `styles/scene.css`. */}
          <div
            className={`mx-auto w-full max-w-scene ${
              demoStep?.highlight === 'scene'
                ? 'rounded-2xl ring-2 ring-primary ring-offset-4 ring-offset-card'
                : ''
            }`}
          >
            {reference ? (
              <ExperienceScene
                activity={activity}
                state={state}
                onJump={
                  !demoMode && !result.passed && m !== 'hitbox'
                    ? (input) => dispatch({ type: 'jump', input })
                    : undefined
                }
                onDistance={
                  !demoMode && !result.passed && m === 'hitbox'
                    ? (distance) => dispatch({ type: 'move', distance })
                    : undefined
                }
              />
            ) : (
              <fieldset disabled={demoMode || result.passed}>
                <ExplorationStage
                  activity={activity}
                  state={state}
                  dispatch={dispatch}
                  paused={!running}
                />
              </fieldset>
            )}
          </div>
          <p
            role="status"
            className="min-h-6 text-center text-sm font-medium text-muted-foreground"
          >
            {state.caption ||
              (demoMode
                ? 'Observe o que acontece na cena.'
                : 'Siga a missão e observe o resultado.')}
          </p>
          {demoMode ? (
            <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-primary/5 p-3">
              <span className="mr-2 text-sm font-semibold">
                Etapa {(demo?.step ?? 0) + 1} de {sceneScript(activity).length}
              </span>
              <SceneButton onClick={() => setRunning((v) => !v)} disabled={!demo || demo.ready}>
                {running ? <Pause size={16} /> : <Play size={16} />}
                {running ? 'Pausar' : 'Observar'}
              </SceneButton>
              <SceneButton
                onClick={() => dispatch({ type: 'tick', seconds: 0.2 })}
                disabled={!demo || demo.ready}
              >
                <StepForward size={16} />
                Um passo
              </SceneButton>
              {(demo?.step ?? 0) < sceneScript(activity).length - 1 && (
                <SceneButton
                  disabled={!demo?.ready}
                  onClick={() => {
                    dispatch({ type: 'next' })
                    setRunning(!reduced)
                  }}
                >
                  Próxima etapa
                </SceneButton>
              )}
              <SceneButton
                onClick={() => {
                  dispatch({ type: 'start' })
                  setRunning(!reduced)
                }}
              >
                <RotateCcw size={16} />
                Rever desde o começo
              </SceneButton>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-border bg-background p-3">
                {['gravity', 'impulse', 'jump-sound'].includes(m) && (
                  <SceneButton
                    className="!border-primary !bg-primary !px-6 !text-primary-foreground"
                    onClick={() => dispatch({ type: 'jump', input: 'tap' })}
                  >
                    ↑ Pular com toque
                  </SceneButton>
                )}
                {m === 'jump-sound' && (
                  <SceneButton
                    onClick={() => dispatch({ type: 'jump', input: 'key' })}
                    onKeyDown={(e) => {
                      if (e.code === 'Space') {
                        e.preventDefault()
                        if (!e.repeat) dispatch({ type: 'jump', input: 'key' })
                      }
                    }}
                  >
                    Tecla Espaço
                  </SceneButton>
                )}
                {!['hitbox', 'world', 'layers', 'controls'].includes(m) && (
                  <>
                    <SceneButton
                      aria-label={running ? 'Pausar experiência' : 'Continuar experiência'}
                      onClick={() => setRunning((v) => !v)}
                    >
                      {running ? <Pause size={18} /> : <Play size={18} />}
                    </SceneButton>
                    <SceneButton onClick={() => dispatch({ type: 'advance', seconds: 0.2 })}>
                      <StepForward size={16} />
                      Um passo
                    </SceneButton>
                    <SceneButton aria-pressed={slow} onClick={() => setSlow((v) => !v)}>
                      ½ velocidade
                    </SceneButton>
                  </>
                )}
                {reference && (
                  <SceneButton
                    onClick={() => {
                      dispatch({ type: 'capture' })
                      setCompared(true)
                    }}
                  >
                    <Camera size={16} />
                    Guardar para comparar
                  </SceneButton>
                )}
              </div>
              <div
                className={`space-y-3 ${demoStep?.highlight === 'tools' ? 'rounded-2xl ring-2 ring-primary' : ''}`}
              >
                {(m === 'impulse' || m === 'gravity') && (
                  <label
                    className="flex flex-wrap items-center gap-4 rounded-2xl border border-border p-4 text-sm font-semibold"
                    htmlFor={`${id}-force`}
                  >
                    Impulso <output className="text-lg text-amber-700">{state.flight.force}</output>
                    <input
                      id={`${id}-force`}
                      aria-label="Impulso do salto"
                      type="range"
                      min="5"
                      max="14"
                      step="1"
                      value={state.flight.force}
                      disabled={m === 'gravity'}
                      onChange={(e) => dispatch({ type: 'impulse', force: Number(e.target.value) })}
                      className="h-11 min-w-32 flex-1 accent-amber-600"
                    />
                    {m === 'gravity' && (
                      <span className="font-normal text-muted-foreground">
                        O impulso fica igual para comparar a gravidade.
                      </span>
                    )}
                  </label>
                )}
                {m === 'hitbox' && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      {
                        label: 'Distância do cacto',
                        value: state.contact.distance,
                        min: 20,
                        max: 260,
                        field: 'distance',
                      },
                      {
                        label: 'Largura da área do Dino',
                        value: state.contact.width,
                        min: 24,
                        max: 120,
                        field: 'width',
                      },
                    ].map((item) => (
                      <label
                        key={item.field}
                        className="rounded-2xl border border-border p-4 text-sm font-semibold"
                      >
                        <span className="flex justify-between gap-2">
                          {item.label}
                          <output>{item.value}</output>
                        </span>
                        <input
                          aria-label={item.label}
                          className="mt-2 h-11 w-full accent-primary"
                          type="range"
                          min={item.min}
                          max={item.max}
                          step="1"
                          value={item.value}
                          onChange={(e) =>
                            dispatch(
                              item.field === 'width'
                                ? { type: 'resize', width: Number(e.target.value) }
                                : { type: 'move', distance: Number(e.target.value) },
                            )
                          }
                        />
                      </label>
                    ))}
                  </div>
                )}
                <ExplorationPieces
                  activity={activity}
                  state={state}
                  dispatch={dispatch}
                  more={false}
                />
              </div>
            </>
          )}
          {demo && demoStep?.highlight === 'tools' && (
            <fieldset disabled className="rounded-2xl border-2 border-primary p-3">
              <legend className="px-2 text-sm font-semibold">Observe a montagem</legend>
              {['gravity', 'impulse'].includes(m) && (
                <p className="mb-3 text-sm">
                  Impulso {state.flight.force} · gravidade{' '}
                  {state.flight.gravity ? 'ligada' : 'desligada'}
                </p>
              )}
              <ExplorationPieces activity={activity} state={state} dispatch={dispatch} more />
            </fieldset>
          )}
          {demo && reference && demoStep?.highlight === 'compare' && (
            <div className="rounded-2xl border-2 border-primary p-3">
              <ExperienceComparison
                activity={activity}
                trials={[demo.before ?? sceneTrial(demo.state, 'Antes desta etapa')]}
                current={state}
              />
            </div>
          )}
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            {!demoMode && (
              <>
                <SceneButton
                  onClick={() => {
                    setRunning(false)
                    dispatch({ type: 'undo' })
                  }}
                  disabled={!(lab?.past ?? []).length}
                >
                  <Undo2 size={16} />
                  Desfazer
                </SceneButton>
                <SceneButton
                  onClick={() => {
                    setRunning(false)
                    dispatch({ type: 'reset' })
                  }}
                >
                  <RotateCcw size={16} />
                  Recomeçar
                </SceneButton>
                <SceneButton
                  onClick={() => {
                    const level = Math.min(hints.length, hint + 1)
                    setHint(level)
                    // ⚠️ A AÇÃO tem três degraus (`SCENE_LIMITS.hint`), mas a caixa de pistas do
                    // editor aceita dez. Com quatro pistas escritas, o quarto clique mandava
                    // `level: 4`, o motor recusava e o `dispatch` estourava DENTRO do onClick da
                    // criança — e o degrau nunca era contado, então o relatório dizia "3 pistas"
                    // para quem consultou cinco. A tela mostra todas; a evidência satura em três.
                    dispatch({ type: 'hint', level: Math.min(level, SCENE_LIMITS.hint.max) })
                  }}
                >
                  <Lightbulb size={16} />
                  Uma pista
                </SceneButton>
              </>
            )}
            <SceneButton onClick={() => void enableSound()} aria-pressed={!muted}>
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              {muted ? 'Ligar som' : 'Silenciar'}
            </SceneButton>
            {activity.instructionAudioUrl && (
              <>
                <audio ref={narration} src={activity.instructionAudioUrl} preload="none">
                  <track
                    kind="captions"
                    srcLang="pt-BR"
                    label="Instrução"
                    src={`data:text/vtt;charset=utf-8,${encodeURIComponent(`WEBVTT\n\n00:00:00.000 --> 24:00:00.000\n${content.instructions}`)}`}
                  />
                </audio>
                <SceneButton
                  onClick={async () => {
                    if (await requestLessonMediaFocus(owner.current)) {
                      try {
                        await narration.current?.play()
                      } catch {
                        setError('Não foi possível ouvir a instrução agora.')
                      }
                    }
                  }}
                >
                  Ouvir instrução
                </SceneButton>
              </>
            )}
          </div>
        </fieldset>
        {reference && (lab?.trials ?? []).length > 0 && (
          <details
            open={compared}
            onToggle={(e) => setCompared(e.currentTarget.open)}
            className="rounded-2xl border border-border p-4"
          >
            <summary className="cursor-pointer text-sm font-semibold">
              O que mudou? Compare suas experiências
            </summary>
            <div className="mt-4">
              <ExperienceComparison
                activity={activity}
                trials={lab?.trials ?? []}
                current={state}
              />
            </div>
          </details>
        )}
        {result.passed && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p className="font-semibold">{result.feedback}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {demoMode
                ? 'Você acompanhou o conceito em funcionamento.'
                : 'Você concluiu a investigação proposta nesta atividade.'}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {registered
                ? activity.type === 'demonstration'
                  ? 'Exemplo registrado.'
                  : 'Descoberta registrada.'
                : 'Guardando este resultado…'}
            </p>
          </div>
        )}
        <footer className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{status}</span>
          {error && (
            <button
              type="button"
              onClick={() => void flush.current()}
              disabled={conflict}
              className="min-h-11 underline"
            >
              Tentar salvar
            </button>
          )}
        </footer>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </section>
  )
}
