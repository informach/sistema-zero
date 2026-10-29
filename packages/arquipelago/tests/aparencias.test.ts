import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import {
  CATALOGO_DE_OBJETOS,
  planificacaoDoMolde,
  triangulosDoGlb,
} from '@sistemazero/arquipelago-contracts'
import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  carregarAparencia,
  encaixarCriacao,
  NOMES_DAS_FACES,
} from '../src/mundo/carregar-aparencia'

test('encaixe usa unidades da grade, apoia no chão, mantém +z e não aumenta peças pequenas', () => {
  const raiz = new Mesh(new BoxGeometry(8, 16, 8), new MeshStandardMaterial())
  raiz.position.set(2, 11, 3)
  const frente = new Group()
  frente.position.z = 4
  raiz.add(frente)
  const g = encaixarCriacao(raiz, CATALOGO_DE_OBJETOS.geladeira.molde)
  const box = new Box3().setFromObject(g)
  expect(box.min.y).toBeCloseTo(0)
  expect(box.getSize(new Vector3()).toArray()).toEqual([0.5, 1, 0.5])
  expect(frente.getWorldPosition(new Vector3()).z).toBeGreaterThan(0)
  raiz.geometry.dispose()
  ;(raiz.material as MeshStandardMaterial).dispose()
})
test('criação que passa da caixa encolhe uniformemente', () => {
  const raiz = new Mesh(new BoxGeometry(100, 50, 40), new MeshStandardMaterial())
  const molde = CATALOGO_DE_OBJETOS.geladeira.molde
  const box = new Box3().setFromObject(encaixarCriacao(raiz, molde))
  const size = box.getSize(new Vector3())
  expect(size.x).toBeCloseTo(molde.caixa.largura)
  expect(size.y / size.x).toBeCloseTo(0.5)
  raiz.geometry.dispose()
  ;(raiz.material as MeshStandardMaterial).dispose()
})
test('GLB real sem textura externa: recursos privados, descarte uma vez, reserva nas falhas', async () => {
  const bytes = new Uint8Array(
    readFileSync(new URL('../src/assets/objetos/casinha.glb', import.meta.url)),
  )
  expect(triangulosDoGlb(bytes)).not.toBeNull()
  const ler = async () => ({ tipo: 'molda' as const, bytes })
  const molde = CATALOGO_DE_OBJETOS.casinha.molde
  const sinal = new AbortController().signal
  const a = await carregarAparencia(ler, 'a', molde, new Group(), sinal)
  const b = await carregarAparencia(ler, 'a', molde, new Group(), sinal)
  expect(a).not.toBeNull()
  expect(b).not.toBeNull()
  let liberadas = 0
  a!.raiz.traverse((o) => {
    if (o instanceof Mesh) o.geometry.addEventListener('dispose', () => liberadas++)
  })
  a!.liberar()
  const antes = liberadas
  a!.liberar()
  expect(antes).toBeGreaterThan(0)
  expect(liberadas).toBe(antes)
  expect(a!.raiz).not.toBe(b!.raiz)
  b!.liberar()
  expect(
    await carregarAparencia(
      async () => {
        throw new Error('rede')
      },
      'a',
      molde,
      new Group(),
      sinal,
    ),
  ).toBeNull()
  expect(
    await carregarAparencia(
      async () => ({ tipo: 'molda', bytes: new Uint8Array(12) }),
      'a',
      molde,
      new Group(),
      sinal,
    ),
  ).toBeNull()
})
test('aborto depois da leitura não publica a criação', async () => {
  const c = new AbortController()
  expect(
    await carregarAparencia(
      async () => {
        c.abort()
        return null
      },
      'a',
      CATALOGO_DE_OBJETOS.casinha.molde,
      new Group(),
      c.signal,
    ),
  ).toBeNull()
})

test('pintura recorta cada face e descarta só recursos próprios, inclusive imagem atrasada', async () => {
  const molde = CATALOGO_DE_OBJETOS.geladeira.molde
  const plan = planificacaoDoMolde(molde)!
  const bytes = Uint8Array.from(
    atob(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==',
    ),
    (c) => c.charCodeAt(0),
  )
  // O decodificador é injetado pelo ambiente deste teste. No navegador o PNG real também é lido.
  new DataView(bytes.buffer).setUint32(16, plan.largura)
  new DataView(bytes.buffer).setUint32(20, plan.altura)
  const original = globalThis.createImageBitmap
  let fechadas = 0
  const bitmap = {
    close() {
      fechadas++
    },
  } as ImageBitmap
  globalThis.createImageBitmap = async () => bitmap
  const modelo = new Group()
  const geometria = new BoxGeometry(1, 1, 1)
  const material = new MeshStandardMaterial()
  let recursosDoCatalogo = 0
  geometria.addEventListener('dispose', () => recursosDoCatalogo++)
  material.addEventListener('dispose', () => recursosDoCatalogo++)
  for (const f of plan.faces) {
    const mesh = new Mesh(geometria, material)
    mesh.name = NOMES_DAS_FACES[f.face]
    modelo.add(mesh)
  }
  const ler = async () => ({ tipo: 'pinta' as const, bytes })
  try {
    const r = await carregarAparencia(ler, 'pinta', molde, modelo, new AbortController().signal)
    expect(r).not.toBeNull()
    let liberadas = 0
    for (const f of plan.faces) {
      const malha = r!.raiz.getObjectByName(NOMES_DAS_FACES[f.face]) as Mesh
      const proprio = malha.material as MeshStandardMaterial
      expect(proprio).not.toBe(material)
      expect(proprio.map!.offset.x).toBeCloseTo((f.x + 0.5) / plan.largura)
      expect(proprio.map!.offset.y).toBeCloseTo(1 - (f.y + f.altura - 0.5) / plan.altura)
      proprio.addEventListener('dispose', () => liberadas++)
      proprio.map!.addEventListener('dispose', () => liberadas++)
    }
    r!.liberar()
    r!.liberar()
    expect(liberadas).toBe(plan.faces.length * 2)
    expect(fechadas).toBe(1)
    expect(recursosDoCatalogo).toBe(0)
    // O GLB real junta as superfícies em primitivas de materiais, sem nós pinta*.
    const arquivo = readFileSync(new URL('../src/assets/objetos/geladeira.glb', import.meta.url))
    const real = (
      await new GLTFLoader().parseAsync(
        arquivo.buffer.slice(arquivo.byteOffset, arquivo.byteOffset + arquivo.byteLength),
        '',
      )
    ).scene
    expect(real.getObjectByName('pintaFrente')).toBeUndefined()
    const pintada = await carregarAparencia(ler, 'pinta', molde, real, new AbortController().signal)
    expect(pintada).not.toBeNull()
    const faces = new Set<string>()
    pintada!.raiz.traverse((o) => {
      if (!(o instanceof Mesh)) return
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if ((m as MeshStandardMaterial).map) faces.add(m.name)
      }
    })
    expect([...faces].sort()).toEqual(
      Object.values(NOMES_DAS_FACES)
        .filter((n) => n !== 'tela')
        .sort(),
    )
    pintada!.liberar()
    const c = new AbortController()
    globalThis.createImageBitmap = async () => {
      c.abort()
      return bitmap
    }
    expect(await carregarAparencia(ler, 'pinta', molde, modelo, c.signal)).toBeNull()
    expect(fechadas).toBe(3)
    expect(
      await carregarAparencia(ler, 'pinta', molde, new Group(), new AbortController().signal),
    ).toBeNull()
  } finally {
    globalThis.createImageBitmap = original
    geometria.dispose()
    material.dispose()
  }
})
