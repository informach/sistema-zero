import { describe, expect, test } from 'bun:test'
import { cabeColheita, colher } from '../src/horta'
import { rodarRotina } from '../src/rotina-execucao'
import type { CartaoDaRotina } from '../src/rotinas'
import type { Canteiro, Semente } from '../src/salvamento'

const agora = new Date('2026-10-29T12:00:00Z')
const bem = { fome: 60, energia: 80, diversao: 80 }
const otimo = { fome: 61, energia: 61, diversao: 61 }
const canteiro = (semente: Semente): Canteiro => ({
  id: 'c0',
  semente,
  plantadoEm: '2026-10-28T10:00:00Z',
  regadoEm: '2026-10-28T10:00:00Z',
})
const rotina: CartaoDaRotina[] = [
  { c: 'quando-amanhecer' },
  { c: 'voar-ate', a: 'horta' },
  { c: 'colher' },
]

describe('colheita especial compartilhada', () => {
  for (const [semente, clima, base] of [
    ['tomate', 'sol', 3],
    ['alface', 'nublado', 2],
    ['milho', 'chuva', 2],
  ] as const) {
    test(`${clima} favorece ${semente}, sem sorteio nem redução por ausência`, () => {
      const c = canteiro(semente)
      const contexto = { clima, necessidades: bem }
      expect(colher(c, agora.getTime(), contexto)?.qtd).toBe(base + 1)
      expect(colher(c, agora.getTime() + 365 * 86400000, contexto)?.qtd).toBe(base + 1)
      expect(colher(c, agora.getTime(), { clima: null, necessidades: bem })?.qtd).toBe(base)
      const r = colher(c, agora.getTime(), { clima, necessidades: otimo })
      expect(r?.qtd).toBe(base + 2)
      expect(r?.bonus).toEqual({ clima: 1, humor: 1 })
      expect(r && colher(r.canteiro, agora.getTime(), contexto)).toBeNull()
      expect(c.semente).toBe(semente)
    })
    test(`${semente}: mão, Lumi e prévia usam o mesmo bônus e preservam a semente`, () => {
      const c = canteiro(semente)
      const colheita = { clima, necessidades: otimo }
      const mundo = { horta: [c], inventario: {}, geladeira: null, geladeiraPosta: false, colheita }
      const r = rodarRotina('pluma', rotina, mundo, agora, null)
      expect(r.erro).toBeNull()
      expect(r.salvamento.inventario[semente]).toBe(colher(c, agora.getTime(), colheita)?.qtd)
      expect(r.salvamento.inventario[`semente-${semente}`]).toBe(1)
      expect(r.registro.some((s) => s.includes('Colheita especial'))).toBe(true)
      expect(rodarRotina('pluma', rotina, r.salvamento, agora, null).salvamento).toEqual(
        r.salvamento,
      )
    })
  }
  test('humor ótimo exige as três necessidades acima de 60; cansaço não tira comida', () => {
    for (const campo of ['fome', 'energia', 'diversao'] as const) {
      for (const valor of [0, 14, 60]) {
        expect(
          colher(canteiro('tomate'), agora.getTime(), {
            clima: null,
            necessidades: { ...otimo, [campo]: valor },
          })?.qtd,
        ).toBe(3)
      }
    }
    expect(
      colher(canteiro('tomate'), agora.getTime(), { clima: 'chuva', necessidades: bem })?.qtd,
    ).toBe(3)
    expect(
      colher({ ...canteiro('tomate'), regadoEm: agora.toISOString() }, agora.getTime(), {
        clima: 'sol',
        necessidades: otimo,
      }),
    ).toBeNull()
  })
  test('bônus inteiro cabe no limite, e recusa não consome canteiro nem parte da colheita', () => {
    const colheita = { clima: 'sol' as const, necessidades: otimo }
    const c = canteiro('tomate')
    expect(
      cabeColheita({ tomate: 994 }, 'tomate', colher(c, agora.getTime(), colheita)?.qtd ?? 0),
    ).toBe(true)
    const cheios: Record<string, number>[] = [{ tomate: 995 }, { 'semente-tomate': 999 }]
    for (const inventario of cheios) {
      const mundo = { horta: [c], inventario, geladeira: null, geladeiraPosta: false, colheita }
      const r = rodarRotina('pluma', rotina, mundo, agora, null)
      expect(r.salvamento).toEqual(mundo)
      expect(r.registro.some((s) => s.includes('mochila'))).toBe(true)
    }
    const mundo = {
      horta: [c, { ...c, id: 'c1' }],
      inventario: {},
      geladeira: null,
      geladeiraPosta: false,
      colheita,
    }
    const r = rodarRotina(
      'pluma',
      [{ c: 'quando-amanhecer' }, { c: 'para-cada', d: [{ c: 'colher' }] }],
      mundo,
      agora,
      new Set(['para-cada']),
    )
    expect(r.erro).toBeNull()
    expect(r.salvamento.inventario.tomate).toBe(5)
    expect(r.salvamento.horta[1]).toBe(mundo.horta[1])
    expect(r.registro.some((s) => s.includes('carga'))).toBe(true)
  })
})
