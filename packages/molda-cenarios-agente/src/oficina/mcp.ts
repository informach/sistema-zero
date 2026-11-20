import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  type CallToolResult,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { criarClienteDaOficina, lerAcessoDaOficina } from './cliente'
import {
  type Contexto,
  criarContexto,
  ehImagem,
  executarFerramenta,
  FERRAMENTAS,
} from './ferramentas'

/**
 * MCP da oficina de cenários (Molda › Cenários). As ferramentas são as do `ferramentas.ts` (as
 * mesmas do CLI); o guia de uso vai como recurso, para o agente ler antes de começar.
 */

export const GUIA_URI = 'molda-cenarios://guia'

export function lerGuia(): string {
  return readFileSync(
    resolve(import.meta.dirname, '../../../../docs/molda-cenarios-agentes.md'),
    'utf8',
  )
}

export async function chamarFerramenta(
  contexto: Contexto,
  nome: string,
  argumentos: unknown,
): Promise<CallToolResult> {
  const r = await executarFerramenta(contexto, nome, argumentos)
  if (!r.ok) return { content: [{ type: 'text', text: JSON.stringify(r.erro) }], isError: true }
  // A captura volta como imagem de verdade, com os dados dela ao lado.
  if (ehImagem(r.valor)) {
    const { imagem, tipo, ...resto } = r.valor
    return {
      content: [
        { type: 'image', data: Buffer.from(imagem).toString('base64'), mimeType: tipo },
        { type: 'text', text: JSON.stringify(resto) },
      ],
    }
  }
  return { content: [{ type: 'text', text: JSON.stringify(r.valor) }] }
}

export function listarFerramentas() {
  // JSON Schema é o contrato público do MCP; a validação usa os schemas do próprio domínio.
  return FERRAMENTAS.map((f) => ({
    name: f.name,
    description: f.description,
    inputSchema: { ...z.toJSONSchema(f.schema, { io: 'input' }), type: 'object' as const },
  }))
}

if (import.meta.main) {
  const { host, baixar } = criarClienteDaOficina(lerAcessoDaOficina())
  const contexto = criarContexto(host, baixar)
  const servidor = new Server(
    {
      name: 'molda-cenarios',
      version: '0.3.0',
    },
    {
      capabilities: { tools: {}, resources: {} },
      instructions: `Leia o recurso ${GUIA_URI} antes de começar: unidades, revisão esperada e receitas prontas.`,
    },
  )
  servidor.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: listarFerramentas() }))
  servidor.setRequestHandler(CallToolRequestSchema, (pedido) =>
    chamarFerramenta(contexto, pedido.params.name, pedido.params.arguments),
  )
  servidor.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: GUIA_URI,
        name: 'Guia da oficina de cenários para agentes',
        mimeType: 'text/markdown',
      },
    ],
  }))
  servidor.setRequestHandler(ReadResourceRequestSchema, async (pedido) => {
    if (pedido.params.uri !== GUIA_URI) throw Error('Recurso desconhecido')
    return { contents: [{ uri: GUIA_URI, mimeType: 'text/markdown', text: lerGuia() }] }
  })
  await servidor.connect(new StdioServerTransport())
}
