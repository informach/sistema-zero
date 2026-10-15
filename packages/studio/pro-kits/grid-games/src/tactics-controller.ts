import type { GameController } from './contracts'
import type { Cell } from './grid'
import type { GameInput } from './input'
import { frameLoop } from './lifecycle'
import { config } from './tactics-config'
import { Tactics } from './tactics-model'
import type { GameUI } from './ui'

export interface TacticsView {
  draw(game: Tactics): void
  dispose(): void
  statistics?(): { drawCalls: number; triangles: number; geometries: number; textures: number }
}
export type ViewFactory = (ui: GameUI, pick: (cell: Cell) => void, ready: () => void) => TacticsView

/** Rules, accessible controls and timing are identical in both renderers. */
export function createTacticsController(
  ui: GameUI,
  input: GameInput,
  engine: 'phaser' | 'three',
  createView: ViewFactory,
): GameController {
  const game = new Tactics(config),
    lifetime = new AbortController()
  let disposed = false,
    view: TacticsView | undefined,
    lastRevision = -1,
    rivalTime = 0,
    invalidate = () => {}
  ui.setReadiness('loading')
  const buttons: HTMLButtonElement[] = []
  const add = (label: string, id: string, action: () => void) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = label
    button.dataset.command = id
    button.addEventListener(
      'click',
      () => {
        if (ui.phase !== 'playing' || game.turn !== 'player') return
        action()
        invalidate()
      },
      { signal: lifetime.signal },
    )
    ui.controls.append(button)
    buttons.push(button)
  }
  add('Esperar unidade', 'wait', () => {
    game.waitUnit()
  })
  add('Encerrar turno', 'end-turn', () => game.endTurn())
  add('Recrutar · ' + config.recruitCost + ' moedas', 'recruit', () => {
    if (game.recruit()) ui.tone(520)
  })
  const updateControls = () => {
    for (const button of buttons) button.disabled = ui.phase !== 'playing' || game.turn !== 'player'
    buttons[0]!.disabled ||= !game.selected() || !!game.selected()?.acted
    buttons[2]!.disabled ||=
      game.coins < config.recruitCost ||
      game.units.filter((unit) => unit.side === 'friend' && unit.health > 0).length >=
        config.maxFriends
  }
  ui.onReset(() => {
    game.reset()
    rivalTime = 0
    input.clear()
    lastRevision = -1
  })
  const offPhase = ui.onPhase(() => {
    input.clear()
    rivalTime = 0
    lastRevision = -1
    updateControls()
    invalidate()
  })
  const offQuality = ui.onQuality(() => {
    lastRevision = -1
    invalidate()
  })
  view = createView(
    ui,
    (cell) => {
      if (ui.phase !== 'playing' || game.turn !== 'player') return
      if (game.activate(cell)) ui.tone(560)
      invalidate()
    },
    () => {
      if (!disposed) {
        ui.setReadiness('ready')
        lastRevision = -1
        invalidate()
      }
    },
  )
  const loop = frameLoop(
    (dt) => {
      input.poll()
      if (ui.phase === 'playing') {
        if (game.turn === 'player') {
          if (input.take('left')) game.moveCursor({ x: -1, y: 0 })
          if (input.take('right')) game.moveCursor({ x: 1, y: 0 })
          if (input.take('up')) game.moveCursor({ x: 0, y: -1 })
          if (input.take('down')) game.moveCursor({ x: 0, y: 1 })
          if (input.take('action') && game.activate()) ui.tone(560)
        } else {
          // Release all queued player gestures while the opponent owns the turn.
          input.clear()
          rivalTime += dt
          if (rivalTime >= 0.3) {
            rivalTime = 0
            game.stepRival()
          }
        }
        if (game.outcome !== 'playing')
          ui.finish(
            game.outcome === 'won',
            game.outcome === 'won'
              ? 'A ilha está protegida! Sua equipe venceu.'
              : 'A equipe precisa de outro plano. Reinicie e tente outra estratégia.',
            game.score,
          )
      }
      if (lastRevision !== game.revision) {
        lastRevision = game.revision
        view?.draw(game)
        updateControls()
        const unit = game.selected(),
          cursorUnit = game.at(game.cursor)
        ui.hud(
          'Turno ' +
            game.round +
            ' · ' +
            (game.turn === 'player' ? 'Sua equipe' : 'Robôs') +
            ' · Moedas: ' +
            game.coins +
            ' · Seleção: ' +
            (unit ? unit.id + (unit.moved ? ' (já moveu)' : '') : '—') +
            ' · Cursor: ' +
            (game.cursor.x + 1) +
            ',' +
            (game.cursor.y + 1) +
            (cursorUnit
              ? ' · ' +
                cursorUnit.id +
                ': ' +
                cursorUnit.health +
                '/' +
                cursorUnit.maxHealth +
                ' HP'
              : ''),
        )
      }
    },
    () => ui.phase === 'playing',
  )
  invalidate = loop.request
  const observer = new ResizeObserver(() => {
    lastRevision = -1
    invalidate()
  })
  observer.observe(ui.stage)
  updateControls()
  return {
    inspect: () => ({
      engine,
      phase: ui.phase,
      readiness: ui.readiness,
      ...game.snapshot(),
      ...(view?.statistics ? { render: view.statistics() } : {}),
    }),
    dispose() {
      if (disposed) return
      disposed = true
      loop.dispose()
      observer.disconnect()
      lifetime.abort()
      offPhase()
      offQuality()
      view?.dispose()
      for (const button of buttons) button.remove()
    },
  }
}
