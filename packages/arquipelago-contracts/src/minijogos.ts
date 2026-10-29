import { z } from 'zod'
import { LIMITES_DO_DESAFIO } from './desafios'

/** A mesma régua do projeto enviado à conferência. A cópia nunca contém gabarito. */
export const ProjetoDoMinijogoSchema = z.unknown().refine((p) => {
  try {
    return p !== undefined && JSON.stringify(p).length <= LIMITES_DO_DESAFIO.projetoCaracteres
  } catch {
    return false
  }
})
export const MinijogoSchema = z.strictObject({
  desafioId: z.uuid(),
  titulo: z.string().min(1).max(200),
  aprovadoEm: z.iso.datetime(),
  atualizadoEm: z.iso.datetime(),
  capa: z.string().max(LIMITES_DO_DESAFIO.projetoCaracteres).nullable(),
})
export const MinijogosSchema = z.strictObject({ minijogos: z.array(MinijogoSchema) })
export const MinijogoAbertoSchema = MinijogoSchema.extend({ projeto: ProjetoDoMinijogoSchema })
export type Minijogo = z.infer<typeof MinijogoSchema>
export type MinijogoAberto = z.infer<typeof MinijogoAbertoSchema>

/** Capa escolhida no Estúdio. Só imagem embutida, sem URL externa ou SVG ativo. */
export function capaDoMinijogo(projeto: unknown): string | null {
  if (!projeto || typeof projeto !== 'object') return null
  const p = projeto as { coverAssetName?: unknown; assets?: unknown }
  if (typeof p.coverAssetName !== 'string' || !Array.isArray(p.assets)) return null
  const a = p.assets.find((v) => v && v.name === p.coverAssetName && v.kind === 'image')
  return typeof a?.dataUrl === 'string' &&
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(a.dataUrl)
    ? a.dataUrl
    : null
}
