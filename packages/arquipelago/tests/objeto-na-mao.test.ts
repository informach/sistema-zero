import { describe, expect, test } from 'bun:test'
import { AVATAR_CATALOG } from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import { AnimationClip, QuaternionKeyframeTrack } from 'three'
import {
  camadaDosDedos,
  LANTERNA_NA_MAO,
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

  test('a pose da camada é o primeiro quadro do clipe dela, só nos ossos listados', () => {
    const clipe = new AnimationClip('dedos', 1, [
      new QuaternionKeyframeTrack('RightHandIndex1.quaternion', [0, 1], [0, 0, 0.5, 0.5, 0, 0, 0, 1]),
      new QuaternionKeyframeTrack('Head.quaternion', [0, 1], [1, 0, 0, 0, 1, 0, 0, 0]),
    ])
    const pose = poseDaCamada([clipe], { id: 'dedos', bones: ['RightHandIndex1', 'RightHandIndex2'] })
    expect([...pose.keys()]).toEqual(['RightHandIndex1'])
    expect(pose.get('RightHandIndex1')?.toArray()).toEqual([0, 0, 0.5, 0.5])
    // Sem o clipe no arquivo, nenhuma pose (os dedos ficam como a animação deixa).
    expect(poseDaCamada([], { id: 'dedos', bones: ['RightHandIndex1'] }).size).toBe(0)
  })
})
