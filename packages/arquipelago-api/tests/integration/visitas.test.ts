import { beforeEach, describe, expect, test } from 'bun:test'
import {
  CasaDoIrmaoSchema,
  compactarResultado,
  criarSalvamentoInicial,
  IrmaosDoJogadorSchema,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { createLogger } from '@sistemazero/core/logging'
import { LeiturasDosMembros } from '../../src/application/leituras-dos-membros'
import { ConferenciaDoMapa } from '../../src/application/mapa-das-ilhas'
import { ServicoDaEquipe } from '../../src/application/servico-da-equipe'
import { ServicoDasCartas } from '../../src/application/servico-das-cartas'
import { ServicoDasVisitas } from '../../src/application/servico-das-visitas'
import { ServicoDoJogo } from '../../src/application/servico-do-jogo'
import type { PoliticaDeAcesso } from '../../src/domain/acesso'
import { createServer } from '../../src/interfaces/http/server'
import { DesafiosEmMemoria, desafiosDesligados } from '../fakes/desafios'
import { FamiliaEmMemoria } from '../fakes/familia'
import { RepositorioEmMemoria } from '../fakes/memoria'

/**
 * Recordes da família e visitas (fase3-12) pela rota de verdade: irmão é quem guardou o jogo
 * logado na MESMA conta, não é a própria criança e vê o jogo; tudo obedece à permissão
 * `visitasDeIrmaos`; nada sai com nome nem com o resto do salvamento.
 */

const TOKEN = 'token-interno-de-teste'
const LIA = '11111111-1111-4111-8111-111111111111'
const TOM = '33333333-3333-4333-8333-333333333333'
const BIA = '44444444-4444-4444-8444-444444444444'
const DE_OUTRA = '55555555-5555-4555-8555-555555555555'
const CONTA = '22222222-2222-4222-8222-222222222222'
const OUTRA_CONTA = '66666666-6666-4666-8666-666666666666'
const AGORA = new Date('2026-10-29T15:00:00Z')

let repo: RepositorioEmMemoria
let familia: FamiliaEmMemoria
let politica: PoliticaDeAcesso
let app: ReturnType<typeof createServer>

function montar() {
  const logger = createLogger({ level: 'error' })
  app = createServer({
    logger,
    servico: new ServicoDoJogo(repo, politica, () => AGORA),
    cartas: new ServicoDasCartas(politica, new LeiturasDosMembros(null)),
    equipe: new ServicoDaEquipe(
      new DesafiosEmMemoria(),
      null,
      new LeiturasDosMembros(null),
      new ConferenciaDoMapa(null, logger),
      () => AGORA,
    ),
    desafios: desafiosDesligados(politica),
    visitas: new ServicoDasVisitas({ familia, politica }),
    cliente: { dir: '/nao-existe', servirMapas: false },
    tokenInterno: TOKEN,
    readiness: async () => {},
  })
}

beforeEach(() => {
  repo = new RepositorioEmMemoria()
  familia = new FamiliaEmMemoria(repo)
  politica = { modo: 'aberto', publicos: new Set(['kids', 'adulto']), lista: new Set() }
  montar()
})

const crianca = (id: string, conta = CONTA, extra: Record<string, string> = {}) => ({
  'x-internal-token': TOKEN,
  'x-auth-user-id': id,
  'x-auth-account-id': conta,
  'x-auth-kids-context': 'student',
  'x-auth-user-role': 'member',
  'x-auth-user-status': 'active',
  ...extra,
})
const adulto = {
  'x-internal-token': TOKEN,
  'x-auth-user-id': LIA,
  'x-auth-user-role': 'member',
  'x-auth-user-status': 'active',
}
const responsavel = {
  'x-internal-token': TOKEN,
  'x-auth-user-id': CONTA,
  'x-auth-kids-context': 'parent',
  'x-auth-user-role': 'member',
  'x-auth-user-status': 'active',
}

async function chamar(
  metodo: string,
  caminho: string,
  headers: Record<string, string>,
  corpo?: unknown,
) {
  const r = await app.handle(
    new Request(`http://local${caminho}`, {
      method: metodo,
      headers: corpo === undefined ? headers : { ...headers, 'content-type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    }),
  )
  const texto = await r.text()
  let json: unknown = null
  try {
    json = JSON.parse(texto)
  } catch {}
  return { status: r.status, json: json as Record<string, unknown> }
}

/** A criança abre o jogo e guarda (é o que liga ela à conta). */
async function jogar(id: string, conta = CONTA, mudar: (s: Salvamento) => Salvamento = (s) => s) {
  const salvamento = mudar(criarSalvamentoInicial(AGORA))
  const r = await chamar('PUT', '/arquipelago/salvamento', crianca(id, conta), {
    revisaoBase: 0,
    salvamento,
  })
  expect(r.status).toBe(200)
}

const RECORDE = {
  estrelas: { chegada: true, tempo: true, vagalumes: false },
  melhorTempoMs: 58_400,
}

/** O Tom com um recorde nas copas, uma alface plantada e a geladeira com aparência. */
const comoOTom = (s: Salvamento): Salvamento => ({
  ...s,
  percursos: { 'bosque-copas': compactarResultado(RECORDE) },
  horta: s.horta.map((c, i) =>
    i === 0 ? { ...c, semente: 'alface', plantadoEm: AGORA.toISOString() } : c,
  ),
  projetos: {
    geladeira: {
      ganhoEm: AGORA.toISOString(),
      aparencia: { origem: 'pinta', id: 'gel-1' },
      aparencias: [{ origem: 'pinta', id: 'gel-1' }],
    },
    forno: { ganhoEm: AGORA.toISOString(), aparencia: null, aparencias: [] },
  },
  inventario: { milho: 7 },
})

describe('os irmãos (recordes da família)', () => {
  test('lista só os irmãos da mesma conta que já jogaram, com os recordes e sem nome', async () => {
    await jogar(LIA)
    await jogar(TOM, CONTA, comoOTom)
    await jogar(DE_OUTRA, OUTRA_CONTA, comoOTom)
    const r = await chamar('GET', '/arquipelago/irmaos', crianca(LIA))
    expect(r.status).toBe(200)
    const lido = IrmaosDoJogadorSchema.parse(r.json)
    expect(lido).toEqual({
      versao: 1,
      situacao: 'ok',
      irmaos: [{ perfilId: TOM, percursos: { 'bosque-copas': RECORDE }, temCasa: false }],
    })
    expect(JSON.stringify(r.json)).not.toContain('nome')
    // O Tom vê a Lia do mesmo jeito (a permissão é da conta).
    const doTom = IrmaosDoJogadorSchema.parse(
      (await chamar('GET', '/arquipelago/irmaos', crianca(TOM))).json,
    )
    expect(doTom.irmaos.map((i) => i.perfilId)).toEqual([LIA])
  })

  test('irmão que nunca jogou nesta conta não aparece; sozinha, a lista vem vazia', async () => {
    await jogar(LIA)
    const r = await chamar('GET', '/arquipelago/irmaos', crianca(LIA))
    expect(IrmaosDoJogadorSchema.parse(r.json)).toEqual({ versao: 1, situacao: 'ok', irmaos: [] })
  })

  test('com as visitas de irmãos desligadas, a situação diz e a lista vem vazia', async () => {
    await jogar(LIA)
    await jogar(TOM, CONTA, comoOTom)
    familia.permissoes.set(CONTA, {
      visitasDeIrmaos: false,
      visitasDeOutrasCriancas: false,
      fotosNoClube: false,
    })
    const r = await chamar('GET', '/arquipelago/irmaos', crianca(LIA))
    expect(IrmaosDoJogadorSchema.parse(r.json)).toEqual({
      versao: 1,
      situacao: 'desligado',
      irmaos: [],
    })
  })

  test('irmão que não vê o jogo (fora da lista) não aparece', async () => {
    await jogar(LIA)
    await jogar(TOM, CONTA, comoOTom)
    politica = { modo: 'lista', publicos: new Set(['kids']), lista: new Set([LIA]) }
    montar()
    const r = await chamar('GET', '/arquipelago/irmaos', crianca(LIA))
    expect(IrmaosDoJogadorSchema.parse(r.json).irmaos).toEqual([])
    expect((await chamar('GET', `/arquipelago/irmaos/${TOM}/casa`, crianca(LIA))).status).toBe(404)
  })

  test('a comunidade adulta não tem família; o responsável não usa estas rotas', async () => {
    const r = await chamar('GET', '/arquipelago/irmaos', adulto)
    expect(IrmaosDoJogadorSchema.parse(r.json)).toEqual({ versao: 1, situacao: 'ok', irmaos: [] })
    expect((await chamar('GET', `/arquipelago/irmaos/${TOM}/casa`, adulto)).status).toBe(404)
    expect((await chamar('GET', '/arquipelago/irmaos', responsavel)).status).toBe(403)
  })

  test('jogo fechado para ela: 403 ACESSO_BLOQUEADO', async () => {
    politica = { modo: 'desligado', publicos: new Set(['kids']), lista: new Set() }
    montar()
    const r = await chamar('GET', '/arquipelago/irmaos', crianca(LIA))
    expect(r.status).toBe(403)
    expect((r.json.error as { code: string }).code).toBe('ACESSO_BLOQUEADO')
  })
})

describe('a casa do irmão (visita, só olhar)', () => {
  test('traz a obra, a horta e os objetos com aparência, e nada mais do salvamento', async () => {
    await jogar(LIA)
    await jogar(TOM, CONTA, comoOTom)
    const r = await chamar('GET', `/arquipelago/irmaos/${TOM}/casa`, crianca(LIA))
    expect(r.status).toBe(200)
    const casa = CasaDoIrmaoSchema.parse(r.json)
    expect(casa.perfilId).toBe(TOM)
    expect(casa.obra).toBeNull()
    expect(casa.horta[0]).toMatchObject({ semente: 'alface' })
    expect(casa.completos).toEqual(['geladeira'])
    expect(JSON.stringify(r.json)).not.toContain('milho')
    expect(JSON.stringify(r.json)).not.toContain('gel-1')
  })

  test('outra conta, a própria criança, id torto ou desconhecido: 404 sem dizer por quê', async () => {
    await jogar(LIA)
    await jogar(TOM, CONTA, comoOTom)
    await jogar(DE_OUTRA, OUTRA_CONTA, comoOTom)
    for (const id of [DE_OUTRA, LIA, BIA, 'nao-e-uuid']) {
      const r = await chamar('GET', `/arquipelago/irmaos/${id}/casa`, crianca(LIA))
      expect(r.status).toBe(404)
      expect((r.json.error as { code: string }).code).toBe('IRMAO_NAO_ENCONTRADO')
    }
  })

  test('com as visitas desligadas: 403 VISITAS_DESLIGADAS', async () => {
    await jogar(LIA)
    await jogar(TOM, CONTA, comoOTom)
    familia.permissoes.set(CONTA, {
      visitasDeIrmaos: false,
      visitasDeOutrasCriancas: true,
      fotosNoClube: false,
    })
    const r = await chamar('GET', `/arquipelago/irmaos/${TOM}/casa`, crianca(LIA))
    expect(r.status).toBe(403)
    expect((r.json.error as { code: string }).code).toBe('VISITAS_DESLIGADAS')
  })

  test('olhar não muda nada: o salvamento do irmão fica na mesma revisão', async () => {
    await jogar(LIA)
    await jogar(TOM, CONTA, comoOTom)
    const antes = structuredClone(repo.salvamentos.get(TOM))
    await chamar('GET', `/arquipelago/irmaos/${TOM}/casa`, crianca(LIA))
    await chamar('GET', '/arquipelago/irmaos', crianca(LIA))
    expect(repo.salvamentos.get(TOM)).toEqual(antes)
  })

  test('a sessão de suporte pode olhar (é só leitura)', async () => {
    await jogar(LIA)
    await jogar(TOM, CONTA, comoOTom)
    const suporte = crianca(LIA, CONTA, { 'x-auth-impersonator-id': BIA })
    expect((await chamar('GET', '/arquipelago/irmaos', suporte)).status).toBe(200)
    expect((await chamar('GET', `/arquipelago/irmaos/${TOM}/casa`, suporte)).status).toBe(200)
  })

  test('sem o token do gateway: 401', async () => {
    const { 'x-internal-token': _, ...semToken } = crianca(LIA)
    expect((await chamar('GET', '/arquipelago/irmaos', semToken)).status).toBe(401)
  })
})
