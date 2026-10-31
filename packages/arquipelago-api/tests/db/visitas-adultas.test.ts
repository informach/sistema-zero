import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import {
  CasaDaVisitaAdultaSchema,
  criarSalvamentoInicial,
  type PublicoJogo,
} from '@sistemazero/arquipelago-contracts'
import { createLogger } from '@sistemazero/core/logging'
import { LeiturasDosMembros } from '../../src/application/leituras-dos-membros'
import { ConferenciaDoMapa } from '../../src/application/mapa-das-ilhas'
import { ServicoDaEquipe } from '../../src/application/servico-da-equipe'
import { ServicoDasCartas } from '../../src/application/servico-das-cartas'
import { ServicoDasVisitasAdultas } from '../../src/application/servico-das-visitas-adultas'
import { ServicoDoJogo } from '../../src/application/servico-do-jogo'
import type { PortaDosMembros } from '../../src/domain/membros.port'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleRepositorioDoJogo } from '../../src/infrastructure/persistence/drizzle/repositorio'
import { DrizzleRepositorioDasVisitasAdultas } from '../../src/infrastructure/persistence/drizzle/repositorio-visitas-adultas'
import { createServer } from '../../src/interfaces/http/server'
import { migrarBancoDeTeste } from '../fakes/banco-migrado'
import { DesafiosEmMemoria, desafiosDesligados } from '../fakes/desafios'

const url =
  process.env.ARQUIPELAGO_VISITAS_ADULTAS_TEST_DATABASE_URL ?? process.env.TEST_DATABASE_URL
if (url) {
  const u = new URL(url)
  if (
    !['postgres:', 'postgresql:'].includes(u.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) ||
    !/^\/arquipelago_test[a-z0-9_]*$/.test(u.pathname)
  )
    throw new Error('Visitas adultas exigem Postgres local descartável arquipelago_test')
}
let db: DbConnection, repo: DrizzleRepositorioDasVisitasAdultas, saves: DrizzleRepositorioDoJogo
const agora = new Date('2026-10-30T12:00:00Z')
const politica = {
  modo: 'aberto' as const,
  publicos: new Set<PublicoJogo>(['kids', 'adulto']),
  lista: new Set<string>(),
}
beforeAll(async () => {
  if (!url) return
  db = createDbConnection(url, { max: 6 })
  await migrarBancoDeTeste(db)
  repo = new DrizzleRepositorioDasVisitasAdultas(db.db)
  saves = new DrizzleRepositorioDoJogo(db.db)
})
afterAll(async () => {
  await db?.close()
})
async function pessoa(publico: PublicoJogo = 'adulto') {
  const id = crypto.randomUUID()
  await saves.gravarSalvamento({
    jogadorId: id,
    publico,
    salvamento: criarSalvamentoInicial(agora),
    revisaoBase: 0,
    agora,
  })
  return id
}
function montar(membros?: Pick<PortaDosMembros, 'lerQuarto'>) {
  const logger = createLogger({ level: 'error' }),
    leituras = new LeiturasDosMembros(null)
  return createServer({
    logger,
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
    tokenInterno: 'visitas-adultas-local',
    readiness: async () => {},
    visitasAdultas: new ServicoDasVisitasAdultas({ repo, politica, membros }),
  })
}
type App = ReturnType<typeof montar>
async function pedir(
  app: App,
  id: string,
  acao: string,
  metodo = 'GET',
  corpo?: unknown,
  extras: Record<string, string> = {},
) {
  return app.handle(
    new Request(`http://localhost/arquipelago/visitas-adultas/${acao}`, {
      method: metodo,
      headers: {
        'x-internal-token': 'visitas-adultas-local',
        'x-auth-user-id': id,
        'x-auth-user-role': 'member',
        'x-auth-user-status': 'active',
        ...(corpo === undefined ? {} : { 'content-type': 'application/json' }),
        ...extras,
      },
      ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
    }),
  )
}
async function gerar(app: App, id: string) {
  const r = await pedir(app, id, 'convite', 'POST', {})
  expect(r.status).toBe(200)
  return ((await r.json()) as { codigo: string }).codigo
}

describe.skipIf(!url)('convites adultos em banco e HTTP reais', () => {
  test('começa desligado; exige save adulto e não devolve código na consulta', async () => {
    const id = crypto.randomUUID(),
      app = montar()
    expect(await (await pedir(app, id, 'convite')).json()).toEqual({ versao: 1, ativo: false })
    expect((await pedir(app, id, 'convite', 'POST', {})).status).toBe(409)
    expect(await repo.gerar(await pessoa('kids'), 'a'.repeat(64), agora)).toBe(false)
    const dono = await pessoa(),
      antes = await saves.lerSalvamento(dono)
    const codigo = await gerar(app, dono)
    expect(codigo).toHaveLength(32)
    const consulta = await pedir(app, dono, 'convite')
    expect(consulta.headers.get('cache-control')).toBe('private, no-store')
    expect(await consulta.json()).toEqual({ versao: 1, ativo: true })
    const [linha] =
      await db.sql`select * from arquipelago.convites_adultos where jogador_id=${dono}`
    expect(linha?.hash).toBe(createHash('sha256').update(codigo).digest('hex'))
    expect(JSON.stringify(linha)).not.toContain(codigo)
    expect(await saves.lerSalvamento(dono)).toEqual(antes)
  })
  test('abrir projeta a casa sem identidade e elimina campos extras do quarto e de seus itens', async () => {
    const dono = await pessoa(),
      visita = await pessoa(),
      chamadas: unknown[] = []
    const app = montar({
      lerQuarto: async (q) => {
        chamadas.push(q)
        return {
          quarto: {
            theme: 'padrao',
            pet: null,
            placedItems: [{ itemId: 'planta', x: 0, y: 0, segredo: 'privado-item' }],
            segredo: 'privado-quarto',
          },
        }
      },
    })
    const codigo = await gerar(app, dono),
      antes = await saves.lerSalvamento(visita)
    const r = await pedir(app, visita, 'abrir', 'POST', { codigo }),
      corpo = await r.json()
    expect(r.status).toBe(200)
    expect(CasaDaVisitaAdultaSchema.safeParse(corpo).success).toBe(true)
    expect(chamadas).toEqual([{ userId: dono, audience: 'adult' }])
    expect(JSON.stringify(corpo)).not.toContain(dono)
    expect(JSON.stringify(corpo)).not.toContain('privado')
    // L2e: o andar de cima e o terreno da obra estendida vão junto (nulos: o dono não construiu).
    expect(Object.keys(corpo).sort()).toEqual([
      'andar',
      'completos',
      'horta',
      'obra',
      'quarto',
      'terreno',
      'versao',
    ])
    expect(corpo.andar).toBeNull()
    expect(corpo.terreno).toBeNull()
    expect(await saves.lerSalvamento(visita)).toEqual(antes)
  })
  test('rotação e revogação invalidam imediatamente a próxima leitura; DELETE é idempotente', async () => {
    const app = montar(),
      dono = await pessoa(),
      visita = await pessoa()
    const velho = await gerar(app, dono),
      novo = await gerar(app, dono)
    expect(novo).not.toBe(velho)
    expect((await pedir(app, visita, 'abrir', 'POST', { codigo: velho })).status).toBe(404)
    expect((await pedir(app, visita, 'conferir', 'POST', { codigo: novo })).status).toBe(200)
    expect((await pedir(app, dono, 'convite', 'DELETE')).status).toBe(200)
    expect((await pedir(app, visita, 'conferir', 'POST', { codigo: novo })).status).toBe(404)
    expect((await pedir(app, dono, 'convite', 'DELETE')).status).toBe(200)
  })
  test('sessões Kids não leem nem criam visitas adultas; suporte não altera consentimento', async () => {
    const app = montar(),
      dono = await pessoa(),
      visita = await pessoa(),
      codigo = await gerar(app, dono)
    const kid = { 'x-auth-account-id': crypto.randomUUID(), 'x-auth-kids-context': 'student' }
    for (const [acao, metodo, corpo] of [
      ['convite', 'GET', undefined],
      ['convite', 'POST', {}],
      ['convite', 'DELETE', undefined],
      ['abrir', 'POST', { codigo }],
      ['conferir', 'POST', { codigo }],
    ] as const)
      expect((await pedir(app, visita, acao, metodo, corpo, kid)).status).toBe(403)
    const h = { 'x-auth-user-role': 'admin', 'x-auth-impersonator-id': crypto.randomUUID() }
    expect((await pedir(app, dono, 'convite', 'POST', {}, h)).status).toBe(403)
    expect((await pedir(app, dono, 'convite', 'DELETE', undefined, h)).status).toBe(403)
    expect((await pedir(app, dono, 'abrir', 'POST', { codigo })).status).toBe(404)
  })
  test('revogar enquanto o Members lê o quarto impede a entrega da casa', async () => {
    const dono = await pessoa(),
      visita = await pessoa()
    let entrou!: () => void, liberar!: () => void
    const leitura = new Promise<void>((r) => {
        entrou = r
      }),
      pronta = new Promise<void>((r) => {
        liberar = r
      })
    const app = montar({
      lerQuarto: async () => {
        entrou()
        await pronta
        return { quarto: { theme: 'padrao', pet: null, placedItems: [] } }
      },
    })
    const codigo = await gerar(app, dono),
      abrindo = pedir(app, visita, 'abrir', 'POST', { codigo })
    await leitura
    await repo.desligar(dono)
    liberar()
    expect((await abrindo).status).toBe(404)
  })
  test('gerações concorrentes conservam uma linha e só o último código vale; cascade remove o convite', async () => {
    const app = montar(),
      dono = await pessoa(),
      visita = await pessoa()
    const codigos = await Promise.all(Array.from({ length: 4 }, () => gerar(app, dono)))
    const estados = await Promise.all(
      codigos.map((codigo) => pedir(app, visita, 'conferir', 'POST', { codigo })),
    )
    expect(estados.filter((r) => r.status === 200)).toHaveLength(1)
    const [linha] =
      await db.sql`select count(*)::int as n from arquipelago.convites_adultos where jogador_id=${dono}`
    expect(linha?.n).toBe(1)
    await db.sql`delete from arquipelago.salvamentos where jogador_id=${dono}`
    expect(await repo.ativo(dono)).toBe(false)
    expect(await repo.dono(createHash('sha256').update(codigos[0]!).digest('hex'))).toBeNull()
  })
  test('validação estrita e token interno não expõem o convite em erros', async () => {
    const app = montar(),
      dono = await pessoa(),
      codigo = await gerar(app, dono)
    for (const corpo of [{ codigo, nome: 'privado' }, { codigo: 'errado' }]) {
      const r = await pedir(app, dono, 'abrir', 'POST', corpo)
      expect(r.status).toBe(400)
      expect(await r.text()).not.toContain(codigo)
    }
    expect((await pedir(app, dono, 'convite', 'POST', { codigo })).status).toBe(400)
    expect(
      (await pedir(app, dono, 'convite', 'GET', undefined, { 'x-internal-token': 'errado' }))
        .status,
    ).toBe(401)
    expect((await pedir(app, dono, `abrir/${codigo}`)).status).toBe(404)
  })
  test('o teto de 1024 bytes vale pelo corpo real, mesmo sem Content-Length', async () => {
    const app = montar(),
      dono = await pessoa()
    const r = await pedir(app, dono, 'abrir', 'POST', { codigo: 'a'.repeat(2048) })
    expect(r.status).toBe(413)
    expect(await r.text()).not.toContain('a'.repeat(32))
  })
})
