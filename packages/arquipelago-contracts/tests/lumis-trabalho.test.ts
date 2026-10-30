import { describe, expect, test } from 'bun:test'
import { cabeColheita } from '../src/horta'
import { PERFIS_DOS_LUMIS } from '../src/lumis-trabalho'
import {
  aplicarPasso,
  comecarExecucao,
  type MundoDaRotina,
  proximoPasso,
  rodarRotina,
  terminarExecucao,
} from '../src/rotina-execucao'
import type { CartaoDaRotina } from '../src/rotinas'
import { LUMIS } from '../src/salvamento'

const agora = new Date('2026-10-29T12:00:00Z')
function mundo(): MundoDaRotina {
  return {
    horta: Array.from({ length: 4 }, (_, id) => ({
      id: `c${id}`,
      semente: 'tomate' as const,
      plantadoEm: '2026-10-28T00:00:00Z',
      regadoEm: '2026-10-28T00:00:00Z',
    })),
    inventario: {},
    geladeira: null,
    geladeiraPosta: false,
  }
}
const colherTudo: CartaoDaRotina[] = [
  { c: 'quando-amanhecer' },
  { c: 'para-cada', d: [{ c: 'colher' }] },
]
const cartas = new Set(['para-cada'])

describe('características e colheita dos Lumis', () => {
  test('todas as espécies têm números finitos e capacidades suficientes para um canteiro', () => {
    expect(Object.keys(PERFIS_DOS_LUMIS).sort()).toEqual([...LUMIS].sort())
    for (const p of Object.values(PERFIS_DOS_LUMIS)) {
      expect(p.voo).toBeGreaterThanOrEqual(2)
      expect(p.voo).toBeLessThanOrEqual(3)
      expect(p.carga).toBeGreaterThanOrEqual(8)
      expect(p.carga).toBeLessThanOrEqual(24)
      expect(p.trabalho).toBeGreaterThanOrEqual(0.9)
      expect(p.trabalho).toBeLessThanOrEqual(1.2)
    }
  })
  test('Lumi leve deixa a colheita que não cabe no canteiro, outro leva tudo', () => {
    const inicial = mundo()
    const leve = rodarRotina('pluma', colherTudo, inicial, agora, cartas)
    const forte = rodarRotina('buzio', colherTudo, inicial, agora, cartas)
    expect(leve.erro).toBeNull()
    expect(forte.erro).toBeNull()
    expect(leve.salvamento.inventario.tomate).toBe(6)
    expect(leve.salvamento.horta.filter((c) => c.semente)).toHaveLength(2)
    expect(forte.salvamento.inventario.tomate).toBe(12)
    expect(forte.salvamento.horta.every((c) => c.semente === null)).toBe(true)
    expect(inicial.horta.every((c) => c.semente === 'tomate')).toBe(true)
  })
  for (const item of ['tomate', 'semente-tomate'])
    test(`mochila cheia de ${item} preserva alimento e semente sem truncar`, () => {
      const inicial = mundo()
      inicial.inventario[item] = 999
      const r = rodarRotina('buzio', colherTudo, inicial, agora, cartas)
      expect(r.salvamento.horta).toBe(inicial.horta)
      expect(r.salvamento.inventario).toEqual({ [item]: 999 })
      expect(r.registro.some((x) => x.includes('mochila'))).toBe(true)
    })

  test('limite exato da mochila cabe, sem aceitar truncamento nem outra unidade', () => {
    expect(cabeColheita({ tomate: 996, 'semente-tomate': 998 }, 'tomate', 3)).toBe(true)
    expect(cabeColheita({ tomate: 997 }, 'tomate', 3)).toBe(false)
    expect(cabeColheita({ 'semente-tomate': 999 }, 'tomate', 3)).toBe(false)
  })

  test('guardar com geladeira cheia conserva todo alimento, sem transferir estoque anterior', () => {
    const inicial = mundo()
    inicial.inventario.tomate = 5
    inicial.geladeiraPosta = true
    inicial.geladeira = {
      ganhoEm: agora.toISOString(),
      aparencia: null,
      aparencias: [],
      guardado: { alface: 3 },
    }
    const lista: CartaoDaRotina[] = [
      ...colherTudo,
      { c: 'voar-ate', a: 'geladeira' },
      { c: 'guardar' },
    ]
    const r = rodarRotina('buzio', lista, inicial, agora, cartas)
    expect(r.erro).toBeNull()
    expect(r.salvamento.inventario.tomate).toBe(16)
    expect(r.salvamento.geladeira?.guardado).toEqual({ alface: 3, tomate: 1 })
    expect(r.salvamento.inventario['semente-tomate']).toBe(4)
    const novamente = rodarRotina('buzio', lista, r.salvamento, agora, cartas)
    expect(novamente.salvamento).toEqual(r.salvamento)
  })

  test('cancelar depois de colher mantém comida e sementes, sem carga órfã', () => {
    const e = comecarExecucao('pluma', colherTudo)
    let s = mundo()
    while (proximoPasso(e, s, agora.getTime())) {
      s = aplicarPasso(e, s, agora).salvamento
      if (e.passo.tipo === 'colher') break
    }
    expect(e.carga.tomate).toBe(3)
    expect(s.inventario).toEqual({ tomate: 3, 'semente-tomate': 1 })
    expect(terminarExecucao(e, s).salvamento).toBe(s)
    expect(e.carga).toEqual({})
    expect(terminarExecucao(e, s).salvamento).toBe(s)
  })

  for (const lumi of LUMIS)
    test(`${lumi}: prévia inteira e passos do mundo produzem o mesmo estado`, () => {
      const inicial = mundo()
      const esperado = rodarRotina(lumi, colherTudo, inicial, agora, cartas)
      const e = comecarExecucao(lumi, colherTudo)
      let atual = inicial
      const registro: string[] = []
      for (
        let p = proximoPasso(e, atual, agora.getTime());
        p;
        p = proximoPasso(e, atual, agora.getTime())
      ) {
        const r = aplicarPasso(e, atual, agora)
        atual = r.salvamento
        registro.push(r.texto)
      }
      const fim = terminarExecucao(e, atual)
      if (fim.texto) registro.push(fim.texto)
      expect(atual).toEqual(esperado.salvamento)
      expect(registro).toEqual(esperado.registro)
      const colhidos = atual.inventario.tomate ?? 0
      expect(colhidos + atual.horta.filter((c) => c.semente).length * 3).toBe(12)
      expect(colhidos).toBeLessThanOrEqual(PERFIS_DOS_LUMIS[lumi].carga)
    })
})
