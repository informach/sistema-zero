import { describe, expect, test } from 'bun:test'
import { AmbienteRecusadoError, MembrosIndisponiveisError } from '../../src/domain/membros.port'
import { MembrosHttp } from '../../src/infrastructure/members/membros-http'

/** C02b (30/10/2026): o ambiente Python do Estúdio de desafio pelo Members. */
const LIA = '11111111-1111-4111-8111-111111111111'
const CONTA = '22222222-2222-4222-8222-222222222222'
const DESAFIO = '33333333-3333-4333-8333-333333333333'
const SHA = 'a'.repeat(64)

function fetchDeMentira(status: number, corpo: unknown, pedidos: Request[] = []) {
  return (async (url: URL | RequestInfo, init?: RequestInit) => {
    pedidos.push(new Request(url, init))
    return Response.json(corpo, { status })
  }) as typeof fetch
}

const pedido = {
  requester: LIA,
  accountId: CONTA,
  audience: 'kids' as const,
  projetoInicial: { id: 'inicial' },
  pedido: { operation: 'analyze' },
}

/** Uma decisão de verdade: o perfil e a release ativa do catálogo publicado. */
async function decisao() {
  const arquivo = await Bun.file(
    new URL(
      '../../../members/src/infrastructure/config/studio-authoring-catalogs/022e5b54bce19be4a83b90fad0049b8d951e0d88d9e9cdb2eb6a896bf17544d8.json',
      import.meta.url,
    ),
  ).json()
  const release = arquivo.catalog.releases.find(
    (r: { releaseId: string }) => r.releaseId === '2026-10-25-integrated-games-2',
  )
  return {
    version: 1,
    actor: { userId: LIA, accountId: CONTA },
    context: {
      kind: 'arquipelago',
      audience: 'kids',
      desafioId: DESAFIO,
      revisao: 1,
      projectId: 'rascunho',
    },
    projectId: 'rascunho',
    revision: SHA,
    subjectSha256: SHA,
    runtime: {
      profileId: release.profileId,
      releaseId: release.releaseId,
      manifestSha256: release.manifestSha256,
    },
    releaseStatus: 'active',
    operation: 'analyze',
    capabilities: ['edit'],
    grantedExtensionIds: ['python-pgzero'],
    catalog: { profiles: [arquivo.catalog.profiles[0]], releases: [release] },
    blockIds: [],
    curation: {},
    frame: {
      url: `https://runtime.example/v1/runtimes/${release.manifestSha256}/frame.html`,
      allowedOrigins: ['https://runtime.example'],
    },
    issuedAt: 1,
    expiresAt: 30_001,
  }
}

describe('autorizarAmbiente', () => {
  test('pede na rota interna com o token e devolve a decisão conferida', async () => {
    const pedidos: Request[] = []
    const valida = await decisao()
    const membros = new MembrosHttp({
      url: 'http://members',
      token: 't',
      fetch: fetchDeMentira(200, valida, pedidos),
    })
    expect(await membros.autorizarAmbiente(pedido)).toEqual(valida)
    expect(pedidos[0]?.url).toBe('http://members/members/internal/arquipelago/ambiente')
    expect(pedidos[0]?.headers.get('x-arquipelago-token')).toBe('t')
    expect(await pedidos[0]?.json()).toEqual(pedido)
  })

  test('decisão fora do contrato conta como indisponível', async () => {
    const membros = new MembrosHttp({
      url: 'http://m',
      token: 't',
      fetch: fetchDeMentira(200, { ...(await decisao()), capabilities: ['publish'] }),
    })
    const erro = await membros.autorizarAmbiente(pedido).catch((e: unknown) => e)
    expect(erro).toBeInstanceOf(MembrosIndisponiveisError)
  })

  test('recusa (403 ou 400) vira AmbienteRecusadoError com a frase; 424 é indisponível', async () => {
    const recusa = new MembrosHttp({
      url: 'http://m',
      token: 't',
      fetch: fetchDeMentira(403, { error: { code: 'ACCESS_DENIED', message: 'Outro ambiente.' } }),
    })
    const erro = await recusa.autorizarAmbiente(pedido).catch((e: unknown) => e)
    expect(erro).toBeInstanceOf(AmbienteRecusadoError)
    expect((erro as Error).message).toBe('Outro ambiente.')
    const invalido = new MembrosHttp({
      url: 'http://m',
      token: 't',
      fetch: fetchDeMentira(400, { error: { code: 'VALIDATION_ERROR' } }),
    })
    expect(await invalido.autorizarAmbiente(pedido).catch((e: unknown) => e)).toBeInstanceOf(
      AmbienteRecusadoError,
    )
    const fora = new MembrosHttp({
      url: 'http://m',
      token: 't',
      fetch: fetchDeMentira(424, { error: { code: 'AMBIENTE_INDISPONIVEL' } }),
    })
    expect(await fora.autorizarAmbiente(pedido).catch((e: unknown) => e)).toBeInstanceOf(
      MembrosIndisponiveisError,
    )
  })
})
