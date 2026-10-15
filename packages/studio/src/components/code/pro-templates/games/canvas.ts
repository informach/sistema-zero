export function canvasSources(): Record<string, string> {
  return {
    'src/config.ts': `export const config = { columns: 10, rows: 16, goalLines: 8, fallSeconds: .7, colors: ['#ffc85b', '#58dcbb', '#8cb8ff', '#e8a5f0', '#ff927b'] } as const\n`,
    'src/model.ts': `
import { config } from './config'
type Cell = [number, number]
export interface Piece { cells: Cell[]; x: number; y: number; color: number }
const shapes: Cell[][] = [ [[0,0],[1,0],[0,1],[1,1]], [[0,0],[1,0],[2,0],[3,0]], [[1,0],[0,1],[1,1],[2,1]], [[0,0],[0,1],[1,1],[2,1]], [[1,0],[2,0],[0,1],[1,1]] ]
export class Puzzle {
  board: number[][] = []
  piece!: Piece
  lines = 0
  score = 0
  over = false
  private bag: number[] = []
  constructor(private random: () => number = Math.random) { this.reset() }
  reset() { this.board = Array.from({ length: config.rows }, () => Array(config.columns).fill(0)); this.bag = []; this.lines = 0; this.score = 0; this.over = false; this.spawn() }
  private spawn() {
    if (!this.bag.length) {
      this.bag = shapes.map((_, i) => i)
      for (let i = this.bag.length - 1; i > 0; i--) { const j = Math.floor(this.random() * (i + 1)); [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]] }
    }
    const index = this.bag.pop()!
    this.piece = { cells: shapes[index].map(([x,y]) => [x,y]), x: 3, y: 0, color: index + 1 }
    if (!this.valid(this.piece)) this.over = true
  }
  valid(piece: Piece) { return piece.cells.every(([x,y]) => { const col = x + piece.x, row = y + piece.y; return col >= 0 && col < config.columns && row >= 0 && row < config.rows && this.board[row][col] === 0 }) }
  move(dx: number, dy: number) { if (this.over) return false; const next = { ...this.piece, x: this.piece.x + dx, y: this.piece.y + dy }; if (!this.valid(next)) return false; this.piece = next; return true }
  rotate() {
    if (this.over) return
    const cells: Cell[] = this.piece.cells.map(([x,y]) => [-y,x])
    const minX = Math.min(...cells.map(c => c[0])), minY = Math.min(...cells.map(c => c[1]))
    const normalized: Cell[] = cells.map(([x,y]) => [x-minX,y-minY])
    for (const offset of [0,-1,1,-2,2]) { const next = { ...this.piece, cells: normalized, x: this.piece.x + offset }; if (this.valid(next)) { this.piece = next; return } }
  }
  step() { if (this.over || this.move(0,1)) return false; this.lock(); return true }
  drop() { if (this.over) return; while (this.move(0,1)) this.score++; this.lock() }
  ghostY() { const copy = { ...this.piece }; while (this.valid({ ...copy, y: copy.y + 1 })) copy.y++; return copy.y }
  private lock() {
    for (const [x,y] of this.piece.cells) this.board[y + this.piece.y][x + this.piece.x] = this.piece.color
    const remaining = this.board.filter(row => row.some(cell => cell === 0))
    const cleared = config.rows - remaining.length
    this.board = [...Array.from({ length: cleared }, () => Array(config.columns).fill(0)), ...remaining]
    this.lines += cleared; this.score += [0,100,250,450,700][cleared] ?? cleared * 200
    this.spawn()
  }
}
`,
    'src/game.ts': `
import { config } from './config'
import { Puzzle } from './model'
import type { GameUI } from './ui'
import type { GameInput } from './input'
import { frameLoop } from './lifecycle'
import type { GameController } from './contracts'
export function createGame(ui: GameUI, input: GameInput): GameController {
  const canvas = document.createElement('canvas'); canvas.tabIndex = 0; canvas.setAttribute('aria-label', 'Tabuleiro de encaixe. Use as setas e espaço.'); ui.stage.append(canvas)
  const context = canvas.getContext('2d')!
  const game = new Puzzle()
  const width = 720, height = 540, size = 28, left = (width - config.columns * size) / 2, top = 32
  let fall = 0, repeat = 0, previousDirection = 0
  let invalidate = () => {}
  const resize = () => { const dpr = Math.min(ui.reducedQuality ? 1 : 1.5, devicePixelRatio || 1); canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0); invalidate() }
  const stopQuality = ui.onQuality(resize)
  const observer = new ResizeObserver(resize); observer.observe(ui.stage); resize()
  function reset() { game.reset(); fall = 0; repeat = 0; input.clear() }
  ui.onReset(reset)
  const unsubscribe = ui.onPhase(() => { input.clear(); fall = 0; repeat = 0; invalidate() })
  function cell(x: number, y: number, color: string, outline = false) {
    context.fillStyle = color; context.strokeStyle = color; context.lineWidth = 2
    if (outline) context.strokeRect(left + x*size+3, top + y*size+3, size-6, size-6)
    else { context.fillRect(left + x*size+1, top + y*size+1, size-2, size-2); context.fillStyle = '#102c3a'; context.fillRect(left + x*size+10, top + y*size+10, 7, 7) }
  }
  const loop = frameLoop(dt => {
    input.poll()
    if (ui.phase === 'playing') {
      const direction = Number(input.down('right')) - Number(input.down('left'))
      repeat -= dt
      if (direction && (repeat <= 0 || direction !== previousDirection)) { game.move(direction, 0); repeat = direction !== previousDirection ? .18 : .09 }
      previousDirection = direction
      if (input.take('up')) game.rotate()
      if (input.take('action')) { game.drop(); fall = 0; ui.tone() }
      fall += dt
      const interval = input.down('down') ? .05 : Math.max(.15, config.fallSeconds - game.lines * .03)
      if (fall >= interval) { fall = 0; if (game.step()) ui.tone(440) }
      if (game.lines >= config.goalLines) ui.finish(true, 'Você completou o desafio de linhas!', game.score)
      else if (game.over) ui.finish(false, 'O tabuleiro encheu. Tente uma nova estratégia!', game.score)
    }
    context.fillStyle = '#162c3a'; context.fillRect(0,0,width,height)
    for (let y = 0; y < config.rows; y++) for (let x = 0; x < config.columns; x++) cell(x,y,game.board[y][x] ? config.colors[game.board[y][x]-1] : '#284452')
    if (!game.over) {
      const ghost = game.ghostY()
      for (const [x,y] of game.piece.cells) cell(x+game.piece.x,y+ghost,'#b6d5da',true)
      for (const [x,y] of game.piece.cells) cell(x+game.piece.x,y+game.piece.y,config.colors[game.piece.color-1])
    }
    context.fillStyle = '#effaf6'; context.font = '18px system-ui'; context.textAlign = 'center'; context.fillText('Complete ' + config.goalLines + ' linhas',width/2,height-24)
    ui.hud('Pontos: ' + game.score + ' · Linhas: ' + game.lines + '/' + config.goalLines)
  }, () => ui.phase === 'playing')
  invalidate = loop.request
  return {
    inspect: () => ({ engine: 'canvas', phase: ui.phase, score: game.score, goal: config.goalLines, board: game.board.map(row => [...row]), piece: { x: game.piece.x, y: game.piece.y, cells: game.piece.cells.map(([x,y]) => [x,y]) } }),
    dispose() { loop.dispose(); unsubscribe(); stopQuality(); observer.disconnect(); canvas.remove() },
  }
}
`,
    'src/main.ts': `import { createProgress } from './progress'\nimport { createUI } from './ui'\nimport { createInput } from './input'\nimport { createGame } from './game'\nimport { manageLifetime, exposeGameInspection } from './lifecycle'\nconst ui = createUI('Encaixe de cores', '← → movem a peça; ↑ gira; ↓ acelera; Espaço ou Ação encaixa. Esc pausa. Formas e contornos ajudam a distinguir as peças.')\nconst input = createInput(ui.controls, () => ui.phase === 'playing', { left: '← Esquerda', right: 'Direita →', up: 'Girar', down: 'Acelerar', action: 'Encaixar' })\nconst stopProgress = createProgress(ui, 'canvas-puzzle')\nconst game = createGame(ui, input)\nconst stopInspection = exposeGameInspection(game); manageLifetime(() => { stopInspection(); game.dispose(); stopProgress(); input.destroy(); ui.destroy() })\n`,
  }
}
