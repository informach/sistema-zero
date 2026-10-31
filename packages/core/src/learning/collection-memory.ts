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
/**
 * As variáveis verdadeiro/falso que nunca mudam (N3, 31/10/2026): criadas uma vez no "Ao iniciar"
 * com um valor literal, sem nenhuma atribuição em lugar nenhum e sem outro nome igual (laço,
 * parâmetro, item de grupo). Um `Se podeAgir` com `podeAgir = falso` para sempre é tão morto quanto
 * um `Se falso`. Código cru desliga a conta.
 */
function constantBools(b: Record<string, unknown>): ReadonlyMap<string, boolean> {
  const declared = new Map<string, number>()
  const touched = new Set<string>()
  let raw = false
  let budget = 200_000
  const stack: unknown[] = [b.molds, b.start, b.events, b.loops]
  while (stack.length && --budget > 0) {
    const v = stack.pop()
    if (Array.isArray(v)) {
      for (const item of v) stack.push(item)
      continue
    }
    if (!record(v)) continue
    if (v.type === 'rawJS') raw = true
    if ((v.type === 'var' && 'value' in v) || v.type === 'declareVar')
      if (typeof v.name === 'string') declared.set(v.name, (declared.get(v.name) ?? 0) + 1)
    if (v.type === 'assign' && typeof v.name === 'string') touched.add(v.name)
    for (const key of ['itemName', 'varName', 'indexName'])
      if (typeof v[key] === 'string') touched.add(v[key] as string)
    if (Array.isArray(v.params)) for (const p of v.params) if (typeof p === 'string') touched.add(p)
    for (const value of Object.values(v)) if (typeof value === 'object') stack.push(value)
  }
  const out = new Map<string, boolean>()
  if (raw || !Array.isArray(b.start)) return out
  for (const s of b.start.filter(active))
    if (
      s.type === 'var' &&
      typeof s.name === 'string' &&
      declared.get(s.name) === 1 &&
      !touched.has(s.name) &&
      record(s.value) &&
      s.value.type === 'bool' &&
      typeof s.value.value === 'boolean'
    )
      out.set(s.name, s.value.value)
  return out
}
const NO_CONSTANTS: ReadonlyMap<string, boolean> = new Map()
function condition(
  v: unknown,
  name: string,
  value: boolean,
  constants: ReadonlyMap<string, boolean> = NO_CONSTANTS,
  depth = 0,
): boolean | undefined {
  if (!record(v) || depth > 8) return undefined
  if (v.type === 'var' && v.name === name) return value
  if (v.type === 'var' && typeof v.name === 'string' && constants.has(v.name))
    return constants.get(v.name)
  if (v.type === 'bool') return typeof v.value === 'boolean' ? v.value : undefined
  if (v.type === 'logicalNot') {
    const child = condition(v.value, name, value, constants, depth + 1)
    return child === undefined ? undefined : !child
  }
  if (v.type === 'binop' && ['==', '===', '!=', '!=='].includes(String(v.op))) {
    const a = condition(v.left, name, value, constants, depth + 1),
      b = condition(v.right, name, value, constants, depth + 1)
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
  const constants = constantBools(b)
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
  const decides = (s: Record<string, unknown>) => {
    for (const name of collected) {
      const before = condition(s.cond, name, false, constants),
        after = condition(s.cond, name, true, constants)
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
  // A decisão pode morar dentro de uma guarda que não lê a memória, como o `Se não ganhou` que
  // faz o destino responder uma vez só: os ramos dessa guarda que podem rodar também são olhados
  // (uma guarda constante, `Se falso` ou `Se podeAgir` que nunca muda, só tem um).
  const found = (body: unknown, depth: number): boolean =>
    Array.isArray(body) &&
    depth <= 4 &&
    body.filter(active).some((s) => {
      if (s.type !== 'if') return false
      if (decides(s)) return true
      if (![...collected].every((name) => condition(s.cond, name, true) === undefined)) return false
      const fixed = condition(s.cond, '', false, constants)
      if (fixed === true) return found(s.then, depth + 1)
      if (fixed === false) return found(s.else, depth + 1)
      return found(s.then, depth + 1) || found(s.else, depth + 1)
    })
  for (const e of b.events.filter(active))
    if (encounter(e, rule.destination) && found(e.body, 0)) return true
  return false
}
