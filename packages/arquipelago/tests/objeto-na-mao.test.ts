import { describe, expect, test } from 'bun:test'
import { AVATAR_CATALOG } from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import { AnimationClip, QuaternionKeyframeTrack } from 'three'
import {
  BARRA_NAS_MAOS,
  camadaDosDedos,
  camadasDoBraco,
  camadasDosDedos,
  equipamentoDaMao,
  LANTERNA_NA_MAO,
  objetoNaMao,
  poseDaCamada,
  SEM_OBJETO_NA_MAO,
} from '../src/personagem/objeto-na-mao'

describe('a lanterna do pack na mão', () => {
  test('a lanterna é um objeto de mão do catálogo, no encaixe da mão direita', () => {
    expect(SEM_OBJETO_NA_MAO).toEqual([])
    for (const id of LANTERNA_NA_MAO) {
      const item = AVATAR_CATALOG.equipment?.[id]
      expect(item, id).toBeDefined()
      expect(item?.socket).toBe('mao_direita')
    }
  })

  test('os dedos fecham no cabo por uma camada só dos dedos da mão direita, sem animação junto', () => {
    const camada = camadaDosDedos('mao_lanterna')
    if (!camada) throw new Error('sem a camada dos dedos')
    expect(camada.with).toBeUndefined()
    expect(camada.bones.length).toBeGreaterThan(4)
    for (const osso of camada.bones) {
      expect(osso.startsWith('RightHand'), osso).toBe(true)
      expect(AVATAR_CATALOG.base.skeleton.bones[osso], osso).toBeDefined()
    }
    expect(camadaDosDedos('nao-existe')).toBeUndefined()
  })

  test('a barra do planador fecha as duas mãos; a lanterna, só a direita', () => {
    for (const id of BARRA_NAS_MAOS) expect(AVATAR_CATALOG.equipment?.[id], id).toBeDefined()
    const maos = (objeto: string) =>
      camadasDosDedos(objeto).flatMap((c) => c.bones.map((o) => o.replace(/Hand.*/, '')))
    expect(new Set(maos('mao_barra_planador'))).toEqual(new Set(['Right', 'Left']))
    expect(new Set(maos('mao_lanterna'))).toEqual(new Set(['Right']))
    expect(camadasDosDedos('nao-existe')).toEqual([])
  })

  test('o balde e o regador (sem pegada própria) fecham a mão direita no cilindro fino', () => {
    for (const id of ['mao_balde', 'mao_regador', 'mao_varinha_luz']) {
      expect(AVATAR_CATALOG.equipment?.[id], id).toBeDefined()
      const ossos = camadasDosDedos(id).flatMap((c) => c.bones)
      expect(ossos.length, id).toBeGreaterThan(4)
      expect(
        ossos.every((o) => o.startsWith('RightHand')),
        id,
      ).toBe(true)
    }
  })

  test('um objeto por vez: a barra no planador, o do gesto, e a lanterna acesa', () => {
    expect(objetoNaMao({ planando: true, doGesto: 'mao_regador', comLanterna: true })).toBe(
      'mao_barra_planador',
    )
    expect(objetoNaMao({ planando: false, doGesto: 'mao_balde', comLanterna: true })).toBe(
      'mao_balde',
    )
    expect(objetoNaMao({ planando: false, doGesto: null, comLanterna: true })).toBe('mao_lanterna')
    expect(objetoNaMao({ planando: false, doGesto: null, comLanterna: false })).toBeNull()
    expect(equipamentoDaMao(null)).toBe(SEM_OBJETO_NA_MAO)
    expect(equipamentoDaMao('mao_lanterna')).toBe(LANTERNA_NA_MAO)
    expect(equipamentoDaMao('mao_barra_planador')).toBe(BARRA_NAS_MAOS)
    expect(equipamentoDaMao('mao_regador')).toEqual(['mao_regador'])
  })

  test('o braço afastado (as camadas largas) acompanha o balde', () => {
    const clipes = new Set(camadasDoBraco('mao_balde').map((c) => c.clipe))
    for (const c of ['parado_relaxado', 'andar_frente', 'correr_frente'])
      expect(clipes.has(c)).toBe(true)
  })

  test('a pose da camada é o primeiro quadro do clipe dela, só nos ossos listados', () => {
    const clipe = new AnimationClip('dedos', 1, [
      new QuaternionKeyframeTrack(
        'RightHandIndex1.quaternion',
        [0, 1],
        [0, 0, 0.5, 0.5, 0, 0, 0, 1],
      ),
      new QuaternionKeyframeTrack('Head.quaternion', [0, 1], [1, 0, 0, 0, 1, 0, 0, 0]),
    ])
    const pose = poseDaCamada([clipe], {
      id: 'dedos',
      bones: ['RightHandIndex1', 'RightHandIndex2'],
    })
    expect([...pose.keys()]).toEqual(['RightHandIndex1'])
    expect(pose.get('RightHandIndex1')?.toArray()).toEqual([0, 0, 0.5, 0.5])
    // Sem o clipe no arquivo, nenhuma pose (os dedos ficam como a animação deixa).
    expect(poseDaCamada([], { id: 'dedos', bones: ['RightHandIndex1'] }).size).toBe(0)
  })
})
