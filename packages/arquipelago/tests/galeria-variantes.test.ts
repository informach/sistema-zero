import { describe, expect, test } from 'bun:test'
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { GALERIA } from '@sistemazero/arquipelago-contracts'
import { Box3, type Object3D, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

/**
 * As outras versões da galeria (31/10/2026): cada objeto à venda (os `*-classica`/`*-classico` do
 * catálogo) tem a `retro` e a `moderna` em `src/assets/objetos/<objeto>-<versão>.glb`, feitas por
 * `arte/objetos/<objeto>_estilos.py`. Cada uma tem a mesma caixa do clássico (±2 cm), os mesmos nós
 * com o mesmo pivô, os mesmos clipes (nome, duração e o que cada um mexe) e os mesmos materiais que o
 * jogo procura pelo nome, dentro dos tetos de 10 mil triângulos e 450 KB. A retro é a da Faísca:
 * toda cor de material é uma cor da paleta "Doces" do Pinta, lida do próprio arquivo do Pinta.
 * As faces do Pinta das duas versões estão em `faces-dos-objetos.test.ts`, as coplanares em
 * `faces-coplanares.test.ts`.
 */

const OBJETOS = join(import.meta.dir, '..', 'src', 'assets', 'objetos')
const VERSOES = ['retro', 'moderna'] as const
const TOLERANCIA = 0.02
const TETO_TRIANGULOS = 10_000
const TETO_KB = 450

/** Os materiais que o jogo procura pelo nome (README de `arte/objetos`). */
const FUNCIONAIS = new Set([
  'luz',
  'tela',
  'agua',
  'vidro',
  'vidroForno',
  'fogo',
  'brasa',
  'chama',
  'placaFace',
  'bolha',
  'pintaFrente',
  'pintaLadoEsq',
  'pintaLadoDir',
  'pintaTopo',
])
/** Os que acendem (emissão), à noite ou com o fogo. */
const ACENDEM = new Set(['luz', 'tela', 'fogo', 'brasa', 'chama'])

interface Gltf {
  nodes: { name: string; translation?: number[]; children?: number[] }[]
  scenes: { nodes: number[] }[]
  meshes: { primitives: { indices?: number; attributes: Record<string, number> }[] }[]
  accessors: { count: number; max?: number[] }[]
  materials: {
    name: string
    emissiveFactor?: number[]
    pbrMetallicRoughness?: { baseColorFactor?: number[] }
  }[]
  animations?: {
    name: string
    channels: { target: { node: number; path: string }; sampler: number }[]
    samplers: { input: number }[]
  }[]
}

/** A paleta "Doces" do Pinta (`PASTEL` em `packages/pinta/src/core/palette.ts`), lida do arquivo. */
function paletaDoces(): string[] {
  const fonte = readFileSync(
    join(import.meta.dir, '..', '..', 'pinta', 'src', 'core', 'palette.ts'),
    'utf8',
  )
  const bloco = fonte.match(/const PASTEL[^=]*=\s*\{[\s\S]*?colors:\s*\[([\s\S]*?)\]/)
  if (!bloco?.[1]) throw new Error('paleta PASTEL não achada no Pinta')
  return [...bloco[1].matchAll(/'#([0-9a-fA-F]{6})'/g)].map((m) => `#${m[1]!.toLowerCase()}`)
}

function lerGlb(id: string) {
  const caminho = join(OBJETOS, `${id}.glb`)
  const bytes = readFileSync(caminho)
  const n = bytes.readUInt32LE(12)
  const json = JSON.parse(bytes.subarray(20, 20 + n).toString('utf8')) as Gltf
  return { json, bytes, kb: statSync(caminho).size / 1024 }
}

async function cena(bytes: Buffer<ArrayBuffer>): Promise<Object3D> {
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  const raiz = (await new GLTFLoader().parseAsync(ab, '')).scene
  raiz.updateMatrixWorld(true)
  return raiz
}

/** Os nós de primeiro nível (os do contrato) com o pivô de cada um. */
function nos(g: Gltf) {
  return new Map(
    (g.scenes[0]?.nodes ?? []).map((i) => {
      const no = g.nodes[i]!
      return [no.name, no.translation ?? [0, 0, 0]] as const
    }),
  )
}

/** Cada clipe: a duração e o que ele mexe (`nó.caminho`). */
function clipes(g: Gltf) {
  return new Map(
    (g.animations ?? []).map((a) => {
      const fim = Math.max(...a.samplers.map((s) => g.accessors[s.input]?.max?.[0] ?? 0))
      const alvos = a.channels.map((c) => `${g.nodes[c.target.node]!.name}.${c.target.path}`).sort()
      return [a.name, { fim, alvos }] as const
    }),
  )
}

function triangulos(g: Gltf) {
  let t = 0
  for (const m of g.meshes)
    for (const p of m.primitives) {
      const indices = p.indices ?? p.attributes.POSITION
      t += (g.accessors[indices!]?.count ?? 0) / 3
    }
  return t
}

/** A cor do glTF (linear) de volta ao hex: a arte grava cada canal como (c / 255) ^ 2,2. */
function hex(rgb: number[]) {
  return rgb.slice(0, 3).map((c) => Math.round(Math.max(0, c) ** (1 / 2.2) * 255))
}

function naPaleta(rgb: number[], paleta: string[]) {
  const [r, g, b] = hex(rgb)
  return paleta.some((h) => {
    const p = [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16))
    return Math.abs(p[0]! - r!) <= 1 && Math.abs(p[1]! - g!) <= 1 && Math.abs(p[2]! - b!) <= 1
  })
}

const OBJETOS_DA_GALERIA = Object.values(GALERIA)
  .filter((a) => /-classic[oa]$/.test(a.id))
  .map((a) => a.objeto)

describe('as versões retro e moderna da galeria', () => {
  test('são os nove objetos à venda e a paleta Doces do Pinta tem 15 cores', () => {
    expect(OBJETOS_DA_GALERIA).toHaveLength(9)
    expect(paletaDoces()).toHaveLength(15)
  })

  for (const objeto of OBJETOS_DA_GALERIA)
    for (const versao of VERSOES) {
      const id = `${objeto}-${versao}`
      test(`${id}: mesma caixa, nós, pivôs, clipes e materiais do clássico, nos tetos`, async () => {
        const classico = lerGlb(objeto)
        const variante = lerGlb(id)

        const caixa = async (b: Buffer<ArrayBuffer>) =>
          new Box3().setFromObject(await cena(b)).getSize(new Vector3())
        const [c, v] = [await caixa(classico.bytes), await caixa(variante.bytes)]
        for (const eixo of ['x', 'y', 'z'] as const)
          expect(Math.abs(c[eixo] - v[eixo]), `${id}: caixa em ${eixo}`).toBeLessThanOrEqual(
            TOLERANCIA,
          )

        const nc = nos(classico.json)
        const nv = nos(variante.json)
        expect([...nv.keys()].sort()).toEqual([...nc.keys()].sort())
        for (const [nome, t] of nc) {
          const tv = nv.get(nome)!
          for (let i = 0; i < 3; i++)
            expect(Math.abs(t[i]! - tv[i]!), `${id}: pivô de ${nome}`).toBeLessThanOrEqual(
              TOLERANCIA,
            )
        }

        const cc = clipes(classico.json)
        const cv = clipes(variante.json)
        expect([...cv.keys()].sort()).toEqual([...cc.keys()].sort())
        for (const [nome, { fim, alvos }] of cc) {
          expect(Math.abs(cv.get(nome)!.fim - fim)).toBeLessThan(0.01)
          expect(cv.get(nome)!.alvos).toEqual(alvos)
        }

        const matsV = new Map(variante.json.materials.map((m) => [m.name, m]))
        for (const m of classico.json.materials) {
          if (!FUNCIONAIS.has(m.name)) continue
          const mv = matsV.get(m.name)
          expect(mv, `${id} sem o material ${m.name}`).toBeDefined()
          if (ACENDEM.has(m.name))
            expect(
              Math.max(...(mv!.emissiveFactor ?? [0])),
              `${id}: ${m.name} acende`,
            ).toBeGreaterThan(0)
        }

        expect(triangulos(variante.json)).toBeLessThanOrEqual(TETO_TRIANGULOS)
        expect(variante.kb).toBeLessThanOrEqual(TETO_KB)
      })
    }

  for (const objeto of OBJETOS_DA_GALERIA)
    test(`${objeto}-retro (da Faísca): toda cor de material é da paleta Doces do Pinta`, () => {
      const paleta = paletaDoces()
      const { json } = lerGlb(`${objeto}-retro`)
      for (const m of json.materials) {
        const base = m.pbrMetallicRoughness?.baseColorFactor ?? [1, 1, 1, 1]
        expect(naPaleta(base, paleta), `${m.name}: ${hex(base)}`).toBe(true)
        const emissao = m.emissiveFactor ?? [0, 0, 0]
        if (Math.max(...emissao) > 0)
          expect(naPaleta(emissao, paleta), `${m.name} (emissão): ${hex(emissao)}`).toBe(true)
      }
    })
})
