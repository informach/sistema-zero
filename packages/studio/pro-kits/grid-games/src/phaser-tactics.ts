import Phaser from 'phaser'
import type { GameInput } from './input'
import { config } from './tactics-config'
import { createTacticsController, type TacticsView } from './tactics-controller'
import type { Tactics } from './tactics-model'
import type { GameUI } from './ui'

export function createGame(ui: GameUI, input: GameInput) {
  return createTacticsController(ui, input, 'phaser', (host, pick, ready) => {
    const size = 64,
      width = Math.max(640, (config.terrain[0]!.length + 1) * size),
      height = Math.max(560, (config.terrain.length + 1) * size)
    const left = (width - config.terrain[0]!.length * size) / 2,
      top = (height - config.terrain.length * size) / 2
    let disposed = false,
      scene: Board | undefined,
      pending: Tactics | undefined
    class Board extends Phaser.Scene {
      ink!: Phaser.GameObjects.Graphics
      constructor() {
        super('tactics')
      }
      create() {
        if (disposed) return
        scene = this
        this.ink = this.add.graphics()
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) =>
          pick({
            x: Math.floor((pointer.x - left) / size),
            y: Math.floor((pointer.y - top) / size),
          }),
        )
        this.game.canvas.tabIndex = 0
        this.game.canvas.setAttribute(
          'aria-label',
          'Ilha tática. Toque nas casas ou use setas e Espaço. O HUD descreve a seleção.',
        )
        if (pending) this.draw(pending)
        ready()
      }
      draw(model: Tactics) {
        const g = this.ink
        g.clear()
        // Separate water, shadows, floor/elevation, overlays and units. Occupancy stays on the grid.
        g.fillStyle(0x234c66).fillRect(0, 0, width, height)
        for (let y = 0; y < model.rows; y++)
          for (let x = 0; x < model.columns; x++) {
            if (!model.tile({ x, y })) continue
            g.fillStyle(0x142e40, 0.6).fillRoundedRect(
              left + x * size + 4,
              top + y * size + 8,
              size - 2,
              size - 2,
              8,
            )
          }
        for (let y = 0; y < model.rows; y++)
          for (let x = 0; x < model.columns; x++) {
            const tile = model.tile({ x, y })
            if (!tile) continue
            const px = left + x * size,
              py = top + y * size
            g.fillStyle(tile === 2 ? 0xb8bf83 : (x + y) % 2 ? 0x64977b : 0x70a187).fillRoundedRect(
              px + 1,
              py + 1,
              size - 2,
              size - 2,
              6,
            )
            if (tile === 2)
              g.lineStyle(3, 0xe8e5ad).lineBetween(
                px + 10,
                py + size - 9,
                px + size - 10,
                py + size - 9,
              )
          }
        const selected = model.selected()
        if (selected && model.turn === 'player')
          for (const cell of model.moves(selected))
            g.lineStyle(2, 0xb5ffe7).strokeRect(
              left + cell.x * size + 5,
              top + cell.y * size + 5,
              size - 10,
              size - 10,
            )
        for (const unit of model.units) {
          if (unit.health <= 0) continue
          const px = left + (unit.x + 0.5) * size,
            py = top + (unit.y + 0.5) * size
          g.fillStyle(0x122e3c, 0.3).fillEllipse(px, py + 17, 38, 16)
          g.fillStyle(unit.side === 'friend' ? 0x82f6de : 0xf9bb88, unit.acted ? 0.6 : 1)
          if (unit.role === 'scout') g.fillTriangle(px, py - 20, px - 19, py + 15, px + 19, py + 15)
          else g.fillRoundedRect(px - 18, py - 18, 36, 34, 9)
          g.fillStyle(0x173343)
            .fillRect(px - 10, py - 5, 6, 6)
            .fillRect(px + 4, py - 5, 6, 6)
          g.fillStyle(0x183442).fillRect(px - 20, py - 28, 40, 5)
          g.fillStyle(0xffffff).fillRect(px - 20, py - 28, (40 * unit.health) / unit.maxHealth, 5)
          if (unit.id === model.selectedId) g.lineStyle(3, 0xffffff).strokeCircle(px, py, 26)
        }
        g.lineStyle(4, 0xffe780).strokeRect(
          left + model.cursor.x * size + 3,
          top + model.cursor.y * size + 3,
          size - 6,
          size - 6,
        )
      }
    }
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.stage,
      width,
      height,
      backgroundColor: '#234c66',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      audio: { noAudio: true },
      scene: Board,
      fps: { target: 60 },
      antialias: true,
    })
    // Turn-based drawing is invalidated by model/viewport changes, never a second continuous RAF.
    const sleep = () => game.loop.sleep()
    game.events.on('postrender', sleep)
    const view: TacticsView = {
      draw(model) {
        pending = model
        if (!scene || disposed) return
        scene.draw(model)
        game.loop.wake()
      },
      dispose() {
        if (disposed) return
        disposed = true
        game.events.off('postrender', sleep)
        game.destroy(true)
        if (game.isBooted) game.loop.wake()
      },
    }
    return view
  })
}
