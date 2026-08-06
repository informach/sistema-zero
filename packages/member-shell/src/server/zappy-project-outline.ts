/**
 * Esboço LEGÍVEL do projeto da criança para o prompt do tutor: árvore com os
 * RÓTULOS reais dos blocos (não os ids crus) + resumo por categoria. Regras de
 * segurança: tipo fora do catálogo NUNCA é ecoado (anti prompt-injection via
 * `context.blocks[].type`) — vira só um contador; bloco real acima do tier
 * aparece com "(nível futuro)" (o projeto é DELA), mas a recomendação de blocos
 * novos continua tier-filtrada em outro lugar. Módulo puro e testável.
 */

export interface OutlineBlockInput {
  id: string
  type: string
  parentId?: string
  topLevel: boolean
}

export interface OutlineCatalogInfo {
  label: string
  category: string
}

export function buildProjectOutline(
  blocks: readonly OutlineBlockInput[],
  catalog: ReadonlyMap<string, OutlineCatalogInfo>,
  options?: { futureTypes?: ReadonlySet<string>; maxLines?: number },
): string {
  if (blocks.length === 0) return '(projeto vazio — nenhum bloco ainda)'
  const maxLines = options?.maxLines ?? 150
  const futureTypes = options?.futureTypes ?? new Set<string>()
  const children = new Map<string, OutlineBlockInput[]>()
  const roots: OutlineBlockInput[] = []
  const ids = new Set(blocks.map((block) => block.id))
  for (const block of blocks) {
    if (block.parentId && ids.has(block.parentId)) {
      const list = children.get(block.parentId) ?? []
      list.push(block)
      children.set(block.parentId, list)
    } else {
      roots.push(block)
    }
  }

  const lines: string[] = []
  let unknown = 0
  let truncated = 0
  const categoryCounts = new Map<string, number>()
  const visited = new Set<string>()
  const walk = (block: OutlineBlockInput, depth: number) => {
    if (visited.has(block.id)) return
    visited.add(block.id)
    const info = catalog.get(block.type)
    if (!info) {
      // Tipo forjado/desconhecido não é ecoado — só contado.
      unknown += 1
    } else {
      categoryCounts.set(info.category, (categoryCounts.get(info.category) ?? 0) + 1)
      if (lines.length < maxLines) {
        const suffix = futureTypes.has(block.type) ? ' (nível futuro)' : ''
        lines.push(`${'  '.repeat(Math.min(depth, 8))}- ${info.label}${suffix}`)
      } else {
        truncated += 1
      }
    }
    for (const child of children.get(block.id) ?? []) {
      // Filho de bloco desconhecido sobe um nível (o pai não aparece).
      walk(child, info ? depth + 1 : depth)
    }
  }
  for (const root of roots) walk(root, 0)

  if (truncated > 0) lines.push(`… e mais ${truncated} blocos`)
  if (unknown > 0) lines.push(`Blocos não reconhecidos: ${unknown}`)
  const summary = [...categoryCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([category, count]) => `${category}: ${count}`)
    .join(' · ')
  if (summary) lines.push(`Resumo por categoria: ${summary}`)
  return lines.join('\n')
}
