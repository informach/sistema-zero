import { afterAll, beforeAll, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  criarSalvamentoInicial,
  SalvamentoSchema,
  type VenderNaFeira,
} from '@sistemazero/arquipelago-contracts'
import { createLogger } from '@sistemazero/core/logging'
import { DesafioBloqueadoError } from '../../src/application/erros'
import { LeiturasDosMembros } from '../../src/application/leituras-dos-membros'
import { ConferenciaDoMapa } from '../../src/application/mapa-das-ilhas'
import { ServicoDaEquipe } from '../../src/application/servico-da-equipe'
import { ServicoDasCartas } from '../../src/application/servico-das-cartas'
import { ServicoDasVendas } from '../../src/application/servico-das-vendas'
import { ServicoDoJogo } from '../../src/application/servico-do-jogo'
import { CompraPendenteError, type DonoDaCompra } from '../../src/domain/insumos.port'
import { MoedasIndisponiveisError, type PortaDasMoedas } from '../../src/domain/moedas.port'
import { VendaRecusadaError } from '../../src/domain/vendas.port'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleRepositorioDoJogo } from '../../src/infrastructure/persistence/drizzle/repositorio'
import { DrizzleRepositorioDosInsumos } from '../../src/infrastructure/persistence/drizzle/repositorio-insumos'
import { DrizzleRepositorioDasVendas } from '../../src/infrastructure/persistence/drizzle/repositorio-vendas'
import { createServer } from '../../src/interfaces/http/server'
import { migrarBancoDeTeste } from '../fakes/banco-migrado'
import { DesafiosEmMemoria, desafiosDesligados } from '../fakes/desafios'

/**
 * A banca da feira (§6.28, A22) no Postgres local descartável, variável exclusiva
 * `ARQUIPELAGO_VENDAS_TEST_DATABASE_URL` (banco `arquipelago_test*`). Sem ela, a suíte é pulada.
 */
const url = process.env.ARQUIPELAGO_VENDAS_TEST_DATABASE_URL
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
let repo: DrizzleRepositorioDasVendas
let saves: DrizzleRepositorioDoJogo
const agora = new Date('2026-10-31T12:00:00Z')
const DIA = '2026-10-31'
beforeAll(async () => {
  if (!url) return
  db = createDbConnection(url, { max: 5 })
  await migrarBancoDeTeste(db)
  repo = new DrizzleRepositorioDasVendas(db.db)
  saves = new DrizzleRepositorioDoJogo(db.db)
}, 120_000)
afterAll(async () => {
  await db?.close()
})
async function perfil(publico: DonoDaCompra['publico'] = 'kids') {
  const dono: DonoDaCompra = { jogadorId: randomUUID(), contaId: randomUUID(), publico }
  if (publico === 'adulto') dono.contaId = dono.jogadorId
  const s = criarSalvamentoInicial(agora)
  s.inventario = { 'pao-de-queijo': 3, 'bolo-de-fuba': 1, milho: 2 }
  await saves.gravarSalvamento({ ...dono, revisaoBase: 0, salvamento: s, agora })
  const comando: VenderNaFeira = {
    versao: 1,
    chave: randomUUID(),
    revisaoBase: 1,
    dia: DIA,
    itens: { 'pao-de-queijo': 2, 'bolo-de-fuba': 1 },
  }
  return { dono, comando }
}
async function erroDa(p: Promise<unknown>) {
  try {
    await p
    return null
  } catch (e) {
    return e
  }
}
const jogador = (dono: DonoDaCompra) => ({
  id: dono.jogadorId,
  contaId: dono.publico === 'kids' ? dono.contaId : null,
  publico: dono.publico,
  equipe: true,
  somenteLeitura: false,
})
const politica = {
  modo: 'aberto' as const,
  publicos: new Set(['kids' as const, 'adulto' as const]),
  lista: new Set<string>(),
}
function servico(moedas: PortaDasMoedas, data = agora) {
  return new ServicoDasVendas({
    repo,
    moedas,
    politica,
    leituras: new LeiturasDosMembros(null),
    logger: createLogger({ level: 'error' }),
    agora: () => data,
  })
}

test.skipIf(!url)(
  'HTTP: identidade confiável, campos extras recusados, uma venda por dia nos dois públicos',
  async () => {
    const logger = createLogger({ level: 'error' })
    const leituras = new LeiturasDosMembros(null)
    const app = createServer({
      logger,
      tokenInterno: 'vendas-local',
      servico: new ServicoDoJogo(saves, politica),
      cartas: new ServicoDasCartas(politica, leituras),
      equipe: new ServicoDaEquipe(
        new DesafiosEmMemoria(),
        null,
        leituras,
        new ConferenciaDoMapa(null, logger),
      ),
      desafios: desafiosDesligados(politica),
      vendas: servico({ creditar: async () => ({ situacao: 'creditado' }) }),
      cliente: { dir: '.', servirMapas: false },
      readiness: async () => {},
    })
    for (const publico of ['kids', 'adulto'] as const) {
      const { dono, comando } = await perfil(publico)
      const h: Record<string, string> = {
        'content-type': 'application/json',
        'x-internal-token': 'vendas-local',
        'x-auth-user-id': dono.jogadorId,
        'x-auth-user-role': 'admin',
        'x-auth-user-status': 'active',
        ...(publico === 'kids'
          ? { 'x-auth-account-id': dono.contaId, 'x-auth-kids-context': 'student' }
          : {}),
      }
      const chamar = (corpo: unknown, headers = h) =>
        app.handle(
          new Request('http://local/arquipelago/feira/vender', {
            method: 'POST',
            headers,
            body: JSON.stringify(corpo),
          }),
        )
      expect((await chamar(comando, { ...h, 'x-internal-token': 'errado' })).status).toBe(401)
      expect((await chamar({ ...comando, moedas: 100 })).status).toBe(400)
      expect((await chamar({ ...comando, itens: { milho: 1 } })).status).toBe(400)
      expect((await chamar(comando, { ...h, 'x-auth-impersonator-id': randomUUID() })).status).toBe(
        403,
      )
      const errado = await chamar({ ...comando, revisaoBase: 2 })
      expect(errado.status).toBe(409)
      expect(await errado.json()).toMatchObject({ error: { code: 'VENDA_BASE_RECUSADA' } })
      const r = await chamar(comando)
      expect(r.status).toBe(200)
      expect(await r.json()).toMatchObject({
        pagamento: 'creditado',
        moedas: 5,
        guardado: { revisao: 2, salvamento: { inventario: { 'pao-de-queijo': 1, milho: 2 } } },
      })
      const outra = await chamar({
        ...comando,
        chave: randomUUID(),
        revisaoBase: 2,
        itens: { 'pao-de-queijo': 1 },
      })
      expect(outra.status).toBe(409)
      expect(await outra.json()).toMatchObject({ error: { code: 'VENDA_REPETIDA' } })
      const pendentes = await app.handle(
        new Request('http://local/arquipelago/feira/vendas/pendentes', { headers: h }),
      )
      expect(await pendentes.json()).toEqual({ versao: 1, vendas: [] })
    }
  },
)

test.skipIf(!url)('venda nova exige a Vila Doce aberta na jornada', async () => {
  const { dono, comando } = await perfil()
  let posicao = 1
  const api = new ServicoDasVendas({
    repo,
    politica,
    logger: createLogger({ level: 'error' }),
    agora: () => agora,
    leituras: { jogador: async () => ({ posicao, total: 8, blocos: [] }) },
    moedas: { creditar: async () => ({ situacao: 'creditado' }) },
  })
  const pessoa = { ...jogador(dono), equipe: false }
  expect(await erroDa(api.vender(pessoa, comando))).toBeInstanceOf(DesafioBloqueadoError)
  expect((await saves.lerSalvamento(dono.jogadorId))?.revisao).toBe(1)
  posicao = 8
  expect((await api.vender(pessoa, comando)).pagamento).toBe('creditado')
})

test.skipIf(!url)(
  'duas vendas concorrentes com a mesma chave consomem e creditam uma vez',
  async () => {
    const { dono, comando } = await perfil()
    let chamadas = 0
    const api = servico({
      creditar: async () => {
        chamadas++
        return { situacao: 'creditado' }
      },
    })
    const resultados = await Promise.all([
      api.vender(jogador(dono), comando),
      api.vender(jogador(dono), comando),
    ])
    expect(chamadas).toBe(1)
    for (const r of resultados) {
      expect(r.moedas).toBe(5)
      expect(r.guardado.revisao).toBe(2)
      expect(r.guardado.salvamento?.inventario).toEqual({ 'pao-de-queijo': 1, milho: 2 })
    }
  },
)

test.skipIf(!url)(
  'resposta perdida conserva o crédito pendente; a retomada credita uma vez, mesmo em outro dia',
  async () => {
    const { dono, comando } = await perfil()
    let perder = true
    const livro = new Set<string>()
    const moedas: PortaDasMoedas = {
      creditar: async (r) => {
        livro.add(r.key)
        expect(r.key).not.toBe(comando.chave)
        expect(r.amount).toBe(5)
        if (perder) throw new MoedasIndisponiveisError()
        return { situacao: 'creditado' }
      },
    }
    const r = await servico(moedas).vender(jogador(dono), comando)
    expect(r.pagamento).toBe('pendente')
    expect((await servico(moedas).pendentes(jogador(dono))).vendas).toEqual([comando])
    perder = false
    const retomada = await servico(moedas, new Date('2026-11-02T12:00:00Z')).vender(
      jogador(dono),
      comando,
    )
    expect(retomada.pagamento).toBe('creditado')
    expect(retomada.guardado.revisao).toBe(2)
    expect(livro.size).toBe(1)
    expect((await servico(moedas).pendentes(jogador(dono))).vendas).toEqual([])
  },
)

test.skipIf(!url)('teto espera a semana seguinte (A32), com a mesma chave', async () => {
  const { dono, comando } = await perfil()
  const chaves: string[] = []
  let resposta: 'teto' | 'creditado' = 'teto'
  const moedas: PortaDasMoedas = {
    creditar: async (p) => {
      chaves.push(p.key)
      return { situacao: resposta }
    },
  }
  expect((await servico(moedas).vender(jogador(dono), comando)).pagamento).toBe('teto')
  expect((await servico(moedas).vender(jogador(dono), comando)).pagamento).toBe('teto')
  await servico(moedas).pendentes(jogador(dono))
  expect(chaves).toHaveLength(1)
  resposta = 'creditado'
  const segunda = new Date('2026-11-02T12:00:00Z')
  await servico(moedas, segunda).pendentes(jogador(dono))
  expect(chaves).toEqual([chaves[0]!, chaves[0]!])
  expect((await repo.ler(dono, comando.chave))?.venda).toMatchObject({
    pagamento: 'creditado',
    tetoSemana: null,
  })
  await servico(moedas, segunda).pendentes(jogador(dono))
  expect(chaves).toHaveLength(2)
})

test.skipIf(!url)(
  'recusa dono, dia, revisão, pratos que faltam e compra pendente, sem consumir',
  async () => {
    const { dono, comando } = await perfil()
    for (const tentativa of [
      { ...comando, dia: '2026-10-30' },
      { ...comando, revisaoBase: 2 },
      { ...comando, itens: { 'pao-de-queijo': 4 } },
    ])
      expect(await erroDa(repo.vender(dono, tentativa, agora))).toBeInstanceOf(VendaRecusadaError)
    expect(
      await erroDa(repo.vender({ ...dono, contaId: randomUUID() }, comando, agora)),
    ).toBeInstanceOf(VendaRecusadaError)
    const insumos = new DrizzleRepositorioDosInsumos(db.db)
    await insumos.reservar(
      dono,
      { versao: 1, chave: randomUUID(), revisaoBase: 1, item: 'leite', quantidade: 1 },
      agora,
    )
    expect(await erroDa(repo.vender(dono, comando, agora))).toBeInstanceOf(CompraPendenteError)
    expect(await repo.pendente(dono)).toBeNull()
    const save = await saves.lerSalvamento(dono.jogadorId)
    expect(save?.revisao).toBe(1)
    expect(SalvamentoSchema.parse(save?.dados).inventario).toEqual({
      'pao-de-queijo': 3,
      'bolo-de-fuba': 1,
      milho: 2,
    })
  },
)
