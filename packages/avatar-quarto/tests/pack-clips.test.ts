import { describe, expect, test } from 'bun:test'
import {
  AnimationClip,
  Quaternion,
  QuaternionKeyframeTrack,
  Vector3,
  VectorKeyframeTrack,
} from 'three'
import { alturaNoComeco, instanteDaFoto, semDeslocamento } from '../src/avatar/pack-clips'

/** Um passo montado à mão: o `Hips` anda 0,5 para a frente (+Z) e balança no Y. */
function passo(): AnimationClip {
  const tempos = [0, 0.25, 0.5, 0.75, 1]
  const posicoes = [0, 0.3, 0, 0.02, 0.32, 0.125, 0, 0.3, 0.25, -0.02, 0.32, 0.375, 0, 0.3, 0.5]
  return new AnimationClip('andar', 1, [
    new VectorKeyframeTrack('Hips.position', tempos, posicoes),
    new QuaternionKeyframeTrack('Hips.quaternion', [0, 1], [0, 0, 0, 1, 0, 0.1, 0, 0.995]),
  ])
}

const posicao = (c: AnimationClip) => {
  const t = c.tracks.find((k) => k.name === 'Hips.position')
  if (!t) throw new Error('sem trilha')
  return Array.from(t.values)
}

describe('semDeslocamento', () => {
  test('tira o andar para frente e deixa o balanço do passo', () => {
    const original = passo()
    const pronto = semDeslocamento(original, 'jogo/andar')
    const v = posicao(pronto)
    // O primeiro e o último quadro no mesmo lugar: o laço não anda.
    expect(v[12]).toBeCloseTo(v[0] ?? 0, 6)
    expect(v[14]).toBeCloseTo(v[2] ?? 0, 6)
    // O balanço de lado e o sobe e desce do passo ficam.
    expect(v[3]).toBeCloseTo(0.02, 6)
    expect(v[9]).toBeCloseTo(-0.02, 6)
    expect(v[4]).toBeCloseTo(0.32, 6)
    // A cópia tem o nome novo; o clipe do pack não muda.
    expect(pronto.name).toBe('jogo/andar')
    expect(posicao(original)[14]).toBeCloseTo(0.5, 6)
    // As outras trilhas vão junto, sem mudança.
    expect(pronto.tracks).toHaveLength(2)
  })

  test('subir escada: a subida contínua sai, o balanço de cada degrau fica', () => {
    const subir = new AnimationClip('subir', 1, [
      new VectorKeyframeTrack('Hips.position', [0, 0.5, 1], [0, 0.3, 0, 0, 0.6, 0, 0, 0.8, 0]),
    ])
    const v = posicao(semDeslocamento(subir, 'jogo/subir', { vertical: 'tendencia' }))
    expect(v[7]).toBeCloseTo(0.3, 6)
    // No meio, 0,6 menos a metade da subida de 0,5: o degrau a mais que o passo dá.
    expect(v[4]).toBeCloseTo(0.35, 6)
  })

  test('o pulo: o Hips não passa da altura de quem está em pé, mas o agachar fica', () => {
    const pulo = new AnimationClip('pulo', 1, [
      new VectorKeyframeTrack('Hips.position', [0, 0.5, 1], [0, 0.3, 0, 0, 0.15, 0, 0, 1.26, 0]),
    ])
    const v = posicao(semDeslocamento(pulo, 'jogo/pulo', { vertical: { teto: 0.3 } }))
    expect(v[1]).toBeCloseTo(0.3, 6)
    expect(v[4]).toBeCloseTo(0.15, 6)
    expect(v[7]).toBeCloseTo(0.3, 6)
  })

  test('sem a trilha do osso, só a cópia com outro nome', () => {
    const solto = new AnimationClip('x', 1, [
      new VectorKeyframeTrack('Root.position', [0, 1], [0, 0, 0, 1, 0, 0]),
    ])
    const pronto = semDeslocamento(solto, 'jogo/x')
    expect(pronto.name).toBe('jogo/x')
    expect(Array.from(pronto.tracks[0]?.values ?? [])).toEqual([0, 0, 0, 1, 0, 0])
    expect(alturaNoComeco(solto)).toBeNull()
    expect(alturaNoComeco(passo())).toBeCloseTo(0.3, 6)
  })
})

describe('instanteDaFoto', () => {
  const giro = (graus: number) =>
    new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), (graus * Math.PI) / 180).toArray()

  test('o chute: a perna sobe até 90° e volta; a foto é na perna lá em cima', () => {
    const tempos = [0, 0.3, 0.6, 1.2]
    const chute = new AnimationClip('chute', 1.2, [
      new QuaternionKeyframeTrack('LeftUpLeg.quaternion', tempos, [
        ...giro(0),
        ...giro(40),
        ...giro(90),
        ...giro(0),
      ]),
      // Um osso que quase não mexe não muda o auge.
      new QuaternionKeyframeTrack('Spine.quaternion', [0, 1.2], [...giro(0), ...giro(5)]),
    ])
    expect(instanteDaFoto(chute)).toBeCloseTo(0.6, 1)
  })

  test('sem giro nenhum, a foto é no fim do clipe', () => {
    const parado = new AnimationClip('x', 2, [
      new VectorKeyframeTrack('Hips.position', [0, 2], [0, 0.3, 0, 0, 0.3, 0]),
    ])
    expect(instanteDaFoto(parado)).toBe(2)
  })
})
