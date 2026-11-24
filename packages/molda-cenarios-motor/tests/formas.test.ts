import { expect, test } from 'bun:test'
import { Raycaster, Vector3 } from 'three'
import { chaveDaForma, criarModeloDaForma } from '../src/formas'

test('colisão de rampa e escada usa a mesma malha desenhada, com altura local correta', () => {
  for (const tipo of ['rampa', 'escada'] as const) {
    const base = {
      id: tipo,
      nome: tipo,
      largura: 4,
      altura: 3,
      comprimento: 6,
    }
    const m = criarModeloDaForma(
      tipo === 'escada' ? { ...base, tipo, degraus: 6 } : { ...base, tipo },
    )
    m.raiz.updateMatrixWorld(true)
    for (const [z, y] of [
      [-2.5, tipo === 'rampa' ? 0.25 : 0.5],
      [0.25, tipo === 'rampa' ? 1.625 : 2],
      [2.5, tipo === 'rampa' ? 2.75 : 3],
    ]) {
      const hit = new Raycaster(new Vector3(0, 10, z!), new Vector3(0, -1, 0)).intersectObject(
        m.raiz,
        true,
      )[0]
      expect(hit?.point.y).toBeCloseTo(y!, 6)
      expect(hit!.face!.normal.y).toBeGreaterThan(0.5)
    }
    expect(m.caixa.min.y).toBe(0)
    let geometrias = 0,
      materiais = 0
    m.partes[0]!.geometria.addEventListener('dispose', () => geometrias++)
    m.partes[0]!.material.addEventListener('dispose', () => materiais++)
    m.descartar()
    m.descartar()
    expect(geometrias).toBe(1)
    expect(materiais).toBe(1)
  }
})

test('definições iguais compartilham a chave geométrica sem misturar parâmetros diferentes', () => {
  const f = {
    id: 'a',
    nome: 'Caixa',
    tipo: 'caixa',
    largura: 2,
    altura: 1,
    comprimento: 3,
  } as const
  expect(chaveDaForma(f)).toBe(chaveDaForma({ ...f, id: 'b', nome: 'Outra' }))
  expect(chaveDaForma(f)).not.toBe(chaveDaForma({ ...f, altura: 2 }))
})
