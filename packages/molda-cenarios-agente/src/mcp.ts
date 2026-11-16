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
const busca = projeto
    .extend({ consulta: z.string().max(120), limite: z.number().int().min(1).max(200).default(40) })
    .strict(),
  copia = projeto.extend({ nome: z.string().min(1).max(120), operacaoId: z.uuid() }).strict(),
  aplicar = projeto.extend({ revisao: z.number().int().nonnegative() }).strict()
const definicoes = [
  {
    name: 'buscar_modelos',
    description:
      'Busca no catálogo fixado pelo projeto. Retorna identificadores e dimensões reais, sem baixar arte.',
    schema: busca,
  },
  {
    name: 'criar_copia',
    description: 'Cria uma cópia editável do documento existente. Não aplica ao jogo.',
    schema: copia,
  },
  {
    name: 'aplicar_ao_ensaio',
    description:
      'Seleciona a revisão atual salva como fonte do ensaio /macro. Não concede progresso de campanha.',
    schema: aplicar,
  },
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
    if (name === 'buscar_modelos') {
      const p = busca.parse(args),
        d = await cliente.projeto(p.id),
        modelos = await cliente.catalogo(d.documento.catalogo.id, d.documento.catalogo.digest),
        normalizar = (s: string) =>
          s
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .toLowerCase(),
        filtro = normalizar(p.consulta)
      return texto(
        modelos
          .filter((m) => normalizar(`${m.nome} ${m.origem} ${m.categoria}`).includes(filtro))
          .slice(0, p.limite),
      )
    }
    if (name === 'criar_copia') {
      const p = copia.parse(args),
        d = await cliente.projeto(p.id)
      return texto(await cliente.criar(p.nome, d.documento, p.operacaoId))
    }
    if (name === 'aplicar_ao_ensaio') {
      const p = aplicar.parse(args)
      return texto(await cliente.aplicar(p.id, p.revisao))
    }
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
