import { expect, test } from 'bun:test'
import {
  Bone,
  BoxGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Skeleton,
  SkinnedMesh,
  Texture,
} from 'three'
import {
  copiarEsqueletoDoPack,
  ossosComOsDoObjeto,
  prepararPecaDoPack,
} from '../src/avatar/pack-instance'

/** Um esqueleto de três ossos com nomes, como o GLB de ossos do pack. */
function esqueletoDoPack() {
  const cena = new Group()
  const root = new Bone()
  root.name = 'Root'
  const hips = new Bone()
  hips.name = 'Hips'
  const head = new Bone()
  head.name = 'Head'
  root.add(hips)
  hips.add(head)
  cena.add(root)
  return cena
}

/** Uma peça com a própria cópia dos ossos, numa ORDEM de juntas diferente da do esqueleto. */
function peca(nomes: string[], material = new MeshStandardMaterial()) {
  const cena = new Group()
  const ossos = nomes.map((n) => {
    const b = new Bone()
    b.name = n
    return b
  })
  for (const b of ossos) cena.add(b)
  const inversas = ossos.map((_, i) => new Matrix4().makeTranslation(i, 0, 0))
  const skeleton = new Skeleton(ossos, inversas)
  const m = new SkinnedMesh(new BoxGeometry(), material)
  // Com a matriz de ligação dada, o three guarda as inversas da peça (sem ela, recalcula).
  m.bind(skeleton, new Matrix4())
  cena.add(m)
  return { cena, material }
}

test('a peça prende nos ossos da montagem pelo NOME, na ordem das juntas da peça', () => {
  const montagem = copiarEsqueletoDoPack(esqueletoDoPack())
  const { cena } = peca(['Head', 'Root', 'Hips'])
  const pronta = prepararPecaDoPack(cena, montagem.ossos, new Map())
  expect(pronta.faltando).toEqual([])
  const sk = pronta.pecas[0]?.skeleton
  expect(sk?.bones.map((b) => b.name)).toEqual(['Head', 'Root', 'Hips'])
  expect(sk?.bones[0]).toBe(montagem.ossos.get('Head'))
  expect(sk?.boneInverses[1]?.elements[12]).toBe(1)
  pronta.soltar()
})

test('duas montagens não dividem osso', () => {
  const original = esqueletoDoPack()
  const a = copiarEsqueletoDoPack(original)
  const b = copiarEsqueletoDoPack(original)
  expect(a.ossos.get('Hips')).not.toBe(b.ossos.get('Hips'))
  expect(a.ossos.size).toBe(3)
})

test('peça de outro esqueleto não entra', () => {
  const montagem = copiarEsqueletoDoPack(esqueletoDoPack())
  const { cena } = peca(['mixamorig:Hips', 'Head'])
  const pronta = prepararPecaDoPack(cena, montagem.ossos, new Map())
  expect(pronta.pecas).toEqual([])
  expect(pronta.faltando).toEqual(['mixamorig:Hips'])
})

test('o material ganha a textura compartilhada anotada pela migração, sem mexer no cache', () => {
  const montagem = copiarEsqueletoDoPack(esqueletoDoPack())
  const material = new MeshStandardMaterial()
  material.userData = { avatar: { map: 'abc', emissiveMap: 'abc' } }
  const { cena } = peca(['Root'], material)
  const textura = new Texture()
  const pronta = prepararPecaDoPack(cena, montagem.ossos, new Map([['abc', textura]]))
  const usado = pronta.pecas[0]?.material as MeshStandardMaterial
  expect(usado).not.toBe(material)
  expect(usado.map).toBe(textura)
  expect(usado.emissiveMap).toBe(textura)
  expect(material.map).toBeNull()
  pronta.soltar()
})

test('o material de fora (o fantasma do jogo) vale para todas as malhas', () => {
  const montagem = copiarEsqueletoDoPack(esqueletoDoPack())
  const fantasma = new MeshBasicMaterial()
  const { cena } = peca(['Root'])
  const pronta = prepararPecaDoPack(cena, montagem.ossos, new Map(), fantasma)
  expect(pronta.pecas[0]?.material).toBe(fantasma)
})

test('malha sem pele é apontada, não desenhada', () => {
  const montagem = copiarEsqueletoDoPack(esqueletoDoPack())
  const cena = new Group()
  const solta = new Mesh(new BoxGeometry(), new MeshStandardMaterial())
  solta.name = 'enfeite'
  cena.add(solta)
  const pronta = prepararPecaDoPack(cena, montagem.ossos, new Map())
  expect(pronta.pecas).toEqual([])
  expect(pronta.faltando).toEqual(['(malha sem pele: enfeite)'])
})

test('o objeto de mão traz o osso que só ele tem, embaixo do mesmo pai, e sai sem deixar resto', () => {
  const montagem = copiarEsqueletoDoPack(esqueletoDoPack())
  // O arquivo da lanterna: os ossos do pack mais a `Luz`, filha da cabeça (no pack, da mão).
  const arquivo = esqueletoDoPack()
  const cabeca = arquivo.getObjectByName('Head') as Bone
  const luz = new Bone()
  luz.name = 'Luz'
  luz.position.set(0, 0.2, 0.1)
  cabeca.add(luz)
  const ossos = [cabeca, luz]
  const malha = new SkinnedMesh(new BoxGeometry(), new MeshStandardMaterial())
  malha.bind(new Skeleton(ossos, [new Matrix4(), new Matrix4()]))
  arquivo.add(malha)

  // Sem o osso, a peça é recusada (é a regra das roupas).
  expect(prepararPecaDoPack(arquivo, montagem.ossos, new Map()).faltando).toContain('Luz')

  const comOsDele = ossosComOsDoObjeto(arquivo, montagem.ossos)
  const nova = comOsDele.ossos.get('Luz')
  expect(nova).toBeDefined()
  expect(nova).not.toBe(luz)
  expect(nova?.parent).toBe(montagem.ossos.get('Head'))
  expect(nova?.position.toArray()).toEqual([0, 0.2, 0.1])
  // Os ossos do pack continuam os da montagem, e o mapa dela não mudou.
  expect(comOsDele.ossos.get('Hips')).toBe(montagem.ossos.get('Hips'))
  expect(montagem.ossos.has('Luz')).toBe(false)
  const presa = prepararPecaDoPack(arquivo, comOsDele.ossos, new Map())
  expect(presa.faltando).toEqual([])
  expect(presa.pecas).toHaveLength(1)
  expect(presa.pecas[0]?.skeleton.bones[1]).toBe(nova)

  comOsDele.soltar()
  expect(nova?.parent).toBeNull()
  expect(montagem.ossos.get('Head')?.children.includes(nova as Bone)).toBe(false)
})
