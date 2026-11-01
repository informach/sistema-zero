import { expect, test } from 'bun:test'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { ServicoDoJogo } from '../../src/application/servico-do-jogo'
import type { Jogador } from '../../src/domain/jogador'
import { RepositorioEmMemoria } from '../fakes/memoria'

/**
 * Os dias de jogo do adulto (lacunas, 01/11/2026): abrir e gravar o jogo marcam o dia de São Paulo
 * do adulto. O Kids já mede pelo tempo do dia, e o suporte só olha.
 */
const politica = {
  modo: 'aberto' as const,
  publicos: new Set(['kids' as const, 'adulto' as const]),
  lista: new Set<string>(),
}
const adulto: Jogador = {
  id: '11111111-1111-4111-8111-111111111111',
  publico: 'adulto',
  contaId: null,
  equipe: false,
  somenteLeitura: false,
}
const crianca: Jogador = {
  id: '22222222-2222-4222-8222-222222222222',
  publico: 'kids',
  contaId: '33333333-3333-4333-8333-333333333333',
  equipe: false,
  somenteLeitura: false,
}

test('abrir e gravar marcam o dia do adulto; o Kids e o suporte não', async () => {
  // 02h de 01/11 em UTC ainda é 31/10 em São Paulo.
  const agora = new Date('2026-11-01T02:00:00Z')
  const repo = new RepositorioEmMemoria()
  const servico = new ServicoDoJogo(repo, politica, () => agora)
  await servico.lerSalvamento(adulto)
  await servico.gravarSalvamento(adulto, {
    revisaoBase: 0,
    salvamento: criarSalvamentoInicial(agora),
  })
  expect(repo.diasDeJogo).toEqual([
    { jogadorId: adulto.id, dia: '2026-10-31' },
    { jogadorId: adulto.id, dia: '2026-10-31' },
  ])
  await servico.lerSalvamento(crianca)
  await servico.gravarSalvamento(crianca, {
    revisaoBase: 0,
    salvamento: criarSalvamentoInicial(agora),
  })
  await servico.lerSalvamento({ ...adulto, somenteLeitura: true })
  expect(repo.diasDeJogo).toHaveLength(2)
})
