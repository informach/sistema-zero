import { type ArenaAssets, loadArenaAssets } from './assets'
import { config, TICK_SECONDS } from './config'
import type { GameController, GameSnapshot } from './contracts'
import type { GameInput } from './input'
import { frameLoop } from './lifecycle'
import { type ArenaEvent, type ArenaState, createArenaState, stepArena } from './model'
import { createCanvasRenderer } from './render/canvas'
import type { GameUI } from './ui'

/** A UI é dona da fase; este controller só avança regras quando a partida está jogando. */
export function createGame(ui: GameUI, input: GameInput): GameController {
  let state: ArenaState | undefined
  let assets: ArenaAssets | undefined
  let renderer: ReturnType<typeof createCanvasRenderer> | undefined
  let request: AbortController | undefined
  let generation = 0
  let disposed = false
  let accumulator = 0
  let discardedSeconds = 0
  const debugHitboxes = new URLSearchParams(location.search).get('hitboxes') === '1'
  const freshSeed = () => crypto.getRandomValues(new Uint32Array(1))[0]!

  const loop = frameLoop(
    (seconds) => {
      if (disposed || !state || !renderer || ui.readiness !== 'ready') return
      const events: ArenaEvent[] = []
      if (ui.phase === 'playing') {
        input.poll()
        accumulator += seconds
        let steps = 0
        while (accumulator + 1e-10 >= TICK_SECONDS && steps < 3) {
          accumulator = Math.max(0, accumulator - TICK_SECONDS)
          steps++
          // take é destrutivo: nunca consumir em um frame que não executará tick.
          const tickEvents = stepArena(state, {
            x: Number(input.down('right')) - Number(input.down('left')),
            y: Number(input.down('down')) - Number(input.down('up')),
            pulse: input.take('action'),
          })
          events.push(...tickEvents)
          for (const event of tickEvents) {
            if (event.type === 'pulse') ui.tone(520)
            else if (event.type === 'hit' && event.role === 'player') ui.tone(160)
            else if (event.type === 'defeat') ui.tone(780)
          }
          if (state.result) {
            const won = state.result !== 'lost'
            const message =
              state.result === 'win-time'
                ? 'Você protegeu a arena até o fim do tempo!'
                : state.result === 'win-defeats'
                  ? 'Você superou os adversários e protegeu a arena!'
                  : 'Sua energia acabou. Tente outra estratégia!'
            ui.finish(won, message, state.defeated)
            break
          }
        }
        if (accumulator >= TICK_SECONDS) {
          const retained = accumulator % TICK_SECONDS
          discardedSeconds += accumulator - retained
          accumulator = retained
        }
      }
      if (ui.phase === 'playing' || ui.phase === 'won' || ui.phase === 'lost') {
        renderer.advanceVisual(seconds)
      }
      renderer.draw(
        state,
        {
          phase: ui.phase,
          reducedQuality: ui.reducedQuality,
          reducedMotion: ui.reducedMotion,
          debugHitboxes,
        },
        events,
      )
      updateHud()
    },
    () =>
      !disposed &&
      ui.readiness === 'ready' &&
      (ui.phase === 'playing' ||
        ((ui.phase === 'won' || ui.phase === 'lost') && Boolean(renderer?.hasEffects()))),
    {
      onDiscard: (seconds) => {
        discardedSeconds += seconds
      },
    },
  )

  function updateHud() {
    if (!state) return
    const elapsed = Math.min(state.config.surviveSeconds, state.tick * TICK_SECONDS)
    const remaining = Math.max(0, state.pulseReadyTick - state.tick) * TICK_SECONDS
    ui.hud(
      `Energia: ${state.player.health}/${state.player.maxHealth} · Tempo: ${Math.floor(elapsed)}/${state.config.surviveSeconds}s · Superados: ${state.defeated}/${state.config.defeatGoal} · Pulso: ${remaining > 0 ? `${remaining.toFixed(1)}s` : 'pronto'}`,
    )
  }

  function reset(reason: 'start' | 'restart') {
    if (!assets || disposed || ui.readiness !== 'ready') return
    state = createArenaState({
      seed: reason === 'restart' && state ? state.seed : freshSeed(),
      bodies: assets.collisionBodies(),
    })
    accumulator = 0
    renderer?.resetEffects()
    input.clear()
    updateHud()
    loop.request()
  }

  ui.onReset(reset)
  const offPhase = ui.onPhase(() => {
    input.clear()
    accumulator = 0
    if (ui.phase === 'menu') renderer?.resetEffects()
    loop.request()
  })
  const offQuality = ui.onQuality(() => loop.request())
  const offMotion = ui.onMotion(() => loop.request())

  async function load() {
    if (disposed) return
    const ownGeneration = ++generation
    request?.abort()
    request = new AbortController()
    renderer?.dispose()
    renderer = undefined
    assets?.dispose()
    assets = undefined
    state = undefined
    accumulator = 0
    input.clear()
    ui.setReadiness('loading', 'Preparando os personagens da arena…')
    let candidate: ArenaAssets | undefined
    try {
      candidate = await loadArenaAssets({ signal: request.signal })
      if (disposed || ownGeneration !== generation) {
        candidate.dispose()
        return
      }
      const nextState = createArenaState({ seed: freshSeed(), bodies: candidate.collisionBodies() })
      const nextRenderer = createCanvasRenderer(ui.stage, candidate, {
        onInvalidate: () => loop.request(),
      })
      assets = candidate
      state = nextState
      renderer = nextRenderer
      ui.menu()
      ui.setReadiness(
        'ready',
        `Proteja a arena por ${nextState.config.surviveSeconds} segundos ou supere ${nextState.config.defeatGoal} adversários. Você escolhe a estratégia!`,
      )
      updateHud()
      loop.request()
    } catch (error) {
      candidate?.dispose()
      if (disposed || ownGeneration !== generation) return
      request?.abort()
      const message = error instanceof Error ? error.message : 'Não foi possível preparar a arena.'
      ui.setReadiness('error', message, () => {
        void load()
      })
    }
  }

  // O controller já tem propriedade do descarte antes da primeira promise de recursos.
  void load()
  return {
    inspect(): GameSnapshot {
      return {
        engine: 'canvas',
        phase: ui.phase,
        readiness: ui.readiness,
        score: state?.defeated ?? 0,
        goal: state?.config.defeatGoal ?? config.defeatGoal,
        tick: state?.tick ?? 0,
        seed: state?.seed ?? 0,
        health: state?.player.health ?? 0,
        maxHealth: state?.player.maxHealth ?? 0,
        kills: state?.defeated ?? 0,
        elapsedSeconds: (state?.tick ?? 0) * TICK_SECONDS,
        timeGoalSeconds: state?.config.surviveSeconds ?? config.surviveSeconds,
        timing: { discardedSeconds },
        render: {
          drawCalls: renderer?.inspect().drawCalls ?? 0,
          triangles: 0,
          geometries: 0,
          textures: renderer?.inspect().textures ?? 0,
        },
        ...(state
          ? {
              player: { x: state.player.x, y: state.player.y },
              targets: state.enemies.map(({ x, y }) => ({ x, y })),
            }
          : {}),
        ...(state?.result
          ? {
              resultReason:
                state.result === 'lost' ? 'health' : state.result === 'win-time' ? 'time' : 'kills',
            }
          : {}),
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      generation++
      request?.abort()
      loop.dispose()
      offPhase()
      offQuality()
      offMotion()
      renderer?.dispose()
      assets?.dispose()
      renderer = undefined
      assets = undefined
      state = undefined
      input.clear()
      ui.stopSound()
    },
  }
}
