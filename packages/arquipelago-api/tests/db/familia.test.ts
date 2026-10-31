import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import path from 'node:path'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { marcaDaCriacao } from '../../src/domain/mudancas-de-aparencia'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleRepositorioDoJogo } from '../../src/infrastructure/persistence/drizzle/repositorio'
import { DrizzleRepositorioDaFamilia } from '../../src/infrastructure/persistence/drizzle/repositorio-da-familia'

/**
 * O que só o Postgres real prova na família (28/10/2026): a criança fica ligada à conta do login
 * na primeira gravação aceita (e nunca muda), o tempo da janela soma só os dias dela e as
 * permissões são uma linha por conta.
 * Banco DESCARTÁVEL próprio (`arquipelago_test`) num Postgres local (porta 5433, ou
 * `TEST_DATABASE_URL`). Sem banco, a suíte é pulada. Nunca apontar para staging/produção.
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
if (!url) console.warn('[tests/db] Postgres indisponível: testes da família PULADOS.')

const LIA = '11111111-1111-4111-8111-111111111111'
const TOM = '33333333-3333-4333-8333-333333333333'
const CONTA = '22222222-2222-4222-8222-222222222222'
const OUTRA = '66666666-6666-4666-8666-666666666666'
const AGORA = new Date('2026-10-28T15:00:00Z')

describe.skipIf(!url)('DrizzleRepositorioDaFamilia (Postgres real)', () => {
  let conexao: DbConnection
  let jogo: DrizzleRepositorioDoJogo
  let familia: DrizzleRepositorioDaFamilia

  beforeAll(async () => {
    conexao = createDbConnection(url!, { max: 6 })
    await migrate(conexao.db, {
      migrationsFolder: path.join(
        import.meta.dir,
        '../../src/infrastructure/persistence/drizzle/migrations',
      ),
      migrationsTable: 'arquipelago_migrations',
    })
    jogo = new DrizzleRepositorioDoJogo(conexao.db)
    familia = new DrizzleRepositorioDaFamilia(conexao.db)
  })
  afterAll(async () => {
    await conexao?.close()
  })
  beforeEach(async () => {
    await conexao.sql`truncate arquipelago.salvamentos, arquipelago.tempo_diario, arquipelago.perfis_da_conta, arquipelago.permissoes_da_familia, arquipelago.sessoes_de_tempo cascade`
  })

  const guardar = (jogadorId: string, contaId: string | null, revisaoBase = 0) =>
    jogo.gravarSalvamento({
      jogadorId,
      publico: 'kids',
      revisaoBase,
      salvamento: criarSalvamentoInicial(AGORA),
      agora: AGORA,
      contaId,
    })

  test('a criança fica ligada à conta na primeira gravação aceita, e só nela', async () => {
    expect(await familia.perfisDaConta(CONTA, [LIA, TOM])).toEqual([])
    expect((await guardar(LIA, CONTA)).ok).toBe(true)
    // Gravação recusada (revisão velha) não liga ninguém; outra conta não troca o vínculo.
    expect((await guardar(TOM, CONTA, 5)).ok).toBe(false)
    expect((await guardar(LIA, OUTRA, 1)).ok).toBe(true)
    expect(await familia.perfisDaConta(CONTA, [LIA, TOM])).toEqual([LIA])
    expect(await familia.perfisDaConta(OUTRA, [LIA])).toEqual([])
    expect(await familia.perfisDaConta(CONTA, [])).toEqual([])
  })

  test('os irmãos (fase3-12): os outros da mesma conta, sem ela, na ordem e até o teto', async () => {
    const BIA = '44444444-4444-4444-8444-444444444444'
    for (const id of [TOM, LIA, BIA]) expect((await guardar(id, CONTA)).ok).toBe(true)
    expect((await guardar('77777777-7777-4777-8777-777777777777', OUTRA)).ok).toBe(true)
    // Mesma hora de ligação: desempata pelo id.
    expect(await familia.outrosPerfisDaConta(CONTA, LIA, 20)).toEqual([TOM, BIA].sort())
    expect(await familia.outrosPerfisDaConta(CONTA, LIA, 1)).toHaveLength(1)
    expect(await familia.outrosPerfisDaConta(OUTRA, LIA, 20)).toEqual([
      '77777777-7777-4777-8777-777777777777',
    ])
  })

  test('tempo da janela: soma os dias de dentro e conta em quantos jogou', async () => {
    await jogo.somarTempo(LIA, '2026-10-21', 900, AGORA)
    await jogo.somarTempo(LIA, '2026-10-22', 300, AGORA)
    await jogo.somarTempo(LIA, '2026-10-28', 600, AGORA)
    await jogo.somarTempo(TOM, '2026-10-25', 60, AGORA)
    const tempos = await familia.tempoNaJanela([LIA], '2026-10-22', '2026-10-28')
    expect([...tempos]).toEqual([[LIA, { segundos: 900, dias: 2 }]])
  })

  test('sessões da janela: o fim (cursor) de quem jogou, sem as que não contaram tempo', async () => {
    const sessao = async (jogador: string, inicio: string, fim: string) => {
      await conexao.sql`
        insert into arquipelago.sessoes_de_tempo
          (jogador_id, sessao_id, cursor, vencimento, estado, ultima_sequencia, ultima_acao,
           criado_em, atualizado_em)
        values
          (${jogador}, gen_random_uuid(), ${fim}::timestamptz, ${fim}::timestamptz, 'encerrada',
           3, 'pausar', ${inicio}::timestamptz, ${fim}::timestamptz)`
    }
    await sessao(LIA, '2026-10-26T19:40:00Z', '2026-10-26T20:00:00Z')
    await sessao(LIA, '2026-10-27T19:00:00Z', '2026-10-27T19:00:00Z') // abriu e não contou tempo
    await sessao(LIA, '2026-10-20T19:00:00Z', '2026-10-20T19:30:00Z') // antes da janela
    await sessao(TOM, '2026-10-25T10:00:00Z', '2026-10-25T10:20:00Z') // não foi pedido
    const fins = await familia.sessoesNaJanela([LIA], new Date('2026-10-22T00:00:00Z'), AGORA)
    expect([...fins]).toEqual([[LIA, [new Date('2026-10-26T20:00:00Z')]]])
    expect(await familia.sessoesNaJanela([], new Date(0), AGORA)).toEqual(new Map())
  })

  test('aparências da janela (A33): a marca de cada aplicação de quem foi pedido', async () => {
    expect((await guardar(LIA, CONTA)).ok).toBe(true)
    expect((await guardar(TOM, CONTA)).ok).toBe(true)
    const pinta = { origem: 'pinta' as const, id: 'p1' }
    const comPintura = {
      ...criarSalvamentoInicial(AGORA),
      projetos: {
        geladeira: { ganhoEm: AGORA.toISOString(), aparencia: pinta, aparencias: [pinta] },
      },
    }
    const aplicar = (jogadorId: string, agora: Date) =>
      jogo.gravarSalvamento({
        jogadorId,
        publico: 'kids',
        revisaoBase: 1,
        salvamento: comPintura,
        agora,
        contaId: CONTA,
      })
    expect((await aplicar(LIA, AGORA)).ok).toBe(true)
    expect((await aplicar(TOM, new Date('2026-10-01T15:00:00Z'))).ok).toBe(true)
    const janela = await familia.aparenciasNaJanela(
      [LIA, TOM],
      new Date('2026-10-22T00:00:00Z'),
      AGORA,
    )
    expect([...janela.keys()]).toEqual([LIA])
    expect(janela.get(LIA)).toEqual([
      {
        objeto: 'geladeira',
        revisao: 2,
        origem: 'pinta',
        criacao: marcaDaCriacao(LIA, 'p1'),
        registradoEm: AGORA,
      },
    ])
    expect(await familia.aparenciasNaJanela([], new Date(0), AGORA)).toEqual(new Map())
  })

  test('salvamentos e permissões (uma linha por conta, a última escolha vale)', async () => {
    await guardar(LIA, CONTA)
    const salvos = await familia.salvamentos([LIA, TOM])
    expect([...salvos.keys()]).toEqual([LIA])
    expect(await familia.lerPermissoes(CONTA)).toBeNull()
    const escolha = { visitasDeIrmaos: false, visitasDeOutrasCriancas: true, fotosNoClube: false }
    expect(await familia.gravarPermissoes(CONTA, escolha, AGORA)).toEqual(escolha)
    const outra = { ...escolha, fotosNoClube: true }
    expect(await familia.gravarPermissoes(CONTA, outra, AGORA)).toEqual(outra)
    expect(await familia.lerPermissoes(CONTA)).toEqual(outra)
    expect(await familia.lerPermissoes(OUTRA)).toBeNull()
  })
})
