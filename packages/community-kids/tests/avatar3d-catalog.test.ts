import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  AVATAR_CATEGORIES,
  AVATAR_CATEGORY_LABELS,
  AVATAR_CATEGORY_PALETTES,
  AVATAR_FIXED_COLOR_PARTS,
  AVATAR_PART_INFO,
  AVATAR_REMOVABLE_NONE,
  DEFAULT_AVATAR_SLOTS,
  paletteForPart,
} from '../src/lib/avatar3d-catalog'

/**
 * Consistência INTERNA do catálogo de apresentação do avatar 3D do kids. A conformância
 * kids×members (cada peça/categoria/paleta/default casa) é travada no members
 * (`tests/unit/catalog-conformance.test.ts`); aqui garantimos a sanidade local.
 */
describe('avatar3d-catalog (kids) — apresentação', () => {
  test('toda categoria tem rótulo e default coerente', () => {
    for (const cat of AVATAR_CATEGORIES) {
      expect(AVATAR_CATEGORY_LABELS[cat], `rótulo de ${cat}`).toBeTruthy()
      const def = DEFAULT_AVATAR_SLOTS[cat]
      const info = AVATAR_PART_INFO[def.asset]
      expect(info, `default ${cat} (${def.asset}) tem info`).toBeDefined()
      expect(info?.category).toBe(cat)
    }
  })

  test('toda peça do info tem categoria válida + rótulo PT', () => {
    for (const [id, info] of Object.entries(AVATAR_PART_INFO)) {
      expect(AVATAR_CATEGORIES, `categoria de ${id}`).toContain(info.category)
      expect(info.labelPt, `rótulo de ${id}`).toBeTruthy()
    }
  })

  test('removíveis apontam p/ uma peça "nenhum" existente na mesma categoria', () => {
    for (const [cat, noneId] of Object.entries(AVATAR_REMOVABLE_NONE)) {
      const info = AVATAR_PART_INFO[noneId]
      expect(info, `none de ${cat} (${noneId})`).toBeDefined()
      expect(info?.category as string | undefined).toBe(cat)
    }
  })

  test('paletas: hex minúsculo válido; cor default ∈ paleta (ou sem paleta → sem cor)', () => {
    for (const cat of AVATAR_CATEGORIES) {
      const palette = AVATAR_CATEGORY_PALETTES[cat]
      const def = DEFAULT_AVATAR_SLOTS[cat]
      if (palette) {
        for (const c of palette) expect(c).toMatch(/^#[0-9a-f]{6}$/)
        expect(
          Boolean(def.color && palette.includes(def.color)),
          `default de ${cat} ∈ paleta`,
        ).toBe(true)
      } else {
        expect(def.color, `categoria ${cat} sem paleta`).toBeUndefined()
      }
    }
  })
})

/** O cabeçalho JSON de um GLB (sem ler o buffer binário). */
function glbJson(file: string): {
  materials?: { name?: string }[]
  nodes?: { name?: string }[]
  skins?: { joints: number[] }[]
} {
  const bytes = readFileSync(file)
  const length = bytes.readUInt32LE(12)
  return JSON.parse(bytes.subarray(20, 20 + length).toString('utf8'))
}

const KIDS_PUBLIC = join(import.meta.dir, '..', 'public', 'avatar3d')
const ADULT_PUBLIC = join(import.meta.dir, '..', '..', 'community', 'public', 'avatar3d')
const noneIds = new Set(Object.values(AVATAR_REMOVABLE_NONE))
const partsWithFile = Object.entries(AVATAR_PART_INFO).filter(([id]) => !noneIds.has(id))

/**
 * Os ARQUIVOS das peças. O Kids e a comunidade adulta servem cada um a sua cópia de
 * `public/avatar3d` (mesma origem, sem CORS), e as duas precisam ser iguais: peça que existe só
 * num app aparece quebrada no outro. Junto, o que o Blender pode errar ao exportar uma peça nova.
 */
describe('avatar3d: arquivos das peças (Kids e adulto)', () => {
  const armature = glbJson(join(KIDS_PUBLIC, 'base', 'Armature.glb'))
  const jointNames = (json: ReturnType<typeof glbJson>) =>
    (json.skins?.[0]?.joints ?? []).map((i) => json.nodes?.[i]?.name ?? '')
  const canonical = jointNames(armature)

  test('toda peça tem GLB e miniatura nos dois apps, e os arquivos são iguais', () => {
    for (const [id] of partsWithFile) {
      for (const dir of ['parts', 'thumbs'] as const) {
        const ext = dir === 'parts' ? 'glb' : 'png'
        const kids = readFileSync(join(KIDS_PUBLIC, dir, `${id}.${ext}`))
        const adult = readFileSync(join(ADULT_PUBLIC, dir, `${id}.${ext}`))
        expect(adult.equals(kids), `${dir}/${id}.${ext} igual no Kids e no adulto`).toBe(true)
      }
    }
  })

  // O avatar prende cada peça ao esqueleto COMPARTILHADO pelo índice da junta (skinIndex). O
  // exportador de glTF do Blender grava as juntas em outra ordem: sem reordenar, a peça fica
  // parada no ar quando o corpo faz uma pose.
  test('as juntas de cada peça seguem a ordem do Armature.glb', () => {
    expect(canonical.length).toBeGreaterThan(0)
    for (const [id] of partsWithFile) {
      const joints = jointNames(glbJson(join(KIDS_PUBLIC, 'parts', `${id}.glb`)))
      expect(joints, `juntas de ${id}`).toEqual(canonical.slice(0, joints.length))
    }
  })

  test('peça de cor embutida = sem material Color_ numa categoria com paleta', () => {
    for (const [id, info] of partsWithFile) {
      if (!AVATAR_CATEGORY_PALETTES[info.category] || info.category === 'head') continue
      const materials = glbJson(join(KIDS_PUBLIC, 'parts', `${id}.glb`)).materials ?? []
      const tintable = materials.some((m) => m.name?.includes('Color_'))
      expect(AVATAR_FIXED_COLOR_PARTS.has(id), `${id}: cor embutida?`).toBe(!tintable)
    }
  })

  test('paletteForPart: peça de cor embutida fica sem paleta; o resto segue a categoria', () => {
    expect(paletteForPart('accessory', 'acc-01')).toBeUndefined()
    expect(paletteForPart('accessory', 'acc-09')).toEqual(AVATAR_CATEGORY_PALETTES.accessory)
    expect(paletteForPart('hairAccessory', 'enfeite-03')).toEqual(
      AVATAR_CATEGORY_PALETTES.hairAccessory,
    )
    expect(paletteForPart('eyes', 'eyes-13')).toBeUndefined()
    expect(paletteForPart('top', undefined)).toEqual(AVATAR_CATEGORY_PALETTES.top)
  })
})

/** O GLB inteiro: cabeçalho JSON e o bloco binário. */
function glbFull(file: string) {
  const bytes = readFileSync(file)
  const jsonLength = bytes.readUInt32LE(12)
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8')) as GlbDoc
  const binStart = 20 + jsonLength
  const binLength = bytes.readUInt32LE(binStart)
  return { json, bin: bytes.subarray(binStart + 8, binStart + 8 + binLength), size: bytes.length }
}

interface GlbDoc {
  accessors: {
    bufferView?: number
    byteOffset?: number
    componentType: number
    count: number
    normalized?: boolean
    type: string
  }[]
  bufferViews: { byteOffset?: number; byteStride?: number }[]
  materials?: { name?: string }[]
  meshes: {
    primitives: { attributes: Record<string, number>; indices?: number; mode?: number }[]
  }[]
  nodes: { name?: string }[]
  skins?: { joints: number[] }[]
}

const COMPONENT_BYTES: Record<number, number> = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }

/** Os valores de um acessório VEC4 (juntas ou pesos) como números, um vetor por vértice. */
function readVec4(doc: GlbDoc, bin: Buffer, accessorIndex: number): number[][] {
  const acc = doc.accessors[accessorIndex]
  if (!acc || acc.bufferView === undefined) return []
  const view = doc.bufferViews[acc.bufferView]
  const size = COMPONENT_BYTES[acc.componentType] ?? 4
  const stride = view?.byteStride ?? size * 4
  const start = (view?.byteOffset ?? 0) + (acc.byteOffset ?? 0)
  const max = acc.componentType === 5121 ? 255 : acc.componentType === 5123 ? 65535 : 1
  const out: number[][] = []
  for (let i = 0; i < acc.count; i++) {
    const vec: number[] = []
    for (let c = 0; c < 4; c++) {
      const at = start + i * stride + c * size
      const raw =
        acc.componentType === 5126
          ? bin.readFloatLE(at)
          : acc.componentType === 5123
            ? bin.readUInt16LE(at)
            : bin.readUInt8(at)
      vec.push(acc.normalized ? raw / max : raw)
    }
    out.push(vec)
  }
  return out
}

/** Triângulos da peça inteira (todas as malhas), como o relatório do Blender conta. */
function triangleCount(doc: GlbDoc): number {
  let total = 0
  for (const mesh of doc.meshes)
    for (const prim of mesh.primitives) {
      if ((prim.mode ?? 4) !== 4) continue
      const ref = prim.indices ?? prim.attributes.POSITION
      total += Math.floor((ref === undefined ? 0 : (doc.accessors[ref]?.count ?? 0)) / 3)
    }
  return total
}

/**
 * Roupas de festa (B16, 31/10/2026), feitas por `scripts/avatar-blender/festas.py`. Ainda NÃO estão
 * no catálogo (`AVATAR_PART_INFO` é da dona e entra depois), então os testes de cima não as veem:
 * aqui o teste lê os oito GLBs direto. O encaixe dos chapéus nas cabeças (o app esconde o cabelo
 * debaixo do chapéu) e os cabelos que a tiara não atravessa são conferidos no Blender por
 * `conferir_festas.py` (relatório em `festas-relatorio.json`).
 */
describe('avatar3d: roupas de festa (GLBs lidos direto)', () => {
  const FESTA = {
    'hat-08': 'hat',
    'top-07': 'top',
    'hat-09': 'hat',
    'outfit-07': 'outfit',
    'enfeite-06': 'enfeite',
    'top-08': 'top',
    'hat-10': 'hat',
    'top-09': 'top',
  } as const
  const novas = Object.keys(FESTA)
  const armature = glbJson(join(KIDS_PUBLIC, 'base', 'Armature.glb'))
  const canonical = (armature.skins?.[0]?.joints ?? []).map((i) => armature.nodes?.[i]?.name ?? '')
  const headIndex = canonical.indexOf('mixamorig:Head')
  const existentes = readdirSync(join(KIDS_PUBLIC, 'parts'))
    .filter((f) => f.endsWith('.glb'))
    .map((f) => f.slice(0, -4))
    .filter((id) => !novas.includes(id))

  /** O maior triângulos/KB entre as peças que já existem da mesma família (o teto). */
  const teto = (prefix: string) => {
    let tris = 0
    let size = 0
    for (const id of existentes.filter((e) => e.startsWith(`${prefix}-`))) {
      const glb = glbFull(join(KIDS_PUBLIC, 'parts', `${id}.glb`))
      tris = Math.max(tris, triangleCount(glb.json))
      size = Math.max(size, glb.size)
    }
    return { tris, size }
  }

  test('GLB e miniatura nos dois apps, iguais', () => {
    for (const id of novas)
      for (const dir of ['parts', 'thumbs'] as const) {
        const ext = dir === 'parts' ? 'glb' : 'png'
        const kids = readFileSync(join(KIDS_PUBLIC, dir, `${id}.${ext}`))
        const adult = readFileSync(join(ADULT_PUBLIC, dir, `${id}.${ext}`))
        expect(adult.equals(kids), `${dir}/${id}.${ext} igual no Kids e no adulto`).toBe(true)
      }
  })

  test('juntas na ordem do Armature.glb', () => {
    expect(headIndex).toBeGreaterThanOrEqual(0)
    for (const id of novas) {
      const doc = glbFull(join(KIDS_PUBLIC, 'parts', `${id}.glb`)).json
      const joints = (doc.skins?.[0]?.joints ?? []).map((i) => doc.nodes[i]?.name ?? '')
      expect(joints, `juntas de ${id}`).toEqual(canonical)
    }
  })

  test('chapéus e tiara presos só ao osso da cabeça', () => {
    for (const [id, cat] of Object.entries(FESTA)) {
      if (cat !== 'hat' && cat !== 'enfeite') continue
      const { json, bin } = glbFull(join(KIDS_PUBLIC, 'parts', `${id}.glb`))
      const usados = new Set<number>()
      for (const mesh of json.meshes)
        for (const prim of mesh.primitives) {
          const j = prim.attributes.JOINTS_0
          const w = prim.attributes.WEIGHTS_0
          if (j === undefined || w === undefined) continue
          const joints = readVec4(json, bin, j)
          const weights = readVec4(json, bin, w)
          joints.forEach((vec, i) => {
            vec.forEach((joint, c) => {
              if ((weights[i]?.[c] ?? 0) > 1e-4) usados.add(joint)
            })
          })
        }
      expect([...usados], `ossos com peso em ${id}`).toEqual([headIndex])
    }
  })

  test('a cor principal vem de um material Color_ (a criança troca)', () => {
    for (const id of novas) {
      const materials = glbJson(join(KIDS_PUBLIC, 'parts', `${id}.glb`)).materials ?? []
      expect(
        materials.some((m) => m.name?.includes('Color_')),
        `${id} tem Color_`,
      ).toBe(true)
    }
  })

  test('abaixo dos tetos das peças da mesma família', () => {
    for (const [id, cat] of Object.entries(FESTA)) {
      const limite = teto(cat)
      expect(limite.tris, `há peças ${cat} para medir`).toBeGreaterThan(0)
      const glb = glbFull(join(KIDS_PUBLIC, 'parts', `${id}.glb`))
      expect(triangleCount(glb.json), `triângulos de ${id}`).toBeLessThan(limite.tris)
      expect(glb.size, `bytes de ${id}`).toBeLessThan(limite.size)
    }
  })
})
