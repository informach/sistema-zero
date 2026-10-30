import { expect, test } from 'bun:test'
import {
  colher,
  criarSalvamentoInicial,
  ilha,
  type Semente,
} from '@sistemazero/arquipelago-contracts'
import { contextoDaColheita } from '../src/sistemas/colheita'
import { mundoDaRotina, rodarRotina } from '../src/sistemas/rotina'

const agora = new Date('2026-10-29T12:00:00Z')
test('clima só bonifica depois das Nuvens; necessidades e contexto vêm do estado atual', () => {
  const s = criarSalvamentoInicial(agora)
  const abre = ilha('nuvens').posicao
  expect(contextoDaColheita(s, abre - 1).clima).toBeNull()
  expect(contextoDaColheita(s, abre).clima).toBe(s.clima)
  expect(mundoDaRotina(s, abre).colheita).toEqual(contextoDaColheita(s, abre))
  const antes = structuredClone(s)
  const previa = structuredClone(mundoDaRotina(s, abre))
  s.clima = 'chuva'
  s.necessidades.fome = 50
  expect(previa.colheita).toEqual(contextoDaColheita(antes, abre))
  expect(mundoDaRotina(s, abre).colheita).toEqual(contextoDaColheita(s, abre))
})

test('adaptador do jogo aplica o mesmo rendimento da mão e não reaplica a colheita', () => {
  for (const [semente, clima] of [
    ['alface', 'nublado'],
    ['tomate', 'sol'],
    ['milho', 'chuva'],
  ] as const) {
    for (const jornada of [2, 7]) {
      const s = criarSalvamentoInicial(agora)
      s.clima = clima
      s.horta = [
        {
          id: 'c0',
          semente: semente as Semente,
          plantadoEm: '2026-10-28T10:00:00Z',
          regadoEm: '2026-10-28T10:00:00Z',
        },
      ]
      s.inventario = {}
      const rotina = [
        { c: 'quando-amanhecer' as const },
        { c: 'voar-ate' as const, a: 'horta' as const },
        { c: 'colher' as const },
      ]
      const esperado = colher(s.horta[0]!, agora.getTime(), contextoDaColheita(s, jornada))
      const r = rodarRotina('pluma', rotina, s, agora, null, jornada)
      expect(r.erro).toBeNull()
      expect(r.salvamento.inventario[semente]).toBe(esperado?.qtd)
      expect(r.salvamento.inventario[`semente-${semente}`]).toBe(1)
      expect(rodarRotina('pluma', rotina, r.salvamento, agora, null, jornada).salvamento).toBe(
        r.salvamento,
      )
      expect(s.horta[0]?.semente).toBe(semente)
    }
  }
})
