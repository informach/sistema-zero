import { z } from 'zod'
import { VetorSchema } from '../documento'

export const CorDeLuzSchema = z.string().regex(/^#[a-f0-9]{6}$/i)
export const DirecaoDeLuzSchema = VetorSchema.refine(
  (v) => Math.hypot(v.x, v.y, v.z) > 1e-6,
  'Escolha uma direção diferente de zero.',
)
const intensidade = z.number().finite().min(0).max(100)
const parametros = {
  cor: CorDeLuzSchema,
  intensidade: z.number().finite().min(0).max(10_000),
  alcance: z.number().finite().min(0.1).max(10_000),
  decaimento: z.number().finite().min(0).max(2),
  sombra: z.boolean(),
}
export const LuzLocalSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('pontual'), ...parametros }).strict(),
  z
    .object({
      tipo: z.literal('foco'),
      ...parametros,
      /** Alvo relativo à raiz do marcador, antes de seu giro. */
      alvo: DirecaoDeLuzSchema,
      angulo: z.number().finite().min(1).max(89),
      penumbra: z.number().finite().min(0).max(1),
    })
    .strict(),
])
export const CeuSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('cor'), cor: CorDeLuzSchema }).strict(),
  z
    .object({
      tipo: z.literal('panorama'),
      /** ID da tabela de texturas autorizadas; não aceita um endereço de download. */
      textura: z.string().min(1).max(240),
      giro: z
        .number()
        .finite()
        .min(-Math.PI * 2)
        .max(Math.PI * 2),
      intensidade: z.number().finite().min(0).max(10),
    })
    .strict(),
])
export const NevoaSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('nenhuma') }).strict(),
  z
    .object({
      tipo: z.literal('linear'),
      cor: CorDeLuzSchema,
      perto: z.number().finite().min(0).max(100_000),
      longe: z.number().finite().positive().max(100_000),
    })
    .strict()
    .refine((v) => v.longe > v.perto, 'O fim da névoa precisa ficar depois do início.'),
])
export const IluminacaoSchema = z
  .object({
    hora: z.number().finite().min(0).max(24),
    sol: z
      .object({
        direcao: DirecaoDeLuzSchema,
        cor: CorDeLuzSchema,
        intensidade,
        sombra: z.boolean(),
      })
      .strict()
      .optional(),
    ambiente: z
      .object({ ceu: CorDeLuzSchema, chao: CorDeLuzSchema, intensidade })
      .strict()
      .optional(),
    ceu: CeuSchema.optional(),
    nevoa: NevoaSchema.optional(),
    sombras: z
      .object({
        resolucao: z.union([z.literal(512), z.literal(1024), z.literal(2048)]),
        alcance: z.number().finite().min(8).max(512),
      })
      .strict()
      .optional(),
  })
  .strict()
export type IluminacaoDeCenario = z.infer<typeof IluminacaoSchema>
export type LuzLocal = z.infer<typeof LuzLocalSchema>
