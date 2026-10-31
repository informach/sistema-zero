import { expect, test } from 'bun:test'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'
import { falaDasRoupasNovas, nomeDaPeca, ROUPAS_DA_AMIZADE } from '../src/sistemas/roupas'

/** As roupas conquistadas no jogo (§6.28, A21). */

test('a fala conta o presente da amizade e as roupas da festa, nas regras da criança', () => {
  expect(nomeDaPeca('hat-04')).toBe('Chapéu 4')
  expect(falaDasRoupasNovas([], null)).toBeNull()
  expect(falaDasRoupasNovas([ROUPAS_DA_AMIZADE.jade], null)).toBe(
    'Roupa nova no seu avatar: chapéu 4, presente da amizade com a Jade.',
  )
  expect(falaDasRoupasNovas(['top-06', 'enfeite-01'], 'junina')).toBe(
    'Roupas da Festa Junina no seu avatar: camiseta listrada e laço. Elas continuam suas depois da festa.',
  )
  expect(falaDasRoupasNovas(['face-08'], 'carnaval')).toContain('Roupas do Carnaval')
  for (const t of [
    falaDasRoupasNovas([ROUPAS_DA_AMIZADE.nico, 'acc-10'], 'fim-de-ano')!,
    falaDasRoupasNovas([ROUPAS_DA_AMIZADE.capi], null)!,
  ]) {
    expect(t).not.toMatch(/[—!]/)
  }
})

test('o playground concede uma vez o que o salvamento conquistou', async () => {
  const agora = () => new Date('2026-10-31T12:00:00Z')
  const p = criarPlataformaFalsa({ persistir: false, posicao: 8, agora })
  const s = criarSalvamentoInicial(agora())
  s.moradores.jade.amizade = 300
  expect(
    (
      await p.servico.buscar('/salvamento', {
        metodo: 'PUT',
        corpo: { revisaoBase: 0, salvamento: s },
      })
    ).status,
  ).toBe(200)
  const primeira = await p.servico.buscar('/roupas/sincronizar', { metodo: 'POST', corpo: {} })
  expect(primeira.corpo).toEqual({ versao: 1, novas: [ROUPAS_DA_AMIZADE.jade] })
  const segunda = await p.servico.buscar('/roupas/sincronizar', { metodo: 'POST', corpo: {} })
  expect(segunda.corpo).toEqual({ versao: 1, novas: [] })
})
