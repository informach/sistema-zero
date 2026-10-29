/** Relação estrutural básica; o executor confirma os efeitos reais separadamente. */
export interface CollectionMemoryRule {
  type: 'collectionMemory'
  dimension: '2d' | '3d'
  actor: string
  item: string
  destination: string
}
export interface ChangedGamePositionRule {
  type: 'changedGamePosition'
  dimension: '2d' | '3d'
  object: string
  initial: [number, number]
}
export function evaluatesChangedGamePosition(
  rule: ChangedGamePositionRule,
  project: unknown,
): boolean {
  if (
    !record(project) ||
    !record(project.ir) ||
    !record(project.ir.behavior) ||
    !Array.isArray(project.ir.behavior.start)
  )
    return false
  const number = (v: unknown) =>
    typeof v === 'number' ? v : record(v) && v.type === 'num' ? v.value : undefined
  // A later command wins: an abandoned edit must not count as the current position.
  const last = project.ir.behavior.start
    .filter(active)
    .filter((s) =>
      rule.dimension === '2d'
        ? (s.type === 'g2d:createImageSprite' && s.varName === rule.object) ||
          (s.type === 'g2d:setPosition' && s.spriteVar === rule.object)
        : s.type === 'g3d:setPosition' && s.objVar === rule.object,
    )
    .at(-1)
  if (!last) return false
  const coords = [number(last.x), number(rule.dimension === '2d' ? last.y : last.z)]
  return (
    coords.every((v) => typeof v === 'number' && Number.isFinite(v)) &&
    coords.some((v, i) => v !== rule.initial[i])
  )
}
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const active = (v: unknown): v is Record<string, unknown> =>
  record(v) && v.disabled !== true && v.enabled !== false
function condition(v: unknown, name: string, value: boolean, depth = 0): boolean | undefined {
  if (!record(v) || depth > 8) return undefined
  if (v.type === 'var' && v.name === name) return value
  if (v.type === 'bool') return typeof v.value === 'boolean' ? v.value : undefined
  if (v.type === 'logicalNot') {
    const child = condition(v.value, name, value, depth + 1)
    return child === undefined ? undefined : !child
  }
  if (v.type === 'binop' && ['==', '===', '!=', '!=='].includes(String(v.op))) {
    const a = condition(v.left, name, value, depth + 1),
      b = condition(v.right, name, value, depth + 1)
    return a === undefined || b === undefined
      ? undefined
      : v.op === '==' || v.op === '==='
        ? a === b
        : a !== b
  }
  return undefined
}
export function evaluatesCollectionMemory(rule: CollectionMemoryRule, project: unknown): boolean {
  if (!record(project) || !record(project.ir) || !record(project.ir.behavior)) return false
  const b = project.ir.behavior
  if (
    !Array.isArray(b.start) ||
    !Array.isArray(b.events) ||
    b.start.length > 10000 ||
    b.events.length > 10000
  )
    return false
  const names = b.start
    .filter(active)
    .filter(
      (s) =>
        s.type === 'var' && record(s.value) && s.value.type === 'bool' && s.value.value === false,
    )
    .map((s) => s.name)
    .filter((n): n is string => typeof n === 'string')
  const encounter = (s: Record<string, unknown>, target: string) =>
    rule.dimension === '2d'
      ? s.type === 'g2d:onOverlap' &&
        ((s.aVar === rule.actor && s.bVar === target) ||
          (s.bVar === rule.actor && s.aVar === target))
      : s.type === 'g3d:onTouch' &&
        ((s.objVar === rule.actor && s.otherVar === target) ||
          (s.otherVar === rule.actor && s.objVar === target))
  const collected = new Set<string>()
  for (const e of b.events.filter(active))
    if (encounter(e, rule.item) && Array.isArray(e.body))
      for (const s of e.body.filter(active))
        if (
          s.type === 'assign' &&
          typeof s.name === 'string' &&
          names.includes(s.name) &&
          record(s.value) &&
          s.value.type === 'bool' &&
          s.value.value === true
        )
          collected.add(s.name)
  const reaction = (s: unknown) =>
    active(s) &&
    (rule.dimension === '2d'
      ? s.type === 'g2d:setImage' && s.spriteVar === rule.destination
      : s.type === 'g3d:modelAnimation' && s.objVar === rule.destination && s.op === 'tocar')
  for (const e of b.events.filter(active))
    if (encounter(e, rule.destination) && Array.isArray(e.body))
      for (const s of e.body.filter(active))
        if (s.type === 'if')
          for (const name of collected) {
            const before = condition(s.cond, name, false),
              after = condition(s.cond, name, true)
            if (before === undefined || after === undefined || before === after) continue
            const success = after ? s.then : s.else,
              missing = before ? s.then : s.else
            if (
              Array.isArray(success) &&
              success.some(reaction) &&
              Array.isArray(missing) &&
              !missing.some(reaction)
            )
              return true
          }
  return false
}
