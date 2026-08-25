/**
 * BIBLIOTECA de paletas personalizadas do perfil ("Minhas paletas") — um
 * registro ÚNICO fora do prefixo `pinta:asset:` (chave `pinta:palettes` no
 * IndexedDB namespaced), então ela NUNCA entra na galeria, no backup nem no
 * orçamento de 32 MiB. A paleta USADA continua EMBUTIDA no asset
 * (`customPalette`): apagar daqui nunca quebra um desenho.
 *
 * Na nuvem, o host espelha este registro como um item especial do canal de
 * creations (kind `palette-library`) — ver o wrapper do kids. O MERGE de duas
 * bibliotecas (duas abas/aparelhos) é por id de paleta com o `updatedAt` maior
 * vencendo — puro e testável aqui, longe do transporte.
 */
import { newId } from './id'
import { type PintaCustomPalette, sanitizeCustomPalette } from './project'

export interface SavedPalette extends PintaCustomPalette {
  id: string
  updatedAt: number
}

export interface PaletteLibrary {
  version: 1
  updatedAt: number
  palettes: SavedPalette[]
}

/** Teto de paletas guardadas (freio de UI — o menu lista todas). */
export const MAX_SAVED_PALETTES = 24

export function emptyPaletteLibrary(): PaletteLibrary {
  return { version: 1, updatedAt: 0, palettes: [] }
}

/**
 * Registro vindo do disco/nuvem: cada paleta passa pela MESMA régua da
 * `customPalette` embutida (16 posições, `[0]=''`, hex normalizado); inválida
 * cai. `null` só quando o registro nem tem a forma (aí o chamador começa do
 * zero) — biblioteca VAZIA é válida.
 */
export function sanitizePaletteLibrary(raw: unknown): PaletteLibrary | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!Array.isArray(r.palettes)) return null
  const seen = new Set<string>()
  const palettes: SavedPalette[] = []
  for (const entry of r.palettes.slice(0, MAX_SAVED_PALETTES)) {
    if (!entry || typeof entry !== 'object') continue
    const e = entry as Record<string, unknown>
    const core = sanitizeCustomPalette(e)
    if (!core) continue
    const id = typeof e.id === 'string' && e.id && !seen.has(e.id) ? e.id : newId()
    seen.add(id)
    const updatedAt =
      typeof e.updatedAt === 'number' && Number.isFinite(e.updatedAt) ? e.updatedAt : 0
    palettes.push({ id, updatedAt, ...core })
  }
  const updatedAt =
    typeof r.updatedAt === 'number' && Number.isFinite(r.updatedAt) ? r.updatedAt : 0
  return { version: 1, updatedAt, palettes }
}

/**
 * Funde duas bibliotecas por id de paleta: o `updatedAt` maior vence (empate =
 * `local` vence, determinístico). Ordem: a da `local`, com as só-remotas no
 * fim. É a regra única de reconciliação nuvem↔local (R7 do plano) — SEM
 * tombstone: paleta apagada num aparelho pode voltar se o outro a regravar
 * depois, trade-off aceito para um registro pequeno.
 */
export function mergePaletteLibraries(
  local: PaletteLibrary,
  remote: PaletteLibrary,
): PaletteLibrary {
  const byId = new Map<string, SavedPalette>()
  for (const palette of local.palettes) byId.set(palette.id, palette)
  for (const palette of remote.palettes) {
    const existing = byId.get(palette.id)
    if (!existing || palette.updatedAt > existing.updatedAt) byId.set(palette.id, palette)
  }
  const palettes = [...byId.values()].slice(0, MAX_SAVED_PALETTES)
  return {
    version: 1,
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
    palettes,
  }
}
