import { expect, test } from 'bun:test'
import { AVATAR_CATALOG } from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import {
  ciclosPorSegundo,
  criarLocomocao,
  criarPoseDosClipes,
  passoDaLocomocao,
  poseDosClipes,
} from '../src/sistemas/locomocao'
import { MORADA_NATIVE } from '../src/sistemas/morada'

const measures = { escala: 1, andar: MORADA_NATIVE.walk, correr: MORADA_NATIVE.run }
const input = (velocidade: number) => ({
  velocidade,
  noChao: true,
  velY: 0,
  nadando: false,
  especial: null,
})

test('casa reproduz andar e correr no ritmo original do pack na escala nativa', () => {
  for (const [id, speed] of [
    ['andar_frente', measures.andar],
    ['correr_frente', measures.correr],
  ] as const) {
    const clip = AVATAR_CATALOG.base.skeleton.game.clips.find((clip) => clip.id === id)!
    expect(speed * clip.duration).toBeCloseTo(clip.stride, 8)
    expect(ciclosPorSegundo(speed, measures) * clip.duration).toBeCloseTo(1, 8)
  }
})

test('parar e retomar misturam poses, conservam fase e não mantêm passada com deslocamento zero', () => {
  const state = criarLocomocao()
  const pose = criarPoseDosClipes()
  const step = (speed: number) => passoDaLocomocao(state, input(speed), 1 / 60, measures)
  step(measures.andar)
  let current = poseDosClipes(state, pose)
  expect(current.andar_frente.peso).toBeGreaterThan(0)
  expect(current.andar_frente.peso).toBeLessThan(1)
  expect(current.parado_relaxado.peso).toBeGreaterThan(0)
  for (let i = 0; i < 60; i++) step(measures.andar)
  const phase = state.fase
  step(measures.correr)
  current = poseDosClipes(state, pose)
  expect(current.andar_frente.peso).toBeGreaterThan(0)
  expect(current.correr_frente.peso).toBeGreaterThan(0)
  expect(state.tempos.Andar).toBe(state.tempos.Correr)
  expect(state.fase).not.toBe(phase)
  for (let i = 0; i < 30; i++) step(0)
  const stoppedPhase = state.fase
  for (let i = 0; i < 30; i++) step(0)
  current = poseDosClipes(state, pose)
  expect(state.fase).toBe(stoppedPhase)
  expect(current.parado_relaxado.peso).toBeCloseTo(1)
  expect(current.andar_frente.peso + current.correr_frente.peso).toBe(0)
})

test('frear da mistura andar/correr nunca introduz a pose rígida do esqueleto', () => {
  for (const fps of [30, 60, 120]) {
    const state = criarLocomocao()
    const pose = criarPoseDosClipes()
    const dt = 1 / fps
    const medium = (measures.andar + measures.correr) / 2
    for (const speed of [medium, 0, medium, measures.correr, 0]) {
      for (let frame = 0; frame < fps / 2; frame++) {
        passoDaLocomocao(state, input(speed), dt, measures)
        const current = poseDosClipes(state, pose)
        expect(Object.values(current).reduce((sum, clip) => sum + clip.peso, 0)).toBeCloseTo(1, 10)
      }
    }
  }
})
