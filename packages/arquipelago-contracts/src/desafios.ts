import { z } from 'zod'
import { ILHA_IDS } from './ilhas'

/**
 * Os desafios do jogo (decisão de 27/10/2026, plano em `docs/plans/2026-10-27-arquipelago-desafios.md`):
 * cadastrados pela equipe na seção Jogo do Admin, valem para todas as crianças do público, abrem
 * quando a ilha está aberta e a pessoa tem os blocos que o desafio pede, e são conferidos no
 * servidor com o mesmo executor das aulas. O gabarito e as regras NUNCA vão ao navegador da
 * criança: as visões da pessoa são estritas.
 */

export const VERSAO_DESAFIOS = 1
export const TIPOS_DE_DESAFIO = ['quadro-das-cores', 'desafio-do-dia', 'pedido-de-morador'] as const
export type TipoDeDesafio = (typeof TIPOS_DE_DESAFIO)[number]
/** Cada ilha tem seis quadros no Quadro das Cores; cada um feito pinta um sexto dela. */
export const QUADROS_POR_ILHA = 6
export const PUBLICOS_DO_DESAFIO = ['kids', 'adulto'] as const
export type PublicoDoDesafio = (typeof PUBLICOS_DO_DESAFIO)[number]
export const SITUACOES_DO_CADASTRO = ['rascunho', 'publicado', 'arquivado'] as const
export type SituacaoDoCadastro = (typeof SITUACOES_DO_CADASTRO)[number]

export const LIMITES_DO_DESAFIO = {
  titulo: 80,
  enunciado: 2000,
  dica: 300,
  dicas: 5,
  objetivos: 20,
  /** Objetivos que rodam o jogo custam executor: no máximo estes por desafio. */
  objetivosQueRodam: 8,
  moedas: 500,
  moedasExtra: 200,
  blocosManuais: 200,
  /** O projeto (inicial ou gabarito) inteiro, serializado. Igual ao teto do bloco Estúdio. */
  projetoCaracteres: 1_500_000,
} as const

/** Moedas padrão de um desafio novo (o Admin pode mudar dentro dos tetos). */
export const MOEDAS_PADRAO = { principal: 20, extra: 10 } as const

const Texto = (max: number) => z.string().trim().min(1).max(max)
const Bloco = z.string().min(1).max(160)

/**
 * Um objetivo, no mesmo formato dos objetivos da parte das aulas (`SectionProjectCheck` do core).
 * A regra é opaca aqui: quem confere o sentido dela é o Members, com o mesmo verificador das aulas.
 * `optional` marca o desafio extra.
 */
export const ObjetivoDoDesafioSchema = z.strictObject({
  id: z.string().min(1).max(80),
  label: Texto(200),
  hint: z.string().trim().max(LIMITES_DO_DESAFIO.dica).optional(),
  optional: z.literal(true).optional(),
  programmingLanguage: z.literal('javascript').optional(),
  rule: z.record(z.string(), z.unknown()),
})
export type ObjetivoDoDesafio = z.infer<typeof ObjetivoDoDesafioSchema>

/** Um projeto do Estúdio, opaco aqui (o Members valida o formato e o teto). */
const ProjetoSchema = z.unknown().refine(
  (v) => {
    if (v === null || typeof v !== 'object') return false
    try {
      return JSON.stringify(v).length <= LIMITES_DO_DESAFIO.projetoCaracteres
    } catch {
      return false
    }
  },
  { message: 'Projeto do Estúdio ausente ou grande demais' },
)

export const RecompensaDoDesafioSchema = z.strictObject({
  /** O quadro pinta um sexto da ilha (Quadro das Cores). */
  cor: z.boolean(),
  /** Id de uma atração do catálogo da ilha que o desafio entrega (ex.: o minijogo aprovado). */
  atracao: z.string().min(1).max(80).optional(),
  moedas: z.number().int().min(0).max(LIMITES_DO_DESAFIO.moedas),
  moedasExtra: z.number().int().min(0).max(LIMITES_DO_DESAFIO.moedasExtra),
})
export type RecompensaDoDesafio = z.infer<typeof RecompensaDoDesafioSchema>

export const ConteudoDoDesafioV1Schema = z.strictObject({
  versao: z.literal(1),
  titulo: Texto(LIMITES_DO_DESAFIO.titulo),
  enunciado: Texto(LIMITES_DO_DESAFIO.enunciado),
  dicas: z.array(Texto(LIMITES_DO_DESAFIO.dica)).max(LIMITES_DO_DESAFIO.dicas),
  projetoInicial: ProjetoSchema,
  gabarito: ProjetoSchema,
  objetivos: z.array(ObjetivoDoDesafioSchema).min(1).max(LIMITES_DO_DESAFIO.objetivos),
  desafioExtra: z.strictObject({ titulo: Texto(80), texto: Texto(500) }).optional(),
  recompensa: RecompensaDoDesafioSchema,
  /** A equipe ajusta os blocos que o gabarito pede: acrescenta e retira. */
  blocosManuais: z.strictObject({
    acrescentar: z.array(Bloco).max(LIMITES_DO_DESAFIO.blocosManuais),
    retirar: z.array(Bloco).max(LIMITES_DO_DESAFIO.blocosManuais),
  }),
})
export type ConteudoDoDesafio = z.infer<typeof ConteudoDoDesafioV1Schema>

/** Lê um conteúdo guardado (hoje só existe a V1). Formato novo = V2 com migração da V1. */
export function migrarConteudoDoDesafio(guardado: unknown): ConteudoDoDesafio | null {
  const lido = ConteudoDoDesafioV1Schema.safeParse(guardado)
  return lido.success ? lido.data : null
}

/** Os dados do cadastro que não são conteúdo (onde o desafio mora e em que ordem). */
export const MetadadosDoDesafioSchema = z
  .strictObject({
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(80),
    publico: z.enum(PUBLICOS_DO_DESAFIO),
    ilha: z.enum(ILHA_IDS),
    tipo: z.enum(TIPOS_DE_DESAFIO),
    /** Só no Quadro das Cores: qual dos seis quadros. */
    quadro: z.number().int().min(1).max(QUADROS_POR_ILHA).nullable(),
    ordem: z.number().int().min(0).max(10_000),
  })
  .refine((m) => (m.tipo === 'quadro-das-cores') === (m.quadro !== null), {
    message: 'Só o Quadro das Cores tem número de quadro, e ele sempre tem',
    path: ['quadro'],
  })
export type MetadadosDoDesafio = z.infer<typeof MetadadosDoDesafioSchema>

/** `POST /arquipelago/admin/desafios`: cria o rascunho. */
export const CriarDesafioSchema = z.strictObject({
  metadados: MetadadosDoDesafioSchema,
  conteudo: ConteudoDoDesafioV1Schema,
})
export type CriarDesafio = z.infer<typeof CriarDesafioSchema>

/** `PUT /arquipelago/admin/desafios/:id`: grava por revisão (a revisão velha recebe 409). */
export const GravarDesafioSchema = z.strictObject({
  revisaoBase: z.number().int().min(1),
  metadados: MetadadosDoDesafioSchema,
  conteudo: ConteudoDoDesafioV1Schema,
})
export type GravarDesafio = z.infer<typeof GravarDesafioSchema>

/** `POST /:id/publicar|arquivar|reativar` e `/:id/analisar` sem corpo além da revisão. */
export const AcaoComRevisaoSchema = z.strictObject({ revisaoBase: z.number().int().min(1) })

/** Um problema que impede publicar (vem da análise do Members ou da conferência local). */
export const ProblemaDoDesafioSchema = z.strictObject({
  codigo: z.string().min(1).max(60),
  mensagem: z.string().min(1).max(500),
  objetivoId: z.string().max(80).optional(),
})
export type ProblemaDoDesafio = z.infer<typeof ProblemaDoDesafioSchema>

/** De onde cada bloco exigido se aprende, para a equipe ver se o desafio está ao alcance. */
export const CoberturaDoBlocoSchema = z.strictObject({
  bloco: Bloco,
  rotulo: z.string().max(300).nullable(),
  cursos: z.array(
    z.strictObject({
      courseId: z.uuid(),
      titulo: Texto(200),
      posto: z.string().max(40).nullable(),
    }),
  ),
  avisos: z.array(z.enum(['sem-curso', 'bloco-desconhecido', 'curso-depois-da-ilha'])),
})
export type CoberturaDoBloco = z.infer<typeof CoberturaDoBlocoSchema>

/** `POST /arquipelago/admin/desafios/:id/analisar`: o que a publicação congelaria. */
export const AnaliseDoDesafioSchema = z.strictObject({
  blocosDerivados: z.array(Bloco),
  blocosExigidos: z.array(Bloco),
  cobertura: z.array(CoberturaDoBlocoSchema),
  problemas: z.array(ProblemaDoDesafioSchema),
  /** O gabarito passa em cada objetivo? (os obrigatórios precisam passar para publicar) */
  gabarito: z.array(z.strictObject({ id: z.string(), passou: z.boolean() })),
  /** O projeto inicial já passa em algum? (aviso: o desafio estaria resolvido de saída) */
  inicial: z.array(z.strictObject({ id: z.string(), passou: z.boolean() })),
})
export type AnaliseDoDesafio = z.infer<typeof AnaliseDoDesafioSchema>

/** Uma linha da lista do Admin. */
export const ResumoDoDesafioSchema = z.strictObject({
  id: z.uuid(),
  slug: z.string(),
  publico: z.enum(PUBLICOS_DO_DESAFIO),
  ilha: z.enum(ILHA_IDS),
  tipo: z.enum(TIPOS_DE_DESAFIO),
  quadro: z.number().int().nullable(),
  ordem: z.number().int(),
  titulo: z.string(),
  situacao: z.enum(SITUACOES_DO_CADASTRO),
  revisao: z.number().int(),
  revisaoPublicada: z.number().int().nullable(),
  /** Há mudança guardada depois da última publicação. */
  alteradoDepoisDePublicar: z.boolean(),
  atualizadoEm: z.iso.datetime(),
})
export type ResumoDoDesafio = z.infer<typeof ResumoDoDesafioSchema>

/** O desafio inteiro, como a equipe o edita (com gabarito e regras). */
export const DesafioDaEquipeSchema = z.strictObject({
  resumo: ResumoDoDesafioSchema,
  metadados: MetadadosDoDesafioSchema,
  conteudo: ConteudoDoDesafioV1Schema,
  /** Os blocos exigidos congelados na última publicação (null antes de publicar). */
  blocosPublicados: z.array(Bloco).nullable(),
})
export type DesafioDaEquipe = z.infer<typeof DesafioDaEquipeSchema>

// ── O que a pessoa recebe (sem gabarito, sem regras) ─────────────────────────────────────────

export const SITUACOES_PARA_A_PESSOA = [
  'ilha-fechada',
  'faltam-blocos',
  'disponivel',
  'concluido',
] as const
export type SituacaoParaAPessoa = (typeof SITUACOES_PARA_A_PESSOA)[number]

/** O objetivo como a criança o vê: nunca a regra (o mesmo `ProjectObjectiveView` das aulas). */
export const VistaDoObjetivoSchema = z.strictObject({
  id: z.string(),
  label: z.string(),
  hint: z.string().optional(),
  optional: z.literal(true).optional(),
  kind: z.enum(['block', 'idea', 'game', 'function', 'script']),
})
export type VistaDoObjetivo = z.infer<typeof VistaDoObjetivoSchema>

export const DesafioNaListaSchema = z.strictObject({
  id: z.uuid(),
  revisao: z.number().int(),
  ilha: z.enum(ILHA_IDS),
  tipo: z.enum(TIPOS_DE_DESAFIO),
  quadro: z.number().int().nullable(),
  ordem: z.number().int(),
  titulo: z.string(),
  situacao: z.enum(SITUACOES_PARA_A_PESSOA),
  faltam: z.array(
    z.strictObject({
      bloco: Bloco,
      rotulo: z.string().nullable(),
      cursos: z.array(
        z.strictObject({
          courseId: z.uuid(),
          titulo: z.string(),
          slug: z.string(),
          posto: z.string().nullable(),
        }),
      ),
    }),
  ),
  recompensa: RecompensaDoDesafioSchema,
  recompensaVista: z.boolean(),
})
export type DesafioNaLista = z.infer<typeof DesafioNaListaSchema>

/** `GET /arquipelago/desafios?ilha=`. */
export const DesafiosDoJogadorSchema = z.strictObject({
  versao: z.literal(VERSAO_DESAFIOS),
  ilhas: z.array(
    z.strictObject({
      id: z.enum(ILHA_IDS),
      aberta: z.boolean(),
      quadro: z.strictObject({ feitos: z.number().int(), total: z.number().int() }),
    }),
  ),
  desafios: z.array(DesafioNaListaSchema),
})
export type DesafiosDoJogador = z.infer<typeof DesafiosDoJogadorSchema>

/** `GET /arquipelago/desafios/:id`: o que o Estúdio de desafio precisa para abrir. */
export const DesafioAbertoSchema = z.strictObject({
  id: z.uuid(),
  revisao: z.number().int(),
  titulo: z.string(),
  enunciado: z.string(),
  dicas: z.array(z.string()),
  desafioExtra: z.strictObject({ titulo: z.string(), texto: z.string() }).nullable(),
  objetivos: z.array(VistaDoObjetivoSchema),
  projetoInicial: z.unknown(),
  ultimosResultados: z.array(z.strictObject({ id: z.string(), passou: z.boolean() })),
  concluido: z.boolean(),
})
export type DesafioAberto = z.infer<typeof DesafioAbertoSchema>

/** `POST /arquipelago/desafios/:id/verificar`. */
export const VerificarDesafioSchema = z.strictObject({
  revisao: z.number().int().min(1),
  projeto: ProjetoSchema,
})
export type VerificarDesafio = z.infer<typeof VerificarDesafioSchema>

export const ResultadoDaVerificacaoSchema = z.strictObject({
  passou: z.boolean(),
  resultados: z.array(z.strictObject({ id: z.string(), passou: z.boolean() })),
  concluidoAgora: z.boolean(),
  extraAgora: z.boolean(),
})
export type ResultadoDaVerificacao = z.infer<typeof ResultadoDaVerificacaoSchema>

/** O molde que o jogo manda em `abrirFerramenta` para abrir o Estúdio de desafio. */
export const MoldeDeDesafioSchema = z.strictObject({
  tipo: z.literal('desafio'),
  desafioId: z.uuid(),
  revisao: z.number().int().min(1),
})
export type MoldeDeDesafio = z.infer<typeof MoldeDeDesafioSchema>
