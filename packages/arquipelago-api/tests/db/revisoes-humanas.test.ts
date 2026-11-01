import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import type { ConteudoDoDesafio } from '@sistemazero/arquipelago-contracts'
import { createLogger } from '@sistemazero/core/logging'
import { RevisaoMudouError, SomenteLeituraError } from '../../src/application/erros'
import { LeiturasDosMembros } from '../../src/application/leituras-dos-membros'
import { ServicoDasRevisoesHumanas } from '../../src/application/servico-das-revisoes-humanas'
import { ServicoDosDesafios } from '../../src/application/servico-dos-desafios'
import type { Jogador } from '../../src/domain/jogador'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleRepositorioDosMinijogos } from '../../src/infrastructure/persistence/drizzle/repositorio-minijogos'
import { DrizzleRepositorioDasRevisoesHumanas } from '../../src/infrastructure/persistence/drizzle/repositorio-revisoes-humanas'
import { rotasDasRevisoesHumanas } from '../../src/interfaces/http/rotas-das-revisoes-humanas'
import { migrarBancoDeTeste } from '../fakes/banco-migrado'
import { JogadorNosDesafiosEmMemoria } from '../fakes/desafios'
import { membrosDeMentira } from '../fakes/membros'

/**
 * A Lenda (lacunas, 01/11/2026): a versão 2 vale o extra só num envio mudado depois da aprovação,
 * e cada envio aprovado entra na fila da revisão humana, que a equipe responde com a trava do envio.
 */
const url = process.env.ARQUIPELAGO_MINIJOGOS_TEST_DATABASE_URL
if (url) {
  const u = new URL(url)
  if (
    !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) ||
    !u.pathname.startsWith('/arquipelago_test')
  )
    throw new Error('Só banco local descartável')
}
const perfil = '11111111-1111-4111-8111-111111111111'
const conta = '22222222-2222-4222-8222-222222222222'
const professora = '33333333-3333-4333-8333-333333333333'
const desafioId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const politica = {
  modo: 'aberto' as const,
  publicos: new Set(['kids' as const]),
  lista: new Set<string>(),
}
const jogador: Jogador = {
  id: perfil,
  contaId: conta,
  publico: 'kids',
  // A régua da equipe abre o Farol sem ler o Members (a régua não é o que se testa aqui).
  equipe: true,
  somenteLeitura: false,
}
const equipe = { id: professora, podeEscrever: false, podeRevisar: true }
const agora = new Date('2026-11-01T12:00:00Z')
const conteudo: ConteudoDoDesafio = {
  versao: 1,
  titulo: 'Meu jogo do Arquipélago',
  enunciado: 'Faça o seu jogo.',
  dicas: [],
  projetoInicial: { files: {} },
  gabarito: { files: {} },
  objetivos: [{ id: 'joga', label: 'Joga', rule: { type: 'usesBlock' } }],
  recompensa: {
    cor: false,
    moedas: 20,
    moedasExtra: 10,
    atracao: 'meu-jogo-do-arquipelago',
    extraNaVersao2: true,
    revisaoHumana: true,
  },
  blocosManuais: { acrescentar: [], retirar: [] },
}
/** O erro de uma promessa que precisa falhar (sem ele, o teste falha). */
async function falha(p: Promise<unknown>): Promise<unknown> {
  try {
    await p
  } catch (e) {
    return e
  }
  throw new Error('Era para falhar')
}
const projeto = (texto: string, x = 1) => ({
  name: 'Meu jogo',
  updatedAt: x,
  ir: { behavior: { start: [{ type: 'var', name: 'nome', value: texto, __id: `id-${x}` }] } },
})

describe.skipIf(!url)('Lenda: versão 2 e revisão humana no Postgres local descartável', () => {
  let conexao: DbConnection
  let revisoes: DrizzleRepositorioDasRevisoesHumanas
  let minijogos: DrizzleRepositorioDosMinijogos
  let desafios: ServicoDosDesafios
  let sala: ServicoDasRevisoesHumanas
  let passar = true
  let relogio = agora
  beforeAll(async () => {
    conexao = createDbConnection(url!)
    await migrarBancoDeTeste(conexao)
    revisoes = new DrizzleRepositorioDasRevisoesHumanas(conexao.db)
    minijogos = new DrizzleRepositorioDosMinijogos(conexao.db)
  })
  afterAll(async () => {
    if (conexao) await conexao.sql`delete from arquipelago.desafios where id = ${desafioId}`
    await conexao?.close()
  })
  beforeEach(async () => {
    await conexao.sql`truncate arquipelago.minijogos, arquipelago.revisoes_humanas`
    await conexao.sql`delete from arquipelago.desafios where id = ${desafioId}`
    // A fila aponta para o desafio do cadastro (a chave estrangeira apaga a fila com ele).
    await conexao.sql`
      insert into arquipelago.desafios
        (id, slug, publico, ilha, tipo, quadro, ordem, situacao, revisao, revisao_publicada,
         metadados_publicados, conteudo, criado_em, atualizado_em, atualizado_por)
      values (${desafioId}, 'farol-lenda-teste', 'kids', 'farol', 'quadro-das-cores', 1, 10,
        'publicado', 1, 1, ${JSON.stringify({ ilha: 'farol' })}::jsonb,
        ${JSON.stringify(conteudo)}::jsonb, now(), now(), ${professora})`
    passar = true
    relogio = agora
    const memoria = new JogadorNosDesafiosEmMemoria()
    memoria.desafios.set(desafioId, {
      id: desafioId,
      situacao: 'publicado',
      metadados: {
        publico: 'kids',
        ilha: 'farol',
        tipo: 'quadro-das-cores',
        quadro: 1,
        ordem: 10,
        slug: 'farol-lenda-teste',
      },
      publicacoes: [
        {
          desafioId,
          revisao: 1,
          conteudo: structuredClone(conteudo),
          blocosExigidos: [],
          vista: [],
        },
      ],
    })
    const membros = membrosDeMentira({
      lerCurriculo: async () => ({ versao: 1, cursos: [], catalogo: [] }),
      verificarObjetivos: async () => ({
        passou: passar,
        resultados: [{ id: 'joga', passou: passar }],
      }),
    })
    desafios = new ServicoDosDesafios({
      politica,
      modo: 'aberto',
      repo: memoria,
      leituras: new LeiturasDosMembros(membros),
      membros,
      moedas: null,
      logger: createLogger({ level: 'error' }),
      minijogos,
      revisoes,
      agora: () => relogio,
    })
    sala = new ServicoDasRevisoesHumanas({
      repo: revisoes,
      minijogos,
      agora: () => relogio,
    })
  })
  const enviar = async (p: unknown) => {
    relogio = new Date(relogio.getTime() + 1000)
    return desafios.verificar(jogador, desafioId, { revisao: 1, projeto: p })
  }

  test('a primeira aprovação não é a versão 2; reenviar igual também não; mudar o jogo, sim', async () => {
    const primeira = await enviar(projeto('estrela'))
    expect(primeira.concluidoAgora).toBe(true)
    expect(primeira.extraAgora).toBe(false)
    // Mesmo jogo: outro id de bloco e outro carimbo não mudam o jogo, nem voltam à fila.
    expect((await enviar(projeto('estrela', 2))).extraAgora).toBe(false)
    expect((await revisoes.daPessoa(perfil)).get(desafioId)?.envio).toBe(1)
    const segunda = await enviar(projeto('estrela e pedras', 3))
    expect(segunda.extraAgora).toBe(true)
    // Uma vez só.
    expect((await enviar(projeto('outra ideia', 4))).extraAgora).toBe(false)
  })

  test('reprovado não entra na fila nem conta como versão 2', async () => {
    passar = false
    expect((await enviar(projeto('estrela'))).passou).toBe(false)
    expect((await revisoes.daPessoa(perfil)).get(desafioId)).toBeUndefined()
    passar = true
    await enviar(projeto('estrela'))
    passar = false
    expect((await enviar(projeto('mudou', 2))).extraAgora).toBe(false)
  })

  test('cada envio aprovado volta à fila; a resposta trava no envio e o retorno fica guardado', async () => {
    await enviar(projeto('estrela'))
    const fila = (await sala.fila(equipe, 'aguardando')).revisoes
    expect(fila).toHaveLength(1)
    expect(fila[0]).toMatchObject({ jogadorId: perfil, desafioId, envio: 1, estado: 'aguardando' })
    const aberta = await sala.abrir(equipe, perfil, desafioId)
    expect(aberta.projeto).toEqual(projeto('estrela'))

    // A pessoa mandou uma versão nova antes da resposta: responder ao envio 1 é 409.
    await enviar(projeto('estrela e pedras', 2))
    expect(
      await falha(
        sala.responder(equipe, perfil, desafioId, {
          envio: 1,
          estado: 'nova-tentativa',
          retorno: 'Faça a pedra cair mais devagar.',
        }),
      ),
    ).toBeInstanceOf(RevisaoMudouError)

    const r = await sala.responder(equipe, perfil, desafioId, {
      envio: 2,
      estado: 'nova-tentativa',
      retorno: 'Faça a pedra cair mais devagar.',
    })
    expect(r.revisao).toMatchObject({ estado: 'nova-tentativa', envio: 2 })
    expect((await revisoes.daPessoa(perfil)).get(desafioId)).toMatchObject({
      estado: 'nova-tentativa',
      retorno: 'Faça a pedra cair mais devagar.',
    })
    expect((await sala.fila(equipe, 'aguardando')).revisoes).toEqual([])

    // Nova tentativa: volta a aguardar, com o retorno anterior à vista.
    await enviar(projeto('pedras mais lentas', 3))
    expect((await revisoes.daPessoa(perfil)).get(desafioId)).toMatchObject({
      estado: 'aguardando',
      envio: 3,
      retorno: 'Faça a pedra cair mais devagar.',
    })
    await sala.responder(equipe, perfil, desafioId, {
      envio: 3,
      estado: 'conferido',
      retorno: 'Ficou ótimo. As pedras agora dão tempo de pular.',
    })
    // A pessoa vê o estado e o retorno na lista de desafios.
    const lista = await desafios.listar(jogador)
    expect(lista.desafios.find((d) => d.id === desafioId)?.revisaoHumana).toMatchObject({
      estado: 'conferido',
      retorno: 'Ficou ótimo. As pedras agora dão tempo de pular.',
    })
  })

  test('sessão de suporte só lê; outra pessoa não vê a revisão; as rotas pedem gateway e equipe', async () => {
    await enviar(projeto('estrela'))
    expect(
      await falha(
        sala.responder({ ...equipe, podeRevisar: false }, perfil, desafioId, {
          envio: 1,
          estado: 'conferido',
          retorno: 'Ok.',
        }),
      ),
    ).toBeInstanceOf(SomenteLeituraError)
    expect((await revisoes.daPessoa(conta)).size).toBe(0)

    const app = rotasDasRevisoesHumanas({ revisoes: sala, tokenInterno: 'local' })
    const daCrianca = {
      'x-internal-token': 'local',
      'x-auth-user-id': perfil,
      'x-auth-account-id': conta,
      'x-auth-user-role': 'member',
      'x-auth-user-status': 'active',
    }
    const daEquipe = {
      'x-internal-token': 'local',
      'x-auth-user-id': professora,
      'x-auth-user-role': 'staff',
      'x-auth-user-status': 'active',
    }
    const pedir = (caminho: string, headers: Record<string, string>, init?: RequestInit) =>
      app.handle(new Request(`http://local/arquipelago${caminho}`, { ...init, headers }))
    expect((await pedir('/admin/revisoes?estado=aguardando', daEquipe)).status).toBe(200)
    // A criança não lê a fila; sem o token do gateway, ninguém lê.
    expect((await pedir('/admin/revisoes', daCrianca)).status).not.toBe(200)
    expect(
      (await pedir('/admin/revisoes', { ...daEquipe, 'x-internal-token': 'x' })).status,
    ).not.toBe(200)
    const resposta = await pedir(
      `/admin/revisoes/${perfil}/${desafioId}`,
      {
        ...daEquipe,
        'content-type': 'application/json',
      },
      {
        method: 'POST',
        body: JSON.stringify({ envio: 1, estado: 'conferido', retorno: 'Muito bem.' }),
      },
    )
    expect(resposta.status).toBe(200)
  })
})
