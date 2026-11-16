import { z } from 'zod'

export const LIMITES_CENARIO = {
  bytes: 8 * 1024 * 1024,
  objetos: 20_000,
  comandos: 500,
  pontos: 4096,
} as const
export const CORPO_CENARIO_MAX_BYTES = LIMITES_CENARIO.bytes + 1024 * 1024
const id = z
  .string()
  .min(1)
  .max(240)
  .regex(/^[\p{L}\p{N}_.:/-]+$/u)
const numero = z.number().finite().min(-100_000).max(100_000)
export const PontoSchema = z.object({ x: numero, z: numero }).strict()
export const VetorSchema = PontoSchema.extend({ y: numero }).strict()
export const TransformacaoSchema = z
  .object({
    posicao: VetorSchema,
    rotacao: VetorSchema,
    escala: z.number().finite().positive().max(100),
  })
  .strict()
const entidade = z.object({
  id,
  nome: z.string().min(1).max(120),
  grupo: id.nullable(),
  bloqueado: z.boolean(),
  oculto: z.boolean(),
})
export const InstanciaSchema = entidade
  .extend({
    modelo: id,
    transformacao: TransformacaoSchema,
    apoio: z.discriminatedUnion('tipo', [
      z
        .object({ tipo: z.literal('terreno'), deslocamento: numero, inclinar: z.boolean() })
        .strict(),
      z.object({ tipo: z.literal('absoluto') }).strict(),
      z.object({ tipo: z.literal('objeto'), objeto: id, deslocamento: numero }).strict(),
    ]),
    fisica: z.enum(['nenhuma', 'caixa', 'tronco', 'ponte', 'escada', 'malha', 'solo']),
    raioDoTronco: z.number().finite().positive().max(100).optional(),
    enterrada: z.number().finite().min(0).max(1).optional(),
    fundacao: z.object({ min: VetorSchema, max: VetorSchema }).strict().optional(),
    sinal: z
      .object({ texto: z.string().min(1).max(24), destino: id, via: PontoSchema })
      .strict()
      .optional(),
  })
  .strict()
export const GrupoSchema = entidade.strict()
export const CaminhoSchema = entidade
  .extend({
    pontos: z.array(PontoSchema).min(2).max(LIMITES_CENARIO.pontos),
    acabamento: id,
    largura: z.number().finite().min(0.3).max(30),
    tipo: z.enum(['trilha', 'praca']),
  })
  .strict()
export const AguaSchema = entidade
  .extend({
    modelo: id.nullable(),
    centro: PontoSchema,
    giro: numero,
    escala: z.number().finite().positive().max(100),
    nivel: numero,
    profundidade: z.number().finite().positive().max(1000),
    contorno: z.array(PontoSchema).min(3).max(LIMITES_CENARIO.pontos),
    recorte: z.array(PontoSchema).min(3).max(LIMITES_CENARIO.pontos),
  })
  .strict()
export const RelevoSchema = z
  .object({
    id,
    tipo: z.enum(['elevar', 'aplainar', 'suavizar']),
    centro: PontoSchema,
    raio: z.number().finite().min(0.5).max(500),
    valor: numero,
    intensidade: z.number().finite().min(0).max(1),
  })
  .strict()
export const MarcoSchema = z.object({ id, posicao: PontoSchema, objeto: id.nullable() }).strict()
export const DocumentoDeCenarioSchema = z
  .object({
    formato: z.literal('molda-cenario'),
    versao: z.literal(1),
    id,
    nome: z.string().min(1).max(120),
    unidade: z.literal('metro'),
    eixoVertical: z.literal('y'),
    base: z.object({ id, versao: z.string().min(1).max(80) }).strict(),
    catalogo: z.object({ id, digest: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
    grupos: z.array(GrupoSchema).max(LIMITES_CENARIO.objetos),
    instancias: z.array(InstanciaSchema).max(LIMITES_CENARIO.objetos),
    caminhos: z.array(CaminhoSchema).max(2000),
    aguas: z.array(AguaSchema).max(256),
    relevo: z.array(RelevoSchema).max(4096),
    marcos: z.array(MarcoSchema).max(4096),
    iluminacao: z.object({ noite: z.boolean() }).strict(),
  })
  .strict()
export type DocumentoDeCenario = z.infer<typeof DocumentoDeCenarioSchema>
export type InstanciaDeCenario = z.infer<typeof InstanciaSchema>
export type Transformacao = z.infer<typeof TransformacaoSchema>
export type Ponto = z.infer<typeof PontoSchema>
