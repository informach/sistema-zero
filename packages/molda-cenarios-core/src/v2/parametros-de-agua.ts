import { z } from 'zod'

const cor = z.string().regex(/^#[a-f0-9]{6}$/i)
const unidade = z.number().finite().min(0).max(1)
/** Material pronto da oficina; não contém código nem referências externas de shader. */
export const AparenciaDaAguaSchema = z
  .object({
    corRasa: cor.default('#78c7cb'),
    corProfunda: cor.default('#286c8e'),
    opacidadeRasa: unidade.default(0.45),
    opacidadeProfunda: unidade.default(0.85),
    profundidadeDeCor: z.number().finite().min(0.05).max(1000).default(4),
    ondas: z
      .object({
        altura: z.number().finite().min(0).max(0.5).default(0.05),
        comprimento: z.number().finite().min(0.25).max(100).default(3),
        velocidade: z.number().finite().min(0).max(10).default(0.7),
      })
      .strict()
      .default({ altura: 0.05, comprimento: 3, velocidade: 0.7 }),
    espuma: z
      .object({
        largura: z.number().finite().min(0).max(10).default(0.35),
        intensidade: unidade.default(0.35),
        cor: cor.default('#e7fcff'),
      })
      .strict()
      .default({ largura: 0.35, intensidade: 0.35, cor: '#e7fcff' }),
  })
  .strict()
export type AparenciaDaAgua = z.infer<typeof AparenciaDaAguaSchema>

/** Papéis explícitos de materiais do GLB fixado; não deduzidos de nomes de arquivos. */
export const EncaixeDoModeloDeAguaSchema = z
  .object({
    nivelLocal: z.number().finite().min(-100000).max(100000),
    materiaisDaAgua: z.array(z.string().min(1).max(240)).min(1).max(64),
    materiaisSolidos: z.array(z.string().min(1).max(240)).max(64),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      new Set([...v.materiaisDaAgua, ...v.materiaisSolidos]).size !==
      v.materiaisDaAgua.length + v.materiaisSolidos.length
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Os materiais de água e sólidos precisam ser distintos e sem repetição.',
      })
  })
export type EncaixeDoModeloDeAgua = z.infer<typeof EncaixeDoModeloDeAguaSchema>
