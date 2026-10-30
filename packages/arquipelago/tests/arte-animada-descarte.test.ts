import { expect, test } from 'bun:test'
import {
  Bone,
  BufferGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  Skeleton,
  SkinnedMesh,
} from 'three'
import { copiarArteAnimada } from '../src/mundo/arte-animada'

function esqueletos(cena: Object3D) {
  const lista = new Set<Skeleton>()
  cena.traverse((o) => {
    if ((o as SkinnedMesh).isSkinnedMesh) lista.add((o as SkinnedMesh).skeleton)
  })
  return [...lista]
}

function personagem() {
  const cena = new Group()
  const osso = new Bone()
  const esqueleto = new Skeleton([osso])
  const geometria = new BufferGeometry()
  const material = new MeshStandardMaterial()
  cena.add(osso)
  for (let i = 0; i < 2; i++) {
    const parte = new SkinnedMesh(geometria, material)
    parte.bind(esqueleto)
    cena.add(parte)
  }
  return { cena, esqueleto, geometria, material }
}

test('soltar a cópia libera suas texturas de ossos sem atingir o original nem outra cópia', () => {
  const original = personagem()
  const primeira = copiarArteAnimada(original.cena)
  const segunda = copiarArteAnimada(original.cena)
  const proprios = esqueletos(primeira.cena)
  const outros = esqueletos(segunda.cena)
  let soltouCompartilhado = 0
  let soltouProprio = 0
  original.geometria.addEventListener('dispose', () => soltouCompartilhado++)
  original.material.addEventListener('dispose', () => soltouCompartilhado++)
  original.esqueleto.computeBoneTexture()
  original.esqueleto.boneTexture!.addEventListener('dispose', () => soltouCompartilhado++)
  for (const s of outros) {
    s.computeBoneTexture()
    s.boneTexture!.addEventListener('dispose', () => soltouCompartilhado++)
  }
  for (const s of proprios) {
    expect(s).not.toBe(original.esqueleto)
    expect(outros).not.toContain(s)
    s.computeBoneTexture()
    s.boneTexture!.addEventListener('dispose', () => soltouProprio++)
  }
  try {
    primeira.soltar()
    expect(soltouProprio).toBe(proprios.length)
    expect(proprios.every((s) => s.boneTexture === null)).toBe(true)
    expect(soltouCompartilhado).toBe(0)
    expect(outros.every((s) => s.boneTexture !== null)).toBe(true)
    primeira.soltar()
    expect(soltouProprio).toBe(proprios.length)
    expect(soltouCompartilhado).toBe(0)
  } finally {
    for (const s of [...proprios, ...outros, original.esqueleto]) s.dispose()
    original.geometria.dispose()
    original.material.dispose()
  }
})

test('a limpeza também libera textura realocada depois de uma remontagem de efeito', () => {
  const original = personagem()
  const copia = copiarArteAnimada(original.cena)
  const proprios = esqueletos(copia.cena)
  try {
    for (let ciclo = 0; ciclo < 3; ciclo++) {
      for (const s of proprios) s.computeBoneTexture()
      copia.soltar()
      expect(proprios.every((s) => s.boneTexture === null)).toBe(true)
    }
  } finally {
    for (const s of proprios) s.dispose()
    original.esqueleto.dispose()
    original.geometria.dispose()
    original.material.dispose()
  }
})

test('modelo sem esqueleto conserva os recursos compartilhados ao soltar', () => {
  const geometria = new BufferGeometry()
  const material = new MeshStandardMaterial()
  const original = new Mesh(geometria, material)
  let descartes = 0
  geometria.addEventListener('dispose', () => descartes++)
  material.addEventListener('dispose', () => descartes++)
  try {
    const copia = copiarArteAnimada(original)
    copia.soltar()
    copia.soltar()
    expect(descartes).toBe(0)
  } finally {
    geometria.dispose()
    material.dispose()
  }
})
