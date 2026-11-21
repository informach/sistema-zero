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
  // A reserva leva só o metadado do recurso escolhido, nunca o manifesto.
  const reserva = b.chamadas.filter((c) => c.via === 'hmac').at(-1)?.body as Record<string, unknown>
  expect(reserva).not.toHaveProperty('manifesto')
  expect(reserva.recursos).toEqual([
    {
      digest: b.recurso.digest,
      bytes: b.recurso.bytes,
      mime: 'model/gltf-binary',
      papel: 'recurso',
    },
  ])
  expect((await b.pedir('confirmar', { pedido: b.pedido })).status).toBe(200)
  const prova = b.chamadas.filter((c) => c.via === 'hmac').at(-1)?.body
  expect(prova).not.toHaveProperty('manifesto')
  expect(prova).toMatchObject({
    resumo: {
      recursos: [
        {
          ...b.pedido.manifesto,
          mime: 'application/vnd.sistemazero.cena-compilada+json',
          papel: 'manifesto',
        },
        {
          digest: b.recurso.digest,
          bytes: b.recurso.bytes,
          mime: 'model/gltf-binary',
          papel: 'recurso',
        },
      ],
      fontes: { modelos: [], texturas: [], conjuntos: [] },
    },
    conferidos: [
      { ...b.pedido.manifesto, tipoDoConteudo: 'application/vnd.sistemazero.cena-compilada+json' },
      { digest: b.recurso.digest, bytes: b.recurso.bytes, tipoDoConteudo: 'model/gltf-binary' },
    ],
  })
})

test('manifesto UTF-8 com BOM é conferido pelos bytes e confirmado só pelo resumo', async () => {
  const b = await montar({ bom: true })
  expect((await b.pedir('confirmar', { pedido: b.pedido })).status).toBe(200)
  const prova = b.chamadas.find((c) => c.via === 'hmac')?.body as {
    resumo: { recursos: { digest: string; bytes: number }[] }
  }
  expect(prova.resumo.recursos[0]).toMatchObject(b.pedido.manifesto)
  // O corpo que atravessa o gateway é pequeno: nada do manifesto inteiro.
  expect(JSON.stringify(prova).length).toBeLessThan(4096)
})

test('resposta com outra versão não vira confirmação bem-sucedida no BFF', async () => {
  for (const repetida of [false, true]) {
    const b = await montar({ respostaErrada: true, repetida })
    expect((await b.pedir('confirmar', { pedido: b.pedido })).status).toBe(502)
  }
})

/** As versões guardadas da ilha e o "Voltar para esta versão", sem tocar o armazenamento. */
function montarVersoes(
  opcoes: {
    user?: SessionUser | null
    status?: number
    listaErrada?: boolean
    respostaErrada?: boolean
  } = {},
) {
  const perfil = { tipo: 'arquipelago-v2' as const, ilha: 'sua-ilha' as const }
  const v1 = {
    id: crypto.randomUUID(),
    versao: 1,
    fonte: { cenario: CENARIO, revisao: 0 },
    manifesto: { digest: 'b'.repeat(64), bytes: 10 },
    publicadaEm: '2026-11-21T12:00:00.000Z',
    autorId: PESSOA,
    atual: false,
  }
  const v2 = {
    ...v1,
    id: crypto.randomUUID(),
    versao: 2,
    manifesto: { digest: 'c'.repeat(64), bytes: 12 },
    atual: true,
  }
  const lista = { perfil, versoes: opcoes.listaErrada ? [v1, v2] : [v2, v1] }
  const pedido = {
    operacaoId: crypto.randomUUID(),
    perfil,
    versaoEsperada: 2,
    publicacaoId: v1.id,
  }
  const publicacao = {
    id: crypto.randomUUID(),
    perfil,
    versao: opcoes.respostaErrada ? 2 : 3,
    fonte: { ...v1.fonte, digest: 'a'.repeat(64) },
    manifesto: v1.manifesto,
  }
  const chamadas: { via: string; path: string; body: unknown }[] = []
  const recusa = () => ({
    status: opcoes.status!,
    body: {
      error: { code: 'PUBLICACAO_CENARIO_CONFLITANTE', message: 'O destino mudou em outro lugar' },
    },
  })
  const rotas = createCenariosRoutes({
    gateway: {
      gatewayFetch: async (path: string, o: { body?: unknown } = {}) => {
        chamadas.push({ via: 'jwt', path, body: o.body })
        return opcoes.status ? recusa() : { status: 200, body: lista }
      },
      gatewayFetchHmac: async (path: string, o: { body?: unknown } = {}) => {
        chamadas.push({ via: 'hmac', path, body: o.body })
        return opcoes.status ? recusa() : { status: 200, body: { publicacao, repetido: false } }
      },
    } as unknown as GatewayModule,
    session: {
      getSession: async () => (opcoes.user === undefined ? user : opcoes.user),
    } as unknown as SessionModule,
    armazenamento: {
      abrir: async () => {
        throw Error('Voltar uma versão não lê o armazenamento')
      },
      presignPut: async () => {
        throw Error('Voltar uma versão não envia arquivos')
      },
      presignGet: async () => {
        throw Error('Voltar uma versão não assina leitura')
      },
      apagar: async () => {},
    },
  }).cenarios
  const listar = (ilha = 'sua-ilha') =>
    rotas.GET(new Request(`http://localhost/api/cenarios/publicacoes/perfis/${ilha}/versoes`), {
      params: Promise.resolve({ caminho: ['publicacoes', 'perfis', ilha, 'versoes'] }),
    })
  const voltar = (body: unknown, headers: Record<string, string> = {}) =>
    rotas.POST(
      new Request('http://localhost/api/cenarios/publicacoes/voltar', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-sz-viewer': PESSOA, ...headers },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      }),
      { params: Promise.resolve({ caminho: ['publicacoes', 'voltar'] }) },
    )
  return { lista, pedido, publicacao, chamadas, listar, voltar, v1 }
}

test('a lista das versões passa pelo members com a sessão e só sai conferida', async () => {
  const b = montarVersoes()
  const r = await b.listar()
  expect(r.status).toBe(200)
  expect(r.headers.get('cache-control')).toBe('private, no-store')
  expect(await r.json()).toEqual(b.lista)
  expect(b.chamadas).toEqual([
    { via: 'jwt', path: '/members/cenarios/publicacoes/perfis/sua-ilha/versoes', body: undefined },
  ])
  // Ilha fora da lista nem chega ao gateway; sem sessão, também não.
  expect((await b.listar('outra-ilha')).status).toBe(404)
  expect((await montarVersoes({ user: null }).listar()).status).toBe(401)
  expect(b.chamadas).toHaveLength(1)
  // A recusa do members (perfil do Kids, quem não é da equipe) passa adiante como veio.
  expect((await montarVersoes({ status: 403 }).listar()).status).toBe(403)
  // Lista fora de ordem não chega à oficina.
  expect((await montarVersoes({ listaErrada: true }).listar()).status).toBe(502)
})

test('voltar uma versão vai pela rota interna com o ator da sessão e confere a resposta', async () => {
  const b = montarVersoes()
  const r = await b.voltar(b.pedido)
  expect(r.status).toBe(200)
  expect(await r.json()).toEqual({ publicacao: b.publicacao, repetido: false })
  expect(b.chamadas).toEqual([
    {
      via: 'hmac',
      path: '/members/internal/cenarios/publicacoes/voltar',
      body: {
        ator: { usuarioId: PESSOA, contaId: PESSOA, equipe: true, suporte: false, perfil: false },
        pedido: b.pedido,
      },
    },
  ])
  // Sessão de perfil (a criança, ou a equipe testando o Kids): o ator diz isso ao members.
  const noPerfil = montarVersoes({
    user: { ...user, activeProfile: { id: PESSOA, accountId: ESPACO, name: 'Ana' } } as SessionUser,
  })
  await noPerfil.voltar(noPerfil.pedido)
  expect(noPerfil.chamadas[0]?.body).toMatchObject({ ator: { perfil: true, contaId: ESPACO } })
})

test('voltar recusa corpo inválido, sessão trocada, suporte só de leitura e resposta divergente', async () => {
  const b = montarVersoes()
  for (const corpo of [
    { ...b.pedido, versaoEsperada: 0 },
    { ...b.pedido, manifesto: b.v1.manifesto },
    { pedido: b.pedido },
    'não é json',
  ])
    expect((await b.voltar(corpo)).status).toBe(400)
  expect((await b.voltar({ ...b.pedido, extra: 'x'.repeat(20 * 1024) })).status).toBe(400)
  expect((await b.voltar(b.pedido, { 'x-sz-viewer': ESPACO })).status).toBe(409)
  expect((await montarVersoes({ user: null }).voltar(b.pedido)).status).toBe(401)
  const suporte = montarVersoes({
    user: { ...user, act: { sub: 'suporte', mode: 'readonly' } } as SessionUser,
  })
  expect((await suporte.voltar(suporte.pedido)).status).toBe(403)
  expect(b.chamadas).toEqual([])
  expect(suporte.chamadas).toEqual([])
  // CAS vencido no members chega à oficina como conflito, para ela conferir o destino de novo.
  const vencido = montarVersoes({ status: 409 })
  const conflito = await vencido.voltar(vencido.pedido)
  expect(conflito.status).toBe(409)
  expect(((await conflito.json()) as { error: { code: string } }).error.code).toBe(
    'PUBLICACAO_CENARIO_CONFLITANTE',
  )
  const errada = montarVersoes({ respostaErrada: true })
  expect((await errada.voltar(errada.pedido)).status).toBe(502)
})

test('o agente com token lista pelo próprio token e volta com o ator do token verificado', async () => {
  const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.e30.agente-da-equipe'
  const b = montarVersoes()
  const usados: { token: string; path: string }[] = []
  const hmac: { path: string; body: unknown }[] = []
  const rotas = createCenariosRoutes({
    gateway: {
      gatewayFetch: async () => {
        throw Error('o pedido do agente não pode usar o cookie')
      },
      gatewayFetchHmac: async (path: string, o: { body?: unknown } = {}) => {
        hmac.push({ path, body: o.body })
        return { status: 200, body: { publicacao: b.publicacao, repetido: false } }
      },
    } as unknown as GatewayModule,
    session: {
      getSession: async () => {
        throw Error('o pedido do agente não lê a sessão do cookie')
      },
      verifyAccessToken: async (t: string) =>
        t === TOKEN ? { ok: true, user } : { ok: false, expired: false },
    } as unknown as SessionModule,
    gatewayDoToken: (token) =>
      ({
        gatewayFetch: async (path: string) => {
          usados.push({ token, path })
          return { status: 200, body: b.lista }
        },
      }) as unknown as Pick<GatewayModule, 'gatewayFetch'>,
  }).cenarios
  const comToken = (metodo: 'GET' | 'POST', caminho: string, corpo?: unknown) =>
    rotas[metodo](
      new Request(`http://localhost/api/cenarios/${caminho}`, {
        method: metodo,
        headers: {
          authorization: `Bearer ${TOKEN}`,
          ...(corpo ? { 'content-type': 'application/json' } : {}),
        },
        ...(corpo ? { body: JSON.stringify(corpo) } : {}),
      }),
      { params: Promise.resolve({ caminho: caminho.split('/') }) },
    )
  const lista = await comToken('GET', 'publicacoes/perfis/sua-ilha/versoes')
  expect(lista.status).toBe(200)
  expect(usados).toEqual([
    { token: TOKEN, path: '/members/cenarios/publicacoes/perfis/sua-ilha/versoes' },
  ])
  const volta = await comToken('POST', 'publicacoes/voltar', b.pedido)
  expect(volta.status).toBe(200)
  expect(hmac).toEqual([
    {
      path: '/members/internal/cenarios/publicacoes/voltar',
      body: {
        ator: { usuarioId: PESSOA, contaId: PESSOA, equipe: true, suporte: false, perfil: false },
        pedido: b.pedido,
      },
    },
  ])
})
