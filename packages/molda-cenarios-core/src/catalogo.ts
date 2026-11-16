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
  })
  .strict()
export type ModeloDeCatalogo = z.infer<typeof ModeloDeCatalogoSchema>
export type CatalogoDeCenario = ReadonlyMap<string, ModeloDeCatalogo>
