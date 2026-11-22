import { expect, test } from 'bun:test'
import type { ComandoDeCenario } from '@sistemazero/molda-cenarios-core/v2'
import { CenariosService } from '../../src/application/cenarios/cenarios.service'
import type { Ator } from '../../src/domain/cenarios/cenarios'
import { CenarioRegioesDesligadasError } from '../../src/domain/cenarios/cenarios.errors'
import { CenariosEmMemoria } from '../fakes/cenarios-in-memory'

/**
 * O interruptor `CENARIOS_REGIOES` (lote 5 da conclusão, 22/11/2026): os leitores das regiões (o
 * Estúdio, o motor dos cenários e a imagem do studio-runtime) chegam antes do escritor. Desligado,
 * nenhum lote mexe no campo, nem o desfazer; e o `/acesso` diz se a ferramenta vale.
 */
const CONTA = '11111111-1111-4111-8111-111111111111'
const equipe: Ator = { usuarioId: CONTA, contaId: CONTA, equipe: true, suporte: false }

const vila: ComandoDeCenario = {
  tipo: 'regiao.definir',
  regiao: {
    id: 'vila',
    nome: 'Vila',
    caixa: { x0: -100, z0: -100, x1: 0, z1: 0 },
    vizinhas: [],
  },
}

async function cenarioCom(regioes: boolean) {
  let n = 0
  const servico = new CenariosService(
    new CenariosEmMemoria(),
    () => new Date('2026-11-22T12:00:00Z'),
    { modo: 'equipe', lista: new Set(), regioes },
    () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
  )
  const [espaco] = await servico.espacos(equipe)
  const mundo = await servico.criarMundo(equipe, espaco!.id, 'Ilha')
  const cenario = await servico.criarCenario(equipe, mundo.id, 'Praia')
  return { servico, id: cenario.id }
}

test('desligado: criar uma região é 403, e o resto do cenário segue editável', async () => {
  const { servico, id } = await cenarioCom(false)
  await expect(
    servico.editarCenario(equipe, id, {
      revisaoEsperada: 0,
      comandos: [vila],
      operacaoId: 'op-1',
    }),
  ).rejects.toBeInstanceOf(CenarioRegioesDesligadasError)
  expect(
    await servico.editarCenario(equipe, id, {
      revisaoEsperada: 0,
      comandos: [{ tipo: 'cenario.renomear', nome: 'Praia nova' }],
      operacaoId: 'op-2',
    }),
  ).toEqual({ revisao: 1 })
})

test('ligado: a região entra no documento, e o /acesso diz que a ferramenta vale', async () => {
  const { servico, id } = await cenarioCom(true)
  expect(
    await servico.editarCenario(equipe, id, {
      revisaoEsperada: 0,
      comandos: [vila],
      operacaoId: 'op-1',
    }),
  ).toEqual({ revisao: 1 })
  expect(await servico.acesso(equipe)).toEqual({ aberto: true, regioes: true })
  const desligado = await cenarioCom(false)
  expect(await desligado.servico.acesso(equipe)).toEqual({ aberto: true, regioes: false })
})
