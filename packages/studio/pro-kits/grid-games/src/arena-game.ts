import { config } from './arena-config'
import { type ArenaCommand, GridArena } from './arena-model'
import type { GameController } from './contracts'
import type { GameInput } from './input'
import { frameLoop } from './lifecycle'
import type { GameUI } from './ui'

export function createGame(ui: GameUI, input: GameInput): GameController {
  const canvas = document.createElement('canvas')
  canvas.tabIndex = 0
  canvas.setAttribute(
    'aria-label',
    'Arena em grade. Setas movem; Espaço coloca um pulso com pavio.',
  )
  ui.stage.append(canvas)
  const context = canvas.getContext('2d')!
  const game = new GridArena(config, 1)
  const width = Math.max(880, (config.columns + 1) * 64),
    height = Math.max(660, (config.rows + 1) * 64),
    size = 64,
    left = (width - config.columns * size) / 2,
    top = (height - config.rows * size) / 2
  let accumulator = 0,
    discardedSeconds = 0,
    disposed = false,
    invalidate = () => {},
    pendingPulse = false
  const resize = () => {
    const dpr = Math.min(ui.reducedQuality ? 1 : 1.5, devicePixelRatio || 1)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0)
    invalidate()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(ui.stage)
  const stopQuality = ui.onQuality(resize)
  ui.onReset((reason) => {
    const seed = reason === 'restart' ? game.seed : crypto.getRandomValues(new Uint32Array(1))[0]!
    game.reset(seed)
    accumulator = 0
    discardedSeconds = 0
    pendingPulse = false
    input.clear()
  })
  const stopPhase = ui.onPhase(() => {
    input.clear()
    accumulator = 0
    pendingPulse = false
    invalidate()
  })
  const loop = frameLoop(
    (dt) => {
      input.poll()
      if (ui.phase === 'playing') {
        pendingPulse ||= input.take('action')
        accumulator += dt
        let steps = 0
        while (accumulator + 1e-10 >= 1 / 60 && steps < 3 && game.outcome === 'playing') {
          const move = input.down('left')
            ? { x: -1, y: 0 }
            : input.down('right')
              ? { x: 1, y: 0 }
              : input.down('up')
                ? { x: 0, y: -1 }
                : input.down('down')
                  ? { x: 0, y: 1 }
                  : undefined
          const command: ArenaCommand = { move, place: pendingPulse }
          const score = game.score
          game.step(command)
          pendingPulse = false
          accumulator = Math.max(0, accumulator - 1 / 60)
          steps++
          if (game.score > score) ui.tone(660)
        }
        if (accumulator >= 1 / 60) {
          discardedSeconds += accumulator
          accumulator = 0
        }
        if (game.outcome !== 'playing')
          ui.finish(
            game.outcome === 'won',
            game.outcome === 'won'
              ? 'Todos os faróis foram acesos!'
              : 'O pulso alcançou você. Planeje um caminho de saída!',
            game.score,
          )
      }
      context.fillStyle = '#142c3b'
      context.fillRect(0, 0, width, height)
      const state = game
      for (let y = 0; y < config.rows; y++)
        for (let x = 0; x < config.columns; x++) {
          const tile = game.tile(x, y),
            px = left + x * size,
            py = top + y * size
          context.fillStyle =
            tile === 1 ? '#315064' : tile === 2 ? '#bc8851' : (x + y) % 2 ? '#244451' : '#274a56'
          context.fillRect(px + 2, py + 2, size - 4, size - 4)
          if (tile === 2) {
            context.strokeStyle = '#f7db9e'
            context.lineWidth = 3
            context.strokeRect(px + 13, py + 13, size - 26, size - 26)
          }
        }
      for (const pulse of state.pulses)
        for (const cell of pulse.cells) {
          context.fillStyle = '#ffdb72'
          context.fillRect(left + cell.x * size + 6, top + cell.y * size + 6, size - 12, size - 12)
        }
      const circle = (x: number, y: number, radius: number, color: string) => {
        context.fillStyle = color
        context.beginPath()
        context.arc(left + (x + 0.5) * size, top + (y + 0.5) * size, radius, 0, Math.PI * 2)
        context.fill()
      }
      for (const target of state.targets) {
        circle(target.x, target.y, 20, '#c4a3f4')
        context.fillStyle = '#182c41'
        context.font = 'bold 25px system-ui'
        context.textAlign = 'center'
        context.fillText('◇', left + (target.x + 0.5) * size, top + (target.y + 0.5) * size + 8)
      }
      for (const charge of state.charges) {
        circle(charge.x, charge.y, 17, '#ffdb72')
        context.strokeStyle = '#fff'
        context.lineWidth = 4
        context.beginPath()
        context.arc(
          left + (charge.x + 0.5) * size,
          top + (charge.y + 0.5) * size,
          24,
          -Math.PI / 2,
          -Math.PI / 2 + (Math.PI * 2 * charge.remaining) / config.fuseTicks,
        )
        context.stroke()
      }
      circle(state.player.x, state.player.y, 20, '#74ead1')
      context.fillStyle = '#102b3a'
      context.fillRect(
        left + (state.player.x + 0.5) * size - 9,
        top + (state.player.y + 0.5) * size - 6,
        5,
        7,
      )
      context.fillRect(
        left + (state.player.x + 0.5) * size + 4,
        top + (state.player.y + 0.5) * size - 6,
        5,
        7,
      )
      ui.hud(
        'Faróis: ' +
          (config.targetCount - game.targets.length) +
          '/' +
          config.targetCount +
          ' · Pontos: ' +
          game.score +
          ' · Pulsos: ' +
          game.charges.length +
          '/' +
          config.maxCharges,
      )
    },
    () => ui.phase === 'playing',
    {
      onDiscard: (seconds) => {
        if (ui.phase === 'playing') discardedSeconds += seconds
      },
    },
  )
  invalidate = loop.request
  resize()
  return {
    inspect: () => ({
      engine: 'canvas',
      phase: ui.phase,
      readiness: 'ready',
      ...game.snapshot(),
      timing: { discardedSeconds },
    }),
    dispose() {
      if (disposed) return
      disposed = true
      loop.dispose()
      stopPhase()
      stopQuality()
      observer.disconnect()
      canvas.remove()
    },
  }
}
