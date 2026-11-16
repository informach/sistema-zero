import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  type CallToolResult,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { ComandoDeCenarioSchema } from '@sistemazero/molda-cenarios-core/v2'
import { z } from 'zod'
import {
  type ClienteDaOficina,
  criarClienteDaOficina,
  lerAcessoDaOficina,
  RecusaDaOficina,
} from './cliente'

/**
 * MCP da oficina de cenários (Molda › Cenários). O agente usa as MESMAS rotas e os MESMOS
 * comandos em lote da edição à mão, direto no servidor: não precisa de aba aberta.
 */

const id = z.uuid()
const nome = z.string().min(1).max(120)
const vazio = z.object({}).strict()

export const FERRAMENTAS = [
  {
    name: 'listar_espacos',
    description:
      'Lista os espaços que esta conta usa: o da conta e, para a equipe, o da Equipe Sistema Zero (onde mora o acervo licenciado). Mostra o uso e o limite de armazenamento.',
    schema: vazio,
    executar: (c: ClienteDaOficina) => c.espacos(),
  },
  {
    name: 'listar_bibliotecas',
    description:
      'Lista as bibliotecas de modelos de um espaço, com a licença de cada uma (livre, propria ou restrita) e quantos modelos tem.',
    schema: z.object({ espacoId: id }).strict(),
    executar: (c: ClienteDaOficina, a: { espacoId: string }) => c.bibliotecas(a.espacoId),
  },
  {
    name: 'buscar_modelos',
    description:
      'Busca modelos numa biblioteca por nome, pasta e etiqueta (sem acento, vários termos). Devolve id, digest, medidas reais (min e max em metros) e triângulos de cada modelo, sem baixar arquivo. Use `proximo` como `cursor` para a página seguinte.',
    schema: z
      .object({
        bibliotecaId: id,
        busca: z.string().max(120).optional(),
        pasta: z.string().max(240).optional(),
        cursor: z
          .string()
          .regex(/^[0-9]{1,7}$/)
          .optional(),
        limite: z.number().int().min(1).max(200).default(40),
      })
      .strict(),
    executar: (
      c: ClienteDaOficina,
      a: { bibliotecaId: string; busca?: string; pasta?: string; cursor?: string; limite: number },
    ) => c.modelos(a.bibliotecaId, a),
  },
  {
    name: 'listar_mundos',
    description:
      'Lista os mundos de um espaço. O mundo é o projeto: guarda os cenários e diz quais bibliotecas usa.',
    schema: z.object({ espacoId: id }).strict(),
    executar: (c: ClienteDaOficina, a: { espacoId: string }) => c.mundos(a.espacoId),
  },
  {
    name: 'criar_mundo',
    description: 'Cria um mundo vazio num espaço.',
    schema: z.object({ espacoId: id, nome }).strict(),
    executar: (c: ClienteDaOficina, a: { espacoId: string; nome: string }) =>
      c.criarMundo(a.espacoId, a.nome),
  },
  {
    name: 'ligar_bibliotecas',
    description:
      'Define quais bibliotecas o mundo usa (a lista inteira, substituindo a anterior). Só bibliotecas do mesmo espaço do mundo.',
    schema: z.object({ mundoId: id, bibliotecas: z.array(id).max(200) }).strict(),
    executar: (c: ClienteDaOficina, a: { mundoId: string; bibliotecas: string[] }) =>
      c.ligarBibliotecas(a.mundoId, a.bibliotecas),
  },
  {
    name: 'listar_cenarios',
    description: 'Lista os cenários de um mundo, com a revisão atual de cada um.',
    schema: z.object({ mundoId: id }).strict(),
    executar: (c: ClienteDaOficina, a: { mundoId: string }) => c.cenarios(a.mundoId),
  },
  {
    name: 'criar_cenario',
    description: 'Cria um cenário vazio (chão plano) num mundo. Devolve o id e a revisão 0.',
    schema: z.object({ mundoId: id, nome }).strict(),
    executar: (c: ClienteDaOficina, a: { mundoId: string; nome: string }) =>
      c.criarCenario(a.mundoId, a.nome),
  },
  {
    name: 'ler_cenario',
    description:
      'Lê o documento inteiro do cenário e a revisão. Leia antes de editar: a edição exige a revisão que você leu.',
    schema: z.object({ cenarioId: id }).strict(),
    executar: (c: ClienteDaOficina, a: { cenarioId: string }) => c.cenario(a.cenarioId),
  },
  {
    name: 'duplicar_cenario',
    description:
      'Cria uma cópia do cenário no mesmo mundo. Bom para experimentar sem mexer no original.',
    schema: z.object({ cenarioId: id }).strict(),
    executar: (c: ClienteDaOficina, a: { cenarioId: string }) => c.duplicar(a.cenarioId),
  },
  {
    name: 'editar_cenario',
    description: [
      'Aplica um lote de comandos ao cenário, inteiro ou nada. São os mesmos comandos da edição à mão.',
      'Passe em `revisaoEsperada` a revisão lida por último; se o cenário mudou em outro lugar, a resposta traz `revisaoAtual` e nada é aplicado: leia de novo e refaça.',
      'Para pôr um objeto: primeiro `modelo.definir` com um id seu (curto, único no documento), a `biblioteca`, o `modelo` e o `digest` que `buscar_modelos` devolveu; depois `instancia.criar` apontando para esse id em `modelo`. Os dois podem ir no mesmo lote.',
      'Unidades em metros; y é a altura. Repetir o mesmo `operacaoId` depois de uma resposta perdida não aplica duas vezes.',
    ].join(' '),
    schema: z
      .object({
        cenarioId: id,
        revisaoEsperada: z.number().int().min(0),
        comandos: z.array(ComandoDeCenarioSchema).min(1).max(500),
        operacaoId: z
          .string()
          .regex(/^[A-Za-z0-9_-]{8,80}$/)
          .optional(),
      })
      .strict(),
    executar: (
      c: ClienteDaOficina,
      a: {
        cenarioId: string
        revisaoEsperada: number
        comandos: z.infer<typeof ComandoDeCenarioSchema>[]
        operacaoId?: string
      },
    ) => c.editar(a.cenarioId, a.revisaoEsperada, a.comandos, a.operacaoId),
  },
] as const

const texto = (valor: unknown, erro = false): CallToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(valor) }],
  ...(erro ? { isError: true } : {}),
})

export async function chamarFerramenta(
  cliente: ClienteDaOficina,
  nomeDaFerramenta: string,
  argumentos: unknown,
): Promise<CallToolResult> {
  const ferramenta = FERRAMENTAS.find((f) => f.name === nomeDaFerramenta)
  if (!ferramenta) return texto({ erro: 'Ferramenta desconhecida' }, true)
  try {
    // A entrada é conferida ANTES de qualquer chamada ao serviço.
    const entrada = ferramenta.schema.parse(argumentos ?? {})
    return texto(
      await (ferramenta.executar as (c: ClienteDaOficina, a: unknown) => unknown)(cliente, entrada),
    )
  } catch (falha) {
    if (falha instanceof RecusaDaOficina)
      return texto({ erro: falha.message, codigo: falha.codigo, ...(falha.detalhes ?? {}) }, true)
    if (falha instanceof z.ZodError)
      return texto(
        {
          erro: 'Entrada inválida',
          problemas: falha.issues.slice(0, 12).map((i) => `${i.path.join('.')}: ${i.message}`),
        },
        true,
      )
    return texto({ erro: falha instanceof Error ? falha.message : String(falha) }, true)
  }
}

if (import.meta.main) {
  const cliente = criarClienteDaOficina(lerAcessoDaOficina())
  const servidor = new Server(
    { name: 'molda-cenarios', version: '0.2.0' },
    { capabilities: { tools: {} } },
  )
  // JSON Schema é o contrato público do MCP; a validação usa os schemas do próprio domínio.
  servidor.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: FERRAMENTAS.map((f) => ({
      name: f.name,
      description: f.description,
      inputSchema: { ...z.toJSONSchema(f.schema), type: 'object' as const },
    })),
  }))
  servidor.setRequestHandler(CallToolRequestSchema, (pedido) =>
    chamarFerramenta(cliente, pedido.params.name, pedido.params.arguments),
  )
  await servidor.connect(new StdioServerTransport())
}
