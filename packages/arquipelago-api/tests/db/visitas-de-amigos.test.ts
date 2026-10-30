import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import {
  CasaDeAmigoSchema,
  CasasDeAmigosSchema,
  criarSalvamentoInicial,
  PERMISSOES_PADRAO,
  type PublicoJogo,
} from '@sistemazero/arquipelago-contracts'
import { createLogger } from '@sistemazero/core/logging'
import { LeiturasDosMembros } from '../../src/application/leituras-dos-membros'
import { ConferenciaDoMapa } from '../../src/application/mapa-das-ilhas'
import { ServicoDaEquipe } from '../../src/application/servico-da-equipe'
import { ServicoDasCartas } from '../../src/application/servico-das-cartas'
import { ServicoDasVisitasDeAmigos } from '../../src/application/servico-das-visitas-de-amigos'
import { ServicoDoJogo } from '../../src/application/servico-do-jogo'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleRepositorioDoJogo } from '../../src/infrastructure/persistence/drizzle/repositorio'
import { DrizzleRepositorioDaFamilia } from '../../src/infrastructure/persistence/drizzle/repositorio-da-familia'
import { DrizzleRepositorioDasVisitasDeAmigos } from '../../src/infrastructure/persistence/drizzle/repositorio-visitas-de-amigos'
import { createServer } from '../../src/interfaces/http/server'
import { migrarBancoDeTeste } from '../fakes/banco-migrado'
import { DesafiosEmMemoria, desafiosDesligados } from '../fakes/desafios'

const url = process.env.TEST_DATABASE_URL
if (url) {
  const u = new URL(url)
  if (
    !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) ||
    !/^\/arquipelago_test[a-z0-9_]*$/.test(u.pathname)
  )
    throw new Error('Visitas de amigos exigem Postgres local descartável arquipelago_test')
}
let db: DbConnection
let saves: DrizzleRepositorioDoJogo
let familia: DrizzleRepositorioDaFamilia
let repo: DrizzleRepositorioDasVisitasDeAmigos
const agora = new Date('2026-10-30T12:00:00Z')
const politica = {
  modo: 'aberto' as const,
  publicos: new Set<PublicoJogo>(['kids', 'adulto']),
  lista: new Set<string>(),
}
const TOKEN = 'amigos-local'

beforeAll(async () => {
  if (!url) return
  db = createDbConnection(url, { max: 6 })
  await migrarBancoDeTeste(db)
  saves = new DrizzleRepositorioDoJogo(db.db)
  familia = new DrizzleRepositorioDaFamilia(db.db)
  repo = new DrizzleRepositorioDasVisitasDeAmigos(db.db)
})
afterAll(async () => {
  await db?.close()
})

/** Uma família com uma criança que já guardou o jogo. */
async function familiaCom(ligado: boolean) {
  const conta = crypto.randomUUID()
  const crianca = crypto.randomUUID()
  await saves.gravarSalvamento({
    jogadorId: crianca,
    publico: 'kids',
    revisaoBase: 0,
    salvamento: criarSalvamentoInicial(agora),
    agora,
    contaId: conta,
  })
  if (ligado)
    await familia.gravarPermissoes(
      conta,
      { ...PERMISSOES_PADRAO, visitasDeOutrasCriancas: true },
      agora,
    )
  return { conta, crianca }
}

function montar() {
  const logger = createLogger({ level: 'error' })
  const leituras = new LeiturasDosMembros(null)
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
    tokenInterno: TOKEN,
    readiness: async () => {},
    amigos: new ServicoDasVisitasDeAmigos({ repo, familia, politica, agora: () => agora }),
  })
}
type App = ReturnType<typeof montar>

const comoPais = (conta: string, extras: Record<string, string> = {}) => ({
  'x-internal-token': TOKEN,
  'x-auth-user-id': conta,
  'x-auth-user-role': 'member',
  'x-auth-user-status': 'active',
  'x-auth-kids-context': 'parent',
  ...extras,
})
const comoCrianca = (conta: string, crianca: string) => ({
  'x-internal-token': TOKEN,
  'x-auth-user-id': crianca,
  'x-auth-account-id': conta,
  'x-auth-user-role': 'member',
  'x-auth-user-status': 'active',
  'x-auth-kids-context': 'student',
})

async function pedir(
  app: App,
  caminho: string,
  headers: Record<string, string>,
  metodo = 'GET',
  corpo?: unknown,
) {
  return app.handle(
    new Request(`http://localhost/arquipelago/${caminho}`, {
      method: metodo,
      headers: {
        ...headers,
        ...(corpo === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
    }),
  )
}

describe.skipIf(!url)('visitas de outras crianças em banco e HTTP reais (N08a)', () => {
  test('com o interruptor desligado, nada se gera, nada se aceita e a criança não vê casas', async () => {
    const app = montar()
    const a = await familiaCom(false)
    const r = await pedir(app, 'familia/amigos/convite', comoPais(a.conta), 'POST', {
      perfilId: a.crianca,
    })
    expect(r.status).toBe(403)
    const lido = await (
      await pedir(app, `familia/amigos?perfis=${a.crianca}`, comoPais(a.conta))
    ).json()
    expect(lido).toEqual({
      versao: 1,
      situacao: 'desligado',
      convites: [{ perfilId: a.crianca, ativo: false }],
      casas: [],
    })
    const casas = CasasDeAmigosSchema.parse(
      await (await pedir(app, 'amigos', comoCrianca(a.conta, a.crianca))).json(),
    )
    expect(casas).toEqual({ versao: 1, situacao: 'desligado', casas: [] })
  })

  test('o responsável gera, a outra família aceita com apelido e a criança visita só lendo', async () => {
    const app = montar()
    const anfitria = await familiaCom(true)
    const visitante = await familiaCom(true)
    const gerado = await pedir(app, 'familia/amigos/convite', comoPais(anfitria.conta), 'POST', {
      perfilId: anfitria.crianca,
    })
    expect(gerado.status).toBe(200)
    const { codigo } = (await gerado.json()) as { codigo: string }
    expect(codigo).toHaveLength(32)
    const [linha] =
      await db.sql`select * from arquipelago.convites_de_amigos where perfil_id=${anfitria.crianca}`
    expect(linha?.hash).toBe(createHash('sha256').update(codigo).digest('hex'))
    expect(JSON.stringify(linha)).not.toContain(codigo)
    // A própria família não aceita o próprio código.
    expect(
      (
        await pedir(app, 'familia/amigos/aceitar', comoPais(anfitria.conta), 'POST', {
          codigo,
          apelido: 'Nós',
        })
      ).status,
    ).toBe(404)
    // Apelido com sinais de código é recusado.
    expect(
      (
        await pedir(app, 'familia/amigos/aceitar', comoPais(visitante.conta), 'POST', {
          codigo,
          apelido: '<b>',
        })
      ).status,
    ).toBe(400)
    const aceito = await pedir(app, 'familia/amigos/aceitar', comoPais(visitante.conta), 'POST', {
      codigo,
      apelido: 'Casa da Lua',
    })
    expect(aceito.status).toBe(200)
    const { id } = (await aceito.json()) as { id: string }
    const casas = CasasDeAmigosSchema.parse(
      await (await pedir(app, 'amigos', comoCrianca(visitante.conta, visitante.crianca))).json(),
    )
    expect(casas.casas).toEqual([{ id, apelido: 'Casa da Lua' }])
    const casa = CasaDeAmigoSchema.parse(
      await (
        await pedir(app, `amigos/${id}/casa`, comoCrianca(visitante.conta, visitante.crianca))
      ).json(),
    )
    expect(casa).toMatchObject({
      id,
      apelido: 'Casa da Lua',
      obra: null,
      completos: [],
      quarto: null,
    })
    expect(JSON.stringify(casa)).not.toContain(anfitria.crianca)
    // A criança anfitriã não ganha nada na lista dela; a visitante não lê a casa de outra família.
    const outra = await familiaCom(true)
    expect(
      (await pedir(app, `amigos/${id}/casa`, comoCrianca(outra.conta, outra.crianca))).status,
    ).toBe(404)
  })

  test('desligar, apagar o convite ou remover o aceite fecha a visita', async () => {
    const app = montar()
    const anfitria = await familiaCom(true)
    const visitante = await familiaCom(true)
    const { codigo } = (await (
      await pedir(app, 'familia/amigos/convite', comoPais(anfitria.conta), 'POST', {
        perfilId: anfitria.crianca,
      })
    ).json()) as { codigo: string }
    const { id } = (await (
      await pedir(app, 'familia/amigos/aceitar', comoPais(visitante.conta), 'POST', {
        codigo,
        apelido: 'Ana',
      })
    ).json()) as { id: string }
    const ver = () =>
      pedir(app, `amigos/${id}/casa`, comoCrianca(visitante.conta, visitante.crianca))
    expect((await ver()).status).toBe(200)
    // A família anfitriã desliga: a casa some.
    await familia.gravarPermissoes(
      anfitria.conta,
      { ...PERMISSOES_PADRAO, visitasDeOutrasCriancas: false },
      agora,
    )
    expect((await ver()).status).toBe(404)
    await familia.gravarPermissoes(
      anfitria.conta,
      { ...PERMISSOES_PADRAO, visitasDeOutrasCriancas: true },
      agora,
    )
    expect((await ver()).status).toBe(200)
    // Apagar o convite: some também.
    expect(
      (
        await pedir(
          app,
          `familia/amigos/convite/${anfitria.crianca}`,
          comoPais(anfitria.conta),
          'DELETE',
        )
      ).status,
    ).toBe(200)
    expect((await ver()).status).toBe(404)
    // A família visitante remove o aceite: some da lista dela.
    expect(
      (await pedir(app, `familia/amigos/${id}`, comoPais(visitante.conta), 'DELETE')).status,
    ).toBe(200)
    const lido = await (
      await pedir(app, `familia/amigos?perfis=${visitante.crianca}`, comoPais(visitante.conta))
    ).json()
    expect((lido as { casas: unknown[] }).casas).toEqual([])
  })

  test('suporte só lê: não gera nem aceita', async () => {
    const app = montar()
    const a = await familiaCom(true)
    const r = await pedir(
      app,
      'familia/amigos/convite',
      comoPais(a.conta, { 'x-auth-impersonator-id': crypto.randomUUID() }),
      'POST',
      { perfilId: a.crianca },
    )
    expect(r.status).toBe(403)
  })
})
