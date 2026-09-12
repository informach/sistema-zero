import type { SectionStructureRule } from './section-progression'

export const PROJECT_CHECK_AREAS = {
  structure: 'Estrutura',
  appearance: 'Aparência',
  molds: 'Moldes',
  start: 'Ao iniciar',
  events: 'Eventos',
  loops: 'Repetições',
} as const
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const enabled = (n: Record<string, unknown>) =>
  n.disabled !== true &&
  n.enabled !== false &&
  !(Array.isArray(n.disabledReasons) && n.disabledReasons.length)

function literal(node: unknown): unknown {
  if (!record(node) || !enabled(node) || !record(node.fields)) return undefined
  const key = (
    {
      sz_val_number: 'NUM',
      math_number: 'NUM',
      sz_val_text: 'TEXT',
      sz_val_string: 'TEXT',
      text: 'TEXT',
      sz_val_bool: 'VALUE',
      sz_val_color: 'COLOR',
    } as Record<string, string>
  )[String(node.type)]
  if (!key) return undefined
  return node.fields[key] ?? node.fields.VALUE
}

/** Only connected, enabled blocks inside an actual project area count. */
function matchesBlock(
  rule: Extract<SectionStructureRule, { type: 'usesBlock' }>,
  state: unknown,
  valueBlockTypes?: ReadonlySet<string>,
): boolean {
  if (!record(state) || !record(state.blocks) || !Array.isArray(state.blocks.blocks)) return false
  const stack: { node: unknown; area: string; ancestors: string[] }[] = []
  for (const root of state.blocks.blocks) {
    if (!record(root) || !enabled(root)) continue
    const area = String(root.type).replace(/^sz_frame_/, '')
    if (!(area in PROJECT_CHECK_AREAS) && root.type !== 'sz_frame_behavior') continue
    stack.push({ node: root, area: area === 'behavior' ? 'start' : area, ancestors: [] })
  }
  for (let visited = 0; stack.length && visited < 200_000; visited++) {
    const current = stack.pop()
    if (!current || !record(current.node)) continue
    const { node, area, ancestors } = current
    // Disabled statements do not disable their following sibling.
    if (record(node.next)) stack.push({ node: node.next.block, area, ancestors })
    if (!enabled(node)) continue
    const inputs = record(node.inputs) ? node.inputs : {}
    const fields = record(node.fields) ? node.fields : {}
    if (
      node.type === rule.blockType &&
      (!rule.area || rule.area === area) &&
      (!rule.withinBlock || ancestors.includes(rule.withinBlock)) &&
      Object.entries(rule.fields ?? {}).every(
        ([key, value]) => Object.hasOwn(fields, key) && String(fields[key]) === String(value),
      ) &&
      Object.entries(rule.inputs ?? {}).every(([key, value]) => {
        const input = inputs[key]
        if (!record(input)) return false
        const actual = literal(input.block ?? input.shadow)
        return actual !== undefined && String(actual) === String(value)
      })
    )
      return true
    for (const input of Object.values(inputs)) {
      if (!record(input)) continue
      // The catalog identifies value blocks (including nonliteral shadows).
      // Statement shadows and replaced defaults never become active children.
      const shadow = input.shadow
      const child =
        input.block ??
        (record(shadow) &&
        (literal(shadow) !== undefined || valueBlockTypes?.has(String(shadow.type)))
          ? shadow
          : undefined)
      if (child) stack.push({ node: child, area, ancestors: [...ancestors, String(node.type)] })
    }
  }
  return false
}

export function evaluateProjectStructure(
  rule: SectionStructureRule,
  project: unknown,
  valueBlockTypes?: ReadonlySet<string>,
): boolean {
  if (!record(project)) return false
  if (rule.type === 'usesBlock') return matchesBlock(rule, project.blocksState, valueBlockTypes)
  const ir = record(project.ir) ? project.ir : {}
  const behavior = record(ir.behavior) ? ir.behavior : {}
  const stack: unknown[] =
    ir.version === 2 || 'behavior' in ir
      ? [behavior.molds, behavior.start, behavior.events, behavior.loops]
      : [ir.js]
  for (let visited = 0; stack.length && visited < 200_000; visited++) {
    const node = stack.pop()
    if (Array.isArray(node)) {
      for (const child of node) stack.push(child)
      continue
    }
    if (!record(node) || !enabled(node)) continue
    switch (rule.type) {
      case 'usesLoop':
        if (
          ['repeat', 'while', 'doWhile', 'forOf', 'forRange', 'forEach'].includes(String(node.type))
        )
          return true
        break
      case 'declaresVariable':
        if (
          (node.type === 'declareVar' || (node.type === 'var' && 'value' in node)) &&
          node.name === rule.name
        )
          return true
        break
      case 'definesFunction':
        if (node.type === 'funcDecl' && node.name === rule.name) return true
        break
      case 'callsFunction':
        if (['callFunction', 'call'].includes(String(node.type)) && node.name === rule.name)
          return true
        break
    }
    for (const value of Object.values(node))
      if (value && typeof value === 'object') stack.push(value)
  }
  return false
}

export function evaluateSectionProject(
  checks: readonly { id: string; label: string; rule: SectionStructureRule }[],
  project: unknown,
  valueBlockTypes?: ReadonlySet<string>,
) {
  return checks.map((check) => ({
    checkId: check.id,
    label: check.label,
    passed: evaluateProjectStructure(check.rule, project, valueBlockTypes),
  }))
}
