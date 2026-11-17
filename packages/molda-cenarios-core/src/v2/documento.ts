import { z } from 'zod'
import { LIMITES_CENARIO, PontoSchema, RelevoSchema, VetorSchema } from '../documento'

/**
 * Documento v2: genérico, para o cenário de qualquer jogo.
 *
 * O que muda em relação ao v1:
 * - a base é uma união (`plano` ou `perfil`); nenhum jogo é pressuposto;
 * - os modelos vêm de bibliotecas e ficam fixados por digest na tabela `modelos`;
 * - a escala é por eixo;
 * - o que pertencia ao Arquipélago (ator, placa, colisões próprias) virou propriedade
 *   personalizada, interpretada pelo perfil do jogo.
 *
 * Campos novos entram sempre como opcionais, para o formato crescer sem trocar de versão.
 */
export const LIMITES_CENARIO_V2 = {
  ...LIMITES_CENARIO,
  modelos: 5000,
  propriedades: 64,
} as const

const id = z
  .string()
  .min(1)
  .max(240)
  .regex(/^[\p{L}\p{N}_.:/-]+$/u)
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
  bloqueado: z.boolean(),
  oculto: z.boolean(),
  propriedades: PropriedadesSchema.optional(),
})

/** Um modelo de biblioteca usado pelo cenário, fixado pelo conteúdo do arquivo. */
export const ModeloDoCenarioSchema = z
  .object({
    id,
    biblioteca: id,
    modelo: id,
    digest,
    nome: z.string().min(1).max(120).optional(),
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
  z.object({ tipo: z.literal('objeto'), objeto: id, deslocamento: numero }).strict(),
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
    /** Chave da tabela `modelos` do documento. */
    modelo: id,
    transformacao: TransformacaoSchema,
    apoio: ApoioSchema,
    colisao: z.enum(COLISOES),
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

export const BaseSchema = z.discriminatedUnion('tipo', [
  z
    .object({
      tipo: z.literal('plano'),
      largura: z.number().finite().min(8).max(8192),
      comprimento: z.number().finite().min(8).max(8192),
    })
    .strict(),
  /** Relevo calculado por um jogo. Só para abrir cenários v1 até a conversão em terreno. */
  z
    .object({
      tipo: z.literal('perfil'),
      perfil: id,
      versao: z.string().min(1).max(80),
      carimbos: z.array(RelevoSchema).max(4096),
    })
    .strict(),
])

export const IluminacaoSchema = z.object({ hora: z.number().finite().min(0).max(24) }).strict()

export const DocumentoDeCenarioSchema = z
  .object({
    formato: z.literal('molda-cenario'),
    versao: z.literal(2),
    id,
    nome: z.string().min(1).max(120),
    unidade: z.literal('metro'),
    eixoVertical: z.literal('y'),
    base: BaseSchema,
    modelos: z.array(ModeloDoCenarioSchema).max(LIMITES_CENARIO_V2.modelos),
    grupos: z.array(GrupoSchema).max(LIMITES_CENARIO_V2.objetos),
    instancias: z.array(InstanciaSchema).max(LIMITES_CENARIO_V2.objetos),
    caminhos: z.array(CaminhoSchema).max(2000),
    aguas: z.array(AguaSchema).max(256),
    marcadores: z.array(MarcadorSchema).max(4096),
    iluminacao: IluminacaoSchema,
  })
  .strict()

export type DocumentoDeCenario = z.infer<typeof DocumentoDeCenarioSchema>
export type InstanciaDeCenario = z.infer<typeof InstanciaSchema>
export type GrupoDeCenario = z.infer<typeof GrupoSchema>
export type CaminhoDeCenario = z.infer<typeof CaminhoSchema>
export type AguaDeCenario = z.infer<typeof AguaSchema>
export type MarcadorDeCenario = z.infer<typeof MarcadorSchema>
export type ModeloDoCenario = z.infer<typeof ModeloDoCenarioSchema>
export type BaseDeCenario = z.infer<typeof BaseSchema>
export type Transformacao = z.infer<typeof TransformacaoSchema>
export type Propriedades = z.infer<typeof PropriedadesSchema>
export type Colisao = (typeof COLISOES)[number]

/** Cenário vazio sobre um chão plano: o ponto de partida de qualquer jogo. */
export function criarDocumentoVazio(id: string, nome: string): DocumentoDeCenario {
  return {
    formato: 'molda-cenario',
    versao: 2,
    id,
    nome,
    unidade: 'metro',
    eixoVertical: 'y',
    base: { tipo: 'plano', largura: 256, comprimento: 256 },
    modelos: [],
    grupos: [],
    instancias: [],
    caminhos: [],
    aguas: [],
    marcadores: [],
    iluminacao: { hora: 12 },
  }
}
