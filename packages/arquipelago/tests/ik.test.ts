import { describe, expect, test } from 'bun:test'
import { Bone, Group, Vector3 } from 'three'
import { apontarOsso, ikDeDoisOssos } from '../src/personagem/ik'

/**
 * Um braço de 0,3 + 0,25 com os ossos crescendo para +x (não o +y do Mixamo), dentro de um grupo
 * girado e com escala: o IK não pode depender do eixo do osso nem da escala do esqueleto.
 */
function braco() {
  const raiz = new Group()
  raiz.rotation.set(0.3, 1.1, -0.2)
  raiz.scale.setScalar(1.85)
  const ombro = new Bone()
  const cotovelo = new Bone()
  const punho = new Bone()
  cotovelo.position.set(0.3 / 1.85, 0, 0)
  punho.position.set(0.25 / 1.85, 0, 0)
  raiz.add(ombro)
  ombro.add(cotovelo)
  cotovelo.add(punho)
  raiz.updateMatrixWorld(true)
  return { raiz, ombro, cotovelo, punho }
}

const noMundo = (o: { getWorldPosition: (v: Vector3) => Vector3 }) =>
  o.getWorldPosition(new Vector3())

describe('IK de dois ossos', () => {
  test('a ponta chega ao alvo dentro do alcance, e os ossos não mudam de tamanho', () => {
    const { ombro, cotovelo, punho } = braco()
    const o = noMundo(ombro)
    const a = o.distanceTo(noMundo(cotovelo))
    const b = noMundo(cotovelo).distanceTo(noMundo(punho))
    const alvo = o.clone().add(new Vector3(0.2, 0.3, 0.1))
    const sobra = ikDeDoisOssos(ombro, cotovelo, punho, alvo, new Vector3(0, -1, 0))
    expect(sobra).toBeLessThan(1e-3)
    expect(noMundo(punho).distanceTo(alvo)).toBeLessThan(1e-3)
    expect(noMundo(ombro).distanceTo(noMundo(cotovelo))).toBeCloseTo(a, 5)
    expect(noMundo(cotovelo).distanceTo(noMundo(punho))).toBeCloseTo(b, 5)
  })

  test('a junta dobra para o lado do polo', () => {
    for (const polo of [new Vector3(0, -1, 0), new Vector3(0, 1, 0)]) {
      const { ombro, cotovelo, punho } = braco()
      const o = noMundo(ombro)
      const alvo = o.clone().add(new Vector3(0.35, 0, 0))
      ikDeDoisOssos(ombro, cotovelo, punho, alvo, polo)
      const meio = o.clone().add(alvo).multiplyScalar(0.5)
      const junta = noMundo(cotovelo).sub(meio)
      expect(junta.dot(polo)).toBeGreaterThan(0.05)
    }
  })

  test('fora do alcance o braço estica reto para o alvo', () => {
    const { ombro, cotovelo, punho } = braco()
    const o = noMundo(ombro)
    const alvo = o.clone().add(new Vector3(0, 2, 0))
    const sobra = ikDeDoisOssos(ombro, cotovelo, punho, alvo, new Vector3(1, 0, 0))
    expect(sobra).toBeGreaterThan(1)
    const p = noMundo(punho)
    // Esticado: ombro, cotovelo e punho em linha, apontando para o alvo.
    const rumo = alvo.clone().sub(o).normalize()
    expect(p.clone().sub(o).normalize().dot(rumo)).toBeGreaterThan(0.999)
    expect(noMundo(cotovelo).sub(o).normalize().dot(rumo)).toBeGreaterThan(0.999)
  })

  test('apontar um osso gira só o caminho até o filho', () => {
    const { ombro, cotovelo } = braco()
    const para = new Vector3(0, 0, 1)
    apontarOsso(ombro, cotovelo, para)
    const caminho = noMundo(cotovelo).sub(noMundo(ombro)).normalize()
    expect(caminho.dot(para)).toBeGreaterThan(0.9999)
  })
})
