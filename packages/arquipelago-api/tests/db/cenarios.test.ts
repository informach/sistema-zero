import { afterAll, beforeAll, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { DocumentoDeCenario } from '@sistemazero/molda-cenarios-core'
import { ServicoDeCenarios } from '../../src/application/servico-de-cenarios'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleRepositorioDeCenarios } from '../../src/infrastructure/persistence/drizzle/repositorio-cenarios'
import { rotasDosCenarios } from '../../src/interfaces/http/rotas-dos-cenarios'
import { migrarBancoDeTeste } from '../fakes/banco-migrado'

const url = process.env.ARQUIPELAGO_CENARIOS_TEST_DATABASE_URL
if (url) {
  const u = new URL(url)
  if (
    !['postgres:', 'postgresql:'].includes(u.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) ||
    !/^\/arquipelago_test[a-z0-9_]*$/.test(u.pathname)
  )
    throw Error('Use banco local descartável arquipelago_test')
}
let db: DbConnection
beforeAll(async () => {
  if (!url) return
  db = createDbConnection(url, { max: 4 })
  await migrarBancoDeTeste(db)
}, 120_000)
afterAll(async () => {
  await db?.close()
})
test.skipIf(!url)(
  'Postgres real: revisão e histórico são atômicos em duas sessões e retries',
  async () => {
    const repo = new DrizzleRepositorioDeCenarios(db.db),
      catalogo = async () => ({ id: 'catalogo', digest: 'a'.repeat(64), modelos: new Map() }),
      a = new ServicoDeCenarios(repo, catalogo),
      b = new ServicoDeCenarios(repo, catalogo),
      autor = { id: randomUUID(), podeEscrever: true, podeRevisar: true }
    const documento: DocumentoDeCenario = {
      formato: 'molda-cenario',
      versao: 1,
      id: 'base',
      nome: 'Base',
      unidade: 'metro',
      eixoVertical: 'y',
      base: { id: 'faisca-v2', versao: '1' },
      catalogo: { id: 'catalogo', digest: 'a'.repeat(64) },
      grupos: [],
      instancias: [],
      caminhos: [],
      aguas: [],
      relevo: [],
      marcos: [],
      iluminacao: { noite: false },
    }
    const entrada = { nome: 'Faísca QA', documento, operacaoId: randomUUID() },
      p = await a.criar(autor, entrada)
    expect((await b.criar(autor, entrada)).projetoId).toBe(p.projetoId)
    const op = {
      revisaoEsperada: 0,
      operacaoId: randomUUID(),
      comandos: [{ tipo: 'iluminacao.definir', noite: true }],
    }
    const r = await Promise.all([
      a.editar(autor, p.projetoId, op),
      b.editar(autor, p.projetoId, op),
    ])
    expect(r[0]).toEqual(r[1])
    expect((await repo.ler(p.projetoId))!.revisao).toBe(1)
    expect(await repo.historico(p.projetoId)).toHaveLength(2)
    const concorrentes = await Promise.allSettled([
      a.editar(autor, p.projetoId, {
        revisaoEsperada: 1,
        operacaoId: randomUUID(),
        comandos: [{ tipo: 'projeto.renomear', nome: 'A' }],
      }),
      b.editar(autor, p.projetoId, {
        revisaoEsperada: 1,
        operacaoId: randomUUID(),
        comandos: [{ tipo: 'projeto.renomear', nome: 'B' }],
      }),
    ])
    expect(concorrentes.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect((await repo.ler(p.projetoId))!.revisao).toBe(2)
    expect(await repo.historico(p.projetoId)).toHaveLength(3)
    expect(await repo.aplicar(p.projetoId, 1)).toBe(false)
    expect(await repo.aplicar(p.projetoId, 2)).toBe(true)
    expect((await repo.listar()).find((pj) => pj.id === p.projetoId)!.revisaoAplicada).toBe(2)
    const app = rotasDosCenarios({ cenarios: a, tokenInterno: 'cenario-qa-interno' })
    const cabecalhos = {
      'x-internal-token': 'cenario-qa-interno',
      'x-auth-user-id': autor.id,
      'x-auth-user-role': 'admin',
      'x-auth-user-status': 'active',
    }
    const caminho = `http://localhost/arquipelago/admin/cenarios/projetos/${p.projetoId}`
    expect((await app.handle(new Request(caminho, { headers: cabecalhos }))).status).toBe(200)
    expect(
      (
        await app.handle(
          new Request(caminho, { headers: { ...cabecalhos, 'x-auth-user-role': 'staff' } }),
        )
      ).status,
    ).toBe(403)
    expect(
      (
        await app.handle(
          new Request(caminho, { headers: { ...cabecalhos, 'x-internal-token': 'incorreto' } }),
        )
      ).status,
    ).toBe(401)
    expect(
      (await app.handle(new Request(`${caminho}?revisao=-1`, { headers: cabecalhos }))).status,
    ).toBe(400)
    const stale = await app.handle(
      new Request(`${caminho}/comandos`, {
        method: 'POST',
        headers: { ...cabecalhos, 'content-type': 'application/json' },
        body: JSON.stringify({
          revisaoEsperada: 0,
          operacaoId: randomUUID(),
          comandos: [{ tipo: 'iluminacao.definir', noite: false }],
        }),
      }),
    )
    expect(stale.status).toBe(409)
    expect((await stale.json()).revisaoAtual).toBe(2)
  },
)
