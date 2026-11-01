import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  CORPO_DO_FANTASMA_MAX_BYTES,
  compactarResultado,
  criarSalvamentoInicial,
  type Fantasma,
  LeituraDoFantasmaSchema,
  PERCURSOS,
  PERMISSOES_PADRAO,
  type PublicoJogo,
} from '@sistemazero/arquipelago-contracts'
import { createLogger } from '@sistemazero/core/logging'
import { LeiturasDosMembros } from '../../src/application/leituras-dos-membros'
import { ConferenciaDoMapa } from '../../src/application/mapa-das-ilhas'
import { ServicoDaEquipe } from '../../src/application/servico-da-equipe'
import { ServicoDasCartas } from '../../src/application/servico-das-cartas'
import { ServicoDasVisitas } from '../../src/application/servico-das-visitas'
import { ServicoDoJogo } from '../../src/application/servico-do-jogo'
import { ServicoDosFantasmas } from '../../src/application/servico-dos-fantasmas'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleRepositorioDoJogo } from '../../src/infrastructure/persistence/drizzle/repositorio'
import { DrizzleRepositorioDaFamilia } from '../../src/infrastructure/persistence/drizzle/repositorio-da-familia'
import { DrizzleRepositorioDosFantasmas } from '../../src/infrastructure/persistence/drizzle/repositorio-fantasmas'
import { createServer } from '../../src/interfaces/http/server'
import { migrarBancoDeTeste } from '../fakes/banco-migrado'
import { DesafiosEmMemoria, desafiosDesligados } from '../fakes/desafios'

const url = process.env.ARQUIPELAGO_FANTASMAS_TEST_DATABASE_URL ?? process.env.TEST_DATABASE_URL
if (url) {
  const u = new URL(url)
  if (
    !['postgres:', 'postgresql:'].includes(u.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) ||
    !/^\/arquipelago_test[a-z0-9_]*$/.test(u.pathname)
  )
    throw new Error('Use Postgres local descartável arquipelago_test para fantasmas')
}
let db: DbConnection
let repo: DrizzleRepositorioDosFantasmas
let saves: DrizzleRepositorioDoJogo
let familia: DrizzleRepositorioDaFamilia
const agora = new Date('2026-10-30T12:00:00Z')
const politica = {
  modo: 'aberto' as const,
  publicos: new Set<PublicoJogo>(['kids', 'adulto']),
  lista: new Set<string>(),
}
const token = 'fantasma-local-qa'
const artefato = (tempoMs = 100): Fantasma => ({
  versao: 1,
  percurso: 'bosque-copas',
  tempoMs,
  passoMs: 100,
  amostras: Array.from({ length: Math.ceil(tempoMs / 100) + 1 }, (_, i) => [i, 100, 0, 0]),
})

beforeAll(async () => {
  if (!url) return
  db = createDbConnection(url, { max: 6 })
  await migrarBancoDeTeste(db)
  repo = new DrizzleRepositorioDosFantasmas(db.db)
  saves = new DrizzleRepositorioDoJogo(db.db)
  familia = new DrizzleRepositorioDaFamilia(db.db)
})
afterAll(async () => {
  await db?.close()
})

async function perfil(publico: PublicoJogo = 'kids', contaId = crypto.randomUUID()) {
  const id = crypto.randomUUID()
  const save = criarSalvamentoInicial(agora)
  save.percursos['bosque-copas'] = compactarResultado({
    melhorTempoMs: 100,
    estrelas: { chegada: true, tempo: true, vagalumes: false },
  })
  await saves.gravarSalvamento({
    jogadorId: id,
    publico,
    contaId: publico === 'kids' ? contaId : null,
    salvamento: save,
    revisaoBase: 0,
    agora,
  })
  return { id, contaId, publico, save }
}
function montar() {
  const logger = createLogger({ level: 'error' })
  const leituras = new LeiturasDosMembros(null)
  const visitas = new ServicoDasVisitas({ familia, politica })
  return createServer({
    logger,
    visitas,
    fantasmas: new ServicoDosFantasmas({ repo, politica, visitas, agora: () => agora }),
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

describe.skipIf(!url)('fantasmas no Postgres e HTTP reais', () => {
  test('o banco migrado aceita o fantasma de todos os percursos do contrato (lacunas, L3)', async () => {
    const [trava] = await db.sql<{ def: string }[]>`
      select pg_get_constraintdef(oid) as def from pg_constraint
      where conname = 'fantasmas_percurso_check'`
    for (const percurso of PERCURSOS) expect(trava?.def, percurso).toContain(`'${percurso}'`)
  })
  test('revisão, recorde e público são conferidos; repetição não duplica linha nem modifica o save', async () => {
    const p = await perfil()
    const pedido = { versao: 1 as const, revisaoBase: 1, fantasma: artefato() }
    expect(await repo.guardar(p.id, 'kids', { ...pedido, revisaoBase: 2 }, agora)).toBe(false)
    expect(await repo.guardar(p.id, 'kids', { ...pedido, fantasma: artefato(200) }, agora)).toBe(
      false,
    )
    expect(await repo.guardar(p.id, 'adulto', pedido, agora)).toBe(false)
    const antes = await saves.lerSalvamento(p.id)
    const resultados = await Promise.all(
      Array.from({ length: 4 }, () => repo.guardar(p.id, 'kids', pedido, agora)),
    )
    expect(resultados).toEqual([true, true, true, true])
    expect(await repo.ler(p.id, 'kids', 'bosque-copas')).toEqual(pedido.fantasma)
    expect(await repo.ler(p.id, 'adulto', 'bosque-copas')).toBeNull()
    expect(await saves.lerSalvamento(p.id)).toEqual(antes)
    const linhas =
      await db.sql`select count(*)::int as n from arquipelago.fantasmas where jogador_id=${p.id}`
    expect(linhas[0]?.n).toBe(1)
  })

  test('novo recorde esconde a trajetória antiga; a nova substitui e a exclusão do save remove o artefato', async () => {
    const p = await perfil()
    await repo.guardar(p.id, p.publico, { versao: 1, revisaoBase: 1, fantasma: artefato() }, agora)
    p.save.percursos['bosque-copas']![1] = 50
    await saves.gravarSalvamento({
      jogadorId: p.id,
      publico: p.publico,
      salvamento: p.save,
      revisaoBase: 1,
      agora,
    })
    expect(await repo.ler(p.id, p.publico, 'bosque-copas')).toBeNull()
    expect(
      await repo.guardar(
        p.id,
        p.publico,
        { versao: 1, revisaoBase: 1, fantasma: artefato() },
        agora,
      ),
    ).toBe(false)
    expect(
      await repo.guardar(
        p.id,
        p.publico,
        { versao: 1, revisaoBase: 2, fantasma: artefato(50) },
        agora,
      ),
    ).toBe(true)
    expect((await repo.ler(p.id, p.publico, 'bosque-copas'))?.tempoMs).toBe(50)
    await db.sql`delete from arquipelago.salvamentos where jogador_id=${p.id}`
    expect(
      (
        await db.sql`select count(*)::int as n from arquipelago.fantasmas where jogador_id=${p.id}`
      )[0]?.n,
    ).toBe(0)
  })

  test('maior artefato do contrato cabe no JSONB com o teto de bytes', async () => {
    const p = await perfil()
    const f: Fantasma = {
      ...artefato(),
      tempoMs: 300000,
      amostras: Array.from({ length: 3001 }, () => [-50000, -50000, -50000, 65535]),
    }
    p.save.percursos['bosque-copas']![1] = f.tempoMs
    await saves.gravarSalvamento({
      jogadorId: p.id,
      publico: p.publico,
      salvamento: p.save,
      revisaoBase: 1,
      agora,
    })
    expect(
      await repo.guardar(p.id, p.publico, { versao: 1, revisaoBase: 2, fantasma: f }, agora),
    ).toBe(true)
    expect(await repo.ler(p.id, p.publico, 'bosque-copas')).toEqual(f)
  })

  test('ler de outro perfil exige família, acesso e consentimento atuais; adultos e suporte não ampliam acesso', async () => {
    const a = await perfil(),
      b = await perfil('kids', a.contaId),
      outro = await perfil(),
      adulto = await perfil('adulto')
    await repo.guardar(b.id, b.publico, { versao: 1, revisaoBase: 1, fantasma: artefato() }, agora)
    const app = montar()
    const ler = (p: typeof a, id: string) =>
      app.handle(
        new Request(`http://local/arquipelago/irmaos/${id}/fantasmas/bosque-copas`, {
          headers: headers(p),
        }),
      )
    const permitido = await ler(a, b.id)
    expect(permitido.status).toBe(200)
    expect(permitido.headers.get('cache-control')).toBe('private, no-store')
    const corpo: unknown = await permitido.json()
    expect(LeituraDoFantasmaSchema.safeParse(corpo).success).toBe(true)
    expect(JSON.stringify(corpo)).not.toContain(b.id)
    for (const [p, id] of [
      [a, a.id],
      [a, outro.id],
      [adulto, b.id],
    ] as const)
      expect((await ler(p, id)).status).toBe(404)
    await familia.gravarPermissoes(
      a.contaId,
      { ...PERMISSOES_PADRAO, visitasDeIrmaos: false },
      agora,
    )
    expect((await ler(a, b.id)).status).toBe(403)
    await familia.gravarPermissoes(a.contaId, PERMISSOES_PADRAO, agora)
    expect((await ler(a, b.id)).status).toBe(200)
    politica.publicos.delete('kids')
    try {
      expect((await ler(a, b.id)).status).toBe(403)
    } finally {
      politica.publicos.add('kids')
    }
    const pedido = { versao: 1, revisaoBase: 1, fantasma: artefato() }
    const suporte = await app.handle(
      new Request('http://local/arquipelago/fantasmas', {
        method: 'PUT',
        headers: {
          ...headers(a),
          'content-type': 'application/json',
          'x-auth-impersonator-id': crypto.randomUUID(),
        },
        body: JSON.stringify(pedido),
      }),
    )
    expect(suporte.status).toBe(403)
  })

  test('HTTP valida bytes reais, identidade e contrato e preserva o artefato após recusa', async () => {
    const p = await perfil()
    const app = montar()
    const put = (body: string, h = headers(p)) =>
      app.handle(
        new Request('http://local/arquipelago/fantasmas', {
          method: 'PUT',
          headers: { ...h, 'content-type': 'application/json' },
          body,
        }),
      )
    const pedido = { versao: 1, revisaoBase: 1, fantasma: artefato() }
    expect((await put(JSON.stringify(pedido))).status).toBe(200)
    expect((await put(JSON.stringify({ ...pedido, revisaoBase: 2 }))).status).toBe(409)
    expect((await put(JSON.stringify({ ...pedido, moedas: 100 }))).status).toBe(400)
    expect((await put('{')).status).toBe(400)
    expect(
      (await put(JSON.stringify(pedido), { ...headers(p), 'x-internal-token': 'outro' })).status,
    ).toBe(401)
    const enorme = `{"ignorar":"${'x'.repeat(CORPO_DO_FANTASMA_MAX_BYTES)}"}`
    expect((await put(enorme)).status).toBe(413)
    expect(await repo.ler(p.id, p.publico, 'bosque-copas')).toEqual(pedido.fantasma)
    const sem = await app.handle(
      new Request('http://local/arquipelago/fantasmas/pico-cume', { headers: headers(p) }),
    )
    expect(await sem.json()).toEqual({ versao: 1, situacao: 'ausente' })
  })
})
