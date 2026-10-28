import { expect, test } from 'bun:test'
import { criarPonte, PONTE_VIVA, passoDaPonte, pesoNaPonte } from '../src/sistemas/pontes-vivas'

test('peso afunda, pontas ficam presas e a ponte volta sem lançar o corpo', () => {
  const p = criarPonte()
  for (let i = 0; i < 600; i++) {
    passoDaPonte(p, 1, 1, 1 / 60)
    expect(p.y).toBeGreaterThanOrEqual(-PONTE_VIVA.afundar)
    expect(Math.abs(p.vy)).toBeLessThanOrEqual(PONTE_VIVA.velocidade)
  }
  expect(p.y).toBeCloseTo(-0.1, 4)
  expect(pesoNaPonte(0)).toBe(0)
  expect(pesoNaPonte(1)).toBe(0)
  expect(pesoNaPonte(0.5)).toBe(1)
  for (let i = 0; i < 600; i++) passoDaPonte(p, 0, 0, 1 / 60)
  expect(p.y).toBeCloseTo(0, 5)
  expect(p.lado).toBeCloseTo(0, 5)
})
test('passagens alternadas nunca ultrapassam o guarda-corpo nem o limite vertical', () => {
  const p = criarPonte()
  for (let i = 0; i < 3600; i++) {
    passoDaPonte(p, i % 47 < 30 ? 1 : 0, i % 23 < 10 ? -1 : 1, 1 / 60)
    expect(Math.abs(p.lado)).toBeLessThanOrEqual(PONTE_VIVA.balancar)
    expect(p.y).toBeGreaterThanOrEqual(-PONTE_VIVA.afundar)
  }
})

// O GLB real precisa reconhecer todo piso e corrimão, sem retirar uma caixa do percurso por engano.
test('as três pontes do arquivo têm piso contínuo e desenho associado', async () => {
  const { readFileSync } = await import('node:fs')
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
  const { ilha } = await import('@sistemazero/arquipelago-contracts')
  const { prepararIlha } = await import('../src/mundo/ilha-completa')
  const buf = readFileSync(new URL('../src/assets/ilhas/bosque.glb', import.meta.url))
  const scene = (
    await new GLTFLoader().parseAsync(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      '',
    )
  ).scene
  const bosque = ilha('bosque')
  const p = prepararIlha(scene, bosque)
  expect(p.pontes?.pontes.length).toBe(3)
  const caixas = p.colisores.filter((c) => c.nome.startsWith('col-ponte-'))
  expect(p.pontes?.trechos.length).toBe(caixas.length)
  for (const ponte of p.pontes?.pontes ?? [])
    expect(
      p.pontes?.trechos.filter(
        (t) => t.ponte === ponte && !t.colisor.nome.startsWith('col-ponte-lado-'),
      ).length,
    ).toBeGreaterThanOrEqual(4)
})
