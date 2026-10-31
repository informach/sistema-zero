/**
 * Encontro, lembrança, decisão e recomeço de um jogo 2D AUTORAL, conferidos sem nomes prontos
 * (C03b, 30/10/2026). O projeto autoral do Farol deixa a criança escolher desenhos, nomes e
 * história; o executor só tira uma foto do jogo no fim e não sabe com quem o guia vai se
 * encontrar. Contar blocos aprovava um projeto com tudo dentro de um `Se falso`: o código existia
 * e nunca rodava. Aqui só conta o que PODE acontecer:
 * - `encounter`: um encontro do personagem com outro desenho tem algum efeito que roda;
 * - `memory`: nesse encontro, uma variável criada no início recebe um valor diferente do inicial;
 * - `decision`: um Se que lê essa lembrança escolhe, depois dela, um ramo com efeito que antes
 *   não rodaria;
 * - `restart`: uma tecla recomeça o jogo;
 * - `removal`: algo sai da tela num encontro.
 * Um ramo é morto quando a condição é constante (`Se falso`, `Se x e falso`), e um laço que nunca
 * repete também. É o mesmo princípio do `collectionMemory`, sem os nomes do item e do destino.
 *
 * Constantes (N3, 31/10/2026): `podeAgir = falso` no início e nunca mudado é tão constante quanto o
 * `falso` literal. `constantsOf` acha as variáveis que só têm o valor do início (nenhuma atribuição
 * que pode rodar muda o valor) e as condições passam a ser lidas com elas.
 *
 * Quatro brechas fechadas (lacunas, 01/11/2026):
 * - o encontro é com um desenho ou grupo criado por código que roda (um grupo, também com quem
 *   entra nele); encontrar um nome que nunca existe não conta;
 * - a contagem com passo literal (`pontos = pontos + 1`) só decide se algum valor que ela alcança
 *   muda a condição (`Se pontos < 0` nunca muda);
 * - `constantsOf` só tira a variável da conta pelos campos que escrevem nela (nomes de variável),
 *   não por um texto que repete o nome;
 * - `x = x` não é efeito.
 */
export type GameCausalityStep = 'encounter' | 'memory' | 'decision' | 'restart' | 'removal'
export const GAME_CAUSALITY_STEPS: readonly GameCausalityStep[] = [
  'encounter',
  'memory',
  'decision',
  'restart',
  'removal',
]
export interface GameCausalityRule {
  type: 'gameCausality'
  /** O personagem que a criança controla (no Farol, o `guia` do projeto inicial). */
  actor: string
  step: GameCausalityStep
}

type Node = Record<string, unknown>
type Value = boolean | number | string | null
const record = (v: unknown): v is Node => typeof v === 'object' && v !== null && !Array.isArray(v)
const active = (v: unknown): v is Node => record(v) && v.disabled !== true && v.enabled !== false
const MAX_DEPTH = 32
const MAX_NODES = 200_000
const UNKNOWN = Symbol('desconhecido')
type Folded = Value | typeof UNKNOWN

/** O valor de uma expressão com literais e as variáveis de `env`; o resto é desconhecido. */
function fold(expr: unknown, env: ReadonlyMap<string, Value>, depth = 0): Folded {
  if (!record(expr) || depth > 16) return UNKNOWN
  switch (expr.type) {
    case 'bool':
      return typeof expr.value === 'boolean' ? expr.value : UNKNOWN
    case 'num':
      return typeof expr.value === 'number' && Number.isFinite(expr.value) ? expr.value : UNKNOWN
    case 'str':
      return typeof expr.value === 'string' ? expr.value : UNKNOWN
    case 'null':
      return null
    case 'var':
      return typeof expr.name === 'string' && env.has(expr.name)
        ? (env.get(expr.name) as Value)
        : UNKNOWN
    case 'logicalNot': {
      const v = fold(expr.value, env, depth + 1)
      return v === UNKNOWN ? UNKNOWN : !v
    }
    case 'logical': {
      const a = fold(expr.left, env, depth + 1)
      const b = fold(expr.right, env, depth + 1)
      // Um lado conhecido decide sozinho: `x e falso` é falso qualquer que seja o x.
      if (expr.op === '&&') {
        if (a !== UNKNOWN && !a) return a
        if (b !== UNKNOWN && !b) return a === UNKNOWN ? false : b
        return a === UNKNOWN || b === UNKNOWN ? UNKNOWN : b
      }
      if (expr.op === '||') {
        if (a !== UNKNOWN && a) return a
        if (b !== UNKNOWN && b) return a === UNKNOWN ? true : b
        return a === UNKNOWN || b === UNKNOWN ? UNKNOWN : b
      }
      return UNKNOWN
    }
    case 'ternary': {
      const c = fold(expr.condition, env, depth + 1)
      return c === UNKNOWN ? UNKNOWN : fold(c ? expr.whenTrue : expr.whenFalse, env, depth + 1)
    }
    case 'binop': {
      const a = fold(expr.left, env, depth + 1)
      const b = fold(expr.right, env, depth + 1)
      if (a === UNKNOWN || b === UNKNOWN) return UNKNOWN
      switch (expr.op) {
        case '==':
        case '===':
          return a === b
        case '!=':
        case '!==':
          return a !== b
      }
      if (typeof a === 'string' || typeof b === 'string')
        return expr.op === '+' ? `${a}${b}` : UNKNOWN
      if (typeof a !== 'number' || typeof b !== 'number') return UNKNOWN
      switch (expr.op) {
        case '>':
          return a > b
        case '<':
          return a < b
        case '>=':
          return a >= b
        case '<=':
          return a <= b
        case '+':
          return a + b
        case '-':
          return a - b
        case '*':
          return a * b
      }
      return UNKNOWN
    }
  }
  return UNKNOWN
}

const NO_VARS: ReadonlyMap<string, Value> = new Map()
type Env = ReadonlyMap<string, Value>

/** Os corpos de um comando que podem rodar, com as condições constantes já resolvidas. */
function liveChildren(s: Node, env: Env): unknown[][] {
  if (s.type === 'if') {
    const branches: { cond: unknown; body: unknown }[] = [
      { cond: s.cond, body: s.then },
      ...(Array.isArray(s.elseif) ? s.elseif.filter(record) : []).map((b) => ({
        cond: b.cond,
        body: b.then,
      })),
    ]
    const out: unknown[][] = []
    for (const branch of branches) {
      const c = fold(branch.cond, env)
      if (c === UNKNOWN) {
        if (Array.isArray(branch.body)) out.push(branch.body)
        continue
      }
      // Ramo sempre verdadeiro: ele roda e os seguintes nunca.
      if (c) {
        if (Array.isArray(branch.body)) out.push(branch.body)
        return out
      }
    }
    if (Array.isArray(s.else)) out.push(s.else)
    return out
  }
  if (s.type === 'repeat') {
    const times = fold(s.times, env)
    if (typeof times === 'number' && times < 1) return []
  }
  if (s.type === 'while') {
    const c = fold(s.cond, env)
    if (c !== UNKNOWN && !c) return []
  }
  const out: unknown[][] = []
  for (const key of ['body', 'then', 'else'] as const)
    if (Array.isArray(s[key])) out.push(s[key] as unknown[])
  return out
}

/** Visita cada comando que pode rodar, de fora para dentro. */
function walkLive(
  statements: unknown,
  visit: (s: Node) => void,
  env: Env,
  budget = { left: MAX_NODES },
) {
  const stack: { list: unknown[]; depth: number }[] = Array.isArray(statements)
    ? [{ list: statements, depth: 0 }]
    : []
  while (stack.length) {
    const { list, depth } = stack.pop() as { list: unknown[]; depth: number }
    for (const s of list) {
      if (!active(s) || --budget.left < 0) continue
      visit(s)
      if (depth < MAX_DEPTH)
        for (const child of liveChildren(s, env)) stack.push({ list: child, depth: depth + 1 })
    }
  }
}

/** `x = x`: guarda na variável o que ela já tem. */
const selfAssign = (s: Node) =>
  s.type === 'assign' && record(s.value) && s.value.type === 'var' && s.value.name === s.name
/** Um comando que faz alguma coisa (um Se, um laço vazio ou `x = x` não fazem). */
const isEffect = (s: Node) =>
  !['if', 'repeat', 'while', 'doWhile', 'forOf', 'comment'].includes(String(s.type)) &&
  !selfAssign(s)
function hasEffect(body: unknown, env: Env): boolean {
  let found = false
  walkLive(
    body,
    (s) => {
      if (isEffect(s)) found = true
    },
    env,
  )
  return found
}

const withoutIds = (body: unknown) =>
  JSON.stringify(body, (key, value) => (key === '__id' ? undefined : value))

function references(expr: unknown, out: Set<string>, depth = 0) {
  if (depth > 16) return
  if (Array.isArray(expr)) for (const item of expr) references(item, out, depth + 1)
  else if (record(expr)) {
    if (expr.type === 'var' && typeof expr.name === 'string') out.add(expr.name)
    for (const value of Object.values(expr)) references(value, out, depth + 1)
  }
}

interface Behavior {
  molds: unknown[]
  start: unknown[]
  events: unknown[]
  loops: unknown[]
}
function behaviorOf(project: unknown): Behavior | undefined {
  if (!record(project) || !record(project.ir) || !record(project.ir.behavior)) return undefined
  const b = project.ir.behavior
  const list = (v: unknown) => (Array.isArray(v) ? v : [])
  return {
    molds: list(b.molds),
    start: list(b.start),
    events: list(b.events),
    loops: list(b.loops),
  }
}

/** Os campos de comando que dão nome a uma variável nova (que esconde outra com o mesmo nome). */
const SHADOW_FIELDS = ['itemName', 'varName', 'indexName'] as const
/**
 * Os campos de comando que nomeiam uma variável (e podem escrever nela): `name`, `target` e os que
 * terminam em `Name` ou `Var`. Um texto, uma tecla ou uma imagem com o mesmo nome não escrevem.
 */
const writesVariable = (key: string) =>
  key === 'name' || key === 'target' || /(Name|Var)$/.test(key)

/**
 * As variáveis que nunca mudam (N3): criadas uma vez só, no topo de "Meus moldes" ou do "Ao
 * iniciar", com um valor literal, e sem nenhuma atribuição QUE PODE RODAR com outro valor. A conta
 * é otimista até parar de mudar: uma atribuição atrás de uma condição que já se sabe falsa não
 * conta. É conservadora no resto: o nome escondido por um laço, um parâmetro ou um item de grupo,
 * citado em qualquer campo de um comando (que pode escrever nele) ou um projeto com código cru
 * tiram a variável da conta.
 */
function constantsOf(b: Behavior): Env {
  const all = [...b.molds, ...b.start, ...b.events, ...b.loops]
  const declarations = new Map<string, number>()
  const shadowed = new Set<string>()
  let raw = false
  let budget = MAX_NODES
  const stack: unknown[] = [all]
  while (stack.length && --budget > 0) {
    const v = stack.pop()
    if (Array.isArray(v)) {
      for (const item of v) stack.push(item)
      continue
    }
    if (!record(v)) continue
    if (v.type === 'rawJS') raw = true
    if ((v.type === 'var' || v.type === 'declareVar') && typeof v.name === 'string' && 'value' in v)
      declarations.set(v.name, (declarations.get(v.name) ?? 0) + 1)
    if (v.type === 'declareVar' && typeof v.name === 'string')
      declarations.set(v.name, (declarations.get(v.name) ?? 0) + 1)
    for (const key of SHADOW_FIELDS) if (typeof v[key] === 'string') shadowed.add(v[key] as string)
    if (Array.isArray(v.params))
      for (const p of v.params) if (typeof p === 'string') shadowed.add(p)
    for (const value of Object.values(v)) if (typeof value === 'object') stack.push(value)
  }
  if (raw) return NO_VARS
  const env = new Map<string, Value>()
  for (const s of [...b.molds, ...b.start]) {
    if (!active(s) || s.type !== 'var' || typeof s.name !== 'string') continue
    if (declarations.get(s.name) !== 1 || shadowed.has(s.name)) continue
    const v = fold(s.value, env)
    if (v !== UNKNOWN) env.set(s.name, v)
  }
  let changed = env.size > 0
  while (changed) {
    changed = false
    const drop = (name: string) => {
      if (env.delete(name)) changed = true
    }
    const visit = (s: Node) => {
      if (s.type === 'assign' && typeof s.name === 'string' && env.has(s.name)) {
        const v = fold(s.value, env)
        if (v === UNKNOWN || v !== env.get(s.name)) drop(s.name)
      }
      // Outro campo de comando que nomeia a variável pode escrever nela: fora da conta.
      for (const [key, value] of Object.entries(s)) {
        if (key === 'type' || key === '__id' || !writesVariable(key)) continue
        if (s.type === 'assign' && key === 'name') continue
        if (s.type === 'var' && key === 'name') continue
        if (typeof value === 'string' && env.has(value)) drop(value)
      }
    }
    for (const area of [b.molds, b.start, b.events, b.loops]) walkLive(area, visit, env)
  }
  return env
}

/**
 * O que existe no jogo: os desenhos criados por código que pode rodar (`g2d:create*` e
 * `g2d:spawn*` com `varName`) e os grupos criados que recebem alguém (`spawn*` ou `addToGroup`).
 */
function existing(b: Behavior, env: Env): { sprites: Set<string>; groups: Set<string> } {
  const sprites = new Set<string>()
  const created = new Set<string>()
  const filled = new Set<string>()
  const visit = (s: Node) => {
    const type = String(s.type)
    if (type === 'g2d:createGroup' || type === 'g2d:allEnemiesGroup') {
      if (typeof s.varName === 'string') created.add(s.varName)
      return
    }
    if (
      (type.startsWith('g2d:create') || type.startsWith('g2d:spawn')) &&
      typeof s.varName === 'string'
    )
      sprites.add(s.varName)
    if (
      (type.startsWith('g2d:spawn') || type === 'g2d:addToGroup') &&
      typeof s.groupVar === 'string'
    )
      filled.add(s.groupVar)
  }
  for (const area of [b.molds, b.start, b.events, b.loops]) walkLive(area, visit, env)
  return { sprites, groups: new Set([...created].filter((g) => filled.has(g))) }
}

/** Os corpos que podem rodar dos encontros do personagem com outra coisa que existe. */
function encounters(b: Behavior, actor: string, env: Env): unknown[][] {
  const out: unknown[][] = []
  const { sprites, groups } = existing(b, env)
  const visit = (s: Node) => {
    const other = s.aVar === actor ? s.bVar : s.bVar === actor ? s.aVar : null
    const meets =
      (s.type === 'g2d:onOverlap' &&
        typeof other === 'string' &&
        other !== actor &&
        sprites.has(other)) ||
      ((s.type === 'g2d:onTouchGroup' || s.type === 'g2d:onSpriteGroupOverlap') &&
        s.spriteVar === actor &&
        typeof s.groupVar === 'string' &&
        groups.has(s.groupVar))
    if (meets && Array.isArray(s.body)) out.push(s.body)
  }
  walkLive(b.events, visit, env)
  walkLive(b.loops, visit, env)
  return out
}

/** As variáveis criadas no "Ao iniciar", com o valor inicial (UNKNOWN quando é um sorteio etc.). */
function initialValues(b: Behavior, env: Env): Map<string, Folded> {
  const out = new Map<string, Folded>()
  for (const s of b.start)
    if (active(s) && s.type === 'var' && typeof s.name === 'string')
      out.set(s.name, fold(s.value, env))
  return out
}
/** As constantes com uma variável a mais (ou a menos, quando o valor não é conhecido). */
function withVar(env: Env, name: string, value: Folded): Env {
  const out = new Map(env)
  if (value === UNKNOWN) out.delete(name)
  else out.set(name, value)
  return out
}

/**
 * O passo literal de uma contagem (`x = x + 2`, `x = x - 1`, `x = 1 + x`), ou `null` quando o
 * valor novo não é a própria variável mais um número.
 */
function literalStep(name: string, value: unknown, env: Env): number | null {
  if (!record(value) || value.type !== 'binop' || (value.op !== '+' && value.op !== '-'))
    return null
  const self = (e: unknown) => record(e) && e.type === 'var' && e.name === name
  const n = (e: unknown) => {
    const f = fold(e, withVar(env, name, UNKNOWN))
    return typeof f === 'number' ? f : null
  }
  if (self(value.left)) {
    const d = n(value.right)
    return d === null ? null : value.op === '+' ? d : -d
  }
  if (value.op === '+' && self(value.right)) return n(value.left)
  return null
}

/** As contagens com passo literal achadas nos encontros: nome → os passos. */
type Steps = Map<string, number[]>
/** Quantos passos de uma contagem a decisão confere (o bastante para os limites de um jogo). */
const COUNT_HORIZON = 200

/** O que o encontro guarda: nome → valor depois (UNKNOWN quando a conta não fecha aqui). */
function memories(
  b: Behavior,
  actor: string,
  env: Env,
  steps: Steps = new Map(),
): Map<string, Folded> {
  const initial = initialValues(b, env)
  const out = new Map<string, Folded>()
  for (const body of encounters(b, actor, env))
    walkLive(
      body,
      (s) => {
        if (s.type !== 'assign' || typeof s.name !== 'string' || !initial.has(s.name)) return
        const before = initial.get(s.name) as Folded
        const after = fold(s.value, withVar(env, s.name, before))
        if (before !== UNKNOWN && after === before) return
        // Quem conta (`pontos = pontos + 1`) muda a cada encontro: o valor depois não é um só.
        const own = new Set<string>()
        references(s.value, own)
        out.set(s.name, own.has(s.name) ? UNKNOWN : after)
        const step = own.has(s.name) ? literalStep(s.name, s.value, env) : null
        steps.set(s.name, [
          ...(steps.get(s.name) ?? []),
          ...(step === null ? [Number.NaN] : [step]),
        ])
      },
      env,
    )
  return out
}

/** O "senão" de um Se: os `senão se` viram um Se aninhado, e sem nada é a lista vazia. */
function otherwiseOf(s: Node): unknown[] {
  const chain = Array.isArray(s.elseif) ? s.elseif.filter(record) : []
  const [first, ...others] = chain
  if (!first) return Array.isArray(s.else) ? s.else : []
  return [
    {
      type: 'if',
      cond: first.cond,
      // biome-ignore lint/suspicious/noThenProperty: campo da árvore de instruções SZIR.
      then: first.then,
      elseif: others,
      else: s.else,
    },
  ]
}

/**
 * Os valores que uma contagem alcança a partir do início, com os passos literais dela (um passo
 * só, ou vários iguais), até `COUNT_HORIZON` encontros. `null` quando a conta não é só essa.
 */
function reachable(start: Folded, steps: number[] | undefined): number[] | null {
  if (typeof start !== 'number' || !steps?.length) return null
  if (steps.some((d) => !Number.isFinite(d))) return null
  const distinct = [...new Set(steps)]
  if (distinct.length !== 1) return null
  const d = distinct[0] as number
  return Array.from({ length: COUNT_HORIZON }, (_, k) => start + d * (k + 1))
}

function decides(b: Behavior, actor: string, env: Env): boolean {
  const steps: Steps = new Map()
  const remembered = memories(b, actor, env, steps)
  if (!remembered.size) return false
  const initial = initialValues(b, env)
  let found = false
  const visit = (s: Node) => {
    if (found || s.type !== 'if') return
    const otherwise = otherwiseOf(s)
    const names = new Set<string>()
    // Condição constante (`Se falso`, `Se x e falso`) não decide nada.
    const constant = fold(s.cond, env)
    if (constant === UNKNOWN) references(s.cond, names)
    for (const name of names) {
      if (!remembered.has(name)) continue
      const before = fold(s.cond, withVar(env, name, initial.get(name) as Folded))
      const now = fold(s.cond, withVar(env, name, remembered.get(name) as Folded))
      if (before === UNKNOWN || now === UNKNOWN) {
        // Uma contagem de passo literal: algum valor que ela alcança precisa virar a condição.
        const values = reachable(initial.get(name) as Folded, steps.get(name))
        if (values && before !== UNKNOWN) {
          const flips = values.some((value) => {
            const c = fold(s.cond, withVar(env, name, value))
            return c !== UNKNOWN && Boolean(c) !== Boolean(before)
          })
          const success = before ? otherwise : s.then
          if (flips && hasEffect(success, env)) found = true
          continue
        }
        // A conta depende de outra coisa (outra variável, um sorteio): basta um ramo agir.
        if (hasEffect(s.then, env) || hasEffect(otherwise, env)) found = true
        continue
      }
      if (Boolean(before) === Boolean(now)) continue
      const success = now ? s.then : otherwise
      const missing = now ? otherwise : s.then
      if (hasEffect(success, env) && withoutIds(success) !== withoutIds(missing ?? [])) found = true
    }
    // Cada `senão se` é uma decisão própria, com a condição dele (morta atrás de um sempre-verdadeiro).
    if (Array.isArray(s.elseif) && s.elseif.length && !(constant !== UNKNOWN && constant))
      for (const inner of otherwise) if (record(inner)) visit(inner)
  }
  walkLive(b.events, visit, env)
  walkLive(b.loops, visit, env)
  return found
}

export function evaluatesGameCausality(rule: GameCausalityRule, project: unknown): boolean {
  const b = behaviorOf(project)
  if (!b) return false
  const env = constantsOf(b)
  switch (rule.step) {
    case 'encounter':
      return encounters(b, rule.actor, env).some((body) => hasEffect(body, env))
    case 'memory':
      return memories(b, rule.actor, env).size > 0
    case 'decision':
      return decides(b, rule.actor, env)
    case 'removal':
      return encounters(b, rule.actor, env).some((body) => {
        let removes = false
        walkLive(
          body,
          (s) => {
            if (s.type === 'g2d:destroySprite') removes = true
          },
          env,
        )
        return removes
      })
    case 'restart': {
      let restarts = false
      walkLive(
        b.events,
        (s) => {
          if (s.type === 'g2d:onKey' && Array.isArray(s.body))
            walkLive(
              s.body,
              (inner) => {
                if (inner.type === 'g2d:restart') restarts = true
              },
              env,
            )
        },
        env,
      )
      return restarts
    }
  }
  return false
}

export function isGameCausalityRule(rule: Record<string, unknown>): boolean {
  return (
    rule.type === 'gameCausality' &&
    typeof rule.actor === 'string' &&
    /^[A-Za-z_$][A-Za-z0-9_$]{0,99}$/.test(rule.actor) &&
    GAME_CAUSALITY_STEPS.includes(rule.step as GameCausalityStep)
  )
}
