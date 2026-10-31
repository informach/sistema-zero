import { afterAll, beforeAll, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  criarSalvamentoInicial,
  type EntregarPedido,
  SalvamentoSchema,
} from '@sistemazero/arquipelago-contracts'
import { createLogger } from '@sistemazero/core/logging'
import { DesafioBloqueadoError } from '../../src/application/erros'
import { LeiturasDosMembros } from '../../src/application/leituras-dos-membros'
import { ConferenciaDoMapa } from '../../src/application/mapa-das-ilhas'
import { ServicoDaEquipe } from '../../src/application/servico-da-equipe'
import { ServicoDasCartas } from '../../src/application/servico-das-cartas'
import { ServicoDoJogo } from '../../src/application/servico-do-jogo'
import { ServicoDosPedidos } from '../../src/application/servico-dos-pedidos'
import { semanaDeSaoPaulo } from '../../src/domain/desafios'
import { CompraPendenteError, type DonoDaCompra } from '../../src/domain/insumos.port'
import { MoedasIndisponiveisError, type PortaDasMoedas } from '../../src/domain/moedas.port'
import { PedidoRecusadoError } from '../../src/domain/pedidos.port'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleRepositorioDoJogo } from '../../src/infrastructure/persistence/drizzle/repositorio'
import { DrizzleRepositorioDosInsumos } from '../../src/infrastructure/persistence/drizzle/repositorio-insumos'
import { DrizzleRepositorioDosPedidos } from '../../src/infrastructure/persistence/drizzle/repositorio-pedidos'
import { createServer } from '../../src/interfaces/http/server'
import { migrarBancoDeTeste } from '../fakes/banco-migrado'
import { DesafiosEmMemoria, desafiosDesligados } from '../fakes/desafios'

const url = process.env.ARQUIPELAGO_PEDIDOS_TEST_DATABASE_URL
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
let repo: DrizzleRepositorioDosPedidos
let saves: DrizzleRepositorioDoJogo
const agora = new Date('2026-10-30T12:00:00Z')
beforeAll(async () => {
  if (!url) return
  db = createDbConnection(url, { max: 5 })
  await migrarBancoDeTeste(db)
  repo = new DrizzleRepositorioDosPedidos(db.db)
  saves = new DrizzleRepositorioDoJogo(db.db)
}, 120_000)
afterAll(async () => {
  await db?.close()
})
async function perfil(publico: DonoDaCompra['publico'] = 'kids') {
  const dono: DonoDaCompra = { jogadorId: randomUUID(), contaId: randomUUID(), publico }
  if (publico === 'adulto') dono.contaId = dono.jogadorId
  const s = criarSalvamentoInicial(agora)
  s.moradores.bento.amizade = 80
  s.moradores.bento.pedido = { id: 'milho-2', dia: '2026-10-30', entregue: false }
  s.inventario = { milho: 3 }
  await saves.gravarSalvamento({ ...dono, revisaoBase: 0, salvamento: s, agora })
  const comando: EntregarPedido = {
    versao: 1,
    chave: randomUUID(),
    revisaoBase: 1,
    morador: 'bento',
    dia: '2026-10-30',
    pedido: 'milho-2',
  }
  return { dono, comando, s }
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

test.skipIf(!url)(
  'HTTP usa identidade confiável, recusa suporte e campos extras, confirma nos dois públicos',
  async () => {
    const logger = createLogger({ level: 'error' })
    const leituras = new LeiturasDosMembros(null)
    const app = createServer({
      logger,
      tokenInterno: 'pedidos-local',
      servico: new ServicoDoJogo(saves, politica),
      cartas: new ServicoDasCartas(politica, leituras),
      equipe: new ServicoDaEquipe(
        new DesafiosEmMemoria(),
        null,
        leituras,
        new ConferenciaDoMapa(null, logger),
      ),
      desafios: desafiosDesligados(politica),
      pedidos: servico({ creditar: async () => ({ situacao: 'creditado' }) }),
      cliente: { dir: '.', servirMapas: false },
      readiness: async () => {},
    })
    for (const publico of ['kids', 'adulto'] as const) {
      const { dono, comando } = await perfil(publico)
      const h: Record<string, string> = {
        'content-type': 'application/json',
        'x-internal-token': 'pedidos-local',
        'x-auth-user-id': dono.jogadorId,
        'x-auth-user-role': 'admin',
        'x-auth-user-status': 'active',
        ...(publico === 'kids'
          ? { 'x-auth-account-id': dono.contaId, 'x-auth-kids-context': 'student' }
          : {}),
      }
      const chamar = (corpo: unknown, headers = h) =>
        app.handle(
          new Request('http://local/arquipelago/pedidos/entregar', {
            method: 'POST',
            headers,
            body: JSON.stringify(corpo),
          }),
        )
      expect((await chamar(comando, { ...h, 'x-internal-token': 'errado' })).status).toBe(401)
      expect((await chamar({ ...comando, moedas: 100 })).status).toBe(400)
      expect((await chamar(comando, { ...h, 'x-auth-impersonator-id': randomUUID() })).status).toBe(
        403,
      )
      const errado = await chamar({ ...comando, revisaoBase: 2 })
      expect(errado.status).toBe(409)
      expect(await errado.json()).toMatchObject({ error: { code: 'PEDIDO_BASE_RECUSADO' } })
      const r = await chamar(comando)
      expect(r.status).toBe(200)
      expect(await r.json()).toMatchObject({
        pagamento: 'creditado',
        moedas: 4,
        guardado: { revisao: 2 },
      })
    }
  },
)
function servico(moedas: PortaDasMoedas, data = agora) {
  return new ServicoDosPedidos({
    repo,
    moedas,
    politica,
    leituras: new LeiturasDosMembros(null),
    logger: createLogger({ level: 'error' }),
    agora: () => data,
  })
}

test.skipIf(!url)(
  'pedido novo exige a ilha da jornada; retomada confirmada não perde o direito adquirido',
  async () => {
    const { dono, comando } = await perfil()
    let posicao = 1
    let leituras = 0
    let creditos = 0
    const api = new ServicoDosPedidos({
      repo,
      politica,
      logger: createLogger({ level: 'error' }),
      agora: () => agora,
      leituras: {
        jogador: async () => {
          leituras++
          return { posicao, total: 8, blocos: [] }
        },
      },
      moedas: {
        creditar: async () => {
          creditos++
          return { situacao: 'creditado' }
        },
      },
    })
    const pessoa = { ...jogador(dono), equipe: false }
    expect(await erroDa(api.entregar(pessoa, comando))).toBeInstanceOf(DesafioBloqueadoError)
    expect((await saves.lerSalvamento(dono.jogadorId))?.revisao).toBe(1)
    expect(await repo.ler(dono, comando.chave)).toBeNull()
    expect(creditos).toBe(0)
    posicao = 8
    expect((await api.entregar(pessoa, comando)).pagamento).toBe('creditado')
    posicao = 1
    expect((await api.entregar(pessoa, comando)).pagamento).toBe('creditado')
    expect(creditos).toBe(1)
    expect(leituras).toBe(2)
  },
)

test.skipIf(!url)(
  'duas entregas e confirmações concorrentes consomem e creditam uma vez',
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
      api.entregar(jogador(dono), comando),
      api.entregar(jogador(dono), comando),
    ])
    expect(chamadas).toBe(1)
    for (const r of resultados) {
      expect(r.pagamento).toBe('creditado')
      expect(r.moedas).toBe(4)
      expect(r.guardado.revisao).toBe(2)
      expect(r.guardado.salvamento?.inventario).toEqual({ milho: 1, fuba: 1, leite: 1, ovo: 1 })
      expect(r.guardado.salvamento?.moradores.bento.amizade).toBe(110)
    }
    const novaChave = { ...comando, chave: randomUUID(), revisaoBase: 2 }
    expect(await erroDa(api.entregar(jogador(dono), novaChave))).toBeInstanceOf(PedidoRecusadoError)
    expect((await saves.lerSalvamento(dono.jogadorId))?.revisao).toBe(2)
  },
)

test.skipIf(!url)(
  'resposta perdida conserva crédito e permite jogar; retoma após virada sem ressuscitar ingredientes',
  async () => {
    for (const publico of ['kids', 'adulto'] as const) {
      const { dono, comando } = await perfil(publico)
      let perder = true
      const livro = new Set<string>()
      const moedas: PortaDasMoedas = {
        creditar: async (r) => {
          livro.add(r.key)
          expect(r.key).not.toBe(comando.chave)
          expect(r.userId).toBe(dono.jogadorId)
          expect(r.accountId).toBe(dono.contaId)
          expect(r.audience).toBe(publico === 'kids' ? 'kids' : 'adult')
          if (perder) throw new MoedasIndisponiveisError()
          return { situacao: 'creditado' }
        },
      }
      const api = servico(moedas)
      const r = await api.entregar(jogador(dono), comando)
      expect(r.pagamento).toBe('pendente')
      expect((await api.pendentes(jogador(dono))).pedidos).toEqual([comando])
      const s = structuredClone(r.guardado.salvamento!)
      delete s.inventario.leite
      expect(
        (await saves.gravarSalvamento({ ...dono, revisaoBase: 2, salvamento: s, agora })).ok,
      ).toBe(true)
      perder = false
      const retomado = await servico(moedas, new Date('2026-11-02T12:00:00Z')).entregar(
        jogador(dono),
        comando,
      )
      expect(retomado.pagamento).toBe('creditado')
      expect(retomado.guardado.revisao).toBe(3)
      expect(retomado.guardado.salvamento?.inventario.leite).toBeUndefined()
      expect(livro.size).toBe(1)
      expect((await api.pendentes(jogador(dono))).pedidos).toEqual([])
    }
  },
)

test.skipIf(!url)(
  'teto espera a semana seguinte (A32): sem apagar amizade/cesta, mesma chave, uma vez',
  async () => {
    const { dono, comando } = await perfil()
    const chaves: string[] = []
    let resposta: 'teto' | 'creditado' = 'teto'
    const moedas: PortaDasMoedas = {
      creditar: async (p) => {
        chaves.push(p.key)
        return { situacao: resposta }
      },
    }
    const r = await servico(moedas).entregar(jogador(dono), comando)
    expect(r.pagamento).toBe('teto')
    expect(r.guardado.salvamento?.moradores.bento.pedido?.entregue).toBe(true)
    // Na mesma semana, nem a retomada nem a abertura cobram de novo.
    expect((await servico(moedas).entregar(jogador(dono), comando)).pagamento).toBe('teto')
    await servico(moedas).pendentes(jogador(dono))
    expect(chaves).toHaveLength(1)
    // Na semana seguinte, a abertura credita com a mesma chave; depois não insiste.
    resposta = 'creditado'
    const segunda = new Date('2026-11-02T12:00:00Z')
    expect((await servico(moedas, segunda).pendentes(jogador(dono))).pedidos).toEqual([])
    expect(chaves).toHaveLength(2)
    expect(chaves[1]).toBe(chaves[0])
    expect((await repo.ler(dono, comando.chave))?.entrega).toMatchObject({
      pagamento: 'creditado',
      tetoSemana: null,
    })
    await servico(moedas, segunda).pendentes(jogador(dono))
    expect(chaves).toHaveLength(2)
  },
)

test.skipIf(!url)('teto de novo na semana seguinte guarda a semana nova', async () => {
  const { dono, comando } = await perfil()
  let n = 0
  const moedas: PortaDasMoedas = {
    creditar: async () => {
      n++
      return { situacao: 'teto' }
    },
  }
  await servico(moedas).entregar(jogador(dono), comando)
  expect((await repo.ler(dono, comando.chave))?.entrega.tetoSemana).toBe('2026-10-26')
  await servico(moedas, new Date('2026-11-03T12:00:00Z')).pendentes(jogador(dono))
  expect(n).toBe(2)
  expect((await repo.ler(dono, comando.chave))?.entrega.tetoSemana).toBe('2026-11-02')
  // Carteira fora na abertura: continua esperando, e a criança abre o jogo normalmente.
  const fora: PortaDasMoedas = {
    creditar: async () => {
      throw new MoedasIndisponiveisError()
    },
  }
  expect(
    (await servico(fora, new Date('2026-11-10T12:00:00Z')).pendentes(jogador(dono))).pedidos,
  ).toEqual([])
  expect((await repo.ler(dono, comando.chave))?.entrega.tetoSemana).toBe('2026-11-02')
})

test.skipIf(!url)('a semana da migração é a mesma do jogo, na virada de domingo', async () => {
  // 2026-11-02T02:00Z ainda é domingo, 1º de novembro, em São Paulo.
  const quando = new Date('2026-11-02T02:00:00Z')
  const [linha] = await db.sql<{ semana: string }[]>`
    select to_char(date_trunc('week', ${quando.toISOString()}::timestamptz at time zone 'America/Sao_Paulo'), 'YYYY-MM-DD') as semana`
  expect(linha?.semana).toBe(semanaDeSaoPaulo(quando))
  expect(linha?.semana).toBe('2026-10-26')
})

test.skipIf(!url)(
  'recusa dono, dia, revisão, pedido desconhecido e insumo pendente sem consumo',
  async () => {
    const { dono, comando } = await perfil()
    for (const tentativa of [
      { ...comando, dia: '2026-10-29' },
      { ...comando, revisaoBase: 2 },
      { ...comando, pedido: 'qualquer' },
    ])
      expect(await erroDa(repo.entregar(dono, tentativa, agora))).toBeInstanceOf(
        PedidoRecusadoError,
      )
    expect(
      await erroDa(repo.entregar({ ...dono, contaId: randomUUID() }, comando, agora)),
    ).toBeInstanceOf(PedidoRecusadoError)
    expect(
      await erroDa(repo.entregar({ ...dono, publico: 'adulto' }, comando, agora)),
    ).toBeInstanceOf(PedidoRecusadoError)
    const insumos = new DrizzleRepositorioDosInsumos(db.db)
    await insumos.reservar(
      dono,
      { versao: 1, chave: randomUUID(), revisaoBase: 1, item: 'leite', quantidade: 1 },
      agora,
    )
    expect(await erroDa(repo.entregar(dono, comando, agora))).toBeInstanceOf(CompraPendenteError)
    expect(await repo.pendente(dono)).toBeNull()
    const save = await saves.lerSalvamento(dono.jogadorId)
    expect(save?.revisao).toBe(1)
    expect(SalvamentoSchema.parse(save?.dados).inventario).toEqual({ milho: 3 })
  },
)
