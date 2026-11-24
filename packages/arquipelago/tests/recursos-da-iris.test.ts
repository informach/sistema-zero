import { expect, test } from 'bun:test'
import { AnimationClip, AnimationMixer, Group } from 'three'
import { recursosDaIris } from '../src/mundo/faisca/recursos-da-iris'

test('Íris compilada aproveita raiz, UUIDs e mixer; somente o proprietário descarta a instância', () => {
  const raiz = new Group(),
    mixer = new AnimationMixer(raiz),
    animacoes = [new AnimationClip('andar', 1, []), new AnimationClip('parado', 1, [])]
  let descartes = 0
  const ator = { raiz, mixer, animacoes, animavel: true, descartar: () => descartes++ },
    iris = recursosDaIris(ator)
  expect(iris.cena).toBe(raiz)
  expect(iris.mixer).toBe(mixer)
  iris.mixer.update(0.1)
  expect(mixer.time).toBeCloseTo(0.1)
  iris.descartar()
  iris.descartar()
  expect(descartes).toBe(0)
  expect(iris.andar.isRunning()).toBe(false)
  expect(iris.parado.isRunning()).toBe(false)
  ator.descartar()
  expect(descartes).toBe(1)
})

test('Íris do piloto continua clonando a fonte e recusa clipes incompletos', () => {
  const cena = new Group(),
    animacoes = [new AnimationClip('andar', 1, []), new AnimationClip('parado', 1, [])],
    iris = recursosDaIris({ cena, animacoes })
  expect(iris.cena).not.toBe(cena)
  iris.descartar()
  expect(cena.children).toHaveLength(0)
  expect(() => recursosDaIris({ cena, animacoes: animacoes.slice(0, 1) })).toThrow(/andar e parado/)
})
