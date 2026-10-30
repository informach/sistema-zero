import { expect, test } from 'bun:test'
import {
  colher,
  criarSalvamentoInicial,
  ilha,
  type Semente,
} from '@sistemazero/arquipelago-contracts'
import { climaNatural } from '../src/sistemas/clima'
import { contextoDaColheita } from '../src/sistemas/colheita'
import { mundoDaRotina, rodarRotina } from '../src/sistemas/rotina'
import { momentoDoDia } from '../src/sistemas/tempo-do-dia'

const agora = new Date('2026-10-29T12:00:00Z')
test('antes das Nuvens vale o clima natural do dia; depois, o escolhido', () => {
  const s = criarSalvamentoInicial(agora)
  const abre = ilha('nuvens').posicao
  // Antes das Nuvens, a escolha guardada não vale: vale o clima natural do dia do jogo.
  s.clima = 'chuva'
  const dia = momentoDoDia(agora.getTime(), Date.parse(s.criadoEm)).dia
  expect(contextoDaColheita(s, abre - 1, agora.getTime()).clima).toBe(climaNatural(dia))
  s.clima = 'sol'
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
      const esperado = colher(
        s.horta[0]!,
        agora.getTime(),
        contextoDaColheita(s, jornada, agora.getTime()),
      )
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
