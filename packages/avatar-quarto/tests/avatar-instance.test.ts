import { expect, test } from 'bun:test'
import {
  Bone,
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Skeleton,
  SkinnedMesh,
} from 'three'
import { copiarEsqueletoDoAvatar, prepararPecasDoAvatar } from '../src/avatar/instance'

function modelo() {
  const cena = new Group(),
    raiz = new Bone(),
    filho = new Bone()
  raiz.add(filho)
  cena.add(raiz)
  const skeleton = new Skeleton([raiz, filho])
  const geometry = new BoxGeometry(),
    material = new MeshStandardMaterial({ color: 'red' })
  const m = new SkinnedMesh(geometry, material)
  m.bind(skeleton)
  cena.add(m)
  return { cena, raiz, skeleton, geometry, material }
}

test('duas montagens do mesmo cache têm ossos e texturas próprios; reparentar não rouba o outro avatar', () => {
  const origem = modelo(),
    a = copiarEsqueletoDoAvatar(origem.cena),
    b = copiarEsqueletoDoAvatar(origem.cena)
  expect(a.skeleton).not.toBe(origem.skeleton)
  expect(a.skeleton).not.toBe(b.skeleton)
  expect(a.raiz).not.toBe(b.raiz)
  const paiA = new Group(),
    paiB = new Group()
  if (!a.raiz || !b.raiz || !a.skeleton || !b.skeleton) throw new Error('Sem esqueleto')
  paiA.add(a.raiz)
  paiB.add(b.raiz)
  a.raiz.position.x = 7
  expect(b.raiz.parent).toBe(paiB)
  expect(a.raiz.parent).toBe(paiA)
  expect(b.raiz.position.x).toBe(0)
  expect(origem.raiz.parent).toBe(origem.cena)
  a.skeleton.computeBoneTexture()
  b.skeleton.computeBoneTexture()
  origem.skeleton.computeBoneTexture()
  a.soltar()
  expect(a.skeleton.boneTexture).toBeNull()
  expect(b.skeleton.boneTexture).not.toBeNull()
  expect(origem.skeleton.boneTexture).not.toBeNull()
  b.soltar()
  origem.skeleton.dispose()
  origem.geometry.dispose()
  origem.material.dispose()
})

test('cores, morphs e material do fantasma não alteram a peça em cache nem outra montagem', () => {
  const cena = new Group(),
    geometry = new BoxGeometry(),
    material = new MeshStandardMaterial({ color: 'red' })
  material.name = 'Color_camisa'
  const m = new Mesh(geometry, material)
  m.morphTargetInfluences = [0]
  cena.add(m)
  const skin = new MeshStandardMaterial(),
    fantasma = new MeshBasicMaterial({ color: 'cyan', transparent: true, opacity: 0.35 })
  const a = prepararPecasDoAvatar(cena, skin),
    b = prepararPecasDoAvatar(cena, skin),
    g = prepararPecasDoAvatar(cena, skin, fantasma)
  a.pintar('blue')
  expect(material.color.getHexString()).toBe('ff0000')
  expect(a.pecas[0]?.material).not.toBe(b.pecas[0]?.material)
  expect(g.pecas[0]?.material).toBe(fantasma)
  expect(a.pecas[0]?.geometry).toBe(geometry)
  expect(a.pecas[0]?.morphTargetInfluences).not.toBe(b.pecas[0]?.morphTargetInfluences)
  let descartesOriginais = 0,
    descartesFantasma = 0
  material.addEventListener('dispose', () => descartesOriginais++)
  fantasma.addEventListener('dispose', () => descartesFantasma++)
  a.soltar()
  b.soltar()
  g.soltar()
  expect(descartesOriginais).toBe(0)
  expect(descartesFantasma).toBe(0)
  geometry.dispose()
  material.dispose()
  skin.dispose()
  fantasma.dispose()
})
