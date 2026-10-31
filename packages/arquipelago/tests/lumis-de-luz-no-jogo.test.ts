import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  criarSalvamentoInicial,
  LUMIS_DE_LUZ,
  migrarSalvamento,
  temOLumi,
} from '@sistemazero/arquipelago-contracts'
import { albumDoSalvamento } from '../src/sistemas/album'
import {
  borroesDaNoite,
  FAMILIAS_DOS_LUMIS,
  LUZ_DA_FAMILIA,
  lumisNaIlha,
} from '../src/sistemas/borroes'
import { ESPECIES_DE_LUMI } from '../src/sistemas/lumis'
import { guardarRotina, rotinasDoQuando } from '../src/sistemas/rotina'
import {
  abrirSegredo,
  falaDoSegredo,
  falaDoSegredoDoMovimento,
  SEGREDOS,
  segredoDoMovimento,
} from '../src/sistemas/segredos'

const AGORA = new Date('2026-10-31T12:00:00Z')
const LUMIS_DIR = join(import.meta.dir, '..', 'src', 'assets', 'lumis')

describe('os Lumis de luz (B12)', () => {
  test('um por família, com o modelo e a miniatura da arte', () => {
    expect(LUMIS_DE_LUZ).toHaveLength(7)
    for (const id of LUMIS_DE_LUZ) {
      const e = ESPECIES_DE_LUMI[id]
      expect(e.luz).toBe(true)
      expect(LUZ_DA_FAMILIA[e.ilha as keyof typeof LUZ_DA_FAMILIA]).toBe(id)
      expect(existsSync(join(LUMIS_DIR, `${id}.glb`))).toBe(true)
      expect(existsSync(join(LUMIS_DIR, 'miniaturas', `${id}.png`))).toBe(true)
    }
  })

  test('nunca saem de um borrão da noite', () => {
    const lumis = { estrelinha: 3, buzio: 1, pitanga: 2, quindim: 1, bolha: 1, gelinho: 1 }
    for (const ilha of Object.keys(FAMILIAS_DOS_LUMIS) as (keyof typeof FAMILIAS_DOS_LUMIS)[])
      for (let dia = 0; dia < 60; dia++)
        for (const b of borroesDaNoite(dia, lumis, ilha))
          expect(LUMIS_DE_LUZ as readonly string[]).not.toContain(b.lumi)
  })

  test('abrir o baú dá o Lumi de luz, que mora com a família no primeiro lugar', () => {
    const s0 = criarSalvamentoInicial(AGORA)
    const vento = SEGREDOS.find((x) => x.id === 'recife')
    if (!vento) throw new Error('sem o segredo do Recife')
    const s1 = abrirSegredo({ ...s0, lumis: { bolha: 2 } }, vento)
    expect(temOLumi(s1, 'perola-de-luz')).toBe(true)
    // Não ganha contador: é o bit do baú.
    expect(s1.lumis['perola-de-luz']).toBeUndefined()
    expect(migrarSalvamento(s1)).not.toBeNull()
    expect(lumisNaIlha(s1.lumis, 'recife', s1.segredos).map((m) => m.lumi)).toEqual([
      'perola-de-luz',
      'bolha',
      'bolha',
    ])
    const fala = falaDoSegredo(vento)
    expect(fala).toContain('Pérola de Luz')
    expect(fala).toContain('do Recife')
    // O Cristal de Luz fica na gruta debaixo do píer (o Pico não tem baú).
    const gruta = segredoDoMovimento('mergulho')
    const s2 = abrirSegredo(s0, gruta)
    expect(temOLumi(s2, 'cristal-de-luz')).toBe(true)
    expect(falaDoSegredoDoMovimento(gruta)).toContain('Cristal de Luz')
    // Os baús sem Lumi de luz (cipó e patins) só dão a página.
    expect(falaDoSegredoDoMovimento(segredoDoMovimento('patins'))).not.toContain('Lumi de luz')
    for (const f of [fala, falaDoSegredoDoMovimento(gruta)]) expect(f).not.toMatch(/[—–!]|^\s*[¿?]/)
  })

  test('o álbum mostra os sete numa seção própria; a rotina vale com o baú aberto', () => {
    const s0 = criarSalvamentoInicial(AGORA)
    const a0 = albumDoSalvamento(s0)
    expect(a0.lumisDeLuz.conta).toEqual({ tem: 0, total: 7, faltam: 7 })
    expect(a0.lumis.conta.total).toBe(14)
    const cristal = a0.lumisDeLuz.itens.find((l) => l.id === 'cristal-de-luz')
    expect(cristal).toMatchObject({
      estado: 'nao-encontrado',
      ilha: 'Num baú da Íris, em Sua ilha',
    })
    const rotina = [{ c: 'quando-anoitecer' as const }, { c: 'regar' as const }]
    expect('motivo' in guardarRotina(s0, 'cristal-de-luz', rotina, null)).toBe(true)
    const s1 = abrirSegredo(s0, segredoDoMovimento('mergulho'))
    const a1 = albumDoSalvamento(s1)
    expect(a1.lumisDeLuz.conta.tem).toBe(1)
    expect(a1.lumisDeLuz.itens.find((l) => l.id === 'cristal-de-luz')).toMatchObject({
      estado: 'preso',
      nome: 'Cristal de Luz',
      ilha: 'Pico Gelado',
    })
    const r = guardarRotina(s1, 'cristal-de-luz', rotina, null)
    if ('motivo' in r) throw new Error(r.motivo)
    expect(rotinasDoQuando(r.salvamento, 'quando-anoitecer')).toEqual(['cristal-de-luz'])
    expect(migrarSalvamento(r.salvamento)).not.toBeNull()
  })
})
