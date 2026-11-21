import { expect, test } from 'bun:test'
import { Matrix4, Vector3 } from 'three'
import { prepararFisicaNativa, transformacaoNativa } from '../src/sistemas/fisica-nativa-do-cenario'

test('tronco conserva raio nativo sem colisor de copa e fundação acompanha a matriz já assentada', () => {
  const matriz = new Matrix4()
      .makeRotationY(Math.PI / 2)
      .scale(new Vector3(2, 3, 2))
      .setPosition(20, 4, 139).elements,
    f = prepararFisicaNativa({
      fisicas: [
        {
          entidade: 'arvore',
          matriz,
          tipo: 'tronco',
          raioDoTronco: 0.3,
          enterrada: 0.8,
          fundacao: { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 0, z: 1 } },
        },
      ],
    })
  expect(f.externos.has('arvore')).toBe(true)
  expect(f.troncos[0]).toMatchObject({ raio: 0.6, meiaAltura: 2.7, posicao: [20, 4, 139] })
  expect(f.fundacoes[0]).toMatchObject({ centro: [20, 2.5, 139], metade: [2, 1.5, 2] })
  expect(f.troncos[0]!.giro).toBeCloseTo(Math.PI / 2)
})

test('transformação inválida não é aproximada para fazer caber o papel nativo', () => {
  expect(() => transformacaoNativa(new Matrix4().makeRotationX(0.2).elements)).toThrow(/matriz/)
  expect(() => transformacaoNativa(new Matrix4().makeScale(-1, 1, 1).elements)).toThrow(/matriz/)
  const shear = new Matrix4().elements
  shear[4] = 0.4
  expect(() => transformacaoNativa(shear)).toThrow(/matriz/)
})
