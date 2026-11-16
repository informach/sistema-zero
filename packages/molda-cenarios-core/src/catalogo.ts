import { z } from 'zod'

const vetor = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()])
export const ModeloDeCatalogoSchema = z
  .object({
    id: z.string().min(1).max(240),
    nome: z.string().min(1).max(120),
    origem: z.string().min(1).max(120),
    caminho: z.string().min(1).max(1024),
    commit: z.string().regex(/^[a-f0-9]{40}$/),
    digest: z.string().regex(/^[a-f0-9]{64}$/),
    dimensoes: vetor,
    min: vetor,
    max: vetor,
    bytes: z.number().int().nonnegative(),
    triangulos: z.number().int().nonnegative(),
    arquivo: z.string().regex(/^[\w.-]+\.glb$/),
    categoria: z.string().min(1).max(120),
    imagens: z
      .array(z.string().regex(/^[a-f0-9]{64}$/))
      .max(10000)
      .optional(),
    colisao: z
      .array(z.object({ min: vetor, max: vetor }).strict())
      .max(10000)
      .optional(),
    miniatura: z
      .object({
        digest: z.string().regex(/^[a-f0-9]{64}$/),
        bytes: z
          .number()
          .int()
          .positive()
          .max(1024 * 1024),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((m,ctx)=>{
    if(m.dimensoes.some(n=>n<0)||m.max.some((n,i)=>n<m.min[i]!))ctx.addIssue({code:'custom',message:'Volume e dimensões inválidos'})
    if(m.bytes>64*1024*1024)ctx.addIssue({code:'custom',message:'Modelo acima de 64 MiB'})
  })
export type ModeloDeCatalogo = z.infer<typeof ModeloDeCatalogoSchema>
export type CatalogoDeCenario = ReadonlyMap<string, ModeloDeCatalogo>
