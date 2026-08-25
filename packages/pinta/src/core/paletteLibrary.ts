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
 * vencendo; empate usa conteúdo canônico — puro e testável longe do transporte.
 *
 * ⚠️ Exclusão viaja por LÁPIDE (`removed`, full review 25/08): sem ela, a mera
 * RECONCILIAÇÃO do outro aparelho ressuscitava a paleta (ausência remota não
 * remove no merge — a cópia local dele sobrevivia e re-subia; medido no review,
 * excluir era um no-op de um ciclo). A régua é a mesma dos updatedAt: lápide
 * mais nova que a paleta MATA; edição mais nova que a lápide RESSUSCITA (o
 * comportamento desejado). Skew aceito: um kids antigo re-sobe o registro sem
 * o campo `removed` (o sanitize velho o poda) e exclusões daquela janela se
 * perdem — mesma classe do skew da `customPalette`.
 */
import { type PintaCustomPalette, sanitizeCustomPalette } from './project'

export interface SavedPalette extends PintaCustomPalette {
  id: string
  updatedAt: number
}

/** Lápide de exclusão: a paleta `id` foi apagada em `removedAt`. */
export interface RemovedPaletteMark {
  id: string
  removedAt: number
}

export interface PaletteLibrary {
  version: 1
  updatedAt: number
  palettes: SavedPalette[]
  /** Lápides de exclusão (ver o cabeçalho). Registro antigo lê como `[]`. */
  removed: RemovedPaletteMark[]
}

/** Teto para CRIAR novas paletas; a sincronização nunca trunca as existentes. */
export const MAX_SAVED_PALETTES = 24
/** Teto de lápides (2× o de paletas; as mais antigas caem primeiro). */
export const MAX_REMOVED_MARKS = 48

const compareId = (a: { id: string }, b: { id: string }): number =>
  a.id === b.id ? 0 : a.id < b.id ? -1 : 1

/** Desempate canônico: dois aparelhos precisam escolher o MESMO conteúdo. */
function paletteRevisionKey(palette: SavedPalette): string {
  return JSON.stringify({ name: palette.name, colors: palette.colors })
}

function newerPalette(a: SavedPalette, b: SavedPalette): SavedPalette {
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? a : b
  return paletteRevisionKey(a) >= paletteRevisionKey(b) ? a : b
}

export function emptyPaletteLibrary(): PaletteLibrary {
  return { version: 1, updatedAt: 0, palettes: [], removed: [] }
}

/**
 * Lápide × paleta do MESMO id: a mais nova vence. Devolve as paletas vivas e
 * as lápides que ainda valem (a perdedora SAI — uma lápide vencida por edição
 * posterior não pode voltar a matar num merge futuro).
 */
function applyTombstones(
  palettes: SavedPalette[],
  removed: RemovedPaletteMark[],
): { palettes: SavedPalette[]; removed: RemovedPaletteMark[] } {
  const marks = new Map(removed.map((mark) => [mark.id, mark]))
  const alive: SavedPalette[] = []
  for (const palette of palettes) {
    const mark = marks.get(palette.id)
    // Empate é exclusão: uma resolução ambígua nunca pode ressuscitar dado.
    if (mark && mark.removedAt >= palette.updatedAt) continue
    if (mark) marks.delete(mark.id)
    alive.push(palette)
  }
  const keptMarks = [...marks.values()]
    .sort((a, b) => b.removedAt - a.removedAt)
    .slice(0, MAX_REMOVED_MARKS)
  return { palettes: alive, removed: keptMarks }
}

/**
 * Registro vindo do disco/nuvem: cada paleta passa pela MESMA régua da
 * `customPalette` embutida (16 posições, `[0]=''`, hex normalizado); inválida
 * cai. A coleção inteira é validada — o teto de criação não é teto de sync.
 * `null` só quando o registro nem tem a forma; biblioteca VAZIA é válida.
 */
export function sanitizePaletteLibrary(raw: unknown): PaletteLibrary | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!Array.isArray(r.palettes)) return null
  const byId = new Map<string, SavedPalette>()
  for (const entry of r.palettes) {
    if (!entry || typeof entry !== 'object') continue
    const e = entry as Record<string, unknown>
    const core = sanitizeCustomPalette(e)
    if (!core) continue
    if (typeof e.id !== 'string' || !e.id || e.id.length > 64) continue
    const id = e.id
    const updatedAt =
      typeof e.updatedAt === 'number' && Number.isFinite(e.updatedAt) ? e.updatedAt : 0
    const candidate = { id, updatedAt, ...core }
    const existing = byId.get(id)
    byId.set(id, existing ? newerPalette(existing, candidate) : candidate)
  }
  const seenMarks = new Map<string, RemovedPaletteMark>()
  if (Array.isArray(r.removed)) {
    for (const entry of r.removed) {
      if (!entry || typeof entry !== 'object') continue
      const e = entry as Record<string, unknown>
      if (typeof e.id !== 'string' || !e.id || e.id.length > 64) continue
      if (typeof e.removedAt !== 'number' || !Number.isFinite(e.removedAt)) continue
      const existing = seenMarks.get(e.id)
      if (!existing || e.removedAt > existing.removedAt) {
        seenMarks.set(e.id, { id: e.id, removedAt: e.removedAt })
      }
    }
  }
  const applied = applyTombstones([...byId.values()].sort(compareId), [...seenMarks.values()])
  const declaredUpdatedAt =
    typeof r.updatedAt === 'number' && Number.isFinite(r.updatedAt) ? r.updatedAt : 0
  const updatedAt = Math.max(
    declaredUpdatedAt,
    0,
    ...applied.palettes.map((palette) => palette.updatedAt),
    ...applied.removed.map((mark) => mark.removedAt),
  )
  return { version: 1, updatedAt, ...applied }
}

/**
 * Funde duas bibliotecas: paletas por id com `updatedAt` maior vencendo
 * (empate = conteúdo canônico, independente da ordem dos argumentos)
 * e lápides por id com `removedAt` maior. Depois a régua lápide×paleta decide
 * quem vive. É a regra ÚNICA da reconciliação nuvem↔local.
 */
export function mergePaletteLibraries(
  local: PaletteLibrary,
  remote: PaletteLibrary,
): PaletteLibrary {
  const byId = new Map<string, SavedPalette>()
  for (const palette of local.palettes) byId.set(palette.id, palette)
  for (const palette of remote.palettes) {
    const existing = byId.get(palette.id)
    byId.set(palette.id, existing ? newerPalette(existing, palette) : palette)
  }
  const marks = new Map<string, RemovedPaletteMark>()
  for (const mark of [...local.removed, ...remote.removed]) {
    const existing = marks.get(mark.id)
    if (!existing || mark.removedAt > existing.removedAt) marks.set(mark.id, mark)
  }
  const applied = applyTombstones([...byId.values()].sort(compareId), [...marks.values()])
  return {
    version: 1,
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
    ...applied,
  }
}

/**
 * Chave de CONTEÚDO da biblioteca, insensível à ordem dos arrays E à ordem das
 * CHAVES de cada objeto. É o que o wrapper da nuvem compara para decidir se o
 * merge precisa re-subir: comparar os arrays crus já fez aparelhos re-subirem
 * conteúdo equivalente em ordens diferentes. A projeção campo a campo é
 * obrigatória: o remoto sempre vem reconstruído pelo sanitize (uma ordem de
 * chaves), o local vem de quem o escreveu (outra) — `JSON.stringify` cru veria
 * "conteúdos diferentes" no mesmo conteúdo.
 */
export function paletteLibraryContentKey(library: PaletteLibrary): string {
  const palettes = [...library.palettes]
    .sort((a, b) => (a.id < b.id ? -1 : 1))
    .map((p) => ({ id: p.id, updatedAt: p.updatedAt, name: p.name, colors: p.colors }))
  const removed = [...library.removed]
    .sort((a, b) => (a.id < b.id ? -1 : 1))
    .map((m) => ({ id: m.id, removedAt: m.removedAt }))
  return JSON.stringify({ palettes, removed })
}
