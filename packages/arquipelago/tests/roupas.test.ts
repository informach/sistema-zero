import { expect, test } from 'bun:test'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'
import { falaDasRoupasNovas, nomeDaPeca, ROUPAS_DA_AMIZADE } from '../src/sistemas/roupas'

/** As roupas conquistadas no jogo (§6.28, A21). */

test('a fala conta o presente da amizade e as roupas da festa, nas regras da criança', () => {
  expect(nomeDaPeca('chapeu_capacete_mineiro_pacote')).toBe('Capacete de mineiro')
  expect(nomeDaPeca('nao-existe')).toBe('nao-existe')
  expect(falaDasRoupasNovas([], null)).toBeNull()
  expect(falaDasRoupasNovas([ROUPAS_DA_AMIZADE.jade], null)).toBe(
    'Roupa nova no seu avatar: capacete de mineiro, presente da amizade com a Jade.',
  )
  expect(
    falaDasRoupasNovas(['chapeu_palha_fita_pacote', 'roupa_inteira_vestido_chita'], 'junina'),
  ).toBe(
    'Roupas da Festa Junina no seu avatar: chapéu de palha com fita e vestido de chita. Elas continuam suas depois da festa.',
  )
  expect(falaDasRoupasNovas(['chapeu_cartola_colorida_pacote'], 'carnaval')).toContain(
    'Roupas do Carnaval',
  )
  for (const t of [
    falaDasRoupasNovas([ROUPAS_DA_AMIZADE.nico, 'roupa_cima_sueter_estrela'], 'fim-de-ano')!,
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
