import {
  isProjectBlockPattern,
  type ProjectBlockPattern,
  type SectionStructureRule,
} from './section-progression'

export const PROJECT_CHECK_AREAS = {
  structure: 'Estrutura',
  appearance: 'Aparência',
  molds: 'Meus moldes',
  start: 'Ao iniciar',
  events: 'Quando acontecer',
  loops: 'Enquanto estiver rodando',
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
  if (!isProjectBlockPattern(rule)) return false
  let budget = 200_000
  let exhausted = false
  const spend = () => {
    if (--budget < 0) exhausted = true
    return !exhausted
  }
  function child(input: unknown): unknown {
    if (!record(input)) return undefined
    const shadow = input.shadow
    return (
      input.block ??
      (record(shadow) &&
      (literal(shadow) !== undefined || valueBlockTypes?.has(String(shadow.type)))
        ? shadow
        : undefined)
    )
  }
  function follows(node: Record<string, unknown>, type: string): boolean {
    let next: unknown = record(node.next) ? node.next.block : undefined
    while (record(next) && spend()) {
      if (enabled(next) && next.type === type) return true
      next = record(next.next) ? next.next.block : undefined
    }
    return false
  }
  function patternMatches(pattern: ProjectBlockPattern, node: unknown): boolean {
    if (!spend() || !record(node) || !enabled(node) || node.type !== pattern.blockType) return false
    const fields = record(node.fields) ? node.fields : {}
    const inputs = record(node.inputs) ? node.inputs : {}
    return (
      Object.entries(pattern.fields ?? {}).every(
        ([key, value]) => Object.hasOwn(fields, key) && String(fields[key]) === String(value),
      ) &&
      Object.entries(pattern.inputs ?? {}).every(([key, value]) => {
        const actual = literal(child(inputs[key]))
        return actual !== undefined && String(actual) === String(value)
      }) &&
      Object.entries(pattern.inputBlocks ?? {}).every(([key, expected]) => {
        let current = child(inputs[key])
        while (record(current) && spend()) {
          if (patternMatches(expected, current)) return true
          current = record(current.next) ? current.next.block : undefined
        }
        return false
      })
    )
  }
  let count = 0
  const stack: { node: unknown; area: string; ancestors: string[] }[] = []
  for (const root of state.blocks.blocks) {
    if (!record(root) || !enabled(root)) continue
    const area = String(root.type).replace(/^sz_frame_/, '')
    if (!(area in PROJECT_CHECK_AREAS) && root.type !== 'sz_frame_behavior') continue
    stack.push({ node: root, area: area === 'behavior' ? 'start' : area, ancestors: [] })
  }
  while (stack.length && spend()) {
    const current = stack.pop()
    if (!current || !record(current.node)) continue
    const { node, area, ancestors } = current
    // Disabled statements do not disable their following sibling.
    if (record(node.next)) stack.push({ node: node.next.block, area, ancestors })
    if (!enabled(node)) continue
    const inputs = record(node.inputs) ? node.inputs : {}
    if (
      (!rule.area || rule.area === area) &&
      (!rule.withinBlock || ancestors.includes(rule.withinBlock)) &&
      patternMatches(rule, node) &&
      (!rule.beforeBlock || follows(node, rule.beforeBlock))
    ) {
      count++
      if (rule.count === undefined) return !exhausted
      if (count > rule.count) return false
    }
    for (const input of Object.values(inputs)) {
      if (!record(input)) continue
      // The catalog identifies value blocks (including nonliteral shadows).
      // Statement shadows and replaced defaults never become active children.
      const activeChild = child(input)
      if (activeChild)
        stack.push({ node: activeChild, area, ancestors: [...ancestors, String(node.type)] })
    }
  }
  return !exhausted && rule.count !== undefined && count === rule.count
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
