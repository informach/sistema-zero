import { z } from 'zod'
import { LIMITES_DO_DESAFIO } from './desafios'

/**
 * Teto da capa (a imagem embutida, em caracteres do data URL). A lista leva a capa de cada
 * minijogo; acima disto a capa fica de fora, para a lista continuar leve no celular.
 */
export const CAPA_DO_MINIJOGO_CARACTERES = 400_000

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
  capa: z.string().max(CAPA_DO_MINIJOGO_CARACTERES).nullable(),
})
export const MinijogosSchema = z.strictObject({ minijogos: z.array(MinijogoSchema) })
export const MinijogoAbertoSchema = MinijogoSchema.extend({ projeto: ProjetoDoMinijogoSchema })
export type Minijogo = z.infer<typeof MinijogoSchema>
export type MinijogoAberto = z.infer<typeof MinijogoAbertoSchema>

/** Publicações recentes do próprio perfil, resolvidas pelo Hub. Nunca carregam fonte ou URL. */
export const JogosDoMuralSchema = z.strictObject({
  jogos: z.array(z.strictObject({ playId: z.uuid(), titulo: z.string().min(1).max(300) })).max(24),
})
export const MoldeDoJogoDoMuralSchema = z.strictObject({ playId: z.uuid() })
export type JogoDoMural = z.infer<typeof JogosDoMuralSchema>['jogos'][number]

/** Capa escolhida no Estúdio. Só imagem embutida, sem URL externa ou SVG ativo. */
export function capaDoMinijogo(projeto: unknown): string | null {
  if (!projeto || typeof projeto !== 'object') return null
  const p = projeto as { coverAssetName?: unknown; assets?: unknown }
  if (typeof p.coverAssetName !== 'string' || !Array.isArray(p.assets)) return null
  const a = p.assets.find((v) => v && v.name === p.coverAssetName && v.kind === 'image')
  return typeof a?.dataUrl === 'string' &&
    a.dataUrl.length <= CAPA_DO_MINIJOGO_CARACTERES &&
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(a.dataUrl)
    ? a.dataUrl
    : null
}

/** Uma capa já guardada só sai se ainda couber no teto (o teto pode ter baixado depois). */
export function capaQueCabe(capa: string | null): string | null {
  return capa !== null && capa.length <= CAPA_DO_MINIJOGO_CARACTERES ? capa : null
}
