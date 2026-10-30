import { expect, test } from 'bun:test'
import { DURACAO_MAXIMA_DO_FANTASMA_MS, FantasmaSchema } from '@sistemazero/arquipelago-contracts'
import { amostrarFantasma, criarGravadorDeFantasma } from '../src/sistemas/fantasma'

function gravar(fps: number, pausar: boolean) {
  const g = criarGravadorDeFantasma()
  g.comecar(0, 2, 0, (Math.PI * 179) / 180)
  for (let i = 1; i <= fps; i++) {
    const t = (i * 1000) / fps
    const angulo = (Math.PI * (179 + (2 * i) / fps)) / 180
    g.quadro(t, t / 100, 2, 0, angulo)
    if (pausar) for (let j = 0; j < 3; j++) g.quadro(t, 999, 999, 999, 0)
  }
  return g.terminar('bosque-copas', 1000, 10, 2, 0, (Math.PI * -179) / 180)
}

test('trajeto linear a 30 e 60 FPS usa o mesmo relógio ativo; pausa não altera as poses', () => {
  const a = gravar(30, false),
    b = gravar(60, false),
    c = gravar(60, true)
  expect(a).not.toBeNull()
  expect(FantasmaSchema.safeParse(a).success).toBe(true)
  expect(a).toEqual(b)
  expect(c).toEqual(b)
  expect(a!.amostras).toHaveLength(11)
})

test('reprodução interpola posição e giro pelo caminho curto, com bordas e último trecho parcial', () => {
  const g = criarGravadorDeFantasma()
  g.comecar(0, 0, 0, (Math.PI * 179) / 180)
  const f = g.terminar('pico-cume', 250, 5, 1, -2, (Math.PI * -179) / 180)!
  expect(FantasmaSchema.safeParse(f).success).toBe(true)
  const pose = { x: 0, y: 0, z: 0, giro: 0 }
  amostrarFantasma(f, 125, pose)
  expect(pose.x).toBeCloseTo(2.5, 2)
  expect(pose.y).toBeCloseTo(0.5, 2)
  expect(pose.giro).toBeCloseTo(Math.PI, 3)
  amostrarFantasma(f, 999, pose)
  expect(pose.x).toBe(5)
  expect(pose.z).toBe(-2)
  amostrarFantasma(f, -10, pose)
  expect(pose.x).toBe(0)
})

test('cancelamento, tempo regressivo, dados não finitos e excesso de duração não criam fantasma', () => {
  for (const t of [Number.NaN, Number.POSITIVE_INFINITY, DURACAO_MAXIMA_DO_FANTASMA_MS + 1]) {
    const g = criarGravadorDeFantasma()
    g.comecar(0, 0, 0, 0)
    expect(g.terminar('pico-cume', t, 1, 0, 0, 0)).toBeNull()
  }
  const g = criarGravadorDeFantasma()
  g.comecar(0, 0, 0, 0)
  g.quadro(500, 1, 0, 0, 0)
  expect(g.terminar('pico-cume', 250, 1, 0, 0, 0)).toBeNull()
  g.comecar(0, 0, 0, 0)
  g.cancelar()
  expect(g.terminar('pico-cume', 1000, 1, 0, 0, 0)).toBeNull()
})

test('limite cabe no contrato e reiniciar o buffer não modifica um resultado já entregue', () => {
  const g = criarGravadorDeFantasma()
  g.comecar(0, 0, 0, 0)
  const a = g.terminar('nuvens-balao', DURACAO_MAXIMA_DO_FANTASMA_MS, 50, 25, 10, 0)!
  expect(FantasmaSchema.safeParse(a).success).toBe(true)
  expect(a.amostras).toHaveLength(3001)
  const antes = JSON.stringify(a)
  g.comecar(20, 0, 0, 0)
  expect(g.terminar('pico-cume', 100, 21, 0, 0, 0)).not.toBeNull()
  expect(JSON.stringify(a)).toBe(antes)
})
