import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { createHash } from 'node:crypto'
import type { SessionUser } from '../src/lib/types'
import type { GatewayModule } from '../src/server/gateway'
import type { SessionModule } from '../src/server/session'

mock.module('server-only', () => ({}))

const { chaveDoArquivoDoCenario, createCenariosRoutes } = await import('../src/routes/cenarios')

const ESPACO = '11111111-1111-4111-8111-111111111111'
const OUTRO_ESPACO = '22222222-2222-4222-8222-222222222222'
const BIBLIOTECA = '33333333-3333-4333-8333-333333333333'
const CENARIO = '44444444-4444-4444-8444-444444444444'
const CONTA = '55555555-5555-4555-8555-555555555555'
const PERFIL = '66666666-6666-4666-8666-666666666666'
const jsonDoModelo = JSON.stringify({ asset: { version: '2.0' }, meshes: [{}] })
const modeloJson = Buffer.from(jsonDoModelo.padEnd(Math.ceil(jsonDoModelo.length / 4) * 4, ' '))
const modeloGlb = Buffer.alloc(20 + modeloJson.length)
modeloGlb.writeUInt32LE(0x46546c67, 0)
modeloGlb.writeUInt32LE(2, 4)
modeloGlb.writeUInt32LE(modeloGlb.length, 8)
modeloGlb.writeUInt32LE(modeloJson.length, 12)
modeloGlb.writeUInt32LE(0x4e4f534a, 16)
modeloGlb.set(modeloJson, 20)
const arquivos = [
  { bytes: modeloGlb, tipo: 'model/gltf-binary' },
  {
    bytes: Buffer.from(
      'UklGRjgAAABXRUJQVlA4ICwAAACwAQCdASoCAAIAAUAmJaACdLoABKoAAP4TH/AXT3Ri3/69H/56P/z0f5wAAA==',
      'base64',
    ),
    tipo: 'image/webp',
  },
  {
    bytes: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWPQ2BLwH4QZYAwASdwIre2QMR4AAAAASUVORK5CYII=',
      'base64',
    ),
    tipo: 'image/png',
  },
].map((a) => ({ ...a, digest: createHash('sha256').update(a.bytes).digest('hex') }))
const digest = (letra: string) => arquivos['abc'.indexOf(letra)]?.digest ?? letra.repeat(64)
const prova = (indice: number) => ({
  digest: arquivos[indice]!.digest,
  bytes: arquivos[indice]!.bytes.length,
  tipoDoConteudo: arquivos[indice]!.tipo,
})

const crianca: SessionUser = {
  id: PERFIL,
  email: '',
  firstName: 'Lia',
  lastName: '',
  role: 'admin',
  status: 'active',
  activeProfile: { accountId: CONTA, name: 'Lia' } as SessionUser['activeProfile'],
}

interface Chamada {
  via: 'jwt' | 'hmac'
  path: string
  method: string
  body?: unknown
  query?: unknown
}

function montar(
  opcoes: {
    user?: SessionUser | null
    responder?: (c: Chamada) => { status: number; body: unknown } | undefined
    existe?: (chave: string) => boolean | null
    adulterar?: boolean
  } = {},
) {
  const chamadas: Chamada[] = []
  const assinados: Array<Record<string, unknown>> = []
  const lidos: Array<{ chave: string; opcoes: Record<string, unknown> }> = []
  const conferidos: string[] = []
  const apagados: string[][] = []
  const tarefas: Array<() => Promise<void>> = []
  const responder = (c: Chamada) => {
    chamadas.push(c)
    if (c.path === '/members/cenarios/espacos' && c.method === 'GET')
      return opcoes.responder?.(c) ?? { status: 200, body: [{ id: ESPACO }] }
    if (c.path.includes('/arquivos/')) {
      const arquivo = arquivos.find((a) => c.path.endsWith(a.digest))!
      return (
        opcoes.responder?.(c) ?? {
          status: 200,
          body: {
            chave: chaveDoArquivoDoCenario(ESPACO, arquivo.digest),
            tipoDoConteudo: arquivo.tipo,
            bytes: arquivo.bytes.length,
          },
        }
      )
    }
    return opcoes.responder?.(c) ?? { status: 200, body: { ok: true } }
  }
  const gateway = {
    gatewayFetch: async (
      path: string,
      o: { method?: string; body?: unknown; query?: unknown } = {},
    ) => responder({ via: 'jwt', path, method: o.method ?? 'GET', body: o.body, query: o.query }),
    gatewayFetchHmac: async (path: string, o: { method?: string; body?: unknown } = {}) =>
      responder({ via: 'hmac', path, method: o.method ?? 'GET', body: o.body }),
  } as unknown as GatewayModule
  const user = opcoes.user === undefined ? crianca : opcoes.user
  const rotas = createCenariosRoutes({
    gateway,
    session: { getSession: async () => user } as unknown as SessionModule,
    armazenamento: {
      presignPut: async (entrada) => {
        assinados.push(entrada)
        return `https://armazenamento.exemplo/envio/${entrada.key}`
      },
      presignGet: async (chave, o = {}) => {
        lidos.push({ chave, opcoes: o })
        return `https://armazenamento.exemplo/leitura/${chave}`
      },
      abrir: async (chave) => {
        conferidos.push(chave)
        const existe = opcoes.existe ? opcoes.existe(chave) : true
        if (existe === null) throw new Error('armazenamento fora do ar')
        if (!existe) return null
        const arquivo = arquivos.find((a) => chave.endsWith(a.digest))!
        const bytes = opcoes.adulterar ? Buffer.from('arquivo trocado') : arquivo.bytes
        return {
          contentType: arquivo.tipo,
          contentLength: bytes.length,
          body: new ReadableStream<Uint8Array>({
            start(c) {
              c.enqueue(bytes)
              c.close()
            },
          }),
        }
      },
      apagar: async (chaves) => {
        apagados.push([...chaves])
      },
    },
    depois: (tarefa) => {
      tarefas.push(tarefa)
    },
    agora: () => Date.UTC(2026, 10, 16, 12, 0, 0),
  }).cenarios
  const pedir = async (
    metodo: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    caminho: string,
    corpo?: unknown,
    headers: Record<string, string> = {},
  ) => {
    const [semConsulta] = caminho.split('?')
    const req = new Request(`http://localhost/api/cenarios/${caminho}`, {
      method: metodo,
      headers: {
        ...(corpo === undefined ? {} : { 'content-type': 'application/json' }),
        ...headers,
      },
      ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
    })
    return rotas[metodo](req, { params: Promise.resolve({ caminho: semConsulta!.split('/') }) })
  }
  return { pedir, chamadas, assinados, lidos, conferidos, apagados, tarefas }
}

// A lembrança de quem pode ler cada espaço mora no processo: cada teste começa sem ela.
beforeEach(() => {
  ;(globalThis as Record<symbol, unknown>)[Symbol.for('sz.cenarios.leituras')] = new Map()
})

describe('BFF do Molda Cenários: repasse', () => {
  test('caminho ou método fora da lista não chega ao members', async () => {
    const t = montar()
    for (const [metodo, caminho] of [
      ['GET', 'qualquer/coisa'],
      ['DELETE', `modelos/${BIBLIOTECA}`],
      ['GET', `cenarios/${CENARIO}/lotes`],
      ['GET', `cenarios/${CENARIO}/../../admin`],
      ['POST', 'espacos'],
      ['PATCH', `cenarios/${CENARIO}`],
    ] as const)
      expect((await t.pedir(metodo, caminho, metodo === 'GET' ? undefined : {})).status).toBe(404)
    expect(t.chamadas).toEqual([])
  })

  test('a busca de modelos leva só a consulta combinada, e a resposta nunca fica em cache', async () => {
    const t = montar({ responder: () => ({ status: 200, body: { itens: [], total: 0 } }) })
    const r = await t.pedir(
      'GET',
      `bibliotecas/${BIBLIOTECA}/modelos?busca=arvore&limite=40&audience=adult&cursor=`,
    )
    expect(r.status).toBe(200)
    expect(r.headers.get('cache-control')).toBe('private, no-store')
    expect(t.chamadas).toEqual([
      {
        via: 'jwt',
        path: `/members/cenarios/bibliotecas/${BIBLIOTECA}/modelos`,
        method: 'GET',
        body: undefined,
        query: { busca: 'arvore', limite: '40' },
      },
    ])
  })

  test('o lote do editor segue com o corpo; recusa do members volta inteira', async () => {
    const t = montar({
      responder: () => ({
        status: 409,
        body: { error: { code: 'CENARIO_DESATUALIZADO' }, details: { revisaoAtual: 7 } },
      }),
    })
    const lote = {
      revisaoEsperada: 3,
      operacaoId: 'op-1',
      comandos: [{ tipo: 'cenario.renomear', nome: 'Praia' }],
    }
    const r = await t.pedir('POST', `cenarios/${CENARIO}/lotes`, lote)
    expect(r.status).toBe(409)
    expect(await r.json()).toMatchObject({ details: { revisaoAtual: 7 } })
    expect(t.chamadas[0]).toMatchObject({ method: 'POST', body: lote })
  })
  test('histórico e versões passam pelos caminhos explícitos e filtram a consulta', async () => {
    const t = montar()
    expect((await t.pedir('GET', `cenarios/${CENARIO}/historico`)).status).toBe(200)
    expect(
      (await t.pedir('GET', `cenarios/${CENARIO}/revisoes?antes=20&outra=ignorada`)).status,
    ).toBe(200)
    expect(t.chamadas.at(-1)?.query).toEqual({ antes: '20' })
    const pedido = { acao: 'desfazer', revisaoEsperada: 20, operacaoId: 'desfazer-0001' }
    expect((await t.pedir('POST', `cenarios/${CENARIO}/historico`, pedido)).status).toBe(200)
    expect(t.chamadas.at(-1)?.body).toEqual(pedido)
    expect(
      (
        await t.pedir('POST', `cenarios/${CENARIO}/restaurar`, {
          revisao: 2,
          revisaoEsperada: 21,
          operacaoId: 'restaurar-0001',
        })
      ).status,
    ).toBe(200)
    expect((await t.pedir('DELETE', `cenarios/${CENARIO}/historico`)).status).toBe(404)
  })

  test('resposta sem corpo do members vira um ok que o cliente consegue ler', async () => {
    const t = montar({ responder: () => ({ status: 204, body: null }) })
    const r = await t.pedir('DELETE', `cenarios/${CENARIO}`)
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ ok: true })
  })
})

describe('BFF do Molda Cenários: sessão', () => {
  test('suporte que só olha não escreve, mas lê', async () => {
    const t = montar({
      user: { ...crianca, act: { sub: 'equipe', mode: 'readonly' } as SessionUser['act'] },
    })
    const escrita = await t.pedir('POST', `espacos/${ESPACO}/mundos`, { nome: 'Ilha' })
    expect(escrita.status).toBe(403)
    expect(await escrita.json()).toMatchObject({ error: { code: 'IMPERSONATION_READONLY' } })
    expect((await t.pedir('GET', `espacos/${ESPACO}/mundos`)).status).toBe(200)
    expect(t.chamadas.map((c) => c.method)).toEqual(['GET'])
  })

  test('pedido de outro perfil (o irmão entrou no meio) é recusado', async () => {
    const t = montar()
    const r = await t.pedir('GET', 'espacos', undefined, { 'x-sz-viewer': CONTA })
    expect(r.status).toBe(409)
    expect(t.chamadas).toEqual([])
    expect((await t.pedir('GET', 'espacos', undefined, { 'x-sz-viewer': PERFIL })).status).toBe(200)
  })
})

describe('BFF do Molda Cenários: trazer modelos', () => {
  const reserva = (espacoId = ESPACO) => ({
    espacoId: ESPACO,
    enviar: [
      {
        digest: digest('a'),
        tipo: 'modelo',
        bytes: 4096,
        chave: `cenarios/${espacoId}/blobs/${digest('a')}`,
        tipoDoConteudo: 'model/gltf-binary',
      },
      {
        digest: digest('b'),
        tipo: 'miniatura',
        bytes: 200,
        chave: `cenarios/${espacoId}/blobs/${digest('b')}`,
        tipoDoConteudo: 'image/webp',
      },
    ],
  })

  test('a reserva volta com um endereço de envio por arquivo, com tamanho e tipo presos', async () => {
    const t = montar({ responder: () => ({ status: 200, body: reserva() }) })
    const pedido = { modelos: [{ digest: digest('a'), bytes: 4096 }] }
    const r = await t.pedir('POST', `bibliotecas/${BIBLIOTECA}/modelos/reservar`, pedido)
    expect(r.status).toBe(200)
    const corpo = await r.json()
    expect(corpo.espacoId).toBe(ESPACO)
    expect(corpo.enviar).toEqual([
      {
        digest: digest('a'),
        tipo: 'modelo',
        bytes: 4096,
        tipoDoConteudo: 'model/gltf-binary',
        criarUmaVez: true,
        url: `https://armazenamento.exemplo/envio/cenarios/${ESPACO}/blobs/${digest('a')}`,
      },
      {
        digest: digest('b'),
        tipo: 'miniatura',
        bytes: 200,
        tipoDoConteudo: 'image/webp',
        criarUmaVez: true,
        url: `https://armazenamento.exemplo/envio/cenarios/${ESPACO}/blobs/${digest('b')}`,
      },
    ])
    expect(t.assinados[0]).toEqual({
      key: `cenarios/${ESPACO}/blobs/${digest('a')}`,
      contentType: 'model/gltf-binary',
      contentLength: 4096,
      expiresInSeconds: 900,
      criarUmaVez: true,
    })
    expect(t.chamadas[0]).toMatchObject({
      via: 'jwt',
      path: `/members/cenarios/bibliotecas/${BIBLIOTECA}/modelos/reservar`,
      body: pedido,
    })
  })

  test('chave que não é deste espaço não é assinada', async () => {
    const t = montar({ responder: () => ({ status: 200, body: reserva(OUTRO_ESPACO) }) })
    const r = await t.pedir('POST', `bibliotecas/${BIBLIOTECA}/modelos/reservar`, { modelos: [] })
    expect(r.status).toBe(502)
    expect(t.assinados).toEqual([])
  })

  test('sem espaço na conta, a recusa do members chega à tela', async () => {
    const t = montar({
      responder: () => ({ status: 409, body: { error: { code: 'CENARIOS_SEM_ESPACO' } } }),
    })
    const r = await t.pedir('POST', `bibliotecas/${BIBLIOTECA}/modelos/reservar`, { modelos: [] })
    expect(r.status).toBe(409)
    expect(t.assinados).toEqual([])
  })

  const modelo = {
    nome: 'Árvore',
    pasta: 'natureza',
    etiquetas: ['verde'],
    digest: digest('a'),
    triangulos: 320,
    min: [-1, 0, -1],
    max: [1, 4, 1],
    miniatura: digest('b'),
  }

  test('registrar: o servidor olha o armazenamento e afirma ao members só o que achou', async () => {
    const t = montar({
      existe: (chave) => chave.endsWith(digest('a')),
      responder: (c) => (c.via === 'hmac' ? { status: 200, body: [{ id: 'm1' }] } : undefined),
    })
    const r = await t.pedir('POST', `bibliotecas/${BIBLIOTECA}/modelos`, {
      espacoId: ESPACO,
      modelos: [modelo],
    })
    expect(r.status).toBe(200)
    expect(t.conferidos.sort()).toEqual([
      chaveDoArquivoDoCenario(ESPACO, digest('a')),
      chaveDoArquivoDoCenario(ESPACO, digest('b')),
    ])
    expect(t.chamadas.filter((c) => c.via === 'hmac')).toEqual([
      {
        via: 'hmac',
        path: '/members/internal/cenarios/modelos',
        method: 'POST',
        body: {
          // Quem pede sai da sessão: o perfil, a conta do responsável e o papel da conta.
          ator: { usuarioId: PERFIL, contaId: CONTA, equipe: true, suporte: false },
          bibliotecaId: BIBLIOTECA,
          espacoId: ESPACO,
          modelos: [{ ...modelo, miniatura: null }],
          conferidos: [prova(0)],
        },
      },
    ])
  })

  test('quem não é da equipe nunca vai como equipe, e o suporte vai marcado', async () => {
    const cliente = montar({ user: { ...crianca, role: 'customer' } })
    await cliente.pedir('POST', `bibliotecas/${BIBLIOTECA}/modelos`, {
      espacoId: ESPACO,
      modelos: [modelo],
    })
    expect(cliente.chamadas.find((c) => c.via === 'hmac')?.body).toMatchObject({
      ator: { equipe: false, suporte: false },
    })
    const inativa = montar({ user: { ...crianca, status: 'suspended' } })
    await inativa.pedir('POST', `bibliotecas/${BIBLIOTECA}/modelos`, {
      espacoId: ESPACO,
      modelos: [modelo],
    })
    expect(inativa.chamadas.find((c) => c.via === 'hmac')?.body).toMatchObject({
      ator: { equipe: false },
    })
    const suporte = montar({
      user: { ...crianca, act: { sub: 'equipe', mode: 'write' } as SessionUser['act'] },
    })
    await suporte.pedir('POST', `bibliotecas/${BIBLIOTECA}/modelos`, {
      espacoId: ESPACO,
      modelos: [modelo],
    })
    expect(suporte.chamadas.find((c) => c.via === 'hmac')?.body).toMatchObject({
      ator: { suporte: true },
    })
    const adulto = montar({ user: { ...crianca, id: CONTA, activeProfile: undefined } })
    await adulto.pedir('POST', `bibliotecas/${BIBLIOTECA}/modelos`, {
      espacoId: ESPACO,
      modelos: [modelo],
    })
    expect(adulto.chamadas.find((c) => c.via === 'hmac')?.body).toMatchObject({
      ator: { usuarioId: CONTA, contaId: CONTA },
    })
  })

  test('armazenamento fora do ar: nada é afirmado e a tela pode tentar de novo', async () => {
    const t = montar({ existe: () => null })
    const r = await t.pedir('POST', `bibliotecas/${BIBLIOTECA}/modelos`, {
      espacoId: ESPACO,
      modelos: [modelo],
    })
    expect(r.status).toBe(503)
    expect(t.chamadas.some((c) => c.via === 'hmac')).toBe(false)
  })

  test('conteúdo adulterado não recebe confirmação, mesmo com a chave esperada', async () => {
    const t = montar({ adulterar: true })
    const r = await t.pedir('POST', `bibliotecas/${BIBLIOTECA}/modelos`, {
      espacoId: ESPACO,
      modelos: [modelo],
    })
    expect(r.status).toBe(422)
    expect(t.chamadas.some((c) => c.via === 'hmac')).toBe(false)
  })

  test('um espaço alheio é recusado antes de ler qualquer arquivo', async () => {
    const t = montar()
    const r = await t.pedir('POST', `bibliotecas/${BIBLIOTECA}/modelos`, {
      espacoId: OUTRO_ESPACO,
      modelos: [modelo],
    })
    expect(r.status).toBe(404)
    expect(t.conferidos).toEqual([])
    expect(t.chamadas.some((c) => c.via === 'hmac')).toBe(false)
  })

  test('registro malformado ou sem sessão não chega ao members', async () => {
    const t = montar()
    for (const corpo of [
      { modelos: [modelo] },
      { espacoId: ESPACO, modelos: [] },
      { espacoId: ESPACO, modelos: [{ ...modelo, digest: '../../outro' }] },
      { espacoId: '../x', modelos: [modelo] },
    ])
      expect((await t.pedir('POST', `bibliotecas/${BIBLIOTECA}/modelos`, corpo)).status).toBe(400)
    expect(t.chamadas).toEqual([])
    expect(t.conferidos).toEqual([])
    const semSessao = montar({ user: null })
    const r = await semSessao.pedir('POST', `bibliotecas/${BIBLIOTECA}/modelos`, {
      espacoId: ESPACO,
      modelos: [modelo],
    })
    expect(r.status).toBe(401)
    expect(semSessao.chamadas).toEqual([])
  })

  test('a capa do cenário passa pela mesma conferência', async () => {
    const achou = montar()
    await achou.pedir('POST', `cenarios/${CENARIO}/capa`, { espacoId: ESPACO, digest: digest('c') })
    expect(achou.chamadas.find((c) => c.via === 'hmac')).toMatchObject({
      via: 'hmac',
      path: '/members/internal/cenarios/capa',
      body: { cenarioId: CENARIO, espacoId: ESPACO, digest: digest('c'), conferido: prova(2) },
    })
    const naoAchou = montar({ existe: () => false })
    const ausente = await naoAchou.pedir('POST', `cenarios/${CENARIO}/capa`, {
      espacoId: ESPACO,
      digest: digest('c'),
    })
    expect(ausente.status).toBe(409)
    expect(naoAchou.chamadas.some((c) => c.via === 'hmac')).toBe(false)
  })
})

describe('BFF do Molda Cenários: apagar e ler arquivos', () => {
  test('o MIME confirmado prevalece sobre a consulta e nunca permite servir HTML', async () => {
    const t = montar()
    expect(
      (await t.pedir('GET', `espacos/${ESPACO}/arquivos/${digest('c')}?tipo=modelo`)).status,
    ).toBe(302)
    expect(t.lidos[0]?.opcoes.responseContentType).toBe('image/png')
    const errado = montar({
      responder: (c) =>
        c.path.includes('/arquivos/')
          ? {
              status: 200,
              body: {
                chave: chaveDoArquivoDoCenario(ESPACO, digest('c')),
                bytes: 100,
                tipoDoConteudo: 'text/html',
              },
            }
          : undefined,
    })
    expect((await errado.pedir('GET', `espacos/${ESPACO}/arquivos/${digest('c')}`)).status).toBe(
      502,
    )
    expect(errado.lidos).toEqual([])
  })
  test('o que o members soltou sai do armazenamento depois da resposta, e as chaves não vão à tela', async () => {
    const solto = `cenarios/${ESPACO}/blobs/${digest('a')}`
    const t = montar({
      responder: () => ({
        status: 200,
        body: { apagar: [solto, 'creations/outra-coisa/1.json.gz', `cenarios/${ESPACO}/`] },
      }),
    })
    const r = await t.pedir('POST', `bibliotecas/${BIBLIOTECA}/modelos/apagar`, {
      ids: [BIBLIOTECA],
    })
    expect(await r.json()).toEqual({ ok: true })
    expect(t.apagados).toEqual([])
    await Promise.all(t.tarefas.map((tarefa) => tarefa()))
    // Só chave de arquivo de cenário: nada de prefixo nem de outra ferramenta.
    expect(t.apagados).toEqual([[solto]])

    const biblioteca = montar({ responder: () => ({ status: 200, body: { apagar: [] } }) })
    expect(await (await biblioteca.pedir('DELETE', `bibliotecas/${BIBLIOTECA}`)).json()).toEqual({
      ok: true,
    })
    expect(biblioteca.tarefas).toEqual([])
  })

  test('ler um arquivo: confere o espaço uma vez e redireciona para o mesmo endereço na janela', async () => {
    const t = montar()
    const retrato = await t.pedir('GET', `espacos/${ESPACO}/arquivos/${digest('b')}`)
    expect(retrato.status).toBe(302)
    expect(retrato.headers.get('location')).toBe(
      `https://armazenamento.exemplo/leitura/cenarios/${ESPACO}/blobs/${digest('b')}`,
    )
    expect(retrato.headers.get('cache-control')).toMatch(/^private, max-age=\d+$/)
    // O modelo é baixado por `fetch`: a oficina recebe o endereço e busca sem os cabeçalhos da sessão.
    const modelo = await t.pedir(
      'GET',
      `espacos/${ESPACO}/arquivos/${digest('a')}?tipo=modelo&como=endereco`,
    )
    expect(modelo.status).toBe(200)
    expect(await modelo.json()).toEqual({
      url: `https://armazenamento.exemplo/leitura/cenarios/${ESPACO}/blobs/${digest('a')}`,
    })
    await t.pedir('GET', `espacos/${ESPACO}/arquivos/${digest('b')}`)
    // Permissão e metadados repetidos são lembrados; cada hash novo tem seu MIME confirmado.
    expect(t.chamadas.map((c) => c.path)).toEqual([
      '/members/cenarios/espacos',
      `/members/cenarios/espacos/${ESPACO}/arquivos/${digest('b')}`,
      `/members/cenarios/espacos/${ESPACO}/arquivos/${digest('a')}`,
    ])
    expect(t.lidos.map((l) => l.opcoes.responseContentType)).toEqual([
      'image/webp',
      'model/gltf-binary',
      'image/webp',
    ])
    expect(t.lidos[0]?.opcoes.signingDate).toEqual(t.lidos[1]?.opcoes.signingDate)
    expect(String(t.lidos[0]?.opcoes.responseCacheControl)).toContain('immutable')
  })

  test('arquivo de um espaço que não é da pessoa não existe para ela', async () => {
    const t = montar({ responder: () => ({ status: 200, body: [{ id: ESPACO, tipo: 'conta' }] }) })
    expect((await t.pedir('GET', `espacos/${OUTRO_ESPACO}/arquivos/${digest('a')}`)).status).toBe(
      404,
    )
    expect(t.lidos).toEqual([])
    const fechada = montar({
      responder: () => ({ status: 403, body: { error: { code: 'CENARIOS_FECHADOS' } } }),
    })
    expect((await fechada.pedir('GET', `espacos/${ESPACO}/arquivos/${digest('a')}`)).status).toBe(
      403,
    )
    expect(fechada.lidos).toEqual([])
    const semSessao = montar({ user: null })
    expect((await semSessao.pedir('GET', `espacos/${ESPACO}/arquivos/${digest('a')}`)).status).toBe(
      401,
    )
  })
})
