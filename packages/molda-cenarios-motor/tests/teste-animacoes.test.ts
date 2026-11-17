import { expect, test } from 'bun:test'
import {
  AnimationClip,
  Bone,
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  VectorKeyframeTrack,
} from 'three'
import { animacoesNoLugar } from '../src/teste/animacoes'

test('animação transporta articulações, mas o corpo não caminha para fora da cápsula', () => {
  const raiz = new Group(),
    corpo = new Group(),
    braco = new Bone(),
    mesh = new Mesh(new BoxGeometry(), new MeshBasicMaterial())
  corpo.name = 'Corpo'
  braco.name = 'Braco'
  corpo.add(braco, mesh)
  raiz.add(corpo)
  const posicao = new VectorKeyframeTrack('Corpo.position', [0, 1], [0, 1, 0, 4, 2, 6]),
    articulacao = new VectorKeyframeTrack('Braco.position', [0, 1], [0, 0, 0, 1, 1, 1])
  const clipe = new AnimationClip('Caminhar', 1, [posicao, articulacao])
  const [normal] = animacoesNoLugar(raiz, [clipe])
  expect(Array.from(normal!.tracks[0]!.values)).toEqual([0, 1, 0, 0, 2, 0])
  expect(Array.from(normal!.tracks[1]!.values)).toEqual([0, 0, 0, 1, 1, 1])
  const [noAr] = animacoesNoLugar(raiz, [clipe], 'Caminhar')
  expect(Array.from(noAr!.tracks[0]!.values)).toEqual([0, 0, 0, 0, 0, 0])
  expect(Array.from(posicao.values)).toEqual([0, 1, 0, 4, 2, 6])
  mesh.geometry.dispose()
  mesh.material.dispose()
})
