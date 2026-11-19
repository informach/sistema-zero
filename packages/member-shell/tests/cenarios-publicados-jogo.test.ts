import { expect, mock, test } from 'bun:test'
import type { SessionUser } from '../src/lib/types'
import type { GatewayModule } from '../src/server/gateway'
import type { SessionModule } from '../src/server/session'

mock.module('server-only', () => ({}))
const { createCenariosRoutes } = await import('../src/routes/cenarios')
const PESSOA = '22222222-2222-4222-8222-222222222222'
const ID = '33333333-3333-4333-8333-333333333333'
const ESPACO = '11111111-1111-4111-8111-111111111111'
const DIGEST = 'a'.repeat(64)
const user: SessionUser = {
  id: PESSOA,
  email: '',
  firstName: 'Visitante',
  lastName: '',
  role: 'member',
  status: 'active',
}
function montar(
  o: {
    user?: SessionUser | null
    bloqueado?: boolean
    acessoInvalido?: boolean
    chaveFalsa?: boolean
    digestFalso?: boolean
    outroPerfil?: boolean
    ausente?: boolean
    statusArquivo?: number
    mimeInvalido?: boolean
  } = {},
) {
  const chamadas: { path: string; body: unknown; via: string }[] = [],
    assinados: unknown[] = []
  const publicacao = {
    id: ID,
    perfil: { tipo: 'arquipelago-v2', ilha: o.outroPerfil ? 'bosque' : 'sua-ilha' },
    versao: 1,
    fonte: { cenario: ID, revisao: 2, digest: DIGEST },
    manifesto: { digest: DIGEST, bytes: 512 },
  }
  const gateway = {
    gatewayFetch: async (path: string) => {
      chamadas.push({ path, via: 'jwt', body: undefined })
      if (path !== '/arquipelago/acesso') throw Error('Leitura do jogador não pode abrir autoria')
      return {
        status: 200,
        body: o.acessoInvalido
          ? { liberado: true }
          : {
              liberado: !o.bloqueado,
              motivo: o.bloqueado ? 'fora-da-lista' : null,
              limiteDiarioMinutos: 20,
              usadoHojeSegundos: 0,
            },
      }
    },
    gatewayFetchHmac: async (path: string, p: { body: unknown }) => {
      chamadas.push({ path, via: 'hmac', body: p.body })
      return path.endsWith('/perfil')
        ? { status: 200, body: o.ausente ? null : publicacao }
        : {
            status: o.statusArquivo ?? 200,
            body: {
              digest: o.digestFalso ? 'b'.repeat(64) : DIGEST,
              chave: o.chaveFalsa
                ? `avatar/${ESPACO}/${DIGEST}`
                : `cenarios/${ESPACO}/blobs/${DIGEST}`,
              bytes: 512,
              tipoDoConteudo: o.mimeInvalido ? 'text/html' : 'model/gltf-binary',
            },
          }
    },
  } as unknown as GatewayModule
  const rotas = createCenariosRoutes({
    gateway,
    session: {
      getSession: async () => (o.user === undefined ? user : o.user),
    } as unknown as SessionModule,
    armazenamento: {
      presignGet: async (key, opts) => {
        assinados.push({ key, opts })
        return 'https://armazenamento.exemplo/imutavel'
      },
      presignPut: async () => {
        throw Error('Sem envio no jogo')
      },
      abrir: async () => {
        throw Error('Sem leitura de biblioteca no jogo')
      },
      apagar: async () => {},
    },
  }).cenarios
  const pedir = (path: string, viewer = PESSOA) =>
    rotas.GET(
      new Request(`http://localhost/api/cenarios/${path}?como=endereco`, {
        headers: { 'x-sz-viewer': viewer },
      }),
      { params: Promise.resolve({ caminho: path.split('/') }) },
    )
  return { pedir, chamadas, assinados, publicacao }
}
const PERFIL = 'jogo/perfis/sua-ilha',
  ARQUIVO = `jogo/publicacoes/${ID}/arquivos/${DIGEST}`

test('jogador lê publicação sem abrir a oficina; autorização do jogo precede toda leitura interna', async () => {
  const b = montar()
  const r = await b.pedir(PERFIL)
  expect(r.status).toBe(200)
  expect(await r.json()).toEqual({ publicacao: b.publicacao })
  expect(r.headers.get('cache-control')).toBe('private, no-store')
  expect(b.chamadas.map((c) => c.via)).toEqual(['jwt', 'hmac'])
  expect(b.chamadas[1]!.body).toMatchObject({
    ator: { usuarioId: PESSOA, equipe: false, suporte: false },
  })
  const arquivo = await b.pedir(ARQUIVO)
  expect(arquivo.status).toBe(200)
  expect(b.chamadas.map((c) => c.via)).toEqual(['jwt', 'hmac', 'jwt', 'hmac'])
  expect(b.assinados).toMatchObject([
    {
      key: `cenarios/${ESPACO}/blobs/${DIGEST}`,
      opts: { responseContentType: 'model/gltf-binary' },
    },
  ])
})
test('sessão ausente, perfil trocado e acesso negado não alcançam publicação nem assinatura', async () => {
  for (const [o, status] of [
    [{ user: null }, 401],
    [{ bloqueado: true }, 403],
    [{ acessoInvalido: true }, 502],
  ] as const) {
    const b = montar(o)
    expect((await b.pedir(ARQUIVO)).status).toBe(status)
    expect(b.chamadas.filter((c) => c.via === 'hmac')).toHaveLength(0)
    expect(b.assinados).toHaveLength(0)
  }
  const b = montar()
  expect((await b.pedir(PERFIL, ESPACO)).status).toBe(409)
  expect(b.chamadas).toHaveLength(0)
})
test('perfil desconhecido, resposta de outra ilha e chave/digest fora do contrato são recusados', async () => {
  const b = montar()
  expect((await b.pedir('jogo/perfis/farol')).status).toBe(404)
  expect(b.chamadas).toHaveLength(0)
  expect((await montar({ outroPerfil: true }).pedir(PERFIL)).status).toBe(502)
  for (const o of [
    { chaveFalsa: true },
    { digestFalso: true },
    { mimeInvalido: true },
    { statusArquivo: 404 },
  ]) {
    const caso = montar(o)
    expect((await caso.pedir(ARQUIVO)).status).toBe(o.statusArquivo ?? 502)
    expect(caso.assinados).toHaveLength(0)
  }
})
test('ilha sem publicação conserva resposta explícita nula para usar composição em código', async () => {
  const r = await montar({ ausente: true }).pedir(PERFIL)
  expect(r.status).toBe(200)
  expect(await r.json()).toEqual({ publicacao: null })
})
