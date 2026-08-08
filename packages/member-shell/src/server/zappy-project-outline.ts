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

export interface BehaviorEntryInput {
  area: 'start' | 'events' | 'loops'
  depth: number
  type: string
  blockId?: string
  values: { name: string; value: string }[]
}

const AREA_TITLES = {
  start: 'AO INICIAR (roda uma vez)',
  events: 'QUANDO ACONTECER (só roda quando o gatilho dispara)',
  loops: 'ENQUANTO ESTIVER RODANDO (repete o tempo todo)',
} as const

const MAX_VALUE_CHARS = 40
const MAX_VALUES_PER_LINE = 4

/** Nome de campo da IR: só letras/números/underscore chegam ao prompt. */
function safeFieldName(name: string): string | null {
  return /^[A-Za-z_][A-Za-z0-9_]{0,23}$/.test(name) ? name : null
}

/**
 * O que o projeto FAZ, por área de execução, com os valores que a criança
 * escolheu — é o que permite diagnosticar "roda mas não é o que eu queria" em
 * vez de reensinar a mecânica.
 *
 * ⚠️ O digest chega do CLIENTE, então nada dele é ecoado cru: o RÓTULO vem do
 * catálogo do servidor (resolvido pelo `blockId` → tipo do bloco → catálogo);
 * entrada sem rótulo resolvível vira contador, igual ao esboço. Nome de campo
 * passa por allowlist e o valor é capado — o valor é texto da criança.
 */
export function buildBehaviorDigest(
  behavior: readonly BehaviorEntryInput[],
  blocks: readonly OutlineBlockInput[],
  catalog: ReadonlyMap<string, OutlineCatalogInfo>,
  options?: { maxLines?: number },
): string {
  const maxLines = options?.maxLines ?? 90
  const typeByBlockId = new Map(blocks.map((block) => [block.id, block.type]))
  const lines: string[] = []
  let unresolved = 0
  let truncated = 0

  for (const area of ['start', 'events', 'loops'] as const) {
    const entries = behavior.filter((entry) => entry.area === area)
    lines.push(AREA_TITLES[area])
    if (entries.length === 0) {
      lines.push('  (vazio)')
      continue
    }
    for (const entry of entries) {
      const blockType = entry.blockId ? typeByBlockId.get(entry.blockId) : undefined
      const info = blockType ? catalog.get(blockType) : undefined
      if (!info) {
        // Sem rótulo confiável, não se ecoa o tipo cru vindo do cliente.
        unresolved += 1
        continue
      }
      if (lines.length >= maxLines) {
        truncated += 1
        continue
      }
      const values = entry.values
        .flatMap((value) => {
          const name = safeFieldName(value.name)
          return name ? [`${name}=${value.value.slice(0, MAX_VALUE_CHARS)}`] : []
        })
        .slice(0, MAX_VALUES_PER_LINE)
      const detail = values.length > 0 ? ` (${values.join(', ')})` : ''
      lines.push(`${'  '.repeat(Math.min(entry.depth + 1, 8))}- ${info.label}${detail}`)
    }
  }

  if (truncated > 0) lines.push(`… e mais ${truncated} passos`)
  if (unresolved > 0) lines.push(`Passos não reconhecidos: ${unresolved}`)
  return lines.join('\n')
}

/**
 * As pilhas que estão salvas mas NUNCA rodam (fora das Áreas do projeto). O
 * editor já marca no canvas; aqui viram texto para o tutor poder dizer "essa
 * parte não está ligada em lugar nenhum" — causa clássica de "montei e não
 * aconteceu nada".
 */
export function buildDraftSummary(
  draftBlockIds: readonly string[],
  blocks: readonly OutlineBlockInput[],
  catalog: ReadonlyMap<string, OutlineCatalogInfo>,
  options?: { maxItems?: number },
): string {
  if (draftBlockIds.length === 0) return ''
  const maxItems = options?.maxItems ?? 8
  const typeById = new Map(blocks.map((block) => [block.id, block.type]))
  const labels: string[] = []
  let unresolved = 0
  for (const id of draftBlockIds) {
    const type = typeById.get(id)
    const info = type ? catalog.get(type) : undefined
    if (!info) {
      unresolved += 1
      continue
    }
    if (labels.length < maxItems) labels.push(info.label)
  }
  if (labels.length === 0 && unresolved === 0) return ''
  const extra = unresolved > 0 ? ` (e mais ${unresolved})` : ''
  return labels.length > 0
    ? `Pilhas SOLTAS, salvas mas que NUNCA rodam (estão fora das Áreas do projeto): ${labels.join(', ')}${extra}`
    : `Há ${unresolved} pilha(s) solta(s) que nunca rodam (fora das Áreas do projeto).`
}
