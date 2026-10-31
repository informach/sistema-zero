import { beforeEach, describe, expect, test } from 'bun:test'
import {
  CORPO_DA_OBRA_ESTENDIDA_MAX_BYTES,
  LeituraDaObraEstendidaSchema,
  type ObraEstendida,
  obraEstendidaVazia,
  type PublicoJogo,
} from '@sistemazero/arquipelago-contracts'
import { createLogger } from '@sistemazero/core/logging'
import { AcessoBloqueadoError, SomenteLeituraError } from '../../src/application/erros'
import { LeiturasDosMembros } from '../../src/application/leituras-dos-membros'
import { ConferenciaDoMapa } from '../../src/application/mapa-das-ilhas'
import { ServicoDaEquipe } from '../../src/application/servico-da-equipe'
import { ServicoDaObraEstendida } from '../../src/application/servico-da-obra-estendida'
import { ServicoDasCartas } from '../../src/application/servico-das-cartas'
import { ServicoDoJogo } from '../../src/application/servico-do-jogo'
import { ObraEstendidaDesatualizadaError } from '../../src/domain/obra-estendida.port'
import { createServer } from '../../src/interfaces/http/server'
import { DesafiosEmMemoria, desafiosDesligados } from '../fakes/desafios'
import { RepositorioEmMemoria } from '../fakes/memoria'
import { ObraEstendidaEmMemoria } from '../fakes/obra-estendida'

/** A obra estendida (E04 e B14): troca por revisão, suporte só lê, corpo pelo contrato. */

const TOKEN = 'token-da-obra'
const PERFIL = '11111111-1111-4111-8111-111111111111'
const CONTA = '22222222-2222-4222-8222-222222222222'
const ADULTO = '44444444-4444-4444-8444-444444444444'
const politica = {
  modo: 'aberto' as const,
  publicos: new Set<PublicoJogo>(['kids', 'adulto']),
  lista: new Set<string>(),
}
const crianca = {
  id: PERFIL,
  contaId: CONTA,
  publico: 'kids' as const,
  equipe: false,
  somenteLeitura: false,
}
const comAndar = (n = 3): ObraEstendida => ({
  ...obraEstendidaVazia(),
  andar: {
    escada: { x: 0, z: 0, giro: 1 },
    paredes: [{ x: 0, z: 0, eixo: 'x', n }],
    aberturas: [],
    pisos: [{ x: 1, z: 1, tipo: 'tabua' }],
  },
  terreno: { alturas: [[2, 3, 1]] },
})

let repo: ObraEstendidaEmMemoria
let servico: ServicoDaObraEstendida
beforeEach(() => {
  repo = new ObraEstendidaEmMemoria()
  servico = new ServicoDaObraEstendida({ repo, politica })
})

describe('serviço da obra estendida', () => {
  test('sem obra é revisão 0; cada gravação sobe uma revisão; base velha leva o que está guardado', async () => {
    expect(await servico.ler(crianca)).toEqual({ revisao: 0, obra: null })
    expect(await servico.gravar(crianca, { revisaoBase: 0, obra: comAndar() })).toEqual({
      revisao: 1,
      obra: comAndar(),
    })
    const conflito = await servico
      .gravar(crianca, { revisaoBase: 0, obra: obraEstendidaVazia() })
      .catch((e: unknown) => e)
    expect(conflito).toBeInstanceOf(ObraEstendidaDesatualizadaError)
    expect((conflito as ObraEstendidaDesatualizadaError).atual).toEqual({
      revisao: 1,
      obra: comAndar(),
    })
    expect((await servico.gravar(crianca, { revisaoBase: 1, obra: comAndar(5) })).revisao).toBe(2)
    expect(await servico.ler(crianca)).toEqual({ revisao: 2, obra: comAndar(5) })
    // Cada público tem a sua (o adulto com o mesmo id não vê a do Kids).
    expect(await servico.ler({ ...crianca, publico: 'adulto', contaId: null })).toEqual({
      revisao: 0,
      obra: null,
    })
  })

  test('suporte lê e não grava; acesso bloqueado não lê nem grava', async () => {
    await servico.gravar(crianca, { revisaoBase: 0, obra: comAndar() })
    const suporte = { ...crianca, somenteLeitura: true }
    expect((await servico.ler(suporte)).revisao).toBe(1)
    await expect(
      servico.gravar(suporte, { revisaoBase: 1, obra: obraEstendidaVazia() }),
    ).rejects.toBeInstanceOf(SomenteLeituraError)
    expect((await servico.ler(crianca)).obra).toEqual(comAndar())
    const fechado = new ServicoDaObraEstendida({
      repo,
      politica: { ...politica, publicos: new Set<PublicoJogo>(['adulto']) },
    })
    await expect(fechado.ler(crianca)).rejects.toBeInstanceOf(AcessoBloqueadoError)
    await expect(
      fechado.gravar(crianca, { revisaoBase: 1, obra: obraEstendidaVazia() }),
    ).rejects.toBeInstanceOf(AcessoBloqueadoError)
  })
})

function montar() {
  const logger = createLogger({ level: 'error' })
  const leituras = new LeiturasDosMembros(null)
  return createServer({
    logger,
    obraEstendida: servico,
    servico: new ServicoDoJogo(new RepositorioEmMemoria(), politica),
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
  })
}
const doKids = {
  'x-internal-token': TOKEN,
  'x-auth-user-id': PERFIL,
  'x-auth-user-role': 'member',
  'x-auth-user-status': 'active',
  'x-auth-account-id': CONTA,
  'x-auth-kids-context': 'student',
}

describe('rotas da obra estendida', () => {
  test('GET e PUT sem cache; 409 traz a revisão e a obra guardadas', async () => {
    const app = montar()
    const ler = await app.handle(
      new Request('http://local/arquipelago/obra-estendida', { headers: doKids }),
    )
    expect(ler.status).toBe(200)
    expect(ler.headers.get('cache-control')).toBe('private, no-store')
    expect(await ler.json()).toEqual({ revisao: 0, obra: null })
    const put = (corpo: unknown, cabecalhos: Record<string, string> = doKids) =>
      app.handle(
        new Request('http://local/arquipelago/obra-estendida', {
          method: 'PUT',
          headers: { ...cabecalhos, 'content-type': 'application/json' },
          body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
        }),
      )
    const gravou = await put({ revisaoBase: 0, obra: comAndar() })
    expect(gravou.status).toBe(200)
    expect(gravou.headers.get('cache-control')).toBe('private, no-store')
    expect(await gravou.json()).toEqual({ revisao: 1, obra: comAndar() })
    const velho = await put({ revisaoBase: 0, obra: obraEstendidaVazia() })
    expect(velho.status).toBe(409)
    const corpo = (await velho.json()) as { error: { code: string }; atual: unknown }
    expect(corpo.error.code).toBe('OBRA_ESTENDIDA_DESATUALIZADA')
    expect(LeituraDaObraEstendidaSchema.parse(corpo.atual)).toEqual({
      revisao: 1,
      obra: comAndar(),
    })
    // A conta adulta com outro id tem a sua, vazia.
    const { 'x-auth-account-id': _, 'x-auth-kids-context': __, ...semPerfil } = doKids
    const doAdulto = await app.handle(
      new Request('http://local/arquipelago/obra-estendida', {
        headers: { ...semPerfil, 'x-auth-user-id': ADULTO },
      }),
    )
    expect(await doAdulto.json()).toEqual({ revisao: 0, obra: null })
  })

  test('corpo fora do contrato é 400, grande demais 413, suporte 403 e sem token 401; nada muda', async () => {
    const app = montar()
    const put = (body: string, cabecalhos: Record<string, string> = doKids) =>
      app.handle(
        new Request('http://local/arquipelago/obra-estendida', {
          method: 'PUT',
          headers: { ...cabecalhos, 'content-type': 'application/json' },
          body,
        }),
      )
    expect((await put(JSON.stringify({ revisaoBase: 0, obra: comAndar() }))).status).toBe(200)
    const recusas: [string, Record<string, string>, number][] = [
      [JSON.stringify({ revisaoBase: 1, obra: comAndar(), moedas: 9 }), doKids, 400],
      [JSON.stringify({ revisaoBase: 1, obra: { ...comAndar(), versao: 2 } }), doKids, 400],
      [
        JSON.stringify({
          revisaoBase: 1,
          obra: {
            ...comAndar(),
            terreno: {
              alturas: [
                [1, 1, 1],
                [1, 1, 2],
              ],
            },
          },
        }),
        doKids,
        400,
      ],
      ['{', doKids, 400],
      [`{"x":"${'a'.repeat(CORPO_DA_OBRA_ESTENDIDA_MAX_BYTES)}"}`, doKids, 413],
      [
        JSON.stringify({ revisaoBase: 1, obra: obraEstendidaVazia() }),
        { ...doKids, 'x-auth-impersonator-id': CONTA },
        403,
      ],
      [
        JSON.stringify({ revisaoBase: 1, obra: obraEstendidaVazia() }),
        { ...doKids, 'x-internal-token': 'outro' },
        401,
      ],
    ]
    for (const [corpo, cabecalhos, status] of recusas)
      expect((await put(corpo, cabecalhos)).status).toBe(status)
    // O teto pelo Content-Length recusa antes de ler o corpo.
    const declarado = await app.handle(
      new Request('http://local/arquipelago/obra-estendida', {
        method: 'PUT',
        headers: {
          ...doKids,
          'content-type': 'application/json',
          'content-length': String(CORPO_DA_OBRA_ESTENDIDA_MAX_BYTES + 1),
        },
        body: '{}',
      }),
    )
    expect(declarado.status).toBe(413)
    expect(await repo.ler(PERFIL, 'kids')).toEqual({ revisao: 1, obra: comAndar() })
  })

  test('sem salvamento a obra não grava (409 SALVAMENTO_NECESSARIO)', async () => {
    repo.semSalvamento.add(PERFIL)
    const r = await montar().handle(
      new Request('http://local/arquipelago/obra-estendida', {
        method: 'PUT',
        headers: { ...doKids, 'content-type': 'application/json' },
        body: JSON.stringify({ revisaoBase: 0, obra: comAndar() }),
      }),
    )
    expect(r.status).toBe(409)
    expect(((await r.json()) as { error: { code: string } }).error.code).toBe(
      'SALVAMENTO_NECESSARIO',
    )
  })
})
