import { describe, expect, it } from 'bun:test'
import { behaviorStatements, normalizeSZIR, SZIRV2Schema } from '#ir'
import { parseJS } from '../../../parsers/js'
import { BOLICHE_SOURCE } from '../__gen_boliche'
import { CACA_ESTRELAS_SOURCE } from '../__gen_cacaEstrelas'
import { COASTAL_PROCEDURAL_SOURCE } from '../__gen_coastal_procedural'
import { CORRIDA_SOURCE } from '../__gen_corrida'
import { FAZENDINHA_SOURCE } from '../__gen_fazendinha'
import { FOLIO_PROCEDURAL_SOURCE } from '../__gen_folio_procedural'
import { ILHA_SOURCE } from '../__gen_ilha'
import { INVERNO_SOURCE } from '../__gen_inverno'
import { LUA_SOURCE } from '../__gen_lua'
import { MEU_MUNDO_SOURCE } from '../__gen_meumundo'
import { PARQUE_SOURCE } from '../__gen_parque'
import { PISTA_MALUCA_SOURCE } from '../__gen_pistaMaluca'
import { VILA_SOURCE } from '../__gen_vila'
import { VOCATION_PROCEDURAL_SOURCE } from '../__gen_vocation_procedural'
import {
  bolicheExample,
  cacaEstrelasExample,
  coastalProceduralExample,
  corridaExample,
  fazendinhaExample,
  folioProceduralExample,
  ilhaExample,
  invernoExample,
  luaExample,
  meuMundoExample,
  parqueExample,
  pistaMalucaExample,
  vilaExample,
  vocationProceduralExample,
  world3DExamples,
} from '../examples'
import { worldThreeDExtension } from '../index'

/**
 * Drift dos exemplos da vitrine do Mundo 3D: a IR embutida em examples.ts foi
 * gerada pelo parser real a partir do fonte em __gen_<nome>.ts. Se o parser
 * mudar a forma canônica, este teste avisa: rode `bun run gen:world-3d-examples`.
 */

function stripIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripIds) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === '__id' || v === undefined) continue
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

// Na ORDEM da vitrine (review 3D, 10/2026): do passeio mais simples ao mais cheio de
// sistemas; os três mundos de referência fecham a lista.
const CASES = [
  { name: 'Meu Mundo', source: MEU_MUNDO_SOURCE, example: meuMundoExample },
  { name: 'Inverno Mágico', source: INVERNO_SOURCE, example: invernoExample },
  { name: 'Fazendinha', source: FAZENDINHA_SOURCE, example: fazendinhaExample },
  { name: 'Base da Lua', source: LUA_SOURCE, example: luaExample },
  { name: 'Parque dos Brinquedos', source: PARQUE_SOURCE, example: parqueExample },
  // Lote 10: o primeiro jogo completo (regras de jogo), entre o Parque e o Boliche.
  { name: 'Caça às Estrelas', source: CACA_ESTRELAS_SOURCE, example: cacaEstrelasExample },
  { name: 'Boliche na Praça', source: BOLICHE_SOURCE, example: bolicheExample },
  { name: 'Corrida do Pôr do Sol', source: CORRIDA_SOURCE, example: corridaExample },
  { name: 'Ilha dos Criadores', source: ILHA_SOURCE, example: ilhaExample },
  { name: 'Vila das Vocações', source: VILA_SOURCE, example: vilaExample },
  { name: 'Pista Maluca', source: PISTA_MALUCA_SOURCE, example: pistaMalucaExample },
  { name: 'Passeio das Letras', source: FOLIO_PROCEDURAL_SOURCE, example: folioProceduralExample },
  { name: 'Costa das Ilhas', source: COASTAL_PROCEDURAL_SOURCE, example: coastalProceduralExample },
  {
    name: 'Cidade das Carreiras',
    source: VOCATION_PROCEDURAL_SOURCE,
    example: vocationProceduralExample,
  },
]

describe('Mundo 3D — exemplos da vitrine', () => {
  it('o provider registra os 14 exemplos', () => {
    // 13 → 14 no lote 10 do review 3D: "Caça às Estrelas".
    expect(world3DExamples.length).toBe(14)
    expect(worldThreeDExtension.examples.count).toBe(14)
  })

  it('a vitrine segue a ordem nova, com os nomes acentuados', () => {
    expect(world3DExamples.map((example) => example.name)).toEqual(CASES.map((c) => c.name))
    expect(world3DExamples).toEqual(CASES.map((c) => c.example))
  })

  it('nenhum título ou descrição cita marca de outro estúdio (vão para "Créditos e inspirações")', () => {
    const text = world3DExamples
      .map((example) => `${example.name} ${example.description}`)
      .join(' ')
    expect(text).not.toMatch(/folio|bruno|coastal|vocation vista|profissiona/i)
  })

  for (const { name, source, example } of CASES) {
    describe(name, () => {
      it('o fonte parseia SEM rawJS/memberCall (100% blocos do Mundo 3D)', () => {
        const types = collectTypes(parseJS(source))
        expect(types.has('rawJS')).toBe(false)
        expect(types.has('memberCall')).toBe(false)
      })

      it('a IR embutida NÃO desviou do parser (drift guard)', () => {
        const normalizedSource = normalizeSZIR({
          html: [],
          css: [],
          js: parseJS(source),
          extensions: [{ extensionId: 'world-3d' }],
        })
        expect(stripIds(behaviorStatements(example.ir))).toEqual(
          stripIds(behaviorStatements(normalizedSource)),
        )
      })

      it('a IR completa valida no SZIRSchema', () => {
        const parsed = SZIRV2Schema.safeParse(example.ir)
        expect(parsed.success).toBe(true)
      })

      it('usa a extensão world-3d e deixa o boot automático fora do código da criança', () => {
        expect(example.ir.extensions?.[0]?.extensionId).toBe('world-3d')
        const js = behaviorStatements(example.ir)
        expect(js.some((statement) => statement.type === 'w3d:start')).toBe(false)
        expect(example.ir.behavior.start[0]?.type).toBe('w3d:setup')
      })
    })
  }
})
