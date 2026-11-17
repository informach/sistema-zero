import { z } from 'zod'
import { LIMITES_CENARIO, PontoSchema, VetorSchema } from '../documento'

/** Esquemas elementares compartilhados por documentos e conteúdos de conjuntos. Sem IO ou referência ao documento v2. */
export const LIMITES_CENARIO_V2 = {
  ...LIMITES_CENARIO,
  modelos: 5000,
  propriedades: 64,
} as const

export const IdentificadorDeCenarioSchema = z
  .string()
  .min(1)
  .max(240)
  .regex(/^[\p{L}\p{N}_.:/-]+$/u)
const id = IdentificadorDeCenarioSchema
const numero = z.number().finite().min(-100_000).max(100_000)
const fator = z.number().finite().positive().max(100)
const digest = z.string().regex(/^[a-f0-9]{64}$/)

export const EscalaSchema = z.object({ x: fator, y: fator, z: fator }).strict()
export const TransformacaoSchema = z
  .object({ posicao: VetorSchema, rotacao: VetorSchema, escala: EscalaSchema })
  .strict()

/** Como os objetos do Tiled: pares simples que cada jogo lê do seu jeito. */
export const PropriedadesSchema = z
  .record(
    z
      .string()
      .min(1)
      .max(80)
      .regex(/^[\p{L}\p{N}_.:-]+$/u),
    z.union([z.string().max(2000), z.number().finite(), z.boolean()]),
  )
  .refine((p) => Object.keys(p).length <= LIMITES_CENARIO_V2.propriedades, {
    message: `No máximo ${LIMITES_CENARIO_V2.propriedades} propriedades`,
  })

const entidade = z.object({
  id,
  nome: z.string().min(1).max(120),
  grupo: id.nullable(),
  camada: id.nullable().optional(),
  bloqueado: z.boolean(),
  oculto: z.boolean(),
  propriedades: PropriedadesSchema.optional(),
})

const origemDeRecurso = { id, biblioteca: id, digest, nome: z.string().min(1).max(120).optional() }

export const CamadaSchema = z
  .object({ id, nome: z.string().min(1).max(120), bloqueado: z.boolean(), oculto: z.boolean() })
  .strict()

/** Uma imagem de biblioteca fixada pelo conteúdo; endereços de download não são autorais. */
export const TexturaDoCenarioSchema = z.object({ ...origemDeRecurso, textura: id }).strict()

/** Um modelo de biblioteca usado pelo cenário, fixado pelo conteúdo do arquivo. */
export const ModeloDoCenarioSchema = z
  .object({
    ...origemDeRecurso,
    modelo: id,
    /** Medida local do arquivo fixado por hash; usada pelas ferramentas de composição. */
    volume: z
      .object({ min: VetorSchema, max: VetorSchema })
      .strict()
      .refine((v) => (['x', 'y', 'z'] as const).every((e) => v.min[e] <= v.max[e]), {
        message: 'O volume do modelo tem limites invertidos',
      })
      .optional(),
  })
  .strict()

export const ApoioSchema = z.discriminatedUnion('tipo', [
  z
    .object({
      tipo: z.literal('terreno'),
      deslocamento: numero,
      inclinar: z.boolean(),
      referencia: z.enum(['pivo', 'volume']).optional(),
    })
    .strict(),
  z.object({ tipo: z.literal('absoluto') }).strict(),
  z
    .object({
      tipo: z.literal('objeto'),
      objeto: id,
      deslocamento: numero,
      /** Ponto local da superfície original. Ausente nos apoios legados com posição já resolvida. */
      contato: VetorSchema.optional(),
    })
    .strict(),
  z
    .object({
      tipo: z.literal('agua'),
      agua: id,
      local: PontoSchema,
      deslocamento: numero,
      giro: numero,
      escala: fator,
    })
    .strict(),
])

export const COLISOES = ['nenhuma', 'caixa', 'capsula', 'malha'] as const
export const InstanciaSchema = entidade
  .extend({
    /** Chave de uma definição de biblioteca (`modelos`) ou de rascunho autoral (`formas`). */
    modelo: id,
    transformacao: TransformacaoSchema,
    apoio: ApoioSchema,
    colisao: z.enum(COLISOES),
    /** Espelha a forma nos eixos locais, em torno do centro do volume, sem mover o pivô. */
    espelho: z.object({ x: z.boolean(), y: z.boolean(), z: z.boolean() }).strict().optional(),
    /** Tonalidade aplicada sobre as cores e texturas originais, sem modificar o acervo. */
    aparencia: z
      .object({
        cor: z
          .string()
          .regex(/^#[a-f0-9]{6}$/i)
          .optional(),
        textura: z
          .object({ id, repeticaoMetros: z.number().finite().min(0.1).max(100) })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict()

export const GrupoSchema = entidade.strict()

export const CaminhoSchema = entidade
  .extend({
    pontos: z.array(PontoSchema).min(2).max(LIMITES_CENARIO_V2.pontos),
    /** Chave da tabela `modelos`, ou nulo para o acabamento padrão. */
    acabamento: id.nullable(),
    largura: z.number().finite().min(0.3).max(30),
    tipo: z.enum(['trilha', 'praca']),
  })
  .strict()

const poligono = z.array(PontoSchema).min(3).max(LIMITES_CENARIO_V2.pontos)
export const AguaSchema = z.discriminatedUnion('tipo', [
  entidade
    .extend({
      tipo: z.literal('lago'),
      modelo: id.nullable(),
      centro: PontoSchema,
      giro: numero,
      escala: fator,
      nivel: numero,
      profundidade: z.number().finite().positive().max(1000),
      contorno: poligono,
      recorte: poligono,
    })
    .strict(),
  entidade.extend({ tipo: z.literal('mar'), nivel: numero }).strict(),
])

export const MarcadorSchema = entidade
  .extend({
    posicao: VetorSchema,
    giro: numero,
    /** Verdadeiro: a altura acompanha o chão; `posicao.y` passa a ser o deslocamento. */
    noChao: z.boolean(),
    objeto: id.nullable(),
  })
  .strict()
