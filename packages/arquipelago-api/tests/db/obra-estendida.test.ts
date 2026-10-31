import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  criarSalvamentoInicial,
  LeituraDaObraEstendidaSchema,
  type ObraEstendida,
  ObraEstendidaSchema,
  obraEstendidaVazia,
  type PublicoJogo,
} from '@sistemazero/arquipelago-contracts'
import { createLogger } from '@sistemazero/core/logging'
import { LeiturasDosMembros } from '../../src/application/leituras-dos-membros'
import { ConferenciaDoMapa } from '../../src/application/mapa-das-ilhas'
import { ServicoDaEquipe } from '../../src/application/servico-da-equipe'
import { ServicoDaObraEstendida } from '../../src/application/servico-da-obra-estendida'
import { ServicoDasCartas } from '../../src/application/servico-das-cartas'
import { ServicoDoJogo } from '../../src/application/servico-do-jogo'
import { ObraSemSalvamentoError } from '../../src/domain/obra-estendida.port'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleRepositorioDoJogo } from '../../src/infrastructure/persistence/drizzle/repositorio'
import { DrizzleRepositorioDaObraEstendida } from '../../src/infrastructure/persistence/drizzle/repositorio-obra-estendida'
import { createServer } from '../../src/interfaces/http/server'
import { migrarBancoDeTeste } from '../fakes/banco-migrado'
import { DesafiosEmMemoria, desafiosDesligados } from '../fakes/desafios'

const url =
  process.env.ARQUIPELAGO_OBRA_ESTENDIDA_TEST_DATABASE_URL ?? process.env.TEST_DATABASE_URL
if (url) {
  const u = new URL(url)
  if (
    !['postgres:', 'postgresql:'].includes(u.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) ||
    !/^\/arquipelago_test[a-z0-9_]*$/.test(u.pathname)
  )
    throw new Error('Use Postgres local descartável arquipelago_test para a obra estendida')
}
let db: DbConnection
let repo: DrizzleRepositorioDaObraEstendida
let saves: DrizzleRepositorioDoJogo
const agora = new Date('2026-10-31T12:00:00Z')
const politica = {
  modo: 'aberto' as const,
  publicos: new Set<PublicoJogo>(['kids', 'adulto']),
  lista: new Set<string>(),
}
const token = 'obra-local-qa'
const comAndar = (n = 3): ObraEstendida => ({
  ...obraEstendidaVazia(),
  andar: {
    escada: { x: 0, z: 0, giro: 1 },
    paredes: [{ x: 0, z: 0, eixo: 'x', n }],
    aberturas: [],
    pisos: [],
  },
})

beforeAll(async () => {
  if (!url) return
  db = createDbConnection(url, { max: 6 })
  await migrarBancoDeTeste(db)
  repo = new DrizzleRepositorioDaObraEstendida(db.db)
  saves = new DrizzleRepositorioDoJogo(db.db)
})
afterAll(async () => {
  await db?.close()
})

async function perfil(publico: PublicoJogo = 'kids') {
  const id = crypto.randomUUID(),
    contaId = crypto.randomUUID()
  await saves.gravarSalvamento({
    jogadorId: id,
    publico,
    contaId: publico === 'kids' ? contaId : null,
    salvamento: criarSalvamentoInicial(agora),
    revisaoBase: 0,
    agora,
  })
  return { id, contaId, publico }
}
function headers(p: { id: string; contaId: string; publico: PublicoJogo }) {
  return {
    'x-internal-token': token,
    'x-auth-user-id': p.id,
    'x-auth-user-role': 'member',
    'x-auth-user-status': 'active',
    ...(p.publico === 'kids'
      ? { 'x-auth-account-id': p.contaId, 'x-auth-kids-context': 'student' }
      : {}),
  }
}

describe.skipIf(!url)('obra estendida no Postgres e HTTP reais', () => {
  test('revisão por troca: só um primeiro vence; quem perde recebe o guardado', async () => {
    const p = await perfil()
    expect(await repo.ler(p.id, 'kids')).toEqual({ revisao: 0, obra: null })
    const corrida = await Promise.all(
      [1, 2, 3, 4].map((n) =>
        repo.gravar(p.id, 'kids', { revisaoBase: 0, obra: comAndar(n) }, agora),
      ),
    )
    const vencedoras = corrida.filter((r) => r.ok)
    expect(vencedoras).toHaveLength(1)
    const guardada = await repo.ler(p.id, 'kids')
    expect(guardada.revisao).toBe(1)
    for (const r of corrida) if (!r.ok) expect(r.atual).toEqual(guardada)
    const segunda = await repo.gravar(p.id, 'kids', { revisaoBase: 1, obra: comAndar(9) }, agora)
    expect(segunda).toEqual({ ok: true, guardada: { revisao: 2, obra: comAndar(9) } })
    expect(
      await repo.gravar(p.id, 'kids', { revisaoBase: 1, obra: obraEstendidaVazia() }, agora),
    ).toEqual({ ok: false, atual: { revisao: 2, obra: comAndar(9) } })
  })

  test('sem salvamento do mesmo público não grava; apagar o salvamento apaga a obra', async () => {
    await expect(
      repo.gravar(crypto.randomUUID(), 'kids', { revisaoBase: 0, obra: comAndar() }, agora),
    ).rejects.toBeInstanceOf(ObraSemSalvamentoError)
    const p = await perfil('adulto')
    await expect(
      repo.gravar(p.id, 'kids', { revisaoBase: 0, obra: comAndar() }, agora),
    ).rejects.toBeInstanceOf(ObraSemSalvamentoError)
    expect(
      (await repo.gravar(p.id, 'adulto', { revisaoBase: 0, obra: comAndar() }, agora)).ok,
    ).toBe(true)
    await db.sql`delete from arquipelago.salvamentos where jogador_id=${p.id}`
    const linhas =
      await db.sql`select count(*)::int as n from arquipelago.obras_estendidas where jogador_id=${p.id}`
    expect(linhas[0]?.n).toBe(0)
  })

  test('a maior obra do contrato cabe no teto do JSONB; versão desconhecida é recusada no banco', async () => {
    const p = await perfil()
    const alturas: [number, number, number][] = []
    for (let x = -60; x < -10; x++) for (let z = -60; z < -48; z++) alturas.push([x, z, 3])
    const grande = ObraEstendidaSchema.parse({
      versao: 1,
      iglu: null,
      andar: {
        escada: { x: -60, z: -60, giro: 3 },
        paredes: Array.from({ length: 120 }, (_, i) => ({ x: -60, z: -60 + i, eixo: 'x', n: 60 })),
        aberturas: Array.from({ length: 30 }, (_, i) => ({
          tipo: 'janela-redonda',
          x: -60,
          z: -60 + i,
          eixo: 'z',
        })),
        pisos: Array.from({ length: 20 }, (_, i) => ({ x: -60, z: -60 + i, tipo: 'ladrilho' })),
      },
      terreno: { alturas },
    })
    expect((await repo.gravar(p.id, 'kids', { revisaoBase: 0, obra: grande }, agora)).ok).toBe(true)
    expect(await repo.ler(p.id, 'kids')).toEqual({ revisao: 1, obra: grande })
    const recusa =
      await db.sql`update arquipelago.obras_estendidas set documento = '{"versao":2}'::jsonb where jogador_id=${p.id}`.then(
        () => null,
        (e: unknown) => e,
      )
    expect(String(recusa)).toContain('obras_estendidas_versao_check')
  })

  test('HTTP: leitura própria, 409 com o guardado, suporte só lê e 400 fora do contrato', async () => {
    const p = await perfil()
    const logger = createLogger({ level: 'error' })
    const leituras = new LeiturasDosMembros(null)
    const app = createServer({
      logger,
      obraEstendida: new ServicoDaObraEstendida({ repo, politica, agora: () => agora }),
      servico: new ServicoDoJogo(saves, politica),
      cartas: new ServicoDasCartas(politica, leituras),
      equipe: new ServicoDaEquipe(
        new DesafiosEmMemoria(),
        null,
        leituras,
        new ConferenciaDoMapa(null, logger),
      ),
      desafios: desafiosDesligados(politica),
      cliente: { dir: '.', servirMapas: false },
      tokenInterno: token,
      readiness: async () => {},
    })
    const caminho = 'http://local/arquipelago/obra-estendida'
    const put = (corpo: unknown, extra: Record<string, string> = {}) =>
      app.handle(
        new Request(caminho, {
          method: 'PUT',
          headers: { ...headers(p), ...extra, 'content-type': 'application/json' },
          body: JSON.stringify(corpo),
        }),
      )
    expect((await put({ revisaoBase: 0, obra: comAndar() })).status).toBe(200)
    const velho = await put({ revisaoBase: 0, obra: obraEstendidaVazia() })
    expect(velho.status).toBe(409)
    const corpo = (await velho.json()) as { atual: unknown }
    expect(LeituraDaObraEstendidaSchema.parse(corpo.atual)).toEqual({
      revisao: 1,
      obra: comAndar(),
    })
    expect(
      (await put({ revisaoBase: 1, obra: comAndar() }, { 'x-auth-impersonator-id': p.contaId }))
        .status,
    ).toBe(403)
    expect((await put({ revisaoBase: 1, obra: { ...comAndar(), iglu: 'casa' } })).status).toBe(400)
    const lida = await app.handle(new Request(caminho, { headers: headers(p) }))
    expect(lida.headers.get('cache-control')).toBe('private, no-store')
    expect(await lida.json()).toEqual({ revisao: 1, obra: comAndar() })
  })
})
