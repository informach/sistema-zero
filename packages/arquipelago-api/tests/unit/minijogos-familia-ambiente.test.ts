import { expect, mock, test } from 'bun:test'
import type { MinijogoAberto, PedirAmbienteDoDesafio } from '@sistemazero/arquipelago-contracts'
import { ServicoDosMinijogos } from '../../src/application/servico-dos-minijogos'
import type { Jogador } from '../../src/domain/jogador'
import type { RepositorioDosMinijogos } from '../../src/domain/minijogos.port'
import { rotasDosMinijogos } from '../../src/interfaces/http/rotas-dos-minijogos'

const perfil = '11111111-1111-4111-8111-111111111111'
const conta = '22222222-2222-4222-8222-222222222222'
const desafio = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const pedido: PedirAmbienteDoDesafio = { revisao: 7, pedido: { ambiente: 'teste' } }
const responsavel = { contaId: conta, equipe: false, somenteLeitura: false }
const salvo: MinijogoAberto = {
  desafioId: desafio,
  titulo: 'Jogo de teste',
  capa: null,
  aprovadoEm: '2026-10-31T12:00:00Z',
  atualizadoEm: '2026-10-31T12:00:00Z',
  revisao: 7,
  projeto: { programmingLanguage: 'python' },
}
function montar(options: { pertence?: boolean; salvo?: MinijogoAberto | null } = {}) {
  const autorizar = mock(
    async (jogador: Jogador, id: string, recebido: PedirAmbienteDoDesafio) => ({
      jogador,
      id,
      recebido,
    }),
  )
  const repo: RepositorioDosMinijogos = {
    guardar: async () => {
      throw Error('A prévia não pode gravar')
    },
    listar: async () => [],
    abrir: async () => (options.salvo === undefined ? salvo : options.salvo),
    pertenceAConta: async (id, account) =>
      options.pertence !== false && id === perfil && account === conta,
  }
  const service = new ServicoDosMinijogos(
    repo,
    { modo: 'aberto', publicos: new Set(['kids']), lista: new Set() },
    autorizar,
  )
  return { service, autorizar }
}
test('responsável autoriza só a cópia aprovada do perfil da família, em leitura', async () => {
  const { service, autorizar } = montar()
  await service.ambienteDaFamilia(responsavel, perfil, desafio, pedido)
  expect(autorizar).toHaveBeenCalledTimes(1)
  expect(autorizar.mock.calls[0]).toEqual([
    { id: perfil, contaId: conta, publico: 'kids', equipe: false, somenteLeitura: true },
    desafio,
    pedido,
  ])
})
test('outra conta, jogo ausente, revisão antiga e JavaScript não chegam ao autorizador', async () => {
  for (const options of [
    { pertence: false },
    { salvo: null },
    { salvo: { ...salvo, revisao: 6 } },
    { salvo: { ...salvo, projeto: { formatVersion: 2 } } },
  ]) {
    const { service, autorizar } = montar(options)
    await expect(
      service.ambienteDaFamilia(responsavel, perfil, desafio, pedido),
    ).rejects.toBeInstanceOf(Error)
    expect(autorizar).not.toHaveBeenCalled()
  }
})

test('HTTP exige gateway, conta de responsável, ids e pedido válido antes de autorizar', async () => {
  const { service, autorizar } = montar()
  const app = rotasDosMinijogos({ minijogos: service, tokenInterno: 'token-local-de-teste' })
  const path = `http://local/arquipelago/familia/minijogos/${perfil}/${desafio}/ambiente`
  const headers = {
    'content-type': 'application/json',
    'x-internal-token': 'token-local-de-teste',
    'x-auth-user-id': conta,
    'x-auth-user-role': 'student',
    'x-auth-user-status': 'active',
    'x-auth-kids-context': 'parent',
  }
  const post = (url: string, body: unknown, extra: Record<string, string> = {}) =>
    new Request(url, {
      method: 'POST',
      headers: { ...headers, ...extra },
      body: JSON.stringify(body),
    })
  const response = await app.handle(post(path, pedido))
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  for (const request of [
    post(path, pedido, { 'x-internal-token': 'errado' }),
    post(path, pedido, { 'x-auth-kids-context': 'student' }),
    post(path, { revisao: 7, pedido: [] }),
    post(path.replace(perfil, 'invalido'), pedido),
    post(path.replace(perfil, desafio), pedido),
    post(path, { ...pedido, revisao: 6 }),
  ]) {
    expect((await app.handle(request)).status).not.toBe(200)
  }
  expect(autorizar).toHaveBeenCalledTimes(1)
})
