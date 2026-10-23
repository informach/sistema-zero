import { afterAll, expect, test } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { canvasSources } from '../../studio/src/components/code/pro-templates/games/canvas'

const root = await mkdtemp(join(tmpdir(), 'studio-puzzle-model-'))
const files = canvasSources()
await writeFile(join(root, 'config.ts'), files['src/config.ts']!)
await writeFile(join(root, 'model.ts'), files['src/model.ts']!)
interface PuzzleModel {
  board: number[][]
  piece: { cells: Array<[number, number]>; x: number; y: number; color: number }
  lines: number
  score: number
  over: boolean
  reset(): void
  valid(piece: PuzzleModel['piece']): boolean
  move(dx: number, dy: number): boolean
  rotate(): void
  drop(): void
  step(): boolean
  ghostY(): number
}
const { Puzzle } = (await import(pathToFileURL(join(root, 'model.ts')).href)) as {
  Puzzle: new (random?: () => number) => PuzzleModel
}
afterAll(async () => {
  await rm(root, { recursive: true, force: true })
})

test('simultaneous rows disappear atomically, retain board height, and score once', () => {
  const game = new Puzzle(() => 0.5)
  for (const y of [14, 15]) game.board[y] = [0, 0, 1, 1, 1, 1, 1, 1, 1, 1]
  game.piece = {
    cells: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
    x: 0,
    y: 0,
    color: 2,
  }
  expect(game.ghostY()).toBe(14)
  game.drop()
  expect(game.lines).toBe(2)
  expect(game.score).toBe(264)
  expect(game.board).toHaveLength(16)
  expect(game.board.every((row) => row.length === 10 && row.every((cell) => cell === 0))).toBe(true)
})

test('rotation at the wall preserves a valid piece; blocked movement leaves it unchanged', () => {
  const game = new Puzzle(() => 0.5)
  game.piece = {
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ],
    x: 9,
    y: 0,
    color: 2,
  }
  const before = JSON.stringify(game.piece)
  expect(game.move(1, 0)).toBe(false)
  expect(JSON.stringify(game.piece)).toBe(before)
  game.rotate()
  expect(game.valid(game.piece)).toBe(true)
  expect(game.piece.cells).toHaveLength(4)
})

test('game over prevents subsequent mutations and twenty resets keep bounded state', () => {
  const game = new Puzzle(() => 0.5)
  for (let i = 0; i < 100 && !game.over; i++) game.drop()
  expect(game.over).toBe(true)
  const ended = JSON.stringify({ board: game.board, score: game.score, piece: game.piece })
  game.move(1, 0)
  game.rotate()
  game.drop()
  game.step()
  expect(JSON.stringify({ board: game.board, score: game.score, piece: game.piece })).toBe(ended)
  for (let i = 0; i < 20; i++) {
    game.reset()
    expect(game.over).toBe(false)
    expect(game.score).toBe(0)
    expect(game.lines).toBe(0)
    expect(game.valid(game.piece)).toBe(true)
    expect(game.board.flat().length).toBe(160)
    game.drop()
  }
})
