import { describe, expect, it } from 'bun:test'
import { SZIRSchema } from '#ir'
import { parseJS } from '../../../parsers/js'
import { BOLICHE_SOURCE } from '../__gen_boliche'
import { COASTAL_PROCEDURAL_SOURCE } from '../__gen_coastal_procedural'
import { CORRIDA_SOURCE } from '../__gen_corrida'
import { FAZENDINHA_SOURCE } from '../__gen_fazendinha'
import { FOLIO_PROCEDURAL_SOURCE } from '../__gen_folio_procedural'
import { ILHA_SOURCE } from '../__gen_ilha'
import { INVERNO_SOURCE } from '../__gen_inverno'
import { LUA_SOURCE } from '../__gen_lua'
import { MEU_MUNDO_SOURCE } from '../__gen_meumundo'
import { PARQUE_SOURCE } from '../__gen_parque'
import { VILA_SOURCE } from '../__gen_vila'
import { VOCATION_PROCEDURAL_SOURCE } from '../__gen_vocation_procedural'
import {
  bolicheExample,
  coastalProceduralExample,
  corridaExample,
  fazendinhaExample,
  folioProceduralExample,
  ilhaExample,
  invernoExample,
  luaExample,
  meuMundoExample,
  parqueExample,
  vilaExample,
  vocationProceduralExample,
  world3DExamples,
} from '../examples'
import { world3DManifest } from '../manifest'

/**
 * Drift dos exemplos da vitrine do Mundo 3D: a IR embutida em examples.ts foi
 * gerada pelo parser real a partir do fonte em __gen_<nome>.ts. Se o parser
 * mudar a forma canônica, este teste avisa — re-rode o __gen e re-embuta.
 */

function stripIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripIds) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === '__id') continue
      out[k] = stripIds(v)
    }
    return out as T
  }
  return value
}

function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) for (const item of value) collectTypes(item, out)
  else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.type === 'string') out.add(obj.type)
    for (const v of Object.values(obj)) collectTypes(v, out)
  }
  return out
}

const CASES = [
  { name: 'Meu Mundo', source: MEU_MUNDO_SOURCE, example: meuMundoExample },
  { name: 'Corrida do Por do Sol', source: CORRIDA_SOURCE, example: corridaExample },
  { name: 'Boliche na Praca', source: BOLICHE_SOURCE, example: bolicheExample },
  { name: 'Inverno Magico', source: INVERNO_SOURCE, example: invernoExample },
  { name: 'Ilha dos Criadores', source: ILHA_SOURCE, example: ilhaExample },
  { name: 'Parque dos Brinquedos', source: PARQUE_SOURCE, example: parqueExample },
  { name: 'Vila das Vocacoes', source: VILA_SOURCE, example: vilaExample },
  { name: 'Base da Lua', source: LUA_SOURCE, example: luaExample },
  { name: 'Fazendinha', source: FAZENDINHA_SOURCE, example: fazendinhaExample },
  { name: 'Folio Procedural', source: FOLIO_PROCEDURAL_SOURCE, example: folioProceduralExample },
  {
    name: 'Coastal World Procedural',
    source: COASTAL_PROCEDURAL_SOURCE,
    example: coastalProceduralExample,
  },
  {
    name: 'Vocation Vista Procedural',
    source: VOCATION_PROCEDURAL_SOURCE,
    example: vocationProceduralExample,
  },
]

describe('Mundo 3D — exemplos da vitrine', () => {
  it('o manifest registra os 12 exemplos', () => {
    expect(world3DExamples.length).toBe(12)
    expect(world3DManifest.examples.length).toBe(12)
  })

  for (const { name, source, example } of CASES) {
    describe(name, () => {
      it('o fonte parseia SEM rawJS/memberCall (100% blocos do Mundo 3D)', () => {
        const types = collectTypes(parseJS(source))
        expect(types.has('rawJS')).toBe(false)
        expect(types.has('memberCall')).toBe(false)
      })

      it('a IR embutida NÃO desviou do parser (drift guard)', () => {
        expect(stripIds(example.ir.js)).toEqual(stripIds(parseJS(source)))
      })

      it('a IR completa valida no SZIRSchema', () => {
        const parsed = SZIRSchema.safeParse(example.ir)
        expect(parsed.success).toBe(true)
      })

      it('usa a extensão world-3d e tem o w3d:start no fim', () => {
        expect(example.ir.extensions?.[0]?.extensionId).toBe('world-3d')
        const js = example.ir.js
        expect(js[js.length - 1]?.type).toBe('w3d:start')
      })
    })
  }
})
