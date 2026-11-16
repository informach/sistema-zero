import { expect, test } from 'bun:test'
import { resolve } from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { criarClienteDaOficina, RecusaDaOficina } from '../src/oficina/cliente'
import { chamarFerramenta, FERRAMENTAS } from '../src/oficina/mcp'

const CENARIO = '44444444-4444-4444-8444-444444444444'
const ESPACO = '11111111-1111-4111-8111-111111111111'
const BIBLIOTECA = '33333333-3333-4333-8333-333333333333'

interface Pedido {
  metodo: string
  caminho: string
  token: string | null
  corpo: unknown
}

/** Uma plataforma de mentira: login, renovação e as rotas da oficina. */
function plataforma(opcoes: { vencerPrimeiroToken?: boolean } = {}) {
  const pedidos: Pedido[] = []
  let emitidos = 0
  const buscar = async (endereco: string, init: RequestInit): Promise<Response> => {
    const url = new URL(endereco)
    const corpo = typeof init.body === 'string' ? JSON.parse(init.body) : undefined
    const token = new Headers(init.headers).get('authorization')?.replace('Bearer ', '') ?? null
    pedidos.push({ metodo: init.method ?? 'GET', caminho: url.pathname + url.search, token, corpo })
    if (url.pathname === '/auth/login') {
      if (corpo.password !== 'senha-certa') return Response.json({}, { status: 401 })
      emitidos++
      return Response.json({
        tokens: { accessToken: `acesso-${emitidos}`, refreshToken: 'renova-1' },
      })
    }
    if (url.pathname === '/auth/refresh') {
      emitidos++
      return Response.json({
        tokens: { accessToken: `acesso-${emitidos}`, refreshToken: 'renova-2' },
      })
    }
    if (opcoes.vencerPrimeiroToken && token === 'acesso-1')
      return Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
    if (url.pathname.endsWith('/lotes') && corpo.revisaoEsperada !== 3)
      return Response.json(
        {
          error: { code: 'CENARIO_DESATUALIZADO', message: 'O cenário mudou em outro lugar' },
          details: { revisaoAtual: 3 },
        },
        { status: 409 },
      )
    if (url.pathname.endsWith('/lotes')) return Response.json({ revisao: 4 })
    return Response.json([])
  }
  return { buscar, pedidos }
}

const acesso = { url: 'http://127.0.0.1:9', email: 'equipe@exemplo.com', senha: 'senha-certa' }

test('o cliente recusa HTTP remoto, URL com credenciais e acesso sem token nem senha', () => {
  expect(() => criarClienteDaOficina({ url: 'http://example.com', token: 'x' })).toThrow('HTTPS')
  expect(() => criarClienteDaOficina({ url: 'https://u:p@example.com', token: 'x' })).toThrow('URL')
  expect(() => criarClienteDaOficina({ url: 'http://127.0.0.1' })).toThrow('token de acesso')
  expect(() => criarClienteDaOficina({ url: 'http://127.0.0.1', email: 'a@b.c' })).toThrow(
    'token de acesso',
  )
})

test('entra uma vez, fala nas rotas da oficina e renova quando o acesso vence', async () => {
  const { buscar, pedidos } = plataforma({ vencerPrimeiroToken: true })
  const cliente = criarClienteDaOficina(acesso, buscar)
  // Dois pedidos juntos dividem o mesmo login.
  await Promise.all([cliente.espacos(), cliente.mundos(ESPACO)])
  expect(pedidos.filter((p) => p.caminho === '/auth/login')).toHaveLength(1)
  // O primeiro token venceu: renova (sem mandar a senha de novo) e repete o pedido.
  expect(pedidos.some((p) => p.caminho === '/auth/refresh')).toBe(true)
  const ultimo = pedidos.at(-1)!
  expect(ultimo.caminho).toMatch(/^\/members\/cenarios\//)
  expect(ultimo.token).not.toBe('acesso-1')
  await cliente.modelos(BIBLIOTECA, { busca: ' árvore ', limite: 20 })
  expect(pedidos.at(-1)).toMatchObject({
    metodo: 'GET',
    caminho: `/members/cenarios/bibliotecas/${BIBLIOTECA}/modelos?busca=%C3%A1rvore&limite=20`,
  })
})

test('senha errada e token vencido sem senha dizem o que fazer', async () => {
  const errada = criarClienteDaOficina({ ...acesso, senha: 'outra' }, plataforma().buscar)
  await expect(errada.espacos()).rejects.toThrow('Não consegui entrar')
  const { buscar } = plataforma({ vencerPrimeiroToken: true })
  const soToken = criarClienteDaOficina({ url: acesso.url, token: 'acesso-1' }, buscar)
  await expect(soToken.espacos()).rejects.toThrow('O token de acesso venceu')
})

test('editar manda o lote como a edição à mão; comando inválido nem sai da máquina', async () => {
  const { buscar, pedidos } = plataforma()
  const cliente = criarClienteDaOficina(acesso, buscar)
  const comandos = [{ tipo: 'cenario.renomear' as const, nome: 'Praia do Farol' }]
  expect(await cliente.editar(CENARIO, 3, comandos, 'operacao-0001')).toEqual({ revisao: 4 })
  expect(pedidos.at(-1)).toMatchObject({
    metodo: 'POST',
    caminho: `/members/cenarios/cenarios/${CENARIO}/lotes`,
    corpo: { revisaoEsperada: 3, comandos, operacaoId: 'operacao-0001' },
  })
  const antes = pedidos.length
  await expect(
    cliente.editar(CENARIO, 3, [{ tipo: 'eval', codigo: 'qualquer coisa' } as never]),
  ).rejects.toThrow()
  await expect(cliente.cenario('../admin')).rejects.toThrow()
  expect(pedidos.length).toBe(antes)

  const recusa = await cliente.editar(CENARIO, 2, comandos).catch((e: unknown) => e)
  expect(recusa).toBeInstanceOf(RecusaDaOficina)
  expect(recusa).toMatchObject({ codigo: 'CENARIO_DESATUALIZADO', detalhes: { revisaoAtual: 3 } })
})

test('as ferramentas conferem a entrada antes do serviço e devolvem a revisão atual na recusa', async () => {
  const { buscar, pedidos } = plataforma()
  const cliente = criarClienteDaOficina(acesso, buscar)
  const invalido = await chamarFerramenta(cliente, 'editar_cenario', {
    cenarioId: 'incorreto',
    revisaoEsperada: 0,
    comandos: [{ tipo: 'eval' }],
  })
  expect(invalido.isError).toBe(true)
  expect(pedidos).toEqual([])
  expect((await chamarFerramenta(cliente, 'apagar_tudo', {})).isError).toBe(true)

  const atrasado = await chamarFerramenta(cliente, 'editar_cenario', {
    cenarioId: CENARIO,
    revisaoEsperada: 1,
    comandos: [{ tipo: 'cenario.renomear', nome: 'Praia' }],
  })
  expect(atrasado.isError).toBe(true)
  expect(JSON.parse((atrasado.content[0] as { text: string }).text)).toMatchObject({
    codigo: 'CENARIO_DESATUALIZADO',
    revisaoAtual: 3,
  })
  const feito = await chamarFerramenta(cliente, 'editar_cenario', {
    cenarioId: CENARIO,
    revisaoEsperada: 3,
    comandos: [{ tipo: 'cenario.renomear', nome: 'Praia' }],
  })
  expect(feito.isError).not.toBe(true)
  // Nenhuma ferramenta apaga: apagar mundo, cenário ou biblioteca fica com a pessoa, na tela.
  expect(FERRAMENTAS.map((f) => f.name).filter((n) => /apagar|remover|excluir/.test(n))).toEqual([])
})

test('MCP de verdade por stdio publica as ferramentas e os comandos do documento', async () => {
  let chamadas = 0
  const http = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(r) {
      if (r.headers.get('authorization') !== 'Bearer qa-local')
        return new Response(null, { status: 401 })
      chamadas++
      return Response.json([])
    },
  })
  const transporte = new StdioClientTransport({
    command: process.execPath,
    args: ['--no-env-file', resolve(import.meta.dir, '../src/oficina/mcp.ts')],
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter((e): e is [string, string] => typeof e[1] === 'string'),
      ),
      MOLDA_CENARIOS_URL: `http://127.0.0.1:${http.port}`,
      MOLDA_CENARIOS_TOKEN: 'qa-local',
    },
    stderr: 'pipe',
  })
  const cliente = new Client({ name: 'qa-cenarios', version: '1.0.0' })
  try {
    await cliente.connect(transporte)
    const lista = await cliente.listTools()
    expect(lista.tools.map((t) => t.name).sort()).toEqual(FERRAMENTAS.map((f) => f.name).sort())
    // O agente enxerga o formato de cada comando no próprio contrato da ferramenta.
    const editar = lista.tools.find((t) => t.name === 'editar_cenario')
    expect(JSON.stringify(editar?.inputSchema)).toContain('instancia.criar')
    const r = await cliente.callTool({ name: 'listar_espacos', arguments: {} })
    expect(r.isError).not.toBe(true)
    expect(chamadas).toBe(1)
  } finally {
    await cliente.close()
    http.stop(true)
  }
}, 20000)
