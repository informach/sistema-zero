import { z } from 'zod'

const altura = z.number().finite().min(-100000).max(100000)
/** Medidas no espaço original do modelo, nunca inferidas do nome do arquivo. */
export const EncaixeDeModeloDeCaminhoSchema = z
  .object({
    eixo: z.enum(['x', 'z']),
    baseLocal: altura.optional(),
    /** Altura do piso nas cabeceiras; necessária para alinhar uma ponte de catálogo. */
    pisoLocal: altura.optional(),
  })
  .strict()
export type EncaixeDeModeloDeCaminho = z.infer<typeof EncaixeDeModeloDeCaminhoSchema>
export const MoldeDeEstradaSchema = z
  .object({
    borda: z.number().finite().min(0).max(512).optional(),
    deslocamento: z.number().finite().min(-2000).max(2000).optional(),
    suavizacao: z.number().finite().min(0).max(8192).optional(),
  })
  .strict()
export const PilaresDePonteSchema = z
  .object({
    espacamento: z.number().finite().min(0.5).max(200),
    largura: z.number().finite().min(0.05).max(10),
  })
  .strict()
