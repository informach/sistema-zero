import { describe, expect, test } from 'bun:test'
import {
  CARTAS_LUMI,
  CASOS_DA_ESCOLHA,
  type CartaoDaRotina,
  type CartasDoJogador,
  RotinaSchema,
} from '@sistemazero/arquipelago-contracts'
import * as Blockly from 'blockly/core'
import {
  caixaDeBlocosLumi,
  carregarRotinaLumi,
  lerRotinaLumi,
  registrarBlocosLumi,
  tipoDoBlocoLumi,
} from '../src/components/arquipelago-rotina/blocks'

const cartas: CartasDoJogador = {
  cartas: CARTAS_LUMI.map((c) => ({ ...c, conquistada: true, aprendaEm: [] })),
}
const quando: CartaoDaRotina = { c: 'quando-amanhecer' }
function roundtrip(rotina: CartaoDaRotina[]) {
  const ws = new Blockly.Workspace()
  try {
    carregarRotinaLumi(ws, rotina)
    const lida = lerRotinaLumi(ws, cartas)
    expect(lida.rotina).toEqual(rotina)
    expect(RotinaSchema.safeParse(lida.rotina).success).toBe(true)
    expect(lida.blocos.size).toBe(ws.getAllBlocks(false).length)
    const estado = Blockly.serialization.workspaces.save(ws)
    ws.clear()
    Blockly.serialization.workspaces.load(estado, ws)
    expect(lerRotinaLumi(ws, cartas).rotina).toEqual(rotina)
  } finally {
    ws.dispose()
  }
}
describe('blocos próprios dos Lumis', () => {
  test('todos os cartões e valores permitidos fazem ida e volta', () => {
    for (const n of Array.from({ length: 100 }, (_, i) => i))
      roundtrip([quando, { c: 'guardar-na-memoria', n }])
    for (let n = 2; n <= 9; n++) roundtrip([quando, { c: 'repetir', n, d: [{ c: 'regar' }] }])
    for (let n = 1; n <= 10; n++) roundtrip([quando, { c: 'esperar', n }])
    for (const c of ['quando-amanhecer', 'quando-anoitecer'] as const)
      for (const a of ['horta', 'geladeira'] as const)
        roundtrip([
          { c },
          { c: 'voar-ate', a },
          { c: 'regar' },
          { c: 'colher' },
          { c: 'guardar' },
          { c: 'contar' },
        ])
    roundtrip([quando, { c: 'para-cada', d: [{ c: 'regar' }] }])
    for (const c of ['se', 'enquanto'] as const) {
      for (const se of ['maduro', 'carregando', 'precisa-de-agua'] as const)
        roundtrip([quando, { c, se, d: [{ c: 'regar' }] }])
      for (let n = 1; n <= 99; n++)
        roundtrip([quando, { c, se: 'lembra-menos-que', n, d: [{ c: 'contar' }] }])
    }
    for (let mask = 1; mask < 16; mask++) {
      const casos: Extract<CartaoDaRotina, { c: 'escolha' }>['casos'] = {}
      CASOS_DA_ESCOLHA.forEach((c, i) => {
        if (mask & (1 << i)) casos[c] = [{ c: 'regar' }]
      })
      roundtrip([quando, { c: 'escolha', casos }])
    }
  })
  test('combina profundidade e quantidade até os tetos', () => {
    for (let profundidade = 0; profundidade <= 3; profundidade++) {
      let c: CartaoDaRotina = { c: 'regar' }
      for (let i = 0; i < profundidade; i++) c = { c: 'repetir', n: 2, d: [c] }
      for (let total = profundidade + 2; total <= 16; total++)
        roundtrip([
          quando,
          c,
          ...Array.from({ length: total - profundidade - 2 }, () => ({ c: 'regar' }) as const),
        ])
    }
  })
  test('não descarta bloco solto, bloqueado, excesso, chapéu extra ou controle vazio', () => {
    registrarBlocosLumi()
    const ws = new Blockly.Workspace()
    try {
      carregarRotinaLumi(ws, [quando, { c: 'regar' }])
      ws.newBlock(tipoDoBlocoLumi('colher'))
      expect(() => lerRotinaLumi(ws, cartas)).toThrow('Encaixe')
      carregarRotinaLumi(ws, [quando, { c: 'repetir', n: 2, d: [{ c: 'regar' }] }])
      expect(() => lerRotinaLumi(ws, null)).toThrow('conferir')
      const bloqueadas = {
        cartas: cartas.cartas.map((c) => ({ ...c, conquistada: c.id !== 'repetir' })),
      }
      expect(() => lerRotinaLumi(ws, bloqueadas)).toThrow('ainda não')
      carregarRotinaLumi(ws, [quando, { c: 'repetir', n: 2, d: [] }])
      expect(() => lerRotinaLumi(ws, cartas)).toThrow('dentro')
      carregarRotinaLumi(ws, [
        quando,
        ...Array.from({ length: 16 }, () => ({ c: 'regar' }) as const),
      ])
      expect(() => lerRotinaLumi(ws, cartas)).toThrow('16')
      let c: CartaoDaRotina = { c: 'regar' }
      for (let i = 0; i < 4; i++) c = { c: 'para-cada', d: [c] }
      carregarRotinaLumi(ws, [quando, c])
      expect(() => lerRotinaLumi(ws, cartas)).toThrow('3 níveis')
      carregarRotinaLumi(ws, [quando, { c: 'regar' }])
      ws.newBlock(tipoDoBlocoLumi('quando-anoitecer'))
      expect(() => lerRotinaLumi(ws, cartas)).toThrow('Encaixe')
      carregarRotinaLumi(ws, [quando, { c: 'regar' }])
      expect(lerRotinaLumi(ws, null).rotina).toHaveLength(2)
    } finally {
      ws.dispose()
    }
  })
  test('a caixa mostra controles bloqueados, sem bloquear ações e chapéus', () => {
    const caixa = JSON.stringify(caixaDeBlocosLumi(null))
    expect(caixa).toContain('"enabled":false')
    expect(caixa).toContain('"type":"sz_lumi_regar","enabled":true')
  })
})
