/**
 * Detecção pura de ferramentas novas entre duas visitas.
 *
 * A identidade persistida é o id do bloco, nunca o nome da gaveta. O nome é texto de
 * apresentação e pode mudar sem que a criança tenha conquistado nada.
 */

export interface DrawerSnapshot {
  name: string
  blockIds: string[]
}

export interface StoredToolsSnapshot {
  version: 2
  revision: string
  blockIds: string[]
}

export interface ToolsGain {
  novas: string[]
  cresceram: { name: string; added: number }[]
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
    value.every(
      (drawer) =>
        drawer !== null &&
        typeof drawer === 'object' &&
        !Array.isArray(drawer) &&
        isNonEmptyString((drawer as Record<string, unknown>).name) &&
        Array.isArray((drawer as Record<string, unknown>).blockIds) &&
        ((drawer as Record<string, unknown>).blockIds as unknown[]).every(isNonEmptyString),
    )
  )
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

/**
 * Calcula apenas ids realmente novos. Uma gaveta renomeada conserva os mesmos ids e,
 * portanto, não gera festa. Se ela já continha qualquer bloco anterior, é crescimento;
 * caso contrário, é uma gaveta nova.
 */
export function diffDrawerSnapshots(
  beforeBlockIds: readonly string[],
  now: readonly DrawerSnapshot[],
): ToolsGain | null {
  const before = new Set(beforeBlockIds)
  const novas: string[] = []
  const cresceram: { name: string; added: number }[] = []

  for (const drawer of now) {
    const currentIds = [...new Set(drawer.blockIds)]
    const added = currentIds.filter((id) => !before.has(id)).length
    if (added === 0) continue
    if (currentIds.some((id) => before.has(id))) cresceram.push({ name: drawer.name, added })
    else novas.push(drawer.name)
  }

  if (novas.length === 0 && cresceram.length === 0) return null
  return { novas, cresceram }
}

/** "A", "A e B", "A, B e C" — lista no jeito em que se lê em voz alta. */
export function joinDrawerNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} e ${names.at(-1)}`
}

export function toolsGainHeadline(gain: ToolsGain): string {
  const novas = gain.novas.length > 0 ? joinDrawerNames(gain.novas) : ''
  const blocos = gain.cresceram.reduce((sum, item) => sum + item.added, 0)
  const cresceram =
    gain.cresceram.length > 0
      ? `${joinDrawerNames(gain.cresceram.map((item) => item.name))} ${
          gain.cresceram.length === 1 ? 'ganhou' : 'ganharam'
        } ${blocos} ${blocos === 1 ? 'bloco novo' : 'blocos novos'}`
      : ''
  if (novas && cresceram) return `Você ganhou ${novas}, e ${cresceram}!`
  if (novas) {
    return gain.novas.length === 1
      ? `Você ganhou a gaveta ${novas}!`
      : `Você ganhou as gavetas ${novas}!`
  }
  return `${cresceram}!`
}
