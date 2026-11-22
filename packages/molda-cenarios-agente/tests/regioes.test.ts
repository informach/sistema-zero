import { expect, test } from 'bun:test'
import { criarHostEmMemoria } from '@sistemazero/molda-cenarios/oficina/host-memoria'
import { FERRAMENTAS } from '../src/oficina/ferramentas'
import { criarIntencoes } from '../src/oficina/intencoes'

/**
 * As ferramentas de regiões do agente (lote 7 da conclusão, 22/11/2026): desenhar pelo nome, com
 * as vizinhas em par, listar e apagar, cada uma um passo de desfazer, com os recados do núcleo.
 * As intenções são chamadas direto: o host em memória não usa UUID, que a entrada das ferramentas
 * exige.
 */
async function cenarioVazio() {
  const host = criarHostEmMemoria()
  const mundo = await host.criarMundo('conta', 'Mundo das regiões')
  const cenario = await host.criarCenario(mundo.id, 'Campo')
  return { host, a: criarIntencoes(host), id: cenario.id }
}

test('desenhar, redesenhar pelo nome, listar e apagar, com as vizinhas em par', async () => {
  const { host, a, id } = await cenarioVazio()
  const passos = async () => (await host.abrirCenario(id)).historico.desfazer
  const vila = await a.desenharRegiao(id, { nome: 'Vila', x0: -10, z0: -10, x1: 0, z1: 10 })
  expect(vila.criados).toHaveLength(1)
  await a.desenharRegiao(id, {
    nome: 'Floresta',
    x0: 10,
    z0: -10,
    x1: 0,
    z1: 10,
    vizinhas: ['vila'],
  })
  expect(await passos()).toBe(2)
  expect(await a.listarRegioes(id)).toMatchObject({
    regioes: [
      { nome: 'Vila', vizinhas: ['Floresta'] },
      { nome: 'Floresta', caixa: { x0: 0, z0: -10, x1: 10, z1: 10 }, vizinhas: ['Vila'] },
    ],
  })
  // Redesenhar pelo nome mantém o id e as vizinhas, e não cria nada.
  const redesenho = await a.desenharRegiao(id, { nome: 'vila', x0: -8, z0: -10, x1: 0, z1: 10 })
  expect(redesenho.criados).toEqual([])
  const doc = (await host.abrirCenario(id)).documento
  expect(doc.regioes?.[0]).toMatchObject({ id: vila.criados[0], vizinhas: [doc.regioes?.[1]?.id] })
  expect(doc.regioes?.[0]?.caixa.x0).toBe(-8)
  // Apagar tira a região e a vizinhança do outro lado.
  await a.apagarRegiao(id, 'Floresta')
  const depois = (await host.abrirCenario(id)).documento.regioes
  expect(depois?.map((r) => [r.nome, r.vizinhas])).toEqual([['Vila', []]])
  expect(await passos()).toBe(4)
})

test('sobreposição e vizinha desconhecida voltam com o recado, sem gravar', async () => {
  const { host, a, id } = await cenarioVazio()
  await a.desenharRegiao(id, { nome: 'Vila', x0: -10, z0: -10, x1: 0, z1: 10 })
  const recado = async (pedido: Parameters<typeof a.desenharRegiao>[1]) => {
    try {
      await a.desenharRegiao(id, pedido)
      return ''
    } catch (erro) {
      return erro instanceof Error ? `${erro.message} ${JSON.stringify(erro)}` : String(erro)
    }
  }
  expect(await recado({ nome: 'Praia', x0: -5, z0: -5, x1: 5, z1: 5 })).toContain('se sobrepõem')
  expect(
    await recado({ nome: 'Lago', x0: 0, z0: -10, x1: 10, z1: 10, vizinhas: ['Caverna'] }),
  ).toContain('Não achei a região Caverna')
  expect((await host.abrirCenario(id)).documento.regioes).toHaveLength(1)
})

test('as três ferramentas existem, com nomes distintos do consultar_regiao', () => {
  const nomes = FERRAMENTAS.map((f) => f.name)
  for (const nome of ['desenhar_regiao', 'apagar_regiao', 'listar_regioes', 'consultar_regiao'])
    expect(nomes).toContain(nome)
})
