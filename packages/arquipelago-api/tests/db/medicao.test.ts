import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { RelatorioDaMedicaoSchema } from '@sistemazero/arquipelago-contracts'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleRepositorioDaMedicao } from '../../src/infrastructure/persistence/drizzle/repositorio-medicao'
import { migrarBancoDeTeste } from '../fakes/banco-migrado'
import {
  idMedicao,
  semearMedicao,
  servidorMedicao,
  TOKEN_MEDICAO,
  validarBancoMedicao,
} from '../fakes/medicao'

// Variável própria: outros testes podem limpar suas tabelas sem disputar esta fotografia.
const url = process.env.ARQUIPELAGO_MEDICAO_TEST_DATABASE_URL
if (url) validarBancoMedicao(url)
describe.skipIf(!url)('medição no Postgres local e na rota real', () => {
  let db: DbConnection
  let app: ReturnType<typeof servidorMedicao>
  beforeAll(async () => {
    if (!url) throw new Error('Falta o banco local.')
    db = createDbConnection(url, { max: 2 })
    await migrarBancoDeTeste(db)
    await semearMedicao(db)
    app = servidorMedicao(db)
  })
  afterAll(async () => {
    await db?.close()
  })
  const headers = {
    'x-internal-token': TOKEN_MEDICAO,
    'x-auth-user-id': idMedicao(999),
    'x-auth-user-role': 'admin',
    'x-auth-user-status': 'active',
  }
  const chamar = (query = 'de=2026-10-01&ate=2026-10-28&publico=kids', h = headers) =>
    app.handle(new Request(`http://local/arquipelago/equipe/medicao?${query}`, { headers: h }))
  test('agrega pessoas distintas, primeiro dia global, zero tempo excluído e cada público isolado', async () => {
    const repo = new DrizzleRepositorioDaMedicao(db.db)
    const kids = await repo.agregar(
      { de: '2026-10-01', ate: '2026-10-28', publico: 'kids' },
      '2026-10-28',
    )
    expect(kids.coortes[0]).toEqual({ dia: '2026-10-01', pessoas: 10, seguinte: 5, dia7: 5 })
    expect(kids.pintaMolda).toEqual({ quantidade: 10, pessoas: 5 })
    expect(kids.galeria.quantidade).toBe(0)
    const adulto = await repo.agregar(
      { de: '2026-10-01', ate: '2026-10-28', publico: 'adulto' },
      '2026-10-28',
    )
    expect(adulto.coortes).toEqual([])
    expect(adulto.galeria).toEqual({ quantidade: 5, pessoas: 5 })
    expect(adulto.desafiosAprovados.quantidade).toBe(0)
  })
  test('fronteira de meia-noite em São Paulo, independente do dia UTC', async () => {
    const repo = new DrizzleRepositorioDaMedicao(db.db)
    const primeiro = await repo.agregar(
      { de: '2026-10-01', ate: '2026-10-01', publico: 'kids' },
      '2026-10-28',
    )
    expect(primeiro.pintaMolda.quantidade).toBe(0)
    expect(primeiro.desafiosAprovados.quantidade).toBe(5)
    const segundo = await repo.agregar(
      { de: '2026-10-02', ate: '2026-10-02', publico: 'kids' },
      '2026-10-28',
    )
    expect(segundo.pintaMolda.quantidade).toBe(10)
    expect(segundo.desafiosAprovados.quantidade).toBe(0)
    expect(segundo.coortes).toEqual([])
  })
  test('rota protege pequenos grupos e não serializa IDs, nomes ou salvamentos', async () => {
    const response = await chamar()
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('no-store')
    const text = await response.text()
    const report = RelatorioDaMedicaoSchema.parse(JSON.parse(text))
    expect(report.volta.coortes[1]?.dia1).toEqual({ situacao: 'poucos-dados', valor: null })
    expect(report.volta.coortes[2]?.diaSeguinte.situacao).toBe('aguardando')
    expect(report.desafiosAprovados.valor).toBe(5)
    expect(text).not.toContain('12345678-')
    expect(text).not.toContain('jogador')
    expect(text).not.toContain('ficticio')
  })
  test('gateway, equipe, perfil, estado ativo e parâmetros são conferidos', async () => {
    expect((await chamar(undefined, { ...headers, 'x-internal-token': 'errado' })).status).toBe(401)
    expect((await chamar(undefined, { ...headers, 'x-auth-user-role': 'member' })).status).toBe(403)
    expect((await chamar(undefined, { ...headers, 'x-auth-user-status': 'inactive' })).status).toBe(
      403,
    )
    expect(
      (
        await chamar(undefined, {
          ...headers,
          'x-auth-account-id': idMedicao(99),
        } as typeof headers)
      ).status,
    ).toBe(403)
    expect((await chamar(undefined, { ...headers, 'x-auth-user-role': 'staff' })).status).toBe(200)
    for (const query of [
      'de=2026-02-30&ate=2026-10-28&publico=kids',
      'de=2026-10-01&ate=2026-10-29&publico=kids',
      'de=2026-10-01&ate=2026-10-28',
      'de=2026-10-01&ate=2026-10-28&publico=kids&jogadorId=qualquer',
    ]) {
      expect((await chamar(query)).status).toBe(400)
    }
  })
})
test('guarda de banco recusa hosts remotos e nomes de banco normais', () => {
  expect(() =>
    validarBancoMedicao('postgres://local:local@remote.example/arquipelago_test'),
  ).toThrow()
  expect(() => validarBancoMedicao('postgres://local:local@localhost/producao')).toThrow()
})
