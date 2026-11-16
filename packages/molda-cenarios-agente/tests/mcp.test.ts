import { expect, test } from 'bun:test'
import { resolve } from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { criarClienteCenarios } from '../src/cliente'

test('cliente recusa token ausente, HTTP remoto e URL com credenciais', () => {
  expect(() => criarClienteCenarios({ url: 'http://example.com/cenarios', token: 'x' })).toThrow(
    'HTTPS',
  )
  expect(() => criarClienteCenarios({ url: 'https://u:p@example.com', token: 'x' })).toThrow('URL')
  expect(() => criarClienteCenarios({ url: 'http://127.0.0.1', token: '' })).toThrow('Token')
})
test('MCP real via stdio publica o contrato e valida comandos antes de tocar o serviço', async () => {
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
      args: ['--no-env-file', resolve(import.meta.dir, '../src/mcp.ts')],
      env: {
        ...Object.fromEntries(
          Object.entries(process.env).filter(
            (e): e is [string, string] => typeof e[1] === 'string',
          ),
        ),
        MOLDA_CENARIOS_URL: `http://127.0.0.1:${http.port}`,
        MOLDA_CENARIOS_TOKEN: 'qa-local',
      },
      stderr: 'pipe',
    }),
    cliente = new Client({ name: 'qa-cenarios', version: '1.0.0' })
  try {
    await cliente.connect(transporte)
    const lista = await cliente.listTools()
    expect(lista.tools.map((t) => t.name)).toContain('comandar_editor')
    expect(lista.tools.map((t) => t.name)).toContain('buscar_modelos')
    expect(lista.tools.map((t) => t.name)).toContain('criar_copia')
    expect(lista.tools.map((t) => t.name)).toContain('aplicar_ao_ensaio')
    const r = await cliente.callTool({ name: 'listar_cenarios', arguments: {} })
    expect(r.isError).not.toBe(true)
    expect(chamadas).toBe(1)
    const invalido = await cliente.callTool({
      name: 'comandar_editor',
      arguments: {
        sessaoId: 'incorreto',
        pedido: { acao: { tipo: 'eval', codigo: 'qualquer coisa' } },
      },
    })
    expect(invalido.isError).toBe(true)
    expect(chamadas).toBe(1)
  } finally {
    await cliente.close()
    http.stop(true)
  }
}, 20000)
