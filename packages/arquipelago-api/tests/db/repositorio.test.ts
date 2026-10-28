import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import path from 'node:path'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleRepositorioDoJogo } from '../../src/infrastructure/persistence/drizzle/repositorio'

/**
 * O que só o Postgres real prova: a revisão como trava sob corrida (dois aparelhos gravando
 * juntos, um vence), a soma atômica do tempo e o JSON indo e voltando intacto.
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
if (!url) console.warn('[tests/db] Postgres indisponível: testes do repositório do jogo PULADOS.')

const JOGADOR = '11111111-1111-4111-8111-111111111111'
const CONTA = '22222222-2222-4222-8222-222222222222'
const AGORA = new Date('2026-10-27T15:00:00Z')

describe.skipIf(!url)('DrizzleRepositorioDoJogo (Postgres real)', () => {
  let conexao: DbConnection
  let repo: DrizzleRepositorioDoJogo

  beforeAll(async () => {
    conexao = createDbConnection(url!, { max: 6 })
    await migrate(conexao.db, {
      migrationsFolder: path.join(
        import.meta.dir,
        '../../src/infrastructure/persistence/drizzle/migrations',
      ),
      migrationsTable: 'arquipelago_migrations',
    })
    repo = new DrizzleRepositorioDoJogo(conexao.db)
  })
  afterAll(async () => {
    await conexao?.close()
  })
  beforeEach(async () => {
    await conexao.sql`truncate arquipelago.salvamentos, arquipelago.tempo_diario, arquipelago.eventos_tempo, arquipelago.limites_da_familia`
  })

  test('repetição do mesmo evento de tempo não conta duas vezes', async () => {
    const eventoId = '33333333-3333-4333-8333-333333333333'
    const valores = await Promise.all([
      repo.somarTempo(JOGADOR, '2026-10-27', 60, AGORA, eventoId),
      repo.somarTempo(JOGADOR, '2026-10-27', 60, AGORA, eventoId),
    ])
    expect(valores).toEqual([60, 60])
    expect(await repo.lerTempo(JOGADOR, '2026-10-27')).toBe(60)
    for (const [dia, segundos] of [
      ['2026-10-27', 61],
      ['2026-10-26', 60],
    ] as const) {
      let conflito = false
      try {
        await repo.somarTempo(JOGADOR, dia, segundos, AGORA, eventoId)
      } catch {
        conflito = true
      }
      expect(conflito).toBe(true)
    }
    expect(await repo.lerTempo(JOGADOR, '2026-10-26')).toBe(0)
  })

  test('recupera data futura do aparelho no dia do servidor sem duplicar após a virada', async () => {
    const eventoId = '44444444-4444-4444-8444-444444444444'
    expect(await repo.somarTempo(JOGADOR, '2099-01-01', 12, AGORA, eventoId)).toBe(12)
    expect(await repo.lerTempo(JOGADOR, '2026-10-27')).toBe(12)
    const depois = new Date(AGORA.getTime() + 24 * 60 * 60 * 1000)
    expect(await repo.somarTempo(JOGADOR, '2099-01-01', 12, depois, eventoId)).toBe(12)
    expect(await repo.lerTempo(JOGADOR, '2026-10-28')).toBe(0)
  })

  test('JSON intacto e revisão subindo de um em um', async () => {
    const s = criarSalvamentoInicial(AGORA)
    const a = await repo.gravarSalvamento({
      jogadorId: JOGADOR,
      publico: 'kids',
      revisaoBase: 0,
      salvamento: s,
      agora: AGORA,
    })
    expect(a.ok && a.guardado.revisao).toBe(1)
    const b = await repo.gravarSalvamento({
      jogadorId: JOGADOR,
      publico: 'kids',
      revisaoBase: 1,
      salvamento: { ...s, casa: { portaNova: true } },
      agora: AGORA,
    })
    expect(b.ok && b.guardado.revisao).toBe(2)
    const lido = await repo.lerSalvamento(JOGADOR)
    expect(lido?.dados).toEqual({ ...s, casa: { portaNova: true } })
    expect(lido?.atualizadoEm.toISOString()).toBe(AGORA.toISOString())
  })

  test('corrida na primeira gravação e numa atualização: só um vence', async () => {
    const s = criarSalvamentoInicial(AGORA)
    const gravar = (revisaoBase: number, n: number) =>
      repo.gravarSalvamento({
        jogadorId: JOGADOR,
        publico: 'kids',
        revisaoBase,
        salvamento: { ...s, inventario: { alface: n } },
        agora: AGORA,
      })
    const primeiras = await Promise.all([1, 2, 3, 4, 5].map((n) => gravar(0, n)))
    expect(primeiras.filter((r) => r.ok)).toHaveLength(1)
    const perdedora = primeiras.find((r) => !r.ok)
    expect(perdedora && !perdedora.ok && perdedora.atual?.revisao).toBe(1)

    const seguintes = await Promise.all([6, 7, 8, 9].map((n) => gravar(1, n)))
    expect(seguintes.filter((r) => r.ok)).toHaveLength(1)
    expect((await repo.lerSalvamento(JOGADOR))?.revisao).toBe(2)
  })

  test('revisão de algo que não existe devolve atual nulo', async () => {
    const r = await repo.gravarSalvamento({
      jogadorId: JOGADOR,
      publico: 'adulto',
      revisaoBase: 3,
      salvamento: criarSalvamentoInicial(AGORA),
      agora: AGORA,
    })
    expect(r).toEqual({ ok: false, atual: null })
  })

  test('tempo somado em paralelo, separado por dia e com teto de 24 h', async () => {
    await Promise.all(
      Array.from({ length: 10 }, () => repo.somarTempo(JOGADOR, '2026-10-27', 60, AGORA)),
    )
    expect(await repo.lerTempo(JOGADOR, '2026-10-27')).toBe(600)
    expect(await repo.lerTempo(JOGADOR, '2026-10-28')).toBe(0)
    expect(await repo.somarTempo(JOGADOR, '2026-10-27', 90_000, AGORA)).toBe(86_400)
  })

  test('limite da família: sem linha é nulo, depois grava e troca', async () => {
    expect(await repo.lerLimite(CONTA)).toBeNull()
    expect(await repo.gravarLimite(CONTA, 45, AGORA)).toBe(45)
    expect(await repo.gravarLimite(CONTA, 60, AGORA)).toBe(60)
    expect(await repo.lerLimite(CONTA)).toBe(60)
    let recusou = false
    try {
      await repo.gravarLimite(CONTA, 5, AGORA)
    } catch {
      recusou = true
    }
    expect(recusou).toBe(true)
  })
})
