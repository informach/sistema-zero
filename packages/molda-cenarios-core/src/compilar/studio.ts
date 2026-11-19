import { z } from 'zod'
import { LIMITES_DA_EXPORTACAO } from './limites'
import { CenaCompiladaSchema } from './schema'
import { type ArquivoCompilado, CaminhoCompiladoSchema } from './schema-arquivos'

/** Gallery data from the authorized host; not embedded in the compiled scene. */
export interface CenaDisponivelParaStudio {
  id: string
  nome: string
  revisao: number
  jogo: { id: string; nome: string }
  espaco: { id: string; nome: string; tipo: 'conta' | 'equipe' }
  miniatura: string | null
  atualizadoEm: string
}

export const MAX_BYTES_DA_CENA_PARA_STUDIO = 1024 * 1024
export const MIME_DA_CENA_PARA_STUDIO = 'application/vnd.sistemazero.cena3d+json'
export const PapelDoDado3DSchema = z.enum(['alturas', 'buracos'])
export type PapelDoDado3D = z.infer<typeof PapelDoDado3DSchema>

/** Asset IDs belong to the project, not to the author's entity namespace. */
const recurso = z
  .object({ caminho: CaminhoCompiladoSchema, asset: z.string().min(1).max(64) })
  .strict()

function assinaturaDoRecurso(a: ArquivoCompilado): string {
  return JSON.stringify([
    a.mime,
    a.digest,
    a.bytes,
    a.largura,
    a.altura,
    a.mime === 'application/octet-stream' ? a.papel : null,
  ])
}

/** Small, inert envelope. Binary contents are checked when resolving project assets. */
export const CenaParaStudioSchema = z
  .object({
    formato: z.literal('studio-cena3d'),
    versao: z.literal(1),
    cena: CenaCompiladaSchema,
    recursos: z.array(recurso).max(LIMITES_DA_EXPORTACAO.arquivos),
  })
  .strict()
  .superRefine((d, ctx) => {
    const falhar = (message: string) => ctx.addIssue({ code: 'custom', message }),
      inventario = new Map(d.cena.arquivos.map((a) => [a.caminho, a])),
      caminhos = new Set<string>(),
      assets = new Map<string, string>()
    for (const r of d.recursos) {
      const arquivo = inventario.get(r.caminho)
      if (!arquivo) falhar(`O recurso “${r.caminho}” não pertence ao inventário.`)
      if (caminhos.has(r.caminho)) falhar(`O caminho de recurso “${r.caminho}” está repetido.`)
      caminhos.add(r.caminho)
      if (!arquivo) continue
      const assinatura = assinaturaDoRecurso(arquivo),
        anterior = assets.get(r.asset)
      if (anterior !== undefined && anterior !== assinatura)
        falhar(`O mesmo asset “${r.asset}” não pode representar recursos incompatíveis.`)
      assets.set(r.asset, assinatura)
    }
    if (caminhos.size !== inventario.size || [...inventario.keys()].some((p) => !caminhos.has(p)))
      falhar('Os recursos precisam cobrir todos os arquivos do inventário.')
    if (new TextEncoder().encode(JSON.stringify(d)).byteLength > MAX_BYTES_DA_CENA_PARA_STUDIO)
      falhar('O JSON do cenário excede o limite de 1 MiB.')
  })

export type CenaParaStudio = z.infer<typeof CenaParaStudioSchema>

/** Bound input before parsing; no trimming, repair or partial scene recovery. */
export function lerCenaParaStudio(entrada: unknown): CenaParaStudio {
  let valor = entrada
  try {
    const texto = typeof entrada === 'string' ? entrada : JSON.stringify(entrada)
    if (
      typeof texto !== 'string' ||
      texto.length > MAX_BYTES_DA_CENA_PARA_STUDIO ||
      new TextEncoder().encode(texto).byteLength > MAX_BYTES_DA_CENA_PARA_STUDIO
    )
      throw Error('O JSON do cenário excede o limite de 1 MiB.')
    if (typeof entrada === 'string') valor = JSON.parse(entrada)
  } catch (erro) {
    throw Error(
      `Não consegui ler o JSON do cenário do Estúdio: ${erro instanceof Error ? erro.message : 'conteúdo inválido'}`,
    )
  }
  const resultado = CenaParaStudioSchema.safeParse(valor)
  if (!resultado.success)
    throw Error(
      `Cenário do Estúdio inválido: ${resultado.error.issues
        .slice(0, 8)
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`,
    )
  return resultado.data
}
