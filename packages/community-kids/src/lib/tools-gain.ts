/**
 * Detecção pura de ferramentas novas entre duas visitas.
 *
 * A identidade persistida é o id do bloco, nunca o nome da gaveta. O nome é texto de
 * apresentação e pode mudar sem que a criança tenha conquistado nada.
 */

/** Uma gaveta, identificada pelo caminho inteiro da paleta (ver `StudioDrawer` no shell). */
export interface DrawerRef {
  key: string
  family: string
  label: string
}

export interface DrawerSnapshot extends DrawerRef {
  blockIds: string[]
}

export interface StoredToolsSnapshot {
  version: 2
  revision: string
  blockIds: string[]
}

export interface ToolsGain {
  novas: DrawerRef[]
  cresceram: (DrawerRef & { added: number })[]
}

export function parseToolsSnapshot(raw: string | null | undefined): StoredToolsSnapshot | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const value = parsed as Record<string, unknown>
    if (value.version !== 2 || typeof value.revision !== 'string' || !value.revision) return null
    if (!Array.isArray(value.blockIds) || !value.blockIds.every(isNonEmptyString)) return null
    return {
      version: 2,
      revision: value.revision,
      blockIds: [...new Set(value.blockIds)].sort(),
    }
  } catch {
    return null
  }
}

export function toolsSnapshot(
  revision: string,
  drawers: readonly DrawerSnapshot[],
): StoredToolsSnapshot {
  return {
    version: 2,
    revision,
    blockIds: [...new Set(drawers.flatMap((drawer) => drawer.blockIds))].sort(),
  }
}

export function isDrawerSnapshotList(value: unknown): value is DrawerSnapshot[] {
  return (
    Array.isArray(value) &&
    value.every((drawer) => {
      if (drawer === null || typeof drawer !== 'object' || Array.isArray(drawer)) return false
      const record = drawer as Record<string, unknown>
      return (
        isNonEmptyString(record.key) &&
        isNonEmptyString(record.family) &&
        isNonEmptyString(record.label) &&
        Array.isArray(record.blockIds) &&
        (record.blockIds as unknown[]).every(isNonEmptyString)
      )
    })
  )
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

/**
 * Calcula apenas ids realmente novos. Uma gaveta renomeada conserva os mesmos ids e,
 * portanto, não gera festa. Se ela já continha qualquer bloco anterior, é crescimento;
 * caso contrário, é uma gaveta nova.
 *
 * ⚠️ É por isso que passar a chavear as gavetas pelo caminho INTEIRO da paleta (e não pela
 * folha) não precisou de migração nem gerou festa retroativa: uma gaveta que se PARTE em duas
 * leva ids que já estão no `before`, então as duas saem com `added === 0` e são ignoradas.
 */
export function diffDrawerSnapshots(
  beforeBlockIds: readonly string[],
  now: readonly DrawerSnapshot[],
): ToolsGain | null {
  const before = new Set(beforeBlockIds)
  const novas: DrawerRef[] = []
  const cresceram: (DrawerRef & { added: number })[] = []

  for (const drawer of now) {
    const currentIds = [...new Set(drawer.blockIds)]
    const added = currentIds.filter((id) => !before.has(id)).length
    if (added === 0) continue
    const ref: DrawerRef = { key: drawer.key, family: drawer.family, label: drawer.label }
    if (currentIds.some((id) => before.has(id))) cresceram.push({ ...ref, added })
    else novas.push(ref)
  }

  if (novas.length === 0 && cresceram.length === 0) return null
  return { novas, cresceram }
}

/** Todas as gavetas do ganho, novas primeiro — a fonte dos chips da comemoração. */
export function toolsGainDrawers(gain: ToolsGain): DrawerRef[] {
  return [...gain.novas, ...gain.cresceram]
}

/**
 * A família quando TODAS as gavetas ganhas vieram da mesma; `null` quando há mistura.
 *
 * Serve a linha "no 🎮 Jogo 2D" da comemoração: com mistura ela some, em vez de eleger uma
 * família e mentir sobre as outras.
 */
export function toolsGainFamily(gain: ToolsGain): string | null {
  const families = new Set(toolsGainDrawers(gain).map((drawer) => drawer.family))
  if (families.size !== 1) return null
  const [only] = [...families]
  return only ?? null
}

/**
 * O ganho em UMA expressão curta, para encaixar numa frase maior ("E tem mais: …").
 *
 * ⚠️ NUNCA enumerar. Este texto já foi uma frase que listava todas as gavetas ganhas, e era a
 * causa da comemoração estourar a tela: ele era renderizado em `text-2xl` E repetido pelos
 * chips logo abaixo. Nomear só acontece quando há UMA gaveta; a partir daí a gente conta.
 */
export function toolsGainInline(gain: ToolsGain): string {
  const [primeira] = gain.novas
  if (primeira) {
    if (gain.novas.length === 1) return primeira.label
    return `${gain.novas.length} ferramentas novas`
  }
  const [cresceu] = gain.cresceram
  if (gain.cresceram.length === 1 && cresceu) return cresceu.label
  return `${gain.cresceram.length} ferramentas maiores`
}

export function toolsGainHeadline(gain: ToolsGain): string {
  const [primeira] = gain.novas
  if (primeira) {
    if (gain.novas.length === 1) return `Você ganhou ${primeira.label}!`
    return `Você ganhou ${gain.novas.length} ferramentas novas!`
  }
  const [cresceu] = gain.cresceram
  if (gain.cresceram.length === 1 && cresceu) return `${cresceu.label} ficou maior!`
  return `${gain.cresceram.length} ferramentas ficaram maiores!`
}

/** O crescimento vira uma linha à parte quando o título já falou das gavetas novas. */
export function toolsGainSubline(gain: ToolsGain): string | null {
  if (gain.novas.length === 0 || gain.cresceram.length === 0) return null
  return gain.cresceram.length === 1
    ? 'E outra ficou maior.'
    : `E outras ${gain.cresceram.length} ficaram maiores.`
}
