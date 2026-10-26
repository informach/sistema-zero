import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
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
