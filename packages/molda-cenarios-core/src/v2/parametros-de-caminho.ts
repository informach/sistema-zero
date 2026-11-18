import { z } from 'zod'

const altura = z.number().finite().min(-100000).max(100000)
export const ChaveDeParteDeCaminhoSchema = z
  .string()
  .max(32)
  .regex(/^(tabuleiro|modelo|modulo|poste|travessa|guarda|guarda-poste|pilar)\/(0|[1-9]\d{0,4})$/)
  .refine((v) => Number(v.split('/')[1]) < 20_000, 'A parte excede o limite da estrutura.')
/** Medidas no espaço original do modelo, nunca inferidas do nome do arquivo. */
export const EncaixeDeModeloDeCaminhoSchema = z
  .object({
    eixo: z.enum(['x', 'z']),
    baseLocal: altura.optional(),
    /** Altura do piso nas cabeceiras; necessária para alinhar uma ponte de catálogo. */
    pisoLocal: altura.optional(),
    /** Limites úteis do lance, quando a peça tem beirais ou sobras além das cabeceiras. */
    inicioLocal: altura.optional(),
    fimLocal: altura.optional(),
    centroTransversalLocal: altura.optional(),
  })
  .strict()
  .superRefine((e, ctx) => {
    if (
      (e.inicioLocal === undefined) !== (e.fimLocal === undefined) ||
      (e.inicioLocal !== undefined && e.fimLocal! - e.inicioLocal <= 1e-6)
    )
      ctx.addIssue({
        code: 'custom',
        path: ['inicioLocal'],
        message: 'Meça o início e o fim do lance em ordem, com distância positiva.',
      })
  })
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
