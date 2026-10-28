import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import path from 'node:path'
import type { ConteudoDoDesafio, MetadadosDoDesafio } from '@sistemazero/arquipelago-contracts'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import {
  DrizzleRepositorioDeDesafios,
  DrizzleRepositorioDoJogadorNosDesafios,
} from '../../src/infrastructure/persistence/drizzle/repositorio-de-desafios'

/**
 * O que só o Postgres real prova nos desafios: a revisão como trava sob corrida, os dois índices
 * únicos (slug; quadro por ilha e público, fora os arquivados) traduzidos em motivos, e a
 * publicação congelada numa transação. Banco DESCARTÁVEL `arquipelago_test` num Postgres local
 * (porta 5433, ou `TEST_DATABASE_URL`). Sem banco, a suíte é pulada.
 */
const NOME = 'arquipelago_test'
const BASE = process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/postgres'

async function prepararBanco(): Promise<string | null> {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL
  const admin = postgres(BASE, { max: 1, connect_timeout: 2, onnotice: () => {} })
  try {
    await admin`select 1`
    try {
      await admin.unsafe(`CREATE DATABASE ${NOME}`)
    } catch (erro) {
      if ((erro as { code?: string }).code !== '42P04') throw erro
    }
    const u = new URL(BASE)
    u.pathname = `/${NOME}`
    return u.toString()
  } catch {
    return null
  } finally {
    await admin.end({ timeout: 1 }).catch(() => {})
  }
}

const url = await prepararBanco()
if (!url) console.warn('[tests/db] Postgres indisponível: testes dos desafios PULADOS.')

const ADMIN = '66666666-6666-4666-8666-666666666666'
const AGORA = new Date('2026-10-27T15:00:00Z')
const ID1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
const ID2 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
const projeto = { files: { 'index.html': '', 'style.css': '', 'script.js': '' } }
const conteudo: ConteudoDoDesafio = {
  versao: 1,
  titulo: 'A borboleta',
  enunciado: 'Voe até a flor.',
  dicas: [],
  projetoInicial: projeto,
  gabarito: projeto,
  objetivos: [{ id: 'o1', label: 'Chega', rule: { type: 'usesBlock' } }],
  recompensa: { cor: true, moedas: 20, moedasExtra: 10 },
  blocosManuais: { acrescentar: [], retirar: [] },
}
const meta = (over: Partial<MetadadosDoDesafio> = {}): MetadadosDoDesafio => ({
  slug: 'borboleta',
  publico: 'kids',
  ilha: 'bosque',
  tipo: 'quadro-das-cores',
  quadro: 1,
  ordem: 0,
  ...over,
})
const publicacao = {
  conteudo,
  blocosDerivados: ['a'],
  blocosExigidos: ['a', 'b'],
  vista: [{ id: 'o1', label: 'Chega', kind: 'block' as const }],
  analise: {
    blocosDerivados: ['a'],
    blocosExigidos: ['a', 'b'],
    cobertura: [],
    problemas: [],
    gabarito: [],
    inicial: [],
  },
}

describe.skipIf(!url)('DrizzleRepositorioDeDesafios (Postgres real)', () => {
  let conexao: DbConnection
  let repo: DrizzleRepositorioDeDesafios

  beforeAll(async () => {
    conexao = createDbConnection(url!, { max: 6 })
    await migrate(conexao.db, {
      migrationsFolder: path.join(
        import.meta.dir,
        '../../src/infrastructure/persistence/drizzle/migrations',
      ),
      migrationsTable: 'arquipelago_migrations',
    })
    repo = new DrizzleRepositorioDeDesafios(conexao.db)
  })
  afterAll(async () => {
    await conexao?.close()
  })
  beforeEach(async () => {
    await conexao.sql`truncate arquipelago.desafios cascade`
  })

  const criar = (id: string, m = meta()) =>
    repo.criar({ id, metadados: m, conteudo, por: ADMIN, agora: AGORA })

  test('cria, lê e grava por revisão; dois gravando juntos, só um vence', async () => {
    const r = await criar(ID1)
    expect(r.ok && r.desafio.revisao).toBe(1)
    const gravar = (titulo: string) =>
      repo.gravar({
        id: ID1,
        revisaoBase: 1,
        metadados: meta(),
        conteudo: { ...conteudo, titulo },
        por: ADMIN,
        agora: AGORA,
      })
    const [a, b] = await Promise.all([gravar('A'), gravar('B')])
    expect([a.ok, b.ok].sort()).toEqual([false, true])
    const perdeu = a.ok ? b : a
    expect(perdeu.ok === false && perdeu.motivo === 'revisao' && perdeu.atual?.revisao).toBe(2)
  })

  test('slug e quadro únicos viram motivos; arquivado libera o quadro', async () => {
    await criar(ID1)
    expect(await criar(ID2, meta({ quadro: 2 }))).toEqual({ ok: false, motivo: 'slug-em-uso' })
    expect(await criar(ID2, meta({ slug: 'outra' }))).toEqual({
      ok: false,
      motivo: 'quadro-ocupado',
    })
    // Outro público pode usar o mesmo quadro.
    expect((await criar(ID2, meta({ slug: 'outra', publico: 'adulto' }))).ok).toBe(true)
    await conexao.sql`delete from arquipelago.desafios where id = ${ID2}`
    const arq = await repo.mudarSituacao({
      id: ID1,
      revisaoBase: 1,
      situacao: 'arquivado',
      por: ADMIN,
      agora: AGORA,
    })
    expect(arq.ok && arq.desafio.situacao).toBe('arquivado')
    expect((await criar(ID2, meta({ slug: 'outra' }))).ok).toBe(true)
    // Reativar o primeiro bate no quadro agora ocupado.
    expect(
      await repo.mudarSituacao({
        id: ID1,
        revisaoBase: 2,
        situacao: 'ativo',
        por: ADMIN,
        agora: AGORA,
      }),
    ).toEqual({ ok: false, motivo: 'quadro-ocupado' })
  })

  test('publicar congela a revisão e os blocos; revisão velha não publica', async () => {
    await criar(ID1)
    expect(
      (await repo.publicar({ id: ID1, revisaoBase: 9, publicacao, por: ADMIN, agora: AGORA })).ok,
    ).toBe(false)
    const pub = await repo.publicar({
      id: ID1,
      revisaoBase: 1,
      publicacao,
      por: ADMIN,
      agora: AGORA,
    })
    expect(pub.ok && pub.desafio).toMatchObject({
      situacao: 'publicado',
      revisaoPublicada: 1,
      blocosPublicados: ['a', 'b'],
    })
    const lido = await repo.ler(ID1)
    expect(lido?.blocosPublicados).toEqual(['a', 'b'])
    const repetida = await repo.publicar({
      id: ID1,
      revisaoBase: 1,
      publicacao: { ...publicacao, blocosExigidos: ['outra-analise'] },
      por: ADMIN,
      agora: AGORA,
    })
    expect(repetida.ok && repetida.desafio.blocosPublicados).toEqual(['a', 'b'])
    const [linha] =
      await conexao.sql`select count(*)::int as n from arquipelago.desafio_publicacoes`
    expect(linha?.n).toBe(1)
    // Reativar depois de arquivar volta a publicado (já teve publicação).
    await repo.mudarSituacao({
      id: ID1,
      revisaoBase: 1,
      situacao: 'arquivado',
      por: ADMIN,
      agora: AGORA,
    })
    const re = await repo.mudarSituacao({
      id: ID1,
      revisaoBase: 2,
      situacao: 'ativo',
      por: ADMIN,
      agora: AGORA,
    })
    expect(re.ok && re.desafio.situacao).toBe('publicado')
    expect(re.ok && re.desafio.alteradoDepoisDePublicar).toBe(false)
    expect(
      (await repo.listar({ publico: 'kids', situacao: 'publicado' })).map((d) => d.id),
    ).toEqual([ID1])
  })

  test('o banco recusa número de quadro fora do Quadro das Cores', async () => {
    // try/catch e não `expect(...).rejects`: a consulta do postgres.js é preguiçosa e o `rejects`
    // do bun pode esperar para sempre (a mesma armadilha anotada nos testes de banco do Members).
    let codigo: string | undefined
    try {
      await conexao.sql`insert into arquipelago.desafios (id, slug, publico, ilha, tipo, quadro, ordem, situacao, revisao, conteudo, criado_em, atualizado_em, atualizado_por)
        values (${ID1}, 'x', 'kids', 'bosque', 'desafio-do-dia', 1, 0, 'rascunho', 1, '{}', now(), now(), ${ADMIN})`
    } catch (erro) {
      codigo = (erro as { code?: string }).code
    }
    expect(codigo).toBe('23514')
  })

  test('arquivar invalida uma publicação cuja análise usou a revisão anterior', async () => {
    await criar(ID1)
    await repo.publicar({ id: ID1, revisaoBase: 1, publicacao, por: ADMIN, agora: AGORA })
    await repo.mudarSituacao({
      id: ID1,
      revisaoBase: 1,
      situacao: 'arquivado',
      por: ADMIN,
      agora: AGORA,
    })
    const antiga = await repo.publicar({
      id: ID1,
      revisaoBase: 1,
      publicacao,
      por: ADMIN,
      agora: AGORA,
    })
    expect(antiga.ok).toBe(false)
    expect((await repo.ler(ID1))?.situacao).toBe('arquivado')
  })
})

describe.skipIf(!url)('DrizzleRepositorioDoJogadorNosDesafios (Postgres real)', () => {
  const JOGADOR = '11111111-1111-4111-8111-111111111111'
  let conexao: DbConnection
  let equipe: DrizzleRepositorioDeDesafios
  let repo: DrizzleRepositorioDoJogadorNosDesafios

  beforeAll(async () => {
    conexao = createDbConnection(url!, { max: 6 })
    await migrate(conexao.db, {
      migrationsFolder: path.join(
        import.meta.dir,
        '../../src/infrastructure/persistence/drizzle/migrations',
      ),
      migrationsTable: 'arquipelago_migrations',
    })
    equipe = new DrizzleRepositorioDeDesafios(conexao.db)
    repo = new DrizzleRepositorioDoJogadorNosDesafios(conexao.db)
  })
  afterAll(async () => {
    await conexao?.close()
  })
  beforeEach(async () => {
    await conexao.sql`truncate arquipelago.desafios cascade`
  })

  async function publicado(id: string, m = meta()) {
    await equipe.criar({ id, metadados: m, conteudo, por: ADMIN, agora: AGORA })
    const r = await equipe.publicar({ id, revisaoBase: 1, publicacao, por: ADMIN, agora: AGORA })
    if (!r.ok) throw new Error('não publicou')
  }
  const concluir = () =>
    repo.concluir({
      jogadorId: JOGADOR,
      desafioId: ID1,
      publico: 'kids',
      revisao: 1,
      moedas: 20,
      moedasExtra: 10,
      agora: AGORA,
    })

  test('rascunho não muda público nem ilha publicados e republicação preserva a conquista original', async () => {
    await publicado(ID1)
    await concluir()
    await equipe.gravar({
      id: ID1,
      revisaoBase: 1,
      metadados: meta({ publico: 'adulto', ilha: 'recife', quadro: 3 }),
      conteudo,
      por: ADMIN,
      agora: AGORA,
    })
    expect((await repo.listarPublicados('kids')).map((d) => d.id)).toEqual([ID1])
    expect(await repo.listarPublicados('adulto')).toEqual([])
    expect((await repo.lerPublicado(ID1))?.metadados).toEqual(meta())
    await equipe.publicar({ id: ID1, revisaoBase: 2, publicacao, por: ADMIN, agora: AGORA })
    expect((await repo.lerPublicacao(ID1, 1))?.desafio.metadados).toEqual(meta())
    expect((await repo.conclusoes(JOGADOR, 'kids'))[0]).toMatchObject({ ilha: 'bosque', quadro: 1 })
  })

  test('mudar o quadro no rascunho não libera a posição ainda publicada', async () => {
    await publicado(ID1)
    await equipe.gravar({
      id: ID1,
      revisaoBase: 1,
      metadados: meta({ quadro: 2 }),
      conteudo,
      por: ADMIN,
      agora: AGORA,
    })
    const outra = await equipe.criar({
      id: ID2,
      metadados: meta({ slug: 'outra' }),
      conteudo,
      por: ADMIN,
      agora: AGORA,
    })
    expect(outra).toEqual({ ok: false, motivo: 'quadro-ocupado' })
  })

  test('só publicados do público, com a última publicação; rascunho e arquivado ficam fora', async () => {
    await publicado(ID1)
    await equipe.criar({
      id: ID2,
      metadados: meta({ slug: 'rascunho', quadro: 2 }),
      conteudo,
      por: ADMIN,
      agora: AGORA,
    })
    const lista = await repo.listarPublicados('kids')
    expect(lista.map((d) => d.id)).toEqual([ID1])
    expect(lista[0]?.publicacao).toMatchObject({ revisao: 1, blocosExigidos: ['a', 'b'] })
    expect(await repo.listarPublicados('adulto')).toEqual([])
    expect((await repo.lerPublicado(ID1))?.publicacao.revisao).toBe(1)
    expect(await repo.lerPublicado(ID2)).toBeNull()
    expect((await repo.lerPublicacao(ID1, 1))?.desafio.situacao).toBe('publicado')
    expect(await repo.lerPublicacao(ID1, 2)).toBeNull()
    await equipe.mudarSituacao({
      id: ID1,
      revisaoBase: 1,
      situacao: 'arquivado',
      por: ADMIN,
      agora: AGORA,
    })
    expect(await repo.lerPublicado(ID1)).toBeNull()
    // A publicação continua guardada (feito continua feito), com o desafio arquivado.
    expect((await repo.lerPublicacao(ID1, 1))?.desafio.situacao).toBe('arquivado')
  })

  test('conclui uma vez só, mesmo em corrida; o extra também', async () => {
    await publicado(ID1)
    const vencedores = await Promise.all([concluir(), concluir(), concluir()])
    expect(vencedores.filter(Boolean)).toHaveLength(1)
    const extras = await Promise.all([
      repo.marcarExtra(JOGADOR, ID1, AGORA),
      repo.marcarExtra(JOGADOR, ID1, AGORA),
    ])
    expect(extras.filter(Boolean)).toHaveLength(1)
    const [c] = await repo.conclusoes(JOGADOR, 'kids')
    expect(c).toMatchObject({
      desafioId: ID1,
      ilha: 'bosque',
      tipo: 'quadro-das-cores',
      quadro: 1,
      moedas: 20,
      moedasSituacao: 'pendente',
      moedasExtra: 10,
      moedasExtraSituacao: 'pendente',
      moedasTetoSemana: null,
    })
    expect(await repo.conclusoes(JOGADOR, 'adulto')).toEqual([])
  })

  test('moedas: teto guarda a semana; creditado limpa; recompensa vista uma vez', async () => {
    await publicado(ID1)
    await concluir()
    await repo.marcarMoedas(JOGADOR, ID1, 'principal', 'teto', '2026-10-26')
    let [c] = await repo.conclusoes(JOGADOR, 'kids')
    expect(c).toMatchObject({ moedasSituacao: 'teto', moedasTetoSemana: '2026-10-26' })
    await repo.marcarMoedas(JOGADOR, ID1, 'principal', 'creditado', '2026-11-02')
    ;[c] = await repo.conclusoes(JOGADOR, 'kids')
    expect(c).toMatchObject({ moedasSituacao: 'creditado', moedasTetoSemana: null })
    await repo.marcarRecompensaVista(JOGADOR, ID1, AGORA)
    await repo.marcarRecompensaVista(JOGADOR, ID1, new Date('2026-12-01T00:00:00Z'))
    ;[c] = await repo.conclusoes(JOGADOR, 'kids')
    expect(c?.recompensaVistaEm?.toISOString()).toBe(AGORA.toISOString())
  })

  test('tentativa guardada por revisão (a última vence)', async () => {
    await publicado(ID1)
    await repo.guardarTentativa({
      jogadorId: JOGADOR,
      desafioId: ID1,
      revisao: 1,
      resultados: [{ id: 'o1', passou: false }],
      agora: AGORA,
    })
    await repo.guardarTentativa({
      jogadorId: JOGADOR,
      desafioId: ID1,
      revisao: 1,
      resultados: [{ id: 'o1', passou: true }],
      agora: AGORA,
    })
    expect(await repo.progresso(JOGADOR, ID1)).toEqual({
      revisao: 1,
      ultimosResultados: [{ id: 'o1', passou: true }],
    })
  })
})
