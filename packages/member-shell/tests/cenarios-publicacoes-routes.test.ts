import { expect, mock, test } from 'bun:test'
import { digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import { exemplo, glb } from '../../molda-cenarios-motor/tests/fixtures/glb-compilacao'
import type { SessionUser } from '../src/lib/types'
import type { GatewayModule } from '../src/server/gateway'
import type { SessionModule } from '../src/server/session'

mock.module('server-only', () => ({}))
const { createCenariosRoutes } = await import('../src/routes/cenarios')
const ESPACO = '11111111-1111-4111-8111-111111111111'
const PESSOA = '22222222-2222-4222-8222-222222222222'
const CENARIO = '33333333-3333-4333-8333-333333333333'
const user: SessionUser = {
  id: PESSOA,
  email: '',
  firstName: 'Equipe',
  lastName: '',
  role: 'admin',
  status: 'active',
}

async function montar(
  opcoes: {
    status?: number
    adulterar?: boolean
    repetida?: boolean
    chaveFalsa?: boolean
    user?: SessionUser | null
    comRecurso?: boolean
    bom?: boolean
    respostaErrada?: boolean
  } = {},
) {
  const origem = exemplo(),
    modelo = glb(origem.j, origem.bin)
  const recurso = {
    caminho: 'modelos/peca.glb',
    digest: await digestDosBytes(modelo),
    bytes: modelo.length,
    mime: 'model/gltf-binary',
    papel: 'modelo',
    malhas: 2,
    triangulos: 2,
    verticesMaximos: 3,
  }
  const cena = {
    formato: 'molda-cena-compilada',
    versao: 1,
    nome: 'Praça',
    unidade: 'metro',
    eixoVertical: 'y',
    fonte: { cenario: CENARIO, revisao: 0, digest: 'a'.repeat(64) },
    arquivos: opcoes.comRecurso ? [recurso] : [],
    entidades: [],
    nos: [],
    colisoes: [],
    aguas: [],
    caminhos: [],
    marcadores: [],
    texturas: [],
    fontes: { modelos: [], texturas: [], conjuntos: [] },
    licencas: [],
    ambiente: { hora: 12 },
  }
  const bytes = new TextEncoder().encode((opcoes.bom ? '\uFEFF' : '') + JSON.stringify(cena))
  const pedido = {
    operacaoId: crypto.randomUUID(),
    perfil: { tipo: 'arquipelago-v2', ilha: 'sua-ilha' },
    versaoEsperada: 0,
    fonte: cena.fonte,
    manifesto: { digest: await digestDosBytes(bytes), bytes: bytes.length },
  }
  const publicacao = {
    id: crypto.randomUUID(),
    perfil: pedido.perfil,
    versao: opcoes.respostaErrada ? 2 : 1,
    fonte: pedido.fonte,
    manifesto: pedido.manifesto,
  }
  const chamadas: { via: string; path: string; body: unknown }[] = [],
    lidos: string[] = [],
    assinados: unknown[] = []
  const gateway = {
    gatewayFetch: async (path: string, o: { body?: unknown } = {}) => {
      chamadas.push({ via: 'jwt', path, body: o.body })
      if (opcoes.status)
        return { status: opcoes.status, body: { error: { code: 'CENARIOS_FECHADOS' } } }
      if (path.endsWith('/perfis/sua-ilha'))
        return { status: 200, body: opcoes.repetida ? publicacao : null }
      if (path.endsWith('/manifesto/reservar'))
        return {
          status: 200,
          body: {
            espacoId: ESPACO,
            arquivos: [
              {
                ...pedido.manifesto,
                tipo: 'manifesto-compilado',
                tipoDoConteudo: 'application/vnd.sistemazero.cena-compilada+json',
                chave: `cenarios/${opcoes.chaveFalsa ? PESSOA : ESPACO}/blobs/${pedido.manifesto.digest}`,
              },
            ],
          },
        }
      return {
        status: 200,
        body: { espacoId: ESPACO, pedido, publicacao: opcoes.repetida ? publicacao : null },
      }
    },
    gatewayFetchHmac: async (path: string, o: { body?: unknown } = {}) => {
      chamadas.push({ via: 'hmac', path, body: o.body })
      if (path.endsWith('/recursos'))
        return {
          status: 200,
          body: {
            espacoId: ESPACO,
            arquivos: [
              {
                digest: recurso.digest,
                bytes: recurso.bytes,
                tipo: 'recurso-compilado',
                tipoDoConteudo: recurso.mime,
                chave: `cenarios/${ESPACO}/blobs/${recurso.digest}`,
              },
            ],
          },
        }
      return { status: 200, body: { publicacao, repetido: false } }
    },
  } as unknown as GatewayModule
  const rotas = createCenariosRoutes({
    gateway,
    session: {
      getSession: async () => (opcoes.user === undefined ? user : opcoes.user),
    } as unknown as SessionModule,
    armazenamento: {
      abrir: async (chave) => {
        lidos.push(chave)
        const manifesto = chave.endsWith(pedido.manifesto.digest)
        const b = opcoes.adulterar ? new Uint8Array(bytes.length) : manifesto ? bytes : modelo
        return {
          contentLength: b.length,
          contentType: manifesto ? 'application/vnd.sistemazero.cena-compilada+json' : recurso.mime,
          body: new ReadableStream<Uint8Array>({
            start(c) {
              c.enqueue(b)
              c.close()
            },
          }),
        }
      },
      presignPut: async (o) => {
        assinados.push(o)
        return 'https://armazenamento.exemplo/envio'
      },
      presignGet: async () => {
        throw Error('Publicação não lê por URL assinada')
      },
      apagar: async () => {},
    },
  }).cenarios
  const pedir = (acao: string, body: unknown, viewer = PESSOA) =>
    rotas.POST(
      new Request(`http://localhost/api/cenarios/publicacoes/${acao}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-sz-viewer': viewer },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ caminho: ['publicacoes', ...acao.split('/')] }) },
    )
  const obterPerfil = () =>
    rotas.GET(new Request('http://localhost/api/cenarios/publicacoes/perfis/sua-ilha'), {
      params: Promise.resolve({ caminho: ['publicacoes', 'perfis', 'sua-ilha'] }),
    })
  return { pedido, publicacao, bytes, pedir, chamadas, lidos, assinados, obterPerfil, recurso }
}

test('BFF assina o manifesto por chave controlada e só confirma depois de ler seu conteúdo real', async () => {
  const b = await montar()
  expect((await b.pedir('manifesto/reservar', b.pedido)).status).toBe(200)
  expect(b.assinados).toHaveLength(1)
  expect((await b.pedir('confirmar', { pedido: b.pedido })).status).toBe(200)
  expect(b.lidos).toEqual([`cenarios/${ESPACO}/blobs/${b.pedido.manifesto.digest}`])
  expect(b.chamadas.find((c) => c.via === 'hmac')?.body).toMatchObject({
    ator: { usuarioId: PESSOA, contaId: PESSOA, equipe: true, suporte: false },
    pedido: b.pedido,
    conferidos: [
      { ...b.pedido.manifesto, tipoDoConteudo: 'application/vnd.sistemazero.cena-compilada+json' },
    ],
  })
})

test('recusa anterior à leitura, perfil trocado e provas do navegador não alcançam o armazenamento', async () => {
  const negado = await montar({ status: 403 })
  expect((await negado.pedir('confirmar', { pedido: negado.pedido })).status).toBe(403)
  expect(negado.lidos).toEqual([])
  const b = await montar()
  expect((await b.pedir('confirmar', { pedido: b.pedido }, ESPACO)).status).toBe(409)
  expect((await b.pedir('confirmar', { pedido: b.pedido, conferidos: [] })).status).toBe(400)
  expect(b.lidos).toEqual([])
})

test('arquivo adulterado impede HMAC e chave fora do espaço impede assinatura', async () => {
  const b = await montar({ adulterar: true })
  expect((await b.pedir('confirmar', { pedido: b.pedido })).status).toBe(422)
  expect(b.chamadas.some((c) => c.via === 'hmac')).toBe(false)
  const fora = await montar({ chaveFalsa: true })
  expect((await fora.pedir('manifesto/reservar', fora.pedido)).status).toBe(502)
  expect(fora.assinados).toEqual([])
})

test('confirmação repetida usa resultado publicado sem reabrir arquivos da fonte', async () => {
  const b = await montar({ repetida: true })
  const r = await b.pedir('confirmar', { pedido: b.pedido })
  expect(r.status).toBe(200)
  expect(await r.json()).toEqual({ publicacao: b.publicacao, repetido: true })
  expect(b.lidos).toEqual([])
  expect(b.chamadas.some((c) => c.via === 'hmac')).toBe(false)
})

test('consulta do destino distingue ausência de publicação de resposta sem corpo', async () => {
  const vazio = await montar(),
    publicado = await montar({ repetida: true })
  expect(await (await vazio.obterPerfil()).json()).toEqual({ publicacao: null })
  expect(await (await publicado.obterPerfil()).json()).toEqual({ publicacao: publicado.publicacao })
})

test('reserva de recursos lê só o manifesto e a confirmação confere também o GLB', async () => {
  const b = await montar({ comRecurso: true })
  expect(
    (await b.pedir('recursos/reservar', { pedido: b.pedido, digests: [b.recurso.digest] })).status,
  ).toBe(200)
  expect(b.lidos).toEqual([`cenarios/${ESPACO}/blobs/${b.pedido.manifesto.digest}`])
  expect(b.assinados).toHaveLength(1)
  expect((await b.pedir('confirmar', { pedido: b.pedido })).status).toBe(200)
  const prova = b.chamadas.filter((c) => c.via === 'hmac').at(-1)?.body
  expect(prova).toMatchObject({
    conferidos: [
      { ...b.pedido.manifesto, tipoDoConteudo: 'application/vnd.sistemazero.cena-compilada+json' },
      { digest: b.recurso.digest, bytes: b.recurso.bytes, tipoDoConteudo: 'model/gltf-binary' },
    ],
  })
})

test('transporte do manifesto conserva bytes UTF-8 com BOM', async () => {
  const b = await montar({ bom: true })
  expect((await b.pedir('confirmar', { pedido: b.pedido })).status).toBe(200)
  const prova = b.chamadas.find((c) => c.via === 'hmac')?.body as { manifesto: string }
  expect(new TextEncoder().encode(prova.manifesto)).toEqual(b.bytes)
})

test('resposta com outra versão não vira confirmação bem-sucedida no BFF', async () => {
  for (const repetida of [false, true]) {
    const b = await montar({ respostaErrada: true, repetida })
    expect((await b.pedir('confirmar', { pedido: b.pedido })).status).toBe(502)
  }
})
