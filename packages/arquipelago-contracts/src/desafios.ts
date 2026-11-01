import { z } from 'zod'
import { ILHA_IDS, ilha, type PostoDaJornada } from './ilhas'
import { ProblemaDoMapaSchema } from './membros'
import { RECEITAS } from './receitas-moradores'
import { RevisaoHumanaSchema } from './revisao-humana'

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
  /**
   * Tetos por prêmio. O Members dá no máximo 100 moedas do jogo por semana a cada pessoa.
   * Principal e extra são créditos separados; se não couberem na mesma semana, o restante
   * aguarda a seguinte com a mesma chave (`ARQUIPELAGO_TETO_SEMANAL_DE_MOEDAS`, tudo ou nada).
   */
  moedas: 100,
  moedasExtra: 50,
  blocosManuais: 200,
  /** O projeto (inicial ou gabarito) inteiro, serializado. Igual ao teto do bloco Estúdio. */
  projetoCaracteres: 1_500_000,
} as const

/** Moedas padrão de um desafio novo (o Admin pode mudar dentro dos tetos). */
export const MOEDAS_PADRAO = { principal: 20, extra: 10 } as const

/**
 * Moedas padrão por tipo: o desafio do dia vale menos que um quadro do Quadro das Cores (proposta:
 * "médio"; plano de 28/10/2026), e o pedido de morador, um pedido curto, menos ainda (proposta:
 * fonte "baixa"; lacunas de 01/11/2026).
 */
export const MOEDAS_PADRAO_POR_TIPO: Readonly<
  Record<TipoDeDesafio, { principal: number; extra: number }>
> = {
  'quadro-das-cores': MOEDAS_PADRAO,
  'desafio-do-dia': { principal: 10, extra: 5 },
  'pedido-de-morador': { principal: 5, extra: 2 },
}

/** O desafio do dia nunca pinta a ilha: só o Quadro das Cores devolve a cor. */
export function corPermitida(tipo: TipoDeDesafio, cor: boolean): boolean {
  return !(tipo === 'desafio-do-dia' && cor)
}

const REGRA_DA_COR = {
  message: 'O desafio do dia nunca pinta a ilha: a cor fica desligada.',
  path: ['conteudo', 'recompensa', 'cor'],
}
const corDoTipo = (d: {
  metadados?: { tipo: TipoDeDesafio }
  tipo?: TipoDeDesafio
  conteudo: { recompensa: { cor: boolean } }
}) => corPermitida((d.metadados?.tipo ?? d.tipo) as TipoDeDesafio, d.conteudo.recompensa.cor)

const Texto = (max: number) => z.string().trim().min(1).max(max)
const Bloco = z.string().min(1).max(160)

const CAMPOS_DO_OBJETIVO = {
  id: z.string().min(1).max(80),
  label: Texto(200),
  hint: z.string().trim().max(LIMITES_DO_DESAFIO.dica).optional(),
  optional: z.literal(true).optional(),
  rule: z.record(z.string(), z.unknown()),
}

/** Objetivo de um projeto JavaScript (blocos, Ponte ou Pro). Sem linguagem = JavaScript. */
export const ObjetivoJavaScriptDoDesafioSchema = z.strictObject({
  ...CAMPOS_DO_OBJETIVO,
  programmingLanguage: z.literal('javascript').optional(),
})

/**
 * Objetivo de um projeto Python (C02, 30/10/2026), o `SectionPythonProjectCheck` das aulas: o
 * perfil do ambiente Python do projeto inicial e, só nos objetivos que rodam o programa, até
 * quatro linhas de entrada (`stdin`). A regra continua opaca: o Members a confere com
 * `validateSectionPythonProjectChecks` e a executa no runtime Python das aulas.
 */
export const ObjetivoPythonDoDesafioSchema = z.strictObject({
  ...CAMPOS_DO_OBJETIVO,
  programmingLanguage: z.literal('python'),
  profileId: z
    .string()
    .max(96)
    .regex(/^[a-z0-9][a-z0-9._-]*$/),
  stdin: z
    .array(
      z
        .string()
        .max(4096)
        .regex(/^[^\r\n]*$/),
    )
    .max(4)
    .optional(),
})

/**
 * Um objetivo, no mesmo formato dos objetivos da parte das aulas (`SectionProjectCheck` do core).
 * A regra é opaca aqui: quem confere o sentido dela é o Members, com o mesmo verificador das aulas.
 * `optional` marca o desafio extra. Python desde C02; o Members recusa misturar linguagens e
 * confere que todos usam a linguagem e o perfil do projeto inicial.
 */
export const ObjetivoDoDesafioSchema = z.union([
  ObjetivoJavaScriptDoDesafioSchema,
  ObjetivoPythonDoDesafioSchema,
])
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
  /**
   * O prêmio-objeto do desafio extra (§6.28, A25): uma receita do caderno, como na proposta
   * ("★ extra: receita de brigadeiro"). Opcional: os conteúdos de antes continuam valendo.
   */
  receitaDoExtra: z
    .string()
    .refine((id) => RECEITAS.some((r) => r.id === id), 'Receita desconhecida')
    .optional(),
  /**
   * O extra é a versão 2 (Lenda, lacunas de 01/11/2026): vale num envio depois da aprovação, com
   * o jogo mudado em relação ao aprovado guardado. Pede `atracao`, que guarda o aprovado.
   */
  extraNaVersao2: z.literal(true).optional(),
  /** Aprovado, o projeto entra na fila de revisão humana da Sala do Professor (Lenda). */
  revisaoHumana: z.literal(true).optional(),
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

/** Os campos dos metadados (sem a regra do quadro), para o manifesto repetir sem aninhar. */
const CAMPOS_DOS_METADADOS = {
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
}
const quadroSoNoQuadroDasCores = (m: { tipo: TipoDeDesafio; quadro: number | null }) =>
  (m.tipo === 'quadro-das-cores') === (m.quadro !== null)
const REGRA_DO_QUADRO = {
  message: 'Só o Quadro das Cores tem número de quadro, e ele sempre tem',
  path: ['quadro'],
}

/** Os dados do cadastro que não são conteúdo (onde o desafio mora e em que ordem). */
export const MetadadosDoDesafioSchema = z
  .strictObject(CAMPOS_DOS_METADADOS)
  .refine(quadroSoNoQuadroDasCores, REGRA_DO_QUADRO)
export type MetadadosDoDesafio = z.infer<typeof MetadadosDoDesafioSchema>

/** `POST /arquipelago/admin/desafios`: cria o rascunho. */
export const CriarDesafioSchema = z
  .strictObject({
    metadados: MetadadosDoDesafioSchema,
    conteudo: ConteudoDoDesafioV1Schema,
  })
  .refine(corDoTipo, REGRA_DA_COR)
export type CriarDesafio = z.infer<typeof CriarDesafioSchema>

/** `PUT /arquipelago/admin/desafios/:id`: grava por revisão (a revisão velha recebe 409). */
export const GravarDesafioSchema = z
  .strictObject({
    revisaoBase: z.number().int().min(1),
    metadados: MetadadosDoDesafioSchema,
    conteudo: ConteudoDoDesafioV1Schema,
  })
  .refine(corDoTipo, REGRA_DA_COR)
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

export const DesafiosDaEquipeSchema = z.strictObject({ desafios: z.array(ResumoDoDesafioSchema) })
export const ConflitoDeRevisaoSchema = z.object({ atual: DesafioDaEquipeSchema })
export const ProblemasDePublicacaoSchema = z.object({ problemas: z.array(ProblemaDoDesafioSchema) })
export const CoberturaDosCartoesSchema = z.object({
  mapa: z.object({
    situacao: z.enum(['desligada', 'pendente', 'ok', 'com-problemas', 'indisponivel']),
    problemas: z.array(ProblemaDoMapaSchema).optional(),
  }),
  cartas: z.array(
    z.object({
      id: z.string(),
      nome: z.string(),
      bloco: z.string().nullable(),
      cursos: CoberturaDoBlocoSchema.shape.cursos,
      avisos: CoberturaDoBlocoSchema.shape.avisos,
    }),
  ),
})
export type CoberturaDosCartoes = z.infer<typeof CoberturaDosCartoesSchema>

// ── Manifesto de desafios (28/10/2026) ───────────────────────────────────────────────────────

/**
 * O arquivo que a equipe sobe com os desafios já configurados, como o manifesto das aulas. Um
 * formato só serve para um desafio, para o pacote de uma ilha e para o do jogo inteiro: o `slug` é
 * a identidade, então subir de novo atualiza o que existe e acrescenta o que é novo. Um desafio que
 * não está no arquivo nunca é mexido. Plano: `docs/plans/2026-10-28-arquipelago-desafio-do-dia-e-manifestos.md`.
 */
export const FORMATO_DO_MANIFESTO = 'arquipelago-desafios'
export const VERSAO_DO_MANIFESTO = 1
export const ESCOPOS_DO_MANIFESTO = ['desafio', 'ilha', 'jogo'] as const
export type EscopoDoManifesto = (typeof ESCOPOS_DO_MANIFESTO)[number]
export const LIMITES_DO_MANIFESTO = { desafios: 200 } as const

/** Um desafio do arquivo: os metadados soltos, se publica ao aplicar e o conteúdo do Admin. */
export const DesafioDoManifestoSchema = z
  .strictObject({
    ...CAMPOS_DOS_METADADOS,
    /** Publica ao aplicar, se a análise não tiver problema (com problema, fica em rascunho). */
    publicar: z.boolean().optional(),
    conteudo: ConteudoDoDesafioV1Schema,
  })
  .refine(quadroSoNoQuadroDasCores, REGRA_DO_QUADRO)
  .refine(corDoTipo, REGRA_DA_COR)
export type DesafioDoManifesto = z.infer<typeof DesafioDoManifestoSchema>

export const ManifestoDeDesafiosSchema = z
  .strictObject({
    formato: z.literal(FORMATO_DO_MANIFESTO),
    versao: z.literal(VERSAO_DO_MANIFESTO),
    /** Só confere: `desafio` (um só), `ilha` (todos da mesma ilha e público) ou `jogo`. */
    escopo: z.enum(ESCOPOS_DO_MANIFESTO).optional(),
    desafios: z.array(DesafioDoManifestoSchema).min(1).max(LIMITES_DO_MANIFESTO.desafios),
  })
  .superRefine((m, ctx) => {
    if (m.escopo === 'desafio' && m.desafios.length !== 1)
      ctx.addIssue({
        code: 'custom',
        message: 'Com escopo "desafio", o arquivo tem um desafio só.',
        path: ['desafios'],
      })
    if (m.escopo === 'ilha') {
      const [primeiro] = m.desafios
      if (m.desafios.some((d) => d.ilha !== primeiro?.ilha || d.publico !== primeiro?.publico))
        ctx.addIssue({
          code: 'custom',
          message: 'Com escopo "ilha", todos os desafios são da mesma ilha e do mesmo público.',
          path: ['desafios'],
        })
    }
    const slugs = new Set<string>()
    const quadros = new Set<string>()
    m.desafios.forEach((d, i) => {
      if (slugs.has(d.slug))
        ctx.addIssue({
          code: 'custom',
          message: `O slug "${d.slug}" aparece duas vezes no arquivo.`,
          path: ['desafios', i, 'slug'],
        })
      slugs.add(d.slug)
      if (d.quadro === null) return
      const chave = `${d.publico}:${d.ilha}:${d.quadro}`
      if (quadros.has(chave))
        ctx.addIssue({
          code: 'custom',
          message: `O quadro ${d.quadro} da ilha ${d.ilha} (${d.publico}) aparece duas vezes no arquivo.`,
          path: ['desafios', i, 'quadro'],
        })
      quadros.add(chave)
    })
  })
export type ManifestoDeDesafios = z.infer<typeof ManifestoDeDesafiosSchema>

/**
 * O que acontece com cada desafio do arquivo: `criar` (slug novo), `atualizar` (metadados ou
 * conteúdo mudaram), `igual` (nada mudou) ou `conflito` (não dá para gravar: o motivo vem junto).
 */
export const ACOES_DO_MANIFESTO = ['criar', 'atualizar', 'igual', 'conflito'] as const
export type AcaoDoManifesto = (typeof ACOES_DO_MANIFESTO)[number]

export const ItemDaConferenciaSchema = z.strictObject({
  slug: z.string(),
  titulo: z.string(),
  publico: z.enum(PUBLICOS_DO_DESAFIO),
  ilha: z.enum(ILHA_IDS),
  tipo: z.enum(TIPOS_DE_DESAFIO),
  quadro: z.number().int().nullable(),
  acao: z.enum(ACOES_DO_MANIFESTO),
  /** O desafio que já existe com este slug (null quando é novo). */
  id: z.uuid().nullable(),
  conflito: ProblemaDoDesafioSchema.nullable(),
  /** A análise do Members, como a do botão Analisar (null em `igual` sem publicar e em conflito). */
  analise: AnaliseDoDesafioSchema.nullable(),
  /** Vai sair publicado: pediu `publicar`, a análise não tem problema e há o que publicar. */
  publica: z.boolean(),
})
export type ItemDaConferencia = z.infer<typeof ItemDaConferenciaSchema>

/** `POST /arquipelago/admin/manifestos/conferir`: a prévia, sem gravar nada. */
export const ConferenciaDoManifestoSchema = z.strictObject({
  /** A impressão digital do estado conferido; o aplicar exige a mesma. */
  impressao: z.string().min(1).max(128),
  itens: z.array(ItemDaConferenciaSchema),
  contagem: z.strictObject({
    criar: z.number().int(),
    atualizar: z.number().int(),
    igual: z.number().int(),
    conflito: z.number().int(),
    comProblema: z.number().int(),
    publica: z.number().int(),
  }),
})
export type ConferenciaDoManifesto = z.infer<typeof ConferenciaDoManifestoSchema>

export const ConferirManifestoSchema = z.strictObject({ manifesto: ManifestoDeDesafiosSchema })
export const AplicarManifestoSchema = z.strictObject({
  manifesto: ManifestoDeDesafiosSchema,
  impressao: z.string().min(1).max(128),
})
export type AplicarManifesto = z.infer<typeof AplicarManifestoSchema>

/** `POST /arquipelago/admin/manifestos/aplicar`: o que foi gravado, desafio por desafio. */
export const AplicacaoDoManifestoSchema = z.strictObject({
  itens: z.array(
    z.strictObject({
      slug: z.string(),
      id: z.uuid().nullable(),
      acao: z.enum(ACOES_DO_MANIFESTO),
      publicado: z.boolean(),
      problemas: z.array(ProblemaDoDesafioSchema),
    }),
  ),
})
export type AplicacaoDoManifesto = z.infer<typeof AplicacaoDoManifestoSchema>

// ── O que a pessoa recebe (sem gabarito, sem regras) ─────────────────────────────────────────

/**
 * A linguagem do desafio, pelo projeto inicial (§6.28, A2 e A3): blocos, Python, JavaScript na
 * Ponte (texto) ou Pro. Fora dos blocos, o desafio pede o curso-base do posto da ilha.
 */
export type LinguagemDoDesafio = 'blocos' | 'python' | 'texto' | 'pro'
export function linguagemDoProjeto(projeto: unknown): LinguagemDoDesafio {
  const p = (projeto !== null && typeof projeto === 'object' ? projeto : {}) as {
    mode?: unknown
    kind?: unknown
    programmingLanguage?: unknown
  }
  if (p.programmingLanguage === 'python') return 'python'
  if (p.kind === 'pro') return 'pro'
  if (p.mode === 'bridge') return 'texto'
  return 'blocos'
}

/**
 * O posto do curso-base que o desafio pede (A3 e A29). Nas ilhas, é o posto da ilha. No Farol (a
 * Lenda), o projeto autoral vem em cada linguagem conquistada, e cada variante pede o curso-base
 * do posto onde essa linguagem começa: Python no Explorador, a Ponte no Arquiteto e o Pro no
 * Gênio. Em blocos, nenhum (os blocos seguem só pelos blocos).
 */
export const POSTO_DA_LINGUAGEM = {
  python: 'explorer',
  texto: 'architect',
  pro: 'champion',
} as const satisfies Record<Exclude<LinguagemDoDesafio, 'blocos'>, PostoDaJornada>
export function postoDoCursoBase(
  linguagem: LinguagemDoDesafio,
  ilhaId: (typeof ILHA_IDS)[number],
): PostoDaJornada | null {
  if (linguagem === 'blocos') return null
  return ilhaId === 'farol' ? POSTO_DA_LINGUAGEM[linguagem] : ilha(ilhaId).posto
}

/**
 * `falta-curso` (A3): o desafio na linguagem do posto espera o curso-base do posto concluído (a
 * mesma regra "o desafio só usa o que a pessoa já conquistou" dos blocos).
 */
export const SITUACOES_PARA_A_PESSOA = [
  'ilha-fechada',
  'falta-curso',
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
  /**
   * "Aprenda isso em" (A24), também no desafio disponível: o curso que ensina o que o desafio
   * pede (o mais adiantado entre os blocos dele, ou o curso-base do posto na linguagem do posto).
   * Vazio quando nenhum curso publicado ensina. Opcional para o serviço anterior.
   */
  aprenda: z
    .array(
      z.strictObject({
        courseId: z.uuid(),
        titulo: z.string(),
        slug: z.string(),
        posto: z.string().nullable(),
      }),
    )
    .max(3)
    .optional(),
  recompensa: RecompensaDoDesafioSchema,
  recompensaVista: z.boolean(),
  /**
   * A revisão humana do projeto autoral da Lenda (lacunas, 01/11/2026): o estado e o retorno da
   * equipe. Só nos desafios com `recompensa.revisaoHumana`; `null` antes do primeiro envio aprovado.
   */
  revisaoHumana: RevisaoHumanaSchema.nullable().optional(),
  /** O desafio extra já foi feito (A25: o prêmio-objeto vale). Opcional para o serviço anterior. */
  extraFeito: z.boolean().optional(),
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
  /**
   * O desafio do dia da pessoa (28/10/2026): fixo no dia de São Paulo, escolhido na primeira leitura
   * do dia. `feito` = ela já concluiu esse desafio hoje ("Amanhã tem outro"). `null` quando ainda
   * não há desafio do dia ao alcance dela. Opcional: o jogo antigo continua lendo.
   */
  doDia: z
    .strictObject({
      id: z.uuid(),
      dia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      feito: z.boolean(),
    })
    .nullable()
    .optional(),
})
export type DesafiosDoJogador = z.infer<typeof DesafiosDoJogadorSchema>

/** `GET /arquipelago/desafios/:id`: o que o Estúdio de desafio precisa para abrir. */
export const DesafioAbertoSchema = z.strictObject({
  id: z.uuid(),
  jogadorId: z.uuid(),
  /** Teto da paleta por conquista; null só para equipe. Não concede Estúdio Completo. */
  blocosPermitidos: z.array(Bloco).nullable(),
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
  /** Quantas dicas a pessoa abriu até esta conferência (A26, a medição). Opcional. */
  dicas: z.number().int().min(0).max(LIMITES_DO_DESAFIO.dicas).optional(),
})
export type VerificarDesafio = z.infer<typeof VerificarDesafioSchema>

/**
 * O ambiente Python do Estúdio de desafio (C02b): a revisão aberta e o pedido do Estúdio
 * (`StudioArquipelagoRuntimeRequest`, conferido no Members contra o inicial). A resposta é a
 * decisão do Members, repassada ao Estúdio, que a confere de novo.
 */
export const PedirAmbienteDoDesafioSchema = z.strictObject({
  revisao: z.number().int().min(1),
  pedido: z.record(z.string(), z.unknown()),
})
export type PedirAmbienteDoDesafio = z.infer<typeof PedirAmbienteDoDesafioSchema>

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
