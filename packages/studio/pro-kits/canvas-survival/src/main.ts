import { config } from './config'
import type { GameController } from './contracts'
import { createGame } from './game'
import { createInput } from './input'
import { exposeGameInspection, manageLifetime } from './lifecycle'
import { createProgress } from './progress'
import { createUI } from './ui'

const ui = createUI(
  'Guardiões da arena',
  `Mova com WASD, setas ou os botões. Aperte e solte Espaço para emitir um pulso. No controle, use a direção e o botão principal. Sobreviva ${config.surviveSeconds} segundos OU supere ${config.defeatGoal} adversários. Som é opcional.`,
  { readiness: 'loading' },
)
const input = createInput(ui.controls, () => ui.phase === 'playing' && ui.readiness === 'ready', {
  left: '← Esquerda',
  right: 'Direita →',
  up: '↑ Cima',
  down: '↓ Baixo',
  action: '◉ Pulso',
})
const stopProgress = createProgress(ui, 'canvas-survival')
let game: GameController | undefined
let stopInspection = () => {}
manageLifetime(() => {
  stopInspection()
  game?.dispose()
  stopProgress()
  input.destroy()
  ui.destroy()
})
game = createGame(ui, input)
stopInspection = exposeGameInspection(game)
