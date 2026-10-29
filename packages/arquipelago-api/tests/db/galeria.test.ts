import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import path from 'node:path'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { aparenciasPagas } from '../../src/application/servico-da-galeria'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleRepositorioDaGaleria } from '../../src/infrastructure/persistence/drizzle/repositorio-da-galeria'

/**
 * O que só o Postgres real prova na galeria (29/10/2026): a primeira reserva fica com a chave e o
 * preço dela (dois pedidos ao mesmo tempo dividem a mesma), pagar vale uma vez, desistir só tira a
 * pendente daquela chave, e as travas da tabela (situação, moedas, chave única).
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
if (!url) console.warn('[tests/db] Postgres indisponível: testes da galeria PULADOS.')

const LIA = '11111111-1111-4111-8111-111111111111'
const TOM = '33333333-3333-4333-8333-333333333333'
const CHAVE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const OUTRA = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const AGORA = new Date('2026-10-29T15:00:00Z')

describe.skipIf(!url)('DrizzleRepositorioDaGaleria (Postgres real)', () => {
  let conexao: DbConnection
  let galeria: DrizzleRepositorioDaGaleria

  beforeAll(async () => {
    conexao = createDbConnection(url!, { max: 6 })
    await migrate(conexao.db, {
      migrationsFolder: path.join(
        import.meta.dir,
        '../../src/infrastructure/persistence/drizzle/migrations',
      ),
      migrationsTable: 'arquipelago_migrations',
    })
    galeria = new DrizzleRepositorioDaGaleria(conexao.db)
  })
  afterAll(async () => {
    await conexao?.close()
  })
  beforeEach(async () => {
    await conexao.sql`truncate arquipelago.compras_da_galeria`
  })

  const reservar = (chave: string, moedas = 60, jogadorId = LIA) =>
    galeria.reservar({
      jogadorId,
      aparencia: 'geladeira-classica',
      objeto: 'geladeira',
      moedas,
      chave,
      agora: AGORA,
    })

  test('dois pedidos ao mesmo tempo ficam com a mesma reserva (chave e preço da primeira)', async () => {
    const [a, b] = await Promise.all([reservar(CHAVE), reservar(OUTRA, 99)])
    expect(a).toEqual(b)
    expect(a.situacao).toBe('pendente')
    expect([CHAVE, OUTRA]).toContain(a.chave)
    expect(a.moedas).toBe(a.chave === CHAVE ? 60 : 99)
    expect(await galeria.compras(LIA)).toHaveLength(1)
  })

  test('pagar vale uma vez; só a paga conta; outra pessoa é outra linha', async () => {
    await reservar(CHAVE)
    expect(await aparenciasPagas(galeria, LIA)).toEqual(new Set())
    await galeria.marcarPaga(LIA, 'geladeira-classica', AGORA)
    await galeria.marcarPaga(LIA, 'geladeira-classica', new Date('2026-10-30T00:00:00Z'))
    expect(await aparenciasPagas(galeria, LIA)).toEqual(new Set(['geladeira-classica']))
    const [linha] = await conexao.sql<
      { paga_em: string | Date }[]
    >`select paga_em from arquipelago.compras_da_galeria where jogador_id = ${LIA}`
    // A primeira confirmação vale: pagar de novo não troca a data.
    expect(new Date(linha?.paga_em ?? 0).toISOString()).toBe(AGORA.toISOString())
    // Reservar de novo depois de paga devolve a paga, sem trocar a chave.
    expect(await reservar(OUTRA)).toMatchObject({ situacao: 'paga', chave: CHAVE })
    await reservar(OUTRA, 60, TOM)
    expect(await aparenciasPagas(galeria, TOM)).toEqual(new Set())
  })

  test('desistir tira só a pendente daquela chave, nunca a paga', async () => {
    await reservar(CHAVE)
    await galeria.desistir(LIA, 'geladeira-classica', OUTRA)
    expect(await galeria.compras(LIA)).toHaveLength(1)
    await galeria.desistir(LIA, 'geladeira-classica', CHAVE)
    expect(await galeria.compras(LIA)).toEqual([])
    await reservar(OUTRA)
    await galeria.marcarPaga(LIA, 'geladeira-classica', AGORA)
    await galeria.desistir(LIA, 'geladeira-classica', OUTRA)
    expect(await aparenciasPagas(galeria, LIA)).toEqual(new Set(['geladeira-classica']))
  })

  test('as travas da tabela: situação conhecida, moedas sem número negativo, chave única', async () => {
    const inserir = (situacao: string, moedas: number, chave: string, aparencia: string) =>
      conexao.sql`insert into arquipelago.compras_da_galeria
        (jogador_id, aparencia_id, objeto, moedas, chave, situacao, criada_em)
        values (${LIA}, ${aparencia}, 'forno', ${moedas}, ${chave}, ${situacao}, now())`
    const recusa = async (fazer: () => Promise<unknown>) => {
      // try/catch em vez de `rejects`: a consulta do postgres.js é preguiçosa.
      try {
        await fazer()
      } catch (erro) {
        return (erro as { code?: string }).code
      }
      return null
    }
    expect(await recusa(() => inserir('devolvida', 50, CHAVE, 'forno-classico'))).toBe('23514')
    expect(await recusa(() => inserir('paga', -1, CHAVE, 'forno-classico'))).toBe('23514')
    await inserir('paga', 50, CHAVE, 'forno-classico')
    expect(await recusa(() => inserir('paga', 70, CHAVE, 'museu-classico'))).toBe('23505')
  })
})
