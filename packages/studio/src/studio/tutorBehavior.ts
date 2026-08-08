import { normalizeSZIR } from '../ir/behavior'
import type { SZIRInput } from '../ir/schema'

/**
 * O que o projeto FAZ, com os valores que a criança escolheu — a matéria-prima
 * para diagnosticar erro de LÓGICA ("roda, mas não é o que eu queria").
 *
 * Vem da IR, não do `blocksState`: a IR já tem os valores RESOLVIDOS (o `0` da
 * velocidade aparece literal), já separa o que roda ao iniciar / num evento /
 * a cada quadro, e por construção **exclui pilha solta** (só o que está dentro
 * das Áreas do projeto vira IR). O `blocksState` sozinho não sabe nada disso: o
 * `compactBlocks` manda tipo e topologia, e joga fora todos os `fields`.
 */
export type StudioTutorBehaviorArea = 'start' | 'events' | 'loops'

export interface StudioTutorBehaviorValue {
  name: string
  value: string
}

export interface StudioTutorBehaviorEntry {
  area: StudioTutorBehaviorArea
  /** Aninhamento (dentro do corpo de um evento, de um laço…). */
  depth: number
  /** Tipo do nó da IR (ex.: `g2d:createSprite`) — o servidor traduz. */
  type: string
  /** Id do bloco Blockly de origem, quando a IR carrega. */
  blockId?: string
  values: StudioTutorBehaviorValue[]
}

const MAX_ENTRIES = 120
const MAX_DEPTH = 6
const MAX_VALUE_CHARS = 40
const MAX_VALUES_PER_NODE = 6

/** Chaves que não são "valor escolhido": identidade e corpos de execução. */
const SKIP_KEYS = new Set(['type', '__id', 'body', 'then', 'else', 'cases', 'children'])

function isStatementLike(value: unknown): value is { type: string } {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    typeof (value as { type?: unknown }).type === 'string'
  )
}

/**
 * Um valor legível, ou `null` quando é expressão composta (conta, chamada) — aí
 * o que importa para o diagnóstico é a estrutura, não um literal que não existe.
 */
function readableValue(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
    return String(raw)
  }
  if (typeof raw !== 'object') return null
  const node = raw as { type?: unknown; value?: unknown; name?: unknown }
  if (typeof node.type !== 'string') return null
  // Literais da IR.
  if (['num', 'str', 'bool', 'color'].includes(node.type) && node.value !== undefined) {
    return String(node.value)
  }
  // Referência a nome: é ouro para diagnóstico (sprite/variável escrita diferente
  // do que foi declarado é bug silencioso clássico).
  if (node.type === 'var' && typeof node.name === 'string') return `variável ${node.name}`
  return null
}

function valuesOf(node: Record<string, unknown>): StudioTutorBehaviorValue[] {
  const values: StudioTutorBehaviorValue[] = []
  for (const [name, raw] of Object.entries(node)) {
    if (values.length >= MAX_VALUES_PER_NODE) break
    if (SKIP_KEYS.has(name)) continue
    if (Array.isArray(raw)) continue
    const value = readableValue(raw)
    if (value === null || value === '') continue
    values.push({ name, value: value.slice(0, MAX_VALUE_CHARS) })
  }
  return values
}

/** Arrays de statements (corpo de evento, de laço, ramos do se). */
function childBodies(node: Record<string, unknown>): { type: string }[] {
  const out: { type: string }[] = []
  for (const raw of Object.values(node)) {
    if (!Array.isArray(raw)) continue
    for (const item of raw) if (isStatementLike(item)) out.push(item)
  }
  return out
}

export function buildTutorBehavior(
  ir: SZIRInput | null | undefined,
): StudioTutorBehaviorEntry[] | undefined {
  if (!ir) return undefined
  let normalized: ReturnType<typeof normalizeSZIR>
  try {
    normalized = normalizeSZIR(ir)
  } catch {
    // IR malformada (projeto antigo, importado) não pode derrubar a pergunta.
    return undefined
  }
  const entries: StudioTutorBehaviorEntry[] = []

  const walk = (raw: unknown, area: StudioTutorBehaviorArea, depth: number): void => {
    if (entries.length >= MAX_ENTRIES || depth > MAX_DEPTH || !isStatementLike(raw)) return
    const node = raw as unknown as Record<string, unknown>
    const blockId = typeof node.__id === 'string' ? node.__id : undefined
    entries.push({
      area,
      depth,
      type: raw.type,
      ...(blockId ? { blockId } : {}),
      values: valuesOf(node),
    })
    for (const child of childBodies(node)) walk(child, area, depth + 1)
  }

  for (const area of ['start', 'events', 'loops'] as const) {
    for (const statement of normalized.behavior[area]) walk(statement, area, 0)
  }
  return entries
}
