import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  type CallToolResult,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { PedidoDeViewportSchema } from '@sistemazero/molda-cenarios-core'
import { z } from 'zod'
import { criarClienteCenarios, lerAcesso } from './cliente'

const cliente = criarClienteCenarios(await lerAcesso()),
  servidor = new Server(
    { name: 'molda-cenarios', version: '0.1.0' },
    { capabilities: { tools: {} } },
  )
const vazio = z.object({}).strict(),
  projeto = z.object({ id: z.uuid() }).strict(),
  comando = z.object({ sessaoId: z.uuid(), pedido: PedidoDeViewportSchema }).strict()
const definicoes = [
  {
    name: 'listar_cenarios',
    description: 'Lista os projetos compartilhados de cenários.',
    schema: vazio,
  },
  {
    name: 'ler_cenario',
    description: 'Lê o documento e sua revisão. Não altera o cenário.',
    schema: projeto,
  },
  {
    name: 'listar_sessoes',
    description:
      'Lista viewports ativos, revisão, modo e gesto manual. Escolha uma sessão antes de comandar.',
    schema: vazio,
  },
  {
    name: 'comandar_editor',
    description:
      'Executa comandos semânticos na mesma fila do mouse/teclado. Exige revisão exata; gestos manuais impedem escrita. Capturar devolve PNG da revisão renderizada.',
    schema: comando,
  },
]
const texto = (v: unknown): CallToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(v) }],
})
// JSON Schema é o contrato público do MCP. A validação usa os schemas únicos do domínio,
// sem acoplar os tipos internos de versões diferentes de Zod do SDK e da plataforma.
servidor.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: definicoes.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: { ...z.toJSONSchema(t.schema), type: 'object' as const },
  })),
}))
servidor.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params
    if (name === 'listar_cenarios') {
      vazio.parse(args ?? {})
      return texto(await cliente.projetos())
    }
    if (name === 'listar_sessoes') {
      vazio.parse(args ?? {})
      return texto(await cliente.sessoes())
    }
    if (name === 'ler_cenario') return texto(await cliente.projeto(projeto.parse(args).id))
    if (name !== 'comandar_editor') return { ...texto('Ferramenta desconhecida'), isError: true }
    const p = comando.parse(args),
      r = await cliente.executar(p.sessaoId, p.pedido),
      imagem = r.dados?.imagem
    if (typeof imagem === 'string' && imagem.startsWith('data:image/png;base64,'))
      return {
        isError: !r.ok,
        content: [
          { type: 'text', text: JSON.stringify({ ok: r.ok, revisao: r.revisao }) },
          {
            type: 'image',
            mimeType: 'image/png',
            data: imagem.slice('data:image/png;base64,'.length),
          },
        ],
      }
    return { ...texto(r), isError: !r.ok }
  } catch (e) {
    return { ...texto({ erro: e instanceof Error ? e.message : String(e) }), isError: true }
  }
})
await servidor.connect(new StdioServerTransport())
