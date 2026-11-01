import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { type ConteudoDoDesafio, LIMITES_DO_DESAFIO } from '@sistemazero/arquipelago-contracts'
import { createLogger } from '@sistemazero/core/logging'
import { LeiturasDosMembros } from '../../src/application/leituras-dos-membros'
import { ServicoDosDesafios } from '../../src/application/servico-dos-desafios'
import { ServicoDosMinijogos } from '../../src/application/servico-dos-minijogos'
import type { Jogador } from '../../src/domain/jogador'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleRepositorioDaMedicao } from '../../src/infrastructure/persistence/drizzle/repositorio-medicao'
import { DrizzleRepositorioDosMinijogos } from '../../src/infrastructure/persistence/drizzle/repositorio-minijogos'
import { perfisDaConta } from '../../src/infrastructure/persistence/drizzle/schema'
import { rotasDosMinijogos } from '../../src/interfaces/http/rotas-dos-minijogos'
import { migrarBancoDeTeste } from '../fakes/banco-migrado'
import { JogadorNosDesafiosEmMemoria } from '../fakes/desafios'
import { membrosDeMentira } from '../fakes/membros'

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
const desafioId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const politica = {
  modo: 'aberto' as const,
  publicos: new Set(['kids' as const]),
  lista: new Set<string>(),
}
const jogador: Jogador = {
  id: perfil,
  contaId: conta,
  publico: 'kids',
  equipe: true,
  somenteLeitura: false,
}
const agora = new Date('2026-10-29T12:00:00Z')
const conteudo: ConteudoDoDesafio = {
  versao: 1,
  titulo: 'Corrida dos bichos',
  enunciado: 'Faça a corrida.',
  dicas: [],
  projetoInicial: { files: {} },
  gabarito: { segredo: 'nao-copiar' },
  objetivos: [{ id: 'correr', label: 'Corre', rule: { type: 'usesBlock' } }],
  recompensa: { cor: true, moedas: 0, moedasExtra: 0, atracao: 'corrida' },
  blocosManuais: { acrescentar: [], retirar: [] },
}

describe.skipIf(!url)('minijogos no serviço e Postgres local descartável', () => {
  let conexao: DbConnection
  let repo: DrizzleRepositorioDosMinijogos
  let servico: ServicoDosDesafios
  let passar = true
  let relogio = agora
  let c: ConteudoDoDesafio
  beforeAll(async () => {
    conexao = createDbConnection(url!)
    await migrarBancoDeTeste(conexao)
    repo = new DrizzleRepositorioDosMinijogos(conexao.db)
  })
  afterAll(async () => {
    await conexao?.close()
  })
  beforeEach(async () => {
    await conexao.sql`truncate arquipelago.minijogos, arquipelago.perfis_da_conta`
    await conexao.sql`delete from arquipelago.desafios where id = ${desafioId}`
    c = structuredClone(conteudo)
    passar = true
    relogio = agora
    const desafios = new JogadorNosDesafiosEmMemoria()
    desafios.desafios.set(desafioId, {
      id: desafioId,
      situacao: 'publicado',
      metadados: {
        publico: 'kids',
        ilha: 'bosque',
        tipo: 'quadro-das-cores',
        quadro: 1,
        ordem: 0,
        slug: 'corrida',
      },
      publicacoes: [{ desafioId, revisao: 1, conteudo: c, blocosExigidos: [], vista: [] }],
    })
    const membros = membrosDeMentira({
      verificarObjetivos: async () => ({
        passou: passar,
        resultados: [{ id: 'correr', passou: passar }],
      }),
    })
    servico = new ServicoDosDesafios({
      politica,
      modo: 'aberto',
      repo: desafios,
      leituras: new LeiturasDosMembros(membros),
      membros,
      moedas: null,
      logger: createLogger({ level: 'error' }),
      minijogos: repo,
      agora: () => relogio,
    })
  })
  test('aprovação congela o projeto enviado e nova aprovação substitui sem duplicar', async () => {
    const projeto = { name: 'Meu jogo', files: { 'script.js': 'primeira' } }
    expect((await servico.verificar(jogador, desafioId, { revisao: 1, projeto })).passou).toBe(true)
    projeto.files['script.js'] = 'rascunho'
    expect((await repo.abrir(perfil, desafioId))?.projeto).toEqual({
      name: 'Meu jogo',
      files: { 'script.js': 'primeira' },
    })
    relogio = new Date(agora.getTime() + 1000)
    await servico.verificar(jogador, desafioId, { revisao: 1, projeto })
    expect(await repo.listar(perfil)).toHaveLength(1)
    const salvo = await repo.abrir(perfil, desafioId)
    expect(salvo?.projeto).toEqual(projeto)
    expect(salvo?.aprovadoEm).toBe(agora.toISOString())
    expect(salvo?.atualizadoEm).toBe(relogio.toISOString())
    expect(JSON.stringify(salvo)).not.toContain('nao-copiar')
  })
  test('a lista diz a ilha publicada do desafio (B10); sem o desafio no banco, fica sem ilha', async () => {
    await servico.verificar(jogador, desafioId, { revisao: 1, projeto: {} })
    expect((await repo.listar(perfil))[0]?.ilha).toBeUndefined()
    expect((await repo.abrir(perfil, desafioId))?.revisao).toBeUndefined()
    await conexao.sql`
      insert into arquipelago.desafios
        (id, slug, publico, ilha, tipo, quadro, ordem, situacao, revisao, revisao_publicada,
         metadados_publicados, conteudo, criado_em, atualizado_em, atualizado_por)
      values (${desafioId}, 'corrida-b10', 'kids', 'bosque', 'quadro-das-cores', 1, 0, 'publicado',
        2, 1, ${JSON.stringify({ ilha: 'vila-doce' })}::jsonb, ${JSON.stringify(c)}::jsonb, now(), now(), ${perfil})`
    // A ilha publicada vale sobre a do rascunho.
    expect((await repo.listar(perfil))[0]?.ilha).toBe('vila-doce')
    // JavaScript mantém a resposta sem revisão, inclusive durante a troca dos apps.
    const javascript = await repo.abrir(perfil, desafioId)
    expect(javascript).not.toHaveProperty('revisao')
    const python = { programmingLanguage: 'python', files: { 'main.py': 'print(1)' } }
    await repo.guardar({ jogador, desafioId, titulo: c.titulo, projeto: python, agora })
    // Python e Pro precisam da revisão publicada para pedir o ambiente ou compilar a atração.
    expect((await repo.abrir(perfil, desafioId))?.revisao).toBe(1)
    expect((await repo.abrir(perfil, desafioId))?.projeto).toEqual(python)
    const pro = { kind: 'pro', programmingLanguage: 'javascript', tree: { version: 1, nodes: [] } }
    await repo.guardar({ jogador, desafioId, titulo: c.titulo, projeto: pro, agora })
    expect((await repo.abrir(perfil, desafioId))?.revisao).toBe(1)
    expect((await repo.abrir(perfil, desafioId))?.projeto).toEqual(pro)
    await conexao.sql`delete from arquipelago.desafios where id = ${desafioId}`
  })
  test('reprovado, sem atração e suporte não guardam cópia', async () => {
    passar = false
    await servico.verificar(jogador, desafioId, { revisao: 1, projeto: {} })
    passar = true
    await servico.verificar({ ...jogador, somenteLeitura: true }, desafioId, {
      revisao: 1,
      projeto: {},
    })
    delete c.recompensa.atracao
    await servico.verificar(jogador, desafioId, { revisao: 1, projeto: {} })
    expect(await repo.listar(perfil)).toEqual([])
  })
  test('teto é aplicado antes da gravação e no banco', async () => {
    let recusado = false
    try {
      await servico.verificar(jogador, desafioId, {
        revisao: 1,
        projeto: { texto: 'a'.repeat(LIMITES_DO_DESAFIO.projetoCaracteres) },
      })
    } catch {
      recusado = true
    }
    expect(recusado).toBe(true)
    let bancoRecusou = false
    try {
      await conexao.sql`insert into arquipelago.minijogos (jogador_id,desafio_id,publico,titulo,projeto,aprovado_em,atualizado_em) values (${perfil},${desafioId},'kids','Teste',${'a'.repeat(LIMITES_DO_DESAFIO.projetoCaracteres + 1)},now(),now())`
    } catch (e) {
      bancoRecusou = (e as { code: string }).code === '23514'
    }
    expect(bancoRecusou).toBe(true)
  })
  test('rotas isolam jogador, exigem gateway e família da própria conta', async () => {
    await repo.guardar({ jogador, desafioId, titulo: c.titulo, projeto: {}, agora })
    await conexao.db
      .insert(perfisDaConta)
      .values({ jogadorId: perfil, contaId: conta, criadoEm: agora })
    const s = new ServicoDosMinijogos(repo, politica)
    expect(
      (await s.listarDaFamilia({ contaId: conta, equipe: false, somenteLeitura: false }, perfil))
        .minijogos,
    ).toHaveLength(1)
    let negado = false
    try {
      await s.listarDaFamilia({ contaId: desafioId, equipe: false, somenteLeitura: false }, perfil)
    } catch {
      negado = true
    }
    expect(negado).toBe(true)
    expect((await s.listar({ ...jogador, id: conta })).minijogos).toEqual([])
    let isolado = false
    try {
      await s.abrir({ ...jogador, id: conta }, desafioId)
    } catch {
      isolado = true
    }
    expect(isolado).toBe(true)
    const app = rotasDosMinijogos({ minijogos: s, tokenInterno: 'local' })
    const h = {
      'x-internal-token': 'local',
      'x-auth-user-id': perfil,
      'x-auth-account-id': conta,
      'x-auth-user-role': 'member',
      'x-auth-user-status': 'active',
    }
    expect(
      (await app.handle(new Request('http://local/arquipelago/minijogos', { headers: h }))).status,
    ).toBe(200)
    expect((await app.handle(new Request('http://local/arquipelago/minijogos'))).status).not.toBe(
      200,
    )
  })
  test('medição conta uma aprovação por desafio mesmo após refazer', async () => {
    await repo.guardar({ jogador, desafioId, titulo: c.titulo, projeto: {}, agora })
    await repo.guardar({
      jogador,
      desafioId,
      titulo: c.titulo,
      projeto: {},
      agora: new Date(agora.getTime() + 1000),
    })
    const d = await new DrizzleRepositorioDaMedicao(conexao.db).agregar(
      { de: '2026-10-29', ate: '2026-10-29', publico: 'kids' },
      '2026-10-30',
    )
    expect(d.minijogos).toEqual({ quantidade: 1, pessoas: 1 })
  })
  test('duas gravações continuam sendo um brinquedo e cópia antiga não substitui a nova', async () => {
    await Promise.all(
      [0, 1].map((n) =>
        repo.guardar({
          jogador,
          desafioId,
          titulo: c.titulo,
          projeto: { versao: n },
          agora: new Date(agora.getTime() + n * 1000),
        }),
      ),
    )
    expect(await repo.listar(perfil)).toHaveLength(1)
    expect((await repo.abrir(perfil, desafioId))?.projeto).toEqual({ versao: 1 })
    await repo.guardar({ jogador, desafioId, titulo: c.titulo, projeto: { versao: -1 }, agora })
    expect((await repo.abrir(perfil, desafioId))?.projeto).toEqual({ versao: 1 })
  })
})
