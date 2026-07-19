import { type ParserOptions, parse } from '@babel/parser'
import {
  type EventKind,
  G2D_ANIM_STATES,
  G2D_ENEMY_BEHAVIORS,
  G2D_ENEMY_PARAMS,
  type JSExpr,
  type JSStatement,
} from '#ir'

const BABEL_OPTS: ParserOptions = {
  sourceType: 'module',
  errorRecovery: true,
  plugins: [],
}

export interface ParseJSDiagnostic {
  kind: 'syntaxError'
  message: string
}

export interface ParseJSResult {
  statements: JSStatement[]
  diagnostics: ParseJSDiagnostic[]
}

/**
 * Parser JS pragmático: tenta reconhecer apenas os padrões que os blocos
 * emitem. Qualquer outra coisa vira `rawJS advanced` preservando o snippet
 * original.
 */
export function parseJS(source: string): JSStatement[] {
  return parseJSWithDiagnostics(source).statements
}

export function parseJSWithDiagnostics(source: string): ParseJSResult {
  if (!source.trim()) return { statements: [], diagnostics: [] }
  let ast: ReturnType<typeof parse>
  try {
    ast = parse(source, BABEL_OPTS)
  } catch (error) {
    return {
      statements: [{ type: 'rawJS', code: source, advanced: true }],
      diagnostics: [{ kind: 'syntaxError', message: errorMessage(error) }],
    }
  }

  const recoverableErrors = (ast as { errors?: Array<{ message?: string }> }).errors ?? []
  if (recoverableErrors.length > 0) {
    return {
      statements: [{ type: 'rawJS', code: source, advanced: true }],
      diagnostics: [
        {
          kind: 'syntaxError',
          message: recoverableErrors.map((e) => e.message ?? 'Erro de sintaxe').join('\n'),
        },
      ],
    }
  }

  const ctx: ParseCtx = {
    source,
    elementVars: new Map(),
    createdElementVars: new Set(),
    canvasElementVars: new Set(),
    ctxVars: new Set(),
    elementToCtx: new Map(),
    instanceVars: new Set(),
    spriteVars: new Set(),
    eventParamAliases: [],
  }
  // A descida recursiva também precisa estar protegida: o Babel parseia
  // aninhamentos profundos sem reclamar e só a recursão do mapeamento estoura a
  // pilha (RangeError). Sem o try/catch aqui, esse throw escaparia e quebraria o
  // contrato de não-crashar — então degradamos para `rawJS advanced` como qualquer
  // entrada não-parseável.
  let out: JSStatement[]
  try {
    out = mapStatementList(ast.program.body, source, ctx)
  } catch (error) {
    return {
      statements: [{ type: 'rawJS', code: source, advanced: true }],
      diagnostics: [{ kind: 'syntaxError', message: errorMessage(error) }],
    }
  }
  // Remove os `getElementById` soltos que foram absorvidos por um `canvasSetup`.
  const statements = out.filter(
    (s) => !(s.type === 'getElementById' && ctx.canvasElementVars.has(s.varName)),
  )
  return { statements, diagnostics: [] }
}

// biome-ignore lint/suspicious/noExplicitAny: Babel AST nodes são tipados de forma muito ampla
type Node = any

/**
 * Estado do parse: registra quais variáveis guardam um elemento via
 * `const x = document.getElementById("id")`. Hoje `extractTarget` trata
 * qualquer identificador como alvo-variável (`targetKind: 'var'`), então o mapa
 * é mantido apenas como registro/informação do parse.
 */
interface ParseCtx {
  /** Fonte JS completa — para `bodyOfFn`/`asRaw` a partir de matchers de VALOR
   * (ex.: o corpo de `new Promise((resolve) => { ... })` no `toExpr`). */
  source: string
  elementVars: Map<string, string>
  /**
   * Variáveis que vieram de `document.createElement[NS](...)` (não de
   * `getElementById`). Guard do `canvasSetup`: um canvas CRIADO não pode ser
   * fundido em `getElementById(<nome-da-var>)` — o elemento não tem id nenhum e
   * a reescrita mudaria a semântica (o letreiro canvas→CanvasTexture do folio
   * usa exatamente `createElement('canvas') + getContext('2d')`).
   */
  createdElementVars: Set<string>
  /**
   * Variáveis de elemento `<canvas>` que foram absorvidas num `canvasSetup`
   * (par `getElementById` + `getContext('2d')`). O `getElementById` solto
   * correspondente é removido na pós-passagem — o `canvasSetup` regenera as
   * duas linhas.
   */
  canvasElementVars: Set<string>
  /**
   * Variáveis de contexto 2D (`const ctx = canvas.getContext('2d')`). Servem de
   * *guard*: os matchers de método de canvas (`ctx.fillRect(...)` etc.) só
   * disparam quando o objeto é um ctx conhecido — evita falso positivo em
   * `qualquerCoisa.fillRect(...)`.
   */
  ctxVars: Set<string>
  /**
   * Variável do elemento `<canvas>` → variável do contexto associado
   * (ex.: `canvas` → `ctx`). Necessário para `canvasSetSize`, cuja IR usa
   * `ctxVar` mas cujo código escreve em `canvas.width`/`canvas.height`.
   */
  elementToCtx: Map<string, string>
  /**
   * Variáveis que guardam uma instância (`const p = new Classe(...)`). Servem
   * de *guard* para `callMethod`: `p.metodo(...)` só vira bloco quando `p` é uma
   * instância conhecida — evita falso positivo em `foo.fillRect(...)`.
   */
  instanceVars: Set<string>
  /**
   * Sprites do game-2d (`const s = SZGame2D.createSprite(...)`). Servem de
   * *guard* para a fusão de `s.vx = ...; s.vy = ...;` → `g2d:setVelocity` (e
   * `s.x/s.y` → `g2d:setPosition`): só funde quando o objeto é um sprite
   * conhecido — `ponto.x = ...; ponto.y = ...;` de um objeto qualquer segue
   * como dois `memberSet`.
   */
  spriteVars: Set<string>
  /**
   * PILHA de apelidos do parâmetro de evento. O gerador SEMPRE emite
   * `(event) => {…}` e os matchers (`eventProp`, preventDefault…) só reconhecem
   * o identificador `event` — mas o aluno escreve `e => e.key` no código. Sem o
   * apelido, `e.key` virava `memberGet(var e)` e o código REGENERADO referenciava
   * um `e` inexistente (quebra silenciosa). Durante o corpo de um listener com
   * param `e`, o nome fica empilhado aqui e o `toExpr` o normaliza para `event`.
   * A segurança (shadowing/escrita/colisão) é checada ANTES de empilhar; caso
   * inseguro, o listener INTEIRO cai em rawJS verbatim.
   */
  eventParamAliases: string[]
}

const KNOWN_EVENT_KINDS: ReadonlySet<EventKind> = new Set([
  'click',
  'keydown',
  'keyup',
  'mouseover',
  'mouseout',
  'mousemove',
  'mousedown',
  'mouseup',
  'submit',
  'input',
  'change',
  'load',
  'resize',
  'fullscreenchange',
  'contextmenu',
  'blur',
])

function snippet(source: string, node: Node): string {
  if (!node || typeof node.start !== 'number') return ''
  const raw = source.slice(node.start, node.end ?? node.start)
  const lines = raw.split('\n')
  if (lines.length <= 1) return raw.trim()
  // A primeira linha começa em `node.start` (sem indentação); as seguintes
  // carregam a indentação original do arquivo. Removemos a indentação comum das
  // continuações para guardar um trecho "relativo" — assim re-gerar (com pad) e
  // re-parsear não acumula espaços a cada ciclo (round-trip estável do avançado).
  let min = Number.POSITIVE_INFINITY
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i]
    if (!line?.trim()) continue
    const indent = line.match(/^[ \t]*/)?.[0].length ?? 0
    if (indent < min) min = indent
  }
  if (!Number.isFinite(min)) min = 0
  const dedented = [
    lines[0]?.trimEnd() ?? '',
    ...lines.slice(1).map((line) => (line.trim() ? line.slice(min).trimEnd() : '')),
  ]
  return dedented.join('\n').trim()
}

function asRaw(source: string, node: Node): JSStatement {
  return { type: 'rawJS', code: snippet(source, node), advanced: true }
}

/** `throw new Error(<msg>)` / `throw Error(<msg>)` → throwError; senão código avançado. */
function mapThrow(node: Node, source: string, ctx: ParseCtx): JSStatement {
  const arg = node.argument
  if (
    arg &&
    (arg.type === 'NewExpression' || arg.type === 'CallExpression') &&
    arg.callee?.type === 'Identifier' &&
    arg.callee.name === 'Error'
  ) {
    const msgArg = arg.arguments?.[0]
    const message: JSExpr | null = msgArg ? toExpr(msgArg, ctx) : { type: 'str', value: '' }
    if (message && isSimpleValue(message)) return { type: 'throwError', message }
  }
  return asRaw(source, node)
}

/**
 * `switch (subject) { case <match>: … break; … default: … }` → bloco "escolha".
 * Desembrulha o `{ … }` de cada caso e remove o `break` final (que o gerador
 * recria). Casos com valor/assunto não representável caem em código avançado.
 */
function mapSwitch(node: Node, source: string, ctx: ParseCtx): JSStatement {
  const subject = toExpr(node.discriminant, ctx)
  if (!isSimpleValue(subject)) return asRaw(source, node)
  const cases: Array<{ match: JSExpr; body: JSStatement[] }> = []
  let def: JSStatement[] | undefined
  for (const sc of node.cases ?? []) {
    let stmts: Node[] = sc.consequent ?? []
    if (stmts.length === 1 && stmts[0]?.type === 'BlockStatement') stmts = stmts[0].body ?? []
    if (stmts.length > 0 && stmts[stmts.length - 1]?.type === 'BreakStatement') {
      stmts = stmts.slice(0, -1)
    }
    const body = mapStatementList(stmts, source, ctx)
    if (sc.test === null || sc.test === undefined) {
      def = body
    } else {
      const match = toExpr(sc.test, ctx)
      if (!isSimpleValue(match)) return asRaw(source, node)
      cases.push({ match, body })
    }
  }
  return { type: 'switch', subject, cases, ...(def !== undefined ? { default: def } : {}) }
}

function mapStatement(
  node: Node,
  source: string,
  ctx: ParseCtx,
): JSStatement | JSStatement[] | null {
  switch (node.type) {
    case 'VariableDeclaration':
      return mapVariable(node, source, ctx)
    case 'ExpressionStatement':
      return mapExpressionStatement(node, source, ctx)
    case 'IfStatement':
      return mapIf(node, source, ctx)
    case 'ThrowStatement':
      return mapThrow(node, source, ctx)
    case 'SwitchStatement':
      return mapSwitch(node, source, ctx)
    case 'ForStatement':
      return mapFor(node, source, ctx)
    case 'ForOfStatement':
      return mapForOf(node, source, ctx)
    case 'WhileStatement':
      return mapWhile(node, source, ctx)
    case 'DoWhileStatement':
      return mapDoWhile(node, source, ctx)
    case 'BreakStatement':
      // `break;` simples; com label (`break loop;`) vira código avançado.
      return node.label ? asRaw(source, node) : { type: 'break' }
    case 'ContinueStatement':
      return node.label ? asRaw(source, node) : { type: 'continue' }
    case 'TryStatement':
      return mapTry(node, source, ctx)
    case 'BlockStatement':
      // Bloco solto `{ ... }` em posição de statement — hoje só o
      // `canvasDrawImage` é emitido assim (escopo para a variável da imagem).
      return tryMatchDrawImage(node, ctx) ?? asRaw(source, node)
    case 'ClassDeclaration':
      return mapClass(node, source, ctx)
    case 'FunctionDeclaration':
      return mapFunction(node, source, ctx)
    case 'ImportDeclaration': {
      const specs = node.specifiers ?? []
      const mod = node.source?.type === 'StringLiteral' ? (node.source.value as string) : null
      if (!mod) return asRaw(source, node)
      // `import * as NOME from 'modulo'` → importStar (bloco de lib 3D).
      if (specs.length === 1 && specs[0]?.type === 'ImportNamespaceSpecifier') {
        const name = identifierName(specs[0].local)
        if (name) return { type: 'importStar', name, module: mod }
      }
      // `import { A, B } from 'modulo'` (SEM alias/default) → importNamed. É o
      // `import { GLTFLoader } from 'three/addons/…'` da Fase 2. Alias (`X as Y`)
      // ou default junto seguem como código avançado.
      if (
        specs.length > 0 &&
        specs.every(
          (s: Node) =>
            s?.type === 'ImportSpecifier' &&
            s.imported?.type === 'Identifier' &&
            s.local?.type === 'Identifier' &&
            s.imported.name === s.local.name,
        )
      ) {
        const names = specs.map((s: Node) => s.imported.name as string)
        return { type: 'importNamed', names, module: mod }
      }
      return asRaw(source, node)
    }
    case 'ReturnStatement': {
      // `return;` (saída antecipada) → return sem valor (sz_js_return_void).
      if (!node.argument) return { type: 'return' }
      // `return <valor simples>;` → return com valor; senão código avançado.
      const value = toExpr(node.argument, ctx)
      if (isSimpleValue(value)) return { type: 'return', value }
      return asRaw(source, node)
    }
    default:
      return asRaw(source, node)
  }
}

/**
 * `class Nome [extends Base] { constructor(...) { ... } metodo(...) { ... } }`.
 * O construtor e os métodos têm corpo livre (mapeado por `mapStatementList`):
 * `this.x = v` vira `setThisProp`, e o resto, statements normais. Só preserva a
 * classe inteira como código avançado para `static`, getters/setters, campos de
 * classe e parâmetros não-triviais — sem perder o original. Herança simples
 * (`extends Identificador`) é suportada; expressões de herança complexas viram raw.
 */
function mapClass(node: Node, source: string, ctx: ParseCtx): JSStatement {
  if (node.id?.type !== 'Identifier') return asRaw(source, node)
  let superClass: string | undefined
  if (node.superClass) {
    if (node.superClass.type === 'Identifier') superClass = node.superClass.name
    else return asRaw(source, node)
  }
  const members = node.body?.body ?? []

  // 1ª passada: confere que TODOS os membros são representáveis (método/construtor
  // simples, sem static/computed/getter/setter/campos) ANTES de mapear qualquer
  // corpo. Sem isso, mapear os corpos cedo poluía o `ctx` (spriteVars/instanceVars/
  // ctxVars/elementVars/…) e, se um membro posterior falhasse o guard e a classe
  // caísse em `asRaw`, essas mutações vazariam e contaminavam statements irmãos.
  for (const member of members) {
    if (
      member.type !== 'ClassMethod' ||
      member.static ||
      member.computed ||
      member.key?.type !== 'Identifier' ||
      !Array.isArray(member.params) ||
      !member.params.every((p: Node) => p?.type === 'Identifier') ||
      (member.kind !== 'constructor' && member.kind !== 'method')
    ) {
      return asRaw(source, node)
    }
  }

  // 2ª passada: a classe é representável; agora sim mapeamos os corpos no `ctx`.
  let ctorParams: string[] = []
  let ctorBody: JSStatement[] = []
  const methods: Array<{
    name: string
    params: string[]
    body: JSStatement[]
    async?: boolean
  }> = []
  for (const member of members) {
    const params: string[] = member.params.map((p: Node) => p.name)
    if (member.kind === 'constructor') {
      ctorParams = params
      ctorBody = mapStatementList(member.body?.body ?? [], source, ctx)
    } else {
      methods.push({
        name: member.key.name,
        params,
        body: mapStatementList(member.body?.body ?? [], source, ctx),
        ...(member.async ? { async: true } : {}),
      })
    }
  }

  return {
    type: 'classDecl',
    name: node.id.name,
    ...(superClass ? { superClass } : {}),
    ctorParams,
    ctorBody,
    methods,
  }
}

/**
 * `function nome(params) { ... }` de topo → `funcDecl`. Params precisam ser
 * identificadores simples; async/generator e params não-triviais viram raw.
 * Roda DEPOIS dos matchers de fusão (anim loop), que têm prioridade.
 */
function mapFunction(node: Node, source: string, ctx: ParseCtx): JSStatement {
  if (node.id?.type !== 'Identifier') return asRaw(source, node)
  if (node.async || node.generator) return asRaw(source, node)
  if (!Array.isArray(node.params) || !node.params.every((p: Node) => p?.type === 'Identifier')) {
    return asRaw(source, node)
  }
  const params: string[] = node.params.map((p: Node) => p.name)
  const body = mapStatementList(node.body?.body ?? [], source, ctx)
  return { type: 'funcDecl', name: node.id.name, params, body }
}

/**
 * Funções globais que NÃO devem virar "chamar função" do aluno: têm tratamento
 * próprio (alert, setTimeout) ou são wiring de runtime (requestAnimationFrame).
 */
const GLOBAL_CALL_DENYLIST: ReadonlySet<string> = new Set([
  'alert',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'setTimeout',
  'setInterval',
  'parseInt',
  'parseFloat',
])

/**
 * Objetos globais cujo `.prop` / `.metodo(...)` NÃO deve virar bloco genérico de
 * objeto (`memberGet`/`memberCall`): ou têm matcher próprio (window, Math, event,
 * console) ou não são objetos que o aluno manipula. Mantém `console.error`,
 * `JSON.stringify`, `Object.keys`, etc. como código avançado.
 */
const GLOBAL_OBJECTS: ReadonlySet<string> = new Set([
  'window',
  'document',
  'console',
  'Math',
  'JSON',
  'Object',
  'Array',
  'navigator',
  'location',
  'history',
  'localStorage',
  'sessionStorage',
  'event',
])

/** O nó é um identificador de objeto global (não deve virar bloco de objeto genérico). */
function isGlobalObject(node: Node): boolean {
  return node?.type === 'Identifier' && GLOBAL_OBJECTS.has(node.name)
}

/** `cancelAnimationFrame(<id>)` → `cancelAnimationFrame`, se o id for um valor simples. */
function tryMatchCancelAnimationFrame(expr: Node, ctx: ParseCtx): JSStatement | null {
  if (expr?.type !== 'CallExpression' || expr.callee?.type !== 'Identifier') return null
  if (expr.callee.name !== 'cancelAnimationFrame' || expr.arguments?.length !== 1) return null
  const handle = toExpr(expr.arguments[0], ctx)
  return isSimpleValue(handle) ? { type: 'cancelAnimationFrame', handle: handle as JSExpr } : null
}

/** `localStorage.setItem(chave, valor)` / `sessionStorage.setItem(...)` → `storageSet`. */
function tryMatchStorageSet(expr: Node, ctx: ParseCtx): JSStatement | null {
  if (expr?.type !== 'CallExpression' || expr.callee?.type !== 'MemberExpression') return null
  const obj = expr.callee.object
  if (
    obj?.type !== 'Identifier' ||
    (obj.name !== 'localStorage' && obj.name !== 'sessionStorage')
  ) {
    return null
  }
  if (expr.callee.property?.name !== 'setItem' || expr.arguments?.length !== 2) return null
  const key = toExpr(expr.arguments[0], ctx)
  const value = toExpr(expr.arguments[1], ctx)
  if (!isSimpleValue(key) || !isSimpleValue(value)) return null
  return {
    type: 'storageSet',
    store: obj.name === 'sessionStorage' ? 'session' : 'local',
    key,
    value,
  }
}

/** `event.preventDefault()` / `event.stopPropagation()` → `eventMethod`. */
function tryMatchEventMethod(expr: Node, ctx?: ParseCtx): JSStatement | null {
  if (expr?.type !== 'CallExpression' || expr.callee?.type !== 'MemberExpression') return null
  const obj = expr.callee.object
  if (obj?.type !== 'Identifier') return null
  if (obj.name !== 'event' && !ctx?.eventParamAliases.includes(obj.name)) return null
  const method = expr.callee.property?.name
  if (
    (method === 'preventDefault' || method === 'stopPropagation') &&
    (expr.arguments?.length ?? 0) === 0
  ) {
    return { type: 'eventMethod', method }
  }
  return null
}

/** `obj.metodo(arg)` com 1 argumento (usado para destrinchar a cadeia do fetch). */
function isChainCall(node: Node, method: string): boolean {
  return (
    node?.type === 'CallExpression' &&
    node.callee?.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.property?.name === method &&
    node.arguments?.length === 1
  )
}

/** Nome do (único) parâmetro de uma arrow/função: `{}` (sem param) ou `{param}`; null se inválido. */
function callbackParam(cb: Node): { param?: string } | null {
  if (cb?.type !== 'ArrowFunctionExpression' && cb?.type !== 'FunctionExpression') return null
  const params = cb.params ?? []
  if (params.length === 0) return {}
  if (params.length === 1 && params[0]?.type === 'Identifier') return { param: params[0].name }
  return null
}

/** Confere se o callback é `(r) => r.json()` ou `(r) => { return r.json(); }`. */
function isJsonCallback(cb: Node): boolean {
  if (cb?.type !== 'ArrowFunctionExpression' && cb?.type !== 'FunctionExpression') return false
  const params = cb.params ?? []
  if (params.length !== 1 || params[0]?.type !== 'Identifier') return false
  const p = params[0].name
  let expr = cb.body
  if (expr?.type === 'BlockStatement') {
    const stmts = expr.body ?? []
    if (stmts.length !== 1 || stmts[0]?.type !== 'ReturnStatement') return false
    expr = stmts[0].argument
  }
  return (
    expr?.type === 'CallExpression' &&
    expr.callee?.type === 'MemberExpression' &&
    expr.callee.object?.type === 'Identifier' &&
    expr.callee.object.name === p &&
    expr.callee.property?.name === 'json' &&
    (expr.arguments?.length ?? 0) === 0
  )
}

/**
 * `fetch(url).then(r => r.json()).then((dados) => {…})[.catch((erro) => {…})]`
 * → `fetchJson`. Desembrulha de fora para dentro: catch (opcional) → then(dados)
 * → then(json) → fetch(url).
 */
function tryMatchFetchJson(expr: Node, source: string, ctx: ParseCtx): JSStatement | null {
  let node: Node = expr
  let catchName: string | undefined
  let catchBody: JSStatement[] | undefined
  let hasCatch = false
  if (isChainCall(node, 'catch')) {
    const cb = node.arguments[0]
    const param = callbackParam(cb)
    if (!param) return null
    catchName = param.param
    catchBody = bodyOfFn(cb, source, ctx)
    hasCatch = true
    node = node.callee.object
  }
  // .then((dados) => { … })
  if (!isChainCall(node, 'then')) return null
  const dataCb = node.arguments[0]
  const dataParam = callbackParam(dataCb)
  if (!dataParam) return null
  const body = bodyOfFn(dataCb, source, ctx)
  node = node.callee.object
  // .then((r) => r.json())
  if (!isChainCall(node, 'then') || !isJsonCallback(node.arguments[0])) return null
  node = node.callee.object
  // fetch(url)
  if (
    node?.type !== 'CallExpression' ||
    node.callee?.type !== 'Identifier' ||
    node.callee.name !== 'fetch' ||
    node.arguments?.length !== 1
  ) {
    return null
  }
  const url = toExpr(node.arguments[0], ctx)
  if (!isSimpleValue(url)) return null
  return {
    type: 'fetchJson',
    url,
    okName: dataParam.param ?? 'dados',
    body,
    ...(hasCatch ? { ...(catchName ? { catchName } : {}), catchBody: catchBody ?? [] } : {}),
  }
}

/** `nome(args)` (callee Identifier) → `callFunction`, se todos os args forem valores. */
function tryMatchFunctionCall(expr: Node, ctx: ParseCtx): JSStatement | null {
  if (expr?.type !== 'CallExpression' || expr.callee?.type !== 'Identifier') return null
  if (GLOBAL_CALL_DENYLIST.has(expr.callee.name)) return null
  const args = (expr.arguments ?? []).map((a: Node) => toExpr(a, ctx))
  if (!args.every(isSimpleValue)) return null
  return { type: 'callFunction', name: expr.callee.name, args: args as JSExpr[] }
}

/**
 * Passagem de sequência: reconhece, em ordem, padrões de canvas que ocupam
 * mais de um statement (ex.: `canvas.width`+`canvas.height`, `beginPath`+`arc`+
 * `fill`) antes de cair no mapeamento statement-a-statement. Usada no topo e
 * dentro de blocos.
 */
function mapStatementList(nodes: Node[], source: string, ctx: ParseCtx): JSStatement[] {
  const out: JSStatement[] = []
  let i = 0
  while (i < nodes.length) {
    const fused =
      tryFuseCanvasSetSize(nodes, i, ctx) ??
      tryFuseCanvasArc(nodes, i, ctx) ??
      tryFuseCanvasRoundRect(nodes, i, ctx) ??
      tryFuseCanvasEllipse(nodes, i, ctx) ??
      tryFuseCanvasArcSlice(nodes, i, ctx) ??
      tryFuseCanvasShadow(nodes, i, ctx) ??
      tryFuseCanvasGradient(nodes, i, ctx) ??
      tryFuseAnimationLoop(nodes, i, source, ctx) ??
      tryFuseGame2DSpriteAssign(nodes, i, ctx) ??
      tryFuseNewImage(nodes, i, ctx) ??
      tryFuseKeyboard(nodes, i, ctx)
    if (fused) {
      out.push(fused.stmt)
      i += fused.consumed
      continue
    }
    const stmt = mapStatement(nodes[i], source, ctx)
    if (Array.isArray(stmt)) out.push(...stmt)
    else if (stmt) out.push(stmt)
    i += 1
  }
  // Remove os `getElementById` soltos absorvidos por um `canvasSetup` NESTE
  // escopo. A descida só funde o par `getElementById` + `getContext('2d')` em
  // `canvasSetup` quando ambos estão no MESMO corpo; portanto o órfão a remover
  // também está aqui. Fazer a remoção por escopo (e não só no topo) impede o
  // `getElementById` morto de crescer a cada ciclo parse→gen→parse dentro de
  // funções/blocos aninhados (idempotente — ponto fixo do round-trip).
  return out.filter((s) => !(s.type === 'getElementById' && ctx.canvasElementVars.has(s.varName)))
}

function mapVariable(node: Node, source: string, ctx: ParseCtx): JSStatement | JSStatement[] {
  const out: JSStatement[] = []
  // Quando QUALQUER declarador não é representável por um bloco, a declaração
  // INTEIRA cai em `rawJS` (um único `asRaw` do nó-pai). Slicear apenas o
  // declarador (`asRaw(source, decl)`) perderia a palavra-chave `const`/`let`/
  // `var`, que mora no nó-pai `VariableDeclaration` — gerando JS inválido tipo
  // `{a, b} = obj` ao re-emitir. Um único `asRaw(source, node)` no nó-pai também
  // evita duplicar a statement em declarações com vários declaradores.
  for (const decl of node.declarations) {
    const mapped = mapDeclarator(decl, node, ctx)
    if (mapped === null) return asRaw(source, node)
    out.push(...mapped)
  }
  return out.length === 1 ? (out[0] as JSStatement) : out
}

/**
 * Mapeia UM declarador de uma `VariableDeclaration`. Retorna a lista de
 * statements representáveis, ou `null` quando o declarador não é representável
 * por blocos (o chamador então preserva a declaração inteira como `rawJS`,
 * mantendo a palavra-chave `const`/`let`/`var`). As mutações de `ctx` (registro
 * de elementos/contextos/instâncias/sprites) são aplicadas em ordem, para que
 * declaradores seguintes da MESMA statement enxerguem os anteriores.
 */
function mapDeclarator(decl: Node, node: Node, ctx: ParseCtx): JSStatement[] | null {
  // `const` vira um bloco de constante; `let`/`var` ficam sem `kind` (= let).
  const kindField: { kind?: 'const' } = node.kind === 'const' ? { kind: 'const' } : {}
  // Desestruturação de lista: const [a, b] = lista → várias atribuições por índice.
  if (decl.id?.type === 'ArrayPattern') {
    const fromVar = decl.init?.type === 'Identifier' ? (decl.init.name as string) : null
    const elements = decl.id.elements ?? []
    if (fromVar && elements.length > 0 && elements.every((e: Node) => e?.type === 'Identifier')) {
      return elements.map((el: Node, i: number) => ({
        type: 'var',
        name: el.name,
        value: { type: 'index', arrayVar: fromVar, index: { type: 'num', value: i } },
        ...kindField,
      }))
    }
    return null
  }
  if (decl.id?.type !== 'Identifier') return null
  const name: string = decl.id.name
  const init = decl.init
  // getElementById: const x = document.getElementById('id')
  const byId = matchGetElementById(init)
  if (byId) {
    ctx.elementVars.set(name, byId)
    return [{ type: 'getElementById', id: byId, varName: name }]
  }
  // querySelector / querySelectorAll: const x = document.querySelector[All]('sel')
  if (
    init?.type === 'CallExpression' &&
    init.callee?.type === 'MemberExpression' &&
    init.callee.object?.name === 'document' &&
    (init.callee.property?.name === 'querySelector' ||
      init.callee.property?.name === 'querySelectorAll') &&
    init.arguments?.length === 1 &&
    init.arguments[0].type === 'StringLiteral'
  ) {
    const type =
      init.callee.property.name === 'querySelectorAll' ? 'querySelectorAll' : 'querySelector'
    return [{ type, selector: init.arguments[0].value, varName: name }]
  }
  // createElement: const x = document.createElement('div')
  const createdTag = matchCreateElement(init)
  if (createdTag !== null) {
    ctx.elementVars.set(name, name)
    ctx.createdElementVars.add(name)
    return [{ type: 'createElement', tag: createdTag, varName: name }]
  }
  // createElementNS (forma SVG): const x = document.createElementNS(<ns>, 'circle')
  const createdNSTag = matchCreateElementNS(init)
  if (createdNSTag !== null) {
    ctx.elementVars.set(name, name)
    ctx.createdElementVars.add(name)
    return [{ type: 'createElementNS', tag: createdNSTag, varName: name }]
  }
  // canvasSetup: const ctx = <canvasVar>.getContext('2d'), onde <canvasVar>
  // veio de um getElementById anterior. Funde o par numa única IR canvasSetup.
  // ⚠️ NÃO funde canvas CRIADO (`createElement('canvas')`): ele não tem id e a
  // fusão regeneraria `getElementById(<nome-da-var>)` — código DIFERENTE (null).
  // Nesse caso a linha cai no `var` genérico (memberCall) e os desenhos seguem
  // como métodos genéricos — round-trip byte-fiel (idioma do letreiro do folio).
  const canvasVar = matchGetContext(init)
  if (canvasVar && !ctx.createdElementVars.has(canvasVar)) {
    const canvasId = ctx.elementVars.get(canvasVar)
    if (canvasId !== undefined) {
      ctx.canvasElementVars.add(canvasVar)
      ctx.ctxVars.add(name)
      ctx.elementToCtx.set(canvasVar, name)
      return [{ type: 'canvasSetup', canvasId, varName: name }]
    }
  }
  // getProperty: const x = el.textContent | el.value
  // (ou document.getElementById('id').textContent)
  const prop = matchGetProperty(init, ctx)
  if (prop) {
    return [{ type: 'getProperty', ...prop, varName: name }]
  }
  // getAttribute: const v = el.getAttribute('cx')
  const attr = matchGetAttribute(init, ctx)
  if (attr) {
    return [{ type: 'getAttribute', ...attr, varName: name }]
  }
  // newInstance: const x = new Classe(args) OU const x = new THREE.Classe(args)
  // (construtor de biblioteca importada). Date/Image têm tratamento próprio.
  if (init?.type === 'NewExpression') {
    const ctor = namespacedCtor(init.callee)
    if (
      ctor &&
      !(ctor.namespace === undefined && (ctor.className === 'Date' || ctor.className === 'Image'))
    ) {
      const args = (init.arguments ?? []).map((a: Node) => toExpr(a, ctx))
      if (args.every(isSimpleValue)) {
        ctx.instanceVars.add(name)
        return [
          {
            type: 'newInstance',
            varName: name,
            className: ctor.className,
            args: args as JSExpr[],
            ...(ctor.namespace ? { namespace: ctor.namespace } : {}),
          },
        ]
      }
    }
    return null
  }
  // game-2d: const s = SZGame2D.createSprite({...}) / const b = SZGame2D.isColliding(a, b)
  // / SZGame2D.circleCollides(a, b). Antes do cascade de literais.
  const g2dVar = tryMatchGame2DVarInit(name, init, ctx)
  if (g2dVar) return [g2dVar]
  // game-3d: const cena = SZGame3D.createScene("id") / const caixa = SZGame3D.createBox(cena, {...})
  // / const bola = SZGame3D.createSphere(cena, {...}). Também antes do cascade de literais.
  const g3dVar = tryMatchGame3DVarInit(name, init, ctx)
  if (g3dVar) return [g3dVar]
  // game-2d-advanced: const heroi = SZGameKit.createCharacter({...}).
  const gkVar = tryMatchGameKitVarInit(name, init, ctx)
  if (gkVar) return [gkVar]
  // game-3d-advanced: const heroi = SZGameKit3D.spawn(...) / nearest(...).
  const g3kVar = tryMatchGameKit3DVarInit(name, init, ctx)
  if (g3kVar) return [g3kVar]
  if (init == null) {
    // `let x;` — declaração sem valor inicial (sz_js_var_declare).
    return [{ type: 'declareVar', name }]
  }
  if (init.type === 'NumericLiteral' && Number.isFinite(init.value)) {
    // O guard `Number.isFinite` é essencial: `1e1000` é parseado como
    // `Infinity` e este atalho NÃO passa por `asRaw`. Sem ele, o valor não
    // finito vazaria como `num` e o gerador o reescreveria como `0` — então
    // deixamos cair no `else` genérico (toExpr → null → asRaw, texto preservado).
    return [{ type: 'var', name, value: { type: 'num', value: init.value }, ...kindField }]
  }
  if (init?.type === 'StringLiteral') {
    return [{ type: 'var', name, value: { type: 'str', value: init.value }, ...kindField }]
  }
  if (init?.type === 'BooleanLiteral') {
    return [{ type: 'var', name, value: { type: 'bool', value: init.value }, ...kindField }]
  }
  if (init?.type === 'NullLiteral') {
    return [{ type: 'var', name, value: { type: 'null' }, ...kindField }]
  }
  // Demais inicializadores (contas, Math.*, variável, etc.): viram um `var`
  // se o valor for representável por um bloco; senão preserva como avançado.
  const value = toExpr(init, ctx)
  if (isSimpleValue(value)) return [{ type: 'var', name, value, ...kindField }]
  return null
}

/** Sentinela: o callback tem parâmetro que NÃO dá para normalizar com segurança. */
const UNSAFE_EVENT_PARAM = Symbol('unsafe-event-param')

/**
 * O nó (subárvore Babel) contém um Identifier com este nome em posição que
 * inviabiliza o rename (re-declaração, parâmetro de função interna — shadowing —,
 * escrita) OU uma referência simples (`checkRefs`)? Caminhada genérica sobre o
 * AST (árvore, sem ciclos); conservador por design.
 */
function subtreeBlocksRename(node: Node, name: string, checkRefs: boolean): boolean {
  if (!node || typeof node !== 'object') return false
  if (Array.isArray(node)) return node.some((item) => subtreeBlocksRename(item, name, checkRefs))
  if (typeof node.type === 'string') {
    if (checkRefs && node.type === 'Identifier' && node.name === name) return true
    if (node.type === 'VariableDeclarator' && subtreeBlocksRename(node.id, name, true)) return true
    if (
      (node.type === 'FunctionDeclaration' ||
        node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression') &&
      subtreeBlocksRename(node.params, name, true)
    ) {
      return true
    }
    if (node.type === 'CatchClause' && subtreeBlocksRename(node.param, name, true)) return true
    if (
      node.type === 'AssignmentExpression' &&
      node.left?.type === 'Identifier' &&
      node.left.name === name
    ) {
      return true
    }
    if (
      node.type === 'UpdateExpression' &&
      node.argument?.type === 'Identifier' &&
      node.argument.name === name
    ) {
      return true
    }
  }
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'range' || key === 'leadingComments' || key === 'trailingComments')
      continue
    const child = node[key]
    if (child && typeof child === 'object' && subtreeBlocksRename(child, name, checkRefs)) {
      return true
    }
  }
  return false
}

/**
 * Decide o apelido do parâmetro do listener:
 * - sem parâmetro, ou já chamado `event` → null (nada a fazer);
 * - 1 parâmetro Identifier renomeável com segurança → o nome (empilhar);
 * - qualquer outro caso → UNSAFE_EVENT_PARAM (listener inteiro vira raw):
 *   2+ params/destructuring, corpo que re-declara/sombreia/escreve o nome,
 *   corpo que já usa o identificador `event` (colidiria após o rename) ou que
 *   referencia um apelido EXTERNO já empilhado (listener aninhado — o rename
 *   duplo trocaria o binding).
 */
function eventParamAlias(fn: Node, ctx: ParseCtx): string | null | typeof UNSAFE_EVENT_PARAM {
  const params = fn?.params ?? []
  if (params.length === 0) return null
  if (params.length > 1 || params[0]?.type !== 'Identifier') return UNSAFE_EVENT_PARAM
  const name: string = params[0].name
  if (name === 'event') return null
  if (subtreeBlocksRename(fn.body, name, false)) return UNSAFE_EVENT_PARAM
  if (subtreeBlocksRename(fn.body, 'event', true)) return UNSAFE_EVENT_PARAM
  for (const outer of ctx.eventParamAliases) {
    if (subtreeBlocksRename(fn.body, outer, true)) return UNSAFE_EVENT_PARAM
  }
  return name
}

type CompoundOp = '+' | '-' | '*' | '/' | '%'

/** Operadores compostos suportados → operador da conta expandida. */
const COMPOUND_OPS: Record<string, CompoundOp | undefined> = {
  '+=': '+',
  '-=': '-',
  '*=': '*',
  '/=': '/',
  '%=': '%',
}

/**
 * Expressão SEM efeito colateral que pode ser avaliada DUAS vezes: a expansão de
 * `obj.prop ⊕= v` em `obj.prop = obj.prop ⊕ v` lê e escreve o MESMO `obj` — se
 * `obj` fosse `pegaObjeto()`, a chamada rodaria em dobro e divergiria. Cadeias de
 * variável/this/literal/membro/índice sobre bases puras passam; chamada de
 * método/função não.
 */
function isPureChain(expr: JSExpr | null | undefined): boolean {
  if (!expr) return false
  switch (expr.type) {
    case 'var':
    case 'thisRef':
    case 'thisProp':
    case 'num':
    case 'str':
      return true
    case 'memberGet':
      return isPureChain(expr.object)
    case 'index':
      return isPureChain(expr.index)
    case 'indexGet':
      return isPureChain(expr.object) && isPureChain(expr.index)
    default:
      return false
  }
}

/**
 * Expande `alvo ⊕= right` (ou `alvo++`) no statement de escrita correspondente
 * com o valor `alvo ⊕ right`. Devolve null quando o alvo não é representável ou
 * não é PURO (avaliação dupla mudaria o comportamento) — o chamador cai em raw.
 * Os nós de LEITURA espelham exatamente o que o re-parse da forma expandida
 * produz (`index` p/ `arr[i]` com arr variável; `indexGet` p/ objeto-expressão),
 * garantindo o fixpoint blocos⇄código.
 */
function expandCompoundTarget(
  left: Node,
  op: CompoundOp,
  right: JSExpr,
  ctx: ParseCtx,
): JSStatement | null {
  const binop = (read: JSExpr): JSExpr => ({ type: 'binop', op, left: read, right })
  // x ⊕= v
  if (left?.type === 'Identifier') {
    const name: string = left.name
    return { type: 'assign', name, value: binop({ type: 'var', name }) }
  }
  const isMember = left?.type === 'MemberExpression' || left?.type === 'OptionalMemberExpression'
  if (!isMember || isGlobalObject(left.object)) return null
  // this.prop ⊕= v
  if (
    !left.computed &&
    left.object?.type === 'ThisExpression' &&
    left.property?.type === 'Identifier'
  ) {
    const name: string = left.property.name
    return { type: 'setThisProp', name, value: binop({ type: 'thisProp', name }) }
  }
  // obj.prop ⊕= v (obj puro: var, this.algo, cadeia de membros…)
  if (!left.computed && left.property?.type === 'Identifier') {
    const object = toExpr(left.object, ctx)
    if (!isSimpleValue(object) || !isPureChain(object)) return null
    const name: string = left.property.name
    return { type: 'memberSet', object, name, value: binop({ type: 'memberGet', object, name }) }
  }
  // obj[i] ⊕= v (obj e i puros)
  if (left.computed && left.property) {
    const object = toExpr(left.object, ctx)
    const index = toExpr(left.property, ctx)
    if (!isSimpleValue(object) || !isSimpleValue(index)) return null
    if (!isPureChain(object) || !isPureChain(index)) return null
    const read: JSExpr =
      object.type === 'var'
        ? { type: 'index', arrayVar: object.name, index }
        : { type: 'indexGet', object, index }
    return { type: 'indexSet', object, index, value: binop(read) }
  }
  return null
}

function mapExpressionStatement(node: Node, source: string, ctx: ParseCtx): JSStatement {
  const expr = node.expression
  // `await <valor>;` (statement) — ex.: `await Promise.all([...])` / `await new Promise(...)`.
  if (expr?.type === 'AwaitExpression') {
    const value = toExpr(expr.argument, ctx)
    return value && isSimpleValue(value) ? { type: 'awaitStmt', value } : asRaw(source, node)
  }
  // console.log(...)
  if (
    expr?.type === 'CallExpression' &&
    expr.callee?.type === 'MemberExpression' &&
    expr.callee.object?.name === 'console' &&
    expr.callee.property?.name === 'log' &&
    expr.arguments?.length === 1
  ) {
    const arg = expr.arguments[0]
    if (arg.type === 'StringLiteral') {
      return { type: 'consoleLog', value: { type: 'str', value: arg.value } }
    }
    // Number.isFinite: 1e1000 (Infinity) serializa como null e o gerador o
    // emitiria como 0 — cai no asRaw para preservar o texto original (ver #17).
    if (arg.type === 'NumericLiteral' && Number.isFinite(arg.value)) {
      return { type: 'consoleLog', value: { type: 'num', value: arg.value } }
    }
    if (arg.type === 'Identifier') {
      return { type: 'consoleLog', value: { type: 'var', name: arg.name } }
    }
    // Qualquer OUTRO valor representável (juntar texto `${}`, conta, objeto,
    // this.prop…) → console.log com soquete de valor. Não-representável → raw.
    const value = toExpr(arg, ctx)
    if (isSimpleValue(value)) return { type: 'consoleLog', value: value as JSExpr }
    return asRaw(source, node)
  }

  // alert(...)
  if (
    expr?.type === 'CallExpression' &&
    expr.callee?.type === 'Identifier' &&
    expr.callee.name === 'alert' &&
    expr.arguments?.length === 1
  ) {
    const arg = expr.arguments[0]
    if (arg.type === 'StringLiteral') {
      return { type: 'alert', value: { type: 'str', value: arg.value } }
    }
    if (arg.type === 'NumericLiteral' && Number.isFinite(arg.value)) {
      return { type: 'alert', value: { type: 'num', value: arg.value } }
    }
    if (arg.type === 'Identifier') {
      return { type: 'alert', value: { type: 'var', name: arg.name } }
    }
    return asRaw(source, node)
  }

  // Canvas 3D: `document.body.appendChild(renderer.domElement);` → mountRenderer.
  // (`document.body` é global denylistado, então NÃO cai no memberCall genérico;
  // sem este matcher vira "código avançado". Só a forma exata `<var>.domElement`.)
  if (
    expr?.type === 'CallExpression' &&
    expr.callee?.type === 'MemberExpression' &&
    !expr.callee.computed &&
    expr.callee.property?.name === 'appendChild' &&
    expr.callee.object?.type === 'MemberExpression' &&
    !expr.callee.object.computed &&
    expr.callee.object.object?.type === 'Identifier' &&
    expr.callee.object.object.name === 'document' &&
    expr.callee.object.property?.name === 'body' &&
    expr.arguments?.length === 1
  ) {
    const arg = expr.arguments[0]
    if (
      arg?.type === 'MemberExpression' &&
      !arg.computed &&
      arg.object?.type === 'Identifier' &&
      arg.property?.name === 'domElement'
    ) {
      return { type: 'mountRenderer', renderer: arg.object.name as string }
    }
  }

  // Canvas 3D: `loader.load(url, (modelo) => { … });` → loaderLoad (carregar um
  // recurso async: modelo GLTF, textura, HDR…). Forma exata: 2 args, o 2º um
  // arrow/função com 1 parâmetro. (GLTFLoader.load com onProgress/onError — 4
  // args — segue como código avançado.)
  if (
    expr?.type === 'CallExpression' &&
    expr.callee?.type === 'MemberExpression' &&
    !expr.callee.computed &&
    expr.callee.object?.type === 'Identifier' &&
    expr.callee.property?.name === 'load' &&
    expr.arguments?.length === 2 &&
    (expr.arguments[1]?.type === 'ArrowFunctionExpression' ||
      expr.arguments[1]?.type === 'FunctionExpression')
  ) {
    // URL só STRING literal (é o NOME do asset no campo seletor do bloco). Um url
    // variável/expressão segue como código avançado (o bloco é um seletor, não
    // aceita expressão) — round-trip fiel com o `field_asset_picker`.
    const urlArg = expr.arguments[0]
    const fn = expr.arguments[1]
    const params = fn.params ?? []
    if (
      urlArg?.type === 'StringLiteral' &&
      params.length === 1 &&
      params[0]?.type === 'Identifier'
    ) {
      return {
        type: 'loaderLoad',
        loaderVar: expr.callee.object.name as string,
        url: { type: 'str', value: urlArg.value as string },
        param: params[0].name as string,
        body: bodyOfFn(fn, source, ctx),
      }
    }
  }

  // Canvas 3D: `objeto.traverse((parte) => { … });` → traverseEach (percorrer cada
  // parte de um objeto/modelo). Forma exata: 1 arg, um arrow/função com 1 parâmetro.
  // O objeto pode ser variável (modelo) OU propriedade (modelo.scene) — qualquer
  // valor simples. Precede o matcher genérico de método (que rejeitaria o callback).
  if (
    expr?.type === 'CallExpression' &&
    expr.callee?.type === 'MemberExpression' &&
    !expr.callee.computed &&
    expr.callee.property?.name === 'traverse' &&
    expr.arguments?.length === 1 &&
    (expr.arguments[0]?.type === 'ArrowFunctionExpression' ||
      expr.arguments[0]?.type === 'FunctionExpression')
  ) {
    const fn = expr.arguments[0]
    const params = fn.params ?? []
    if (params.length === 1 && params[0]?.type === 'Identifier') {
      const object = toExpr(expr.callee.object, ctx)
      if (isSimpleValue(object)) {
        return {
          type: 'traverseEach',
          object,
          param: params[0].name as string,
          body: bodyOfFn(fn, source, ctx),
        }
      }
    }
  }

  if (expr?.type === 'AssignmentExpression' && expr.operator === '=') {
    // this.X = v → setThisProp (dentro de método/construtor).
    if (
      (expr.left?.type === 'MemberExpression' || expr.left?.type === 'OptionalMemberExpression') &&
      !expr.left.computed &&
      expr.left.object?.type === 'ThisExpression' &&
      expr.left.property?.type === 'Identifier'
    ) {
      const value = toExpr(expr.right, ctx)
      if (isSimpleValue(value)) return { type: 'setThisProp', name: expr.left.property.name, value }
      return asRaw(source, node)
    }
    // ctx.fillStyle = <cor> (cor é string; ctx precisa ser um contexto conhecido)
    if (
      (expr.left?.type === 'MemberExpression' || expr.left?.type === 'OptionalMemberExpression') &&
      expr.left.property?.name === 'fillStyle' &&
      expr.left.object?.type === 'Identifier' &&
      ctx.ctxVars.has(expr.left.object.name)
    ) {
      // `toExpr` já normaliza string hexadecimal → `color` e identificador → `var`.
      const color = toExpr(expr.right)
      if (color) return { type: 'canvasFillStyle', ctxVar: expr.left.object.name, color }
      return asRaw(source, node)
    }
    // ctx.strokeStyle / lineWidth / globalAlpha / textAlign / font = … (caminho "na mão")
    if (
      (expr.left?.type === 'MemberExpression' || expr.left?.type === 'OptionalMemberExpression') &&
      !expr.left.computed &&
      expr.left.object?.type === 'Identifier' &&
      ctx.ctxVars.has(expr.left.object.name) &&
      typeof expr.left.property?.name === 'string'
    ) {
      const ctxVar: string = expr.left.object.name
      const prop: string = expr.left.property.name
      if (prop === 'strokeStyle') {
        const color = toExpr(expr.right, ctx)
        if (isSimpleValue(color)) return { type: 'canvasStrokeStyle', ctxVar, color }
        return asRaw(source, node)
      }
      if (prop === 'lineWidth') {
        const width = toExpr(expr.right, ctx)
        if (isSimpleValue(width)) return { type: 'canvasLineWidth', ctxVar, width }
        return asRaw(source, node)
      }
      if (prop === 'globalAlpha') {
        const alpha = toExpr(expr.right, ctx)
        if (isSimpleValue(alpha)) return { type: 'canvasGlobalAlpha', ctxVar, alpha }
        return asRaw(source, node)
      }
      if (prop === 'textAlign' && expr.right?.type === 'StringLiteral') {
        const a = expr.right.value as string
        if (a === 'left' || a === 'center' || a === 'right') {
          return { type: 'canvasTextAlign', ctxVar, align: a }
        }
        return asRaw(source, node)
      }
      if (prop === 'textBaseline' && expr.right?.type === 'StringLiteral') {
        const b = expr.right.value as string
        if (b === 'top' || b === 'middle' || b === 'bottom' || b === 'alphabetic') {
          return { type: 'canvasTextBaseline', ctxVar, baseline: b }
        }
        return asRaw(source, node)
      }
      if (prop === 'font' && expr.right?.type === 'StringLiteral') {
        const m = /^(?:(bold|italic|italic bold) )?(\d+)px (.+)$/.exec(expr.right.value as string)
        if (m?.[2] && m[3]) {
          const base = { type: 'canvasFont' as const, ctxVar, size: Number(m[2]), family: m[3] }
          return m[1] ? { ...base, weight: m[1] as 'bold' | 'italic' | 'italic bold' } : base
        }
        return asRaw(source, node)
      }
    }
    // el.dataset.chave = <simples>
    const dataset = tryMatchSetDataset(expr, ctx)
    if (dataset) return dataset
    // el.style.prop = <simples>  |  el.style['prop'] = <simples>
    const style = tryMatchSetStyle(expr, ctx)
    if (style) return style
    // x.textContent = <simples> | x.value = <simples> | x.innerHTML = <simples>
    // (ou document.getElementById('id').textContent = …)
    if (
      (expr.left?.type === 'MemberExpression' || expr.left?.type === 'OptionalMemberExpression') &&
      (expr.left.property?.name === 'textContent' ||
        expr.left.property?.name === 'value' ||
        expr.left.property?.name === 'innerHTML')
    ) {
      const property = expr.left.property.name as 'textContent' | 'value' | 'innerHTML'
      const target = extractTarget(expr.left.object, ctx)
      const value = toExpr(expr.right, ctx)
      if (target && value) {
        return {
          type: 'setProperty',
          targetId: target.id,
          ...targetKindField(target),
          property,
          value,
        }
      }
      return asRaw(source, node)
    }
    // <img>.onload = () => {…} → imageOnLoad ("quando a imagem carregar, fazer …").
    // Só a arrow/função SEM parâmetros (o gerador re-emite `() =>`); com parâmetro
    // (`(e) => …`) cai no avançado p/ não perder o argumento.
    if (
      (expr.left?.type === 'MemberExpression' || expr.left?.type === 'OptionalMemberExpression') &&
      !expr.left.computed &&
      expr.left.property?.type === 'Identifier' &&
      expr.left.property.name === 'onload' &&
      (expr.right?.type === 'ArrowFunctionExpression' ||
        expr.right?.type === 'FunctionExpression') &&
      (expr.right.params?.length ?? 0) === 0 &&
      !isGlobalObject(expr.left.object)
    ) {
      const target = toExpr(expr.left.object, ctx)
      if (target && isSimpleValue(target)) {
        return { type: 'imageOnLoad', target, body: bodyOfFn(expr.right, source, ctx) }
      }
      return asRaw(source, node)
    }
    // <img>.onerror = () => {…} → imageOnError ("se a imagem falhar, fazer …").
    // Mesma regra do onload: só a arrow/função SEM parâmetros.
    if (
      (expr.left?.type === 'MemberExpression' || expr.left?.type === 'OptionalMemberExpression') &&
      !expr.left.computed &&
      expr.left.property?.type === 'Identifier' &&
      expr.left.property.name === 'onerror' &&
      (expr.right?.type === 'ArrowFunctionExpression' ||
        expr.right?.type === 'FunctionExpression') &&
      (expr.right.params?.length ?? 0) === 0 &&
      !isGlobalObject(expr.left.object)
    ) {
      const target = toExpr(expr.left.object, ctx)
      if (target && isSimpleValue(target)) {
        return { type: 'imageOnError', target, body: bodyOfFn(expr.right, source, ctx) }
      }
      return asRaw(source, node)
    }
    // <el>.onclick = () => {…} → onClickAssign ("quando clicar em <el>, fazer …").
    // Mesma regra: só arrow/função SEM parâmetros (o gerador re-emite `() =>`);
    // corpo conciso `() => f()` é normalizado p/ bloco (via bodyOfFn).
    if (
      (expr.left?.type === 'MemberExpression' || expr.left?.type === 'OptionalMemberExpression') &&
      !expr.left.computed &&
      expr.left.property?.type === 'Identifier' &&
      expr.left.property.name === 'onclick' &&
      (expr.right?.type === 'ArrowFunctionExpression' ||
        expr.right?.type === 'FunctionExpression') &&
      (expr.right.params?.length ?? 0) === 0 &&
      !isGlobalObject(expr.left.object)
    ) {
      const target = toExpr(expr.left.object, ctx)
      if (target && isSimpleValue(target)) {
        return { type: 'onClickAssign', target, body: bodyOfFn(expr.right, source, ctx) }
      }
      return asRaw(source, node)
    }
    // Geral: <obj>.prop = v sobre qualquer objeto representável. Cobre instância
    // (`p.x = v`) e aninhamento (`this.velocidade.x = v`). Roda DEPOIS dos matchers
    // específicos (fillStyle, dataset, textContent) e dos pares de canvas (consumidos
    // antes em mapStatementList).
    if (
      (expr.left?.type === 'MemberExpression' || expr.left?.type === 'OptionalMemberExpression') &&
      !expr.left.computed &&
      expr.left.property?.type === 'Identifier' &&
      !isGlobalObject(expr.left.object)
    ) {
      const object = toExpr(expr.left.object, ctx)
      const value = toExpr(expr.right, ctx)
      if (isSimpleValue(object) && isSimpleValue(value)) {
        return { type: 'memberSet', object, name: expr.left.property.name, value }
      }
      return asRaw(source, node)
    }
    // <obj>[chave] = v / <lista>[i] = v → indexSet (escrita por chave/índice).
    // O `el.style['prop']` computado já foi consumido acima por tryMatchSetStyle.
    if (
      (expr.left?.type === 'MemberExpression' || expr.left?.type === 'OptionalMemberExpression') &&
      expr.left.computed &&
      !isGlobalObject(expr.left.object)
    ) {
      const object = toExpr(expr.left.object, ctx)
      const index = toExpr(expr.left.property, ctx)
      const value = toExpr(expr.right, ctx)
      if (isSimpleValue(object) && isSimpleValue(index) && isSimpleValue(value)) {
        return { type: 'indexSet', object, index, value }
      }
      return asRaw(source, node)
    }
    // x = expr — qualquer valor representável por um bloco (num, texto, conta,
    // variável, chamada de função, etc.). `x = x + n` é reconvertido em bloco de
    // incremento por workspaceState.incrementExpr.
    if (expr.left?.type === 'Identifier') {
      const name: string = expr.left.name
      const value = toExpr(expr.right, ctx)
      if (isSimpleValue(value)) return { type: 'assign', name, value }
      return asRaw(source, node)
    }
    return asRaw(source, node)
  }

  // Atribuição composta (⊕=) sobre variável, this.prop, obj.prop e obj[i]:
  // expande para `alvo = alvo ⊕ v` — os MESMOS nós que os blocos montam
  // (assign/setThisProp/memberSet/indexSet + conta). O gerador já emite a forma
  // expandida, então o round-trip é estável a partir do 2º ciclo. Era a maior
  // fonte de rawJS em jogos com classes ("tiro parado": `this.y -= this.speed`).
  if (expr?.type === 'AssignmentExpression' && COMPOUND_OPS[expr.operator]) {
    const op = COMPOUND_OPS[expr.operator] as CompoundOp
    const right = toExpr(expr.right, ctx)
    if (isSimpleValue(right)) {
      const stmt = expandCompoundTarget(expr.left, op, right, ctx)
      if (stmt) return stmt
    }
    return asRaw(source, node)
  }

  // x++ / x-- (e this.prop++ / obj.prop++ / arr[i]++) → alvo = alvo ± 1.
  if (expr?.type === 'UpdateExpression') {
    const stmt = expandCompoundTarget(
      expr.argument,
      expr.operator === '++' ? '+' : '-',
      { type: 'num', value: 1 },
      ctx,
    )
    if (stmt) return stmt
    return asRaw(source, node)
  }

  // document.getElementById('x')?.addEventListener('event', cb)  (ou via variável)
  const evt = tryMatchEventListener(expr, ctx)
  if (evt) {
    // Listener apontando para uma função nomeada → eventHandler.
    if (evt.handlerName) {
      return {
        type: 'eventHandler',
        target: evt.target,
        ...(evt.targetKind ? { targetKind: evt.targetKind } : {}),
        event: evt.event,
        handlerName: evt.handlerName,
      }
    }
    // Param do callback com outro nome (`e => e.key`): normaliza p/ `event`
    // durante o corpo (o gerador SEMPRE emite `(event) =>`). Inseguro
    // (shadowing/escrita/colisão/2 params) → rawJS verbatim: estritamente mais
    // correto que o comportamento antigo (blocos que regeneravam `e` órfão).
    const alias = eventParamAlias(evt.callback, ctx)
    if (alias === UNSAFE_EVENT_PARAM) return asRaw(source, node)
    if (alias) ctx.eventParamAliases.push(alias)
    try {
      const bodyStmts = bodyOfFn(evt.callback, source, ctx)
      return {
        type: 'event',
        target: evt.target,
        ...(evt.targetKind ? { targetKind: evt.targetKind } : {}),
        event: evt.event,
        body: bodyStmts,
      }
    } finally {
      if (alias) ctx.eventParamAliases.pop()
    }
  }

  // localStorage.setItem(chave, valor) / sessionStorage.setItem(...)
  const storageSet = tryMatchStorageSet(expr, ctx)
  if (storageSet) return storageSet

  // event.preventDefault() / event.stopPropagation()
  const eventMethod = tryMatchEventMethod(expr, ctx)
  if (eventMethod) return eventMethod

  // fetch(url).then(r => r.json()).then((dados) => {…}).catch((erro) => {…})
  const fetchJson = tryMatchFetchJson(expr, source, ctx)
  if (fetchJson) return fetchJson

  // document.getElementById('x')?.classList.{add|remove|toggle}('cls')  (ou via variável)
  const cls = tryMatchClassList(expr, ctx)
  if (cls) {
    return {
      type: 'classOp',
      targetId: cls.target,
      ...(cls.targetKind ? { targetKind: cls.targetKind } : {}),
      op: cls.op,
      className: cls.className,
    }
  }

  // el.setAttribute('nome', <simples>)
  const setAttr = tryMatchSetAttribute(expr, ctx)
  if (setAttr) return setAttr

  // cancelAnimationFrame(id) — para o loop de animação.
  const cancelAnim = tryMatchCancelAnimationFrame(expr, ctx)
  if (cancelAnim) return cancelAnim

  // document.documentElement.requestFullscreen() / document.exitFullscreen()
  const fullscreen = tryMatchFullscreen(expr)
  if (fullscreen) return fullscreen

  // Métodos de canvas de uma linha: ctx.fillRect(...), ctx.save(), etc.
  const canvasCall = tryMatchCanvasCall(expr, ctx)
  if (canvasCall) return canvasCall

  // lista.push(valor) / lista.pop() / lista.shift()
  const arrayOp = tryMatchArrayOp(expr, ctx)
  if (arrayOp) return arrayOp

  // pai.appendChild(filho)
  const append = tryMatchAppendChild(expr, ctx)
  if (append) return append

  // Object.assign(destino, origem)
  if (
    expr?.type === 'CallExpression' &&
    expr.callee?.type === 'MemberExpression' &&
    !expr.callee.computed &&
    expr.callee.object?.name === 'Object' &&
    expr.callee.property?.name === 'assign' &&
    expr.arguments?.length === 2 &&
    expr.arguments[0].type === 'Identifier' &&
    expr.arguments[1].type === 'Identifier'
  ) {
    return {
      type: 'objectAssign',
      targetVar: expr.arguments[0].name,
      sourceVar: expr.arguments[1].name,
    }
  }

  // lista.forEach((item, i) => { … })
  const forEach = tryMatchForEach(expr, source, ctx)
  if (forEach) return forEach

  // setTimeout(() => { … }, ms)
  const timeout = tryMatchSetTimeout(expr, source, ctx)
  if (timeout) return timeout

  // setTimeout(<fn>, ms) passando uma FUNÇÃO por nome (ex.: setTimeout(resolve, 2000)).
  if (
    expr?.type === 'CallExpression' &&
    expr.callee?.type === 'Identifier' &&
    expr.callee.name === 'setTimeout' &&
    expr.arguments?.length === 2 &&
    expr.arguments[0].type === 'Identifier'
  ) {
    const delay = toExpr(expr.arguments[1], ctx)
    if (delay && isSimpleValue(delay)) {
      return { type: 'setTimeoutCall', fn: expr.arguments[0].name, delay }
    }
  }

  // setInterval(() => { … }, ms)
  const interval = tryMatchSetInterval(expr, source, ctx)
  if (interval) return interval

  // game-2d: SZGame2D.gameLoop(function update(){…}) / onPointer((px,py)=>{…}) e
  // helpers de uma linha (drawSprite, applyVelocity, bounceOnEdges, setGravity,
  // playSound). ANTES do método genérico — senão viram memberCall.
  const g2dCall = tryMatchGame2DCall(expr, source, ctx)
  if (g2dCall) return g2dCall

  // game-3d: SZGame3D.animate(cena, () => {…}) e helpers de uma linha
  // (setBackground, setCameraPosition, setPosition, setRotation). Idem: ANTES do
  // método genérico — senão viram memberCall.
  const g3dCall = tryMatchGame3DCall(expr, source, ctx)
  if (g3dCall) return g3dCall

  // game-2d-advanced: SZGameKit.setup/start/telas/estados/ganchos/personagens.
  // Idem: ANTES do método genérico.
  const gkCall = tryMatchGameKitCall(expr, source, ctx)
  if (gkCall) return gkCall

  // game-3d-advanced: SZGameKit3D.* (mundo/moldes/FSM/telas). ANTES do genérico.
  const g3kCall = tryMatchGameKit3DCall(expr, source, ctx)
  if (g3kCall) return g3kCall

  // world-3d: SZWorld3D.* (mundo aberto/carrinho/natureza). ANTES do genérico.
  const w3dCall = tryMatchWorld3DCall(expr, source, ctx)
  if (w3dCall) return w3dCall

  // super(args) — chama o construtor da classe-mãe (dentro do construtor filho).
  if (expr?.type === 'CallExpression' && expr.callee?.type === 'Super') {
    const args = (expr.arguments ?? []).map((a: Node) => toExpr(a, ctx))
    if (args.every(isSimpleValue)) return { type: 'superCall', args: args as JSExpr[] }
    return asRaw(source, node)
  }
  // super.metodo(args) — chama um método da classe-mãe.
  if (
    expr?.type === 'CallExpression' &&
    expr.callee?.type === 'MemberExpression' &&
    !expr.callee.computed &&
    expr.callee.object?.type === 'Super' &&
    expr.callee.property?.type === 'Identifier'
  ) {
    const args = (expr.arguments ?? []).map((a: Node) => toExpr(a, ctx))
    if (args.every(isSimpleValue)) {
      return { type: 'superMethodCall', method: expr.callee.property.name, args: args as JSExpr[] }
    }
    return asRaw(source, node)
  }
  // requestAnimationFrame(nome) — pede o próximo quadro chamando uma função. ANTES
  // dos matchers de chamada (o nome está no denylist global e viraria rawJS). A
  // função é uma REFERÊNCIA (Identifier), não uma chamada.
  if (
    expr?.type === 'CallExpression' &&
    expr.callee?.type === 'Identifier' &&
    expr.callee.name === 'requestAnimationFrame' &&
    expr.arguments?.length === 1 &&
    expr.arguments[0]?.type === 'Identifier'
  ) {
    return { type: 'requestFrame', fn: expr.arguments[0].name as string }
  }
  // requestAnimationFrame((t) => {…}) — corpo inline com o tempo do quadro. Aceita
  // 0 ou 1 parâmetro Identifier; corpo conciso ou em bloco (bodyOfFn cobre os dois).
  if (
    expr?.type === 'CallExpression' &&
    expr.callee?.type === 'Identifier' &&
    expr.callee.name === 'requestAnimationFrame' &&
    expr.arguments?.length === 1 &&
    (expr.arguments[0]?.type === 'ArrowFunctionExpression' ||
      expr.arguments[0]?.type === 'FunctionExpression')
  ) {
    const fn = expr.arguments[0]
    const params = fn.params ?? []
    const paramsOk =
      params.length === 0 || (params.length === 1 && params[0]?.type === 'Identifier')
    if (paramsOk) {
      const param = params.length === 1 ? (params[0].name as string) : undefined
      return {
        type: 'requestFrameDo',
        ...(param ? { param } : {}),
        body: bodyOfFn(fn, source, ctx),
      }
    }
  }
  // cond ? A : B; (ternário usado como STATEMENT, com atribuições nos ramos) →
  // if (cond) { A } else { B }. Normalização didática (comportamento idêntico); a
  // volta produz um bloco Se/senão. Cada ramo é remapeado como statement.
  if (expr?.type === 'ConditionalExpression') {
    const cond = toExpr(expr.test, ctx)
    if (isSimpleValue(cond)) {
      const branch = (b: Node): JSStatement =>
        mapExpressionStatement(
          { type: 'ExpressionStatement', expression: b, ...spanOf(b) },
          source,
          ctx,
        )
      return {
        type: 'if',
        cond: cond as JSExpr,
        then: [branch(expr.consequent)],
        else: [branch(expr.alternate)],
      }
    }
    return asRaw(source, node)
  }

  // objeto.metodo(args) — chamada de método de um objeto guardado em variável.
  const methodCall = tryMatchMethodCall(expr, ctx)
  if (methodCall) return methodCall

  // nome(args) — chamada de uma função do aluno como comando.
  const fnCall = tryMatchFunctionCall(expr, ctx)
  if (fnCall) return fnCall

  // Último recurso ANTES do avançado: um statement que só AVALIA um valor e
  // descarta (`this.game.gameOver;` — no-op). Bloco OCULTO, só p/ round-trip fiel.
  if (expr && isExpressionNode(expr)) {
    const value = toExpr(expr, ctx)
    if (isSimpleValue(value)) return { type: 'exprStatement', value: value as JSExpr }
  }

  return asRaw(source, node)
}

/** Posições de origem de um nó Babel (start/end/loc/range) para o span sintético. */
function spanOf(node: Node): Record<string, unknown> {
  return { start: node?.start, end: node?.end, loc: node?.loc, range: node?.range }
}

/** É um nó de EXPRESSÃO (não um statement)? Guarda do `exprStatement` fallback. */
function isExpressionNode(node: Node): boolean {
  const t = node?.type
  return (
    t === 'MemberExpression' ||
    t === 'OptionalMemberExpression' ||
    t === 'Identifier' ||
    t === 'ThisExpression'
  )
}

/** `document.createElement('tag')` → nome da tag; senão `null`. */
function matchCreateElement(node: Node): string | null {
  if (node?.type !== 'CallExpression') return null
  const callee = node.callee
  if (callee?.type !== 'MemberExpression' || callee.computed) return null
  if (callee.object?.name !== 'document' || callee.property?.name !== 'createElement') return null
  if (node.arguments?.length !== 1 || node.arguments[0].type !== 'StringLiteral') return null
  return node.arguments[0].value as string
}

/** `document.createElementNS(<ns>, 'tag')` → nome da tag (forma SVG); senão `null`. */
function matchCreateElementNS(node: Node): string | null {
  if (node?.type !== 'CallExpression') return null
  const callee = node.callee
  if (callee?.type !== 'MemberExpression' || callee.computed) return null
  if (callee.object?.name !== 'document' || callee.property?.name !== 'createElementNS') return null
  if (node.arguments?.length !== 2 || node.arguments[1].type !== 'StringLiteral') return null
  return node.arguments[1].value as string
}

/** `pai.appendChild(filho)` (ambos identificadores) → `appendChild`. */
function tryMatchAppendChild(expr: Node, ctx: ParseCtx): JSStatement | null {
  if (expr?.type !== 'CallExpression') return null
  const callee = expr.callee
  if (callee?.type !== 'MemberExpression' || callee.computed) return null
  if (callee.object?.type !== 'Identifier' || callee.property?.name !== 'appendChild') return null
  if (ctx.instanceVars.has(callee.object.name)) return null
  if (expr.arguments?.length !== 1 || expr.arguments[0].type !== 'Identifier') return null
  return {
    type: 'appendChild',
    parentVar: callee.object.name,
    childVar: expr.arguments[0].name,
  }
}

// ---------- Tela cheia (Fullscreen API) ----------

/** `document.exitFullscreen()` (sem argumentos). */
function isExitFullscreenCall(expr: Node): boolean {
  if (expr?.type !== 'CallExpression' && expr?.type !== 'OptionalCallExpression') return false
  if (expr.arguments?.length) return false
  const callee = expr.callee
  if (
    (callee?.type !== 'MemberExpression' && callee?.type !== 'OptionalMemberExpression') ||
    callee.computed
  ) {
    return false
  }
  return (
    callee.object?.type === 'Identifier' &&
    callee.object.name === 'document' &&
    callee.property?.name === 'exitFullscreen'
  )
}

/** `document.documentElement.requestFullscreen()` (sem argumentos). */
function isRequestFullscreenCall(expr: Node): boolean {
  if (expr?.type !== 'CallExpression' && expr?.type !== 'OptionalCallExpression') return false
  if (expr.arguments?.length) return false
  const callee = expr.callee
  if (
    (callee?.type !== 'MemberExpression' && callee?.type !== 'OptionalMemberExpression') ||
    callee.computed ||
    callee.property?.name !== 'requestFullscreen'
  ) {
    return false
  }
  const obj = callee.object
  return (
    (obj?.type === 'MemberExpression' || obj?.type === 'OptionalMemberExpression') &&
    !obj.computed &&
    obj.object?.type === 'Identifier' &&
    obj.object.name === 'document' &&
    obj.property?.name === 'documentElement'
  )
}

/**
 * `document.documentElement.requestFullscreen()` → entrar em tela cheia;
 * `document.exitFullscreen()` → sair. (O "alternar" é um if/else casado em `mapIf`.)
 */
function tryMatchFullscreen(expr: Node): JSStatement | null {
  if (isExitFullscreenCall(expr)) return { type: 'exitFullscreen' }
  if (isRequestFullscreenCall(expr)) return { type: 'requestFullscreen' }
  return null
}

/** Desembrulha um bloco de UM statement (ou um statement solto) e testa a chamada. */
function isSingleCallStatement(node: Node, pred: (expr: Node) => boolean): boolean {
  let stmt: Node | null = node
  if (node?.type === 'BlockStatement') {
    if (node.body?.length !== 1) return false
    stmt = node.body[0]
  }
  return stmt?.type === 'ExpressionStatement' && pred(stmt.expression)
}

/**
 * `if (document.fullscreenElement) { document.exitFullscreen() } else {
 * document.documentElement.requestFullscreen() }` → "alternar tela cheia". Roda
 * ANTES do if genérico (que tornaria a condição em código avançado, pois
 * `document` é objeto global).
 */
function tryMatchToggleFullscreen(node: Node): JSStatement | null {
  if (node?.type !== 'IfStatement' || !node.alternate) return null
  const test = node.test
  if (
    (test?.type !== 'MemberExpression' && test?.type !== 'OptionalMemberExpression') ||
    test.computed ||
    test.object?.type !== 'Identifier' ||
    test.object.name !== 'document' ||
    test.property?.name !== 'fullscreenElement'
  ) {
    return null
  }
  if (!isSingleCallStatement(node.consequent, isExitFullscreenCall)) return null
  if (!isSingleCallStatement(node.alternate, isRequestFullscreenCall)) return null
  return { type: 'toggleFullscreen' }
}

/** `document.fullscreenElement != null` (ou `!== null`) → "está em tela cheia?". */
function tryMatchIsFullscreen(node: Node): JSExpr | null {
  if (node?.type !== 'BinaryExpression') return null
  if (node.operator !== '!=' && node.operator !== '!==') return null
  if (node.right?.type !== 'NullLiteral') return null
  const left = node.left
  if (
    (left?.type !== 'MemberExpression' && left?.type !== 'OptionalMemberExpression') ||
    left.computed ||
    left.object?.type !== 'Identifier' ||
    left.object.name !== 'document' ||
    left.property?.name !== 'fullscreenElement'
  ) {
    return null
  }
  return { type: 'isFullscreen' }
}

/** `<alvo>.dataset.chave = <simples>` → `setDataset`; senão `null`. */
function tryMatchSetDataset(expr: Node, ctx: ParseCtx): JSStatement | null {
  const left = expr.left
  if (
    !left ||
    (left.type !== 'MemberExpression' && left.type !== 'OptionalMemberExpression') ||
    left.computed ||
    left.property?.type !== 'Identifier'
  ) {
    return null
  }
  const obj = left.object
  if (!obj || (obj.type !== 'MemberExpression' && obj.type !== 'OptionalMemberExpression')) {
    return null
  }
  if (obj.property?.name !== 'dataset') return null
  const target = extractTarget(obj.object, ctx)
  if (!target) return null
  const value = toExpr(expr.right, ctx)
  if (!isSimpleValue(value)) return null
  return {
    type: 'setDataset',
    targetId: target.id,
    ...targetKindField(target),
    key: left.property.name,
    value,
  }
}

/** `<alvo>.style.prop = <simples>` / `<alvo>.style['prop'] = <simples>` → `setStyle`. */
function tryMatchSetStyle(expr: Node, ctx: ParseCtx): JSStatement | null {
  const left = expr.left
  if (!left || (left.type !== 'MemberExpression' && left.type !== 'OptionalMemberExpression')) {
    return null
  }
  const obj = left.object
  if (!obj || (obj.type !== 'MemberExpression' && obj.type !== 'OptionalMemberExpression')) {
    return null
  }
  if (obj.property?.name !== 'style') return null
  let property: string | null = null
  if (!left.computed && left.property?.type === 'Identifier')
    property = left.property.name as string
  else if (left.computed && left.property?.type === 'StringLiteral')
    property = left.property.value as string
  if (!property) return null
  const target = extractTarget(obj.object, ctx)
  if (!target) return null
  const value = toExpr(expr.right, ctx)
  if (!isSimpleValue(value)) return null
  return {
    type: 'setStyle',
    targetId: target.id,
    ...classTargetKindField(target),
    property,
    value,
  }
}

/** `<alvo>.setAttribute('nome', <simples>)` → `setAttribute`. */
function tryMatchSetAttribute(expr: Node, ctx: ParseCtx): JSStatement | null {
  if (!expr || (expr.type !== 'CallExpression' && expr.type !== 'OptionalCallExpression')) {
    return null
  }
  const callee = expr.callee
  if (
    !callee ||
    (callee.type !== 'MemberExpression' && callee.type !== 'OptionalMemberExpression')
  ) {
    return null
  }
  if (callee.property?.name !== 'setAttribute') return null
  const target = extractTarget(callee.object, ctx)
  if (!target) return null
  if (expr.arguments?.length !== 2 || expr.arguments[0].type !== 'StringLiteral') return null
  const value = toExpr(expr.arguments[1], ctx)
  if (!isSimpleValue(value)) return null
  return {
    type: 'setAttribute',
    targetId: target.id,
    ...classTargetKindField(target),
    name: expr.arguments[0].value as string,
    value,
  }
}

/** `<lista>.forEach((item[, i]) => { … })` → `forEach`. A LISTA pode ser qualquer
 * expressão representável (variável, `Object.keys(x)`, `obj.lista`, `this.itens`…). */
function tryMatchForEach(expr: Node, source: string, ctx: ParseCtx): JSStatement | null {
  if (expr?.type !== 'CallExpression') return null
  const callee = expr.callee
  if (callee?.type !== 'MemberExpression' || callee.computed) return null
  if (callee.property?.name !== 'forEach') return null
  // Instância de classe conhecida com um `forEach` PRÓPRIO não é iteração de lista.
  if (callee.object?.type === 'Identifier' && ctx.instanceVars.has(callee.object.name)) return null
  if (expr.arguments?.length !== 1) return null
  const cb = expr.arguments[0]
  if (cb.type !== 'ArrowFunctionExpression' && cb.type !== 'FunctionExpression') return null
  const params = cb.params ?? []
  if (params.length < 1 || params.length > 2) return null
  if (!params.every((p: Node) => p?.type === 'Identifier')) return null
  const arrayExpr = toExpr(callee.object, ctx)
  if (!arrayExpr || !isSimpleValue(arrayExpr)) return null
  const itemName: string = params[0].name
  const indexName: string | undefined = params[1]?.name
  const body = bodyOfFn(cb, source, ctx)
  return {
    type: 'forEach',
    arrayExpr,
    itemName,
    ...(indexName ? { indexName } : {}),
    body,
  }
}

/**
 * Lê o argumento de atraso de um timer, distinguindo SEGUNDOS de milissegundos.
 * O bloco "em segundos" gera `<E> * 1000`; quando o AST do atraso é exatamente
 * essa multiplicação por 1000, devolvemos `unit: 'seconds'` com a expressão `<E>`.
 * Caso contrário é ms cru. Inspecionamos o nó do AST (não o `toExpr` do todo)
 * para que `3 * 1000` NÃO seja dobrado em `3000` antes de detectarmos os segundos.
 */
function readTimerDelay(
  arg: Node,
  ctx: ParseCtx,
): { unit: 'ms' | 'seconds'; delay: JSExpr } | null {
  if (
    arg?.type === 'BinaryExpression' &&
    arg.operator === '*' &&
    isNumericLiteral(arg.right, 1000)
  ) {
    const delay = toExpr(arg.left, ctx)
    return isSimpleValue(delay) ? { unit: 'seconds', delay } : null
  }
  const delay = toExpr(arg, ctx)
  return isSimpleValue(delay) ? { unit: 'ms', delay } : null
}

/** `setTimeout(() => { … }, ms|s*1000)` → `setTimeout`/`setTimeoutSeconds`. */
function tryMatchSetTimeout(expr: Node, source: string, ctx: ParseCtx): JSStatement | null {
  if (expr?.type !== 'CallExpression' || expr.callee?.type !== 'Identifier') return null
  if (expr.callee.name !== 'setTimeout' || expr.arguments?.length !== 2) return null
  const cb = expr.arguments[0]
  if (cb.type !== 'ArrowFunctionExpression' && cb.type !== 'FunctionExpression') return null
  if ((cb.params?.length ?? 0) !== 0) return null
  const d = readTimerDelay(expr.arguments[1], ctx)
  if (!d) return null
  const body = bodyOfFn(cb, source, ctx)
  return { type: d.unit === 'seconds' ? 'setTimeoutSeconds' : 'setTimeout', delay: d.delay, body }
}

/** `setInterval(() => { … }, ms|s*1000)` → `setInterval`/`setIntervalSeconds`. */
function tryMatchSetInterval(expr: Node, source: string, ctx: ParseCtx): JSStatement | null {
  if (expr?.type !== 'CallExpression' || expr.callee?.type !== 'Identifier') return null
  if (expr.callee.name !== 'setInterval' || expr.arguments?.length !== 2) return null
  const cb = expr.arguments[0]
  if (cb.type !== 'ArrowFunctionExpression' && cb.type !== 'FunctionExpression') return null
  if ((cb.params?.length ?? 0) !== 0) return null
  const d = readTimerDelay(expr.arguments[1], ctx)
  if (!d) return null
  const body = bodyOfFn(cb, source, ctx)
  return { type: d.unit === 'seconds' ? 'setIntervalSeconds' : 'setInterval', delay: d.delay, body }
}

/**
 * `<var>.push(valor)` → `arrayPush`; `<var>.pop()` / `<var>.shift()` →
 * `arrayRemove`. Ignora instâncias de classe conhecidas (essas viram
 * `callMethod`), para não confundir um método `push` de uma classe com a lista.
 */
function tryMatchArrayOp(expr: Node, ctx: ParseCtx): JSStatement | null {
  if (expr?.type !== 'CallExpression') return null
  const callee = expr.callee
  if (callee?.type !== 'MemberExpression' || callee.computed) return null
  if (callee.object?.type !== 'Identifier' || callee.property?.type !== 'Identifier') return null
  const arrayVar: string = callee.object.name
  if (ctx.instanceVars.has(arrayVar)) return null
  const method = callee.property.name
  const args = expr.arguments ?? []
  if (method === 'push' && args.length === 1) {
    const value = toExpr(args[0], ctx)
    return isSimpleValue(value) ? { type: 'arrayPush', arrayVar, value } : null
  }
  if ((method === 'pop' || method === 'shift') && args.length === 0) {
    return { type: 'arrayRemove', arrayVar, end: method }
  }
  // arr.splice(start, count) → remover `count` itens a partir de `start`.
  if (method === 'splice' && args.length === 2) {
    const start = toExpr(args[0], ctx)
    const count = toExpr(args[1], ctx)
    if (isSimpleValue(start) && isSimpleValue(count)) {
      return { type: 'arraySplice', arrayVar, start, count }
    }
  }
  return null
}

/**
 * `<objeto>.<metodo>(args)` → `memberCall`. O objeto pode ser qualquer valor
 * representável (variável, `this.algo`, acesso aninhado) — cobre `instancia.metodo()`,
 * `this.lista.push(x)`, etc. Exclui objetos globais (console, document, Math, …) e
 * contextos de canvas / listas (tratados antes). Args precisam ser valores; senão
 * `null` e a linha vira código avançado.
 */
function tryMatchMethodCall(expr: Node, ctx: ParseCtx): JSStatement | null {
  if (expr?.type !== 'CallExpression') return null
  const callee = expr.callee
  if (callee?.type !== 'MemberExpression' || callee.computed) return null
  if (callee.property?.type !== 'Identifier') return null
  if (isGlobalObject(callee.object)) return null
  const object = toExpr(callee.object, ctx)
  if (!isSimpleValue(object)) return null
  const args = (expr.arguments ?? []).map((a: Node) => toExpr(a, ctx))
  if (!args.every(isSimpleValue)) return null
  return { type: 'memberCall', object, method: callee.property.name, args: args as JSExpr[] }
}

// ---------- game-2d: reverse-parse dos helpers SZGame2D.* ----------
// O gerador emite `SZGame2D.gameLoop(function update(){…})`, `SZGame2D.drawSprite
// (ctx, s)` etc. Estes matchers reconhecem esse código de volta nos blocos g2d:*
// (modo Ponte). Espelham generators/js.ts — qualquer mudança de assinatura lá
// precisa refletir aqui. Casos `const x = SZGame2D.createSprite/isColliding/...`
// ficam em tryMatchGame2DVarInit; `s.vx=;s.vy=;`/`s.x=;s.y=;` em tryFuseGame2DSpriteAssign.

/** Nome de um `Identifier`; senão null. */
function identifierName(node: Node): string | null {
  return node?.type === 'Identifier' ? (node.name as string) : null
}

/**
 * O construtor de um `new`: `new Classe()` → `{ className }` (classe do aluno)
 * ou `new THREE.Classe()` → `{ namespace, className }` (biblioteca importada, um
 * nível). `new a.b.C()` (namespace aninhado), `new arr[i]()` etc. → null (fora do
 * escopo: caem em rawJS). Único ponto que decide "é um new capturável".
 */
function namespacedCtor(callee: Node): { namespace?: string; className: string } | null {
  if (callee?.type === 'Identifier') return { className: callee.name as string }
  if (
    callee?.type === 'MemberExpression' &&
    !callee.computed &&
    callee.object?.type === 'Identifier' &&
    callee.property?.type === 'Identifier'
  ) {
    return { namespace: callee.object.name as string, className: callee.property.name as string }
  }
  return null
}

/** `() => x` (arrow com corpo de identificador) → 'x'; senão null. */
function arrowReturnIdentifier(node: Node): string | null {
  if (node?.type !== 'ArrowFunctionExpression') return null
  return node.body?.type === 'Identifier' ? (node.body.name as string) : null
}

/** Literal numérico (aceita `-N`); senão null. */
function numericLiteralValue(node: Node): number | null {
  if (node?.type === 'NumericLiteral') return node.value as number
  if (
    node?.type === 'UnaryExpression' &&
    node.operator === '-' &&
    node.argument?.type === 'NumericLiteral'
  ) {
    return -(node.argument.value as number)
  }
  return null
}

/** `SZGame2D.<metodo>(args)` → `{ method, args }` se o objeto for exatamente SZGame2D. */
function asSZGame2DCall(expr: Node): { method: string; args: Node[] } | null {
  if (expr?.type !== 'CallExpression') return null
  const callee = expr.callee
  if (callee?.type !== 'MemberExpression' || callee.computed) return null
  if (callee.object?.type !== 'Identifier' || callee.object.name !== 'SZGame2D') return null
  if (callee.property?.type !== 'Identifier') return null
  return { method: callee.property.name as string, args: expr.arguments ?? [] }
}

/** SZGame2D.keyDown("…") / SZGame2D.touches(a, b) em posição de VALOR (booleano). */
function matchGame2DExpr(node: Node, ctx?: ParseCtx): JSExpr | null {
  const call = asSZGame2DCall(node)
  if (!call) return null
  const { method, args } = call
  if (method === 'keyDown' && args[0]?.type === 'StringLiteral') {
    return { type: 'g2d:keyDown', key: args[0].value as string }
  }
  if (method === 'touches') {
    const aVar = identifierName(args[0])
    const bVar = identifierName(args[1])
    if (aVar && bVar) return { type: 'g2d:touches', aVar, bVar }
  }
  if (method === 'countGroup') {
    const groupVar = identifierName(args[0])
    if (groupVar) return { type: 'g2d:countGroup', groupVar }
  }
  if (method === 'spriteAngleDeg') {
    const spriteVar = identifierName(args[0])
    if (spriteVar) return { type: 'g2d:spriteAngle', spriteVar }
  }
  if (method === 'distance') {
    const aVar = identifierName(args[0])
    const bVar = identifierName(args[1])
    if (aVar && bVar) return { type: 'g2d:distance', aVar, bVar }
  }
  if (method === 'angleTo') {
    const aVar = identifierName(args[0])
    const bVar = identifierName(args[1])
    if (aVar && bVar) return { type: 'g2d:angleTo', aVar, bVar }
  }
  if (method === 'getHealth') {
    const spriteVar = identifierName(args[0])
    if (spriteVar) return { type: 'g2d:getHealth', spriteVar }
  }
  if (method === 'enemyDamage') {
    const spriteVar = identifierName(args[0])
    if (spriteVar) return { type: 'g2d:enemyDamage', spriteVar }
  }
  if (method === 'spriteX') {
    const spriteVar = identifierName(args[0])
    if (spriteVar) return { type: 'g2d:spriteX', spriteVar }
  }
  if (method === 'spriteY') {
    const spriteVar = identifierName(args[0])
    if (spriteVar) return { type: 'g2d:spriteY', spriteVar }
  }
  if (method === 'spriteW') {
    const spriteVar = identifierName(args[0])
    if (spriteVar) return { type: 'g2d:spriteW', spriteVar }
  }
  if (method === 'spriteH') {
    const spriteVar = identifierName(args[0])
    if (spriteVar) return { type: 'g2d:spriteH', spriteVar }
  }
  if (method === 'centerX') {
    const spriteVar = identifierName(args[0])
    if (spriteVar) return { type: 'g2d:centerX', spriteVar }
  }
  if (method === 'centerY') {
    const spriteVar = identifierName(args[0])
    if (spriteVar) return { type: 'g2d:centerY', spriteVar }
  }
  if (method === 'shapeW' && args.length === 0) return { type: 'g2d:shapeW' }
  if (method === 'shapeH' && args.length === 0) return { type: 'g2d:shapeH' }
  if (method === 'spriteVx') {
    const spriteVar = identifierName(args[0])
    if (spriteVar) return { type: 'g2d:spriteVx', spriteVar }
  }
  if (method === 'spriteVy') {
    const spriteVar = identifierName(args[0])
    if (spriteVar) return { type: 'g2d:spriteVy', spriteVar }
  }
  if (method === 'spriteSpeed') {
    const spriteVar = identifierName(args[0])
    if (spriteVar) return { type: 'g2d:spriteSpeed', spriteVar }
  }
  if (method === 'isMoving') {
    const spriteVar = identifierName(args[0])
    if (spriteVar) return { type: 'g2d:isMoving', spriteVar }
  }
  if (method === 'isMovingH') {
    const spriteVar = identifierName(args[0])
    if (spriteVar) return { type: 'g2d:isMovingH', spriteVar }
  }
  if (method === 'isMovingV') {
    const spriteVar = identifierName(args[0])
    if (spriteVar) return { type: 'g2d:isMovingV', spriteVar }
  }
  if (method === 'randomBetween') {
    const min = toExpr(args[0], ctx)
    const max = toExpr(args[1], ctx)
    if (isSimpleValue(min) && isSimpleValue(max)) return { type: 'g2d:randomBetween', min, max }
  }
  if (method === 'randomChance') {
    const percent = toExpr(args[0], ctx)
    if (isSimpleValue(percent)) return { type: 'g2d:randomChance', percent }
  }
  if (method === 'hasHealth') {
    const spriteVar = identifierName(args[0])
    if (spriteVar) return { type: 'g2d:hasHealth', spriteVar }
  }
  if (method === 'cooldownReady') {
    const spriteVar = identifierName(args[0])
    const frames = toExpr(args[1], ctx)
    if (spriteVar && isSimpleValue(frames)) return { type: 'g2d:cooldownReady', spriteVar, frames }
  }
  if (method === 'isPaused') return { type: 'g2d:isPaused' }
  if (method === 'cameraX') return { type: 'g2d:cameraX' }
  if (method === 'cameraY') return { type: 'g2d:cameraY' }
  if (method === 'randomX') return { type: 'g2d:randomX' }
  if (method === 'randomY') return { type: 'g2d:randomY' }
  if (method === 'tileAtSprite') {
    const mapVar = identifierName(args[0])
    const spriteVar = identifierName(args[1])
    if (mapVar && spriteVar) return { type: 'g2d:tileAtSprite', mapVar, spriteVar }
  }
  if (method === 'sceneIs' && args[0]?.type === 'StringLiteral') {
    return { type: 'g2d:sceneIs', name: args[0].value as string }
  }
  if (method === 'stickHeroScore') {
    const gameVar = identifierName(args[0])
    if (gameVar) return { type: 'g2d:stickHeroScore', gameVar }
  }
  if (method === 'stickHeroOver') {
    const gameVar = identifierName(args[0])
    if (gameVar) return { type: 'g2d:stickHeroOver', gameVar }
  }
  if (method === 'balloonScore') {
    const gameVar = identifierName(args[0])
    if (gameVar) return { type: 'g2d:balloonScore', gameVar }
  }
  if (method === 'balloonFuel') {
    const gameVar = identifierName(args[0])
    if (gameVar) return { type: 'g2d:balloonFuel', gameVar }
  }
  if (method === 'balloonOver') {
    const gameVar = identifierName(args[0])
    if (gameVar) return { type: 'g2d:balloonOver', gameVar }
  }
  if (method === 'aimReleased') {
    const throwerVar = identifierName(args[0])
    if (throwerVar) return { type: 'g2d:aimReleased', throwerVar }
  }
  if (method === 'bananaHitThrower') {
    const cityVar = identifierName(args[0])
    const throwerVar = identifierName(args[1])
    if (cityVar && throwerVar) return { type: 'g2d:bananaHitThrower', cityVar, throwerVar }
  }
  if (method === 'bananaHitCity') {
    const cityVar = identifierName(args[0])
    if (cityVar) return { type: 'g2d:bananaHitCity', cityVar }
  }
  return null
}

/**
 * Lê `{ x, y, w, h, color, image }` de um literal de objeto. `image` é opcional
 * (nome do asset) — quando presente, o var-init vira `g2d:createImageSprite` em
 * vez de `g2d:createSprite`. null se alguma chave for não-literal/desconhecida.
 */
function readSpriteOptions(
  obj: Node,
  ctx: ParseCtx,
): { x: JSExpr; y: JSExpr; w: JSExpr; h: JSExpr; color: string; image: string | null } | null {
  const result: {
    x: JSExpr
    y: JSExpr
    w: JSExpr
    h: JSExpr
    color: string
    image: string | null
  } = {
    x: { type: 'num', value: 0 },
    y: { type: 'num', value: 0 },
    w: { type: 'num', value: 32 },
    h: { type: 'num', value: 32 },
    color: '#22d3ee',
    image: null,
  }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (key === 'x' || key === 'y' || key === 'w' || key === 'h') {
      const v = toExpr(prop.value, ctx)
      if (!isSimpleValue(v)) return null
      result[key] = v
    } else if (key === 'color') {
      if (prop.value?.type !== 'StringLiteral') return null
      result.color = prop.value.value as string
    } else if (key === 'image') {
      if (prop.value?.type !== 'StringLiteral') return null
      result.image = prop.value.value as string
    } else if (key === 'vx' || key === 'vy') {
      // createSprite aceita vx/vy no runtime, mas o bloco não os guarda. Tolera
      // se forem literais (ignora); não-literal não é representável → bail.
      if (numericLiteralValue(prop.value) === null) return null
    } else {
      return null
    }
  }
  return result
}

/**
 * Lê `{ image, tile, solid, grid }` de um literal de objeto (createTileMap).
 * image/solid/grid são strings; tile é expressão (número/variável/conta). null se
 * alguma chave faltar/for não-literal/desconhecida — o caminho cai no helper genérico.
 */
function readTileMapOptions(
  obj: Node,
  ctx: ParseCtx,
): { image: string; tile: JSExpr; solid: string; grid: string; platform?: string } | null {
  const result = {
    image: null as string | null,
    tile: null as JSExpr | null,
    solid: '',
    platform: '',
    grid: '',
  }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (key === 'tile') {
      const v = toExpr(prop.value, ctx)
      if (!isSimpleValue(v)) return null
      result.tile = v
    } else if (key === 'image' || key === 'solid' || key === 'grid' || key === 'platform') {
      if (prop.value?.type !== 'StringLiteral') return null
      result[key] = prop.value.value as string
    } else {
      return null
    }
  }
  if (result.image === null || result.tile === null) return null
  return {
    image: result.image,
    tile: result.tile,
    solid: result.solid,
    // Omite quando vazio → IR de mapas sem plataforma fica byte-idêntica.
    ...(result.platform ? { platform: result.platform } : {}),
    grid: result.grid,
  }
}

/**
 * Lê o objeto de `SZGame2D.spawn(grupo, { x, y, w, h, color|image, vx, vy })`.
 * x/y/vx/vy são EXPRESSÕES (aceitam aleatório/contas); w/h números; color/image
 * strings. `image` presente → spawn de imagem. null se alguma chave não-casar.
 */
function readSpawnOptions(
  obj: Node,
  ctx: ParseCtx,
): {
  x: JSExpr
  y: JSExpr
  vx: JSExpr
  vy: JSExpr
  w: JSExpr
  h: JSExpr
  color: string
  image: string | null
} | null {
  const num0: JSExpr = { type: 'num', value: 0 }
  const out = {
    x: num0 as JSExpr,
    y: num0 as JSExpr,
    vx: num0 as JSExpr,
    vy: num0 as JSExpr,
    w: { type: 'num', value: 20 } as JSExpr,
    h: { type: 'num', value: 20 } as JSExpr,
    color: '#22d3ee',
    image: null as string | null,
  }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (key === 'x' || key === 'y' || key === 'vx' || key === 'vy' || key === 'w' || key === 'h') {
      const v = toExpr(prop.value, ctx)
      if (!isSimpleValue(v)) return null
      out[key] = v
    } else if (key === 'color') {
      if (prop.value?.type !== 'StringLiteral') return null
      out.color = prop.value.value as string
    } else if (key === 'image') {
      if (prop.value?.type !== 'StringLiteral') return null
      out.image = prop.value.value as string
    } else {
      return null
    }
  }
  return out
}

/**
 * Lê `{ x, y, w, h, body, wings }` de `SZGame2D.createShip({...})`. x/y/w/h números;
 * body/wings cores (strings). null se alguma chave não casar.
 */
function readShipOptions(
  obj: Node,
  ctx: ParseCtx,
): { x: JSExpr; y: JSExpr; w: JSExpr; h: JSExpr; body: string; wings: string } | null {
  const out: { x: JSExpr; y: JSExpr; w: JSExpr; h: JSExpr; body: string; wings: string } = {
    x: { type: 'num', value: 0 },
    y: { type: 'num', value: 0 },
    w: { type: 'num', value: 54 },
    h: { type: 'num', value: 62 },
    body: '#35e8ff',
    wings: '#2568ff',
  }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (key === 'x' || key === 'y' || key === 'w' || key === 'h') {
      const v = toExpr(prop.value, ctx)
      if (!isSimpleValue(v)) return null
      out[key] = v
    } else if (key === 'body' || key === 'wings') {
      if (prop.value?.type !== 'StringLiteral') return null
      out[key] = prop.value.value as string
    } else {
      return null
    }
  }
  return out
}

/** Opções do createEnemyType (tipo de inimigo): behavior/cor/imagem literais + números simples. */
function readEnemyTypeOptions(
  obj: Node,
  ctx: ParseCtx,
): {
  behavior: string
  color: string
  image: string
  hp: JSExpr
  speed: JSExpr
  dmg: JSExpr
  w: JSExpr
  h: JSExpr
} | null {
  const out: {
    behavior: string
    color: string
    image: string
    hp: JSExpr
    speed: JSExpr
    dmg: JSExpr
    w: JSExpr
    h: JSExpr
  } = {
    behavior: 'patrulha',
    color: '#e4573d',
    image: '',
    hp: { type: 'num', value: 3 },
    speed: { type: 'num', value: 2 },
    dmg: { type: 'num', value: 1 },
    w: { type: 'num', value: 32 },
    h: { type: 'num', value: 32 },
  }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (key === 'hp' || key === 'speed' || key === 'dmg' || key === 'w' || key === 'h') {
      const v = toExpr(prop.value, ctx)
      if (!isSimpleValue(v)) return null
      out[key] = v
    } else if (key === 'behavior') {
      // Dropdown no bloco: literal fora do enum NÃO vira bloco (rawJS).
      if (prop.value?.type !== 'StringLiteral') return null
      const b = prop.value.value as string
      if (!(G2D_ENEMY_BEHAVIORS as readonly string[]).includes(b)) return null
      out.behavior = b
    } else if (key === 'color' || key === 'image') {
      if (prop.value?.type !== 'StringLiteral') return null
      out[key] = prop.value.value as string
    } else {
      return null
    }
  }
  return out
}

/**
 * Lê `{ x, y, size, color, vx, vy }` de `SZGame2D.spawnAsteroid(g, {...})`. x/y/vx/vy
 * são expressões; size número; color string. null se alguma chave não casar.
 */
function readAsteroidOptions(
  obj: Node,
  ctx: ParseCtx,
): { x: JSExpr; y: JSExpr; vx: JSExpr; vy: JSExpr; size: JSExpr; color: string } | null {
  const num0: JSExpr = { type: 'num', value: 0 }
  const out = {
    x: num0 as JSExpr,
    y: num0 as JSExpr,
    vx: num0 as JSExpr,
    vy: num0 as JSExpr,
    size: { type: 'num', value: 36 } as JSExpr,
    color: '#8d8f9b',
  }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (key === 'x' || key === 'y' || key === 'vx' || key === 'vy' || key === 'size') {
      const v = toExpr(prop.value, ctx)
      if (!isSimpleValue(v)) return null
      out[key] = v
    } else if (key === 'color') {
      if (prop.value?.type !== 'StringLiteral') return null
      out.color = prop.value.value as string
    } else {
      return null
    }
  }
  return out
}

/** Lê `{ speed, color }` de `SZGame2D.shootFrom(s, g, {...})` (speed número/expressão; color string). */
function readShootFromOptions(obj: Node, ctx: ParseCtx): { speed: JSExpr; color: string } | null {
  const out: { speed: JSExpr; color: string } = {
    speed: { type: 'num', value: 6 },
    color: '#9cff57',
  }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (key === 'speed') {
      const v = toExpr(prop.value, ctx)
      if (!isSimpleValue(v)) return null
      out.speed = v
    } else if (key === 'color') {
      if (prop.value?.type !== 'StringLiteral') return null
      out.color = prop.value.value as string
    } else {
      return null
    }
  }
  return out
}

/** Lê `{ size, color, speed }` de `SZGame2D.spawnAsteroidFromEdge(g, {...})`. */
function readAsteroidEdgeOptions(
  obj: Node,
  ctx: ParseCtx,
): { size: JSExpr; color: string; speed: JSExpr } | null {
  const out = {
    size: { type: 'num', value: 40 } as JSExpr,
    color: '#8d8f9b',
    speed: { type: 'num', value: 1.5 } as JSExpr,
  }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (key === 'size' || key === 'speed') {
      const v = toExpr(prop.value, ctx)
      if (!isSimpleValue(v)) return null
      out[key] = v
    } else if (key === 'color') {
      if (prop.value?.type !== 'StringLiteral') return null
      out.color = prop.value.value as string
    } else {
      return null
    }
  }
  return out
}

/** Lê `{ side, color }` de `SZGame2D.placeThrower(city, {...})`. side 'left'/'right'. */
function readThrowerOptions(obj: Node): { side: 'left' | 'right'; color: string } | null {
  let side: 'left' | 'right' = 'left'
  let color = '#6b4a2b'
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (key === 'side') {
      if (prop.value?.type !== 'StringLiteral') return null
      side = prop.value.value === 'right' ? 'right' : 'left'
    } else if (key === 'color') {
      if (prop.value?.type !== 'StringLiteral') return null
      color = prop.value.value as string
    } else {
      return null
    }
  }
  return { side, color }
}

/**
 * Lê `{ x, y, size, color }` de `SZGame2D.createDino({...})`. x/y/size números;
 * color string. null se alguma chave não casar.
 */
function readDinoOptions(
  obj: Node,
  ctx: ParseCtx,
): { x: JSExpr; y: JSExpr; size: JSExpr; color: string } | null {
  const out: { x: JSExpr; y: JSExpr; size: JSExpr; color: string } = {
    x: { type: 'num', value: 0 },
    y: { type: 'num', value: 0 },
    size: { type: 'num', value: 64 },
    color: '#5fb45f',
  }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (key === 'x' || key === 'y' || key === 'size') {
      const v = toExpr(prop.value, ctx)
      if (!isSimpleValue(v)) return null
      out[key] = v
    } else if (key === 'color') {
      if (prop.value?.type !== 'StringLiteral') return null
      out.color = prop.value.value as string
    } else {
      return null
    }
  }
  return out
}

/**
 * Lê `{ type, x, size, vx }` de `SZGame2D.spawnObstacle(g, ctx, {...})`. x/vx são
 * expressões; size número; type string. null se alguma chave não casar.
 */
function readObstacleOptions(
  obj: Node,
  ctx: ParseCtx,
): { shape: string; x: JSExpr; vx: JSExpr; size: JSExpr } | null {
  const num0: JSExpr = { type: 'num', value: 0 }
  const out = {
    shape: 'cactus',
    x: num0 as JSExpr,
    vx: num0 as JSExpr,
    size: { type: 'num', value: 44 } as JSExpr,
  }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (key === 'x' || key === 'vx' || key === 'size') {
      const v = toExpr(prop.value, ctx)
      if (!isSimpleValue(v)) return null
      out[key] = v
    } else if (key === 'type') {
      if (prop.value?.type !== 'StringLiteral') return null
      out.shape = prop.value.value as string
    } else {
      return null
    }
  }
  return out
}

/** Lê `{ x, y, vx }` de `SZGame2D.spawnEgg(g, {...})`. Todas expressões simples. */
function readEggOptions(obj: Node, ctx: ParseCtx): { x: JSExpr; y: JSExpr; vx: JSExpr } | null {
  const num0: JSExpr = { type: 'num', value: 0 }
  const out = { x: num0 as JSExpr, y: num0 as JSExpr, vx: num0 as JSExpr }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (key === 'x' || key === 'y' || key === 'vx') {
      const v = toExpr(prop.value, ctx)
      if (!isSimpleValue(v)) return null
      out[key] = v
    } else {
      return null
    }
  }
  return out
}

/** Lê { x, y, radius, color, vx, vy } do SZGame2D.spawnBullet(g, {...}). */
function readBulletOptions(
  obj: Node,
  ctx: ParseCtx,
): { x: JSExpr; y: JSExpr; vx: JSExpr; vy: JSExpr; radius: JSExpr; color: string } | null {
  const num0: JSExpr = { type: 'num', value: 0 }
  const out = {
    x: num0 as JSExpr,
    y: num0 as JSExpr,
    vx: num0 as JSExpr,
    vy: num0 as JSExpr,
    radius: { type: 'num', value: 5 } as JSExpr,
    color: '#9cff57',
  }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (key === 'x' || key === 'y' || key === 'vx' || key === 'vy' || key === 'radius') {
      const v = toExpr(prop.value, ctx)
      if (!isSimpleValue(v)) return null
      out[key] = v
    } else if (key === 'color') {
      if (prop.value?.type !== 'StringLiteral') return null
      out.color = prop.value.value as string
    } else {
      return null
    }
  }
  return out
}

/** SZGame2D.gameLoop/onPointer/drawSprite/applyVelocity/bounceOnEdges/setGravity/playSound. */
function tryMatchGame2DCall(expr: Node, source: string, ctx: ParseCtx): JSStatement | null {
  const call = asSZGame2DCall(expr)
  if (!call) return null
  const { method, args } = call
  const isFn = (n: Node) =>
    n?.type === 'FunctionExpression' || n?.type === 'ArrowFunctionExpression'

  switch (method) {
    case 'gameLoop': {
      if (!isFn(args[0])) return null
      return { type: 'g2d:updateEachFrame', body: bodyOfFn(args[0], source, ctx) }
    }
    case 'onPointer': {
      if (!isFn(args[0])) return null
      const params = args[0].params ?? []
      return {
        type: 'g2d:onPointer',
        xName: identifierName(params[0]) ?? 'px',
        yName: identifierName(params[1]) ?? 'py',
        body: bodyOfFn(args[0], source, ctx),
      }
    }
    case 'onKey': {
      // generator: SZGame2D.onKey("ArrowRight", function(){…})
      if (args[0]?.type !== 'StringLiteral' || !isFn(args[1])) return null
      return {
        type: 'g2d:onKey',
        key: args[0].value as string,
        body: bodyOfFn(args[1], source, ctx),
      }
    }
    case 'onOverlap': {
      // generator: SZGame2D.onOverlap(() => a, () => b, function(){…})
      const aVar = arrowReturnIdentifier(args[0])
      const bVar = arrowReturnIdentifier(args[1])
      if (!aVar || !bVar || !isFn(args[2])) return null
      return { type: 'g2d:onOverlap', aVar, bVar, body: bodyOfFn(args[2], source, ctx) }
    }
    case 'drawSprite': {
      // generator: SZGame2D.drawSprite(ctx, sprite)
      const ctxVar = identifierName(args[0])
      const spriteVar = identifierName(args[1])
      return ctxVar && spriteVar ? { type: 'g2d:drawSprite', spriteVar, ctxVar } : null
    }
    case 'clear':
      // generator: SZGame2D.clear()  (palco implícito — sem ctx)
      return { type: 'g2d:clear' }
    case 'applyVelocity': {
      const spriteVar = identifierName(args[0])
      return spriteVar ? { type: 'g2d:applyVelocity', spriteVar } : null
    }
    case 'bounceOnEdges': {
      // generator: SZGame2D.bounceOnEdges(sprite, ctx)
      const spriteVar = identifierName(args[0])
      const ctxVar = identifierName(args[1])
      return spriteVar && ctxVar ? { type: 'g2d:bounceOnEdges', spriteVar, ctxVar } : null
    }
    case 'setGravity': {
      const value = toExpr(args[0], ctx)
      return isSimpleValue(value) ? { type: 'g2d:setGravity', value } : null
    }
    case 'playSound': {
      const freq = toExpr(args[0], ctx)
      const durationMs = toExpr(args[1], ctx)
      return isSimpleValue(freq) && isSimpleValue(durationMs)
        ? { type: 'g2d:playSound', freq, durationMs }
        : null
    }
    case 'playFx': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'g2d:playFx', fx: args[0].value as string }
    }
    case 'playMusic': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'g2d:playMusic', tune: args[0].value as string }
    }
    case 'stopMusic':
      return { type: 'g2d:stopMusic' }
    case 'playNote': {
      if (args[0]?.type !== 'StringLiteral') return null
      const ms = toExpr(args[1], ctx)
      return isSimpleValue(ms) ? { type: 'g2d:playNote', note: args[0].value as string, ms } : null
    }
    case 'aimAt': {
      const spriteVar = identifierName(args[0])
      const targetVar = identifierName(args[1])
      return spriteVar && targetVar ? { type: 'g2d:aimAt', spriteVar, targetVar } : null
    }
    case 'moveToward': {
      const spriteVar = identifierName(args[0])
      const targetVar = identifierName(args[1])
      const speed = toExpr(args[2], ctx)
      return spriteVar && targetVar && isSimpleValue(speed)
        ? { type: 'g2d:moveToward', spriteVar, targetVar, speed }
        : null
    }
    case 'setHealth': {
      const spriteVar = identifierName(args[0])
      const amount = toExpr(args[1], ctx)
      return spriteVar && isSimpleValue(amount)
        ? { type: 'g2d:setHealth', spriteVar, amount }
        : null
    }
    case 'changeHealth': {
      const spriteVar = identifierName(args[0])
      const delta = toExpr(args[1], ctx)
      return spriteVar && isSimpleValue(delta)
        ? { type: 'g2d:changeHealth', spriteVar, delta }
        : null
    }
    case 'flipSprite': {
      const spriteVar = identifierName(args[0])
      if (!spriteVar || args[1]?.type !== 'StringLiteral') return null
      return { type: 'g2d:flipSprite', spriteVar, dir: args[1].value as string }
    }
    case 'setOpacity': {
      const spriteVar = identifierName(args[0])
      const percent = toExpr(args[1], ctx)
      return spriteVar && isSimpleValue(percent)
        ? { type: 'g2d:setOpacity', spriteVar, percent }
        : null
    }
    case 'setSize': {
      const spriteVar = identifierName(args[0])
      const w = toExpr(args[1], ctx)
      const h = toExpr(args[2], ctx)
      return spriteVar && isSimpleValue(w) && isSimpleValue(h)
        ? { type: 'g2d:setSize', spriteVar, w, h }
        : null
    }
    case 'scaleSprite': {
      const spriteVar = identifierName(args[0])
      const factor = toExpr(args[1], ctx)
      return spriteVar && isSimpleValue(factor)
        ? { type: 'g2d:scaleSprite', spriteVar, factor }
        : null
    }
    case 'wrapEdges': {
      const spriteVar = identifierName(args[0])
      return spriteVar ? { type: 'g2d:wrapEdges', spriteVar } : null
    }
    case 'pruneOld': {
      const groupVar = identifierName(args[0])
      const seconds = toExpr(args[1], ctx)
      return groupVar && isSimpleValue(seconds) ? { type: 'g2d:pruneOld', groupVar, seconds } : null
    }
    case 'pauseGame':
      return { type: 'g2d:pauseGame' }
    case 'resumeGame':
      return { type: 'g2d:resumeGame' }
    case 'cameraFollow': {
      const spriteVar = identifierName(args[0])
      const worldW = toExpr(args[1], ctx)
      const worldH = toExpr(args[2], ctx)
      return spriteVar && isSimpleValue(worldW) && isSimpleValue(worldH)
        ? { type: 'g2d:cameraFollow', spriteVar, worldW, worldH }
        : null
    }
    case 'setCamera': {
      const x = toExpr(args[0], ctx)
      const y = toExpr(args[1], ctx)
      return isSimpleValue(x) && isSimpleValue(y) ? { type: 'g2d:setCamera', x, y } : null
    }
    case 'breakTileAtSprite': {
      const mapVar = identifierName(args[0])
      const spriteVar = identifierName(args[1])
      return mapVar && spriteVar ? { type: 'g2d:breakTile', mapVar, spriteVar } : null
    }
    case 'setTileAtSprite': {
      const mapVar = identifierName(args[0])
      const index = toExpr(args[1], ctx)
      const spriteVar = identifierName(args[2])
      return mapVar && isSimpleValue(index) && spriteVar
        ? { type: 'g2d:setTile', mapVar, index, spriteVar }
        : null
    }
    case 'bringToFront': {
      const groupVar = identifierName(args[0])
      const spriteVar = identifierName(args[1])
      return groupVar && spriteVar ? { type: 'g2d:bringToFront', spriteVar, groupVar } : null
    }
    case 'sendToBack': {
      const groupVar = identifierName(args[0])
      const spriteVar = identifierName(args[1])
      return groupVar && spriteVar ? { type: 'g2d:sendToBack', spriteVar, groupVar } : null
    }
    case 'drawHitbox': {
      const spriteVar = identifierName(args[0])
      return spriteVar ? { type: 'g2d:drawHitbox', spriteVar } : null
    }
    case 'showFps': {
      const x = toExpr(args[0], ctx)
      const y = toExpr(args[1], ctx)
      return isSimpleValue(x) && isSimpleValue(y) ? { type: 'g2d:showFps', x, y } : null
    }
    case 'setImage': {
      // generator: SZGame2D.setImage(sprite, 'nome')
      const spriteVar = identifierName(args[0])
      if (!spriteVar || args[1]?.type !== 'StringLiteral') return null
      return { type: 'g2d:setImage', spriteVar, image: args[1].value as string }
    }
    case 'defineShape': {
      // generator: SZGame2D.defineShape("nome", function (ctx) {…})
      if (args[0]?.type !== 'StringLiteral' || !isFn(args[1])) return null
      const ctxParam = identifierName(args[1].params?.[0])
      // O parâmetro é um CONTEXTO 2D — registrar em ctxVars para que os blocos de
      // Canvas dentro da figura round-trippem (senão viram rawJS).
      if (ctxParam) ctx.ctxVars.add(ctxParam)
      return {
        type: 'g2d:defineShape',
        shapeName: args[0].value as string,
        body: bodyOfFn(args[1], source, ctx),
      }
    }
    case 'setShape': {
      // generator: SZGame2D.setShape(sprite, "nome")
      const spriteVar = identifierName(args[0])
      if (!spriteVar || args[1]?.type !== 'StringLiteral') return null
      return { type: 'g2d:setShape', spriteVar, shapeName: args[1].value as string }
    }
    case 'paintRect': {
      // generator: SZGame2D.paintRect(ctx, x, y, w, h, "cor")
      const ctxVar = identifierName(args[0])
      const x = toExpr(args[1], ctx)
      const y = toExpr(args[2], ctx)
      const w = toExpr(args[3], ctx)
      const h = toExpr(args[4], ctx)
      return ctxVar &&
        args[5]?.type === 'StringLiteral' &&
        isSimpleValue(x) &&
        isSimpleValue(y) &&
        isSimpleValue(w) &&
        isSimpleValue(h)
        ? { type: 'g2d:paintRect', ctxVar, x, y, w, h, color: args[5].value as string }
        : null
    }
    case 'paintCircle': {
      // generator: SZGame2D.paintCircle(ctx, x, y, r, "cor")
      const ctxVar = identifierName(args[0])
      const x = toExpr(args[1], ctx)
      const y = toExpr(args[2], ctx)
      const r = toExpr(args[3], ctx)
      return ctxVar &&
        args[4]?.type === 'StringLiteral' &&
        isSimpleValue(x) &&
        isSimpleValue(y) &&
        isSimpleValue(r)
        ? { type: 'g2d:paintCircle', ctxVar, x, y, r, color: args[4].value as string }
        : null
    }
    case 'paintEllipse': {
      // generator: SZGame2D.paintEllipse(ctx, x, y, w, h, "cor")
      const ctxVar = identifierName(args[0])
      const x = toExpr(args[1], ctx)
      const y = toExpr(args[2], ctx)
      const w = toExpr(args[3], ctx)
      const h = toExpr(args[4], ctx)
      return ctxVar &&
        args[5]?.type === 'StringLiteral' &&
        isSimpleValue(x) &&
        isSimpleValue(y) &&
        isSimpleValue(w) &&
        isSimpleValue(h)
        ? { type: 'g2d:paintEllipse', ctxVar, x, y, w, h, color: args[5].value as string }
        : null
    }
    case 'paintTriangle': {
      // generator: SZGame2D.paintTriangle(ctx, x1,y1, x2,y2, x3,y3, "cor")
      const ctxVar = identifierName(args[0])
      const vals = [1, 2, 3, 4, 5, 6].map((i) => toExpr(args[i], ctx))
      return ctxVar && args[7]?.type === 'StringLiteral' && vals.every((v) => isSimpleValue(v))
        ? {
            type: 'g2d:paintTriangle',
            ctxVar,
            x1: vals[0] as JSExpr,
            y1: vals[1] as JSExpr,
            x2: vals[2] as JSExpr,
            y2: vals[3] as JSExpr,
            x3: vals[4] as JSExpr,
            y3: vals[5] as JSExpr,
            color: args[7].value as string,
          }
        : null
    }
    case 'paintLine': {
      // generator: SZGame2D.paintLine(ctx, x1,y1, x2,y2, "cor", esp)
      const ctxVar = identifierName(args[0])
      const x1 = toExpr(args[1], ctx)
      const y1 = toExpr(args[2], ctx)
      const x2 = toExpr(args[3], ctx)
      const y2 = toExpr(args[4], ctx)
      const width = toExpr(args[6], ctx)
      return ctxVar &&
        args[5]?.type === 'StringLiteral' &&
        isSimpleValue(x1) &&
        isSimpleValue(y1) &&
        isSimpleValue(x2) &&
        isSimpleValue(y2) &&
        isSimpleValue(width)
        ? { type: 'g2d:paintLine', ctxVar, x1, y1, x2, y2, color: args[5].value as string, width }
        : null
    }
    case 'setAnimation': {
      // generator: SZGame2D.setAnimation(sprite, sheet, from, to, fps)
      const spriteVar = identifierName(args[0])
      const sheetVar = identifierName(args[1])
      const from = toExpr(args[2], ctx)
      const to = toExpr(args[3], ctx)
      const fps = toExpr(args[4], ctx)
      return spriteVar && sheetVar && isSimpleValue(from) && isSimpleValue(to) && isSimpleValue(fps)
        ? { type: 'g2d:animateSprite', spriteVar, sheetVar, from, to, fps }
        : null
    }
    case 'setStateAnimation': {
      // generator: SZGame2D.setStateAnimation(sprite, "estado", sheet, from, to, fps).
      // O estado é um dropdown no bloco: literal FORA do enum não vira bloco
      // (rawJS) — senão o dropdown coagiria o valor e corromperia o round-trip.
      const spriteVar = identifierName(args[0])
      const state = args[1]?.type === 'StringLiteral' ? (args[1].value as string) : null
      const sheetVar = identifierName(args[2])
      const from = toExpr(args[3], ctx)
      const to = toExpr(args[4], ctx)
      const fps = toExpr(args[5], ctx)
      return spriteVar &&
        sheetVar &&
        state &&
        (G2D_ANIM_STATES as readonly string[]).includes(state) &&
        isSimpleValue(from) &&
        isSimpleValue(to) &&
        isSimpleValue(fps)
        ? { type: 'g2d:setStateAnim', spriteVar, state, sheetVar, from, to, fps }
        : null
    }
    case 'autoAnimate': {
      // generator: SZGame2D.autoAnimate(sprite)
      const spriteVar = identifierName(args[0])
      return spriteVar ? { type: 'g2d:autoAnimate', spriteVar } : null
    }
    case 'setEnemyStateAnimation': {
      // generator: SZGame2D.setEnemyStateAnimation(tipo, "estado", sheet, from, to, fps)
      const typeVar = identifierName(args[0])
      const state = args[1]?.type === 'StringLiteral' ? (args[1].value as string) : null
      const sheetVar = identifierName(args[2])
      const from = toExpr(args[3], ctx)
      const to = toExpr(args[4], ctx)
      const fps = toExpr(args[5], ctx)
      return typeVar &&
        sheetVar &&
        state &&
        (G2D_ANIM_STATES as readonly string[]).includes(state) &&
        isSimpleValue(from) &&
        isSimpleValue(to) &&
        isSimpleValue(fps)
        ? { type: 'g2d:enemyStateAnim', typeVar, state, sheetVar, from, to, fps }
        : null
    }
    case 'setEnemyTypeParam': {
      // generator: SZGame2D.setEnemyTypeParam(tipo, "param", valor)
      const typeVar = identifierName(args[0])
      const param = args[1]?.type === 'StringLiteral' ? (args[1].value as string) : null
      const value = toExpr(args[2], ctx)
      return typeVar &&
        param &&
        (G2D_ENEMY_PARAMS as readonly string[]).includes(param) &&
        isSimpleValue(value)
        ? { type: 'g2d:setEnemyTypeParam', typeVar, param, value }
        : null
    }
    case 'spawnEnemy': {
      // generator: SZGame2D.spawnEnemy(tipo, x, y)
      const typeVar = identifierName(args[0])
      const x = toExpr(args[1], ctx)
      const y = toExpr(args[2], ctx)
      return typeVar && isSimpleValue(x) && isSimpleValue(y)
        ? { type: 'g2d:spawnEnemy', typeVar, x, y }
        : null
    }
    case 'updateEnemyType': {
      // generator: SZGame2D.updateEnemyType(tipo, ctx, alvo)
      const typeVar = identifierName(args[0])
      const ctxVar = identifierName(args[1])
      const targetVar = identifierName(args[2])
      return typeVar && ctxVar && targetVar
        ? { type: 'g2d:updateEnemyType', typeVar, ctxVar, targetVar }
        : null
    }
    case 'drawEnemyType': {
      // generator: SZGame2D.drawEnemyType(ctx, tipo)
      const ctxVar = identifierName(args[0])
      const typeVar = identifierName(args[1])
      return ctxVar && typeVar ? { type: 'g2d:drawEnemyType', ctxVar, typeVar } : null
    }
    case 'onEnemyDefeated': {
      // generator: SZGame2D.onEnemyDefeated(tipo, function (inimigo) {…})
      const typeVar = identifierName(args[0])
      if (!typeVar || !isFn(args[1])) return null
      const itemName = identifierName(args[1].params?.[0]) ?? 'inimigo'
      ctx.spriteVars.add(itemName)
      return {
        type: 'g2d:onEnemyDefeated',
        typeVar,
        itemName,
        body: bodyOfFn(args[1], source, ctx),
      }
    }
    case 'overlapEnemyShots': {
      // generator: SZGame2D.overlapEnemyShots(() => sprite, tipo, function (tiro) {…})
      const spriteVar = arrowReturnIdentifier(args[0])
      const typeVar = identifierName(args[1])
      if (!spriteVar || !typeVar || !isFn(args[2])) return null
      const itemName = identifierName(args[2].params?.[0]) ?? 'tiro'
      ctx.spriteVars.add(itemName)
      return {
        type: 'g2d:onEnemyShotHit',
        spriteVar,
        typeVar,
        itemName,
        body: bodyOfFn(args[2], source, ctx),
      }
    }
    case 'hurtByEnemy': {
      // generator: SZGame2D.hurtByEnemy(sprite, inimigo)
      const spriteVar = identifierName(args[0])
      const enemyVar = identifierName(args[1])
      return spriteVar && enemyVar ? { type: 'g2d:hurtByEnemy', spriteVar, enemyVar } : null
    }
    case 'drawFrame': {
      // generator: SZGame2D.drawFrame(ctx, sheet, index, x, y, w, h)
      const ctxVar = identifierName(args[0])
      const sheetVar = identifierName(args[1])
      const index = toExpr(args[2], ctx)
      const x = toExpr(args[3], ctx)
      const y = toExpr(args[4], ctx)
      const w = toExpr(args[5], ctx)
      const h = toExpr(args[6], ctx)
      return ctxVar &&
        sheetVar &&
        isSimpleValue(index) &&
        isSimpleValue(x) &&
        isSimpleValue(y) &&
        isSimpleValue(w) &&
        isSimpleValue(h)
        ? { type: 'g2d:drawFrame', ctxVar, sheetVar, index, x, y, w, h }
        : null
    }
    case 'platformer': {
      // generator: SZGame2D.platformer(sprite, ctx, speed, jump)
      const spriteVar = identifierName(args[0])
      const ctxVar = identifierName(args[1])
      const speed = toExpr(args[2], ctx)
      const jump = toExpr(args[3], ctx)
      return spriteVar && ctxVar && isSimpleValue(speed) && isSimpleValue(jump)
        ? { type: 'g2d:platformer', spriteVar, ctxVar, speed, jump }
        : null
    }
    case 'topDown': {
      const spriteVar = identifierName(args[0])
      const speed = toExpr(args[1], ctx)
      return spriteVar && isSimpleValue(speed) ? { type: 'g2d:topDown', spriteVar, speed } : null
    }
    case 'followPointer': {
      const spriteVar = identifierName(args[0])
      const speed = toExpr(args[1], ctx)
      return spriteVar && isSimpleValue(speed)
        ? { type: 'g2d:followPointer', spriteVar, speed }
        : null
    }
    case 'clampToScreen': {
      const spriteVar = identifierName(args[0])
      const ctxVar = identifierName(args[1])
      return spriteVar && ctxVar ? { type: 'g2d:clampToScreen', spriteVar, ctxVar } : null
    }
    case 'steerThrust': {
      // generator: SZGame2D.steerThrust(sprite, speed, turn)
      const spriteVar = identifierName(args[0])
      const speed = toExpr(args[1], ctx)
      const turn = toExpr(args[2], ctx)
      return spriteVar && isSimpleValue(speed) && isSimpleValue(turn)
        ? { type: 'g2d:steerThrust', spriteVar, speed, turn }
        : null
    }
    case 'rotateSprite': {
      const spriteVar = identifierName(args[0])
      const deg = toExpr(args[1], ctx)
      return spriteVar && isSimpleValue(deg) ? { type: 'g2d:rotateSprite', spriteVar, deg } : null
    }
    case 'pointSprite': {
      const spriteVar = identifierName(args[0])
      const deg = toExpr(args[1], ctx)
      return spriteVar && isSimpleValue(deg) ? { type: 'g2d:pointSprite', spriteVar, deg } : null
    }
    case 'thrust': {
      const spriteVar = identifierName(args[0])
      const force = toExpr(args[1], ctx)
      return spriteVar && isSimpleValue(force) ? { type: 'g2d:thrust', spriteVar, force } : null
    }
    case 'applyFriction': {
      const spriteVar = identifierName(args[0])
      const factor = toExpr(args[1], ctx)
      return spriteVar && isSimpleValue(factor)
        ? { type: 'g2d:applyFriction', spriteVar, factor }
        : null
    }
    case 'shootFrom': {
      // generator: SZGame2D.shootFrom(sprite, group, { speed, color })
      const spriteVar = identifierName(args[0])
      const groupVar = identifierName(args[1])
      if (!spriteVar || !groupVar || args[2]?.type !== 'ObjectExpression') return null
      const o = readShootFromOptions(args[2], ctx)
      return o
        ? { type: 'g2d:shootFrom', spriteVar, groupVar, speed: o.speed, color: o.color }
        : null
    }
    case 'spawnAsteroidFromEdge': {
      // generator: SZGame2D.spawnAsteroidFromEdge(group, { size, color, speed })
      const groupVar = identifierName(args[0])
      if (!groupVar || args[1]?.type !== 'ObjectExpression') return null
      const o = readAsteroidEdgeOptions(args[1], ctx)
      return o
        ? { type: 'g2d:spawnAsteroidEdge', groupVar, size: o.size, color: o.color, speed: o.speed }
        : null
    }
    case 'flash': {
      // generator: SZGame2D.flash(ctx, "color")
      const ctxVar = identifierName(args[0])
      if (!ctxVar || args[1]?.type !== 'StringLiteral') return null
      return { type: 'g2d:flash', ctxVar, color: args[1].value as string }
    }
    case 'shake': {
      const ctxVar = identifierName(args[0])
      const intensity = toExpr(args[1], ctx)
      return ctxVar && isSimpleValue(intensity) ? { type: 'g2d:shake', ctxVar, intensity } : null
    }
    case 'emitParticles': {
      // generator: SZGame2D.emitParticles(x, y, count, "color")
      const x = toExpr(args[0], ctx)
      const y = toExpr(args[1], ctx)
      const count = toExpr(args[2], ctx)
      if (
        !isSimpleValue(x) ||
        !isSimpleValue(y) ||
        !isSimpleValue(count) ||
        args[3]?.type !== 'StringLiteral'
      )
        return null
      return { type: 'g2d:emitParticles', x, y, count, color: args[3].value as string }
    }
    case 'drawParticles': {
      const ctxVar = identifierName(args[0])
      return ctxVar ? { type: 'g2d:drawParticles', ctxVar } : null
    }
    case 'drawTileMap': {
      // generator: SZGame2D.drawTileMap(ctx, map, x, y[, size]) — o 5º argumento
      // (tamanho do tile na tela) é opcional; código antigo tem só 4.
      const ctxVar = identifierName(args[0])
      const mapVar = identifierName(args[1])
      const x = toExpr(args[2], ctx)
      const y = toExpr(args[3], ctx)
      if (!ctxVar || !mapVar || !isSimpleValue(x) || !isSimpleValue(y)) return null
      if (args.length < 5) return { type: 'g2d:drawTileMap', ctxVar, mapVar, x, y }
      const size = toExpr(args[4], ctx)
      return isSimpleValue(size) ? { type: 'g2d:drawTileMap', ctxVar, mapVar, x, y, size } : null
    }
    case 'collideTileMap': {
      // generator: SZGame2D.collideTileMap(sprite, map)
      const spriteVar = identifierName(args[0])
      const mapVar = identifierName(args[1])
      return spriteVar && mapVar ? { type: 'g2d:tileMapCollide', spriteVar, mapVar } : null
    }
    case 'collideGroup': {
      // generator: SZGame2D.collideGroup(sprite, group)
      const spriteVar = identifierName(args[0])
      const groupVar = identifierName(args[1])
      return spriteVar && groupVar ? { type: 'g2d:collideGroup', spriteVar, groupVar } : null
    }
    case 'collideSprite': {
      // generator: SZGame2D.collideSprite(sprite, other)
      const spriteVar = identifierName(args[0])
      const otherVar = identifierName(args[1])
      return spriteVar && otherVar ? { type: 'g2d:collideSprite', spriteVar, otherVar } : null
    }
    case 'spawn': {
      // generator: SZGame2D.spawn(g, { x, y, w, h, color|image, vx, vy })
      const groupVar = identifierName(args[0])
      if (!groupVar || args[1]?.type !== 'ObjectExpression') return null
      const opts = readSpawnOptions(args[1], ctx)
      if (!opts) return null
      if (opts.image != null) {
        const { x, y, w, h, image, vx, vy } = opts
        return { type: 'g2d:spawnImageInGroup', groupVar, x, y, w, h, image, vx, vy }
      }
      const { x, y, w, h, color, vx, vy } = opts
      return { type: 'g2d:spawnInGroup', groupVar, x, y, w, h, color, vx, vy }
    }
    case 'updateGroup': {
      const groupVar = identifierName(args[0])
      return groupVar ? { type: 'g2d:updateGroup', groupVar } : null
    }
    case 'updateGroupNoGravity': {
      const groupVar = identifierName(args[0])
      return groupVar ? { type: 'g2d:updateGroupNoGravity', groupVar } : null
    }
    case 'drawGroup': {
      // generator: SZGame2D.drawGroup(ctx, g)
      const ctxVar = identifierName(args[0])
      const groupVar = identifierName(args[1])
      return ctxVar && groupVar ? { type: 'g2d:drawGroup', groupVar, ctxVar } : null
    }
    case 'forEachInGroup': {
      // generator: SZGame2D.forEachInGroup(g, function (item) {…})
      const groupVar = identifierName(args[0])
      if (!groupVar || !isFn(args[1])) return null
      const itemName = identifierName(args[1].params?.[0]) ?? 'sprite'
      ctx.spriteVars.add(itemName)
      return {
        type: 'g2d:forEachInGroup',
        groupVar,
        itemName,
        body: bodyOfFn(args[1], source, ctx),
      }
    }
    case 'clearGroup': {
      const groupVar = identifierName(args[0])
      return groupVar ? { type: 'g2d:clearGroup', groupVar } : null
    }
    case 'pruneOffscreen': {
      // generator: SZGame2D.pruneOffscreen(ctx, g, 40, function (item) {…})
      const ctxVar = identifierName(args[0])
      const groupVar = identifierName(args[1])
      if (!ctxVar || !groupVar || !isFn(args[3])) return null
      const itemName = identifierName(args[3].params?.[0]) ?? 'sprite'
      ctx.spriteVars.add(itemName)
      return {
        type: 'g2d:pruneOffscreen',
        groupVar,
        ctxVar,
        itemName,
        body: bodyOfFn(args[3], source, ctx),
      }
    }
    case 'overlapGroups': {
      // generator: SZGame2D.overlapGroups(a, b, function (x, y) {…})
      const aGroup = identifierName(args[0])
      const bGroup = identifierName(args[1])
      if (!aGroup || !bGroup || !isFn(args[2])) return null
      const params = args[2].params ?? []
      const aName = identifierName(params[0]) ?? 'a'
      const bName = identifierName(params[1]) ?? 'b'
      ctx.spriteVars.add(aName)
      ctx.spriteVars.add(bName)
      return {
        type: 'g2d:onGroupOverlap',
        aGroup,
        aName,
        bGroup,
        bName,
        body: bodyOfFn(args[2], source, ctx),
      }
    }
    case 'removeFromGroup': {
      // generator: SZGame2D.removeFromGroup(g, sprite)
      const groupVar = identifierName(args[0])
      const spriteVar = identifierName(args[1])
      return groupVar && spriteVar ? { type: 'g2d:removeFromGroup', spriteVar, groupVar } : null
    }
    case 'drawScore': {
      // generator: SZGame2D.drawScore(ctx, "label", value, x, y, "color", size)
      const ctxVar = identifierName(args[0])
      const value = toExpr(args[2], ctx)
      const x = toExpr(args[3], ctx)
      const y = toExpr(args[4], ctx)
      const size = toExpr(args[6], ctx)
      if (
        !ctxVar ||
        args[1]?.type !== 'StringLiteral' ||
        !isSimpleValue(value) ||
        !isSimpleValue(x) ||
        !isSimpleValue(y) ||
        args[5]?.type !== 'StringLiteral' ||
        !isSimpleValue(size)
      ) {
        return null
      }
      return {
        type: 'g2d:drawScore',
        ctxVar,
        label: args[1].value as string,
        value,
        x,
        y,
        color: args[5].value as string,
        size,
      }
    }
    case 'drawLabel': {
      // generator: SZGame2D.drawLabel(ctx, "text", x, y, "color", size, "align")
      const ctxVar = identifierName(args[0])
      const x = toExpr(args[2], ctx)
      const y = toExpr(args[3], ctx)
      const size = toExpr(args[5], ctx)
      if (
        !ctxVar ||
        args[1]?.type !== 'StringLiteral' ||
        !isSimpleValue(x) ||
        !isSimpleValue(y) ||
        args[4]?.type !== 'StringLiteral' ||
        !isSimpleValue(size) ||
        args[6]?.type !== 'StringLiteral'
      ) {
        return null
      }
      const align = args[6].value as string
      return {
        type: 'g2d:drawLabel',
        ctxVar,
        text: args[1].value as string,
        x,
        y,
        color: args[4].value as string,
        size,
        align: align === 'center' || align === 'right' ? align : 'left',
      }
    }
    case 'drawHearts': {
      // generator: SZGame2D.drawHearts(ctx, count, x, y, size, "color")
      const ctxVar = identifierName(args[0])
      const count = toExpr(args[1], ctx)
      const x = toExpr(args[2], ctx)
      const y = toExpr(args[3], ctx)
      const size = toExpr(args[4], ctx)
      if (
        !ctxVar ||
        !isSimpleValue(count) ||
        !isSimpleValue(x) ||
        !isSimpleValue(y) ||
        !isSimpleValue(size) ||
        args[5]?.type !== 'StringLiteral'
      ) {
        return null
      }
      return { type: 'g2d:drawHearts', ctxVar, count, x, y, size, color: args[5].value as string }
    }
    case 'drawBar': {
      // generator: SZGame2D.drawBar(ctx, value, max, x, y, w, h, "color")
      const ctxVar = identifierName(args[0])
      const value = toExpr(args[1], ctx)
      const max = toExpr(args[2], ctx)
      const x = toExpr(args[3], ctx)
      const y = toExpr(args[4], ctx)
      const w = toExpr(args[5], ctx)
      const h = toExpr(args[6], ctx)
      if (
        !ctxVar ||
        !isSimpleValue(value) ||
        !isSimpleValue(max) ||
        !isSimpleValue(x) ||
        !isSimpleValue(y) ||
        !isSimpleValue(w) ||
        !isSimpleValue(h) ||
        args[7]?.type !== 'StringLiteral'
      ) {
        return null
      }
      return { type: 'g2d:drawBar', ctxVar, value, max, x, y, w, h, color: args[7].value as string }
    }
    case 'setScene': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'g2d:setScene', name: args[0].value as string }
    }
    case 'showScreen': {
      // generator: SZGame2D.showScreen(ctx, title, subtitle, hint, "bg")
      // título/subtítulo/dica aceitam texto, variável, "juntar texto", função…
      const ctxVar = identifierName(args[0])
      if (!ctxVar || !args[1] || !args[2] || !args[3] || args[4]?.type !== 'StringLiteral') {
        return null
      }
      const title = toExpr(args[1], ctx)
      const subtitle = toExpr(args[2], ctx)
      const hint = toExpr(args[3], ctx)
      if (!title || !subtitle || !hint) return null
      return {
        type: 'g2d:showScreen',
        ctxVar,
        title,
        subtitle,
        hint,
        bg: args[4].value as string,
      }
    }
    case 'restart':
      return { type: 'g2d:restart' }
    case 'drawStarfield': {
      // generator: SZGame2D.drawStarfield(ctx, speed)
      const ctxVar = identifierName(args[0])
      const speed = toExpr(args[1], ctx)
      return ctxVar && isSimpleValue(speed) ? { type: 'g2d:starfield', ctxVar, speed } : null
    }
    case 'dragX': {
      const spriteVar = identifierName(args[0])
      return spriteVar ? { type: 'g2d:dragX', spriteVar } : null
    }
    case 'fitScreen': {
      const percent = toExpr(args[0], ctx)
      return isSimpleValue(percent) ? { type: 'g2d:fitScreen', percent } : null
    }
    case 'setupStage': {
      const width = toExpr(args[0], ctx)
      const height = toExpr(args[1], ctx)
      // 3º argumento (cor de fundo) é opcional: código antigo de 2 args cai no padrão.
      const bg = args[2]?.type === 'StringLiteral' ? (args[2].value as string) : '#0b1020'
      return isSimpleValue(width) && isSimpleValue(height)
        ? { type: 'g2d:setupStage', width, height, bg }
        : null
    }
    case 'setupStageFull': {
      // generator: SZGame2D.setupStageFull("cor") — tela toda, sem dimensões.
      const bg = args[0]?.type === 'StringLiteral' ? (args[0].value as string) : '#0b1020'
      return { type: 'g2d:setupFull', bg }
    }
    case 'spawnAsteroid': {
      // generator: SZGame2D.spawnAsteroid(g, { x, y, size, color, vx, vy })
      const groupVar = identifierName(args[0])
      if (!groupVar || args[1]?.type !== 'ObjectExpression') return null
      const o = readAsteroidOptions(args[1], ctx)
      if (!o) return null
      return {
        type: 'g2d:spawnAsteroid',
        groupVar,
        x: o.x,
        y: o.y,
        size: o.size,
        color: o.color,
        vx: o.vx,
        vy: o.vy,
      }
    }
    case 'spawnBullet': {
      // generator: SZGame2D.spawnBullet(g, { x, y, radius, color, vx, vy })
      const groupVar = identifierName(args[0])
      if (!groupVar || args[1]?.type !== 'ObjectExpression') return null
      const o = readBulletOptions(args[1], ctx)
      if (!o) return null
      return {
        type: 'g2d:spawnBullet',
        groupVar,
        x: o.x,
        y: o.y,
        radius: o.radius,
        color: o.color,
        vx: o.vx,
        vy: o.vy,
      }
    }
    case 'arrowsX': {
      // generator: SZGame2D.arrowsX(sprite, speed)
      const spriteVar = identifierName(args[0])
      const speed = toExpr(args[1], ctx)
      return spriteVar && isSimpleValue(speed) ? { type: 'g2d:arrowsX', spriteVar, speed } : null
    }
    case 'blink': {
      // generator: SZGame2D.blink(sprite, frames)
      const spriteVar = identifierName(args[0])
      const frames = toExpr(args[1], ctx)
      return spriteVar && isSimpleValue(frames)
        ? { type: 'g2d:blinkSprite', spriteVar, frames }
        : null
    }
    case 'explodeSprite': {
      // generator: SZGame2D.explodeSprite(sprite, "color")
      const spriteVar = identifierName(args[0])
      if (!spriteVar || args[1]?.type !== 'StringLiteral') return null
      return { type: 'g2d:explode', spriteVar, color: args[1].value as string }
    }
    case 'playShoot':
      return { type: 'g2d:playShoot' }
    case 'playExplosion':
      return { type: 'g2d:playExplosion' }
    case 'jumpOnGround': {
      // generator: SZGame2D.jumpOnGround(sprite, ctx, jump)
      const spriteVar = identifierName(args[0])
      const ctxVar = identifierName(args[1])
      const jump = toExpr(args[2], ctx)
      return spriteVar && ctxVar && isSimpleValue(jump)
        ? { type: 'g2d:jumpOnGround', spriteVar, ctxVar, jump }
        : null
    }
    case 'controlDino': {
      // generator: SZGame2D.controlDino(sprite, ctx, jump)
      const spriteVar = identifierName(args[0])
      const ctxVar = identifierName(args[1])
      const jump = toExpr(args[2], ctx)
      return spriteVar && ctxVar && isSimpleValue(jump)
        ? { type: 'g2d:controlDino', spriteVar, ctxVar, jump }
        : null
    }
    case 'spawnObstacle': {
      // generator: SZGame2D.spawnObstacle(group, ctx, { type, x, size, vx })
      const groupVar = identifierName(args[0])
      const ctxVar = identifierName(args[1])
      if (!groupVar || !ctxVar || args[2]?.type !== 'ObjectExpression') return null
      const o = readObstacleOptions(args[2], ctx)
      if (!o) return null
      return {
        type: 'g2d:spawnObstacle',
        groupVar,
        ctxVar,
        shape: o.shape,
        x: o.x,
        size: o.size,
        vx: o.vx,
      }
    }
    case 'spawnEgg': {
      // generator: SZGame2D.spawnEgg(group, { x, y, vx })
      const groupVar = identifierName(args[0])
      if (!groupVar || args[1]?.type !== 'ObjectExpression') return null
      const o = readEggOptions(args[1], ctx)
      if (!o) return null
      return { type: 'g2d:spawnEgg', groupVar, x: o.x, y: o.y, vx: o.vx }
    }
    case 'drawForest': {
      // generator: SZGame2D.drawForest(ctx, speed)
      const ctxVar = identifierName(args[0])
      const speed = toExpr(args[1], ctx)
      return ctxVar && isSimpleValue(speed) ? { type: 'g2d:forest', ctxVar, speed } : null
    }
    case 'playJump':
      return { type: 'g2d:playJump' }
    case 'playDinoHurt':
      return { type: 'g2d:playDinoHurt' }
    case 'playCollect':
      return { type: 'g2d:playCollect' }
    case 'drawCity': {
      // generator: SZGame2D.drawCity(ctx, city)
      const ctxVar = identifierName(args[0])
      const cityVar = identifierName(args[1])
      return ctxVar && cityVar ? { type: 'g2d:drawCity', cityVar, ctxVar } : null
    }
    case 'newWind': {
      const cityVar = identifierName(args[0])
      return cityVar ? { type: 'g2d:newWind', cityVar } : null
    }
    case 'drawWind': {
      // generator: SZGame2D.drawWind(ctx, city)
      const ctxVar = identifierName(args[0])
      const cityVar = identifierName(args[1])
      return ctxVar && cityVar ? { type: 'g2d:drawWind', cityVar, ctxVar } : null
    }
    case 'aimDrag': {
      // generator: SZGame2D.aimDrag(ctx, thrower)
      const ctxVar = identifierName(args[0])
      const throwerVar = identifierName(args[1])
      return ctxVar && throwerVar ? { type: 'g2d:aimDrag', throwerVar, ctxVar } : null
    }
    case 'throwBanana': {
      // generator: SZGame2D.throwBanana(thrower, city)
      const throwerVar = identifierName(args[0])
      const cityVar = identifierName(args[1])
      return throwerVar && cityVar ? { type: 'g2d:throwBanana', throwerVar, cityVar } : null
    }
    case 'updateBanana': {
      const cityVar = identifierName(args[0])
      return cityVar ? { type: 'g2d:updateBanana', cityVar } : null
    }
    case 'drawBanana': {
      // generator: SZGame2D.drawBanana(ctx, city)
      const ctxVar = identifierName(args[0])
      const cityVar = identifierName(args[1])
      return ctxVar && cityVar ? { type: 'g2d:drawBanana', cityVar, ctxVar } : null
    }
    case 'playWhistle':
      return { type: 'g2d:playWhistle' }
    case 'playBoom':
      return { type: 'g2d:playBoom' }
    case 'computerTurn': {
      // generator: SZGame2D.computerTurn(thrower, city, enemy)
      const throwerVar = identifierName(args[0])
      const cityVar = identifierName(args[1])
      const enemyVar = identifierName(args[2])
      return throwerVar && cityVar && enemyVar
        ? { type: 'g2d:computerTurn', throwerVar, cityVar, enemyVar }
        : null
    }
    case 'drawAimReadout': {
      const ctxVar = identifierName(args[0])
      return ctxVar ? { type: 'g2d:drawAimReadout', ctxVar } : null
    }
    case 'updateStickHero': {
      const gameVar = identifierName(args[0])
      return gameVar ? { type: 'g2d:updateStickHero', gameVar } : null
    }
    case 'restartStickHero': {
      const gameVar = identifierName(args[0])
      return gameVar ? { type: 'g2d:restartStickHero', gameVar } : null
    }
    case 'updateBalloon': {
      const gameVar = identifierName(args[0])
      return gameVar ? { type: 'g2d:updateBalloon', gameVar } : null
    }
    case 'restartBalloon': {
      const gameVar = identifierName(args[0])
      return gameVar ? { type: 'g2d:restartBalloon', gameVar } : null
    }
    case 'overlapSpriteGroup': {
      // generator: SZGame2D.overlapSpriteGroup(() => sprite, grupo, function (item) {…})
      const spriteVar = arrowReturnIdentifier(args[0])
      const groupVar = identifierName(args[1])
      if (!spriteVar || !groupVar || !isFn(args[2])) return null
      const itemName = identifierName(args[2].params?.[0]) ?? 'inimigo'
      ctx.spriteVars.add(itemName)
      return {
        type: 'g2d:onSpriteGroupOverlap',
        spriteVar,
        groupVar,
        itemName,
        body: bodyOfFn(args[2], source, ctx),
      }
    }
    default:
      // createSprite/isColliding/circleCollides/loadSpriteSheet são var-init
      // (tryMatchGame2DVarInit); como chamada solta caem no método genérico.
      return null
  }
}

/** `const x = SZGame2D.createSprite({...}) | isColliding(a,b) | circleCollides(a,b)`. */
function tryMatchGame2DVarInit(name: string, init: Node, ctx: ParseCtx): JSStatement | null {
  const call = asSZGame2DCall(init)
  if (!call) return null
  const { method, args } = call
  if (method === 'isColliding' || method === 'circleCollides') {
    const aVar = identifierName(args[0])
    const bVar = identifierName(args[1])
    if (!aVar || !bVar) return null
    const type = method === 'circleCollides' ? 'g2d:circleCollides' : 'g2d:collides'
    return { type, aVar, bVar, varName: name }
  }
  if (method === 'createSprite') {
    if (args[0]?.type !== 'ObjectExpression') return null
    const sprite = readSpriteOptions(args[0], ctx)
    if (!sprite) return null
    ctx.spriteVars.add(name)
    // Com `image` → sprite de imagem (o bloco colorido não tem essa chave); o
    // color do default é descartado nesse caminho.
    if (sprite.image != null) {
      const { x, y, w, h, image } = sprite
      return { type: 'g2d:createImageSprite', varName: name, x, y, w, h, image }
    }
    const { x, y, w, h, color } = sprite
    return { type: 'g2d:createSprite', varName: name, x, y, w, h, color }
  }
  if (method === 'createShapeSprite') {
    // generator: const p = SZGame2D.createShapeSprite("figura", { x, y, w, h })
    if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'ObjectExpression') return null
    const sprite = readSpriteOptions(args[1], ctx)
    if (!sprite) return null
    ctx.spriteVars.add(name)
    const { x, y, w, h } = sprite
    return {
      type: 'g2d:createShapeSprite',
      varName: name,
      shapeName: args[0].value as string,
      x,
      y,
      w,
      h,
    }
  }
  if (method === 'createGroup') {
    // generator: const g = SZGame2D.createGroup()
    return { type: 'g2d:createGroup', varName: name }
  }
  if (method === 'createEnemyType') {
    // generator: const zumbi = SZGame2D.createEnemyType({ behavior, color, image, hp, speed, dmg, w, h })
    if (args[0]?.type !== 'ObjectExpression') return null
    const o = readEnemyTypeOptions(args[0], ctx)
    if (!o) return null
    return {
      type: 'g2d:defineEnemyType',
      varName: name,
      behavior: o.behavior,
      color: o.color,
      image: o.image,
      hp: o.hp,
      speed: o.speed,
      dmg: o.dmg,
      w: o.w,
      h: o.h,
    }
  }
  if (method === 'createShip') {
    // generator: const nave = SZGame2D.createShip({ x, y, w, h, body, wings })
    if (args[0]?.type !== 'ObjectExpression') return null
    const o = readShipOptions(args[0], ctx)
    if (!o) return null
    ctx.spriteVars.add(name)
    return {
      type: 'g2d:createShip',
      varName: name,
      x: o.x,
      y: o.y,
      w: o.w,
      h: o.h,
      bodyColor: o.body,
      wingColor: o.wings,
    }
  }
  if (method === 'createDino') {
    // generator: const dino = SZGame2D.createDino({ x, y, size, color })
    if (args[0]?.type !== 'ObjectExpression') return null
    const o = readDinoOptions(args[0], ctx)
    if (!o) return null
    ctx.spriteVars.add(name)
    return { type: 'g2d:createDino', varName: name, x: o.x, y: o.y, size: o.size, color: o.color }
  }
  if (method === 'createStickHero') {
    // generator: const jogo = SZGame2D.createStickHero(ctx)
    const ctxVar = identifierName(args[0]) ?? 'ctx'
    return { type: 'g2d:createStickHero', varName: name, ctxVar }
  }
  if (method === 'createBalloon') {
    // generator: const jogo = SZGame2D.createBalloon(ctx)
    const ctxVar = identifierName(args[0]) ?? 'ctx'
    return { type: 'g2d:createBalloon', varName: name, ctxVar }
  }
  if (method === 'createCity') {
    // generator: const cidade = SZGame2D.createCity()
    return { type: 'g2d:createCity', varName: name }
  }
  if (method === 'placeThrower') {
    // generator: const g = SZGame2D.placeThrower(city, { side, color })
    const cityVar = identifierName(args[0])
    if (!cityVar || args[1]?.type !== 'ObjectExpression') return null
    const o = readThrowerOptions(args[1])
    if (!o) return null
    ctx.spriteVars.add(name)
    return { type: 'g2d:placeThrower', varName: name, cityVar, side: o.side, color: o.color }
  }
  if (method === 'loadSpriteSheet') {
    // generator: const v = SZGame2D.loadSpriteSheet('nome', fw, fh)
    if (args[0]?.type !== 'StringLiteral') return null
    const frameW = toExpr(args[1], ctx)
    const frameH = toExpr(args[2], ctx)
    if (!isSimpleValue(frameW) || !isSimpleValue(frameH)) return null
    return {
      type: 'g2d:loadSpritesheet',
      varName: name,
      image: args[0].value as string,
      frameW,
      frameH,
    }
  }
  if (method === 'createTileMap') {
    // generator: const map = SZGame2D.createTileMap({ image, tile, solid, grid })
    if (args[0]?.type !== 'ObjectExpression') return null
    const opts = readTileMapOptions(args[0], ctx)
    if (!opts) return null
    return { type: 'g2d:createTileMap', varName: name, ...opts }
  }
  if (method === 'createTileMapFromAsset') {
    // generator: const m = SZGame2D.createTileMapFromAsset("meu-mapa")
    if (args[0]?.type !== 'StringLiteral') return null
    return { type: 'g2d:createTileMapFromAsset', varName: name, image: args[0].value as string }
  }
  return null
}

/** `<sprite>.<prop> = <expr>;` onde `<sprite>` é um sprite conhecido. */
function matchSpriteMemberAssign(
  node: Node,
  ctx: ParseCtx,
  prop: 'vx' | 'vy' | 'x' | 'y',
): { spriteVar: string; value: JSExpr } | null {
  if (node?.type !== 'ExpressionStatement') return null
  const expr = node.expression
  if (expr?.type !== 'AssignmentExpression' || expr.operator !== '=') return null
  const left = expr.left
  if (left?.type !== 'MemberExpression' || left.computed) return null
  if (left.object?.type !== 'Identifier' || left.property?.type !== 'Identifier') return null
  if (left.property.name !== prop) return null
  const spriteVar = left.object.name as string
  if (!ctx.spriteVars.has(spriteVar)) return null
  const value = toExpr(expr.right, ctx)
  return isSimpleValue(value) ? { spriteVar, value: value as JSExpr } : null
}

/** `s.vx = …; s.vy = …;` → `g2d:setVelocity`; `s.x = …; s.y = …;` → `g2d:setPosition`. */
function tryFuseGame2DSpriteAssign(nodes: Node[], i: number, ctx: ParseCtx): FusedStatement | null {
  const vx = matchSpriteMemberAssign(nodes[i], ctx, 'vx')
  if (vx) {
    const vy = matchSpriteMemberAssign(nodes[i + 1], ctx, 'vy')
    if (vy && vy.spriteVar === vx.spriteVar) {
      return {
        stmt: { type: 'g2d:setVelocity', spriteVar: vx.spriteVar, vx: vx.value, vy: vy.value },
        consumed: 2,
      }
    }
  }
  const px = matchSpriteMemberAssign(nodes[i], ctx, 'x')
  if (px) {
    const py = matchSpriteMemberAssign(nodes[i + 1], ctx, 'y')
    if (py && py.spriteVar === px.spriteVar) {
      return {
        stmt: { type: 'g2d:setPosition', spriteVar: px.spriteVar, x: px.value, y: py.value },
        consumed: 2,
      }
    }
  }
  return null
}

// ---------- game-3d: reverse-parse dos helpers SZGame3D.* ----------
// O gerador emite `const cena = SZGame3D.createScene("tela")`, `SZGame3D.animate
// (cena, () => {…})`, `SZGame3D.setRotation(obj, x, y, z)` etc. Estes matchers
// reconhecem esse código de volta nos blocos g3d:* (modo Ponte), espelhando os
// sites de emissão em generators/js.ts — qualquer mudança de assinatura lá precisa
// refletir aqui. Casos `const x = SZGame3D.createScene/createBox/createSphere(...)`
// ficam em tryMatchGame3DVarInit; os demais (chamada solta) em tryMatchGame3DCall.

/** `SZGame3D.<metodo>(args)` → `{ method, args }` se o objeto for exatamente SZGame3D. */
function asSZGame3DCall(expr: Node): { method: string; args: Node[] } | null {
  if (expr?.type !== 'CallExpression') return null
  const callee = expr.callee
  if (callee?.type !== 'MemberExpression' || callee.computed) return null
  if (callee.object?.type !== 'Identifier' || callee.object.name !== 'SZGame3D') return null
  if (callee.property?.type !== 'Identifier') return null
  return { method: callee.property.name as string, args: expr.arguments ?? [] }
}

/** Lê `{ size, color }` de um literal de objeto. null se alguma chave for não-literal/desconhecida. */
function readBoxOptions(obj: Node, ctx: ParseCtx): { size: JSExpr; color: string } | null {
  const result = { size: { type: 'num', value: 1 } as JSExpr, color: '#22d3ee' }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (key === 'size') {
      const v = toExpr(prop.value, ctx)
      if (!isSimpleValue(v)) return null
      result.size = v
    } else if (key === 'color') {
      if (prop.value?.type !== 'StringLiteral') return null
      result.color = prop.value.value as string
    } else {
      return null
    }
  }
  return result
}

/** Lê `{ <numKeys>, color }` (genérico) de um literal de objeto, p/ as formas da Fase 6. */
function readShapeOpts(
  obj: Node,
  numKeys: string[],
  ctx: ParseCtx,
): Record<string, JSExpr | string> | null {
  const result: Record<string, JSExpr | string> = { color: '#22d3ee' }
  for (const k of numKeys) result[k] = { type: 'num', value: 1 }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (key && numKeys.includes(key)) {
      const v = toExpr(prop.value, ctx)
      if (!isSimpleValue(v)) return null
      result[key] = v
    } else if (key === 'color') {
      if (prop.value?.type !== 'StringLiteral') return null
      result.color = prop.value.value as string
    } else {
      return null
    }
  }
  return result
}

/** Lê `{ radius, color }` de um literal de objeto. null se alguma chave for não-literal/desconhecida. */
function readSphereOptions(obj: Node, ctx: ParseCtx): { radius: JSExpr; color: string } | null {
  const result = { radius: { type: 'num', value: 0.5 } as JSExpr, color: '#f59e0b' }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (key === 'radius') {
      const v = toExpr(prop.value, ctx)
      if (!isSimpleValue(v)) return null
      result.radius = v
    } else if (key === 'color') {
      if (prop.value?.type !== 'StringLiteral') return null
      result.color = prop.value.value as string
    } else {
      return null
    }
  }
  return result
}

/** Lê `{ width, height, depth, color }` de um literal de objeto. null se chave não-literal/desconhecida. */
function readBlockOptions(
  obj: Node,
  ctx: ParseCtx,
): { width: JSExpr; height: JSExpr; depth: JSExpr; color: string } | null {
  const result = {
    width: { type: 'num', value: 1 } as JSExpr,
    height: { type: 'num', value: 1 } as JSExpr,
    depth: { type: 'num', value: 1 } as JSExpr,
    color: '#22d3ee',
  }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (key === 'width' || key === 'height' || key === 'depth') {
      const v = toExpr(prop.value, ctx)
      if (!isSimpleValue(v)) return null
      result[key] = v
    } else if (key === 'color') {
      if (prop.value?.type !== 'StringLiteral') return null
      result.color = prop.value.value as string
    } else {
      return null
    }
  }
  return result
}

// ---------- game-2d-advanced: reverse-parse dos helpers SZGameKit.* ----------
// O gerador emite `SZGameKit.setup({...})`, `SZGameKit.onUpdate(function (dt) {…})`
// etc. Estes matchers reconhecem esse código de volta nos nós gk:* (modo Ponte).
// Espelham generators/js.ts — mudou a assinatura lá, reflita aqui.

/** `SZGameKit.<metodo>(args)` → `{ method, args }` se o objeto for exatamente SZGameKit. */
function asSZGameKitCall(expr: Node): { method: string; args: Node[] } | null {
  if (expr?.type !== 'CallExpression') return null
  const callee = expr.callee
  if (callee?.type !== 'MemberExpression' || callee.computed) return null
  if (callee.object?.type !== 'Identifier' || callee.object.name !== 'SZGameKit') return null
  if (callee.property?.type !== 'Identifier') return null
  return { method: callee.property.name as string, args: expr.arguments ?? [] }
}

/**
 * Telas PRONTAS do kit (o dropdown do bloco "Personalizar a tela pronta").
 * O parser valida o enum: tela desconhecida → null → rawJS (um dropdown coagiria
 * o valor para a 1ª opção e o round-trip mentiria — padrão do set_state_anim).
 */
const GK_FIXED_SCREENS = new Set(['menu', 'pausa', 'carregando', 'fim', 'vitoria'])
/** Enums dos dropdowns da física (R11) — valor fora da lista vira rawJS, senão o
 * dropdown coagiria p/ a 1ª opção e a criança perderia o que escreveu. */
// ⚠️ Espelha o ENTITY_PROPS do runtime da extensão E os dropdowns de "a
// propriedade"/"Mudar a propriedade" — divergir vira rawJS. (O deslizar tem a
// lista própria, GK_TWEEN_PROPS: "dano" não desliza, "opacidade" não se lê.)
const GK_ENTITY_PROPS = new Set([
  'x',
  'y',
  'vx',
  'vy',
  'speed',
  'w',
  'h',
  'health',
  'maxHealth',
  'damage',
])
const GK_FACING_DIRS = new Set(['left', 'right', 'up', 'down'])
const GK_AXES = new Set(['x', 'y'])
/** Os 4 estados do herói de plataforma — espelha o PLAT_STATES do runtime e o
 * dropdown do bloco. Estado desconhecido → rawJS (o dropdown coage valor). */
const GK_PLAT_STATES = new Set(['parado', 'andando', 'pulando', 'caindo'])
/** O que o "deslizar a propriedade" aceita — espelha o ENTITY_PROPS do runtime
 * mais a opacidade (que não é uma propriedade de física). */
/** As 4 coreografias de golpe (espelha o dropdown do bloco). */
const GK_PKM_FX = new Set(['investida', 'bola', 'raio', 'onda'])
/** Os 4 níveis de dificuldade de captura (espelha o dropdown). */
const GK_PKM_DIFF = new Set(['fácil', 'normal', 'difícil', 'raríssimo'])
// Espelha o STATE_NAMES do runtime da extensão e os dropdowns de estado do
// blocks.ts — divergir vira rawJS.
// Espelham os dropdowns do Kit Luta e as tabelas do runtime.
const GK_LUTA_SPEEDS = new Set(['rápido', 'médio', 'pesado'])
const GK_LUTA_LEVELS = new Set(['fácil', 'normal', 'difícil'])
// 🚀 Kit Nave: espelha o dropdown do sz_gk_nave_powerup (fora do Set → rawJS).
const GK_NAVE_POWERS = new Set(['metralhadora', 'leque'])
// 🎲 R25: espelha os dropdowns do "o vivo com maior/menor …" (fora → rawJS).
const GK_PICK_MODES = new Set(['maior', 'menor'])
const GK_PICK_PROPS = new Set([...GK_ENTITY_PROPS, 'pathProgress'])
// 🌿 R25: espelha o dropdown de status do rpgInflict (veneno é o default).
const GK_RPG_STATUS = new Set(['veneno', 'regenera', 'atrapalha'])
// R29: espelha o dropdown de QUEM do rpgInflict (fora → rawJS, como os outros).
const GK_INFLICT_WHO = new Set(['inimigo', 'heroi'])
// R29: espelha o dropdown de efeito do playEffect (10 opções fixas; fora → rawJS,
// senão a Ponte reversa coagia p/ a 1ª opção "coin" e reescrevia o código da criança).
const GK_FX_KINDS = new Set([
  'coin',
  'hit',
  'explosion',
  'jump',
  'laser',
  'hurt',
  'powerup',
  'win',
  'gameover',
  'click',
])
// 🌍 Mundo aberto: espelha o dropdown de borda do rpgConnectEdge (fora → rawJS).
const GK_EDGE_SIDES = new Set(['norte', 'sul', 'leste', 'oeste'])
const GK_ENTITY_STATES = new Set([
  'parado',
  'andando',
  'pulando',
  'caindo',
  'dano',
  'golpe',
  'morte',
])
const GK_TWEEN_PROPS = new Set(['x', 'y', 'vx', 'vy', 'speed', 'w', 'h', 'health', 'opacity'])

/** SZGameKit.keyDown("w") / touching(a, b) / width() … em posição de VALOR. */
function matchGameKitExpr(node: Node, ctx?: ParseCtx): JSExpr | null {
  const call = asSZGameKitCall(node)
  if (!call) return null
  const { method, args } = call
  if (method === 'width' && args.length === 0) return { type: 'gk:gameWidth' }
  if (method === 'height' && args.length === 0) return { type: 'gk:gameHeight' }
  if (method === 'state' && args.length === 0) return { type: 'gk:gameState' }
  if (method === 'stateIs' && args[0]?.type === 'StringLiteral') {
    return { type: 'gk:stateIs', name: args[0].value as string }
  }
  if (method === 'touching') {
    const aVar = identifierName(args[0])
    const bVar = identifierName(args[1])
    if (aVar && bVar) return { type: 'gk:charactersTouch', aVar, bVar }
  }
  if (method === 'charX') {
    const charVar = identifierName(args[0])
    if (charVar) return { type: 'gk:charX', charVar }
  }
  if (method === 'charY') {
    const charVar = identifierName(args[0])
    if (charVar) return { type: 'gk:charY', charVar }
  }
  if (method === 'keyDown' && args[0]?.type === 'StringLiteral') {
    return { type: 'gk:keyDown', key: args[0].value as string }
  }
  if (method === 'keyPressed' && args[0]?.type === 'StringLiteral') {
    return { type: 'gk:keyPressed', key: args[0].value as string }
  }
  if (method === 'countActive' && args[0]?.type === 'StringLiteral') {
    return { type: 'gk:countActive', mold: args[0].value as string }
  }
  if (method === 'touchCircle') {
    const aVar = identifierName(args[0])
    const bVar = identifierName(args[1])
    if (aVar && bVar) return { type: 'gk:touchCircle', aVar, bVar }
  }
  if (method === 'didHit') {
    const aVar = identifierName(args[0])
    const bVar = identifierName(args[1])
    if (aVar && bVar) return { type: 'gk:didHit', aVar, bVar }
  }
  if (method === 'isOnGround') {
    const charVar = identifierName(args[0])
    if (charVar) return { type: 'gk:isOnGround', charVar }
  }
  // 🧭 R15
  if (method === 'isInside' || method === 'overlapPercent') {
    const charVar = identifierName(args[0])
    if (charVar && args[1]?.type === 'StringLiteral') {
      const region = args[1].value as string
      return method === 'isInside'
        ? { type: 'gk:isInside', charVar, region }
        : { type: 'gk:overlapPercent', charVar, region }
    }
  }
  if (method === 'chance') {
    const percent = toExpr(args[0], ctx)
    if (isSimpleValue(percent)) return { type: 'gk:chance', percent }
  }
  if (method === 'distanceBetween') {
    const a = identifierName(args[0])
    const b = identifierName(args[1])
    if (a && b) return { type: 'gk:distanceBetween', a, b }
  }
  if (method === 'pointIn') {
    const charVar = identifierName(args[2])
    const x = toExpr(args[0], ctx)
    const y = toExpr(args[1], ctx)
    if (charVar && isSimpleValue(x) && isSimpleValue(y))
      return { type: 'gk:pointIn', x, y, charVar }
  }
  if (method === 'opacityOf') {
    const charVar = identifierName(args[0])
    if (charVar) return { type: 'gk:opacityOf', charVar }
  }
  if (method === 'savedValue' && args[0]?.type === 'StringLiteral') {
    return { type: 'gk:savedValue', name: args[0].value as string }
  }
  // 👾 R16
  if ((method === 'pkmLevelOf' || method === 'pkmHas') && args[0]?.type === 'StringLiteral') {
    const creature = args[0].value as string
    return method === 'pkmLevelOf'
      ? { type: 'gk:pkmLevelOf', creature }
      : { type: 'gk:pkmHas', creature }
  }
  if (method === 'pkmTeamSize' && args.length === 0) return { type: 'gk:pkmTeamSize' }
  if (method === 'pkmBallCount' && args.length === 0) return { type: 'gk:pkmBallCount' }
  if (method === 'pkmCaught' && args.length === 0) return { type: 'gk:pkmCaught' }
  if (method === 'facingOf') {
    const charVar = identifierName(args[0])
    if (charVar) return { type: 'gk:facingOf', charVar }
  }
  if (method === 'velocityOf' && args[1]?.type === 'StringLiteral') {
    const charVar = identifierName(args[0])
    const axis = args[1].value as string
    if (charVar && GK_AXES.has(axis)) return { type: 'gk:velocityOf', charVar, axis }
  }
  if (method === 'propertyOf' && args[1]?.type === 'StringLiteral') {
    const charVar = identifierName(args[0])
    const prop = args[1].value as string
    if (charVar && GK_ENTITY_PROPS.has(prop)) return { type: 'gk:propertyOf', charVar, prop }
  }
  if (method === 'cooldownReady') {
    const charVar = identifierName(args[0])
    const seconds = toExpr(args[1], ctx)
    if (charVar && isSimpleValue(seconds)) return { type: 'gk:cooldownReady', charVar, seconds }
  }
  if (method === 'tileAt' && args[0]?.type === 'StringLiteral') {
    const x = toExpr(args[1], ctx)
    const y = toExpr(args[2], ctx)
    if (isSimpleValue(x) && isSimpleValue(y)) {
      return { type: 'gk:tileAt', map: args[0].value as string, x, y }
    }
  }
  if ((method === 'boardGet' || method === 'boardIn') && args[0]?.type === 'StringLiteral') {
    const col = toExpr(args[1], ctx)
    const row = toExpr(args[2], ctx)
    if (isSimpleValue(col) && isSimpleValue(row)) {
      const t = method === 'boardGet' ? 'gk:boardGet' : 'gk:boardIn'
      return { type: t, name: args[0].value as string, col, row }
    }
  }
  if (method === 'boardCount' && args[0]?.type === 'StringLiteral') {
    const value = toExpr(args[1], ctx)
    if (isSimpleValue(value)) {
      return { type: 'gk:boardCount', name: args[0].value as string, value }
    }
  }
  if (method === 'isDead') {
    const charVar = identifierName(args[0])
    if (charVar) return { type: 'gk:isDead', charVar }
  }
  if (method === 'isInvincible') {
    const charVar = identifierName(args[0])
    if (charVar) return { type: 'gk:isInvincible', charVar }
  }
  if (method === 'healthOf') {
    const charVar = identifierName(args[0])
    if (charVar) return { type: 'gk:healthOf', charVar }
  }
  if (method === 'animEnded') {
    const charVar = identifierName(args[0])
    if (charVar) return { type: 'gk:animEnded', charVar }
  }
  if (method === 'lutaWinner' && args.length === 0) return { type: 'gk:lutaWinner' }
  if (method === 'lutaRoundNow' && args.length === 0) return { type: 'gk:lutaRound' }
  if (method === 'lutaWinsOf') {
    const charVar = identifierName(args[0])
    if (charVar) return { type: 'gk:lutaWinsOf', charVar }
  }
  if (method === 'lutaComboOf') {
    const charVar = identifierName(args[0])
    if (charVar) return { type: 'gk:lutaCombo', charVar }
  }
  if (method === 'lutaSpecialOf') {
    const charVar = identifierName(args[0])
    if (charVar) return { type: 'gk:lutaSpecial', charVar }
  }
  if (method === 'lutaIsGuarding') {
    const charVar = identifierName(args[0])
    if (charVar) return { type: 'gk:lutaIsGuarding', charVar }
  }
  if (method === 'entityState') {
    const charVar = identifierName(args[0])
    if (charVar) return { type: 'gk:entityState', charVar }
  }
  if (method === 'angleOf') {
    const charVar = identifierName(args[0])
    if (charVar) return { type: 'gk:angleOf', charVar }
  }
  if (method === 'angleTo') {
    const charVar = identifierName(args[0])
    const targetVar = identifierName(args[1])
    if (charVar && targetVar) return { type: 'gk:angleTo', charVar, targetVar }
  }
  if (method === 'nearestActive' && args[0]?.type === 'StringLiteral') {
    const x = toExpr(args[1], ctx)
    const y = toExpr(args[2], ctx)
    if (isSimpleValue(x) && isSimpleValue(y)) {
      return { type: 'gk:nearestActive', mold: args[0].value as string, x, y }
    }
  }
  if (method === 'randomActive' && args[0]?.type === 'StringLiteral') {
    return { type: 'gk:randomActive', mold: args[0].value as string }
  }
  if (method === 'navePowerOf') {
    const charVar = identifierName(args[0])
    if (charVar) return { type: 'gk:navePowerOf', charVar }
  }
  if (method === 'pathProgress') {
    const charVar = identifierName(args[0])
    if (charVar) return { type: 'gk:pathProgress', charVar }
  }
  if (method === 'rollDice') {
    const faces = toExpr(args[0], ctx)
    if (isSimpleValue(faces)) return { type: 'gk:rollDice', faces }
  }
  if (method === 'currentPlayer' && args.length === 0) return { type: 'gk:currentPlayer' }
  if (method === 'spaceOf') {
    const who = identifierName(args[0])
    if (who) return { type: 'gk:spaceOf', who }
  }
  if (method === 'pileTop') {
    const pile = identifierName(args[0])
    if (pile) return { type: 'gk:pileTop', pileVar: pile }
  }
  if (method === 'pileSize') {
    const pile = identifierName(args[0])
    if (pile) return { type: 'gk:pileSize', pileVar: pile }
  }
  if (method === 'card') {
    const front = toExpr(args[0], ctx)
    const back = toExpr(args[1], ctx)
    if (isSimpleValue(front) && isSimpleValue(back)) return { type: 'gk:card', front, back }
  }
  if (method === 'cardIsUp') {
    const card = toExpr(args[0], ctx)
    if (isSimpleValue(card)) return { type: 'gk:cardIsUp', card }
  }
  if (method === 'cardFace') {
    const card = toExpr(args[0], ctx)
    if (isSimpleValue(card)) return { type: 'gk:cardFace', card }
  }
  if (method === 'cardAt') {
    const pile = identifierName(args[2])
    if (pile) {
      const x = toExpr(args[0], ctx)
      const y = toExpr(args[1], ctx)
      if (isSimpleValue(x) && isSimpleValue(y)) return { type: 'gk:cardAt', x, y, pileVar: pile }
    }
  }
  if (method === 'cardsEnergy' && args.length === 0) return { type: 'gk:cardsEnergy' }
  if (method === 'cardsHeroLife' && args.length === 0) return { type: 'gk:cardsHeroLife' }
  if (method === 'cardsEnemyLife' && args.length === 0) return { type: 'gk:cardsEnemyLife' }
  if (method === 'cardsIntentAction' && args.length === 0) return { type: 'gk:cardsIntentAction' }
  if (method === 'cardsIntentValue' && args.length === 0) return { type: 'gk:cardsIntentValue' }
  if (
    method === 'pickActive' &&
    args[0]?.type === 'StringLiteral' &&
    args[1]?.type === 'StringLiteral' &&
    args[2]?.type === 'StringLiteral' &&
    GK_PICK_MODES.has(args[1].value as string) &&
    GK_PICK_PROPS.has(args[2].value as string)
  ) {
    return {
      type: 'gk:pickActive',
      mold: args[0].value as string,
      mode: args[1].value as string,
      prop: args[2].value as string,
    }
  }
  if (method === 'tdCoins' && args.length === 0) return { type: 'gk:tdCoins' }
  if (method === 'rpgCountItem' && args[0]?.type === 'StringLiteral') {
    return { type: 'gk:countItem', name: args[0].value as string }
  }
  if (method === 'timeSurvived' && args.length === 0) return { type: 'gk:timeSurvived' }
  if (method === 'kills' && args.length === 0) return { type: 'gk:kills' }
  if (method === 'cameraX' && args.length === 0) return { type: 'gk:cameraX' }
  if (method === 'cameraY' && args.length === 0) return { type: 'gk:cameraY' }
  if (method === 'mouseX' && args.length === 0) return { type: 'gk:mouseX' }
  if (method === 'mouseY' && args.length === 0) return { type: 'gk:mouseY' }
  if (method === 'mouseDown' && args.length === 0) return { type: 'gk:mouseDown' }
  return null
}

/** SZGameKit.rpg* em posição de VALOR (célula→px, flags, itens, batalha). */
function matchGameKitRpgExpr(node: Node, ctx?: ParseCtx): JSExpr | null {
  const call = asSZGameKitCall(node)
  if (!call) return null
  const { method, args } = call
  if (method === 'rpgCell') {
    const n = toExpr(args[0], ctx)
    return isSimpleValue(n) ? { type: 'gk:rpgCell', n } : null
  }
  if (method === 'rpgHasFlag' && args[0]?.type === 'StringLiteral') {
    return { type: 'gk:rpgHasFlag', flag: args[0].value as string }
  }
  if (method === 'rpgHasItem' && args[0]?.type === 'StringLiteral') {
    return { type: 'gk:rpgHasItem', item: args[0].value as string }
  }
  if (method === 'rpgBattleWon' && args.length === 0) return { type: 'gk:rpgBattleWon' }
  if (method === 'rpgHasSave' && args.length === 0) return { type: 'gk:rpgHasSave' }
  if (method === 'rpgLevel' && args.length === 0) return { type: 'gk:rpgLevel' }
  if (method === 'rpgXp' && args.length === 0) return { type: 'gk:rpgXp' }
  if (method === 'battlerLife' && args[0]?.type === 'StringLiteral') {
    return { type: 'gk:battlerLife', name: args[0].value as string }
  }
  if (method === 'battlerMaxLife' && args[0]?.type === 'StringLiteral') {
    return { type: 'gk:battlerMaxLife', name: args[0].value as string }
  }
  if (method === 'rpgCurrentMap' && args.length === 0) return { type: 'gk:rpgCurrentMap' }
  return null
}

/** Opções do `SZGameKit.setup({ width, height, background, accent })`. */
function readGameKitSetupOptions(
  obj: Node,
  ctx: ParseCtx,
): { w: JSExpr; h: JSExpr; bg: string; accent: string } | null {
  const result: { w: JSExpr; h: JSExpr; bg: string; accent: string } = {
    w: { type: 'num', value: 1280 },
    h: { type: 'num', value: 720 },
    bg: '#1a1a2e',
    accent: '#4a9eff',
  }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (key === 'width' || key === 'height') {
      const v = toExpr(prop.value, ctx)
      if (!isSimpleValue(v)) return null
      if (key === 'width') result.w = v
      else result.h = v
    } else if (key === 'background' || key === 'accent') {
      if (prop.value?.type !== 'StringLiteral') return null
      result[key === 'background' ? 'bg' : 'accent'] = prop.value.value as string
    } else {
      return null
    }
  }
  return result
}

/** Opções do `SZGameKit.setupFull({ background, accent })` (tela toda, sem dimensões). */
function readGameKitSetupFullOptions(obj: Node): { bg: string; accent: string } | null {
  const result = { bg: '#1a1a2e', accent: '#4a9eff' }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (key === 'background' || key === 'accent') {
      if (prop.value?.type !== 'StringLiteral') return null
      result[key === 'background' ? 'bg' : 'accent'] = prop.value.value as string
    } else {
      return null
    }
  }
  return result
}

/** Opções do `SZGameKit.createCharacter({ image, w, h, speed, color })`. */
function readGameKitCharacterOptions(
  obj: Node,
  ctx: ParseCtx,
): { image: string; w: JSExpr; h: JSExpr; speed: JSExpr; color: string } | null {
  const result: { image: string; w: JSExpr; h: JSExpr; speed: JSExpr; color: string } = {
    image: '',
    w: { type: 'num', value: 64 },
    h: { type: 'num', value: 64 },
    speed: { type: 'num', value: 300 },
    color: '#4a9eff',
  }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (key === 'w' || key === 'h' || key === 'speed') {
      const v = toExpr(prop.value, ctx)
      if (!isSimpleValue(v)) return null
      result[key] = v
    } else if (key === 'image' || key === 'color') {
      if (prop.value?.type !== 'StringLiteral') return null
      result[key] = prop.value.value as string
    } else {
      return null
    }
  }
  return result
}

/** Opções do `SZGameKit.defineMold("x", { w, h, health, speed, damage, color, image, look })`. */
function readGameKitMoldOptions(
  obj: Node,
  ctx: ParseCtx,
): {
  w: JSExpr
  h: JSExpr
  health: JSExpr
  speed: JSExpr
  damage: JSExpr
  color: string
  image: string
  look: string
} | null {
  const result = {
    w: { type: 'num', value: 40 } as JSExpr,
    h: { type: 'num', value: 40 } as JSExpr,
    health: { type: 'num', value: 20 } as JSExpr,
    speed: { type: 'num', value: 120 } as JSExpr,
    damage: { type: 'num', value: 10 } as JSExpr,
    color: '#e94f4f',
    image: '',
    look: '',
  }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (key === 'w' || key === 'h' || key === 'health' || key === 'speed' || key === 'damage') {
      const v = toExpr(prop.value, ctx)
      if (!isSimpleValue(v)) return null
      result[key] = v
    } else if (key === 'color' || key === 'image' || key === 'look') {
      if (prop.value?.type !== 'StringLiteral') return null
      result[key] = prop.value.value as string
    } else {
      return null
    }
  }
  return result
}

/** Opções do `SZGameKit.defineEffect("x", { count, color, size, life, speed, gravity })`. */
function readGameKitEffectOptions(
  obj: Node,
  ctx: ParseCtx,
): {
  count: JSExpr
  color: string
  size: JSExpr
  life: JSExpr
  speed: JSExpr
  gravity: JSExpr
} | null {
  const result = {
    count: { type: 'num', value: 16 } as JSExpr,
    color: '#ffd166',
    size: { type: 'num', value: 4 } as JSExpr,
    life: { type: 'num', value: 0.6 } as JSExpr,
    speed: { type: 'num', value: 200 } as JSExpr,
    gravity: { type: 'num', value: 300 } as JSExpr,
  }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (
      key === 'count' ||
      key === 'size' ||
      key === 'life' ||
      key === 'speed' ||
      key === 'gravity'
    ) {
      const v = toExpr(prop.value, ctx)
      if (!isSimpleValue(v)) return null
      result[key] = v
    } else if (key === 'color') {
      if (prop.value?.type !== 'StringLiteral') return null
      result.color = prop.value.value as string
    } else {
      return null
    }
  }
  return result
}

/**
 * SZGameKit.* como statement: setup/start/telas/estados/ganchos/personagens + P24.
 * ANTES do método genérico — senão viram memberCall.
 */
function tryMatchGameKitCall(expr: Node, source: string, ctx: ParseCtx): JSStatement | null {
  const call = asSZGameKitCall(expr)
  if (!call) return null
  const { method, args } = call
  const isFn = (n: Node) =>
    n?.type === 'FunctionExpression' || n?.type === 'ArrowFunctionExpression'

  switch (method) {
    case 'setup': {
      // generator: SZGameKit.setup({ width, height, background, accent })
      if (args[0]?.type !== 'ObjectExpression') return null
      const o = readGameKitSetupOptions(args[0], ctx)
      return o ? { type: 'gk:setup', w: o.w, h: o.h, bg: o.bg, accent: o.accent } : null
    }
    case 'setupFull': {
      // generator: SZGameKit.setupFull({ background, accent })
      if (args[0]?.type !== 'ObjectExpression') return null
      const o = readGameKitSetupFullOptions(args[0])
      return o ? { type: 'gk:setupFull', bg: o.bg, accent: o.accent } : null
    }
    case 'start':
      return args.length === 0 ? { type: 'gk:start' } : null
    case 'loadImage': {
      // generator: SZGameKit.loadImage("nome", "asset")
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'StringLiteral') return null
      return {
        type: 'gk:loadImage',
        name: args[0].value as string,
        asset: args[1].value as string,
      }
    }
    case 'setScreenText': {
      // generator: SZGameKit.setScreenText("menu", titulo, texto, botao)
      if (args[0]?.type !== 'StringLiteral') return null
      const screen = args[0].value as string
      if (!GK_FIXED_SCREENS.has(screen)) return null
      const title = toExpr(args[1], ctx)
      const text = toExpr(args[2], ctx)
      const button = toExpr(args[3], ctx)
      return isSimpleValue(title) && isSimpleValue(text) && isSimpleValue(button)
        ? { type: 'gk:setScreenText', screen, title, text, button }
        : null
    }
    case 'createScreen': {
      // generator: SZGameKit.createScreen("nome", titulo, texto)
      if (args[0]?.type !== 'StringLiteral') return null
      const title = toExpr(args[1], ctx)
      const text = toExpr(args[2], ctx)
      return isSimpleValue(title) && isSimpleValue(text)
        ? { type: 'gk:createScreen', name: args[0].value as string, title, text }
        : null
    }
    case 'addButton': {
      // generator: SZGameKit.addButton("tela", rotulo, function () {…})
      if (args[0]?.type !== 'StringLiteral' || !isFn(args[2])) return null
      const label = toExpr(args[1], ctx)
      return isSimpleValue(label)
        ? {
            type: 'gk:addButton',
            screen: args[0].value as string,
            label,
            body: bodyOfFn(args[2], source, ctx),
          }
        : null
    }
    case 'setScreenBg': {
      // generator: SZGameKit.setScreenBg("tela", "cor", "imagem")
      if (
        args[0]?.type !== 'StringLiteral' ||
        args[1]?.type !== 'StringLiteral' ||
        args[2]?.type !== 'StringLiteral'
      )
        return null
      return {
        type: 'gk:setScreenBg',
        screen: args[0].value as string,
        color: args[1].value as string,
        image: args[2].value as string,
      }
    }
    case 'showScreen': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'gk:showScreen', name: args[0].value as string }
    }
    case 'hideScreens':
      return args.length === 0 ? { type: 'gk:hideScreens' } : null
    case 'setState': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'gk:setState', name: args[0].value as string }
    }
    case 'restartGame':
      return args.length === 0 ? { type: 'gk:restartGame' } : null
    case 'onGameStart': {
      if (!isFn(args[0])) return null
      return { type: 'gk:onGameStart', body: bodyOfFn(args[0], source, ctx) }
    }
    case 'onEnterState': {
      // generator: SZGameKit.onEnterState("jogando", function () {…})
      if (args[0]?.type !== 'StringLiteral' || !isFn(args[1])) return null
      return {
        type: 'gk:onEnterState',
        name: args[0].value as string,
        body: bodyOfFn(args[1], source, ctx),
      }
    }
    case 'pause':
      return args.length === 0 ? { type: 'gk:pause' } : null
    case 'resume':
      return args.length === 0 ? { type: 'gk:resume' } : null
    case 'returnToMenu':
      return args.length === 0 ? { type: 'gk:returnToMenu' } : null
    case 'endGame':
      return args.length === 0 ? { type: 'gk:endGame' } : null
    case 'onUpdate': {
      // generator: SZGameKit.onUpdate(function (dt) {…})
      if (!isFn(args[0])) return null
      return {
        type: 'gk:onUpdate',
        dtName: identifierName(args[0].params?.[0]) ?? 'dt',
        body: bodyOfFn(args[0], source, ctx),
      }
    }
    case 'onDraw': {
      // generator: SZGameKit.onDraw(function (ctx) {…})
      if (!isFn(args[0])) return null
      const ctxParam = identifierName(args[0].params?.[0])
      // O parâmetro é um CONTEXTO 2D — registrar em ctxVars para que os blocos de
      // Canvas dentro do gancho round-trippem (gêmeo do defineShape do Jogo 2D).
      if (ctxParam) ctx.ctxVars.add(ctxParam)
      return {
        type: 'gk:onDraw',
        ctxName: ctxParam ?? 'ctx',
        body: bodyOfFn(args[0], source, ctx),
      }
    }
    case 'onDrawHud': {
      // generator: SZGameKit.onDrawHud(function (ctx) {…}) — HUD sem câmera.
      if (!isFn(args[0])) return null
      const ctxParam = identifierName(args[0].params?.[0])
      if (ctxParam) ctx.ctxVars.add(ctxParam)
      return {
        type: 'gk:onDrawHud',
        ctxName: ctxParam ?? 'ctx',
        body: bodyOfFn(args[0], source, ctx),
      }
    }
    case 'onGameClick': {
      // generator: SZGameKit.onGameClick(function (px, py) {…})
      if (!isFn(args[0])) return null
      return {
        type: 'gk:onGameClick',
        xName: identifierName(args[0].params?.[0]) ?? 'px',
        yName: identifierName(args[0].params?.[1]) ?? 'py',
        body: bodyOfFn(args[0], source, ctx),
      }
    }
    case 'setSheet': {
      const charVar = identifierName(args[0])
      if (!charVar || args[1]?.type !== 'StringLiteral') return null
      const fw = toExpr(args[2], ctx)
      const fh = toExpr(args[3], ctx)
      return isSimpleValue(fw) && isSimpleValue(fh)
        ? { type: 'gk:setSheet', charVar, image: args[1].value as string, fw, fh }
        : null
    }
    case 'playAnim': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const from = toExpr(args[1], ctx)
      const to = toExpr(args[2], ctx)
      const fps = toExpr(args[3], ctx)
      return isSimpleValue(from) && isSimpleValue(to) && isSimpleValue(fps)
        ? { type: 'gk:playAnim', charVar, from, to, fps }
        : null
    }
    case 'cameraFollow': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const w = toExpr(args[1], ctx)
      const h = toExpr(args[2], ctx)
      return isSimpleValue(w) && isSimpleValue(h)
        ? { type: 'gk:cameraFollow', charVar, w, h }
        : null
    }
    case 'cameraFollowMap': {
      const charVar = identifierName(args[0])
      if (!charVar || args[1]?.type !== 'StringLiteral') return null
      return { type: 'gk:cameraFollowMap', charVar, map: args[1].value as string }
    }
    case 'cameraStop':
      return { type: 'gk:cameraStop' }
    case 'launchTowards': {
      const charVar = identifierName(args[0])
      const targetVar = identifierName(args[1])
      if (!charVar || !targetVar) return null
      const speed = toExpr(args[2], ctx)
      return isSimpleValue(speed) ? { type: 'gk:launchTowards', charVar, targetVar, speed } : null
    }
    case 'moveByVelocity': {
      const charVar = identifierName(args[0])
      const dtVar = identifierName(args[1])
      return charVar && dtVar ? { type: 'gk:moveByVelocity', charVar, dtVar } : null
    }
    case 'setAngle': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const degrees = toExpr(args[1], ctx)
      return isSimpleValue(degrees) ? { type: 'gk:setAngle', charVar, degrees } : null
    }
    case 'drawBar': {
      const current = toExpr(args[0], ctx)
      const max = toExpr(args[1], ctx)
      const x = toExpr(args[2], ctx)
      const y = toExpr(args[3], ctx)
      const w = toExpr(args[4], ctx)
      const h = toExpr(args[5], ctx)
      if (args[6]?.type !== 'StringLiteral') return null
      return isSimpleValue(current) &&
        isSimpleValue(max) &&
        isSimpleValue(x) &&
        isSimpleValue(y) &&
        isSimpleValue(w) &&
        isSimpleValue(h)
        ? { type: 'gk:drawBar', current, max, x, y, w, h, color: args[6].value as string }
        : null
    }
    case 'rpgMoveGrid': {
      const charVar = identifierName(args[0])
      const dtVar = identifierName(args[2])
      if (!charVar || !dtVar) return null
      const cell = toExpr(args[1], ctx)
      return isSimpleValue(cell) ? { type: 'gk:rpgMoveGrid', charVar, cell, dtVar } : null
    }
    case 'rpgBlockCell': {
      const cx = toExpr(args[0], ctx)
      const cy = toExpr(args[1], ctx)
      return isSimpleValue(cx) && isSimpleValue(cy) ? { type: 'gk:rpgBlockCell', cx, cy } : null
    }
    case 'rpgCreateNpc': {
      if (
        args[0]?.type !== 'StringLiteral' ||
        args[3]?.type !== 'StringLiteral' ||
        args[4]?.type !== 'StringLiteral'
      ) {
        return null
      }
      const cx = toExpr(args[1], ctx)
      const cy = toExpr(args[2], ctx)
      return isSimpleValue(cx) && isSimpleValue(cy)
        ? {
            type: 'gk:rpgCreateNpc',
            name: args[0].value as string,
            cx,
            cy,
            image: args[3].value as string,
            look: args[4].value as string,
          }
        : null
    }
    case 'rpgDrawNpcs':
      return { type: 'gk:rpgDrawNpcs' }
    case 'rpgOnTalk': {
      if (args[0]?.type !== 'StringLiteral' || !isFn(args[1])) return null
      return {
        type: 'gk:rpgOnTalk',
        npc: args[0].value as string,
        body: bodyOfFn(args[1], source, ctx),
      }
    }
    case 'rpgSay': {
      const textValue = toExpr(args[0], ctx)
      const speaker = toExpr(args[1], ctx)
      return isSimpleValue(textValue) && isSimpleValue(speaker)
        ? { type: 'gk:rpgSay', text: textValue, speaker }
        : null
    }
    case 'rpgAddFlag': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'gk:rpgAddFlag', flag: args[0].value as string }
    }
    case 'rpgGiveItem': {
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'StringLiteral') return null
      return {
        type: 'gk:rpgGiveItem',
        item: args[0].value as string,
        image: args[1].value as string,
      }
    }
    case 'rpgRemoveItem': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'gk:rpgRemoveItem', item: args[0].value as string }
    }
    case 'rpgDrawInventory': {
      const x = toExpr(args[0], ctx)
      const y = toExpr(args[1], ctx)
      return isSimpleValue(x) && isSimpleValue(y) ? { type: 'gk:rpgDrawInventory', x, y } : null
    }
    case 'rpgGoMap': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'gk:rpgGoMap', map: args[0].value as string }
    }
    case 'rpgSetStartMap': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'gk:rpgSetStartMap', map: args[0].value as string }
    }
    case 'rpgCreateMap': {
      if (args[0]?.type !== 'StringLiteral' || !isFn(args[3])) return null
      const cols = toExpr(args[1], ctx)
      const rows = toExpr(args[2], ctx)
      if (!isSimpleValue(cols) || !isSimpleValue(rows)) return null
      const ctxParam = identifierName(args[3].params?.[0])
      if (ctxParam) ctx.ctxVars.add(ctxParam)
      return {
        type: 'gk:rpgCreateMap',
        map: args[0].value as string,
        cols,
        rows,
        ctxName: ctxParam ?? 'ctx',
        body: bodyOfFn(args[3], source, ctx),
      }
    }
    case 'rpgOnEnterMap': {
      if (args[0]?.type !== 'StringLiteral' || !isFn(args[1])) return null
      return {
        type: 'gk:rpgOnEnterMap',
        map: args[0].value as string,
        body: bodyOfFn(args[1], source, ctx),
      }
    }
    case 'rpgCreateDoor': {
      if (args[2]?.type !== 'StringLiteral') return null
      const cx = toExpr(args[0], ctx)
      const cy = toExpr(args[1], ctx)
      return isSimpleValue(cx) && isSimpleValue(cy)
        ? { type: 'gk:rpgCreateDoor', cx, cy, map: args[2].value as string }
        : null
    }
    // 🌍 Mundo aberto: bordas ligadas; o tamanho pertence ao mapa criado.
    case 'rpgConnectEdge': {
      // Lado fora do enum → rawJS (o dropdown coagiria; código é sagrado).
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'StringLiteral') return null
      const side = args[0].value as string
      if (!GK_EDGE_SIDES.has(side)) return null
      return { type: 'gk:rpgConnectEdge', side, map: args[1].value as string }
    }
    case 'rpgBattleStats': {
      const hp = toExpr(args[0], ctx)
      const str = toExpr(args[1], ctx)
      const def = toExpr(args[2], ctx)
      return isSimpleValue(hp) && isSimpleValue(str) && isSimpleValue(def)
        ? { type: 'gk:rpgBattleStats', hp, str, def }
        : null
    }
    case 'rpgBattleStart': {
      if (args[0]?.type !== 'StringLiteral') return null
      const hp = toExpr(args[1], ctx)
      const str = toExpr(args[2], ctx)
      const def = toExpr(args[3], ctx)
      // 🖼️ imagem OPCIONAL (5º arg): presente → entra na IR; ausente → forma antiga.
      const image = args[4]?.type === 'StringLiteral' ? (args[4].value as string) : undefined
      return isSimpleValue(hp) && isSimpleValue(str) && isSimpleValue(def)
        ? {
            type: 'gk:rpgBattleStart',
            name: args[0].value as string,
            hp,
            str,
            def,
            ...(image ? { image } : {}),
          }
        : null
    }
    case 'rpgSetSpecial': {
      if (args[0]?.type !== 'StringLiteral') return null
      const dmg = toExpr(args[1], ctx)
      const cost = toExpr(args[2], ctx)
      return isSimpleValue(dmg) && isSimpleValue(cost)
        ? { type: 'gk:rpgSetSpecial', name: args[0].value as string, dmg, cost }
        : null
    }
    case 'rpgGivePotion': {
      if (args[0]?.type !== 'StringLiteral') return null
      const heal = toExpr(args[1], ctx)
      return isSimpleValue(heal)
        ? { type: 'gk:rpgGivePotion', name: args[0].value as string, heal }
        : null
    }
    case 'rpgHealHero':
      return args.length === 0 ? { type: 'gk:rpgHealHero' } : null
    case 'rpgBattleReward': {
      const xp = toExpr(args[0], ctx)
      return isSimpleValue(xp) ? { type: 'gk:rpgBattleReward', xp } : null
    }
    case 'rpgInflict': {
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'StringLiteral') return null
      // R25/R29: status E quem desconhecidos → rawJS (os dropdowns coagem; não engolir).
      if (!GK_RPG_STATUS.has(args[1].value as string)) return null
      if (!GK_INFLICT_WHO.has(args[0].value as string)) return null
      const turns = toExpr(args[2], ctx)
      return isSimpleValue(turns)
        ? {
            type: 'gk:rpgInflict',
            who: args[0].value as string,
            status: args[1].value as string,
            turns,
          }
        : null
    }
    case 'rpgAddAlly':
    case 'rpgAddFoe': {
      // SZGameKit.rpgAddAlly("nome", hp, str, def, "cor", "imagem"?)
      if (args[0]?.type !== 'StringLiteral' || args[4]?.type !== 'StringLiteral') return null
      const hp = toExpr(args[1], ctx)
      const str = toExpr(args[2], ctx)
      const def = toExpr(args[3], ctx)
      if (!isSimpleValue(hp) || !isSimpleValue(str) || !isSimpleValue(def)) return null
      const image = args[5]?.type === 'StringLiteral' ? (args[5].value as string) : undefined
      return {
        type: method === 'rpgAddAlly' ? 'gk:rpgAddAlly' : 'gk:rpgAddFoe',
        name: args[0].value as string,
        hp,
        str,
        def,
        color: args[4].value as string,
        ...(image ? { image } : {}),
      }
    }
    case 'rpgTeachMove': {
      // SZGameKit.rpgTeachMove("quem", "golpe", dmg, cost)
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'StringLiteral') return null
      const dmg = toExpr(args[2], ctx)
      const cost = toExpr(args[3], ctx)
      return isSimpleValue(dmg) && isSimpleValue(cost)
        ? {
            type: 'gk:rpgTeachMove',
            who: args[0].value as string,
            move: args[1].value as string,
            dmg,
            cost,
          }
        : null
    }
    case 'rpgTeachHeal': {
      // SZGameKit.rpgTeachHeal("quem", "golpe", cura, cost)
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'StringLiteral') return null
      const amount = toExpr(args[2], ctx)
      const cost = toExpr(args[3], ctx)
      return isSimpleValue(amount) && isSimpleValue(cost)
        ? {
            type: 'gk:rpgTeachHeal',
            who: args[0].value as string,
            move: args[1].value as string,
            amount,
            cost,
          }
        : null
    }
    case 'rpgOnBattleEnd': {
      if (!isFn(args[0])) return null
      return { type: 'gk:rpgOnBattleEnd', body: bodyOfFn(args[0], source, ctx) }
    }
    case 'rpgAddBoss': {
      // SZGameKit.rpgAddBoss("nome", hp, str, def, "imagem"?)
      if (args[0]?.type !== 'StringLiteral') return null
      const hp = toExpr(args[1], ctx)
      const str = toExpr(args[2], ctx)
      const def = toExpr(args[3], ctx)
      if (!isSimpleValue(hp) || !isSimpleValue(str) || !isSimpleValue(def)) return null
      const image = args[4]?.type === 'StringLiteral' ? (args[4].value as string) : undefined
      return {
        type: 'gk:rpgAddBoss',
        name: args[0].value as string,
        hp,
        str,
        def,
        ...(image ? { image } : {}),
      }
    }
    case 'rpgDefineBattler': {
      // SZGameKit.rpgDefineBattler("nome", hp, str, def, "imagem", "cor", boss)
      if (
        args[0]?.type !== 'StringLiteral' ||
        args[4]?.type !== 'StringLiteral' ||
        args[5]?.type !== 'StringLiteral' ||
        args[6]?.type !== 'BooleanLiteral'
      )
        return null
      const hp = toExpr(args[1], ctx)
      const str = toExpr(args[2], ctx)
      const def = toExpr(args[3], ctx)
      if (!isSimpleValue(hp) || !isSimpleValue(str) || !isSimpleValue(def)) return null
      return {
        type: 'gk:rpgDefineBattler',
        name: args[0].value as string,
        hp,
        str,
        def,
        image: args[4].value as string,
        color: args[5].value as string,
        boss: args[6].value as boolean,
      }
    }
    case 'rpgBattleNamed': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'gk:rpgBattleNamed', name: args[0].value as string }
    }
    case 'rpgAddFoeNamed': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'gk:rpgAddFoeNamed', name: args[0].value as string }
    }
    case 'rpgFoeUse': {
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'StringLiteral') return null
      return { type: 'gk:rpgFoeUse', name: args[0].value as string, move: args[1].value as string }
    }
    case 'rpgFoeHitAll': {
      if (args[0]?.type !== 'StringLiteral') return null
      const dmg = toExpr(args[1], ctx)
      return isSimpleValue(dmg)
        ? { type: 'gk:rpgFoeHitAll', name: args[0].value as string, dmg }
        : null
    }
    case 'rpgOnFoeTurn': {
      if (args[0]?.type !== 'StringLiteral' || !isFn(args[1])) return null
      return {
        type: 'gk:rpgOnFoeTurn',
        name: args[0].value as string,
        body: bodyOfFn(args[1], source, ctx),
      }
    }
    case 'setWalkSheet': {
      const charVar = identifierName(args[0])
      if (!charVar || args[1]?.type !== 'StringLiteral') return null
      const fw = toExpr(args[2], ctx)
      const fh = toExpr(args[3], ctx)
      return isSimpleValue(fw) && isSimpleValue(fh)
        ? { type: 'gk:setWalkSheet', charVar, image: args[1].value as string, fw, fh }
        : null
    }
    case 'rpgCutscene': {
      if (!isFn(args[0])) return null
      return { type: 'gk:rpgCutscene', body: bodyOfFn(args[0], source, ctx) }
    }
    case 'rpgWait': {
      const seconds = toExpr(args[0], ctx)
      return isSimpleValue(seconds) ? { type: 'gk:rpgWait', seconds } : null
    }
    case 'rpgFace': {
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'StringLiteral') return null
      // R29: direção fora do dropdown (baixo/cima/esquerda/direita) → rawJS.
      if (!GK_FACING_DIRS.has(args[1].value as string)) return null
      return { type: 'gk:rpgFace', npc: args[0].value as string, dir: args[1].value as string }
    }
    case 'rpgNpcWalkTo': {
      if (args[0]?.type !== 'StringLiteral') return null
      const cx = toExpr(args[1], ctx)
      const cy = toExpr(args[2], ctx)
      return isSimpleValue(cx) && isSimpleValue(cy)
        ? { type: 'gk:rpgNpcWalkTo', npc: args[0].value as string, cx, cy }
        : null
    }
    case 'rpgNpcWander': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'gk:rpgNpcWander', npc: args[0].value as string }
    }
    case 'rpgOnStep': {
      if (!isFn(args[2])) return null
      const cx = toExpr(args[0], ctx)
      const cy = toExpr(args[1], ctx)
      return isSimpleValue(cx) && isSimpleValue(cy)
        ? { type: 'gk:rpgOnStep', cx, cy, body: bodyOfFn(args[2], source, ctx) }
        : null
    }
    case 'rpgMenu': {
      if (!isFn(args[1])) return null
      const title = toExpr(args[0], ctx)
      return isSimpleValue(title)
        ? { type: 'gk:rpgMenu', title, body: bodyOfFn(args[1], source, ctx) }
        : null
    }
    case 'rpgOption': {
      if (!isFn(args[1])) return null
      const label = toExpr(args[0], ctx)
      return isSimpleValue(label)
        ? { type: 'gk:rpgOption', label, body: bodyOfFn(args[1], source, ctx) }
        : null
    }
    case 'rpgSave':
      return { type: 'gk:rpgSave' }
    case 'rpgLoad':
      return { type: 'gk:rpgLoad' }
    case 'loadTilemap': {
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'StringLiteral') return null
      return {
        type: 'gk:loadTilemap',
        name: args[0].value as string,
        asset: args[1].value as string,
      }
    }
    case 'drawTilemap': {
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'StringLiteral') return null
      const layer = args[1].value as string
      // O dropdown só tem "chão"/"topos"/"frente" — camada desconhecida cai em rawJS.
      if (layer !== 'chão' && layer !== 'topos' && layer !== 'frente') return null
      return { type: 'gk:drawTilemap', name: args[0].value as string, layer }
    }
    case 'tilemapSolid': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'gk:tilemapSolid', name: args[0].value as string }
    }
    case 'drawShadow': {
      const charVar = identifierName(args[0])
      return charVar ? { type: 'gk:drawShadow', charVar } : null
    }
    case 'drawByDepth': {
      const charVar = identifierName(args[0])
      return charVar ? { type: 'gk:drawByDepth', charVar } : null
    }
    case 'cameraShake': {
      const intensity = toExpr(args[0], ctx)
      const seconds = toExpr(args[1], ctx)
      return isSimpleValue(intensity) && isSimpleValue(seconds)
        ? { type: 'gk:cameraShake', intensity, seconds }
        : null
    }
    case 'applyGravity': {
      const charVar = identifierName(args[0])
      const dtVar = identifierName(args[2])
      if (!charVar || !dtVar) return null
      const g = toExpr(args[1], ctx)
      return isSimpleValue(g) ? { type: 'gk:applyGravity', charVar, g, dtVar } : null
    }
    case 'jump': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const force = toExpr(args[1], ctx)
      return isSimpleValue(force) ? { type: 'gk:jump', charVar, force } : null
    }
    case 'setVelocity': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const vx = toExpr(args[1], ctx)
      const vy = toExpr(args[2], ctx)
      return isSimpleValue(vx) && isSimpleValue(vy)
        ? { type: 'gk:setVelocity', charVar, vx, vy }
        : null
    }
    case 'setTerminalVelocity': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const max = toExpr(args[1], ctx)
      return isSimpleValue(max) ? { type: 'gk:setTerminalVelocity', charVar, max } : null
    }
    case 'bounceOnEdges': {
      const charVar = identifierName(args[0])
      return charVar ? { type: 'gk:bounceOnEdges', charVar } : null
    }
    case 'paddleBounce': {
      const ballVar = identifierName(args[0])
      const paddleVar = identifierName(args[1])
      return ballVar && paddleVar ? { type: 'gk:paddleBounce', ballVar, paddleVar } : null
    }
    case 'boardCreate': {
      if (args[0]?.type !== 'StringLiteral') return null
      const cols = toExpr(args[1], ctx)
      const rows = toExpr(args[2], ctx)
      const empty = toExpr(args[3], ctx)
      return isSimpleValue(cols) && isSimpleValue(rows) && isSimpleValue(empty)
        ? { type: 'gk:boardCreate', name: args[0].value as string, cols, rows, empty }
        : null
    }
    case 'boardSet': {
      if (args[0]?.type !== 'StringLiteral') return null
      const value = toExpr(args[1], ctx)
      const col = toExpr(args[2], ctx)
      const row = toExpr(args[3], ctx)
      return isSimpleValue(value) && isSimpleValue(col) && isSimpleValue(row)
        ? { type: 'gk:boardSet', name: args[0].value as string, value, col, row }
        : null
    }
    case 'playersSetup': {
      const n = toExpr(args[0], ctx)
      return isSimpleValue(n) ? { type: 'gk:playersSetup', n } : null
    }
    case 'nextPlayer':
      return { type: 'gk:nextPlayer' }
    case 'onTurnChange': {
      if (!isFn(args[0])) return null
      return { type: 'gk:onTurnChange', body: bodyOfFn(args[0], source, ctx) }
    }
    case 'moveAlongTrack': {
      const who = identifierName(args[0])
      if (!who || args[2]?.type !== 'StringLiteral') return null
      const spaces = toExpr(args[1], ctx)
      return isSimpleValue(spaces)
        ? { type: 'gk:moveAlongTrack', who, spaces, path: args[2].value as string }
        : null
    }
    case 'onLandSpace': {
      if (!isFn(args[0])) return null
      return { type: 'gk:onLandSpace', body: bodyOfFn(args[0], source, ctx) }
    }
    case 'pileMoveTop': {
      const from = identifierName(args[0])
      const to = identifierName(args[1])
      return from && to ? { type: 'gk:pileMoveTop', fromVar: from, toVar: to } : null
    }
    case 'pileShuffleFrom': {
      const deck = identifierName(args[0])
      const discard = identifierName(args[1])
      return deck && discard
        ? { type: 'gk:pileShuffleFrom', deckVar: deck, discardVar: discard }
        : null
    }
    case 'cardFlip': {
      const card = toExpr(args[0], ctx)
      return isSimpleValue(card) ? { type: 'gk:cardFlip', card } : null
    }
    case 'handDraw': {
      const pile = identifierName(args[0])
      if (!pile || args[3]?.type !== 'BooleanLiteral') return null
      const x = toExpr(args[1], ctx)
      const y = toExpr(args[2], ctx)
      return isSimpleValue(x) && isSimpleValue(y)
        ? { type: 'gk:handDraw', pileVar: pile, x, y, fan: args[3].value as boolean }
        : null
    }
    case 'cardsStart': {
      const heroHp = toExpr(args[0], ctx)
      const enemyHp = toExpr(args[1], ctx)
      return isSimpleValue(heroHp) && isSimpleValue(enemyHp)
        ? { type: 'gk:cardsStart', heroHp, enemyHp }
        : null
    }
    case 'cardsEnergyPerTurn': {
      const n = toExpr(args[0], ctx)
      return isSimpleValue(n) ? { type: 'gk:cardsEnergyPerTurn', n } : null
    }
    case 'cardsSpend': {
      const n = toExpr(args[0], ctx)
      return isSimpleValue(n) ? { type: 'gk:cardsSpend', n } : null
    }
    case 'cardsOnTurn': {
      if (!isFn(args[0])) return null
      return { type: 'gk:cardsOnTurn', body: bodyOfFn(args[0], source, ctx) }
    }
    case 'cardsEndTurn':
      return { type: 'gk:cardsEndTurn' }
    case 'cardsDrawHud':
      return { type: 'gk:cardsDrawHud' }
    case 'cardsHurtEnemy': {
      const n = toExpr(args[0], ctx)
      return isSimpleValue(n) ? { type: 'gk:cardsHurtEnemy', n } : null
    }
    case 'cardsHurtMe': {
      const n = toExpr(args[0], ctx)
      return isSimpleValue(n) ? { type: 'gk:cardsHurtMe', n } : null
    }
    case 'cardsGainBlock': {
      const n = toExpr(args[0], ctx)
      return isSimpleValue(n) ? { type: 'gk:cardsGainBlock', n } : null
    }
    case 'cardsEnemyIntent': {
      if (args[0]?.type !== 'StringLiteral') return null
      const value = toExpr(args[1], ctx)
      return isSimpleValue(value)
        ? { type: 'gk:cardsEnemyIntent', action: args[0].value as string, value }
        : null
    }
    case 'cardsOnEnemyTurn': {
      if (!isFn(args[0])) return null
      return { type: 'gk:cardsOnEnemyTurn', body: bodyOfFn(args[0], source, ctx) }
    }
    case 'wrapEdges': {
      const charVar = identifierName(args[0])
      return charVar ? { type: 'gk:wrapEdges', charVar } : null
    }
    case 'collideTilemap': {
      const charVar = identifierName(args[0])
      if (!charVar || args[1]?.type !== 'StringLiteral') return null
      return { type: 'gk:collideTilemap', charVar, map: args[1].value as string }
    }
    case 'collideGroup': {
      const charVar = identifierName(args[0])
      if (!charVar || args[1]?.type !== 'StringLiteral') return null
      return { type: 'gk:collideGroup', charVar, mold: args[1].value as string }
    }
    case 'overlapGroups': {
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'StringLiteral') return null
      if (!isFn(args[2])) return null
      const aName = identifierName(args[2].params?.[0])
      const bName = identifierName(args[2].params?.[1])
      if (!aName || !bName) return null
      return {
        type: 'gk:overlapGroups',
        aName,
        moldA: args[0].value as string,
        bName,
        moldB: args[1].value as string,
        body: bodyOfFn(args[2], source, ctx),
      }
    }
    case 'setTileSize': {
      const px = toExpr(args[0], ctx)
      return isSimpleValue(px) ? { type: 'gk:setTileSize', px } : null
    }
    case 'setTileAt': {
      if (args[0]?.type !== 'StringLiteral') return null
      const x = toExpr(args[1], ctx)
      const y = toExpr(args[2], ctx)
      const index = toExpr(args[3], ctx)
      return isSimpleValue(x) && isSimpleValue(y) && isSimpleValue(index)
        ? { type: 'gk:setTileAt', map: args[0].value as string, x, y, index }
        : null
    }
    case 'breakTileAt': {
      const charVar = identifierName(args[1])
      if (args[0]?.type !== 'StringLiteral' || !charVar) return null
      return { type: 'gk:breakTileAt', map: args[0].value as string, charVar }
    }
    case 'setProperty': {
      const charVar = identifierName(args[0])
      if (!charVar || args[1]?.type !== 'StringLiteral') return null
      const prop = args[1].value as string
      if (!GK_ENTITY_PROPS.has(prop)) return null // dropdown coage: desconhecido → rawJS
      const value = toExpr(args[2], ctx)
      return isSimpleValue(value) ? { type: 'gk:setProperty', charVar, prop, value } : null
    }
    case 'setFacingDir': {
      const charVar = identifierName(args[0])
      if (!charVar || args[1]?.type !== 'StringLiteral') return null
      const dir = args[1].value as string
      if (!GK_FACING_DIRS.has(dir)) return null
      return { type: 'gk:setFacingDir', charVar, dir }
    }
    // 🏃 Kit Plataforma
    case 'platformerHero': {
      const charVar = identifierName(args[0])
      const dtVar = identifierName(args[3])
      if (!charVar || !dtVar) return null
      const speed = toExpr(args[1], ctx)
      const force = toExpr(args[2], ctx)
      return isSimpleValue(speed) && isSimpleValue(force)
        ? { type: 'gk:platformerHero', charVar, speed, force, dtVar }
        : null
    }
    case 'setJumpFeel': {
      const coyote = toExpr(args[0], ctx)
      const buffer = toExpr(args[1], ctx)
      const hold = toExpr(args[2], ctx)
      const gravity = toExpr(args[3], ctx)
      return isSimpleValue(coyote) &&
        isSimpleValue(buffer) &&
        isSimpleValue(hold) &&
        isSimpleValue(gravity)
        ? { type: 'gk:setJumpFeel', coyote, buffer, hold, gravity }
        : null
    }
    case 'doubleJump': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const force = toExpr(args[1], ctx)
      const times = toExpr(args[2], ctx)
      return isSimpleValue(force) && isSimpleValue(times)
        ? { type: 'gk:doubleJump', charVar, force, times }
        : null
    }
    case 'wallSlide': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const speed = toExpr(args[1], ctx)
      return isSimpleValue(speed) ? { type: 'gk:wallSlide', charVar, speed } : null
    }
    case 'wallJump': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const forceX = toExpr(args[1], ctx)
      const forceY = toExpr(args[2], ctx)
      return isSimpleValue(forceX) && isSimpleValue(forceY)
        ? { type: 'gk:wallJump', charVar, forceX, forceY }
        : null
    }
    case 'climbLadder': {
      const charVar = identifierName(args[0])
      if (!charVar || args[1]?.type !== 'StringLiteral') return null
      const tile = toExpr(args[2], ctx)
      const speed = toExpr(args[3], ctx)
      return isSimpleValue(tile) && isSimpleValue(speed)
        ? { type: 'gk:climbLadder', charVar, map: args[1].value as string, tile, speed }
        : null
    }
    case 'oneWayPlatform': {
      const charVar = identifierName(args[0])
      const dtVar = identifierName(args[2])
      if (!charVar || !dtVar || args[1]?.type !== 'StringLiteral') return null
      return { type: 'gk:oneWayPlatform', charVar, mold: args[1].value as string, dtVar }
    }
    case 'dropThrough': {
      const charVar = identifierName(args[0])
      return charVar ? { type: 'gk:dropThrough', charVar } : null
    }
    case 'movingPlatform': {
      const charVar = identifierName(args[0])
      const dtVar = identifierName(args[6])
      if (!charVar || !dtVar) return null
      const x1 = toExpr(args[1], ctx)
      const y1 = toExpr(args[2], ctx)
      const x2 = toExpr(args[3], ctx)
      const y2 = toExpr(args[4], ctx)
      const seconds = toExpr(args[5], ctx)
      return isSimpleValue(x1) &&
        isSimpleValue(y1) &&
        isSimpleValue(x2) &&
        isSimpleValue(y2) &&
        isSimpleValue(seconds)
        ? { type: 'gk:movingPlatform', charVar, x1, y1, x2, y2, seconds, dtVar }
        : null
    }
    case 'rideOn': {
      const charVar = identifierName(args[0])
      if (!charVar || args[1]?.type !== 'StringLiteral') return null
      return { type: 'gk:rideOn', charVar, mold: args[1].value as string }
    }
    case 'stompKill': {
      const charVar = identifierName(args[0])
      if (!charVar || args[1]?.type !== 'StringLiteral') return null
      const bounce = toExpr(args[2], ctx)
      return isSimpleValue(bounce)
        ? { type: 'gk:stompKill', charVar, mold: args[1].value as string, bounce }
        : null
    }
    case 'patrolTurnAtWall': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const speed = toExpr(args[1], ctx)
      return isSimpleValue(speed) ? { type: 'gk:patrolTurnAtWall', charVar, speed } : null
    }
    case 'setCheckpoint': {
      const x = toExpr(args[0], ctx)
      const y = toExpr(args[1], ctx)
      return isSimpleValue(x) && isSimpleValue(y) ? { type: 'gk:setCheckpoint', x, y } : null
    }
    case 'respawn': {
      const charVar = identifierName(args[0])
      return charVar ? { type: 'gk:respawn', charVar } : null
    }
    case 'platStateFrames': {
      const charVar = identifierName(args[0])
      if (!charVar || args[1]?.type !== 'StringLiteral') return null
      const state = args[1].value as string
      if (!GK_PLAT_STATES.has(state)) return null
      const from = toExpr(args[2], ctx)
      const to = toExpr(args[3], ctx)
      const fps = toExpr(args[4], ctx)
      return isSimpleValue(from) && isSimpleValue(to) && isSimpleValue(fps)
        ? { type: 'gk:platStateFrames', charVar, state, from, to, fps }
        : null
    }
    case 'platformerAnim': {
      const charVar = identifierName(args[0])
      return charVar ? { type: 'gk:platformerAnim', charVar } : null
    }
    // 👾 R16 — Kit Monstrinhos
    case 'pkmCreature': {
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'StringLiteral') return null
      if (args[6]?.type !== 'StringLiteral' || args[7]?.type !== 'StringLiteral') return null
      const hp = toExpr(args[2], ctx)
      const st = toExpr(args[3], ctx)
      const df = toExpr(args[4], ctx)
      const sp = toExpr(args[5], ctx)
      return isSimpleValue(hp) && isSimpleValue(st) && isSimpleValue(df) && isSimpleValue(sp)
        ? {
            type: 'gk:pkmCreature',
            name: args[0].value as string,
            creatureType: args[1].value as string,
            hp,
            str: st,
            def: df,
            spd: sp,
            image: args[6].value as string,
            look: args[7].value as string,
          }
        : null
    }
    case 'pkmMove': {
      const strs = [args[0], args[1], args[2], args[5], args[6]]
      if (strs.some((a) => a?.type !== 'StringLiteral')) return null
      const dmg = toExpr(args[3], ctx)
      const acc = toExpr(args[4], ctx)
      if (!isSimpleValue(dmg) || !isSimpleValue(acc)) return null
      const fx = (strs[3] as { value: string }).value
      if (!GK_PKM_FX.has(fx)) return null
      return {
        type: 'gk:pkmMove',
        move: (strs[0] as { value: string }).value,
        creature: (strs[1] as { value: string }).value,
        moveType: (strs[2] as { value: string }).value,
        dmg,
        acc,
        fx,
        color: (strs[4] as { value: string }).value,
      }
    }
    case 'pkmTypeChart': {
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'StringLiteral') return null
      const mult = toExpr(args[2], ctx)
      return isSimpleValue(mult)
        ? {
            type: 'gk:pkmTypeChart',
            atk: args[0].value as string,
            def: args[1].value as string,
            mult,
          }
        : null
    }
    case 'pkmEvolve': {
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'StringLiteral') return null
      const level = toExpr(args[2], ctx)
      return isSimpleValue(level)
        ? {
            type: 'gk:pkmEvolve',
            from: args[0].value as string,
            to: args[1].value as string,
            level,
          }
        : null
    }
    case 'pkmCatchDifficulty': {
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'StringLiteral') return null
      const lv = args[1].value as string
      if (!GK_PKM_DIFF.has(lv)) return null
      return { type: 'gk:pkmCatchDifficulty', creature: args[0].value as string, level: lv }
    }
    case 'pkmGive':
    case 'pkmBattleWild':
    case 'pkmTrainerCreature': {
      if (args[0]?.type !== 'StringLiteral') return null
      const level = toExpr(args[1], ctx)
      if (!isSimpleValue(level)) return null
      const creature = args[0].value as string
      if (method === 'pkmGive') return { type: 'gk:pkmGive', creature, level }
      if (method === 'pkmBattleWild') return { type: 'gk:pkmBattleWild', creature, level }
      return { type: 'gk:pkmTrainerCreature', creature, level }
    }
    case 'pkmGiveBall': {
      const count = toExpr(args[0], ctx)
      const power = toExpr(args[1], ctx)
      return isSimpleValue(count) && isSimpleValue(power)
        ? { type: 'gk:pkmGiveBall', count, power }
        : null
    }
    case 'pkmHealTeam':
      return { type: 'gk:pkmHealTeam' }
    case 'pkmDrawTeam': {
      const x = toExpr(args[0], ctx)
      const y = toExpr(args[1], ctx)
      return isSimpleValue(x) && isSimpleValue(y) ? { type: 'gk:pkmDrawTeam', x, y } : null
    }
    case 'pkmGrassCells': {
      const x1 = toExpr(args[0], ctx)
      const y1 = toExpr(args[1], ctx)
      const x2 = toExpr(args[2], ctx)
      const y2 = toExpr(args[3], ctx)
      return isSimpleValue(x1) && isSimpleValue(y1) && isSimpleValue(x2) && isSimpleValue(y2)
        ? { type: 'gk:pkmGrassCells', x1, y1, x2, y2 }
        : null
    }
    case 'pkmGrassTiles': {
      if (args[1]?.type !== 'StringLiteral') return null
      const index = toExpr(args[0], ctx)
      return isSimpleValue(index)
        ? { type: 'gk:pkmGrassTiles', index, map: args[1].value as string }
        : null
    }
    case 'pkmWild': {
      if (args[0]?.type !== 'StringLiteral') return null
      const min = toExpr(args[1], ctx)
      const max = toExpr(args[2], ctx)
      return isSimpleValue(min) && isSimpleValue(max)
        ? { type: 'gk:pkmWild', creature: args[0].value as string, min, max }
        : null
    }
    case 'pkmEncounterRate': {
      const percent = toExpr(args[0], ctx)
      return isSimpleValue(percent) ? { type: 'gk:pkmEncounterRate', percent } : null
    }
    case 'pkmBattleTrainer': {
      if (args[0]?.type !== 'StringLiteral') return null
      const body = bodyOfFn(args[1], ctx.source, ctx)
      return body ? { type: 'gk:pkmBattleTrainer', name: args[0].value as string, body } : null
    }
    // 🧭 R15 — primitivos gerais
    case 'defineRegion': {
      if (args[0]?.type !== 'StringLiteral') return null
      const x = toExpr(args[1], ctx)
      const y = toExpr(args[2], ctx)
      const w = toExpr(args[3], ctx)
      const h = toExpr(args[4], ctx)
      return isSimpleValue(x) && isSimpleValue(y) && isSimpleValue(w) && isSimpleValue(h)
        ? { type: 'gk:defineRegion', name: args[0].value as string, x, y, w, h }
        : null
    }
    case 'launchToPoint': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const x = toExpr(args[1], ctx)
      const y = toExpr(args[2], ctx)
      const speed = toExpr(args[3], ctx)
      return isSimpleValue(x) && isSimpleValue(y) && isSimpleValue(speed)
        ? { type: 'gk:launchToPoint', charVar, x, y, speed }
        : null
    }
    case 'setVelocityAngle': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const degrees = toExpr(args[1], ctx)
      const force = toExpr(args[2], ctx)
      return isSimpleValue(degrees) && isSimpleValue(force)
        ? { type: 'gk:setVelocityAngle', charVar, degrees, force }
        : null
    }
    // R21 — primitivos gerais
    case 'floatText': {
      if (args[3]?.type !== 'StringLiteral') return null
      const text = toExpr(args[0], ctx)
      const x = toExpr(args[1], ctx)
      const y = toExpr(args[2], ctx)
      const size = toExpr(args[4], ctx)
      return isSimpleValue(text) && isSimpleValue(x) && isSimpleValue(y) && isSimpleValue(size)
        ? { type: 'gk:floatText', text, x, y, color: args[3].value as string, size }
        : null
    }
    case 'trailOn': {
      const charVar = identifierName(args[0])
      if (!charVar || args[1]?.type !== 'StringLiteral') return null
      const size = toExpr(args[2], ctx)
      const rate = toExpr(args[3], ctx)
      const life = toExpr(args[4], ctx)
      return isSimpleValue(size) && isSimpleValue(rate) && isSimpleValue(life)
        ? { type: 'gk:trailOn', charVar, color: args[1].value as string, size, rate, life }
        : null
    }
    case 'trailOff': {
      const charVar = identifierName(args[0])
      return charVar ? { type: 'gk:trailOff', charVar } : null
    }
    case 'shockwave': {
      if (args[4]?.type !== 'StringLiteral') return null
      const x = toExpr(args[0], ctx)
      const y = toExpr(args[1], ctx)
      const radius = toExpr(args[2], ctx)
      const seconds = toExpr(args[3], ctx)
      return isSimpleValue(x) && isSimpleValue(y) && isSimpleValue(radius) && isSimpleValue(seconds)
        ? { type: 'gk:shockwave', x, y, radius, seconds, color: args[4].value as string }
        : null
    }
    case 'scrollImage': {
      if (args[0]?.type !== 'StringLiteral') return null
      const vx = toExpr(args[1], ctx)
      const vy = toExpr(args[2], ctx)
      return isSimpleValue(vx) && isSimpleValue(vy)
        ? { type: 'gk:scrollImage', image: args[0].value as string, vx, vy }
        : null
    }
    case 'leanOnMove': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const degrees = toExpr(args[1], ctx)
      return isSimpleValue(degrees) ? { type: 'gk:leanOnMove', charVar, degrees } : null
    }
    case 'fanShot': {
      const charVar = identifierName(args[0])
      if (!charVar || args[1]?.type !== 'StringLiteral') return null
      const count = toExpr(args[2], ctx)
      const arc = toExpr(args[3], ctx)
      const degrees = toExpr(args[4], ctx)
      const speed = toExpr(args[5], ctx)
      return isSimpleValue(count) &&
        isSimpleValue(arc) &&
        isSimpleValue(degrees) &&
        isSimpleValue(speed)
        ? { type: 'gk:fanShot', charVar, mold: args[1].value as string, count, arc, degrees, speed }
        : null
    }
    // 🚀 R22 — Kit Nave
    case 'naveShip': {
      const charVar = identifierName(args[0])
      const dtVar = identifierName(args[3])
      if (!charVar || !dtVar) return null
      const speed = toExpr(args[1], ctx)
      const lean = toExpr(args[2], ctx)
      return isSimpleValue(speed) && isSimpleValue(lean)
        ? { type: 'gk:naveShip', charVar, speed, lean, dtVar }
        : null
    }
    case 'navePowerup': {
      const charVar = identifierName(args[0])
      if (!charVar || args[1]?.type !== 'StringLiteral') return null
      const power = args[1].value as string
      if (!GK_NAVE_POWERS.has(power)) return null
      const seconds = toExpr(args[2], ctx)
      return isSimpleValue(seconds) ? { type: 'gk:navePowerup', charVar, power, seconds } : null
    }
    case 'naveWave': {
      if (args[0]?.type !== 'StringLiteral') return null
      const cols = toExpr(args[1], ctx)
      const rows = toExpr(args[2], ctx)
      const gap = toExpr(args[3], ctx)
      const speed = toExpr(args[4], ctx)
      const drop = toExpr(args[5], ctx)
      const accel = toExpr(args[6], ctx)
      return isSimpleValue(cols) &&
        isSimpleValue(rows) &&
        isSimpleValue(gap) &&
        isSimpleValue(speed) &&
        isSimpleValue(drop) &&
        isSimpleValue(accel)
        ? {
            type: 'gk:naveWave',
            mold: args[0].value as string,
            cols,
            rows,
            gap,
            speed,
            drop,
            accel,
          }
        : null
    }
    case 'naveWaveShooter': {
      if (args[0]?.type !== 'StringLiteral' || args[2]?.type !== 'StringLiteral') return null
      const seconds = toExpr(args[1], ctx)
      const speed = toExpr(args[3], ctx)
      return isSimpleValue(seconds) && isSimpleValue(speed)
        ? {
            type: 'gk:naveWaveShooter',
            mold: args[0].value as string,
            seconds,
            bullet: args[2].value as string,
            speed,
          }
        : null
    }
    case 'naveInvasionLine': {
      const y = toExpr(args[0], ctx)
      return isSimpleValue(y) ? { type: 'gk:naveInvasionLine', y } : null
    }
    case 'naveStarfield': {
      const count = toExpr(args[0], ctx)
      const speed = toExpr(args[1], ctx)
      return isSimpleValue(count) && isSimpleValue(speed)
        ? { type: 'gk:naveStarfield', count, speed }
        : null
    }
    case 'naveBomb': {
      if (args[0]?.type !== 'StringLiteral' || args[2]?.type !== 'StringLiteral') return null
      const radius = toExpr(args[1], ctx)
      return isSimpleValue(radius)
        ? {
            type: 'gk:naveBomb',
            mold: args[0].value as string,
            radius,
            target: args[2].value as string,
          }
        : null
    }
    // 🛤️ R25 — caminhos + paralaxe + explosão por folha
    case 'definePath': {
      if (args[0]?.type !== 'StringLiteral' || !isFn(args[1])) return null
      return {
        type: 'gk:definePath',
        name: args[0].value as string,
        body: bodyOfFn(args[1], source, ctx),
      }
    }
    case 'pathPoint': {
      const x = toExpr(args[0], ctx)
      const y = toExpr(args[1], ctx)
      return isSimpleValue(x) && isSimpleValue(y) ? { type: 'gk:pathPoint', x, y } : null
    }
    case 'followPath': {
      const charVar = identifierName(args[0])
      const dtVar = identifierName(args[3])
      if (!charVar || args[1]?.type !== 'StringLiteral' || !dtVar) return null
      const speed = toExpr(args[2], ctx)
      return isSimpleValue(speed)
        ? { type: 'gk:followPath', charVar, path: args[1].value as string, speed, dtVar }
        : null
    }
    case 'parallaxLayer': {
      if (args[0]?.type !== 'StringLiteral') return null
      const fx = toExpr(args[1], ctx)
      const fy = toExpr(args[2], ctx)
      return isSimpleValue(fx) && isSimpleValue(fy)
        ? { type: 'gk:parallaxLayer', image: args[0].value as string, fx, fy }
        : null
    }
    case 'sheetBurst': {
      if (args[0]?.type !== 'StringLiteral') return null
      const frames = toExpr(args[1], ctx)
      const fps = toExpr(args[2], ctx)
      const x = toExpr(args[3], ctx)
      const y = toExpr(args[4], ctx)
      const size = toExpr(args[5], ctx)
      return isSimpleValue(frames) &&
        isSimpleValue(fps) &&
        isSimpleValue(x) &&
        isSimpleValue(y) &&
        isSimpleValue(size)
        ? { type: 'gk:sheetBurst', image: args[0].value as string, frames, fps, x, y, size }
        : null
    }
    // 🏰 R26 — Kit Defesa de Torre
    case 'tdWave': {
      if (args[0]?.type !== 'StringLiteral' || args[2]?.type !== 'StringLiteral') return null
      const count = toExpr(args[1], ctx)
      const gap = toExpr(args[3], ctx)
      const speed = toExpr(args[4], ctx)
      return isSimpleValue(count) && isSimpleValue(gap) && isSimpleValue(speed)
        ? {
            type: 'gk:tdWave',
            path: args[0].value as string,
            count,
            mold: args[2].value as string,
            gap,
            speed,
          }
        : null
    }
    case 'tdSlot': {
      const x = toExpr(args[0], ctx)
      const y = toExpr(args[1], ctx)
      const size = toExpr(args[2], ctx)
      return isSimpleValue(x) && isSimpleValue(y) && isSimpleValue(size)
        ? { type: 'gk:tdSlot', x, y, size }
        : null
    }
    case 'tdDrawSlots':
      return { type: 'gk:tdDrawSlots' }
    case 'tdOnBuy': {
      // generator: SZGameKit.tdOnBuy(<cost>, function (lugarX, lugarY) {…})
      const cost = toExpr(args[0], ctx)
      if (!isSimpleValue(cost) || !isFn(args[1])) return null
      return {
        type: 'gk:tdOnBuy',
        cost,
        xName: identifierName(args[1].params?.[0]) ?? 'lugarX',
        yName: identifierName(args[1].params?.[1]) ?? 'lugarY',
        body: bodyOfFn(args[1], source, ctx),
      }
    }
    case 'tdFreeSlot': {
      const x = toExpr(args[0], ctx)
      const y = toExpr(args[1], ctx)
      return isSimpleValue(x) && isSimpleValue(y) ? { type: 'gk:tdFreeSlot', x, y } : null
    }
    case 'tdDrawRange': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const radius = toExpr(args[1], ctx)
      return isSimpleValue(radius) ? { type: 'gk:tdDrawRange', charVar, radius } : null
    }
    case 'tdSetCoins': {
      const n = toExpr(args[0], ctx)
      return isSimpleValue(n) ? { type: 'gk:tdSetCoins', n } : null
    }
    case 'tdAddCoins': {
      const n = toExpr(args[0], ctx)
      return isSimpleValue(n) ? { type: 'gk:tdAddCoins', n } : null
    }
    case 'setOpacity': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const percent = toExpr(args[1], ctx)
      return isSimpleValue(percent) ? { type: 'gk:setOpacity', charVar, percent } : null
    }
    case 'fadeTo': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const percent = toExpr(args[1], ctx)
      const seconds = toExpr(args[2], ctx)
      return isSimpleValue(percent) && isSimpleValue(seconds)
        ? { type: 'gk:fadeTo', charVar, percent, seconds }
        : null
    }
    case 'tweenProperty': {
      const charVar = identifierName(args[0])
      if (!charVar || args[1]?.type !== 'StringLiteral') return null
      const prop = args[1].value as string
      if (!GK_TWEEN_PROPS.has(prop)) return null
      const to = toExpr(args[2], ctx)
      const seconds = toExpr(args[3], ctx)
      return isSimpleValue(to) && isSimpleValue(seconds)
        ? { type: 'gk:tweenProperty', charVar, prop, to, seconds }
        : null
    }
    case 'lutaMatch': {
      const p1Var = identifierName(args[0])
      const p2Var = identifierName(args[1])
      if (!p1Var || !p2Var) return null
      const rounds = toExpr(args[2], ctx)
      const seconds = toExpr(args[3], ctx)
      return isSimpleValue(rounds) && isSimpleValue(seconds)
        ? { type: 'gk:lutaMatch', p1Var, p2Var, rounds, seconds }
        : null
    }
    case 'lutaDrawHud':
      return args.length === 0 ? { type: 'gk:lutaDrawHud' } : null
    case 'lutaFighter': {
      const charVar = identifierName(args[0])
      const dtVar = identifierName(args[6])
      if (!charVar || !dtVar) return null
      for (let i = 1; i <= 5; i++) if (args[i]?.type !== 'StringLiteral') return null
      return {
        type: 'gk:lutaFighter',
        charVar,
        left: (args[1] as { value: string }).value,
        right: (args[2] as { value: string }).value,
        jump: (args[3] as { value: string }).value,
        crouch: (args[4] as { value: string }).value,
        guard: (args[5] as { value: string }).value,
        dtVar,
      }
    }
    case 'lutaAI': {
      const charVar = identifierName(args[0])
      if (!charVar || args[1]?.type !== 'StringLiteral') return null
      const level = args[1].value as string
      if (!GK_LUTA_LEVELS.has(level)) return null // dropdown coage: outro -> rawJS
      return { type: 'gk:lutaAI', charVar, level }
    }
    case 'lutaMove': {
      const charVar = identifierName(args[1])
      if (!charVar || args[0]?.type !== 'StringLiteral' || args[2]?.type !== 'StringLiteral') {
        return null
      }
      const speed = args[2].value as string
      if (!GK_LUTA_SPEEDS.has(speed)) return null
      if (args[5]?.type !== 'BooleanLiteral' || args[6]?.type !== 'BooleanLiteral') return null
      const damage = toExpr(args[3], ctx)
      const range = toExpr(args[4], ctx)
      return isSimpleValue(damage) && isSimpleValue(range)
        ? {
            type: 'gk:lutaMove',
            name: args[0].value as string,
            charVar,
            speed,
            damage,
            range,
            pierce: args[5].value,
            special: args[6].value,
          }
        : null
    }
    case 'lutaMoveAnim': {
      const charVar = identifierName(args[1])
      if (!charVar || args[0]?.type !== 'StringLiteral') return null
      const from = toExpr(args[2], ctx)
      const to = toExpr(args[3], ctx)
      return isSimpleValue(from) && isSimpleValue(to)
        ? { type: 'gk:lutaMoveAnim', name: args[0].value as string, charVar, from, to }
        : null
    }
    case 'lutaAttack': {
      const charVar = identifierName(args[0])
      if (!charVar || args[1]?.type !== 'StringLiteral') return null
      return { type: 'gk:lutaAttack', charVar, move: args[1].value as string }
    }
    case 'setSwingWindow': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const start = toExpr(args[1], ctx)
      const active = toExpr(args[2], ctx)
      return isSimpleValue(start) && isSimpleValue(active)
        ? { type: 'gk:setSwingWindow', charVar, start, active }
        : null
    }
    case 'playAnimOnce': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const from = toExpr(args[1], ctx)
      const to = toExpr(args[2], ctx)
      const fps = toExpr(args[3], ctx)
      return isSimpleValue(from) && isSimpleValue(to) && isSimpleValue(fps)
        ? { type: 'gk:playAnimOnce', charVar, from, to, fps }
        : null
    }
    case 'setEntityState': {
      const charVar = identifierName(args[0])
      if (!charVar || args[1]?.type !== 'StringLiteral') return null
      const state = args[1].value as string
      if (!GK_ENTITY_STATES.has(state)) return null // dropdown coage: outro -> rawJS
      const seconds = toExpr(args[2], ctx)
      return isSimpleValue(seconds) ? { type: 'gk:setEntityState', charVar, state, seconds } : null
    }
    case 'stateAnim': {
      const charVar = identifierName(args[0])
      if (!charVar || args[1]?.type !== 'StringLiteral') return null
      const state = args[1].value as string
      if (!GK_ENTITY_STATES.has(state)) return null
      const from = toExpr(args[2], ctx)
      const to = toExpr(args[3], ctx)
      const fps = toExpr(args[4], ctx)
      if (args[5]?.type !== 'BooleanLiteral') return null
      return isSimpleValue(from) && isSimpleValue(to) && isSimpleValue(fps)
        ? { type: 'gk:stateAnim', charVar, state, from, to, fps, once: args[5].value }
        : null
    }
    case 'stateLook': {
      const charVar = identifierName(args[0])
      if (!charVar || args[1]?.type !== 'StringLiteral' || args[2]?.type !== 'StringLiteral') {
        return null
      }
      const state = args[1].value as string
      if (!GK_ENTITY_STATES.has(state)) return null
      return { type: 'gk:stateLook', charVar, state, look: args[2].value as string }
    }
    case 'autoAnimate': {
      const charVar = identifierName(args[0])
      return charVar ? { type: 'gk:autoAnimate', charVar } : null
    }
    case 'thrust': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const degrees = toExpr(args[1], ctx)
      const force = toExpr(args[2], ctx)
      return isSimpleValue(degrees) && isSimpleValue(force)
        ? { type: 'gk:thrust', charVar, degrees, force }
        : null
    }
    case 'applyFriction': {
      const charVar = identifierName(args[0])
      const dtVar = identifierName(args[2])
      if (!charVar || !dtVar) return null
      const factor = toExpr(args[1], ctx)
      return isSimpleValue(factor) ? { type: 'gk:applyFriction', charVar, factor, dtVar } : null
    }
    case 'waitThen': {
      if (!isFn(args[1])) return null
      const seconds = toExpr(args[0], ctx)
      return isSimpleValue(seconds)
        ? { type: 'gk:waitThen', seconds, body: bodyOfFn(args[1], source, ctx) }
        : null
    }
    case 'setHitbox': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const ox = toExpr(args[1], ctx)
      const oy = toExpr(args[2], ctx)
      const w = toExpr(args[3], ctx)
      const h = toExpr(args[4], ctx)
      return isSimpleValue(ox) && isSimpleValue(oy) && isSimpleValue(w) && isSimpleValue(h)
        ? { type: 'gk:setHitbox', charVar, ox, oy, w, h }
        : null
    }
    case 'fadeScreen': {
      if (args[0]?.type !== 'StringLiteral') return null
      const seconds = toExpr(args[1], ctx)
      const dark = args[2]
      if (dark?.type !== 'BooleanLiteral') return null
      return isSimpleValue(seconds)
        ? { type: 'gk:fadeScreen', color: args[0].value as string, seconds, toDark: dark.value }
        : null
    }
    case 'flashScreen': {
      if (args[0]?.type !== 'StringLiteral') return null
      const times = toExpr(args[1], ctx)
      return isSimpleValue(times)
        ? { type: 'gk:flashScreen', color: args[0].value as string, times }
        : null
    }
    case 'saveValue': {
      if (args[0]?.type !== 'StringLiteral') return null
      const value = toExpr(args[1], ctx)
      return isSimpleValue(value)
        ? { type: 'gk:saveValue', name: args[0].value as string, value }
        : null
    }
    case 'playMusic': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'gk:playMusic', sound: args[0].value as string }
    }
    case 'stopSound': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'gk:stopSound', sound: args[0].value as string }
    }
    case 'setVolume': {
      if (args[0]?.type !== 'StringLiteral') return null
      const level = toExpr(args[1], ctx)
      return isSimpleValue(level)
        ? { type: 'gk:setVolume', sound: args[0].value as string, level }
        : null
    }
    case 'createEmptyTilemap': {
      if (args[0]?.type !== 'StringLiteral' || args[4]?.type !== 'StringLiteral') return null
      const cols = toExpr(args[1], ctx)
      const rows = toExpr(args[2], ctx)
      const fill = toExpr(args[3], ctx)
      return isSimpleValue(cols) && isSimpleValue(rows) && isSimpleValue(fill)
        ? {
            type: 'gk:createEmptyTilemap',
            name: args[0].value as string,
            cols,
            rows,
            fill,
            asset: args[4].value as string,
          }
        : null
    }
    case 'moveWithCustomKeys': {
      const charVar = identifierName(args[0])
      const dtVar = identifierName(args[5])
      if (!charVar || !dtVar) return null
      const ks = [args[1], args[2], args[3], args[4]]
      if (ks.some((k) => k?.type !== 'StringLiteral')) return null
      return {
        type: 'gk:moveWithCustomKeys',
        charVar,
        up: (ks[0] as { value: string }).value,
        down: (ks[1] as { value: string }).value,
        left: (ks[2] as { value: string }).value,
        right: (ks[3] as { value: string }).value,
        dtVar,
      }
    }
    case 'tweenTo': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const x = toExpr(args[1], ctx)
      const y = toExpr(args[2], ctx)
      const seconds = toExpr(args[3], ctx)
      return isSimpleValue(x) && isSimpleValue(y) && isSimpleValue(seconds)
        ? { type: 'gk:tweenTo', charVar, x, y, seconds }
        : null
    }
    case 'attackFacing': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const range = toExpr(args[1], ctx)
      const duration = toExpr(args[2], ctx)
      return isSimpleValue(range) && isSimpleValue(duration)
        ? { type: 'gk:attackFacing', charVar, range, duration }
        : null
    }
    case 'patrolAround': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const ox = toExpr(args[1], ctx)
      const oy = toExpr(args[2], ctx)
      const radius = toExpr(args[3], ctx)
      return isSimpleValue(ox) && isSimpleValue(oy) && isSimpleValue(radius)
        ? { type: 'gk:patrolAround', charVar, ox, oy, radius }
        : null
    }
    case 'drawHearts': {
      const current = toExpr(args[0], ctx)
      const max = toExpr(args[1], ctx)
      const x = toExpr(args[2], ctx)
      const y = toExpr(args[3], ctx)
      return isSimpleValue(current) && isSimpleValue(max) && isSimpleValue(x) && isSimpleValue(y)
        ? { type: 'gk:drawHearts', current, max, x, y }
        : null
    }
    case 'drawBackground': {
      // generator: SZGameKit.drawBackground("#0f3460", true)
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'BooleanLiteral') return null
      return {
        type: 'gk:drawBackground',
        color: args[0].value as string,
        grid: args[1].value as boolean,
      }
    }
    case 'moveWithKeys': {
      const charVar = identifierName(args[0])
      const dtVar = identifierName(args[1])
      return charVar && dtVar ? { type: 'gk:moveWithKeys', charVar, dtVar } : null
    }
    case 'keepOnScreen': {
      const charVar = identifierName(args[0])
      return charVar ? { type: 'gk:keepOnScreen', charVar } : null
    }
    case 'drawCharacter': {
      const charVar = identifierName(args[0])
      return charVar ? { type: 'gk:drawCharacter', charVar } : null
    }
    case 'placeCharacter': {
      const charVar = identifierName(args[0])
      const x = toExpr(args[1], ctx)
      const y = toExpr(args[2], ctx)
      return charVar && isSimpleValue(x) && isSimpleValue(y)
        ? { type: 'gk:placeCharacter', charVar, x, y }
        : null
    }
    case 'resetCharacter': {
      const charVar = identifierName(args[0])
      return charVar ? { type: 'gk:resetCharacter', charVar } : null
    }
    case 'setSpeedMultiplier': {
      const charVar = identifierName(args[0])
      const factor = toExpr(args[1], ctx)
      return charVar && isSimpleValue(factor)
        ? { type: 'gk:setSpeedMultiplier', charVar, factor }
        : null
    }
    case 'setPauseKey': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'gk:setPauseKey', key: args[0].value as string }
    }
    // ----- P24 -----
    case 'on': {
      // generator: SZGameKit.on("aviso", function () {…})
      if (args[0]?.type !== 'StringLiteral' || !isFn(args[1])) return null
      return {
        type: 'gk:onEvent',
        event: args[0].value as string,
        body: bodyOfFn(args[1], source, ctx),
      }
    }
    case 'emit': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'gk:emit', event: args[0].value as string }
    }
    case 'defineMold': {
      // generator: SZGameKit.defineMold("x", { w, h, health, speed, damage, color, image, look })
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'ObjectExpression') return null
      const o = readGameKitMoldOptions(args[1], ctx)
      return o ? { type: 'gk:defineMold', name: args[0].value as string, ...o } : null
    }
    case 'spawnFromMold': {
      if (args[0]?.type !== 'StringLiteral') return null
      const x = toExpr(args[1], ctx)
      const y = toExpr(args[2], ctx)
      return isSimpleValue(x) && isSimpleValue(y)
        ? { type: 'gk:spawnFromMold', mold: args[0].value as string, x, y }
        : null
    }
    case 'startSpawner': {
      if (args[0]?.type !== 'StringLiteral') return null
      const seconds = toExpr(args[1], ctx)
      return isSimpleValue(seconds)
        ? { type: 'gk:startSpawner', mold: args[0].value as string, seconds }
        : null
    }
    case 'stopSpawner': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'gk:stopSpawner', mold: args[0].value as string }
    }
    case 'forEachActive': {
      // generator: SZGameKit.forEachActive("x", function (item) {…})
      if (args[0]?.type !== 'StringLiteral' || !isFn(args[1])) return null
      return {
        type: 'gk:forEachActive',
        mold: args[0].value as string,
        itemName: identifierName(args[1].params?.[0]) ?? 'item',
        body: bodyOfFn(args[1], source, ctx),
      }
    }
    case 'cullOffscreen': {
      if (args[0]?.type !== 'StringLiteral') return null
      const margin = toExpr(args[1], ctx)
      return isSimpleValue(margin)
        ? { type: 'gk:cullOffscreen', mold: args[0].value as string, margin }
        : null
    }
    case 'recycle': {
      const charVar = identifierName(args[0])
      return charVar ? { type: 'gk:recycle', charVar } : null
    }
    case 'drawActive': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'gk:drawActive', mold: args[0].value as string }
    }
    case 'defineLook': {
      // generator: SZGameKit.defineLook("x", function (ctx) {…}, 40, 40)
      // (os 2 args de tamanho-base são opcionais — forma v0.2 tinha só 2 args).
      if (args[0]?.type !== 'StringLiteral' || !isFn(args[1])) return null
      const ctxParam = identifierName(args[1].params?.[0])
      // O parâmetro é um CONTEXTO 2D — registrar em ctxVars p/ os blocos de Canvas
      // dentro da aparência round-trippem (gêmeo do defineShape/onDraw).
      if (ctxParam) ctx.ctxVars.add(ctxParam)
      const base: JSStatement = {
        type: 'gk:defineLook',
        name: args[0].value as string,
        ctxName: ctxParam ?? 'ctx',
        body: bodyOfFn(args[1], source, ctx),
      }
      if (args.length < 3) return base
      const baseW = toExpr(args[2], ctx)
      const baseH = toExpr(args[3], ctx)
      return isSimpleValue(baseW) && isSimpleValue(baseH) ? { ...base, baseW, baseH } : null
    }
    case 'drawLook': {
      if (args[0]?.type !== 'StringLiteral') return null
      const x = toExpr(args[1], ctx)
      const y = toExpr(args[2], ctx)
      const w = toExpr(args[3], ctx)
      const h = toExpr(args[4], ctx)
      return isSimpleValue(x) && isSimpleValue(y) && isSimpleValue(w) && isSimpleValue(h)
        ? { type: 'gk:drawLook', look: args[0].value as string, x, y, w, h }
        : null
    }
    case 'seek': {
      const charVar = identifierName(args[0])
      const targetVar = identifierName(args[1])
      const dtVar = identifierName(args[2])
      return charVar && targetVar && dtVar ? { type: 'gk:seek', charVar, targetVar, dtVar } : null
    }
    case 'drift': {
      const charVar = identifierName(args[0])
      const dtVar = identifierName(args[1])
      return charVar && dtVar ? { type: 'gk:drift', charVar, dtVar } : null
    }
    case 'face': {
      const charVar = identifierName(args[0])
      const targetVar = identifierName(args[1])
      return charVar && targetVar ? { type: 'gk:face', charVar, targetVar } : null
    }
    case 'hurt': {
      const charVar = identifierName(args[0])
      const amount = toExpr(args[1], ctx)
      const iframes = toExpr(args[2], ctx)
      return charVar && isSimpleValue(amount) && isSimpleValue(iframes)
        ? { type: 'gk:hurt', charVar, amount, iframes }
        : null
    }
    case 'knockback': {
      const charVar = identifierName(args[0])
      const fromVar = identifierName(args[1])
      const force = toExpr(args[2], ctx)
      return charVar && fromVar && isSimpleValue(force)
        ? { type: 'gk:knockback', charVar, fromVar, force }
        : null
    }
    case 'drawHealthBar': {
      const charVar = identifierName(args[0])
      const max = toExpr(args[1], ctx)
      return charVar && isSimpleValue(max) ? { type: 'gk:drawHealthBar', charVar, max } : null
    }
    case 'setMission': {
      const seconds = toExpr(args[0], ctx)
      const killCount = toExpr(args[1], ctx)
      return isSimpleValue(seconds) && isSimpleValue(killCount)
        ? { type: 'gk:setMission', seconds, killCount }
        : null
    }
    case 'missionKill':
      return args.length === 0 ? { type: 'gk:missionKill' } : null
    case 'drawTimer': {
      const x = toExpr(args[0], ctx)
      const y = toExpr(args[1], ctx)
      return isSimpleValue(x) && isSimpleValue(y) ? { type: 'gk:drawTimer', x, y } : null
    }
    case 'defineEffect': {
      // generator: SZGameKit.defineEffect("x", { count, color, size, life, speed, gravity })
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'ObjectExpression') return null
      const o = readGameKitEffectOptions(args[1], ctx)
      return o ? { type: 'gk:defineEffect', name: args[0].value as string, ...o } : null
    }
    case 'burst': {
      if (args[0]?.type !== 'StringLiteral') return null
      const x = toExpr(args[1], ctx)
      const y = toExpr(args[2], ctx)
      return isSimpleValue(x) && isSimpleValue(y)
        ? { type: 'gk:burst', effect: args[0].value as string, x, y }
        : null
    }
    case 'drawEffects':
      return args.length === 0 ? { type: 'gk:drawEffects' } : null
    case 'loadSound': {
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'StringLiteral') return null
      return { type: 'gk:loadSound', name: args[0].value as string, asset: args[1].value as string }
    }
    case 'playSound': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'gk:playSound', name: args[0].value as string }
    }
    case 'playEffect': {
      if (args[0]?.type !== 'StringLiteral') return null
      // R29: efeito fora do dropdown → rawJS (senão a Ponte coage p/ "coin").
      if (!GK_FX_KINDS.has(args[0].value as string)) return null
      return { type: 'gk:playEffect', fx: args[0].value as string }
    }
    case 'playTone': {
      const freq = toExpr(args[0], ctx)
      const ms = toExpr(args[1], ctx)
      return isSimpleValue(freq) && isSimpleValue(ms) ? { type: 'gk:playTone', freq, ms } : null
    }
    default:
      return null
  }
}

/** `const heroi = SZGameKit.createCharacter({...})` → gk:createCharacter;
 *  `const chefe = SZGameKit.spawnFromMold("m", x, y)` → gk:spawnNamed. */
function tryMatchGameKitVarInit(name: string, init: Node, ctx: ParseCtx): JSStatement | null {
  const call = asSZGameKitCall(init)
  if (!call) return null
  const { method, args } = call
  if (method === 'spawnFromMold') {
    if (args[0]?.type !== 'StringLiteral') return null
    const x = toExpr(args[1], ctx)
    const y = toExpr(args[2], ctx)
    return isSimpleValue(x) && isSimpleValue(y)
      ? { type: 'gk:spawnNamed', varName: name, mold: args[0].value as string, x, y }
      : null
  }
  if (method === 'createCharacter') {
    if (args[0]?.type !== 'ObjectExpression') return null
    const o = readGameKitCharacterOptions(args[0], ctx)
    if (!o) return null
    return {
      type: 'gk:createCharacter',
      varName: name,
      image: o.image,
      w: o.w,
      h: o.h,
      speed: o.speed,
      color: o.color,
    }
  }
  return null
}

// =====================================================================
// Mundo 3D (world-3d) — window.SZWorld3D
// =====================================================================

function asSZWorld3DCall(expr: Node): { method: string; args: Node[] } | null {
  if (expr?.type !== 'CallExpression') return null
  const callee = expr.callee
  if (callee?.type !== 'MemberExpression' || callee.computed) return null
  if (callee.object?.type !== 'Identifier' || callee.object.name !== 'SZWorld3D') return null
  if (callee.property?.type !== 'Identifier') return null
  return { method: callee.property.name as string, args: expr.arguments ?? [] }
}

/** Enums fixos dos dropdowns do Mundo 3D — valor desconhecido → null → rawJS
 * (o dropdown coagiria para a 1ª opção e o round-trip mentiria). */
const W3D_STYLES = new Set(['floresta', 'praia', 'neve', 'deserto', 'primavera', 'lua', 'fazenda'])
const W3D_CAR_STYLES = new Set(['passeio', 'jipe', 'corrida'])
const W3D_CITY_SIZES = new Set(['pequena', 'media', 'grande'])
const W3D_CITY_MODES = new Set(['dia', 'neon'])
const W3D_TRAFFIC_MODES = new Set(['semaforos', 'livre'])
const W3D_CROP_KINDS = new Set(['milho', 'alface', 'abobora'])
const W3D_ANIMAL_KINDS = new Set(['galinhas', 'vacas'])
const W3D_THINGS = new Set([
  'arvores',
  'pinheiros',
  'pedras',
  'flores',
  'cogumelos',
  'cactos',
  'palmeiras',
])
const W3D_AMBIENCES = new Set(['mar', 'passaros', 'grilos', 'desligado'])
const W3D_GRASS_AMOUNTS = new Set(['pouca', 'media', 'muita'])
const W3D_EFFECTS_ON = new Set(['ligados', 'desligados'])
const W3D_TIRES_ON = new Set(['ligadas', 'desligadas'])
const W3D_PAINTS = new Set(['lisa', 'listras', 'chamas', 'arco-iris', 'estrelas'])
const W3D_TIMES = new Set(['manha', 'meiodia', 'entardecer', 'noite'])
const W3D_WEATHER = new Set(['limpo', 'chuva', 'neve', 'folhas', 'tempestade'])
const W3D_SEASONS = new Set(['primavera', 'verao', 'outono', 'inverno'])
const W3D_CLOUD_AMOUNTS = new Set(['nenhuma', 'poucas', 'muitas'])
const W3D_PUSH_THINGS = new Set(['tijolo', 'banco', 'cerca', 'lanterna', 'cone'])
const W3D_FIREFLY_AMOUNTS = new Set(['pouca', 'media', 'muita'])
const W3D_MARKER_ICONS = new Set(['alerta', 'estrela', 'alvo', 'moeda'])
const W3D_HATS = new Set(['nenhum', 'bone', 'palha', 'coroa', 'capacete'])
const W3D_ACCESSORIES = new Set(['nenhum', 'jetpack', 'botas'])
const W3D_EMOTES = new Set(['acenar', 'pular', 'girar', 'dancar'])
const W3D_DAY_PHASES = new Set(['dia', 'noite'])
const W3D_POS_AXES = new Set(['x', 'y', 'z'])
const W3D_DISTRICTS = new Set([
  'residencial',
  'comercial',
  'educacao',
  'saude',
  'industrial',
  'turistico',
])
const W3D_ROAD_LAYOUTS = new Set(['grade', 'radial', 'organica'])
const W3D_HOUSE_STYLES = new Set(['coloridas', 'praia', 'modernas', 'campo'])
const W3D_QUALITY_MODES = new Set(['automatica', 'alta', 'desempenho'])

/** Chave de ObjectProperty não-computada (Identifier ou string). */
function w3dPropKey(prop: Node): string | null {
  if (prop?.type !== 'ObjectProperty' || prop.computed) return null
  if (prop.key?.type === 'Identifier') return prop.key.name as string
  if (prop.key?.type === 'StringLiteral') return prop.key.value as string
  return null
}

function w3dStringLiteral(node: Node | undefined): string | null {
  if (node?.type !== 'StringLiteral' || typeof node.value !== 'string') return null
  return node.value
}

/** SZWorld3D.keyDown("e") / groundHeight(x, z) / worldSize() … em posição de VALOR. */
function matchWorld3DExpr(node: Node, ctx?: ParseCtx): JSExpr | null {
  const call = asSZWorld3DCall(node)
  if (!call) return null
  const { method, args } = call
  if (method === 'worldSize' && args.length === 0) return { type: 'w3d:worldSize' }
  if (method === 'carSpeed' && args.length === 0) return { type: 'w3d:carSpeed' }
  if (method === 'timeOfDay' && args.length === 0) return { type: 'w3d:timeOfDay' }
  if (method === 'raceTime' && args.length === 0) return { type: 'w3d:raceTime' }
  if (method === 'raceBest' && args.length === 0) return { type: 'w3d:raceBest' }
  if (method === 'pinsDown' && args.length === 0) return { type: 'w3d:pinsDown' }
  if (method === 'knockedCount' && args.length === 0) return { type: 'w3d:knockedCount' }
  if (method === 'carPos' && args[0]?.type === 'StringLiteral') {
    const axis = args[0].value as string
    if (W3D_POS_AXES.has(axis)) return { type: 'w3d:carPos', axis: axis as 'x' | 'y' | 'z' }
  }
  if (method === 'personPos' && args[0]?.type === 'StringLiteral') {
    const paxis = args[0].value as string
    if (W3D_POS_AXES.has(paxis)) return { type: 'w3d:personPos', axis: paxis as 'x' | 'y' | 'z' }
  }
  if (method === 'isDriving' && args.length === 0) return { type: 'w3d:isDriving' }
  if (method === 'coinCount' && args.length === 0) return { type: 'w3d:coinCount' }
  if (method === 'hasAchievement' && args[0]?.type === 'StringLiteral') {
    return { type: 'w3d:hasAchievement', name: args[0].value as string }
  }
  if (method === 'inventoryCount') {
    const item = w3dStringLiteral(args[0])
    if (item !== null) return { type: 'w3d:inventoryCount', item }
  }
  if (method === 'inventoryHas') {
    const item = w3dStringLiteral(args[0])
    const n = toExpr(args[1], ctx)
    if (item !== null && isSimpleValue(n)) {
      return { type: 'w3d:inventoryHas', item, n }
    }
  }
  if (method === 'keyDown' && args[0]?.type === 'StringLiteral') {
    return { type: 'w3d:keyDown', key: args[0].value as string }
  }
  if (method === 'keyPressed' && args[0]?.type === 'StringLiteral') {
    return { type: 'w3d:keyPressed', key: args[0].value as string }
  }
  if (method === 'groundHeight' && args.length === 2) {
    const x = toExpr(args[0], ctx)
    const z = toExpr(args[1], ctx)
    if (isSimpleValue(x) && isSimpleValue(z)) return { type: 'w3d:groundHeight', x, z }
  }
  return null
}

/**
 * SZWorld3D.* como statement: mundo/carrinho/natureza/efeitos.
 * ANTES do método genérico — senão viram memberCall.
 */
function tryMatchWorld3DCall(expr: Node, source: string, ctx: ParseCtx): JSStatement | null {
  const call = asSZWorld3DCall(expr)
  if (!call) return null
  const { method, args } = call
  const isFn = (n: Node) =>
    n?.type === 'FunctionExpression' || n?.type === 'ArrowFunctionExpression'

  switch (method) {
    case 'setup': {
      // generator: SZWorld3D.setup({ style, world })
      if (args[0]?.type !== 'ObjectExpression') return null
      let style = 'floresta'
      let world: JSExpr = { type: 'num', value: 160 }
      for (const prop of args[0].properties ?? []) {
        const key = w3dPropKey(prop)
        if (key === 'style') {
          if (prop.value?.type !== 'StringLiteral') return null
          if (!W3D_STYLES.has(prop.value.value as string)) return null
          style = prop.value.value as string
        } else if (key === 'world') {
          const v = toExpr(prop.value, ctx)
          if (!isSimpleValue(v)) return null
          world = v
        } else {
          return null
        }
      }
      return { type: 'w3d:setup', style, world }
    }
    case 'terrain': {
      const h = toExpr(args[0], ctx)
      const s = toExpr(args[1], ctx)
      return isSimpleValue(h) && isSimpleValue(s) ? { type: 'w3d:terrain', h, s } : null
    }
    case 'start':
      return args.length === 0 ? { type: 'w3d:start' } : null
    case 'flatten': {
      const x = toExpr(args[0], ctx)
      const z = toExpr(args[1], ctx)
      const r = toExpr(args[2], ctx)
      return isSimpleValue(x) && isSimpleValue(z) && isSimpleValue(r)
        ? { type: 'w3d:flatten', x, z, r }
        : null
    }
    case 'path': {
      const x1 = toExpr(args[0], ctx)
      const z1 = toExpr(args[1], ctx)
      const x2 = toExpr(args[2], ctx)
      const z2 = toExpr(args[3], ctx)
      const w = toExpr(args[4], ctx)
      return isSimpleValue(x1) &&
        isSimpleValue(z1) &&
        isSimpleValue(x2) &&
        isSimpleValue(z2) &&
        isSimpleValue(w)
        ? { type: 'w3d:path', x1, z1, x2, z2, w }
        : null
    }
    case 'water': {
      if (args[1]?.type !== 'StringLiteral') return null
      const y = toExpr(args[0], ctx)
      return isSimpleValue(y) ? { type: 'w3d:water', y, color: args[1].value as string } : null
    }
    case 'carBoost': {
      const force = toExpr(args[0], ctx)
      return isSimpleValue(force) ? { type: 'w3d:carBoost', force } : null
    }
    case 'engineSound': {
      if (args[0]?.type !== 'StringLiteral') return null
      const on = args[0].value as string
      if (on !== 'ligado' && on !== 'desligado') return null
      return { type: 'w3d:engineSound', on: on === 'ligado' }
    }
    case 'loadSound': {
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'StringLiteral') return null
      return {
        type: 'w3d:loadSound',
        name: args[0].value as string,
        asset: args[1].value as string,
      }
    }
    case 'playSound': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'w3d:playSound', name: args[0].value as string }
    }
    case 'playMusic': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'w3d:playMusic', name: args[0].value as string }
    }
    case 'stopMusic':
      return args.length === 0 ? { type: 'w3d:stopMusic' } : null
    case 'hud': {
      if (args[1]?.type !== 'StringLiteral') return null
      const t = toExpr(args[0], ctx)
      return isSimpleValue(t) ? { type: 'w3d:hud', text: t, corner: args[1].value as string } : null
    }
    case 'say': {
      const t = toExpr(args[0], ctx)
      const secs = toExpr(args[1], ctx)
      return isSimpleValue(t) && isSimpleValue(secs) ? { type: 'w3d:say', text: t, secs } : null
    }
    case 'point': {
      if (args[0]?.type !== 'StringLiteral') return null
      const x = toExpr(args[1], ctx)
      const z = toExpr(args[2], ctx)
      return isSimpleValue(x) && isSimpleValue(z)
        ? { type: 'w3d:point', name: args[0].value as string, x, z }
        : null
    }
    case 'onPoint': {
      if (args[0]?.type !== 'StringLiteral' || !isFn(args[1]) || (args[1].params ?? []).length > 0)
        return null
      return {
        type: 'w3d:onPoint',
        name: args[0].value as string,
        body: bodyOfFn(args[1], source, ctx),
      }
    }
    case 'zone': {
      if (args[0]?.type !== 'StringLiteral') return null
      const x = toExpr(args[1], ctx)
      const z = toExpr(args[2], ctx)
      const r = toExpr(args[3], ctx)
      return isSimpleValue(x) && isSimpleValue(z) && isSimpleValue(r)
        ? { type: 'w3d:zone', name: args[0].value as string, x, z, r }
        : null
    }
    case 'onZone': {
      if (args[0]?.type !== 'StringLiteral' || !isFn(args[1]) || (args[1].params ?? []).length > 0)
        return null
      return {
        type: 'w3d:onZone',
        name: args[0].value as string,
        body: bodyOfFn(args[1], source, ctx),
      }
    }
    case 'totemText': {
      if (args[2]?.type !== 'StringLiteral' || args[3]?.type !== 'StringLiteral') return null
      const x = toExpr(args[0], ctx)
      const z = toExpr(args[1], ctx)
      return isSimpleValue(x) && isSimpleValue(z)
        ? {
            type: 'w3d:totemText',
            x,
            z,
            title: args[2].value as string,
            body: args[3].value as string,
          }
        : null
    }
    case 'totemImage': {
      if (args[2]?.type !== 'StringLiteral') return null
      const x = toExpr(args[0], ctx)
      const z = toExpr(args[1], ctx)
      const w = toExpr(args[3], ctx)
      return isSimpleValue(x) && isSimpleValue(z) && isSimpleValue(w)
        ? { type: 'w3d:totemImage', x, z, image: args[2].value as string, w }
        : null
    }
    case 'galleryCreate': {
      if (args[2]?.type !== 'StringLiteral') return null
      const x = toExpr(args[0], ctx)
      const z = toExpr(args[1], ctx)
      return isSimpleValue(x) && isSimpleValue(z)
        ? { type: 'w3d:galleryCreate', x, z, title: args[2].value as string }
        : null
    }
    case 'galleryAdd': {
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'StringLiteral') return null
      return {
        type: 'w3d:galleryAdd',
        image: args[0].value as string,
        caption: args[1].value as string,
      }
    }
    case 'raceCreate': {
      const x = toExpr(args[0], ctx)
      const z = toExpr(args[1], ctx)
      const deg = toExpr(args[2], ctx)
      const laps = toExpr(args[3], ctx)
      return isSimpleValue(x) && isSimpleValue(z) && isSimpleValue(deg) && isSimpleValue(laps)
        ? { type: 'w3d:raceCreate', x, z, deg, laps }
        : null
    }
    case 'raceCheckpoint': {
      const x = toExpr(args[0], ctx)
      const z = toExpr(args[1], ctx)
      const deg = toExpr(args[2], ctx)
      return isSimpleValue(x) && isSimpleValue(z) && isSimpleValue(deg)
        ? { type: 'w3d:raceCheckpoint', x, z, deg }
        : null
    }
    case 'raceOnStart': {
      if (!isFn(args[0]) || (args[0].params ?? []).length > 0) return null
      return { type: 'w3d:raceOnStart', body: bodyOfFn(args[0], source, ctx) }
    }
    case 'raceOnCheckpoint': {
      if (!isFn(args[0]) || (args[0].params ?? []).length > 0) return null
      return { type: 'w3d:raceOnCheckpoint', body: bodyOfFn(args[0], source, ctx) }
    }
    case 'raceOnFinish': {
      if (!isFn(args[0]) || (args[0].params ?? []).length > 0) return null
      return { type: 'w3d:raceOnFinish', body: bodyOfFn(args[0], source, ctx) }
    }
    case 'bowlingCreate': {
      const x = toExpr(args[0], ctx)
      const z = toExpr(args[1], ctx)
      const deg = toExpr(args[2], ctx)
      return isSimpleValue(x) && isSimpleValue(z) && isSimpleValue(deg)
        ? { type: 'w3d:bowlingCreate', x, z, deg }
        : null
    }
    case 'bowlingReset':
      return args.length === 0 ? { type: 'w3d:bowlingReset' } : null
    case 'bowlingOnStrike': {
      if (!isFn(args[0]) || (args[0].params ?? []).length > 0) return null
      return { type: 'w3d:bowlingOnStrike', body: bodyOfFn(args[0], source, ctx) }
    }
    case 'stack': {
      if (args[1]?.type !== 'StringLiteral') return null
      const n = toExpr(args[0], ctx)
      const x = toExpr(args[2], ctx)
      const z = toExpr(args[3], ctx)
      return isSimpleValue(n) && isSimpleValue(x) && isSimpleValue(z)
        ? { type: 'w3d:stack', n, thing: args[1].value as string, x, z }
        : null
    }
    case 'car': {
      // generator: SZWorld3D.car({ style, color })
      if (args[0]?.type !== 'ObjectExpression') return null
      let style = 'passeio'
      let color = '#ef4444'
      for (const prop of args[0].properties ?? []) {
        const key = w3dPropKey(prop)
        if (key === 'style') {
          if (prop.value?.type !== 'StringLiteral') return null
          if (!W3D_CAR_STYLES.has(prop.value.value as string)) return null
          style = prop.value.value as string
        } else if (key === 'color') {
          if (prop.value?.type !== 'StringLiteral') return null
          color = prop.value.value as string
        } else {
          return null
        }
      }
      return { type: 'w3d:car', style, color }
    }
    case 'carStats': {
      const speed = toExpr(args[0], ctx)
      const turn = toExpr(args[1], ctx)
      const jump = toExpr(args[2], ctx)
      return isSimpleValue(speed) && isSimpleValue(turn) && isSimpleValue(jump)
        ? { type: 'w3d:carStats', speed, turn, jump }
        : null
    }
    case 'carPlace': {
      const x = toExpr(args[0], ctx)
      const z = toExpr(args[1], ctx)
      const deg = toExpr(args[2], ctx)
      return isSimpleValue(x) && isSimpleValue(z) && isSimpleValue(deg)
        ? { type: 'w3d:carPlace', x, z, deg }
        : null
    }
    case 'grass': {
      if (args[0]?.type !== 'StringLiteral') return null
      const amount = args[0].value as string
      return W3D_GRASS_AMOUNTS.has(amount) ? { type: 'w3d:grass', amount } : null
    }
    case 'scatter': {
      if (args[1]?.type !== 'StringLiteral') return null
      const thing = args[1].value as string
      if (!W3D_THINGS.has(thing)) return null
      const n = toExpr(args[0], ctx)
      return isSimpleValue(n) ? { type: 'w3d:scatter', n, thing } : null
    }
    case 'scatterModel': {
      if (args[1]?.type !== 'StringLiteral') return null
      const n = toExpr(args[0], ctx)
      const s = toExpr(args[2], ctx)
      return isSimpleValue(n) && isSimpleValue(s)
        ? { type: 'w3d:scatterModel', n, model: args[1].value as string, s }
        : null
    }
    case 'placeThing': {
      if (args[0]?.type !== 'StringLiteral') return null
      const thing = args[0].value as string
      if (!W3D_THINGS.has(thing)) return null
      const x = toExpr(args[1], ctx)
      const z = toExpr(args[2], ctx)
      const s = toExpr(args[3], ctx)
      return isSimpleValue(x) && isSimpleValue(z) && isSimpleValue(s)
        ? { type: 'w3d:placeThing', thing, x, z, s }
        : null
    }
    case 'placeModel': {
      if (args[0]?.type !== 'StringLiteral') return null
      const x = toExpr(args[1], ctx)
      const z = toExpr(args[2], ctx)
      const s = toExpr(args[3], ctx)
      const deg = toExpr(args[4], ctx)
      return isSimpleValue(x) && isSimpleValue(z) && isSimpleValue(s) && isSimpleValue(deg)
        ? { type: 'w3d:placeModel', model: args[0].value as string, x, z, s, deg }
        : null
    }
    case 'clearArea': {
      const x = toExpr(args[0], ctx)
      const z = toExpr(args[1], ctx)
      const r = toExpr(args[2], ctx)
      return isSimpleValue(x) && isSimpleValue(z) && isSimpleValue(r)
        ? { type: 'w3d:clearArea', x, z, r }
        : null
    }
    case 'onCrash': {
      // generator: SZWorld3D.onCrash(function () {…})
      if (!isFn(args[0]) || (args[0].params ?? []).length > 0) return null
      return { type: 'w3d:onCrash', body: bodyOfFn(args[0], source, ctx) }
    }
    case 'horn':
      return { type: 'w3d:horn' }
    case 'onHorn': {
      if (!isFn(args[0]) || (args[0].params ?? []).length > 0) return null
      return { type: 'w3d:onHorn', body: bodyOfFn(args[0], source, ctx) }
    }
    case 'carLights':
      return { type: 'w3d:carLights' }
    case 'tireMarks': {
      if (args[0]?.type !== 'StringLiteral') return null
      const tiresOn = args[0].value as string
      if (!W3D_TIRES_ON.has(tiresOn)) return null
      return { type: 'w3d:tireMarks', on: tiresOn === 'ligadas' }
    }
    case 'carPaint': {
      if (args[0]?.type !== 'StringLiteral') return null
      const paint = args[0].value as string
      return W3D_PAINTS.has(paint) ? { type: 'w3d:carPaint', paint } : null
    }
    case 'confetti':
      return { type: 'w3d:confetti' }
    case 'fireworks':
      return { type: 'w3d:fireworks' }
    case 'tornado': {
      const secs = toExpr(args[0], ctx)
      return isSimpleValue(secs) ? { type: 'w3d:tornado', secs } : null
    }
    case 'season': {
      if (args[0]?.type !== 'StringLiteral') return null
      const season = args[0].value as string
      return W3D_SEASONS.has(season) ? { type: 'w3d:season', season } : null
    }
    case 'clouds': {
      if (args[0]?.type !== 'StringLiteral') return null
      const amount = args[0].value as string
      return W3D_CLOUD_AMOUNTS.has(amount) ? { type: 'w3d:clouds', amount } : null
    }
    case 'achievement': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'w3d:achievement', name: args[0].value as string }
    }
    case 'onAchievement': {
      if (args[0]?.type !== 'StringLiteral') return null
      if (!isFn(args[1]) || (args[1].params ?? []).length > 0) return null
      return {
        type: 'w3d:onAchievement',
        name: args[0].value as string,
        body: bodyOfFn(args[1], source, ctx),
      }
    }
    case 'minimap': {
      if (args[0]?.type !== 'StringLiteral') return null
      const mode = args[0].value as string
      if (mode !== 'ver' && mode !== 'teleporte') return null
      return { type: 'w3d:minimap', mode }
    }
    case 'racePodium':
      return { type: 'w3d:racePodium' }
    case 'whisperCorner': {
      const x = toExpr(args[0], ctx)
      const z = toExpr(args[1], ctx)
      return isSimpleValue(x) && isSimpleValue(z) ? { type: 'w3d:whisperCorner', x, z } : null
    }
    case 'flameNote': {
      const x = toExpr(args[0], ctx)
      const z = toExpr(args[1], ctx)
      if (args[2]?.type !== 'StringLiteral') return null
      return isSimpleValue(x) && isSimpleValue(z)
        ? { type: 'w3d:flameNote', x, z, text: args[2].value as string }
        : null
    }
    case 'coinsScatter': {
      const n = toExpr(args[0], ctx)
      return isSimpleValue(n) ? { type: 'w3d:coinsScatter', n } : null
    }
    case 'coinsRing': {
      const n = toExpr(args[0], ctx)
      const x = toExpr(args[1], ctx)
      const z = toExpr(args[2], ctx)
      const r = toExpr(args[3], ctx)
      return isSimpleValue(n) && isSimpleValue(x) && isSimpleValue(z) && isSimpleValue(r)
        ? { type: 'w3d:coinsRing', n, x, z, r }
        : null
    }
    case 'coinsLine': {
      const n = toExpr(args[0], ctx)
      const x1 = toExpr(args[1], ctx)
      const z1 = toExpr(args[2], ctx)
      const x2 = toExpr(args[3], ctx)
      const z2 = toExpr(args[4], ctx)
      return isSimpleValue(n) &&
        isSimpleValue(x1) &&
        isSimpleValue(z1) &&
        isSimpleValue(x2) &&
        isSimpleValue(z2)
        ? { type: 'w3d:coinsLine', n, x1, z1, x2, z2 }
        : null
    }
    case 'onCollect': {
      if (!isFn(args[0]) || (args[0].params ?? []).length > 0) return null
      return { type: 'w3d:onCollect', body: bodyOfFn(args[0], source, ctx) }
    }
    case 'quest': {
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'StringLiteral') return null
      return { type: 'w3d:quest', name: args[0].value as string, desc: args[1].value as string }
    }
    case 'questDone': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'w3d:questDone', name: args[0].value as string }
    }
    case 'onQuestDone': {
      if (args[0]?.type !== 'StringLiteral') return null
      if (!isFn(args[1]) || (args[1].params ?? []).length > 0) return null
      return {
        type: 'w3d:onQuestDone',
        name: args[0].value as string,
        body: bodyOfFn(args[1], source, ctx),
      }
    }
    case 'marker': {
      if (args[0]?.type !== 'StringLiteral') return null
      const icon = args[0].value as string
      if (!W3D_MARKER_ICONS.has(icon)) return null
      const x = toExpr(args[1], ctx)
      const z = toExpr(args[2], ctx)
      return isSimpleValue(x) && isSimpleValue(z) ? { type: 'w3d:marker', icon, x, z } : null
    }
    case 'guideArrow': {
      const x = toExpr(args[0], ctx)
      const z = toExpr(args[1], ctx)
      if (args[2]?.type !== 'StringLiteral') return null
      const on = args[2].value as string
      if (on !== 'ligada' && on !== 'desligada') return null
      return isSimpleValue(x) && isSimpleValue(z)
        ? { type: 'w3d:guideArrow', x, z, on: on === 'ligada' }
        : null
    }
    case 'npc': {
      if (args[0]?.type !== 'StringLiteral') return null
      if (args[3]?.type !== 'StringLiteral' || args[4]?.type !== 'StringLiteral') return null
      const hat = args[4].value as string
      if (!W3D_HATS.has(hat)) return null
      const x = toExpr(args[1], ctx)
      const z = toExpr(args[2], ctx)
      return isSimpleValue(x) && isSimpleValue(z)
        ? {
            type: 'w3d:npc',
            name: args[0].value as string,
            x,
            z,
            color: args[3].value as string,
            hat,
          }
        : null
    }
    case 'npcWander': {
      if (args[0]?.type !== 'StringLiteral') return null
      const r = toExpr(args[1], ctx)
      return isSimpleValue(r) ? { type: 'w3d:npcWander', name: args[0].value as string, r } : null
    }
    case 'npcTalk': {
      if (args[0]?.type !== 'StringLiteral') return null
      if (!isFn(args[1]) || (args[1].params ?? []).length > 0) return null
      return {
        type: 'w3d:npcTalk',
        name: args[0].value as string,
        body: bodyOfFn(args[1], source, ctx),
      }
    }
    case 'npcSay': {
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'StringLiteral') return null
      return { type: 'w3d:npcSay', name: args[0].value as string, text: args[1].value as string }
    }
    case 'npcEmote': {
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'StringLiteral') return null
      const emote = args[1].value as string
      return W3D_EMOTES.has(emote)
        ? { type: 'w3d:npcEmote', name: args[0].value as string, emote }
        : null
    }
    case 'islands': {
      const n = toExpr(args[0], ctx)
      const y = toExpr(args[1], ctx)
      return isSimpleValue(n) && isSimpleValue(y) ? { type: 'w3d:islands', n, y } : null
    }
    case 'boat': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'w3d:boat', color: args[0].value as string }
    }
    case 'bridge': {
      const x1 = toExpr(args[0], ctx)
      const z1 = toExpr(args[1], ctx)
      const x2 = toExpr(args[2], ctx)
      const z2 = toExpr(args[3], ctx)
      const w = toExpr(args[4], ctx)
      return isSimpleValue(x1) &&
        isSimpleValue(z1) &&
        isSimpleValue(x2) &&
        isSimpleValue(z2) &&
        isSimpleValue(w)
        ? { type: 'w3d:bridge', x1, z1, x2, z2, w }
        : null
    }
    case 'lighthouse': {
      const x = toExpr(args[0], ctx)
      const z = toExpr(args[1], ctx)
      return isSimpleValue(x) && isSimpleValue(z) ? { type: 'w3d:lighthouse', x, z } : null
    }
    case 'ambience': {
      if (args[0]?.type !== 'StringLiteral') return null
      const kind = args[0].value as string
      return W3D_AMBIENCES.has(kind) ? { type: 'w3d:ambience', kind } : null
    }
    case 'person': {
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'StringLiteral') return null
      const hat = args[1].value as string
      if (!W3D_HATS.has(hat)) return null
      return { type: 'w3d:person', color: args[0].value as string, hat }
    }
    case 'personStats': {
      const walk = toExpr(args[0], ctx)
      const run = toExpr(args[1], ctx)
      const jump = toExpr(args[2], ctx)
      return isSimpleValue(walk) && isSimpleValue(run) && isSimpleValue(jump)
        ? { type: 'w3d:personStats', walk, run, jump }
        : null
    }
    case 'personPlace': {
      const x = toExpr(args[0], ctx)
      const z = toExpr(args[1], ctx)
      const deg = toExpr(args[2], ctx)
      return isSimpleValue(x) && isSimpleValue(z) && isSimpleValue(deg)
        ? { type: 'w3d:personPlace', x, z, deg }
        : null
    }
    case 'personAccessory': {
      if (args[0]?.type !== 'StringLiteral') return null
      const acc = args[0].value as string
      return W3D_ACCESSORIES.has(acc) ? { type: 'w3d:personAccessory', acc } : null
    }
    case 'personEmote': {
      if (args[0]?.type !== 'StringLiteral') return null
      const emote = args[0].value as string
      return W3D_EMOTES.has(emote) ? { type: 'w3d:personEmote', emote } : null
    }
    case 'onVehicle': {
      if (args[0]?.type !== 'StringLiteral') return null
      const when = args[0].value as string
      if (when !== 'entrar' && when !== 'sair') return null
      if (!isFn(args[1]) || (args[1].params ?? []).length > 0) return null
      return { type: 'w3d:onVehicle', when, body: bodyOfFn(args[1], source, ctx) }
    }
    case 'waterfall': {
      const x = toExpr(args[0], ctx)
      const z = toExpr(args[1], ctx)
      const h = toExpr(args[2], ctx)
      const deg = toExpr(args[3], ctx)
      return isSimpleValue(x) && isSimpleValue(z) && isSimpleValue(h) && isSimpleValue(deg)
        ? { type: 'w3d:waterfall', x, z, h, deg }
        : null
    }
    case 'lamp': {
      const x = toExpr(args[0], ctx)
      const z = toExpr(args[1], ctx)
      return isSimpleValue(x) && isSimpleValue(z) ? { type: 'w3d:lamp', x, z } : null
    }
    case 'city': {
      const x = toExpr(args[0], ctx)
      const z = toExpr(args[1], ctx)
      if (args[2]?.type !== 'StringLiteral' || args[3]?.type !== 'StringLiteral') return null
      const size = args[2].value as string
      const mode = args[3].value as string
      if (!W3D_CITY_SIZES.has(size) || !W3D_CITY_MODES.has(mode)) return null
      return isSimpleValue(x) && isSimpleValue(z) ? { type: 'w3d:city', x, z, size, mode } : null
    }
    case 'district': {
      const kind = w3dStringLiteral(args[0])
      if (kind === null) return null
      const x = toExpr(args[1], ctx)
      const z = toExpr(args[2], ctx)
      const size = toExpr(args[3], ctx)
      return W3D_DISTRICTS.has(kind) && isSimpleValue(x) && isSimpleValue(z) && isSimpleValue(size)
        ? { type: 'w3d:district', kind, x, z, size }
        : null
    }
    case 'roadGrid': {
      const layout = w3dStringLiteral(args[0])
      if (layout === null) return null
      const x = toExpr(args[1], ctx)
      const z = toExpr(args[2], ctx)
      const size = toExpr(args[3], ctx)
      const width = toExpr(args[4], ctx)
      return W3D_ROAD_LAYOUTS.has(layout) &&
        isSimpleValue(x) &&
        isSimpleValue(z) &&
        isSimpleValue(size) &&
        isSimpleValue(width)
        ? { type: 'w3d:roadGrid', layout, x, z, size, width }
        : null
    }
    case 'houseRow': {
      const n = toExpr(args[0], ctx)
      const x1 = toExpr(args[1], ctx)
      const z1 = toExpr(args[2], ctx)
      const x2 = toExpr(args[3], ctx)
      const z2 = toExpr(args[4], ctx)
      const style = w3dStringLiteral(args[5])
      if (style === null) return null
      return W3D_HOUSE_STYLES.has(style) &&
        isSimpleValue(n) &&
        isSimpleValue(x1) &&
        isSimpleValue(z1) &&
        isSimpleValue(x2) &&
        isSimpleValue(z2)
        ? { type: 'w3d:houseRow', n, x1, z1, x2, z2, style }
        : null
    }
    case 'quality': {
      const mode = w3dStringLiteral(args[0])
      if (mode === null) return null
      return W3D_QUALITY_MODES.has(mode) ? { type: 'w3d:quality', mode } : null
    }
    case 'inventoryGive':
    case 'inventoryRemove': {
      const item = w3dStringLiteral(args[0])
      if (item === null) return null
      const n = toExpr(args[1], ctx)
      if (!isSimpleValue(n)) return null
      return method === 'inventoryGive'
        ? { type: 'w3d:inventoryGive', item, n }
        : { type: 'w3d:inventoryRemove', item, n }
    }
    case 'stringLights': {
      const x1 = toExpr(args[0], ctx)
      const z1 = toExpr(args[1], ctx)
      const x2 = toExpr(args[2], ctx)
      const z2 = toExpr(args[3], ctx)
      return isSimpleValue(x1) && isSimpleValue(z1) && isSimpleValue(x2) && isSimpleValue(z2)
        ? { type: 'w3d:stringLights', x1, z1, x2, z2 }
        : null
    }
    case 'traffic': {
      const n = toExpr(args[0], ctx)
      if (args[1]?.type !== 'StringLiteral') return null
      const sem = args[1].value as string
      if (!W3D_TRAFFIC_MODES.has(sem)) return null
      return isSimpleValue(n) ? { type: 'w3d:traffic', n, sem } : null
    }
    case 'door': {
      const x = toExpr(args[0], ctx)
      const z = toExpr(args[1], ctx)
      const deg = toExpr(args[2], ctx)
      if (
        args[3]?.type !== 'StringLiteral' ||
        args[4]?.type !== 'StringLiteral' ||
        args[5]?.type !== 'StringLiteral'
      ) {
        return null
      }
      return isSimpleValue(x) && isSimpleValue(z) && isSimpleValue(deg)
        ? {
            type: 'w3d:door',
            x,
            z,
            deg,
            title: args[3].value as string,
            body: args[4].value as string,
            image: args[5].value as string,
          }
        : null
    }
    case 'crops': {
      const n = toExpr(args[0], ctx)
      if (args[1]?.type !== 'StringLiteral') return null
      const kind = args[1].value as string
      if (!W3D_CROP_KINDS.has(kind)) return null
      const x = toExpr(args[2], ctx)
      const z = toExpr(args[3], ctx)
      return isSimpleValue(n) && isSimpleValue(x) && isSimpleValue(z)
        ? { type: 'w3d:crops', n, kind, x, z }
        : null
    }
    case 'barn': {
      const x = toExpr(args[0], ctx)
      const z = toExpr(args[1], ctx)
      const deg = toExpr(args[2], ctx)
      return isSimpleValue(x) && isSimpleValue(z) && isSimpleValue(deg)
        ? { type: 'w3d:barn', x, z, deg }
        : null
    }
    case 'windmill': {
      const x = toExpr(args[0], ctx)
      const z = toExpr(args[1], ctx)
      return isSimpleValue(x) && isSimpleValue(z) ? { type: 'w3d:windmill', x, z } : null
    }
    case 'fence': {
      const x1 = toExpr(args[0], ctx)
      const z1 = toExpr(args[1], ctx)
      const x2 = toExpr(args[2], ctx)
      const z2 = toExpr(args[3], ctx)
      return isSimpleValue(x1) && isSimpleValue(z1) && isSimpleValue(x2) && isSimpleValue(z2)
        ? { type: 'w3d:fence', x1, z1, x2, z2 }
        : null
    }
    case 'animals': {
      const n = toExpr(args[0], ctx)
      if (args[1]?.type !== 'StringLiteral') return null
      const kind = args[1].value as string
      if (!W3D_ANIMAL_KINDS.has(kind)) return null
      const x = toExpr(args[2], ctx)
      const z = toExpr(args[3], ctx)
      const r = toExpr(args[4], ctx)
      return isSimpleValue(n) && isSimpleValue(x) && isSimpleValue(z) && isSimpleValue(r)
        ? { type: 'w3d:animals', n, kind, x, z, r }
        : null
    }
    case 'crater': {
      const x = toExpr(args[0], ctx)
      const z = toExpr(args[1], ctx)
      const r = toExpr(args[2], ctx)
      return isSimpleValue(x) && isSimpleValue(z) && isSimpleValue(r)
        ? { type: 'w3d:crater', x, z, r }
        : null
    }
    case 'flag': {
      const x = toExpr(args[0], ctx)
      const z = toExpr(args[1], ctx)
      if (args[2]?.type !== 'StringLiteral') return null
      return isSimpleValue(x) && isSimpleValue(z)
        ? { type: 'w3d:flag', x, z, color: args[2].value as string }
        : null
    }
    case 'rocket': {
      const x = toExpr(args[0], ctx)
      const z = toExpr(args[1], ctx)
      return isSimpleValue(x) && isSimpleValue(z) ? { type: 'w3d:rocket', x, z } : null
    }
    case 'npcAsk': {
      if (
        args[0]?.type !== 'StringLiteral' ||
        args[1]?.type !== 'StringLiteral' ||
        args[2]?.type !== 'StringLiteral' ||
        args[4]?.type !== 'StringLiteral'
      ) {
        return null
      }
      if (!isFn(args[3]) || (args[3].params ?? []).length > 0) return null
      if (!isFn(args[5]) || (args[5].params ?? []).length > 0) return null
      return {
        type: 'w3d:npcAsk',
        name: args[0].value as string,
        question: args[1].value as string,
        optA: args[2].value as string,
        bodyA: bodyOfFn(args[3], source, ctx),
        optB: args[4].value as string,
        bodyB: bodyOfFn(args[5], source, ctx),
      }
    }
    case 'fireflies': {
      if (args[0]?.type !== 'StringLiteral') return null
      const amount = args[0].value as string
      return W3D_FIREFLY_AMOUNTS.has(amount) ? { type: 'w3d:fireflies', amount } : null
    }
    case 'campfire': {
      const x = toExpr(args[0], ctx)
      const z = toExpr(args[1], ctx)
      return isSimpleValue(x) && isSimpleValue(z) ? { type: 'w3d:campfire', x, z } : null
    }
    case 'pushPlace': {
      if (args[0]?.type !== 'StringLiteral') return null
      const thing = args[0].value as string
      if (!W3D_PUSH_THINGS.has(thing)) return null
      const x = toExpr(args[1], ctx)
      const z = toExpr(args[2], ctx)
      return isSimpleValue(x) && isSimpleValue(z) ? { type: 'w3d:pushPlace', thing, x, z } : null
    }
    case 'pushScatter': {
      const n = toExpr(args[0], ctx)
      const x = toExpr(args[1], ctx)
      const z = toExpr(args[2], ctx)
      const r = toExpr(args[3], ctx)
      return isSimpleValue(n) && isSimpleValue(x) && isSimpleValue(z) && isSimpleValue(r)
        ? { type: 'w3d:pushScatter', n, x, z, r }
        : null
    }
    case 'letters': {
      if (args[0]?.type !== 'StringLiteral') return null
      const x = toExpr(args[1], ctx)
      const z = toExpr(args[2], ctx)
      const s = toExpr(args[3], ctx)
      return isSimpleValue(x) && isSimpleValue(z) && isSimpleValue(s)
        ? { type: 'w3d:letters', word: args[0].value as string, x, z, s }
        : null
    }
    case 'explosive': {
      const x = toExpr(args[0], ctx)
      const z = toExpr(args[1], ctx)
      return isSimpleValue(x) && isSimpleValue(z) ? { type: 'w3d:explosive', x, z } : null
    }
    case 'onExplosion': {
      if (!isFn(args[0]) || (args[0].params ?? []).length > 0) return null
      return { type: 'w3d:onExplosion', body: bodyOfFn(args[0], source, ctx) }
    }
    case 'setEffects': {
      if (args[0]?.type !== 'StringLiteral') return null
      const on = args[0].value as string
      if (!W3D_EFFECTS_ON.has(on)) return null
      const strength = toExpr(args[1], ctx)
      return isSimpleValue(strength)
        ? { type: 'w3d:effects', on: on === 'ligados', strength }
        : null
    }
    case 'cameraMode': {
      if (args[0]?.type !== 'StringLiteral') return null
      const mode = args[0].value as string
      if (mode !== 'seguir' && mode !== 'topo' && mode !== 'cinema') return null
      return { type: 'w3d:cameraMode', mode }
    }
    case 'cameraShake': {
      const force = toExpr(args[0], ctx)
      const secs = toExpr(args[1], ctx)
      return isSimpleValue(force) && isSimpleValue(secs)
        ? { type: 'w3d:cameraShake', force, secs }
        : null
    }
    case 'dayNight': {
      const minutes = toExpr(args[0], ctx)
      return isSimpleValue(minutes) ? { type: 'w3d:dayNight', minutes } : null
    }
    case 'setTime': {
      if (args[0]?.type !== 'StringLiteral') return null
      const time = args[0].value as string
      return W3D_TIMES.has(time) ? { type: 'w3d:setTime', time } : null
    }
    case 'weather': {
      if (args[0]?.type !== 'StringLiteral') return null
      const kind = args[0].value as string
      return W3D_WEATHER.has(kind) ? { type: 'w3d:weather', kind } : null
    }
    case 'setWind': {
      const force = toExpr(args[0], ctx)
      return isSimpleValue(force) ? { type: 'w3d:wind', force } : null
    }
    case 'onDayNight': {
      // generator: SZWorld3D.onDayNight('noite', function () {…})
      if (args[0]?.type !== 'StringLiteral') return null
      const when = args[0].value as string
      if (!W3D_DAY_PHASES.has(when)) return null
      if (!isFn(args[1]) || (args[1].params ?? []).length > 0) return null
      return { type: 'w3d:onDayNight', when, body: bodyOfFn(args[1], source, ctx) }
    }
    case 'onUpdate': {
      // generator: SZWorld3D.onUpdate(function (dt) {…})
      if (!isFn(args[0])) return null
      return {
        type: 'w3d:onUpdate',
        dtName: identifierName(args[0].params?.[0]) ?? 'dt',
        body: bodyOfFn(args[0], source, ctx),
      }
    }
    default:
      return null
  }
}

// =====================================================================
// Jogo 3D Avançado (game-3d-advanced) — window.SZGameKit3D
// =====================================================================

function asSZGameKit3DCall(expr: Node): { method: string; args: Node[] } | null {
  if (expr?.type !== 'CallExpression') return null
  const callee = expr.callee
  if (callee?.type !== 'MemberExpression' || callee.computed) return null
  if (callee.object?.type !== 'Identifier' || callee.object.name !== 'SZGameKit3D') return null
  if (callee.property?.type !== 'Identifier') return null
  return { method: callee.property.name as string, args: expr.arguments ?? [] }
}

/** Enums fixos dos dropdowns — valor desconhecido → null → rawJS (o dropdown
 * coagiria para a 1ª opção e o round-trip mentiria; padrão do gk). */
const G3K_FIXED_SCREENS = new Set(['menu', 'pausa', 'carregando', 'fim', 'vitoria'])
const G3K_HUD_SLOTS = new Set([
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-right',
])
// ⚠️ Espelha o dropdown SHAPE do `sz_g3k_part`. Valor de forma que exista no
// bloco mas falte aqui faz o `part()` INTEIRO cair em rawJS na Ponte — silencioso
// e global (não só o molde da forma nova).
const G3K_PART_SHAPES = new Set([
  'box',
  'sphere',
  'cylinder',
  'cone',
  'plane',
  'torus',
  'pyramid',
  'rampa',
])
const G3K_COLLIDER_SHAPES = new Set(['box', 'sphere', 'capsule'])
/** Espelha o dropdown de "ter física de" — valor fora daqui cai em rawJS. */
const G3K_PHYS_KINDS = new Set(['bola', 'caixa', 'personagem', 'gelo', 'flutuante'])
const G3K_CURVES = new Set(['linear', 'suave', 'pulso', 'fogo'])
const G3K_PART_MATERIALS = new Set(['normal', 'metal', 'vidro', 'brilho'])
const G3K_SPAWNER_WHERE = new Set(['edge', 'anywhere'])
const G3K_POS_AXES = new Set(['x', 'y', 'z'])

/** SZGameKit3D.keyDown("w") / touches(a, b, d) / worldSize() … em posição de VALOR. */
function matchGameKit3DExpr(node: Node, ctx?: ParseCtx): JSExpr | null {
  const call = asSZGameKit3DCall(node)
  if (!call) return null
  const { method, args } = call
  if (method === 'worldSize' && args.length === 0) return { type: 'g3k:worldSize' }
  if (method === 'state' && args.length === 0) return { type: 'g3k:gameState' }
  if (method === 'stateIs' && args[0]?.type === 'StringLiteral') {
    return { type: 'g3k:stateIs', name: args[0].value as string }
  }
  if (method === 'countAlive' && args[0]?.type === 'StringLiteral') {
    return { type: 'g3k:countAlive', mold: args[0].value as string }
  }
  if (method === 'keyDown' && args[0]?.type === 'StringLiteral') {
    return { type: 'g3k:keyDown', key: args[0].value as string }
  }
  if (method === 'keyPressed' && args[0]?.type === 'StringLiteral') {
    return { type: 'g3k:keyPressed', key: args[0].value as string }
  }
  if (method === 'mouseDown' && args.length === 0) return { type: 'g3k:mouseDown' }
  if (method === 'mousePressed' && args.length === 0) return { type: 'g3k:mousePressed' }
  if (method === 'posOf') {
    const charVar = identifierName(args[0])
    if (charVar && args[1]?.type === 'StringLiteral') {
      const axis = args[1].value as string
      if (G3K_POS_AXES.has(axis)) return { type: 'g3k:posOf', axis, charVar }
    }
  }
  if (method === 'exists') {
    const charVar = identifierName(args[0])
    if (charVar) return { type: 'g3k:exists', charVar }
  }
  if (method === 'entityStateIs') {
    const charVar = identifierName(args[0])
    if (charVar && args[1]?.type === 'StringLiteral') {
      return { type: 'g3k:entityStateIs', charVar, state: args[1].value as string }
    }
  }
  if (method === 'isMold') {
    const charVar = identifierName(args[0])
    if (charVar && args[1]?.type === 'StringLiteral') {
      return { type: 'g3k:isMold', charVar, mold: args[1].value as string }
    }
  }
  if (method === 'isAimingAt') {
    const aVar = identifierName(args[0])
    const bVar = identifierName(args[1])
    if (aVar && bVar) return { type: 'g3k:isAimingAt', aVar, bVar }
  }
  if (method === 'touches') {
    const aVar = identifierName(args[0])
    const bVar = identifierName(args[1])
    if (aVar && bVar) {
      const dist = toExpr(args[2], ctx)
      if (isSimpleValue(dist)) return { type: 'g3k:touches', aVar, bVar, dist }
    }
  }
  if (method === 'healthOf') {
    const charVar = identifierName(args[0])
    if (charVar) return { type: 'g3k:healthOf', charVar }
  }
  if (method === 'entityValue') {
    const charVar = identifierName(args[0])
    if (charVar && args[1]?.type === 'StringLiteral') {
      return { type: 'g3k:entityValue', key: args[1].value as string, charVar }
    }
  }
  if (method === 'stateTime') {
    const charVar = identifierName(args[0])
    if (charVar) return { type: 'g3k:stateTime', charVar }
  }
  if (method === 'onGround') {
    const charVar = identifierName(args[0])
    if (charVar) return { type: 'g3k:onGround', charVar }
  }
  if (method === 'pointerOver') {
    const charVar = identifierName(args[0])
    if (charVar) return { type: 'g3k:pointerOver', charVar }
  }
  if (method === 'velocityOf') {
    const charVar = identifierName(args[0])
    if (charVar && args[1]?.type === 'StringLiteral') {
      const axis = args[1].value as string
      if (G3K_POS_AXES.has(axis))
        return { type: 'g3k:velocityOf', charVar, axis: axis as 'x' | 'y' | 'z' }
    }
  }
  if (method === 'distanceBetween') {
    const aVar = identifierName(args[0])
    const bVar = identifierName(args[1])
    if (aVar && bVar) return { type: 'g3k:distanceBetween', aVar, bVar }
  }
  if (method === 'randomBetween') {
    const from = toExpr(args[0], ctx)
    const to = toExpr(args[1], ctx)
    if (isSimpleValue(from) && isSimpleValue(to)) return { type: 'g3k:randomBetween', from, to }
  }
  if (method === 'randomChance') {
    const percent = toExpr(args[0], ctx)
    if (isSimpleValue(percent)) return { type: 'g3k:randomChance', percent }
  }
  if (method === 'timeLeft' && args.length === 0) {
    return { type: 'g3k:timeLeft' }
  }
  if (method === 'maxHealthOf') {
    const charVar = identifierName(args[0])
    if (charVar) return { type: 'g3k:maxHealthOf', charVar }
  }
  if (method === 'stateOf') {
    const charVar = identifierName(args[0])
    if (charVar) return { type: 'g3k:stateOf', charVar }
  }
  if (method === 'groundPoint') {
    if (args[0]?.type === 'StringLiteral') {
      const axis = args[0].value as string
      if (axis === 'x' || axis === 'y' || axis === 'z') return { type: 'g3k:groundPoint', axis }
    }
  }
  return null
}

/** Opções do `SZGameKit3D.setup({ width, height, world, sky, ground })`. */
function readGameKit3DSetupOptions(
  obj: Node,
  ctx: ParseCtx,
): { w: JSExpr; h: JSExpr; world: JSExpr; sky: string; ground: string } | null {
  const result: { w: JSExpr; h: JSExpr; world: JSExpr; sky: string; ground: string } = {
    w: { type: 'num', value: 1280 },
    h: { type: 'num', value: 720 },
    world: { type: 'num', value: 80 },
    sky: '#0b1026',
    ground: '#14532d',
  }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (key === 'width' || key === 'height' || key === 'world') {
      const v = toExpr(prop.value, ctx)
      if (!isSimpleValue(v)) return null
      if (key === 'width') result.w = v
      else if (key === 'height') result.h = v
      else result.world = v
    } else if (key === 'sky' || key === 'ground') {
      if (prop.value?.type !== 'StringLiteral') return null
      result[key] = prop.value.value as string
    } else {
      return null
    }
  }
  return result
}

/** Opções do `SZGameKit3D.part({ shape, color, w, h, d, x, y, z })`. */
function readGameKit3DPartOptions(
  obj: Node,
  ctx: ParseCtx,
): {
  shape: string
  material: string
  color: string
  texture: string
  model: string
  w: JSExpr
  h: JSExpr
  d: JSExpr
  x: JSExpr
  y: JSExpr
  z: JSExpr
} | null {
  const result = {
    shape: 'box',
    material: 'normal',
    color: '#22d3ee',
    texture: '',
    model: '',
    w: { type: 'num', value: 1 } as JSExpr,
    h: { type: 'num', value: 1 } as JSExpr,
    d: { type: 'num', value: 1 } as JSExpr,
    x: { type: 'num', value: 0 } as JSExpr,
    y: { type: 'num', value: 0.5 } as JSExpr,
    z: { type: 'num', value: 0 } as JSExpr,
  }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (key === 'w' || key === 'h' || key === 'd' || key === 'x' || key === 'y' || key === 'z') {
      const v = toExpr(prop.value, ctx)
      if (!isSimpleValue(v)) return null
      result[key] = v
    } else if (key === 'shape') {
      if (prop.value?.type !== 'StringLiteral') return null
      const shape = prop.value.value as string
      if (!G3K_PART_SHAPES.has(shape)) return null
      result.shape = shape
    } else if (key === 'material') {
      if (prop.value?.type !== 'StringLiteral') return null
      const material = prop.value.value as string
      if (!G3K_PART_MATERIALS.has(material)) return null
      result.material = material
    } else if (key === 'color') {
      if (prop.value?.type !== 'StringLiteral') return null
      result.color = prop.value.value as string
    } else if (key === 'texture' || key === 'model') {
      if (prop.value?.type !== 'StringLiteral') return null
      result[key] = prop.value.value as string
    } else {
      return null
    }
  }
  return result
}

/** Opções do `SZGameKit3D.setEffects({ shadows, bloom, strength, vignette })`. */
function readGameKit3DEffectsOptions(
  obj: Node,
  ctx: ParseCtx,
): { shadows: boolean; bloom: boolean; strength: JSExpr; vignette: boolean } | null {
  const result = {
    shadows: true,
    bloom: true,
    strength: { type: 'num', value: 1.2 } as JSExpr,
    vignette: true,
  }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (key === 'shadows' || key === 'bloom' || key === 'vignette') {
      if (prop.value?.type !== 'BooleanLiteral') return null
      result[key] = prop.value.value as boolean
    } else if (key === 'strength') {
      const v = toExpr(prop.value, ctx)
      if (!isSimpleValue(v)) return null
      result.strength = v
    } else {
      return null
    }
  }
  return result
}

/** Opções do `SZGameKit3D.defineEffect("x", { count, colorFrom, ... })`. */
function readGameKit3DFxOptions(
  obj: Node,
  ctx: ParseCtx,
): {
  count: JSExpr
  colorFrom: string
  colorTo: string
  spread: JSExpr
  sizeFrom: JSExpr
  sizeTo: JSExpr
  life: JSExpr
  gravity: JSExpr
} | null {
  const result = {
    count: { type: 'num', value: 24 } as JSExpr,
    colorFrom: '#fb923c',
    colorTo: '#451a03',
    spread: { type: 'num', value: 6 } as JSExpr,
    sizeFrom: { type: 'num', value: 0.5 } as JSExpr,
    sizeTo: { type: 'num', value: 0 } as JSExpr,
    life: { type: 'num', value: 0.8 } as JSExpr,
    gravity: { type: 'num', value: -9 } as JSExpr,
  }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (
      key === 'count' ||
      key === 'spread' ||
      key === 'sizeFrom' ||
      key === 'sizeTo' ||
      key === 'life' ||
      key === 'gravity'
    ) {
      const v = toExpr(prop.value, ctx)
      if (!isSimpleValue(v)) return null
      result[key] = v
    } else if (key === 'colorFrom' || key === 'colorTo') {
      if (prop.value?.type !== 'StringLiteral') return null
      result[key] = prop.value.value as string
    } else {
      return null
    }
  }
  return result
}

/** Opções do `SZGameKit3D.defineEmitter("x", { colorFrom, ..., glow })`. */
function readGameKit3DEmitterOptions(
  obj: Node,
  ctx: ParseCtx,
): {
  colorFrom: string
  colorTo: string
  sizeFrom: JSExpr
  sizeTo: JSExpr
  rate: JSExpr
  speed: JSExpr
  cone: JSExpr
  gravity: JSExpr
  glow: boolean
  curve: string
} | null {
  const result = {
    colorFrom: '#fde047',
    colorTo: '#7f1d1d',
    sizeFrom: { type: 'num', value: 0.5 } as JSExpr,
    sizeTo: { type: 'num', value: 0 } as JSExpr,
    rate: { type: 'num', value: 30 } as JSExpr,
    speed: { type: 'num', value: 3 } as JSExpr,
    cone: { type: 'num', value: 20 } as JSExpr,
    gravity: { type: 'num', value: 2 } as JSExpr,
    glow: true,
    curve: 'suave',
  }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (
      key === 'sizeFrom' ||
      key === 'sizeTo' ||
      key === 'rate' ||
      key === 'speed' ||
      key === 'cone' ||
      key === 'gravity'
    ) {
      const v = toExpr(prop.value, ctx)
      if (!isSimpleValue(v)) return null
      result[key] = v
    } else if (key === 'colorFrom' || key === 'colorTo') {
      if (prop.value?.type !== 'StringLiteral') return null
      result[key] = prop.value.value as string
    } else if (key === 'glow') {
      if (prop.value?.type !== 'BooleanLiteral') return null
      result.glow = prop.value.value as boolean
    } else if (key === 'curve') {
      if (prop.value?.type !== 'StringLiteral') return null
      const curve = prop.value.value as string
      // Dropdown coage desconhecido p/ a 1ª opção — recusa aqui e cai em rawJS.
      if (!G3K_CURVES.has(curve)) return null
      result.curve = curve
    } else {
      return null
    }
  }
  return result
}

/** Opções do `SZGameKit3D.defineMold("x", { health, speed }, fn)`. */
function readGameKit3DMoldOptions(
  obj: Node,
  ctx: ParseCtx,
): { health: JSExpr; speed: JSExpr } | null {
  const result = {
    health: { type: 'num', value: 30 } as JSExpr,
    speed: { type: 'num', value: 3 } as JSExpr,
  }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (key === 'health' || key === 'speed') {
      const v = toExpr(prop.value, ctx)
      if (!isSimpleValue(v)) return null
      result[key] = v
    } else {
      return null
    }
  }
  return result
}

/**
 * SZGameKit3D.* como statement: mundo/moldes/enxames/FSM/comportamentos/telas.
 * ANTES do método genérico — senão viram memberCall.
 */
function tryMatchGameKit3DCall(expr: Node, source: string, ctx: ParseCtx): JSStatement | null {
  const call = asSZGameKit3DCall(expr)
  if (!call) return null
  const { method, args } = call
  const isFn = (n: Node) =>
    n?.type === 'FunctionExpression' || n?.type === 'ArrowFunctionExpression'

  switch (method) {
    case 'setup': {
      // generator: SZGameKit3D.setup({ width, height, world, sky, ground })
      if (args[0]?.type !== 'ObjectExpression') return null
      const o = readGameKit3DSetupOptions(args[0], ctx)
      return o
        ? { type: 'g3k:setup', w: o.w, h: o.h, world: o.world, sky: o.sky, ground: o.ground }
        : null
    }
    case 'scatterDecor': {
      const count = toExpr(args[0], ctx)
      return isSimpleValue(count) ? { type: 'g3k:scatterDecor', count } : null
    }
    case 'setEffects': {
      if (args[0]?.type !== 'ObjectExpression') return null
      const o = readGameKit3DEffectsOptions(args[0], ctx)
      return o
        ? {
            type: 'g3k:setEffects',
            shadows: o.shadows,
            bloom: o.bloom,
            strength: o.strength,
            vignette: o.vignette,
          }
        : null
    }
    case 'defineEffect': {
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'ObjectExpression') return null
      const o = readGameKit3DFxOptions(args[1], ctx)
      return o
        ? {
            type: 'g3k:defineEffect',
            name: args[0].value as string,
            count: o.count,
            colorFrom: o.colorFrom,
            colorTo: o.colorTo,
            spread: o.spread,
            sizeFrom: o.sizeFrom,
            sizeTo: o.sizeTo,
            life: o.life,
            gravity: o.gravity,
          }
        : null
    }
    case 'burstAt': {
      if (args[0]?.type !== 'StringLiteral') return null
      const x = toExpr(args[1], ctx)
      const y = toExpr(args[2], ctx)
      const z = toExpr(args[3], ctx)
      return isSimpleValue(x) && isSimpleValue(y) && isSimpleValue(z)
        ? { type: 'g3k:burstAt', effect: args[0].value as string, x, y, z }
        : null
    }
    case 'burstOn': {
      if (args[0]?.type !== 'StringLiteral') return null
      const charVar = identifierName(args[1])
      return charVar ? { type: 'g3k:burstOn', effect: args[0].value as string, charVar } : null
    }
    case 'defineEmitter': {
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'ObjectExpression') return null
      const o = readGameKit3DEmitterOptions(args[1], ctx)
      return o
        ? {
            type: 'g3k:defineEmitter',
            name: args[0].value as string,
            colorFrom: o.colorFrom,
            colorTo: o.colorTo,
            sizeFrom: o.sizeFrom,
            sizeTo: o.sizeTo,
            rate: o.rate,
            speed: o.speed,
            cone: o.cone,
            gravity: o.gravity,
            glow: o.glow,
            curve: o.curve,
          }
        : null
    }
    case 'startEmitter': {
      if (args[0]?.type !== 'StringLiteral') return null
      const x = toExpr(args[1], ctx)
      const y = toExpr(args[2], ctx)
      const z = toExpr(args[3], ctx)
      return isSimpleValue(x) && isSimpleValue(y) && isSimpleValue(z)
        ? { type: 'g3k:startEmitter', effect: args[0].value as string, x, y, z }
        : null
    }
    case 'emitterOn': {
      if (args[0]?.type !== 'StringLiteral') return null
      const charVar = identifierName(args[1])
      return charVar ? { type: 'g3k:emitterOn', effect: args[0].value as string, charVar } : null
    }
    case 'stopEmitter': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'g3k:stopEmitter', effect: args[0].value as string }
    }
    case 'addAttractor': {
      if (args[0]?.type !== 'StringLiteral') return null
      const x = toExpr(args[1], ctx)
      const y = toExpr(args[2], ctx)
      const z = toExpr(args[3], ctx)
      const intensity = toExpr(args[4], ctx)
      const radius = toExpr(args[5], ctx)
      return isSimpleValue(x) &&
        isSimpleValue(y) &&
        isSimpleValue(z) &&
        isSimpleValue(intensity) &&
        isSimpleValue(radius)
        ? { type: 'g3k:addAttractor', effect: args[0].value as string, x, y, z, intensity, radius }
        : null
    }
    case 'start':
      return args.length === 0 ? { type: 'g3k:start' } : null
    case 'defineMold': {
      // generator: SZGameKit3D.defineMold("nome", { health, speed }, function () {…})
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'ObjectExpression') return null
      if (!isFn(args[2])) return null
      const o = readGameKit3DMoldOptions(args[1], ctx)
      return o
        ? {
            type: 'g3k:defineMold',
            name: args[0].value as string,
            health: o.health,
            speed: o.speed,
            body: bodyOfFn(args[2], source, ctx),
          }
        : null
    }
    case 'part': {
      if (args[0]?.type !== 'ObjectExpression') return null
      const o = readGameKit3DPartOptions(args[0], ctx)
      return o
        ? {
            type: 'g3k:part',
            shape: o.shape,
            material: o.material,
            color: o.color,
            texture: o.texture,
            model: o.model,
            w: o.w,
            h: o.h,
            d: o.d,
            x: o.x,
            y: o.y,
            z: o.z,
          }
        : null
    }
    case 'spawn': {
      // generator (sem const): SZGameKit3D.spawn("molde", x, y, z)
      if (args[0]?.type !== 'StringLiteral') return null
      const x = toExpr(args[1], ctx)
      const y = toExpr(args[2], ctx)
      const z = toExpr(args[3], ctx)
      return isSimpleValue(x) && isSimpleValue(y) && isSimpleValue(z)
        ? { type: 'g3k:spawn', mold: args[0].value as string, x, y, z }
        : null
    }
    case 'spawnFrom': {
      if (args[0]?.type !== 'StringLiteral') return null
      const fromVar = identifierName(args[1])
      return fromVar ? { type: 'g3k:spawnFrom', mold: args[0].value as string, fromVar } : null
    }
    case 'startSpawner': {
      if (args[0]?.type !== 'StringLiteral' || args[2]?.type !== 'StringLiteral') return null
      const where = args[2].value as string
      if (!G3K_SPAWNER_WHERE.has(where)) return null
      const seconds = toExpr(args[1], ctx)
      return isSimpleValue(seconds)
        ? { type: 'g3k:startSpawner', mold: args[0].value as string, seconds, where }
        : null
    }
    case 'stopSpawner': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'g3k:stopSpawner', mold: args[0].value as string }
    }
    case 'forEachAlive': {
      // generator: SZGameKit3D.forEachAlive("molde", function (item) {…})
      if (args[0]?.type !== 'StringLiteral' || !isFn(args[1])) return null
      return {
        type: 'g3k:forEachAlive',
        mold: args[0].value as string,
        itemName: identifierName(args[1].params?.[0]) ?? 'item',
        body: bodyOfFn(args[1], source, ctx),
      }
    }
    case 'recycle': {
      const charVar = identifierName(args[0])
      return charVar ? { type: 'g3k:recycle', charVar } : null
    }
    case 'recycleAll': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'g3k:recycleAll', mold: args[0].value as string }
    }
    case 'cullFar': {
      if (args[0]?.type !== 'StringLiteral') return null
      const dist = toExpr(args[1], ctx)
      return isSimpleValue(dist)
        ? { type: 'g3k:cullFar', mold: args[0].value as string, dist }
        : null
    }
    case 'onUpdate': {
      // generator: SZGameKit3D.onUpdate(function (dt) {…})
      if (!isFn(args[0])) return null
      return {
        type: 'g3k:onUpdate',
        dtName: identifierName(args[0].params?.[0]) ?? 'dt',
        body: bodyOfFn(args[0], source, ctx),
      }
    }
    case 'moveWithKeys': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const speed = toExpr(args[1], ctx)
      return isSimpleValue(speed) ? { type: 'g3k:moveWithKeys', charVar, speed } : null
    }
    case 'setPauseKey': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'g3k:setPauseKey', key: args[0].value as string }
    }
    case 'cameraFollow': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const dist = toExpr(args[1], ctx)
      const height = toExpr(args[2], ctx)
      return isSimpleValue(dist) && isSimpleValue(height)
        ? { type: 'g3k:cameraFollow', charVar, dist, height }
        : null
    }
    case 'cameraOrbit': {
      const dist = toExpr(args[0], ctx)
      return isSimpleValue(dist) ? { type: 'g3k:cameraOrbit', dist } : null
    }
    case 'cameraTop': {
      const height = toExpr(args[0], ctx)
      return isSimpleValue(height) ? { type: 'g3k:cameraTop', height } : null
    }
    case 'cameraAngle': {
      const az = toExpr(args[0], ctx)
      const el = toExpr(args[1], ctx)
      return isSimpleValue(az) && isSimpleValue(el) ? { type: 'g3k:cameraAngle', az, el } : null
    }
    case 'cameraDistance': {
      const dist = toExpr(args[0], ctx)
      return isSimpleValue(dist) ? { type: 'g3k:cameraDistance', dist } : null
    }
    case 'cameraShake': {
      const strength = toExpr(args[0], ctx)
      const seconds = toExpr(args[1], ctx)
      return isSimpleValue(strength) && isSimpleValue(seconds)
        ? { type: 'g3k:cameraShake', strength, seconds }
        : null
    }
    case 'cameraLens': {
      const fov = toExpr(args[0], ctx)
      return isSimpleValue(fov) ? { type: 'g3k:cameraLens', fov } : null
    }
    case 'cameraLookAt': {
      const charVar = identifierName(args[0])
      return charVar ? { type: 'g3k:cameraLookAt', charVar } : null
    }
    case 'cameraLookAtPoint': {
      const x = toExpr(args[0], ctx)
      const y = toExpr(args[1], ctx)
      const z = toExpr(args[2], ctx)
      return isSimpleValue(x) && isSimpleValue(y) && isSimpleValue(z)
        ? { type: 'g3k:cameraLookAtPoint', x, y, z }
        : null
    }
    case 'cameraSmooth': {
      const lambda = toExpr(args[0], ctx)
      return isSimpleValue(lambda) ? { type: 'g3k:cameraSmooth', lambda } : null
    }
    case 'place': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const x = toExpr(args[1], ctx)
      const y = toExpr(args[2], ctx)
      const z = toExpr(args[3], ctx)
      return isSimpleValue(x) && isSimpleValue(y) && isSimpleValue(z)
        ? { type: 'g3k:place', charVar, x, y, z }
        : null
    }
    case 'setYaw': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const degrees = toExpr(args[1], ctx)
      return isSimpleValue(degrees) ? { type: 'g3k:setYaw', charVar, degrees } : null
    }
    case 'setVelocity': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const x = toExpr(args[1], ctx)
      const y = toExpr(args[2], ctx)
      const z = toExpr(args[3], ctx)
      return isSimpleValue(x) && isSimpleValue(y) && isSimpleValue(z)
        ? { type: 'g3k:setVelocity', charVar, x, y, z }
        : null
    }
    case 'setDrag': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const drag = toExpr(args[1], ctx)
      return isSimpleValue(drag) ? { type: 'g3k:setDrag', charVar, drag } : null
    }
    case 'setEntityValue': {
      const charVar = identifierName(args[0])
      if (!charVar || args[1]?.type !== 'StringLiteral') return null
      const value = toExpr(args[2], ctx)
      return isSimpleValue(value)
        ? { type: 'g3k:setEntityValue', charVar, key: args[1].value as string, value }
        : null
    }
    case 'lookAt': {
      const charVar = identifierName(args[0])
      const targetVar = identifierName(args[1])
      return charVar && targetVar ? { type: 'g3k:lookAt', charVar, targetVar } : null
    }
    case 'moveForward': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const speed = toExpr(args[1], ctx)
      return isSimpleValue(speed) ? { type: 'g3k:moveForward', charVar, speed } : null
    }
    case 'fall': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const g = toExpr(args[1], ctx)
      return isSimpleValue(g) ? { type: 'g3k:fall', charVar, g } : null
    }
    case 'jump': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const force = toExpr(args[1], ctx)
      return isSimpleValue(force) ? { type: 'g3k:jump', charVar, force } : null
    }
    case 'makeSolid': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'g3k:makeSolid', mold: args[0].value as string }
    }
    case 'setSeed': {
      const seed = toExpr(args[0], ctx)
      return isSimpleValue(seed) ? { type: 'g3k:setSeed', seed } : null
    }
    case 'makeTrigger': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'g3k:makeTrigger', mold: args[0].value as string }
    }
    case 'setCollider': {
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'StringLiteral') return null
      const shape = args[1].value as string
      // Dropdown coage valor desconhecido p/ a 1ª opção — recusa aqui e cai em rawJS.
      if (!G3K_COLLIDER_SHAPES.has(shape)) return null
      return { type: 'g3k:setCollider', mold: args[0].value as string, shape }
    }
    case 'setPhysics': {
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'StringLiteral') return null
      const kind = args[1].value as string
      // Dropdown coage valor desconhecido p/ a 1ª opção — recusa aqui e cai em rawJS.
      if (!G3K_PHYS_KINDS.has(kind)) return null
      return { type: 'g3k:setPhysics', mold: args[0].value as string, kind }
    }
    case 'playAnim': {
      const charVar = identifierName(args[0])
      if (!charVar || args[1]?.type !== 'StringLiteral') return null
      const loopArg = args[2]
      if (loopArg && loopArg.type !== 'BooleanLiteral') return null
      return {
        type: 'g3k:playAnim',
        charVar,
        clip: args[1].value as string,
        loop: loopArg ? (loopArg.value as boolean) : true,
      }
    }
    case 'stopAnim': {
      const charVar = identifierName(args[0])
      return charVar ? { type: 'g3k:stopAnim', charVar } : null
    }
    case 'setStateAnim': {
      if (
        args[0]?.type !== 'StringLiteral' ||
        args[1]?.type !== 'StringLiteral' ||
        args[2]?.type !== 'StringLiteral'
      ) {
        return null
      }
      return {
        type: 'g3k:setStateAnim',
        mold: args[0].value as string,
        state: args[1].value as string,
        clip: args[2].value as string,
      }
    }
    case 'playMusic': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'g3k:playMusic', name: args[0].value as string }
    }
    case 'stopMusic':
      return args.length === 0 ? { type: 'g3k:stopMusic' } : null
    case 'startTimer': {
      const seconds = toExpr(args[0], ctx)
      return isSimpleValue(seconds) ? { type: 'g3k:startTimer', seconds } : null
    }
    case 'stopTimer':
      return args.length === 0 ? { type: 'g3k:stopTimer' } : null
    case 'onTimerEnd': {
      if (!isFn(args[0])) return null
      return { type: 'g3k:onTimerEnd', body: bodyOfFn(args[0], source, ctx) }
    }
    case 'say': {
      const charVar = identifierName(args[0])
      const textValue = toExpr(args[1], ctx)
      const seconds = toExpr(args[2], ctx)
      if (!charVar || !isSimpleValue(textValue) || !isSimpleValue(seconds)) return null
      return { type: 'g3k:say', charVar, text: textValue, seconds }
    }
    case 'hideSay': {
      const charVar = identifierName(args[0])
      return charVar ? { type: 'g3k:hideSay', charVar } : null
    }
    case 'passThrough': {
      const charVar = identifierName(args[0])
      if (!charVar || args[1]?.type !== 'BooleanLiteral') return null
      return { type: 'g3k:passThrough', charVar, ghost: args[1].value as boolean }
    }
    case 'showHealthBar': {
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'BooleanLiteral') return null
      return {
        type: 'g3k:showHealthBar',
        mold: args[0].value as string,
        on: args[1].value as boolean,
      }
    }
    case 'onOverlap': {
      // generator: SZGameKit3D.onOverlap("molde", function (zona, quem) {…})
      if (args[0]?.type !== 'StringLiteral' || !isFn(args[1])) return null
      return {
        type: 'g3k:onOverlap',
        mold: args[0].value as string,
        zoneName: identifierName(args[1].params?.[0]) ?? 'zona',
        whoName: identifierName(args[1].params?.[1]) ?? 'quem',
        body: bodyOfFn(args[1], source, ctx),
      }
    }
    case 'setBounce':
    case 'setFriction': {
      if (args[0]?.type !== 'StringLiteral') return null
      const amount = toExpr(args[1], ctx)
      if (!isSimpleValue(amount)) return null
      return method === 'setBounce'
        ? { type: 'g3k:setBounce', mold: args[0].value as string, amount }
        : { type: 'g3k:setFriction', mold: args[0].value as string, amount }
    }
    case 'platformerKeys': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const speed = toExpr(args[1], ctx)
      const jump = toExpr(args[2], ctx)
      return isSimpleValue(speed) && isSimpleValue(jump)
        ? { type: 'g3k:platformerKeys', charVar, speed, jump }
        : null
    }
    case 'addLight': {
      if (args[0]?.type !== 'StringLiteral') return null
      const x = toExpr(args[1], ctx)
      const y = toExpr(args[2], ctx)
      const z = toExpr(args[3], ctx)
      const intensity = toExpr(args[4], ctx)
      return isSimpleValue(x) && isSimpleValue(y) && isSimpleValue(z) && isSimpleValue(intensity)
        ? { type: 'g3k:addLight', color: args[0].value as string, x, y, z, intensity }
        : null
    }
    case 'setAmbient': {
      const intensity = toExpr(args[0], ctx)
      return isSimpleValue(intensity) ? { type: 'g3k:setAmbient', intensity } : null
    }
    case 'setFog': {
      if (args[0]?.type !== 'StringLiteral') return null
      const near = toExpr(args[1], ctx)
      const far = toExpr(args[2], ctx)
      return isSimpleValue(near) && isSimpleValue(far)
        ? { type: 'g3k:setFog', color: args[0].value as string, near, far }
        : null
    }
    case 'setSkyPhoto': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'g3k:setSkyPhoto', photo: args[0].value as string }
    }
    case 'setSky': {
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'StringLiteral') return null
      return { type: 'g3k:setSky', top: args[0].value as string, bottom: args[1].value as string }
    }
    case 'cameraFps': {
      const charVar = identifierName(args[0])
      return charVar ? { type: 'g3k:cameraFps', charVar } : null
    }
    case 'moveFps': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const speed = toExpr(args[1], ctx)
      return isSimpleValue(speed) ? { type: 'g3k:moveFps', charVar, speed } : null
    }
    case 'onEnterEntityState':
    case 'onExitEntityState': {
      // generator: SZGameKit3D.onEnterEntityState("molde", "estado", function (ela) {…})
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'StringLiteral') return null
      if (!isFn(args[2])) return null
      return {
        type: method === 'onEnterEntityState' ? 'g3k:onEnterEntityState' : 'g3k:onExitEntityState',
        mold: args[0].value as string,
        state: args[1].value as string,
        itemName: identifierName(args[2].params?.[0]) ?? 'ela',
        body: bodyOfFn(args[2], source, ctx),
      }
    }
    case 'onEntityStateUpdate': {
      // generator: SZGameKit3D.onEntityStateUpdate("molde", "estado", function (ela, dt) {…})
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'StringLiteral') return null
      if (!isFn(args[2])) return null
      return {
        type: 'g3k:onEntityStateUpdate',
        mold: args[0].value as string,
        state: args[1].value as string,
        itemName: identifierName(args[2].params?.[0]) ?? 'ela',
        dtName: identifierName(args[2].params?.[1]) ?? 'dt',
        body: bodyOfFn(args[2], source, ctx),
      }
    }
    case 'setEntityState': {
      const charVar = identifierName(args[0])
      if (!charVar || args[1]?.type !== 'StringLiteral') return null
      return { type: 'g3k:setEntityState', charVar, state: args[1].value as string }
    }
    case 'stateTimer': {
      if (
        args[0]?.type !== 'StringLiteral' ||
        args[1]?.type !== 'StringLiteral' ||
        args[3]?.type !== 'StringLiteral'
      ) {
        return null
      }
      const sec = toExpr(args[2], ctx)
      return isSimpleValue(sec)
        ? {
            type: 'g3k:stateTimer',
            mold: args[0].value as string,
            state: args[1].value as string,
            sec,
            next: args[3].value as string,
          }
        : null
    }
    case 'seek': {
      const charVar = identifierName(args[0])
      const targetVar = identifierName(args[1])
      return charVar && targetVar ? { type: 'g3k:seek', charVar, targetVar } : null
    }
    case 'seekPoint': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const x = toExpr(args[1], ctx)
      const z = toExpr(args[2], ctx)
      return isSimpleValue(x) && isSimpleValue(z) ? { type: 'g3k:seekPoint', charVar, x, z } : null
    }
    case 'aimAt': {
      const charVar = identifierName(args[0])
      const targetVar = identifierName(args[1])
      if (!charVar || !targetVar) return null
      const smooth = toExpr(args[2], ctx)
      return isSimpleValue(smooth) ? { type: 'g3k:aimAt', charVar, targetVar, smooth } : null
    }
    case 'faceVelocity': {
      const charVar = identifierName(args[0])
      return charVar ? { type: 'g3k:faceVelocity', charVar } : null
    }
    case 'forEachNear': {
      // generator: SZGameKit3D.forEachNear(ent, "molde", raio, function (vizinho) {…})
      const charVar = identifierName(args[0])
      if (!charVar || args[1]?.type !== 'StringLiteral' || !isFn(args[3])) return null
      const radius = toExpr(args[2], ctx)
      return isSimpleValue(radius)
        ? {
            type: 'g3k:forEachNear',
            charVar,
            mold: args[1].value as string,
            radius,
            itemName: identifierName(args[3].params?.[0]) ?? 'vizinho',
            body: bodyOfFn(args[3], source, ctx),
          }
        : null
    }
    case 'hurt': {
      const charVar = identifierName(args[0])
      if (!charVar) return null
      const amount = toExpr(args[1], ctx)
      return isSimpleValue(amount) ? { type: 'g3k:hurt', charVar, amount } : null
    }
    case 'onEntityDeath': {
      if (args[0]?.type !== 'StringLiteral' || !isFn(args[1])) return null
      return {
        type: 'g3k:onEntityDeath',
        mold: args[0].value as string,
        itemName: identifierName(args[1].params?.[0]) ?? 'ela',
        body: bodyOfFn(args[1], source, ctx),
      }
    }
    case 'setScreenText': {
      if (args[0]?.type !== 'StringLiteral') return null
      const screen = args[0].value as string
      if (!G3K_FIXED_SCREENS.has(screen)) return null
      const title = toExpr(args[1], ctx)
      const text = toExpr(args[2], ctx)
      const button = toExpr(args[3], ctx)
      return isSimpleValue(title) && isSimpleValue(text) && isSimpleValue(button)
        ? { type: 'g3k:setScreenText', screen, title, text, button }
        : null
    }
    case 'createScreen': {
      if (args[0]?.type !== 'StringLiteral') return null
      const title = toExpr(args[1], ctx)
      const text = toExpr(args[2], ctx)
      return isSimpleValue(title) && isSimpleValue(text)
        ? { type: 'g3k:createScreen', name: args[0].value as string, title, text }
        : null
    }
    case 'addButton': {
      if (args[0]?.type !== 'StringLiteral' || !isFn(args[2])) return null
      const label = toExpr(args[1], ctx)
      return isSimpleValue(label)
        ? {
            type: 'g3k:addButton',
            screen: args[0].value as string,
            label,
            body: bodyOfFn(args[2], source, ctx),
          }
        : null
    }
    case 'showScreen': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'g3k:showScreen', name: args[0].value as string }
    }
    case 'hideScreens':
      return args.length === 0 ? { type: 'g3k:hideScreens' } : null
    case 'setHud': {
      if (args[0]?.type !== 'StringLiteral') return null
      const slot = args[0].value as string
      if (!G3K_HUD_SLOTS.has(slot)) return null
      const text = toExpr(args[1], ctx)
      return isSimpleValue(text) ? { type: 'g3k:hudText', slot, text } : null
    }
    case 'setState': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'g3k:setState', name: args[0].value as string }
    }
    case 'onEnterState': {
      if (args[0]?.type !== 'StringLiteral' || !isFn(args[1])) return null
      return {
        type: 'g3k:onEnterState',
        name: args[0].value as string,
        body: bodyOfFn(args[1], source, ctx),
      }
    }
    case 'returnToMenu':
      return args.length === 0 ? { type: 'g3k:returnToMenu' } : null
    case 'endGame':
      return args.length === 0 ? { type: 'g3k:endGame' } : null
    case 'on': {
      if (args[0]?.type !== 'StringLiteral' || !isFn(args[1])) return null
      return {
        type: 'g3k:onEvent',
        event: args[0].value as string,
        body: bodyOfFn(args[1], source, ctx),
      }
    }
    case 'emit': {
      if (args[0]?.type !== 'StringLiteral' || args.length !== 1) return null
      return { type: 'g3k:emit', event: args[0].value as string }
    }
    case 'loadSound': {
      if (args[0]?.type !== 'StringLiteral' || args[1]?.type !== 'StringLiteral') return null
      return {
        type: 'g3k:loadSound',
        name: args[0].value as string,
        asset: args[1].value as string,
      }
    }
    case 'playSound': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'g3k:playSound', name: args[0].value as string }
    }
    case 'playEffect': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'g3k:playEffect', fx: args[0].value as string }
    }
    case 'playTone': {
      const freq = toExpr(args[0], ctx)
      const ms = toExpr(args[1], ctx)
      return isSimpleValue(freq) && isSimpleValue(ms) ? { type: 'g3k:playTone', freq, ms } : null
    }
    default:
      return null
  }
}

/** `const heroi = SZGameKit3D.spawn("m", x, y, z)` → g3k:spawnNamed;
 *  `const alvo = SZGameKit3D.nearest("m", ent)` → g3k:storeNearest. */
function tryMatchGameKit3DVarInit(name: string, init: Node, ctx: ParseCtx): JSStatement | null {
  const call = asSZGameKit3DCall(init)
  if (!call) return null
  const { method, args } = call
  if (method === 'spawn') {
    if (args[0]?.type !== 'StringLiteral') return null
    const x = toExpr(args[1], ctx)
    const y = toExpr(args[2], ctx)
    const z = toExpr(args[3], ctx)
    return isSimpleValue(x) && isSimpleValue(y) && isSimpleValue(z)
      ? { type: 'g3k:spawnNamed', varName: name, mold: args[0].value as string, x, y, z }
      : null
  }
  if (method === 'nearest') {
    if (args[0]?.type !== 'StringLiteral') return null
    const charVar = identifierName(args[1])
    return charVar
      ? { type: 'g3k:storeNearest', varName: name, mold: args[0].value as string, charVar }
      : null
  }
  if (method === 'pick') {
    if (args[0]?.type !== 'StringLiteral') return null
    return { type: 'g3k:pick', varName: name, mold: args[0].value as string }
  }
  return null
}

/**
 * SZGame3D.* como statement: setBackground/setCameraPosition/setPosition/setRotation/animate
 * e a física/kit (setVelocity/jump/applyGravity/controlWithKeys/setScale/cameraFollow/runEnemies/stop).
 * ANTES do método genérico — senão viram memberCall. As coordenadas (x/y/z/força/escala)
 * precisam ser valores representáveis; senão a linha cai em código avançado.
 */
function tryMatchGame3DCall(expr: Node, source: string, ctx: ParseCtx): JSStatement | null {
  const call = asSZGame3DCall(expr)
  if (!call) return null
  const { method, args } = call
  const isFn = (n: Node) =>
    n?.type === 'FunctionExpression' || n?.type === 'ArrowFunctionExpression'

  switch (method) {
    case 'setBackground': {
      // generator: SZGame3D.setBackground(world, "#cor")
      const worldVar = identifierName(args[0])
      if (!worldVar || args[1]?.type !== 'StringLiteral') return null
      return { type: 'g3d:setBackground', worldVar, color: args[1].value as string }
    }
    case 'setCameraPosition': {
      // generator: SZGame3D.setCameraPosition(world, x, y, z)
      const worldVar = identifierName(args[0])
      const x = toExpr(args[1], ctx)
      const y = toExpr(args[2], ctx)
      const z = toExpr(args[3], ctx)
      if (!worldVar || !isSimpleValue(x) || !isSimpleValue(y) || !isSimpleValue(z)) return null
      return { type: 'g3d:setCameraPosition', worldVar, x, y, z }
    }
    case 'setPosition': {
      // generator: SZGame3D.setPosition(obj, x, y, z)
      const objVar = identifierName(args[0])
      const x = toExpr(args[1], ctx)
      const y = toExpr(args[2], ctx)
      const z = toExpr(args[3], ctx)
      if (!objVar || !isSimpleValue(x) || !isSimpleValue(y) || !isSimpleValue(z)) return null
      return { type: 'g3d:setPosition', objVar, x, y, z }
    }
    case 'setRotation': {
      // generator: SZGame3D.setRotation(obj, x, y, z)
      const objVar = identifierName(args[0])
      const x = toExpr(args[1], ctx)
      const y = toExpr(args[2], ctx)
      const z = toExpr(args[3], ctx)
      if (!objVar || !isSimpleValue(x) || !isSimpleValue(y) || !isSimpleValue(z)) return null
      return { type: 'g3d:setRotation', objVar, x, y, z }
    }
    case 'animate': {
      // generator: SZGame3D.animate(world, () => {…})
      const worldVar = identifierName(args[0])
      if (!worldVar || !isFn(args[1])) return null
      return { type: 'g3d:animate', worldVar, body: bodyOfFn(args[1], source, ctx) }
    }
    case 'setVelocity': {
      // generator: SZGame3D.setVelocity(obj, x, y, z)
      const objVar = identifierName(args[0])
      const x = toExpr(args[1], ctx)
      const y = toExpr(args[2], ctx)
      const z = toExpr(args[3], ctx)
      if (!objVar || !isSimpleValue(x) || !isSimpleValue(y) || !isSimpleValue(z)) return null
      return { type: 'g3d:setVelocity', objVar, x, y, z }
    }
    case 'jump': {
      // generator: SZGame3D.jump(obj, force)
      const objVar = identifierName(args[0])
      const force = toExpr(args[1], ctx)
      if (!objVar || !isSimpleValue(force)) return null
      return { type: 'g3d:jump', objVar, force }
    }
    case 'setScale': {
      // generator: SZGame3D.setScale(obj, factor)
      const objVar = identifierName(args[0])
      const factor = toExpr(args[1], ctx)
      if (!objVar || !isSimpleValue(factor)) return null
      return { type: 'g3d:setScale', objVar, factor }
    }
    case 'applyGravity': {
      // generator: SZGame3D.applyGravity(obj, ground)
      const objVar = identifierName(args[0])
      const groundVar = identifierName(args[1])
      if (!objVar || !groundVar) return null
      return { type: 'g3d:applyGravity', objVar, groundVar }
    }
    case 'controlWithKeys': {
      // generator: SZGame3D.controlWithKeys(obj, speed)
      const objVar = identifierName(args[0])
      const speed = toExpr(args[1], ctx)
      if (!objVar || !isSimpleValue(speed)) return null
      return { type: 'g3d:controlWithKeys', objVar, speed }
    }
    case 'cameraFollow': {
      // generator: SZGame3D.cameraFollow(world, obj)
      const worldVar = identifierName(args[0])
      const objVar = identifierName(args[1])
      if (!worldVar || !objVar) return null
      return { type: 'g3d:cameraFollow', worldVar, objVar }
    }
    case 'runEnemies': {
      // generator: SZGame3D.runEnemies(world, group, ground, every, speed)
      const worldVar = identifierName(args[0])
      const groupVar = identifierName(args[1])
      const groundVar = identifierName(args[2])
      const every = toExpr(args[3], ctx)
      const speed = toExpr(args[4], ctx)
      if (!worldVar || !groupVar || !groundVar || !isSimpleValue(every) || !isSimpleValue(speed))
        return null
      return { type: 'g3d:runEnemies', worldVar, groupVar, groundVar, every, speed }
    }
    case 'stop': {
      // generator: SZGame3D.stop(world)
      const worldVar = identifierName(args[0])
      if (!worldVar) return null
      return { type: 'g3d:stop', worldVar }
    }
    case 'crosserMove': {
      const objVar = identifierName(args[0])
      if (!objVar || args[1]?.type !== 'StringLiteral') return null
      return { type: 'g3d:crosserMove', objVar, direction: args[1].value as string }
    }
    case 'gridMove': {
      const objVar = identifierName(args[0])
      if (!objVar || args[1]?.type !== 'StringLiteral') return null
      return { type: 'g3d:gridMove', objVar, direction: args[1].value as string }
    }
    case 'crosserStep': {
      const objVar = identifierName(args[0])
      const worldVar = identifierName(args[1])
      if (!objVar || !worldVar) return null
      return { type: 'g3d:crosserStep', objVar, worldVar }
    }
    case 'crosserReset': {
      const objVar = identifierName(args[0])
      const worldVar = identifierName(args[1])
      if (!objVar || !worldVar) return null
      return { type: 'g3d:crosserReset', objVar, worldVar }
    }
    case 'gridStep': {
      const objVar = identifierName(args[0])
      if (!objVar) return null
      return { type: 'g3d:gridStep', objVar }
    }
    case 'moveTraffic': {
      const worldVar = identifierName(args[0])
      if (!worldVar) return null
      return { type: 'g3d:moveTraffic', worldVar }
    }
    case 'generateRows': {
      const worldVar = identifierName(args[0])
      const count = toExpr(args[1], ctx)
      if (!worldVar || !isSimpleValue(count)) return null
      return { type: 'g3d:generateRows', worldVar, count }
    }
    case 'addRow': {
      // generator: SZGame3D.addRow(world, rowIndex, "kind", "dir", speed)
      const worldVar = identifierName(args[0])
      const rowIndex = toExpr(args[1], ctx)
      const speed = toExpr(args[4], ctx)
      if (
        !worldVar ||
        !isSimpleValue(rowIndex) ||
        args[2]?.type !== 'StringLiteral' ||
        args[3]?.type !== 'StringLiteral' ||
        !isSimpleValue(speed)
      )
        return null
      return {
        type: 'g3d:addRow',
        worldVar,
        rowIndex,
        kind: args[2].value as string,
        direction: args[3].value as string,
        speed,
      }
    }
    case 'isometricCamera': {
      // generator: SZGame3D.isometricCamera(world, followObj | null)
      const worldVar = identifierName(args[0])
      if (!worldVar) return null
      return { type: 'g3d:isometricCamera', worldVar, followVar: identifierName(args[1]) || '' }
    }
    case 'moveAcross': {
      // generator: SZGame3D.moveAcross(group, speed, min, max)
      const groupVar = identifierName(args[0])
      const speed = toExpr(args[1], ctx)
      const min = toExpr(args[2], ctx)
      const max = toExpr(args[3], ctx)
      if (!groupVar || !isSimpleValue(speed) || !isSimpleValue(min) || !isSimpleValue(max))
        return null
      return { type: 'g3d:moveAcross', groupVar, speed, min, max }
    }
    case 'gridPosition': {
      // generator: SZGame3D.gridPosition(obj, row, col)
      const objVar = identifierName(args[0])
      const row = toExpr(args[1], ctx)
      const col = toExpr(args[2], ctx)
      if (!objVar || !isSimpleValue(row) || !isSimpleValue(col)) return null
      return { type: 'g3d:gridPosition', objVar, row, col }
    }
    case 'topCamera': {
      // generator: SZGame3D.topCamera(world, followObj | null)
      const worldVar = identifierName(args[0])
      if (!worldVar) return null
      return { type: 'g3d:topCamera', worldVar, followVar: identifierName(args[1]) || '' }
    }
    case 'moveInCircle': {
      const objVar = identifierName(args[0])
      const radius = toExpr(args[1], ctx)
      const speed = toExpr(args[2], ctx)
      if (!objVar || !isSimpleValue(radius) || !isSimpleValue(speed)) return null
      return { type: 'g3d:moveInCircle', objVar, radius, speed }
    }
    case 'createRaceTrack': {
      const worldVar = identifierName(args[0])
      if (!worldVar) return null
      return { type: 'g3d:createRaceTrack', worldVar }
    }
    case 'raceStep': {
      const objVar = identifierName(args[0])
      const worldVar = identifierName(args[1])
      if (!objVar || !worldVar) return null
      return { type: 'g3d:raceStep', objVar, worldVar }
    }
    case 'raceControl': {
      const objVar = identifierName(args[0])
      if (!objVar || args[1]?.type !== 'StringLiteral') return null
      return { type: 'g3d:raceControl', objVar, mode: args[1].value as string }
    }
    case 'runRivals': {
      const worldVar = identifierName(args[0])
      if (!worldVar) return null
      return { type: 'g3d:runRivals', worldVar }
    }
    case 'raceReset': {
      const objVar = identifierName(args[0])
      const worldVar = identifierName(args[1])
      if (!objVar || !worldVar) return null
      return { type: 'g3d:raceReset', objVar, worldVar }
    }
    case 'fall': {
      const objVar = identifierName(args[0])
      if (!objVar) return null
      return { type: 'g3d:fall', objVar }
    }
    case 'slideBetween': {
      // generator: SZGame3D.slideBetween(obj, "x", min, max, speed)
      const objVar = identifierName(args[0])
      const min = toExpr(args[2], ctx)
      const max = toExpr(args[3], ctx)
      const speed = toExpr(args[4], ctx)
      if (
        !objVar ||
        args[1]?.type !== 'StringLiteral' ||
        !isSimpleValue(min) ||
        !isSimpleValue(max) ||
        !isSimpleValue(speed)
      )
        return null
      return { type: 'g3d:slideBetween', objVar, axis: args[1].value as string, min, max, speed }
    }
    case 'spin': {
      // generator: SZGame3D.spin(obj, "y", speed)
      const objVar = identifierName(args[0])
      const speed = toExpr(args[2], ctx)
      if (!objVar || args[1]?.type !== 'StringLiteral' || !isSimpleValue(speed)) return null
      return { type: 'g3d:spin', objVar, axis: args[1].value as string, speed }
    }
    case 'createStackTower': {
      const worldVar = identifierName(args[0])
      if (!worldVar) return null
      return { type: 'g3d:createStackTower', worldVar }
    }
    case 'stackDrop': {
      const worldVar = identifierName(args[0])
      if (!worldVar) return null
      return { type: 'g3d:stackDrop', worldVar }
    }
    case 'stackStep': {
      const worldVar = identifierName(args[0])
      if (!worldVar) return null
      return { type: 'g3d:stackStep', worldVar }
    }
    case 'stackReset': {
      const worldVar = identifierName(args[0])
      if (!worldVar) return null
      return { type: 'g3d:stackReset', worldVar }
    }
    case 'moveBy': {
      // generator: SZGame3D.moveBy(obj, x, y, z)
      const objVar = identifierName(args[0])
      const x = toExpr(args[1], ctx)
      const y = toExpr(args[2], ctx)
      const z = toExpr(args[3], ctx)
      if (!objVar || !isSimpleValue(x) || !isSimpleValue(y) || !isSimpleValue(z)) return null
      return { type: 'g3d:moveBy', objVar, x, y, z }
    }
    case 'rotateBy': {
      // generator: SZGame3D.rotateBy(obj, "y", amount)
      const objVar = identifierName(args[0])
      const amount = toExpr(args[2], ctx)
      if (!objVar || args[1]?.type !== 'StringLiteral' || !isSimpleValue(amount)) return null
      return { type: 'g3d:rotateBy', objVar, axis: args[1].value as string, amount }
    }
    case 'moveTowards': {
      // generator: SZGame3D.moveTowards(obj, x, y, z, factor)
      const objVar = identifierName(args[0])
      const x = toExpr(args[1], ctx)
      const y = toExpr(args[2], ctx)
      const z = toExpr(args[3], ctx)
      const factor = toExpr(args[4], ctx)
      if (
        !objVar ||
        !isSimpleValue(x) ||
        !isSimpleValue(y) ||
        !isSimpleValue(z) ||
        !isSimpleValue(factor)
      )
        return null
      return { type: 'g3d:moveTowards', objVar, x, y, z, factor }
    }
    case 'lookAtObject': {
      const aVar = identifierName(args[0])
      const bVar = identifierName(args[1])
      if (!aVar || !bVar) return null
      return { type: 'g3d:lookAtObject', aVar, bVar }
    }
    case 'lookAtPoint': {
      // generator: SZGame3D.lookAtPoint(obj, x, y, z)
      const objVar = identifierName(args[0])
      const x = toExpr(args[1], ctx)
      const y = toExpr(args[2], ctx)
      const z = toExpr(args[3], ctx)
      if (!objVar || !isSimpleValue(x) || !isSimpleValue(y) || !isSimpleValue(z)) return null
      return { type: 'g3d:lookAtPoint', objVar, x, y, z }
    }
    case 'moveForward': {
      const objVar = identifierName(args[0])
      const dist = toExpr(args[1], ctx)
      if (!objVar || !isSimpleValue(dist)) return null
      return { type: 'g3d:moveForward', objVar, dist }
    }
    case 'faceVelocity': {
      const objVar = identifierName(args[0])
      if (!objVar) return null
      return { type: 'g3d:faceVelocity', objVar }
    }
    case 'body': {
      const objVar = identifierName(args[0])
      const gravity = toExpr(args[1], ctx)
      if (!objVar || !isSimpleValue(gravity)) return null
      return { type: 'g3d:body', objVar, gravity }
    }
    case 'stepBody': {
      const objVar = identifierName(args[0])
      const worldVar = identifierName(args[1])
      if (!objVar || !worldVar) return null
      return { type: 'g3d:stepBody', objVar, worldVar }
    }
    case 'setSolid': {
      const objVar = identifierName(args[0])
      if (!objVar) return null
      return { type: 'g3d:setSolid', objVar }
    }
    case 'platformerControls': {
      const objVar = identifierName(args[0])
      const worldVar = identifierName(args[1])
      const speed = toExpr(args[2], ctx)
      const jump = toExpr(args[3], ctx)
      if (!objVar || !worldVar || !isSimpleValue(speed) || !isSimpleValue(jump)) return null
      return { type: 'g3d:platformerControls', objVar, worldVar, speed, jump }
    }
    case 'fpsControls': {
      const objVar = identifierName(args[0])
      const worldVar = identifierName(args[1])
      const speed = toExpr(args[2], ctx)
      if (!objVar || !worldVar || !isSimpleValue(speed)) return null
      return { type: 'g3d:fpsControls', objVar, worldVar, speed }
    }
    case 'resolveCollision': {
      const aVar = identifierName(args[0])
      const bVar = identifierName(args[1])
      if (!aVar || !bVar) return null
      return { type: 'g3d:resolveCollision', aVar, bVar }
    }
    case 'fpsCamera': {
      const worldVar = identifierName(args[0])
      const objVar = identifierName(args[1])
      if (!worldVar || !objVar) return null
      return { type: 'g3d:fpsCamera', worldVar, objVar }
    }
    case 'orbitCamera': {
      const worldVar = identifierName(args[0])
      const objVar = identifierName(args[1])
      if (!worldVar || !objVar) return null
      return { type: 'g3d:orbitCamera', worldVar, objVar }
    }
    case 'thirdPersonCamera': {
      const worldVar = identifierName(args[0])
      const objVar = identifierName(args[1])
      const dist = toExpr(args[2], ctx)
      const height = toExpr(args[3], ctx)
      if (!worldVar || !objVar || !isSimpleValue(dist) || !isSimpleValue(height)) return null
      return { type: 'g3d:thirdPersonCamera', worldVar, objVar, dist, height }
    }
    case 'cameraLookAt': {
      const worldVar = identifierName(args[0])
      const objVar = identifierName(args[1])
      if (!worldVar || !objVar) return null
      return { type: 'g3d:cameraLookAt', worldVar, objVar }
    }
    case 'setFOV': {
      const worldVar = identifierName(args[0])
      const deg = toExpr(args[1], ctx)
      if (!worldVar || !isSimpleValue(deg)) return null
      return { type: 'g3d:setFOV', worldVar, deg }
    }
    case 'setColor': {
      const objVar = identifierName(args[0])
      if (!objVar || args[1]?.type !== 'StringLiteral') return null
      return { type: 'g3d:setColor', objVar, color: args[1].value as string }
    }
    case 'setOpacity': {
      const objVar = identifierName(args[0])
      const opacity = toExpr(args[1], ctx)
      if (!objVar || !isSimpleValue(opacity)) return null
      return { type: 'g3d:setOpacity', objVar, opacity }
    }
    case 'setMaterial': {
      const objVar = identifierName(args[0])
      if (!objVar || args[1]?.type !== 'StringLiteral') return null
      return { type: 'g3d:setMaterial', objVar, kind: args[1].value as string }
    }
    case 'setTexture': {
      const objVar = identifierName(args[0])
      if (!objVar || args[1]?.type !== 'StringLiteral') return null
      return { type: 'g3d:setTexture', objVar, asset: args[1].value as string }
    }
    case 'setVisible': {
      const objVar = identifierName(args[0])
      if (!objVar || args[1]?.type !== 'StringLiteral') return null
      return { type: 'g3d:setVisible', objVar, mode: args[1].value as string }
    }
    case 'remove': {
      const worldVar = identifierName(args[0])
      const objVar = identifierName(args[1])
      if (!worldVar || !objVar) return null
      return { type: 'g3d:removeObject', worldVar, objVar }
    }
    case 'addToModel': {
      const modelVar = identifierName(args[0])
      const partVar = identifierName(args[1])
      if (!modelVar || !partVar) return null
      return { type: 'g3d:addToModel', modelVar, partVar }
    }
    case 'addAmbientLight':
    case 'addSunLight': {
      const worldVar = identifierName(args[0])
      const intensity = toExpr(args[2], ctx)
      if (!worldVar || args[1]?.type !== 'StringLiteral' || !isSimpleValue(intensity)) return null
      return {
        type: method === 'addAmbientLight' ? 'g3d:addAmbientLight' : 'g3d:addSunLight',
        worldVar,
        color: args[1].value as string,
        intensity,
      }
    }
    case 'addPointLight': {
      const worldVar = identifierName(args[0])
      const intensity = toExpr(args[2], ctx)
      const x = toExpr(args[3], ctx)
      const y = toExpr(args[4], ctx)
      const z = toExpr(args[5], ctx)
      if (
        !worldVar ||
        args[1]?.type !== 'StringLiteral' ||
        !isSimpleValue(intensity) ||
        !isSimpleValue(x) ||
        !isSimpleValue(y) ||
        !isSimpleValue(z)
      )
        return null
      return {
        type: 'g3d:addPointLight',
        worldVar,
        color: args[1].value as string,
        intensity,
        x,
        y,
        z,
      }
    }
    case 'setFog': {
      const worldVar = identifierName(args[0])
      const near = toExpr(args[2], ctx)
      const far = toExpr(args[3], ctx)
      if (
        !worldVar ||
        args[1]?.type !== 'StringLiteral' ||
        !isSimpleValue(near) ||
        !isSimpleValue(far)
      )
        return null
      return { type: 'g3d:setFog', worldVar, color: args[1].value as string, near, far }
    }
    case 'setSky': {
      const worldVar = identifierName(args[0])
      if (!worldVar || args[1]?.type !== 'StringLiteral' || args[2]?.type !== 'StringLiteral')
        return null
      return {
        type: 'g3d:setSky',
        worldVar,
        top: args[1].value as string,
        bottom: args[2].value as string,
      }
    }
    case 'setShadows': {
      const worldVar = identifierName(args[0])
      if (!worldVar || args[1]?.type !== 'StringLiteral') return null
      return { type: 'g3d:setShadows', worldVar, mode: args[1].value as string }
    }
    case 'spawnInSwarm': {
      const swarmVar = identifierName(args[0])
      const originalVar = identifierName(args[1])
      const x = toExpr(args[2], ctx)
      const y = toExpr(args[3], ctx)
      const z = toExpr(args[4], ctx)
      if (!swarmVar || !originalVar || !isSimpleValue(x) || !isSimpleValue(y) || !isSimpleValue(z))
        return null
      return { type: 'g3d:spawnInSwarm', swarmVar, originalVar, x, y, z }
    }
    case 'forEachInSwarm': {
      const swarmVar = identifierName(args[0])
      const cb = args[1]
      if (!swarmVar || !isFn(cb)) return null
      const params = cb.params ?? []
      if (params.length !== 1 || params[0]?.type !== 'Identifier') return null
      return {
        type: 'g3d:forEachInSwarm',
        swarmVar,
        itemName: params[0].name as string,
        body: bodyOfFn(cb, source, ctx),
      }
    }
    case 'removeFromSwarm': {
      const swarmVar = identifierName(args[0])
      const itemVar = identifierName(args[1])
      if (!swarmVar || !itemVar) return null
      return { type: 'g3d:removeFromSwarm', swarmVar, itemVar }
    }
    case 'pruneSwarm': {
      const swarmVar = identifierName(args[0])
      const min = toExpr(args[2], ctx)
      const max = toExpr(args[3], ctx)
      if (
        !swarmVar ||
        args[1]?.type !== 'StringLiteral' ||
        !isSimpleValue(min) ||
        !isSimpleValue(max)
      )
        return null
      return { type: 'g3d:pruneSwarm', swarmVar, axis: args[1].value as string, min, max }
    }
    case 'playNote': {
      const freq = toExpr(args[0], ctx)
      const ms = toExpr(args[1], ctx)
      if (!isSimpleValue(freq) || !isSimpleValue(ms)) return null
      return { type: 'g3d:playNote', freq, ms }
    }
    case 'playEffect': {
      if (args[0]?.type !== 'StringLiteral') return null
      return { type: 'g3d:playEffect', kind: args[0].value as string }
    }
    default:
      // createScene/createBox/createSphere/createBlock/createGroup são var-init
      // (tryMatchGame3DVarInit); como chamada solta caem no método genérico.
      return null
  }
}

/** `const x = SZGame3D.createScene("id") | createBox(world,{…}) | createSphere(world,{…})`. */
function tryMatchGame3DVarInit(name: string, init: Node, ctx: ParseCtx): JSStatement | null {
  const call = asSZGame3DCall(init)
  if (!call) return null
  const { method, args } = call
  if (method === 'createScene') {
    if (args[0]?.type !== 'StringLiteral') return null
    return { type: 'g3d:createScene', canvasId: args[0].value as string, varName: name }
  }
  if (method === 'createFullscreenScene') {
    // Argumento de cor opcional: código antigo sem cor cai no padrão.
    const bg = args[0]?.type === 'StringLiteral' ? (args[0].value as string) : '#0b1020'
    return { type: 'g3d:createFullscreenScene', varName: name, bg }
  }
  if (method === 'createBox') {
    const worldVar = identifierName(args[0])
    if (!worldVar || args[1]?.type !== 'ObjectExpression') return null
    const box = readBoxOptions(args[1], ctx)
    if (!box) return null
    return { type: 'g3d:createBox', varName: name, worldVar, ...box }
  }
  if (method === 'createSphere') {
    const worldVar = identifierName(args[0])
    if (!worldVar || args[1]?.type !== 'ObjectExpression') return null
    const sphere = readSphereOptions(args[1], ctx)
    if (!sphere) return null
    return { type: 'g3d:createSphere', varName: name, worldVar, ...sphere }
  }
  if (method === 'createBlock') {
    const worldVar = identifierName(args[0])
    if (!worldVar || args[1]?.type !== 'ObjectExpression') return null
    const b = readBlockOptions(args[1], ctx)
    if (!b) return null
    return { type: 'g3d:createBlock', varName: name, worldVar, ...b }
  }
  if (method === 'createGroup') {
    // generator: const inimigos = SZGame3D.createGroup()
    return { type: 'g3d:createGroup', varName: name }
  }
  if (method === 'createCrossingScene') {
    if (args[0]?.type !== 'StringLiteral') return null
    return { type: 'g3d:createCrossingScene', canvasId: args[0].value as string, varName: name }
  }
  if (method === 'createCrosser') {
    // generator: const P = SZGame3D.createCrosser(world, { color: "#fff" })
    const worldVar = identifierName(args[0])
    if (!worldVar || args[1]?.type !== 'ObjectExpression') return null
    let color = '#ffffff'
    for (const prop of args[1].properties ?? []) {
      if (prop?.type !== 'ObjectProperty' || prop.computed) return null
      const key =
        prop.key?.type === 'Identifier'
          ? (prop.key.name as string)
          : prop.key?.type === 'StringLiteral'
            ? (prop.key.value as string)
            : null
      if (key === 'color') {
        if (prop.value?.type !== 'StringLiteral') return null
        color = prop.value.value as string
      } else {
        return null
      }
    }
    return { type: 'g3d:createCrosser', varName: name, worldVar, color }
  }
  if (method === 'createRaceScene') {
    if (args[0]?.type !== 'StringLiteral') return null
    return { type: 'g3d:createRaceScene', canvasId: args[0].value as string, varName: name }
  }
  if (method === 'createRaceCar') {
    // generator: const C = SZGame3D.createRaceCar(world, { color: "#fff" })
    const worldVar = identifierName(args[0])
    if (!worldVar || args[1]?.type !== 'ObjectExpression') return null
    let color = '#ffffff'
    for (const prop of args[1].properties ?? []) {
      if (prop?.type !== 'ObjectProperty' || prop.computed) return null
      const key =
        prop.key?.type === 'Identifier'
          ? (prop.key.name as string)
          : prop.key?.type === 'StringLiteral'
            ? (prop.key.value as string)
            : null
      if (key === 'color') {
        if (prop.value?.type !== 'StringLiteral') return null
        color = prop.value.value as string
      } else {
        return null
      }
    }
    return { type: 'g3d:createRaceCar', varName: name, worldVar, color }
  }
  if (method === 'createStackScene') {
    if (args[0]?.type !== 'StringLiteral') return null
    return { type: 'g3d:createStackScene', canvasId: args[0].value as string, varName: name }
  }
  if (method === 'createCylinder' || method === 'createCone') {
    const worldVar = identifierName(args[0])
    if (!worldVar || args[1]?.type !== 'ObjectExpression') return null
    const o = readShapeOpts(args[1], ['radius', 'height'], ctx)
    if (!o) return null
    return {
      type: method === 'createCylinder' ? 'g3d:createCylinder' : 'g3d:createCone',
      varName: name,
      worldVar,
      radius: o.radius as JSExpr,
      height: o.height as JSExpr,
      color: o.color as string,
    }
  }
  if (method === 'createPlane') {
    const worldVar = identifierName(args[0])
    if (!worldVar || args[1]?.type !== 'ObjectExpression') return null
    const o = readShapeOpts(args[1], ['width', 'depth'], ctx)
    if (!o) return null
    return {
      type: 'g3d:createPlane',
      varName: name,
      worldVar,
      width: o.width as JSExpr,
      depth: o.depth as JSExpr,
      color: o.color as string,
    }
  }
  if (method === 'createTorus') {
    const worldVar = identifierName(args[0])
    if (!worldVar || args[1]?.type !== 'ObjectExpression') return null
    const o = readShapeOpts(args[1], ['radius', 'tube'], ctx)
    if (!o) return null
    return {
      type: 'g3d:createTorus',
      varName: name,
      worldVar,
      radius: o.radius as JSExpr,
      tube: o.tube as JSExpr,
      color: o.color as string,
    }
  }
  if (method === 'createModel') {
    const worldVar = identifierName(args[0])
    if (!worldVar) return null
    return { type: 'g3d:createModel', varName: name, worldVar }
  }
  if (method === 'createSwarm') {
    const worldVar = identifierName(args[0])
    if (!worldVar) return null
    return { type: 'g3d:createSwarm', varName: name, worldVar }
  }
  return null
}

/** SZGame3D.keyDown("…") / collides(a, b) / hitAny(obj, group) em posição de VALOR (booleano). */
function matchGame3DExpr(node: Node, ctx?: ParseCtx): JSExpr | null {
  const call = asSZGame3DCall(node)
  if (!call) return null
  const { method, args } = call
  if (method === 'keyDown' && args[0]?.type === 'StringLiteral') {
    return { type: 'g3d:keyDown', key: args[0].value as string }
  }
  if (method === 'collides') {
    const aVar = identifierName(args[0])
    const bVar = identifierName(args[1])
    if (aVar && bVar) return { type: 'g3d:collides', aVar, bVar }
  }
  if (method === 'hitAny') {
    const objVar = identifierName(args[0])
    const groupVar = identifierName(args[1])
    if (objVar && groupVar) return { type: 'g3d:hitAny', objVar, groupVar }
  }
  if (method === 'touchesBox') {
    const objVar = identifierName(args[0])
    const groupVar = identifierName(args[1])
    if (objVar && groupVar) return { type: 'g3d:touchesBox', objVar, groupVar }
  }
  if (method === 'crosserHit') {
    const objVar = identifierName(args[0])
    const worldVar = identifierName(args[1])
    if (objVar && worldVar) return { type: 'g3d:crosserHit', objVar, worldVar }
  }
  if (method === 'crosserRow') {
    const objVar = identifierName(args[0])
    if (objVar) return { type: 'g3d:crosserRow', objVar }
  }
  if (method === 'distanceTo') {
    const aVar = identifierName(args[0])
    const bVar = identifierName(args[1])
    if (aVar && bVar) return { type: 'g3d:distanceTo', aVar, bVar }
  }
  if (method === 'isNear') {
    const aVar = identifierName(args[0])
    const bVar = identifierName(args[1])
    const dist = toExpr(args[2], ctx)
    if (aVar && bVar && isSimpleValue(dist)) return { type: 'g3d:isNear', aVar, bVar, dist }
  }
  if (method === 'raceHit') {
    const objVar = identifierName(args[0])
    const worldVar = identifierName(args[1])
    if (objVar && worldVar) return { type: 'g3d:raceHit', objVar, worldVar }
  }
  if (method === 'raceLaps') {
    const objVar = identifierName(args[0])
    if (objVar) return { type: 'g3d:raceLaps', objVar }
  }
  if (method === 'stackScore') {
    const worldVar = identifierName(args[0])
    if (worldVar) return { type: 'g3d:stackScore', worldVar }
  }
  if (method === 'stackGameOver') {
    const worldVar = identifierName(args[0])
    if (worldVar) return { type: 'g3d:stackGameOver', worldVar }
  }
  if (method === 'getPos') {
    const objVar = identifierName(args[0])
    if (objVar && args[1]?.type === 'StringLiteral') {
      return { type: 'g3d:getPos', objVar, axis: args[1].value as string }
    }
  }
  if (method === 'getRot') {
    const objVar = identifierName(args[0])
    if (objVar && args[1]?.type === 'StringLiteral') {
      return { type: 'g3d:getRot', objVar, axis: args[1].value as string }
    }
  }
  if (method === 'getScale') {
    const objVar = identifierName(args[0])
    if (objVar) return { type: 'g3d:getScale', objVar }
  }
  if (method === 'getVel') {
    const objVar = identifierName(args[0])
    if (objVar && args[1]?.type === 'StringLiteral') {
      return { type: 'g3d:getVel', objVar, axis: args[1].value as string }
    }
  }
  if (method === 'getSpeed') {
    const objVar = identifierName(args[0])
    if (objVar) return { type: 'g3d:getSpeed', objVar }
  }
  if (method === 'isMoving') {
    const objVar = identifierName(args[0])
    if (objVar) return { type: 'g3d:isMoving', objVar }
  }
  if (method === 'dt') {
    const worldVar = identifierName(args[0])
    if (worldVar) return { type: 'g3d:dt', worldVar }
  }
  if (method === 'angleTo') {
    const aVar = identifierName(args[0])
    const bVar = identifierName(args[1])
    if (aVar && bVar) return { type: 'g3d:angleTo', aVar, bVar }
  }
  if (method === 'pickAtMouse') {
    const worldVar = identifierName(args[0])
    if (worldVar) return { type: 'g3d:pickAtMouse', worldVar }
  }
  if (method === 'pointerOver') {
    const worldVar = identifierName(args[0])
    const objVar = identifierName(args[1])
    if (worldVar && objVar) return { type: 'g3d:pointerOver', worldVar, objVar }
  }
  if (method === 'aimAhead') {
    const worldVar = identifierName(args[0])
    const objVar = identifierName(args[1])
    const dist = toExpr(args[2], ctx)
    if (worldVar && objVar && isSimpleValue(dist))
      return { type: 'g3d:aimAhead', worldVar, objVar, dist }
  }
  if (method === 'onGround') {
    const worldVar = identifierName(args[0])
    const objVar = identifierName(args[1])
    if (worldVar && objVar) return { type: 'g3d:onGround', worldVar, objVar }
  }
  if (method === 'groundHeight') {
    const worldVar = identifierName(args[0])
    const objVar = identifierName(args[1])
    if (worldVar && objVar) return { type: 'g3d:groundHeight', worldVar, objVar }
  }
  return null
}

// ---------- canvas: matchers de chamada ----------

interface CtxCall {
  ctxVar: string
  method: string
  args: Node[]
}

/**
 * Reconhece `<ctx conhecido>.<método>(...)` (chamada normal ou optional) e
 * devolve o ctx, o nome do método e os argumentos; senão `null`. É o *guard*
 * central dos blocos de canvas: só casa quando o objeto é um contexto 2D
 * registrado em `ctx.ctxVars`.
 */
function matchCtxCall(expr: Node, ctx: ParseCtx): CtxCall | null {
  if (!expr || (expr.type !== 'CallExpression' && expr.type !== 'OptionalCallExpression')) {
    return null
  }
  const callee = expr.callee
  if (
    !callee ||
    (callee.type !== 'MemberExpression' && callee.type !== 'OptionalMemberExpression')
  ) {
    return null
  }
  if (callee.object?.type !== 'Identifier' || !ctx.ctxVars.has(callee.object.name)) return null
  const method = callee.property?.name
  if (typeof method !== 'string') return null
  return { ctxVar: callee.object.name, method, args: expr.arguments ?? [] }
}

/** `node` (ExpressionStatement) é uma chamada `<ctx>.<method>(...)`? */
function matchCtxCallNode(node: Node, ctx: ParseCtx, method: string): CtxCall | null {
  if (node?.type !== 'ExpressionStatement') return null
  const call = matchCtxCall(node.expression, ctx)
  return call && call.method === method ? call : null
}

/** Nome do objeto em `<Identifier>.<prop>` (membro normal ou optional); senão `null`. */
function memberObjName(node: Node, prop: string): string | null {
  if (!node || (node.type !== 'MemberExpression' && node.type !== 'OptionalMemberExpression')) {
    return null
  }
  if (node.property?.name !== prop) return null
  if (node.object?.type !== 'Identifier') return null
  return node.object.name as string
}

/** Métodos de canvas que viram um statement de uma única linha. */
function tryMatchCanvasCall(expr: Node, ctx: ParseCtx): JSStatement | null {
  const call = matchCtxCall(expr, ctx)
  if (!call) return null
  const { ctxVar, method, args } = call
  switch (method) {
    case 'fillRect': {
      const [x, y, w, h] = mapArgs(args, 4, ctx)
      return x && y && w && h ? { type: 'canvasFillRect', ctxVar, x, y, w, h } : null
    }
    case 'fillText': {
      const [text, x, y] = mapArgs(args, 3, ctx)
      return text && x && y ? { type: 'canvasFillText', ctxVar, text, x, y } : null
    }
    case 'clearRect': {
      // ctx.clearRect(0, 0, <canvas>.width, <canvas>.height) → limpar a tela inteira
      const canvasVar = matchClearRectArgs(args)
      if (canvasVar) return { type: 'canvasClear', ctxVar, canvasVar }
      // clearRect com coordenadas quaisquer → limpar uma área
      const [crx, cry, crw, crh] = mapArgs(args, 4, ctx)
      return crx && cry && crw && crh
        ? { type: 'canvasClearRect', ctxVar, x: crx, y: cry, w: crw, h: crh }
        : null
    }
    case 'save':
      return args.length === 0 ? { type: 'canvasSave', ctxVar } : null
    case 'restore':
      return args.length === 0 ? { type: 'canvasRestore', ctxVar } : null
    case 'rect': {
      const [x, y, w, h] = mapArgs(args, 4, ctx)
      return x && y && w && h ? { type: 'canvasRect', ctxVar, x, y, w, h } : null
    }
    case 'clip':
      return args.length === 0 ? { type: 'canvasClip', ctxVar } : null
    case 'translate': {
      const [x, y] = mapArgs(args, 2, ctx)
      return x && y ? { type: 'canvasTranslate', ctxVar, x, y } : null
    }
    case 'rotate': {
      const [angle] = mapArgs(args, 1, ctx)
      return angle ? { type: 'canvasRotate', ctxVar, angle } : null
    }
    case 'scale': {
      const [sx, sy] = mapArgs(args, 2, ctx)
      return sx && sy ? { type: 'canvasScale', ctxVar, sx, sy } : null
    }
    case 'beginPath':
      return args.length === 0 ? { type: 'canvasBeginPath', ctxVar } : null
    case 'closePath':
      return args.length === 0 ? { type: 'canvasClosePath', ctxVar } : null
    case 'stroke':
      return args.length === 0 ? { type: 'canvasStroke', ctxVar } : null
    case 'fill':
      return args.length === 0 ? { type: 'canvasFill', ctxVar } : null
    case 'moveTo': {
      const [x, y] = mapArgs(args, 2, ctx)
      return x && y ? { type: 'canvasMoveTo', ctxVar, x, y } : null
    }
    case 'lineTo': {
      const [x, y] = mapArgs(args, 2, ctx)
      return x && y ? { type: 'canvasLineTo', ctxVar, x, y } : null
    }
    case 'strokeRect': {
      const [x, y, w, h] = mapArgs(args, 4, ctx)
      return x && y && w && h ? { type: 'canvasStrokeRect', ctxVar, x, y, w, h } : null
    }
    case 'quadraticCurveTo': {
      const [cpx, cpy, x, y] = mapArgs(args, 4, ctx)
      return cpx && cpy && x && y ? { type: 'canvasQuadraticCurve', ctxVar, cpx, cpy, x, y } : null
    }
    case 'bezierCurveTo': {
      const [cp1x, cp1y, cp2x, cp2y, x, y] = mapArgs(args, 6, ctx)
      return cp1x && cp1y && cp2x && cp2y && x && y
        ? { type: 'canvasBezierCurve', ctxVar, cp1x, cp1y, cp2x, cp2y, x, y }
        : null
    }
    case 'arcTo': {
      const [x1, y1, x2, y2, r] = mapArgs(args, 5, ctx)
      return x1 && y1 && x2 && y2 && r ? { type: 'canvasArcTo', ctxVar, x1, y1, x2, y2, r } : null
    }
    case 'strokeText': {
      const [text, x, y] = mapArgs(args, 3, ctx)
      return text && x && y ? { type: 'canvasStrokeText', ctxVar, text, x, y } : null
    }
    case 'setLineDash': {
      // Só funde um traço UNIFORME (`[seg]` — exatamente o que o gerador re-emite).
      // Um padrão não-uniforme (`[5, 10]`, traço≠espaço) não tem bloco e perderia
      // tudo menos o 1º valor; então fica como rawJS.
      if (
        args.length !== 1 ||
        args[0]?.type !== 'ArrayExpression' ||
        args[0].elements?.length !== 1
      ) {
        return null
      }
      const seg = toExpr(args[0].elements?.[0], ctx)
      return seg ? { type: 'canvasLineDash', ctxVar, segment: seg } : null
    }
    default:
      return null
  }
}

/**
 * Converte exatamente `count` argumentos via `toExpr`; devolve `[]` se a aridade
 * não bate. Repassar `ctx` é essencial: sem ele, `canvas.width`/`canvas.height`
 * dentro de `ctx.fillRect(...)` não reconhecem o elemento canvas (que mora em
 * `ctx.elementToCtx`) e caem no `memberGet` genérico em vez de `canvasDim`.
 */
function mapArgs(args: Node[], count: number, ctx?: ParseCtx): (JSExpr | null)[] {
  if (args.length !== count) return new Array(count).fill(null)
  return args.map((a) => toExpr(a, ctx))
}

/** `(0, 0, <canvas>.width, <canvas>.height)` → nome do `<canvas>`; senão `null`. */
function matchClearRectArgs(args: Node[]): string | null {
  if (args.length !== 4) return null
  if (args[0]?.type !== 'NumericLiteral' || args[0].value !== 0) return null
  if (args[1]?.type !== 'NumericLiteral' || args[1].value !== 0) return null
  const w = memberObjName(args[2], 'width')
  const h = memberObjName(args[3], 'height')
  return w && h && w === h ? w : null
}

/**
 * Reconhece o bloco gerado por `canvasDrawImage`:
 * `{ const img = new Image(); img.src = "..."; img.onload = () => ctx.drawImage(img, x, y, w, h); }`.
 */
function tryMatchDrawImage(block: Node, ctx: ParseCtx): JSStatement | null {
  const body = block?.body
  if (!Array.isArray(body) || body.length !== 3) return null

  // 1) const img = new Image();
  const decl = body[0]
  if (decl?.type !== 'VariableDeclaration' || decl.declarations?.length !== 1) return null
  const id = decl.declarations[0]?.id
  const init = decl.declarations[0]?.init
  if (id?.type !== 'Identifier') return null
  if (init?.type !== 'NewExpression' || init.callee?.name !== 'Image') return null
  const img = id.name

  // 2) img.src = "...";
  const srcStmt = body[1]
  if (srcStmt?.type !== 'ExpressionStatement') return null
  const srcAssign = srcStmt.expression
  if (srcAssign?.type !== 'AssignmentExpression' || srcAssign.operator !== '=') return null
  if (memberObjName(srcAssign.left, 'src') !== img) return null
  // src direto (URL/dataUrl) OU resolução de asset `__SZGAME_ASSETS?.["nome"] ?? "nome"`.
  const srcRight = srcAssign.right
  let src: string | null = null
  if (srcRight?.type === 'StringLiteral') src = srcRight.value as string
  else if (srcRight?.type === 'LogicalExpression' && srcRight.right?.type === 'StringLiteral')
    src = srcRight.right.value as string
  if (src === null) return null

  // 3) img.onload = () => ctx.drawImage(img, x, y, w, h);
  const onloadStmt = body[2]
  if (onloadStmt?.type !== 'ExpressionStatement') return null
  const onloadAssign = onloadStmt.expression
  if (onloadAssign?.type !== 'AssignmentExpression' || onloadAssign.operator !== '=') return null
  if (memberObjName(onloadAssign.left, 'onload') !== img) return null
  const fn = onloadAssign.right
  if (fn?.type !== 'ArrowFunctionExpression' && fn?.type !== 'FunctionExpression') return null
  let drawCall = fn.body
  if (drawCall?.type === 'BlockStatement') {
    if (drawCall.body?.length !== 1 || drawCall.body[0]?.type !== 'ExpressionStatement') return null
    drawCall = drawCall.body[0].expression
  }
  const draw = matchCtxCall(drawCall, ctx)
  if (draw?.method !== 'drawImage') return null
  if (draw.args.length !== 5) return null
  if (draw.args[0]?.type !== 'Identifier' || draw.args[0].name !== img) return null
  const [x, y, w, h] = mapArgs(draw.args.slice(1), 4, ctx)
  if (!x || !y || !w || !h) return null
  return { type: 'canvasDrawImage', ctxVar: draw.ctxVar, src, x, y, w, h }
}

// ---------- canvas: matchers de fusão (vários statements → 1 IR) ----------

/** Resultado de um matcher de fusão: a IR e quantos nós ela consumiu. */
interface FusedStatement {
  stmt: JSStatement
  consumed: number
}

/**
 * `const v = new Image(); v.src = <valor>;` → bloco `newImage` ("criar imagem [v]
 * com fonte [valor]"). Só o PAR isolado (sem `onload`/`drawImage` — esse é o
 * `tryMatchDrawImage`, num bloco `{}`). A fonte pode ser qualquer valor simples
 * (string, `this.toLoad[key]`, bloco de imagem do projeto…). `new Image()` fica
 * FORA do `newInstance` de propósito (ver o cascade de `mapDeclarator`).
 */
function tryFuseNewImage(nodes: Node[], i: number, ctx: ParseCtx): FusedStatement | null {
  const decl = nodes[i]
  if (decl?.type !== 'VariableDeclaration' || decl.declarations?.length !== 1) return null
  const d0 = decl.declarations[0]
  if (d0?.id?.type !== 'Identifier') return null
  const init = d0.init
  if (init?.type !== 'NewExpression' || init.callee?.name !== 'Image') return null
  if ((init.arguments?.length ?? 0) !== 0) return null
  const varName = d0.id.name

  const srcStmt = nodes[i + 1]
  if (srcStmt?.type !== 'ExpressionStatement') return null
  const assign = srcStmt.expression
  if (assign?.type !== 'AssignmentExpression' || assign.operator !== '=') return null
  if (memberObjName(assign.left, 'src') !== varName) return null
  const src = toExpr(assign.right, ctx)
  if (!src || !isSimpleValue(src)) return null

  return { stmt: { type: 'newImage', varName, src }, consumed: 2 }
}

/** `<canvas>.width = W;` (ou `height`) onde `<canvas>` é um elemento conhecido. */
function matchCanvasDimAssign(
  node: Node,
  ctx: ParseCtx,
  dim: 'width' | 'height',
): { canvasVar: string; value: JSExpr } | null {
  if (node?.type !== 'ExpressionStatement') return null
  const expr = node.expression
  if (expr?.type !== 'AssignmentExpression' || expr.operator !== '=') return null
  const canvasVar = memberObjName(expr.left, dim)
  if (!canvasVar || !ctx.elementToCtx.has(canvasVar)) return null
  const value = toExpr(expr.right)
  return value ? { canvasVar, value } : null
}

/** `canvas.width = W;` seguido de `canvas.height = H;` → `canvasSetSize`. */
function tryFuseCanvasSetSize(nodes: Node[], i: number, ctx: ParseCtx): FusedStatement | null {
  const w = matchCanvasDimAssign(nodes[i], ctx, 'width')
  if (!w) return null
  const h = matchCanvasDimAssign(nodes[i + 1], ctx, 'height')
  if (!h || h.canvasVar !== w.canvasVar) return null
  const ctxVar = ctx.elementToCtx.get(w.canvasVar)
  if (!ctxVar) return null
  return { stmt: { type: 'canvasSetSize', ctxVar, w: w.value, h: h.value }, consumed: 2 }
}

/** `Math.PI` (membro estático, não-computado). */
function isMathPi(node: Node): boolean {
  return (
    node?.type === 'MemberExpression' &&
    !node.computed &&
    node.object?.type === 'Identifier' &&
    node.object.name === 'Math' &&
    node.property?.type === 'Identifier' &&
    node.property.name === 'PI'
  )
}

/**
 * Ângulo de volta COMPLETA (`Math.PI * 2` ou `2 * Math.PI`) — a forma que o gerador
 * re-emite p/ arco/elipse CHEIOS. Só essa forma é fundida em bloco; um ângulo
 * PARCIAL (pizza/semicírculo) ou uma elipse GIRADA não têm bloco e seriam recriados
 * como círculo/elipse cheios (perda silenciosa do desenho), então a fusão é recusada.
 */
function isFullCircleAngle(node: Node): boolean {
  if (node?.type !== 'BinaryExpression' || node.operator !== '*') return false
  return (
    (isMathPi(node.left) && numericLiteralValue(node.right) === 2) ||
    (numericLiteralValue(node.left) === 2 && isMathPi(node.right))
  )
}

/** `ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();` → `canvasArc`. */
function tryFuseCanvasArc(nodes: Node[], i: number, ctx: ParseCtx): FusedStatement | null {
  const begin = matchCtxCallNode(nodes[i], ctx, 'beginPath')
  if (!begin) return null
  const arc = matchCtxCallNode(nodes[i + 1], ctx, 'arc')
  if (!arc || arc.ctxVar !== begin.ctxVar) return null
  const fill = matchCtxCallNode(nodes[i + 2], ctx, 'fill')
  if (!fill || fill.ctxVar !== begin.ctxVar) return null
  if (arc.args.length < 3) return null
  // Só o círculo CHEIO que o gerador re-emite (`…, 0, Math.PI * 2`). Um arco PARCIAL
  // (ângulos próprios) viraria círculo cheio na volta — perda silenciosa; recusa a
  // fusão e o trecho fica como rawJS, preservando os ângulos do aluno.
  if (
    arc.args.length >= 4 &&
    (numericLiteralValue(arc.args[3]) !== 0 || !isFullCircleAngle(arc.args[4]))
  ) {
    return null
  }
  const x = toExpr(arc.args[0], ctx)
  const y = toExpr(arc.args[1], ctx)
  const r = toExpr(arc.args[2], ctx)
  if (!x || !y || !r) return null
  return { stmt: { type: 'canvasArc', ctxVar: begin.ctxVar, x, y, r }, consumed: 3 }
}

/** `ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fill();` → `canvasRoundRect`. */
function tryFuseCanvasRoundRect(nodes: Node[], i: number, ctx: ParseCtx): FusedStatement | null {
  const begin = matchCtxCallNode(nodes[i], ctx, 'beginPath')
  if (!begin) return null
  const rr = matchCtxCallNode(nodes[i + 1], ctx, 'roundRect')
  if (!rr || rr.ctxVar !== begin.ctxVar || rr.args.length < 5) return null
  const fill = matchCtxCallNode(nodes[i + 2], ctx, 'fill')
  if (!fill || fill.ctxVar !== begin.ctxVar) return null
  const x = toExpr(rr.args[0], ctx)
  const y = toExpr(rr.args[1], ctx)
  const w = toExpr(rr.args[2], ctx)
  const h = toExpr(rr.args[3], ctx)
  const r = toExpr(rr.args[4], ctx)
  if (!x || !y || !w || !h || !r) return null
  return { stmt: { type: 'canvasRoundRect', ctxVar: begin.ctxVar, x, y, w, h, r }, consumed: 3 }
}

/** `ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,2π); ctx.fill();` → `canvasEllipse`. */
function tryFuseCanvasEllipse(nodes: Node[], i: number, ctx: ParseCtx): FusedStatement | null {
  const begin = matchCtxCallNode(nodes[i], ctx, 'beginPath')
  if (!begin) return null
  const el = matchCtxCallNode(nodes[i + 1], ctx, 'ellipse')
  if (!el || el.ctxVar !== begin.ctxVar || el.args.length < 4) return null
  const fill = matchCtxCallNode(nodes[i + 2], ctx, 'fill')
  if (!fill || fill.ctxVar !== begin.ctxVar) return null
  // Só a elipse CHEIA e SEM rotação que o gerador re-emite (`…, 0, 0, Math.PI * 2`).
  // Rotação ou arco parcial não têm bloco e seriam recriados como elipse cheia —
  // perda silenciosa; recusa a fusão (vira rawJS, preservando rotação/ângulos).
  if (
    el.args.length >= 5 &&
    (numericLiteralValue(el.args[4]) !== 0 ||
      numericLiteralValue(el.args[5]) !== 0 ||
      !isFullCircleAngle(el.args[6]))
  ) {
    return null
  }
  const x = toExpr(el.args[0], ctx)
  const y = toExpr(el.args[1], ctx)
  const rx = toExpr(el.args[2], ctx)
  const ry = toExpr(el.args[3], ctx)
  if (!x || !y || !rx || !ry) return null
  return { stmt: { type: 'canvasEllipse', ctxVar: begin.ctxVar, x, y, rx, ry }, consumed: 3 }
}

/** `beginPath(); moveTo(x,y); arc(x,y,r,start,end); closePath(); fill();` → `canvasArcSlice`. */
function tryFuseCanvasArcSlice(nodes: Node[], i: number, ctx: ParseCtx): FusedStatement | null {
  const begin = matchCtxCallNode(nodes[i], ctx, 'beginPath')
  if (!begin) return null
  const move = matchCtxCallNode(nodes[i + 1], ctx, 'moveTo')
  if (!move || move.ctxVar !== begin.ctxVar) return null
  const arc = matchCtxCallNode(nodes[i + 2], ctx, 'arc')
  if (!arc || arc.ctxVar !== begin.ctxVar || arc.args.length < 5) return null
  const close = matchCtxCallNode(nodes[i + 3], ctx, 'closePath')
  if (!close || close.ctxVar !== begin.ctxVar) return null
  const fill = matchCtxCallNode(nodes[i + 4], ctx, 'fill')
  if (!fill || fill.ctxVar !== begin.ctxVar) return null
  const x = toExpr(arc.args[0], ctx)
  const y = toExpr(arc.args[1], ctx)
  const r = toExpr(arc.args[2], ctx)
  const start = toExpr(arc.args[3], ctx)
  const end = toExpr(arc.args[4], ctx)
  if (!x || !y || !r || !start || !end) return null
  return {
    stmt: { type: 'canvasArcSlice', ctxVar: begin.ctxVar, x, y, r, start, end },
    consumed: 5,
  }
}

/** `<ctx>.<prop> = <value>` quando `<ctx>` é um contexto de canvas conhecido. */
function matchCtxPropAssign(
  node: Node,
  ctx: ParseCtx,
  prop: string,
): { ctxVar: string; value: Node } | null {
  if (node?.type !== 'ExpressionStatement') return null
  const e = node.expression
  if (e?.type !== 'AssignmentExpression' || e.operator !== '=') return null
  const left = e.left
  if (left?.type !== 'MemberExpression' || left.computed) return null
  if (left.object?.type !== 'Identifier' || !ctx.ctxVars.has(left.object.name)) return null
  if (left.property?.type !== 'Identifier' || left.property.name !== prop) return null
  return { ctxVar: left.object.name, value: e.right }
}

/** `ctx.shadowColor = "cor"; ctx.shadowBlur = N;` → `canvasShadow`. */
function tryFuseCanvasShadow(nodes: Node[], i: number, ctx: ParseCtx): FusedStatement | null {
  const c = matchCtxPropAssign(nodes[i], ctx, 'shadowColor')
  if (!c) return null
  const b = matchCtxPropAssign(nodes[i + 1], ctx, 'shadowBlur')
  if (!b || b.ctxVar !== c.ctxVar) return null
  const color = toExpr(c.value, ctx)
  const blur = toExpr(b.value, ctx)
  if (!color || !blur) return null
  return { stmt: { type: 'canvasShadow', ctxVar: c.ctxVar, color, blur }, consumed: 2 }
}

/** `g.addColorStop(offset, "#cor");` referenciando a variável do gradiente. */
function matchAddColorStop(node: Node, varName: string): { offset: number; color: string } | null {
  if (node?.type !== 'ExpressionStatement') return null
  const expr = node.expression
  if (expr?.type !== 'CallExpression') return null
  const callee = expr.callee
  if (callee?.type !== 'MemberExpression') return null
  if (callee.object?.type !== 'Identifier' || callee.object.name !== varName) return null
  if (callee.property?.name !== 'addColorStop') return null
  if (expr.arguments?.length !== 2) return null
  const offset = expr.arguments[0]
  const color = expr.arguments[1]
  if (offset?.type !== 'NumericLiteral' || color?.type !== 'StringLiteral') return null
  return { offset: offset.value, color: color.value }
}

/**
 * `const g = ctx.createLinearGradient(x0,y0,x1,y1);` seguido de N
 * `g.addColorStop(...)` → `canvasGradient` (consome `1 + N` nós).
 */
function tryFuseCanvasGradient(nodes: Node[], i: number, ctx: ParseCtx): FusedStatement | null {
  const decl = nodes[i]
  if (decl?.type !== 'VariableDeclaration' || decl.declarations?.length !== 1) return null
  const id = decl.declarations[0]?.id
  if (id?.type !== 'Identifier') return null
  const call = matchCtxCall(decl.declarations[0]?.init, ctx)
  if (call?.method !== 'createLinearGradient' || call.args.length !== 4) return null
  const x0 = toExpr(call.args[0], ctx)
  const y0 = toExpr(call.args[1], ctx)
  const x1 = toExpr(call.args[2], ctx)
  const y1 = toExpr(call.args[3], ctx)
  if (!x0 || !y0 || !x1 || !y1) return null
  const varName = id.name
  const stops: Array<{ offset: number; color: string }> = []
  let j = i + 1
  for (; j < nodes.length; j++) {
    const stop = matchAddColorStop(nodes[j], varName)
    if (!stop) break
    stops.push(stop)
  }
  if (stops.length === 0) return null
  return {
    stmt: { type: 'canvasGradient', ctxVar: call.ctxVar, varName, x0, y0, x1, y1, stops },
    consumed: j - i,
  }
}

/** `requestAnimationFrame(<name>)` como expressão. */
function isRafCall(expr: Node, name: string): boolean {
  if (expr?.type !== 'CallExpression') return false
  if (expr.callee?.type !== 'Identifier' || expr.callee.name !== 'requestAnimationFrame') {
    return false
  }
  const arg = expr.arguments?.[0]
  return expr.arguments?.length === 1 && arg?.type === 'Identifier' && arg.name === name
}

function isRafCallStatement(node: Node, name: string): boolean {
  return node?.type === 'ExpressionStatement' && isRafCall(node.expression, name)
}

/** `<name>()` — chamada direta da função, sem argumentos. */
function isPlainCallStatement(node: Node, name: string): boolean {
  if (node?.type !== 'ExpressionStatement') return false
  const expr = node.expression
  return (
    expr?.type === 'CallExpression' &&
    expr.callee?.type === 'Identifier' &&
    expr.callee.name === name &&
    (expr.arguments?.length ?? 0) === 0
  )
}

/** `let X;` (uma única declaração, sem inicializador) → nome `X`; senão `null`. */
function declaredVarName(node: Node): string | null {
  if (node?.type !== 'VariableDeclaration') return null
  const decls = node.declarations
  if (!Array.isArray(decls) || decls.length !== 1) return null
  const d = decls[0]
  if (d?.id?.type !== 'Identifier' || d.init != null) return null
  return d.id.name
}

/** `<handle> = requestAnimationFrame(<name>)` → nome de `<handle>`; senão `null`. */
function rafAssignmentHandle(node: Node, name: string): string | null {
  if (node?.type !== 'ExpressionStatement') return null
  const expr = node.expression
  if (expr?.type !== 'AssignmentExpression' || expr.operator !== '=') return null
  if (expr.left?.type !== 'Identifier') return null
  return isRafCall(expr.right, name) ? expr.left.name : null
}

/**
 * `function F() { ...corpo...; requestAnimationFrame(F); }` seguido do pontapé
 * externo `F();` (ou, em projetos antigos, `requestAnimationFrame(F);`) →
 * `animationLoop` (corpo sem o RAF final).
 *
 * Forma cancelável (id guardado): `let X;` + `function F() { ...; X =
 * requestAnimationFrame(F); }` + `F();` → `animationLoop` com `handle: X`.
 */
function tryFuseAnimationLoop(
  nodes: Node[],
  i: number,
  source: string,
  ctx: ParseCtx,
): FusedStatement | null {
  const declName = declaredVarName(nodes[i])
  if (declName) {
    const decl = nodes[i + 1]
    if (decl?.type === 'FunctionDeclaration' && decl.id?.type === 'Identifier') {
      const name = decl.id.name
      const bodyNodes = decl.body?.body
      if (
        isPlainCallStatement(nodes[i + 2], name) &&
        Array.isArray(bodyNodes) &&
        bodyNodes.length > 0
      ) {
        // O `<handle> = requestAnimationFrame(frame)` pode estar no TOPO do corpo
        // (forma atual, permite cancelar de dentro) ou no FIM (forma legada).
        const firstIsRaf = rafAssignmentHandle(bodyNodes[0], name) === declName
        const lastIsRaf = rafAssignmentHandle(bodyNodes[bodyNodes.length - 1], name) === declName
        if (firstIsRaf || lastIsRaf) {
          const inner = firstIsRaf ? bodyNodes.slice(1) : bodyNodes.slice(0, -1)
          const body = mapStatementList(inner, source, ctx)
          return { stmt: { type: 'animationLoop', handle: declName, body }, consumed: 3 }
        }
      }
    }
  }

  const fn = nodes[i]
  if (fn?.type !== 'FunctionDeclaration' || fn.id?.type !== 'Identifier') return null
  const name = fn.id.name
  // Pontapé externo: `frame()` (forma atual) ou `requestAnimationFrame(frame)`
  // (forma antiga, mantida para projetos já salvos).
  if (!isPlainCallStatement(nodes[i + 1], name) && !isRafCallStatement(nodes[i + 1], name)) {
    return null
  }
  const bodyNodes = fn.body?.body
  if (!Array.isArray(bodyNodes) || bodyNodes.length === 0) return null
  if (!isRafCallStatement(bodyNodes[bodyNodes.length - 1], name)) return null
  const body = mapStatementList(bodyNodes.slice(0, -1), source, ctx)
  return { stmt: { type: 'animationLoop', body }, consumed: 2 }
}

/** Objeto de estado de teclado: `{ left:false, right:false, up:false, down:false }`. */
function isKeyStateObject(node: Node): boolean {
  if (node?.type !== 'ObjectExpression') return false
  const want = new Set(['left', 'right', 'up', 'down'])
  const got = new Set<string>()
  for (const p of node.properties ?? []) {
    if (p.type !== 'ObjectProperty') return false
    const key = p.key?.name ?? p.key?.value
    if (typeof key !== 'string' || !want.has(key)) return false
    if (p.value?.type !== 'BooleanLiteral') return false
    got.add(key)
  }
  return got.size === want.size
}

/** `document.addEventListener('<event>', ...)`. */
function isDocumentKeyListener(node: Node, event: 'keydown' | 'keyup'): boolean {
  if (node?.type !== 'ExpressionStatement') return false
  const expr = node.expression
  if (expr?.type !== 'CallExpression') return false
  const callee = expr.callee
  if (callee?.type !== 'MemberExpression') return false
  if (callee.object?.type !== 'Identifier' || callee.object.name !== 'document') return false
  if (callee.property?.name !== 'addEventListener') return false
  const arg = expr.arguments?.[0]
  return arg?.type === 'StringLiteral' && arg.value === event
}

/**
 * `const v = { left,right,up,down: false };` + listeners `keydown`/`keyup` no
 * document → `keyboardSimple`. Roda antes do matcher genérico de evento, então
 * tem prioridade sobre transformar os listeners em blocos `event`.
 */
function tryFuseKeyboard(nodes: Node[], i: number, _ctx: ParseCtx): FusedStatement | null {
  const decl = nodes[i]
  if (decl?.type !== 'VariableDeclaration' || decl.declarations?.length !== 1) return null
  const id = decl.declarations[0]?.id
  if (id?.type !== 'Identifier') return null
  if (!isKeyStateObject(decl.declarations[0]?.init)) return null
  if (!isDocumentKeyListener(nodes[i + 1], 'keydown')) return null
  if (!isDocumentKeyListener(nodes[i + 2], 'keyup')) return null
  return { stmt: { type: 'keyboardSimple', varName: id.name }, consumed: 3 }
}

/**
 * Reconhece `<obj>.getContext('2d')` (CallExpression normal ou optional) e
 * devolve o nome da variável `<obj>` (o elemento canvas); senão `null`.
 */
function matchGetContext(node: Node): string | null {
  if (!node || (node.type !== 'CallExpression' && node.type !== 'OptionalCallExpression')) {
    return null
  }
  const callee = node.callee
  if (
    !callee ||
    (callee.type !== 'MemberExpression' && callee.type !== 'OptionalMemberExpression')
  ) {
    return null
  }
  if (callee.object?.type !== 'Identifier' || callee.property?.name !== 'getContext') return null
  if (node.arguments?.length !== 1 || node.arguments[0].type !== 'StringLiteral') return null
  if (node.arguments[0].value !== '2d') return null
  return callee.object.name as string
}

/**
 * Reconhece `document.getElementById('id')` (CallExpression normal ou optional)
 * e devolve o id; senão `null`.
 */
function matchGetElementById(node: Node): string | null {
  if (!node || (node.type !== 'CallExpression' && node.type !== 'OptionalCallExpression')) {
    return null
  }
  const callee = node.callee
  if (
    !callee ||
    (callee.type !== 'MemberExpression' && callee.type !== 'OptionalMemberExpression')
  ) {
    return null
  }
  if (callee.object?.name !== 'document' || callee.property?.name !== 'getElementById') return null
  if (node.arguments?.length !== 1 || node.arguments[0].type !== 'StringLiteral') return null
  return node.arguments[0].value as string
}

/** `document.querySelector[All]('sel')` como VALOR (seletor literal). */
function matchQuerySelectorValue(node: Node): { selector: string; all: boolean } | null {
  if (!node || (node.type !== 'CallExpression' && node.type !== 'OptionalCallExpression')) {
    return null
  }
  const callee = node.callee
  if (
    !callee ||
    (callee.type !== 'MemberExpression' && callee.type !== 'OptionalMemberExpression')
  ) {
    return null
  }
  if (callee.object?.name !== 'document') return null
  const prop = callee.property?.name
  if (prop !== 'querySelector' && prop !== 'querySelectorAll') return null
  if (node.arguments?.length !== 1 || node.arguments[0].type !== 'StringLiteral') return null
  return { selector: node.arguments[0].value as string, all: prop === 'querySelectorAll' }
}

/**
 * Reconhece leitura de propriedade simples — `el.textContent` ou `el.value`
 * (membro normal ou optional), com o alvo resolvido via `extractTarget`
 * (id direto ou variável de elemento). Espelha o statement `getProperty`.
 */
function matchGetProperty(
  node: Node,
  ctx: ParseCtx,
): {
  targetId: string
  targetKind?: 'var'
  property: 'textContent' | 'value' | 'innerHTML'
} | null {
  if (!node || (node.type !== 'MemberExpression' && node.type !== 'OptionalMemberExpression')) {
    return null
  }
  const propName = node.property?.name
  if (propName !== 'textContent' && propName !== 'value' && propName !== 'innerHTML') return null
  const target = extractTarget(node.object, ctx)
  if (!target) return null
  return { targetId: target.id, ...targetKindField(target), property: propName }
}

/** `el.getAttribute('nome')` → `{ targetId, targetKind?, name }`. Espelha o `getAttribute`. */
function matchGetAttribute(
  node: Node,
  ctx: ParseCtx,
): { targetId: string; targetKind?: 'var'; name: string } | null {
  if (!node || (node.type !== 'CallExpression' && node.type !== 'OptionalCallExpression')) {
    return null
  }
  const callee = node.callee
  if (
    (callee?.type !== 'MemberExpression' && callee?.type !== 'OptionalMemberExpression') ||
    callee.computed
  ) {
    return null
  }
  if (callee.property?.name !== 'getAttribute') return null
  if (node.arguments?.length !== 1 || node.arguments[0].type !== 'StringLiteral') return null
  const target = extractTarget(callee.object, ctx)
  if (!target) return null
  return {
    targetId: target.id,
    ...targetKindField(target),
    name: node.arguments[0].value as string,
  }
}

/**
 * `if (SZGame2D.everyFrames("chave", N)) { … }` / `everySeconds` → bloco
 * "a cada N quadros/segundos". A chave (literal estável que o gerador cria) é
 * descartada no parse e recriada no gerar — round-trip continua estável. Só casa
 * SEM `else` (o bloco não tem ramo senão).
 */
function tryMatchEvery(node: Node, source: string, ctx: ParseCtx): JSStatement | null {
  if (node.alternate) return null
  // Espelho do Jogo 2D para o Jogo 2D Avançado: `if (SZGameKit.everySeconds(k, N))`.
  const gkCall = asSZGameKitCall(node.test)
  if (gkCall && gkCall.method === 'everySeconds') {
    const seconds = toExpr(gkCall.args[1], ctx)
    if (!isSimpleValue(seconds)) return null
    return { type: 'gk:everySeconds', seconds, body: bodyOfBlock(node.consequent, source, ctx) }
  }
  const call = asSZGame2DCall(node.test)
  if (!call) return null
  if (call.method === 'everyFrames') {
    const n = toExpr(call.args[1], ctx)
    if (!isSimpleValue(n)) return null
    return { type: 'g2d:everyFrames', n, body: bodyOfBlock(node.consequent, source, ctx) }
  }
  if (call.method === 'everySeconds') {
    const seconds = toExpr(call.args[1], ctx)
    if (!isSimpleValue(seconds)) return null
    return { type: 'g2d:everySeconds', seconds, body: bodyOfBlock(node.consequent, source, ctx) }
  }
  return null
}

function mapIf(node: Node, source: string, ctx: ParseCtx): JSStatement {
  // "alternar tela cheia" → if (document.fullscreenElement) sair; senão entrar.
  // ANTES do if genérico (a condição usa o objeto global `document`).
  const toggleFs = tryMatchToggleFullscreen(node)
  if (toggleFs) return toggleFs
  // "a cada N quadros/segundos" tem prioridade — é um if (SZGame2D.everyX(...)).
  const every = tryMatchEvery(node, source, ctx)
  if (every) return every
  // if (<condição>) { ... } else { ... } — a condição é qualquer valor
  // representável por bloco (comparação, lógico &&/||, classList.contains,
  // .length, variável…); senão a linha inteira vira código avançado.
  const cond = toExpr(node.test, ctx)
  if (!isSimpleValue(cond)) return asRaw(source, node)
  const thenBody = bodyOfBlock(node.consequent, source, ctx)
  // Achata a cadeia `else if`: cada `alternate` que é um IfStatement com condição
  // representável vira um ramo "senão se"; o primeiro `alternate` NÃO-if (ou uma
  // condição não representável) fecha como "senão" (bloco cru aninhado, sem regredir).
  const elseif: Array<{ cond: JSExpr; then: JSStatement[] }> = []
  let alt = node.alternate
  while (alt?.type === 'IfStatement') {
    const elifCond = toExpr(alt.test, ctx)
    if (!isSimpleValue(elifCond)) break
    elseif.push({ cond: elifCond, then: bodyOfBlock(alt.consequent, source, ctx) })
    alt = alt.alternate
  }
  const elseBody = alt ? bodyOfBlock(alt, source, ctx) : undefined
  return {
    type: 'if',
    cond,
    then: thenBody,
    ...(elseif.length > 0 ? { elseif } : {}),
    else: elseBody,
  }
}

function mapForOf(node: Node, source: string, ctx: ParseCtx): JSStatement {
  // for (const item of lista) { ... } — left = const/let de UM Identifier simples,
  // right = Identifier (variável da lista). Demais formas viram código avançado.
  const left = node.left
  if (left?.type !== 'VariableDeclaration' || left.declarations?.length !== 1) {
    return asRaw(source, node)
  }
  const id = left.declarations[0]?.id
  if (id?.type !== 'Identifier' || node.right?.type !== 'Identifier') return asRaw(source, node)
  return {
    type: 'forOf',
    itemName: id.name,
    iterableVar: node.right.name,
    body: bodyOfBlock(node.body, source, ctx),
  }
}

/**
 * O corpo (já em IR) referencia a variável `name`? Anda a árvore de nós
 * procurando um `{ type: 'var', name }`. Usado para decidir `repeat` (sem
 * índice) × `forRange` (com índice): se o corpo lê o contador, não pode virar
 * `repeat`, que descarta o nome.
 */
function bodyReferencesVar(body: JSStatement[], name: string): boolean {
  let found = false
  const walk = (value: unknown): void => {
    if (found || value == null) return
    if (Array.isArray(value)) {
      for (const item of value) walk(item)
      return
    }
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>
      if (obj.type === 'var' && obj.name === name) {
        found = true
        return
      }
      for (const v of Object.values(obj)) walk(v)
    }
  }
  walk(body)
  return found
}

function mapFor(node: Node, source: string, ctx: ParseCtx): JSStatement {
  // for (let v = <de>; v < <ate>; v++ | v += <passo> | v = v + <passo>) { ... }
  const init = node.init
  const test = node.test
  const update = node.update
  if (
    init?.type !== 'VariableDeclaration' ||
    init.declarations?.length !== 1 ||
    init.declarations[0]?.id?.type !== 'Identifier' ||
    !init.declarations[0].init
  ) {
    return asRaw(source, node)
  }
  const iName = init.declarations[0].id.name
  const from = toExpr(init.declarations[0].init, ctx)
  if (!isSimpleValue(from)) return asRaw(source, node)

  if (
    test?.type !== 'BinaryExpression' ||
    test.operator !== '<' ||
    test.left?.type !== 'Identifier' ||
    test.left.name !== iName
  ) {
    return asRaw(source, node)
  }
  const to = toExpr(test.right, ctx)
  if (!isSimpleValue(to)) return asRaw(source, node)

  // Passo: i++ (1), i += <expr>, ou i = i + <expr>.
  let step: JSExpr | null = null
  if (
    update?.type === 'UpdateExpression' &&
    update.operator === '++' &&
    update.argument?.type === 'Identifier' &&
    update.argument.name === iName
  ) {
    step = { type: 'num', value: 1 }
  } else if (
    update?.type === 'AssignmentExpression' &&
    update.operator === '+=' &&
    update.left?.type === 'Identifier' &&
    update.left.name === iName
  ) {
    step = toExpr(update.right, ctx)
  } else if (
    update?.type === 'AssignmentExpression' &&
    update.operator === '=' &&
    update.left?.type === 'Identifier' &&
    update.left.name === iName &&
    update.right?.type === 'BinaryExpression' &&
    update.right.operator === '+' &&
    update.right.left?.type === 'Identifier' &&
    update.right.left.name === iName
  ) {
    step = toExpr(update.right.right, ctx)
  }
  if (!isSimpleValue(step)) return asRaw(source, node)

  const body = bodyOfBlock(node.body, source, ctx)

  // Match EXATO do bloco "repeat" (de 0, até número, passo 1) tem PRIORIDADE —
  // preserva o round-trip do sz_js_repeat. MAS só se o corpo NÃO usa o contador:
  // "repeat" repete N vezes sem índice (o gerador cria um contador interno e o
  // descarta), então colapsar um laço cujo corpo LÊ o `i` (ex.: setMatrixAt(i,…)
  // do InstancedMesh) geraria código quebrado — esse laço fica `forRange`, que
  // preserva o nome da variável.
  if (
    from.type === 'num' &&
    from.value === 0 &&
    to.type === 'num' &&
    step.type === 'num' &&
    step.value === 1 &&
    !bodyReferencesVar(body, iName)
  ) {
    return { type: 'repeat', times: to, body }
  }
  return { type: 'forRange', varName: iName, from, to, step, body }
}

function mapWhile(node: Node, source: string, ctx: ParseCtx): JSStatement {
  // while (<condição>) { ... } — condição precisa ser um valor representável.
  const cond = toExpr(node.test, ctx)
  if (!isSimpleValue(cond)) return asRaw(source, node)
  return { type: 'while', cond, body: bodyOfBlock(node.body, source, ctx) }
}

function mapDoWhile(node: Node, source: string, ctx: ParseCtx): JSStatement {
  // do { ... } while (<condição>)
  const cond = toExpr(node.test, ctx)
  if (!isSimpleValue(cond)) return asRaw(source, node)
  return { type: 'doWhile', cond, body: bodyOfBlock(node.body, source, ctx) }
}

function mapTry(node: Node, source: string, ctx: ParseCtx): JSStatement {
  // try { ... } catch (e) { ... } [finally { ... }]. Exige um catch (o bloco
  // sempre tem o ramo "se der erro"); try sem catch (só finally) vira avançado.
  if (!node.handler) return asRaw(source, node)
  const param = node.handler.param
  if (param && param.type !== 'Identifier') return asRaw(source, node)
  const errorName: string | undefined = param ? param.name : undefined
  const finalizer = node.finalizer ? bodyOfBlock(node.finalizer, source, ctx) : undefined
  return {
    type: 'tryCatch',
    body: bodyOfBlock(node.block, source, ctx),
    ...(errorName ? { errorName } : {}),
    handler: bodyOfBlock(node.handler.body, source, ctx),
    ...(finalizer ? { finalizer } : {}),
  }
}

// ---------- helpers de matching ----------

function tryMatchBinop(expr: Node, ctx?: ParseCtx): JSExpr | null {
  if (expr?.type !== 'BinaryExpression') return null
  // Igualdade estrita (===/!==) é preservada como tal (não normaliza p/ ==/!=).
  if (!BINOP_OPERATORS.has(expr.operator)) {
    return null
  }
  const left = toExpr(expr.left, ctx)
  const right = toExpr(expr.right, ctx)
  if (!left || !right) return null
  return { type: 'binop', op: expr.operator, left, right }
}

function toExpr(node: Node, ctx?: ParseCtx): JSExpr | null {
  if (!node) return null
  // Despacho por TIPO de nó. Antes era uma escada de ~30 `if (node.type === …)`
  // intercalada com submatchers (matchNow/matchDistance/matchVector/…), cada um
  // re-testando o tipo internamente — um nó de chamada percorria ~9 submatchers
  // irrelevantes antes do certo. Cada submatcher casa EXATAMENTE um tipo, então
  // agrupar por `node.type` preserva a ordem RELATIVA dentro de cada tipo (a
  // única que importa) e pula os blocos de outros tipos. Comportamento idêntico.
  switch (node.type) {
    case 'NumericLiteral': {
      // Literais que estouram (`1e1000`) o Babel parseia como `Infinity` sem
      // erro. `Infinity` serializa para `null` no JSON e o gerador o mapeia para
      // `0`, o que MUDA o valor — então devolvemos `null` para a linha cair em
      // `asRaw` e o texto-fonte original ser preservado ("código é sagrado").
      if (!Number.isFinite(node.value)) return null
      return { type: 'num', value: node.value }
    }
    // Número negativo: o Babel parseia `-7` como `UnaryExpression(-, 7)`, não como
    // literal. Mapeamos para um `num` negativo (ex.: velocidade do tiro vy = -7, y
    // de spawn fora da tela = -26). Sem isto, qualquer valor negativo cairia em
    // código avançado. Só literais numéricos finitos; outras unárias seguem nulas.
    case 'UnaryExpression': {
      if (node.operator === '-' && node.argument?.type === 'NumericLiteral') {
        const v = node.argument.value as number
        if (Number.isFinite(v)) return { type: 'num', value: -v }
      }
      // Menos unário sobre NÃO-literal (`-this.width`, `-x`): vira a conta
      // `0 - X` (numericamente idêntico; a nuance do -0 não aparece em jogos).
      // Sem isto, `if (this.x < -this.width * 0.5)` inteiro caía em rawJS. O
      // gerador emite `0 - X` com parênteses por precedência e o re-parse volta
      // ao MESMO binop — fixpoint estável.
      if (node.operator === '-') {
        const inner = toExpr(node.argument, ctx)
        if (isSimpleValue(inner)) {
          return { type: 'binop', op: '-', left: { type: 'num', value: 0 }, right: inner }
        }
      }
      // Negação booleana `!x` → bloco "não".
      if (node.operator === '!') {
        const inner = toExpr(node.argument, ctx)
        if (inner) return { type: 'logicalNot', value: inner }
      }
      return null
    }
    case 'StringLiteral': {
      // `rgba(r, g, b, a)` → cor com transparência (bloco sz_val_color_alpha).
      const rgba = /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*([\d.]+)\s*\)$/.exec(
        node.value,
      )
      if (rgba) {
        // Valida os canais (0–255) e o alpha (número finito em [0,1] com um único
        // ponto decimal). Sem isso, `rgba(999,0,0,1)` geraria um hex de 3 dígitos
        // que o gerador re-fatia numa cor DIFERENTE, e `rgba(0,0,0,1.2.3)` viraria
        // `alpha: NaN`. Se algo falhar, preserva o literal verbatim como string.
        const channels = [rgba[1], rgba[2], rgba[3]].map((n) => Number(n))
        const alpha = Number(rgba[4])
        const dotCount = rgba[4]?.match(/\./g)?.length ?? 0
        const channelsOk = channels.every((n) => n <= 255)
        const alphaOk = dotCount <= 1 && Number.isFinite(alpha) && alpha >= 0 && alpha <= 1
        if (channelsOk && alphaOk) {
          const hex = `#${channels.map((n) => n.toString(16).padStart(2, '0')).join('')}`
          return { type: 'colorAlpha', hex, alpha }
        }
      }
      // Uma string hexadecimal `#rrggbb` é tratada como COR (bloco sz_val_color).
      // Como `color` e `str` geram o mesmo código, no pior caso (um seletor raro
      // tipo "#aabbcc") muda só a aparência do bloco.
      return /^#[0-9a-fA-F]{6}$/.test(node.value)
        ? { type: 'color', value: node.value }
        : { type: 'str', value: node.value }
    }
    case 'BooleanLiteral':
      return { type: 'bool', value: node.value }
    case 'NullLiteral':
      return { type: 'null' }
    case 'Identifier':
      // Apelido do parâmetro de evento ativo (`e => …`): toda referência solta
      // vira `event` — o único nome que o gerador emite no `(event) =>`.
      if (ctx?.eventParamAliases.includes(node.name)) {
        return { type: 'var', name: 'event' }
      }
      return { type: 'var', name: node.name }
    // `this` (o elemento atual dentro de um handler).
    case 'ThisExpression':
      return { type: 'thisRef' }
    // `new Classe(args)` como VALOR (argumento de push/método, propriedade…).
    // Date/Image ficam de fora: têm fluxos próprios (`agora: …`/matchNow e o par
    // `new Image()` + src do tryFuseNewImage) que não podem ser capturados aqui.
    // `const x = new C(...)` também não passa por este caminho (mapDeclarator
    // resolve ANTES como o statement `newInstance`).
    case 'NewExpression': {
      // `new Promise((resolve) => { ... })` → newPromise. O corpo é parseado
      // (o `resolve()` lá dentro vira callFunction). Arrow/função com 0-1 param.
      if (node.callee?.type === 'Identifier' && node.callee.name === 'Promise' && ctx) {
        const arg = node.arguments?.[0]
        if (
          node.arguments?.length === 1 &&
          (arg.type === 'ArrowFunctionExpression' || arg.type === 'FunctionExpression') &&
          (arg.params?.length ?? 0) <= 1 &&
          (arg.params ?? []).every((p: Node) => p?.type === 'Identifier')
        ) {
          return {
            type: 'newPromise',
            param: arg.params?.[0]?.name ?? 'resolve',
            body: bodyOfFn(arg, ctx.source, ctx),
          }
        }
        return null
      }
      // `new Classe(args)` (aluno) ou `new THREE.Classe(args)` (biblioteca).
      // Date/Image ficam de fora (fluxos próprios: agora/newImage).
      const ctor = namespacedCtor(node.callee)
      if (!ctor) return null
      if (
        ctor.namespace === undefined &&
        (ctor.className === 'Date' || ctor.className === 'Image')
      ) {
        return null
      }
      const args = (node.arguments ?? []).map((a: Node) => toExpr(a, ctx))
      if (!args.every(isSimpleValue)) return null
      return {
        type: 'newExpr',
        className: ctor.className,
        args: args as JSExpr[],
        ...(ctor.namespace ? { namespace: ctor.namespace } : {}),
      }
    }
    // `objeto?.prop` — leitura opcional (não estoura se o objeto for null). Só o
    // caso GERAL (sem os matchers específicos de MemberExpression, que são para
    // acessos NÃO-opcionais). Ex.: `this.images[name]?.loaded`.
    case 'OptionalMemberExpression': {
      if (node.computed || node.property?.type !== 'Identifier') return null
      if (isGlobalObject(node.object)) return null
      const object = toExpr(node.object, ctx)
      if (!isSimpleValue(object)) return null
      return {
        type: 'memberGet',
        object: object as JSExpr,
        name: node.property.name,
        ...(node.optional ? { optional: true } : {}),
      }
    }
    case 'MemberExpression': {
      // Apelido de evento na BASE do membro (`e.key`, `e.clientX`, `e.target`):
      // normaliza para `event` ANTES dos matchers — vários deles são chaveados
      // pelo NOME do identificador (eventProp, arrayLength…) e capturariam o
      // apelido literal, regenerando um `e` órfão. Clone raso; o AST não é mutado.
      if (node.object?.type === 'Identifier' && ctx?.eventParamAliases.includes(node.object.name)) {
        node = { ...node, object: { ...node.object, name: 'event' } }
      }
      // __szInput.x / __szInput.y — posição do mouse/dedo (caminho "na mão").
      if (
        !node.computed &&
        node.object?.type === 'Identifier' &&
        node.object.name === '__szInput' &&
        node.property?.type === 'Identifier' &&
        (node.property.name === 'x' || node.property.name === 'y')
      ) {
        return { type: 'inputPointer', axis: node.property.name }
      }
      // this.<prop> — usado dentro de métodos/construtor.
      if (
        !node.computed &&
        node.object?.type === 'ThisExpression' &&
        node.property?.type === 'Identifier'
      ) {
        return { type: 'thisProp', name: node.property.name }
      }
      // window.innerWidth / window.innerHeight → valor global.
      if (
        !node.computed &&
        node.object?.type === 'Identifier' &&
        node.object.name === 'window' &&
        node.property?.type === 'Identifier'
      ) {
        if (node.property.name === 'innerWidth') return { type: 'global', kind: 'innerWidth' }
        if (node.property.name === 'innerHeight') return { type: 'global', kind: 'innerHeight' }
        if (node.property.name === 'devicePixelRatio')
          return { type: 'global', kind: 'devicePixelRatio' }
      }
      // window.matchMedia('(prefers-color-scheme: dark)').matches → modo escuro do sistema.
      if (
        !node.computed &&
        node.property?.type === 'Identifier' &&
        node.property.name === 'matches' &&
        node.object?.type === 'CallExpression' &&
        node.object.callee?.type === 'MemberExpression' &&
        !node.object.callee.computed &&
        node.object.callee.property?.type === 'Identifier' &&
        node.object.callee.property.name === 'matchMedia' &&
        node.object.arguments?.[0]?.type === 'StringLiteral' &&
        /prefers-color-scheme:\s*dark/.test(node.object.arguments[0].value as string)
      ) {
        return { type: 'systemDark' }
      }
      // event.clientX/clientY → posição do clique (sz_val_event_pos);
      // event.key/code → tecla do evento (sz_val_event_key).
      if (
        !node.computed &&
        node.object?.type === 'Identifier' &&
        node.object.name === 'event' &&
        node.property?.type === 'Identifier' &&
        (node.property.name === 'clientX' ||
          node.property.name === 'clientY' ||
          node.property.name === 'key' ||
          node.property.name === 'code')
      ) {
        return { type: 'eventProp', prop: node.property.name }
      }
      // Math.PI → constante matemática (sz_val_math_pi). Outras constantes (ex.:
      // Math.E) não têm bloco, então ficam como código avançado (preservadas).
      if (
        !node.computed &&
        node.object?.type === 'Identifier' &&
        node.object.name === 'Math' &&
        node.property?.type === 'Identifier' &&
        node.property.name === 'PI'
      ) {
        return { type: 'mathConst', name: 'PI' }
      }
      // <variável>.length → tamanho da lista (sz_val_array_length).
      if (
        !node.computed &&
        node.object?.type === 'Identifier' &&
        node.property?.type === 'Identifier' &&
        node.property.name === 'length'
      ) {
        return { type: 'arrayLength', arrayVar: node.object.name }
      }
      // <canvas>.width / <canvas>.height → dimensão do canvas (sz_val_canvas_width).
      // Só quando `<canvas>` é um elemento de canvas conhecido (par getElementById
      // + getContext('2d') já visto); a IR guarda o contexto associado em `ctxVar`.
      if (
        ctx &&
        !node.computed &&
        node.object?.type === 'Identifier' &&
        node.property?.type === 'Identifier' &&
        (node.property.name === 'width' || node.property.name === 'height') &&
        ctx.elementToCtx.has(node.object.name)
      ) {
        return {
          type: 'canvasDim',
          ctxVar: ctx.elementToCtx.get(node.object.name) as string,
          dim: node.property.name,
        }
      }
      // ctx.measureText("texto").width → largura do texto (sz_canvas_measure_text)
      if (
        ctx &&
        !node.computed &&
        node.property?.type === 'Identifier' &&
        node.property.name === 'width' &&
        node.object?.type === 'CallExpression' &&
        node.object.callee?.type === 'MemberExpression' &&
        !node.object.callee.computed &&
        node.object.callee.property?.type === 'Identifier' &&
        node.object.callee.property.name === 'measureText' &&
        node.object.callee.object?.type === 'Identifier' &&
        ctx.ctxVars.has(node.object.callee.object.name)
      ) {
        const mtText = toExpr(node.object.arguments?.[0], ctx)
        if (mtText) {
          return { type: 'canvasMeasureText', ctxVar: node.object.callee.object.name, text: mtText }
        }
      }
      // `arr[arr.length - 1]` → último item da lista (sz_val_array_last). Roda
      // ANTES do índice genérico, que senão casaria com índice calculado.
      if (
        node.computed &&
        node.object?.type === 'Identifier' &&
        node.property?.type === 'BinaryExpression' &&
        node.property.operator === '-' &&
        node.property.right?.type === 'NumericLiteral' &&
        node.property.right.value === 1 &&
        (node.property.left?.type === 'MemberExpression' ||
          node.property.left?.type === 'OptionalMemberExpression') &&
        !node.property.left.computed &&
        node.property.left.object?.type === 'Identifier' &&
        node.property.left.object.name === node.object.name &&
        node.property.left.property?.type === 'Identifier' &&
        node.property.left.property.name === 'length'
      ) {
        return { type: 'arrayLast', arrayVar: node.object.name }
      }
      // `arr[i]` → item da lista por índice (sz_val_array_index).
      if (node.computed && node.object?.type === 'Identifier' && node.property) {
        const idx = toExpr(node.property, ctx)
        if (isSimpleValue(idx)) return { type: 'index', arrayVar: node.object.name, index: idx }
      }
      // Geral: acesso por chave/índice computado sobre QUALQUER objeto representável
      // (`this.toLoad[key]`, `obj.lista[i]`…) — o `index` acima cobre só `arr[i]` com
      // `arr` = variável simples; aqui o objeto é uma expressão (thisProp, memberGet…).
      if (node.computed && node.property && node.object?.type !== 'Identifier') {
        const object = toExpr(node.object, ctx)
        const index = toExpr(node.property, ctx)
        if (object && index && isSimpleValue(object) && isSimpleValue(index)) {
          return { type: 'indexGet', object, index }
        }
      }
      // <obj>.dataset.chave → leitura de data-attribute (sz_val_dataset).
      if (
        !node.computed &&
        node.property?.type === 'Identifier' &&
        (node.object?.type === 'MemberExpression' ||
          node.object?.type === 'OptionalMemberExpression') &&
        !node.object.computed &&
        node.object.property?.name === 'dataset' &&
        node.object.object?.type === 'Identifier'
      ) {
        return { type: 'datasetGet', objectVar: node.object.object.name, key: node.property.name }
      }
      // Geral: leitura de propriedade de qualquer objeto representável (object.prop).
      // Cobre aninhamento como `this.velocidade.x` (objeto = thisProp) e `obj.prop`.
      if (!node.computed && node.property?.type === 'Identifier' && !isGlobalObject(node.object)) {
        const object = toExpr(node.object, ctx)
        if (isSimpleValue(object)) {
          return { type: 'memberGet', object, name: node.property.name }
        }
      }
      return null
    }
    case 'BinaryExpression': {
      // document.fullscreenElement != null → "está em tela cheia?".
      const fs = tryMatchIsFullscreen(node)
      if (fs) return fs
      // (arg * Math.PI / 180) / (arg * 180 / Math.PI) → conversão de ângulo.
      const angle = matchAngleConvert(node, ctx)
      if (angle) return angle
      return tryMatchBinop(node, ctx)
    }
    // `a && b` / `a || b` → operador lógico (sz_val_logic). Aninha cadeias longas.
    case 'LogicalExpression': {
      // Fonte de imagem gerada pelo bloco `sz_val_image`:
      // `window.__SZGAME_ASSETS?.["nome"] ?? "nome"` → assetImage (round-trip fiel).
      if (node.operator === '??') {
        const l = node.left
        if (
          (l?.type === 'MemberExpression' || l?.type === 'OptionalMemberExpression') &&
          l.computed &&
          l.property?.type === 'StringLiteral' &&
          (l.object?.type === 'MemberExpression' ||
            l.object?.type === 'OptionalMemberExpression') &&
          !l.object.computed &&
          l.object.object?.type === 'Identifier' &&
          l.object.object.name === 'window' &&
          l.object.property?.type === 'Identifier' &&
          l.object.property.name === '__SZGAME_ASSETS' &&
          node.right?.type === 'StringLiteral' &&
          node.right.value === l.property.value
        ) {
          return { type: 'assetImage', name: l.property.value }
        }
        return null
      }
      if (node.operator !== '&&' && node.operator !== '||') return null
      const left = toExpr(node.left, ctx)
      const right = toExpr(node.right, ctx)
      if (!isSimpleValue(left) || !isSimpleValue(right)) return null
      return { type: 'logical', op: node.operator, left, right }
    }
    // `cond ? a : b` → operador ternário (sz_val_ternary).
    case 'ConditionalExpression': {
      const condition = toExpr(node.test, ctx)
      const whenTrue = toExpr(node.consequent, ctx)
      const whenFalse = toExpr(node.alternate, ctx)
      if (!isSimpleValue(condition) || !isSimpleValue(whenTrue) || !isSimpleValue(whenFalse)) {
        return null
      }
      return { type: 'ternary', condition, whenTrue, whenFalse }
    }
    case 'TemplateLiteral': {
      // `hsl(${...}, 50%, 50%)` → cor HSL (bloco específico, antes do concat geral).
      const hsl = tryMatchHslTemplate(node, ctx)
      if (hsl) return hsl
      // `texto ${valor}` → juntar texto (sz_val_join).
      const parts: JSExpr[] = []
      const quasis = node.quasis ?? []
      const exprs = node.expressions ?? []
      for (let i = 0; i < quasis.length; i += 1) {
        const text = quasis[i]?.value?.cooked ?? quasis[i]?.value?.raw ?? ''
        if (text) parts.push({ type: 'str', value: text })
        if (i < exprs.length) {
          const e = toExpr(exprs[i], ctx)
          if (!isSimpleValue(e)) return null
          parts.push(e)
        }
      }
      return { type: 'concat', parts }
    }
    case 'ArrayExpression': {
      // `[...a, ...b]` → juntar listas (sz_val_concat_arrays).
      if (
        (node.elements?.length ?? 0) > 0 &&
        node.elements.every((el: Node) => el?.type === 'SpreadElement')
      ) {
        const parts = node.elements.map((el: Node) => toExpr(el.argument, ctx))
        if (parts.every(isSimpleValue)) return { type: 'concatArrays', parts: parts as JSExpr[] }
      }
      // [a, b, …] → lista/array literal (sz_val_array).
      const items = (node.elements ?? []).map((el: Node) => toExpr(el, ctx))
      return items.every(isSimpleValue) ? { type: 'array', items: items as JSExpr[] } : null
    }
    case 'ObjectExpression': {
      // { x, y } / { x, y, z } → vetor literal (sz_val_vector2d / 3d).
      const vec = matchVector(node, ctx)
      if (vec) return vec
      // { chave: valor, ... } genérico → objeto literal (sz_val_object).
      return matchObjectLiteral(node, ctx)
    }
    case 'CallExpression':
    case 'OptionalCallExpression': {
      // document.getElementById('id') como VALOR (ex.: guardar uma <img> numa
      // propriedade p/ desenhar no canvas). ANTES dos outros matchers de chamada.
      const elementId = matchGetElementById(node)
      if (elementId !== null) return { type: 'getElement', id: elementId }
      // document.querySelector[All]('sel') como VALOR (ex.: iterar com .forEach).
      const qsv = matchQuerySelectorValue(node)
      if (qsv) return { type: 'querySelectorValue', selector: qsv.selector, all: qsv.all }
      // Promise.all([...]) → promiseAll (a lista é um valor, ex.: array literal).
      if (
        node.callee?.type === 'MemberExpression' &&
        node.callee.object?.name === 'Promise' &&
        node.callee.property?.name === 'all' &&
        node.arguments?.length === 1
      ) {
        const list = toExpr(node.arguments[0], ctx)
        return list && isSimpleValue(list) ? { type: 'promiseAll', list } : null
      }
      // localStorage.getItem(chave) / sessionStorage.getItem(chave) → storageGet.
      if (node.type === 'CallExpression' && node.callee?.type === 'MemberExpression') {
        const obj = node.callee.object
        if (
          obj?.type === 'Identifier' &&
          (obj.name === 'localStorage' || obj.name === 'sessionStorage') &&
          node.callee.property?.name === 'getItem' &&
          node.arguments?.length === 1
        ) {
          const key = toExpr(node.arguments[0], ctx)
          if (isSimpleValue(key)) {
            return {
              type: 'storageGet',
              store: obj.name === 'sessionStorage' ? 'session' : 'local',
              key,
            }
          }
        }
      }
      // Object.keys(x) / Object.values(x) / Object.entries(x) → objectOp (lista).
      if (
        node.callee?.type === 'MemberExpression' &&
        !node.callee.computed &&
        node.callee.object?.type === 'Identifier' &&
        node.callee.object.name === 'Object' &&
        node.callee.property?.type === 'Identifier' &&
        (node.callee.property.name === 'keys' ||
          node.callee.property.name === 'values' ||
          node.callee.property.name === 'entries') &&
        node.arguments?.length === 1
      ) {
        const object = toExpr(node.arguments[0], ctx)
        if (object && isSimpleValue(object)) {
          return {
            type: 'objectOp',
            op: node.callee.property.name as 'keys' | 'values' | 'entries',
            object,
          }
        }
      }
      // SZGame2D.keyDown("…") / SZGame2D.touches(a, b) → perguntas (booleanos).
      const g2dExpr = matchGame2DExpr(node, ctx)
      if (g2dExpr) return g2dExpr
      // SZGame3D.keyDown / collides / hitAny → perguntas 3D (booleanos).
      const g3dExpr = matchGame3DExpr(node, ctx)
      if (g3dExpr) return g3dExpr
      // SZGameKit.keyDown / touching / width / state… → valores do kit profissional.
      const gkExpr = matchGameKitExpr(node, ctx)
      if (gkExpr) return gkExpr
      // SZGameKit.rpg* → valores do Kit RPG (célula, flags, itens, batalha).
      const gkRpgExpr = matchGameKitRpgExpr(node, ctx)
      if (gkRpgExpr) return gkRpgExpr
      // SZGameKit3D.* → valores do Jogo 3D Avançado (mundo/entidades/FSM).
      const g3kExpr = matchGameKit3DExpr(node, ctx)
      if (g3kExpr) return g3kExpr
      const w3dExpr = matchWorld3DExpr(node, ctx)
      if (w3dExpr) return w3dExpr
      // ctx.isPointInPath(x, y) / ctx.isPointInStroke(x, y) → perguntas de traçado.
      if (
        ctx &&
        node.type === 'CallExpression' &&
        node.callee?.type === 'MemberExpression' &&
        !node.callee.computed &&
        node.callee.object?.type === 'Identifier' &&
        ctx.ctxVars.has(node.callee.object.name) &&
        node.callee.property?.type === 'Identifier' &&
        (node.callee.property.name === 'isPointInPath' ||
          node.callee.property.name === 'isPointInStroke') &&
        node.arguments?.length === 2
      ) {
        const px = toExpr(node.arguments[0], ctx)
        const py = toExpr(node.arguments[1], ctx)
        if (isSimpleValue(px) && isSimpleValue(py)) {
          return {
            type:
              node.callee.property.name === 'isPointInStroke'
                ? 'canvasIsPointInStroke'
                : 'canvasIsPointInPath',
            ctxVar: node.callee.object.name,
            x: px,
            y: py,
          }
        }
      }
      // __szInput.key("ArrowRight") → "a tecla … está apertada?" (caminho "na mão").
      if (
        node.type === 'CallExpression' &&
        node.callee?.type === 'MemberExpression' &&
        !node.callee.computed &&
        node.callee.object?.type === 'Identifier' &&
        node.callee.object.name === '__szInput' &&
        node.callee.property?.name === 'key' &&
        node.arguments?.[0]?.type === 'StringLiteral'
      ) {
        return { type: 'inputKeyPressed', key: node.arguments[0].value as string }
      }
      // performance.now() → milissegundos desde o carregamento (sz_val_perf_now).
      if (
        node.callee?.type === 'MemberExpression' &&
        !node.callee.computed &&
        node.callee.object?.type === 'Identifier' &&
        node.callee.object.name === 'performance' &&
        node.callee.property?.type === 'Identifier' &&
        node.callee.property.name === 'now' &&
        (node.arguments?.length ?? 0) === 0
      ) {
        return { type: 'perfNow' }
      }
      // <lista>.find((item) => <cond>) → achar na lista (sz_val_array_find).
      if (
        node.callee?.type === 'MemberExpression' &&
        !node.callee.computed &&
        node.callee.object?.type === 'Identifier' &&
        node.callee.property?.type === 'Identifier' &&
        node.callee.property.name === 'find' &&
        node.arguments?.length === 1 &&
        node.arguments[0]?.type === 'ArrowFunctionExpression' &&
        node.arguments[0].params?.length === 1 &&
        node.arguments[0].params[0]?.type === 'Identifier' &&
        node.arguments[0].body?.type !== 'BlockStatement'
      ) {
        const arrow = node.arguments[0]
        const itemName = arrow.params[0].name as string
        const cond = toExpr(arrow.body, ctx)
        if (isSimpleValue(cond)) {
          return { type: 'arrayFind', arrayVar: node.callee.object.name, itemName, cond }
        }
      }
      // <lista>.filter((item) => <cond>) → filtrar lista (sz_val_array_filter).
      // A lista pode ser QUALQUER valor simples (variável, this.enemies, membro…)
      // — o bloco tem soquete de lista, não campo de nome.
      if (
        (node.callee?.type === 'MemberExpression' ||
          node.callee?.type === 'OptionalMemberExpression') &&
        !node.callee.computed &&
        node.callee.property?.type === 'Identifier' &&
        node.callee.property.name === 'filter' &&
        node.arguments?.length === 1 &&
        node.arguments[0]?.type === 'ArrowFunctionExpression' &&
        node.arguments[0].params?.length === 1 &&
        node.arguments[0].params[0]?.type === 'Identifier' &&
        node.arguments[0].body?.type !== 'BlockStatement'
      ) {
        const arrow = node.arguments[0]
        const itemName = arrow.params[0].name as string
        const array = toExpr(node.callee.object, ctx)
        const cond = toExpr(arrow.body, ctx)
        if (isSimpleValue(array) && isSimpleValue(cond)) {
          return { type: 'arrayFilter', array, itemName, cond }
        }
      }
      // <lista>.map((item) => <expr>) → transformar lista (sz_val_array_map).
      if (
        node.callee?.type === 'MemberExpression' &&
        !node.callee.computed &&
        node.callee.object?.type === 'Identifier' &&
        node.callee.property?.type === 'Identifier' &&
        node.callee.property.name === 'map' &&
        node.arguments?.length === 1 &&
        node.arguments[0]?.type === 'ArrowFunctionExpression' &&
        node.arguments[0].params?.length === 1 &&
        node.arguments[0].params[0]?.type === 'Identifier' &&
        node.arguments[0].body?.type !== 'BlockStatement'
      ) {
        const arrow = node.arguments[0]
        const itemName = arrow.params[0].name as string
        const transform = toExpr(arrow.body, ctx)
        if (isSimpleValue(transform)) {
          return { type: 'arrayMap', arrayVar: node.callee.object.name, itemName, transform }
        }
      }
      const now = matchNow(node)
      if (now) return now
      // Math.random() cru → decimal aleatório de 0 a 1 (sz_val_random_float).
      if (isRandomCall(node)) return { type: 'randomFloat' }
      // Math.hypot(a.x - b.x, a.y - b.y) → distância entre objetos (sz_val_distance).
      // Roda antes do hypot genérico para vencer quando o formato bate.
      const dist = matchDistance(node, ctx)
      if (dist) return dist
      const math = matchMathCall(node, ctx)
      if (math) return math
      // nome(args) como VALOR (callee identificador, fora da denylist) → `call`.
      if (node.type === 'CallExpression' && node.callee?.type === 'Identifier') {
        if (!GLOBAL_CALL_DENYLIST.has(node.callee.name)) {
          const args = (node.arguments ?? []).map((a: Node) => toExpr(a, ctx))
          if (args.every(isSimpleValue)) {
            return { type: 'call', name: node.callee.name, args: args as JSExpr[] }
          }
        }
      }
      // `arr.sort(() => Math.random() - 0.5)` → embaralhar (sz_val_shuffle).
      const shuffle = matchShuffle(node)
      if (shuffle) return shuffle
      // <alvo>.classList.contains('classe') → sz_val_class_contains.
      if (ctx) {
        const contains = matchClassContains(node, ctx)
        if (contains) return contains
      }
      // Geral: chamada de método em forma de valor sobre qualquer objeto
      // representável (object.metodo(args)). Roda por último (depois de canvas,
      // Math, .length, dataset, classList, …); exclui objetos globais.
      if (
        node.type === 'CallExpression' &&
        node.callee?.type === 'MemberExpression' &&
        !node.callee.computed &&
        node.callee.property?.type === 'Identifier' &&
        !isGlobalObject(node.callee.object)
      ) {
        const object = toExpr(node.callee.object, ctx)
        const args = (node.arguments ?? []).map((a: Node) => toExpr(a, ctx))
        if (isSimpleValue(object) && args.every(isSimpleValue)) {
          return {
            type: 'memberCallExpr',
            object,
            method: node.callee.property.name,
            args: args as JSExpr[],
          }
        }
        return null
      }
      return null
    }
    default:
      return null
  }
}

/**
 * `` `hsl(<H>, <S>%, <L>%)` `` (template literal) → cor HSL (`sz_val_color_hsl`).
 * Cada slot pode ser número literal (no texto) OU interpolação `${...}`. Marca as
 * interpolações com `@i@` no texto reconstruído e casa o padrão por regex; resolve
 * cada slot de volta para o número ou a expressão original. Falha → vira `concat`.
 */
function tryMatchHslTemplate(node: Node, ctx?: ParseCtx): JSExpr | null {
  const quasis = node.quasis ?? []
  const exprs = node.expressions ?? []
  let pattern = ''
  for (let i = 0; i < quasis.length; i += 1) {
    pattern += quasis[i]?.value?.cooked ?? quasis[i]?.value?.raw ?? ''
    if (i < exprs.length) pattern += `@${i}@`
  }
  const slot = '(@\\d+@|-?[\\d.]+)'
  const re = new RegExp(`^hsl\\(\\s*${slot}\\s*,\\s*${slot}\\s*%\\s*,\\s*${slot}\\s*%\\s*\\)$`)
  const m = re.exec(pattern)
  if (!m) return null
  const resolve = (token: string | undefined): JSExpr | null => {
    if (!token) return null
    const mark = /^@(\d+)@$/.exec(token)
    return mark ? toExpr(exprs[Number(mark[1])], ctx) : { type: 'num', value: Number(token) }
  }
  const h = resolve(m[1])
  const s = resolve(m[2])
  const l = resolve(m[3])
  if (!isSimpleValue(h) || !isSimpleValue(s) || !isSimpleValue(l)) return null
  return { type: 'hslColor', h, s, l }
}

/**
 * Verdadeiro só para expressões que um bloco de VALOR (`sz_val_*`) representa
 * — espelha `exprToValueBlock` no editor. Usado para decidir se argumentos de
 * `new`/chamada de método podem virar blocos; caso contrário a linha é
 * preservada como código avançado (sem perder o original).
 */
function isSimpleValue(expr: JSExpr | null): expr is JSExpr {
  if (!expr) return false
  switch (expr.type) {
    case 'num':
    case 'str':
    case 'color':
    case 'colorAlpha':
    case 'bool':
    case 'null':
    case 'var':
    case 'global':
    case 'canvasDim':
    case 'thisProp':
    case 'propAccess':
    case 'mathConst':
    case 'eventProp':
      return true
    case 'canvasMeasureText':
      return isSimpleValue(expr.text)
    case 'canvasIsPointInPath':
    case 'canvasIsPointInStroke':
      return isSimpleValue(expr.x) && isSimpleValue(expr.y)
    case 'storageGet':
      return isSimpleValue(expr.key)
    case 'random':
      return isSimpleValue(expr.min) && isSimpleValue(expr.max)
    case 'logicalNot':
      return isSimpleValue(expr.value)
    case 'hslColor':
      return isSimpleValue(expr.h) && isSimpleValue(expr.s) && isSimpleValue(expr.l)
    case 'randomFloat':
      return true
    case 'callMethodExpr':
      return expr.args.every(isSimpleValue)
    case 'call':
      return expr.args.every(isSimpleValue)
    case 'g2d:keyDown':
    case 'g2d:touches':
    case 'g2d:countGroup':
    case 'g2d:spriteAngle':
    case 'g2d:distance':
    case 'g2d:angleTo':
    case 'g2d:getHealth':
    case 'g2d:enemyDamage':
    case 'g2d:spriteX':
    case 'g2d:spriteY':
    case 'g2d:spriteW':
    case 'g2d:spriteH':
    case 'g2d:centerX':
    case 'g2d:centerY':
    case 'g2d:shapeW':
    case 'g2d:shapeH':
    case 'g2d:spriteVx':
    case 'g2d:spriteVy':
    case 'g2d:spriteSpeed':
    case 'g2d:isMoving':
    case 'g2d:isMovingH':
    case 'g2d:isMovingV':
    case 'g2d:randomBetween':
    case 'g2d:randomChance':
    case 'g2d:hasHealth':
    case 'g2d:cooldownReady':
    case 'g2d:isPaused':
    case 'g2d:cameraX':
    case 'g2d:cameraY':
    case 'g2d:randomX':
    case 'g2d:randomY':
    case 'g2d:tileAtSprite':
    case 'g2d:sceneIs':
    case 'g2d:stickHeroScore':
    case 'g2d:stickHeroOver':
    case 'g2d:balloonScore':
    case 'g2d:balloonFuel':
    case 'g2d:balloonOver':
    case 'g2d:aimReleased':
    case 'g2d:bananaHitThrower':
    case 'g2d:bananaHitCity':
    case 'g3d:keyDown':
    case 'g3d:collides':
    case 'g3d:hitAny':
    case 'g3d:touchesBox':
    case 'g3d:crosserHit':
    case 'g3d:crosserRow':
    case 'g3d:distanceTo':
    case 'g3d:isNear':
    case 'g3d:raceHit':
    case 'g3d:raceLaps':
    case 'g3d:stackScore':
    case 'g3d:stackGameOver':
    case 'g3d:getPos':
    case 'g3d:getRot':
    case 'g3d:getScale':
    case 'g3d:getVel':
    case 'g3d:getSpeed':
    case 'g3d:isMoving':
    case 'g3d:dt':
    case 'g3d:angleTo':
    case 'g3d:pickAtMouse':
    case 'g3d:pointerOver':
    case 'g3d:aimAhead':
    case 'g3d:onGround':
    case 'g3d:groundHeight':
    case 'gk:gameWidth':
    case 'gk:gameHeight':
    case 'gk:gameState':
    case 'gk:stateIs':
    case 'gk:charactersTouch':
    case 'gk:charX':
    case 'gk:charY':
    case 'gk:keyDown':
    case 'gk:keyPressed':
    case 'gk:countActive':
    case 'gk:touchCircle':
    case 'gk:didHit':
    case 'gk:isOnGround':
    case 'gk:velocityOf':
    case 'gk:propertyOf':
    case 'gk:facingOf':
    case 'gk:cooldownReady':
    case 'gk:tileAt':
    case 'gk:boardGet':
    case 'gk:boardCount':
    case 'gk:boardIn':
    // 🧭 R15 — sem estar AQUI, o statement que os usa vira rawJS inteiro
    case 'gk:isInside':
    case 'gk:overlapPercent':
    case 'gk:chance':
    case 'gk:distanceBetween':
    case 'gk:pointIn':
    case 'gk:opacityOf':
    case 'gk:savedValue':
    // 👾 R16 — sem estar aqui, o statement que os usa vira rawJS inteiro
    case 'gk:pkmLevelOf':
    case 'gk:pkmHas':
    case 'gk:pkmTeamSize':
    case 'gk:pkmBallCount':
    case 'gk:pkmCaught':
    case 'gk:isDead':
    case 'gk:isInvincible':
    case 'gk:healthOf':
    // R18/R19 — sem estar aqui, o statement que os usa vira rawJS inteiro
    case 'gk:lutaWinner':
    case 'gk:lutaRound':
    case 'gk:lutaWinsOf':
    case 'gk:lutaCombo':
    case 'gk:lutaSpecial':
    case 'gk:lutaIsGuarding':
    case 'gk:animEnded':
    case 'gk:entityState':
    case 'gk:angleOf':
    case 'gk:angleTo':
    case 'gk:nearestActive':
    case 'gk:randomActive':
    case 'gk:navePowerOf':
    case 'gk:pathProgress':
    case 'gk:pickActive':
    case 'gk:tdCoins':
    case 'gk:countItem':
    case 'gk:timeSurvived':
    case 'gk:kills':
    case 'gk:cameraX':
    case 'gk:cameraY':
    case 'gk:mouseX':
    case 'gk:mouseY':
    case 'gk:mouseDown':
    case 'gk:rpgHasFlag':
    case 'gk:rpgHasItem':
    case 'gk:rpgBattleWon':
    case 'gk:rpgHasSave':
    case 'gk:rpgLevel':
    case 'gk:rpgXp':
    case 'gk:battlerLife':
    case 'gk:battlerMaxLife':
    case 'gk:rollDice':
    case 'gk:currentPlayer':
    case 'gk:spaceOf':
    case 'gk:pileTop':
    case 'gk:pileSize':
    case 'gk:card':
    case 'gk:cardIsUp':
    case 'gk:cardFace':
    case 'gk:cardAt':
    case 'gk:cardsEnergy':
    case 'gk:cardsHeroLife':
    case 'gk:cardsEnemyLife':
    case 'gk:cardsIntentAction':
    case 'gk:cardsIntentValue':
    case 'gk:rpgCurrentMap':
    case 'g3k:worldSize':
    case 'g3k:countAlive':
    case 'g3k:keyDown':
    case 'g3k:keyPressed':
    case 'g3k:mouseDown':
    case 'g3k:mousePressed':
    case 'g3k:posOf':
    case 'g3k:exists':
    case 'g3k:entityStateIs':
    case 'g3k:isMold':
    case 'g3k:isAimingAt':
    case 'g3k:healthOf':
    case 'g3k:entityValue':
    case 'g3k:stateTime':
    case 'g3k:onGround':
    case 'g3k:pointerOver':
    case 'g3k:groundPoint':
    case 'g3k:velocityOf':
    case 'g3k:randomBetween':
    case 'g3k:randomChance':
    case 'g3k:timeLeft':
    case 'g3k:distanceBetween':
    case 'g3k:maxHealthOf':
    case 'g3k:stateOf':
    case 'g3k:stateIs':
    case 'g3k:gameState':
    case 'w3d:worldSize':
    case 'w3d:carPos':
    case 'w3d:carSpeed':
    case 'w3d:personPos':
    case 'w3d:isDriving':
    case 'w3d:coinCount':
    case 'w3d:hasAchievement':
    case 'w3d:inventoryCount':
    case 'w3d:keyDown':
    case 'w3d:keyPressed':
    case 'w3d:timeOfDay':
    case 'w3d:raceTime':
    case 'w3d:raceBest':
    case 'w3d:pinsDown':
    case 'w3d:knockedCount':
    case 'inputKeyPressed':
    case 'inputPointer':
    case 'isFullscreen':
    case 'systemDark':
    case 'perfNow':
    case 'dateGet':
      return true
    case 'datasetGet':
    case 'classContains':
    case 'shuffle':
    case 'thisRef':
      return true
    case 'gk:rpgCell':
      return typeof expr.n === 'number' || isSimpleValue(expr.n)
    case 'g3k:touches':
      return typeof expr.dist === 'number' || isSimpleValue(expr.dist)
    case 'w3d:groundHeight':
      return (
        (typeof expr.x === 'number' || isSimpleValue(expr.x)) &&
        (typeof expr.z === 'number' || isSimpleValue(expr.z))
      )
    case 'w3d:inventoryHas':
      return typeof expr.n === 'number' || isSimpleValue(expr.n)
    case 'concat':
    case 'concatArrays':
      return expr.parts.every(isSimpleValue)
    case 'index':
      return isSimpleValue(expr.index)
    case 'arrayLast':
      return true
    case 'arrayFind':
      return isSimpleValue(expr.cond)
    case 'arrayFilter':
      return isSimpleValue(expr.array) && isSimpleValue(expr.cond)
    case 'arrayMap':
      return isSimpleValue(expr.transform)
    case 'binop':
      // Contas (sz_math_arithmetic) e comparações (sz_val_compare) têm bloco.
      return isSimpleValue(expr.left) && isSimpleValue(expr.right)
    case 'logical':
      // Operadores lógicos &&/|| (sz_val_logic).
      return isSimpleValue(expr.left) && isSimpleValue(expr.right)
    case 'ternary':
      // Operador ternário (sz_val_ternary): condição e os dois ramos têm bloco.
      return (
        isSimpleValue(expr.condition) &&
        isSimpleValue(expr.whenTrue) &&
        isSimpleValue(expr.whenFalse)
      )
    case 'mathUnary':
    case 'angleConvert':
      return isSimpleValue(expr.arg)
    case 'mathBinary':
    case 'distance':
      return isSimpleValue(expr.a) && isSimpleValue(expr.b)
    case 'vec2':
      return isSimpleValue(expr.x) && isSimpleValue(expr.y)
    case 'vec3':
      return isSimpleValue(expr.x) && isSimpleValue(expr.y) && isSimpleValue(expr.z)
    case 'array':
      return expr.items.every(isSimpleValue)
    case 'arrayLength':
      return true
    case 'objectLiteral':
      return expr.entries.every((e) => isSimpleValue(e.value))
    case 'memberGet':
      return isSimpleValue(expr.object)
    case 'memberCallExpr':
      return isSimpleValue(expr.object) && expr.args.every(isSimpleValue)
    case 'newExpr':
      return expr.args.every(isSimpleValue)
    case 'objectOp':
      return isSimpleValue(expr.object)
    case 'assetImage':
      return true
    case 'getElement':
      return true
    case 'querySelectorValue':
      return true
    case 'newPromise':
      return true
    case 'promiseAll':
      return isSimpleValue(expr.list)
    case 'indexGet':
      return isSimpleValue(expr.object) && isSimpleValue(expr.index)
    default:
      return false
  }
}

/**
 * Reconhece valores calculados da data/hora: `new Date().getFullYear()`,
 * `new Date().toLocaleDateString()` e `new Date().toLocaleTimeString()`.
 */
function matchNow(node: Node): JSExpr | null {
  if (node?.type !== 'CallExpression' || node.arguments?.length !== 0) return null
  const callee = node.callee
  if (callee?.type !== 'MemberExpression') return null
  const obj = callee.object
  if (obj?.type !== 'NewExpression' || obj.callee?.name !== 'Date') return null
  if (obj.arguments?.length) return null
  switch (callee.property?.name) {
    case 'getFullYear':
      return { type: 'now', kind: 'year' }
    case 'toLocaleDateString':
      return { type: 'now', kind: 'date' }
    case 'toLocaleTimeString':
      return { type: 'now', kind: 'time' }
    // Partes NUMÉRICAS (sz_val_date_part) — relógio/animações.
    case 'getMonth':
      return { type: 'dateGet', part: 'month' }
    case 'getDate':
      return { type: 'dateGet', part: 'dayOfMonth' }
    case 'getDay':
      return { type: 'dateGet', part: 'weekday' }
    case 'getHours':
      return { type: 'dateGet', part: 'hours' }
    case 'getMinutes':
      return { type: 'dateGet', part: 'minutes' }
    case 'getSeconds':
      return { type: 'dateGet', part: 'seconds' }
    case 'getMilliseconds':
      return { type: 'dateGet', part: 'ms' }
    default:
      return null
  }
}

const MATH_UNARY_FNS = new Set([
  'round',
  'floor',
  'ceil',
  'abs',
  'sqrt',
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'sign',
])
const MATH_BINARY_FNS = new Set(['min', 'max', 'atan2', 'hypot'])
// Operadores binários reconhecidos. `Set` em vez de um array-literal recriado e
// varrido a cada `BinaryExpression` (toExpr é o caminho mais quente do parser —
// uma alocação + scan O(14) por nó aritmético somava muito em código denso).
const BINOP_OPERATORS = new Set([
  '>',
  '<',
  '==',
  '!=',
  '>=',
  '<=',
  '===',
  '!==',
  '+',
  '-',
  '*',
  '/',
  '%',
  '**',
])
const CLASSLIST_OPS = new Set(['add', 'remove', 'toggle'])

/**
 * Reconhece `Math.<fn>(...)`: `round/floor/ceil/abs/sqrt(x)` → `mathUnary` e
 * `min/max(a, b)` → `mathBinary`. Os argumentos precisam ser valores
 * representáveis; senão devolve `null` (a linha cai em código avançado).
 */
function matchMathCall(node: Node, ctx?: ParseCtx): JSExpr | null {
  if (node?.type !== 'CallExpression') return null
  const callee = node.callee
  if (callee?.type !== 'MemberExpression' || callee.computed) return null
  if (callee.object?.type !== 'Identifier' || callee.object.name !== 'Math') return null
  const fn = callee.property?.name
  if (typeof fn !== 'string') return null
  const args = node.arguments ?? []
  if (MATH_UNARY_FNS.has(fn) && args.length === 1) {
    const arg = toExpr(args[0], ctx)
    return isSimpleValue(arg) ? { type: 'mathUnary', fn: fn as MathUnaryFn, arg } : null
  }
  if (MATH_BINARY_FNS.has(fn) && args.length === 2) {
    const a = toExpr(args[0], ctx)
    const b = toExpr(args[1], ctx)
    return isSimpleValue(a) && isSimpleValue(b)
      ? { type: 'mathBinary', fn: fn as 'min' | 'max' | 'atan2' | 'hypot', a, b }
      : null
  }
  return null
}

type MathUnaryFn = (JSExpr & { type: 'mathUnary' })['fn']

/** `Math.random()` (chamada sem argumentos do membro não-computado Math.random). */
function isRandomCall(node: Node): boolean {
  if (node?.type !== 'CallExpression' || (node.arguments?.length ?? 0) !== 0) return false
  const callee = node.callee
  if (callee?.type !== 'MemberExpression' || callee.computed) return false
  return callee.object?.name === 'Math' && callee.property?.name === 'random'
}

/** Mesma referência de objeto: `player`, `this`, `this.alvo`, `a.b.c` (não-computado). */
function sameRef(a: Node, b: Node): boolean {
  if (!a || !b || a.type !== b.type) return false
  if (a.type === 'Identifier') return a.name === b.name
  if (a.type === 'ThisExpression') return true
  if (a.type === 'MemberExpression' && !a.computed && !b.computed) {
    return a.property?.name === b.property?.name && sameRef(a.object, b.object)
  }
  return false
}

/** `<obj>.<coord>` (membro não-computado cuja propriedade é `coord`). */
function isCoordMember(node: Node, coord: 'x' | 'y'): boolean {
  return (
    !!node &&
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.property?.type === 'Identifier' &&
    node.property.name === coord
  )
}

/** `A.<coord> - B.<coord>` (subtração de coordenadas). */
function isCoordDiff(node: Node, coord: 'x' | 'y'): boolean {
  return (
    !!node &&
    node.type === 'BinaryExpression' &&
    node.operator === '-' &&
    isCoordMember(node.left, coord) &&
    isCoordMember(node.right, coord)
  )
}

/**
 * `Math.hypot(A.x - B.x, A.y - B.y)` → distância entre dois objetos `A` e `B`
 * que têm posição (.x/.y). Exige o mesmo objeto em x e y dos dois lados; senão
 * devolve `null` e a linha cai no `hypot` genérico (mathBinary).
 */
function matchDistance(node: Node, ctx?: ParseCtx): JSExpr | null {
  if (node?.type !== 'CallExpression') return null
  const callee = node.callee
  if (callee?.type !== 'MemberExpression' || callee.computed) return null
  if (callee.object?.name !== 'Math' || callee.property?.name !== 'hypot') return null
  const args = node.arguments ?? []
  if (args.length !== 2) return null
  const [dx, dy] = args
  if (!isCoordDiff(dx, 'x') || !isCoordDiff(dy, 'y')) return null
  // O objeto A (lado esquerdo) e o objeto B (lado direito) precisam ser os mesmos
  // em ambas as coordenadas.
  if (!sameRef(dx.left.object, dy.left.object)) return null
  if (!sameRef(dx.right.object, dy.right.object)) return null
  const a = toExpr(dx.left.object, ctx)
  const b = toExpr(dx.right.object, ctx)
  if (!isSimpleValue(a) || !isSimpleValue(b)) return null
  return { type: 'distance', a, b }
}

/** `Math.random() - 0.5` (corpo do comparador de embaralhamento). */
function isRandomMinusHalf(node: Node): boolean {
  if (node?.type !== 'BinaryExpression' || node.operator !== '-') return false
  const left = node.left
  if (left?.type !== 'CallExpression' || (left.arguments?.length ?? 0) !== 0) return false
  const lc = left.callee
  if (lc?.type !== 'MemberExpression') return false
  if (lc.object?.name !== 'Math' || lc.property?.name !== 'random') return false
  return node.right?.type === 'NumericLiteral' && node.right.value === 0.5
}

/** `<lista>.sort(() => Math.random() - 0.5)` → `shuffle`. Corpo direto ou `return`. */
function matchShuffle(node: Node): JSExpr | null {
  if (node?.type !== 'CallExpression') return null
  const callee = node.callee
  if (callee?.type !== 'MemberExpression' || callee.computed) return null
  if (callee.object?.type !== 'Identifier' || callee.property?.name !== 'sort') return null
  if (node.arguments?.length !== 1) return null
  const cb = node.arguments[0]
  if (cb.type !== 'ArrowFunctionExpression' && cb.type !== 'FunctionExpression') return null
  let body = cb.body
  if (body?.type === 'BlockStatement') {
    if (body.body?.length !== 1 || body.body[0]?.type !== 'ReturnStatement') return null
    body = body.body[0].argument
  }
  if (!isRandomMinusHalf(body)) return null
  return { type: 'shuffle', arrayVar: callee.object.name }
}

/** `Math.PI` (membro não-computado). */
function isMathPI(node: Node): boolean {
  return (
    !!node &&
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.object?.type === 'Identifier' &&
    node.object.name === 'Math' &&
    node.property?.type === 'Identifier' &&
    node.property.name === 'PI'
  )
}

function isNumericLiteral(node: Node, value: number): boolean {
  return !!node && node.type === 'NumericLiteral' && node.value === value
}

/**
 * Reconhece a forma exata gerada para conversão de ângulo:
 *   graus → radianos: `(arg * Math.PI / 180)`  → BinaryExpression `/` com
 *     esquerda `arg * Math.PI` e direita `180`.
 *   radianos → graus: `(arg * 180 / Math.PI)`  → `/` com esquerda `arg * 180`
 *     e direita `Math.PI`.
 */
function matchAngleConvert(node: Node, ctx?: ParseCtx): JSExpr | null {
  if (node?.type !== 'BinaryExpression' || node.operator !== '/') return null
  const left = node.left
  if (left?.type !== 'BinaryExpression' || left.operator !== '*') return null
  // degToRad: (arg * Math.PI) / 180
  if (isMathPI(left.right) && isNumericLiteral(node.right, 180)) {
    const arg = toExpr(left.left, ctx)
    return isSimpleValue(arg) ? { type: 'angleConvert', dir: 'degToRad', arg } : null
  }
  // radToDeg: (arg * 180) / Math.PI
  if (isNumericLiteral(left.right, 180) && isMathPI(node.right)) {
    const arg = toExpr(left.left, ctx)
    return isSimpleValue(arg) ? { type: 'angleConvert', dir: 'radToDeg', arg } : null
  }
  return null
}

/**
 * Reconhece um objeto literal com chaves exatamente `x, y` (vec2) ou `x, y, z`
 * (vec3), não-computadas e com valores simples. Outros objetos não casam e a
 * linha é preservada como código avançado.
 */
function matchVector(node: Node, ctx?: ParseCtx): JSExpr | null {
  if (node?.type !== 'ObjectExpression') return null
  const props = node.properties ?? []
  const byKey = new Map<string, JSExpr>()
  for (const prop of props) {
    if (prop.type !== 'ObjectProperty' || prop.computed) return null
    const key = prop.key
    const name =
      key?.type === 'Identifier' ? key.name : key?.type === 'StringLiteral' ? key.value : null
    if (name !== 'x' && name !== 'y' && name !== 'z') return null
    const value = toExpr(prop.value, ctx)
    if (!isSimpleValue(value)) return null
    byKey.set(name, value)
  }
  if (byKey.size === 2 && byKey.has('x') && byKey.has('y')) {
    return { type: 'vec2', x: byKey.get('x') as JSExpr, y: byKey.get('y') as JSExpr }
  }
  if (byKey.size === 3 && byKey.has('x') && byKey.has('y') && byKey.has('z')) {
    return {
      type: 'vec3',
      x: byKey.get('x') as JSExpr,
      y: byKey.get('y') as JSExpr,
      z: byKey.get('z') as JSExpr,
    }
  }
  return null
}

/**
 * Reconhece um objeto literal genérico (`{ chave: valor, ... }`) com chaves
 * não-computadas (identificador ou string) e valores representáveis. Roda DEPOIS
 * de `matchVector` (vec2/vec3 ficam com seus blocos próprios). Spread, métodos
 * e getters/setters não casam — a linha vira código avançado. Atalho (`{ x }`)
 * é aceito e regenerado como `{ x: x }`.
 */
function matchObjectLiteral(node: Node, ctx?: ParseCtx): JSExpr | null {
  if (node?.type !== 'ObjectExpression') return null
  const props = node.properties ?? []
  const entries: Array<{ key: string; value: JSExpr }> = []
  for (const prop of props) {
    if (prop.type !== 'ObjectProperty' || prop.computed) return null
    const key = prop.key
    const name =
      key?.type === 'Identifier' ? key.name : key?.type === 'StringLiteral' ? key.value : null
    if (name == null) return null
    const value = toExpr(prop.value, ctx)
    if (!isSimpleValue(value)) return null
    entries.push({ key: name, value })
  }
  return { type: 'objectLiteral', entries }
}

interface MatchedListener {
  target: string
  targetKind?: 'var' | 'document' | 'window'
  event: EventKind
  /** Callback inline (arrow/função anônima) — vira corpo de `event`. */
  callback?: Node
  /** Função nomeada passada por referência — vira `eventHandler`. */
  handlerName?: string
}

function tryMatchEventListener(expr: Node, ctx: ParseCtx): MatchedListener | null {
  if (!expr || (expr.type !== 'CallExpression' && expr.type !== 'OptionalCallExpression')) {
    return null
  }
  // método é .addEventListener (membro chamado direto ou optional)
  const callee = expr.callee
  if (
    !callee ||
    (callee.type !== 'MemberExpression' && callee.type !== 'OptionalMemberExpression')
  ) {
    return null
  }
  if (callee.property?.name !== 'addEventListener') return null
  if (expr.arguments?.length !== 2) return null
  const eventArg = expr.arguments[0]
  const cbArg = expr.arguments[1]
  if (eventArg.type !== 'StringLiteral') return null
  if (!KNOWN_EVENT_KINDS.has(eventArg.value as EventKind)) return null
  // Callback inline (arrow/função) ou referência a uma função nomeada.
  const isFn = cbArg.type === 'ArrowFunctionExpression' || cbArg.type === 'FunctionExpression'
  const isNamed = cbArg.type === 'Identifier'
  if (!isFn && !isNamed) return null
  const handler = isNamed ? { handlerName: cbArg.name as string } : { callback: cbArg }

  // Escuta global na janela: `window.addEventListener(...)`. Para teclado e mouse,
  // window e document são equivalentes (eventos borbulham); aceitamos os dois e
  // normalizamos para o targetKind correspondente (load/resize são da janela).
  if (callee.object?.type === 'Identifier' && callee.object.name === 'window') {
    // TECLADO normaliza para `document` JÁ NO PARSE: o bloco "Quando tecla…"
    // (sz_js_on_key) só emite document — sem isto, o 1º ciclo gerava `window.…`
    // e o round-trip por BLOCOS trocava para `document.…` (diff espúrio no
    // fixpoint blocos⇄código). Comportamento idêntico (a tecla borbulha).
    const isKeyEvent = eventArg.value === 'keydown' || eventArg.value === 'keyup'
    return {
      target: isKeyEvent ? 'document' : 'window',
      targetKind: isKeyEvent ? 'document' : 'window',
      event: eventArg.value as EventKind,
      ...handler,
    }
  }
  // Escuta global no documento: `document.addEventListener(...)`.
  if (callee.object?.type === 'Identifier' && callee.object.name === 'document') {
    return {
      target: 'document',
      targetKind: 'document',
      event: eventArg.value as EventKind,
      ...handler,
    }
  }

  // Alvo: document.getElementById('x') ou uma variável de elemento.
  const target = extractTarget(callee.object, ctx)
  if (!target) return null
  return {
    target: target.id,
    ...targetKindField(target),
    event: eventArg.value as EventKind,
    ...handler,
  }
}

/**
 * Alvo de um statement que age sobre um elemento. `id` carrega ou um id (quando
 * `kind` é omitido) ou o nome de uma variável que guarda o elemento (`kind: 'var'`).
 */
interface TargetRef {
  id: string
  kind?: 'var' | 'this'
}

/** Campos prontos para a IR: só inclui `targetKind` quando é variável (não 'this'). */
function targetKindField(ref: TargetRef): { targetKind?: 'var' } {
  return ref.kind === 'var' ? { targetKind: 'var' } : {}
}

/** Como `targetKindField`, mas também propaga 'this' — para classList (classOp/contains). */
function classTargetKindField(ref: TargetRef): { targetKind?: 'var' | 'this' } {
  if (ref.kind === 'var') return { targetKind: 'var' }
  if (ref.kind === 'this') return { targetKind: 'this' }
  return {}
}

function extractTarget(node: Node, _ctx: ParseCtx): TargetRef | null {
  if (!node) return null
  // document.getElementById('x') — uso inline por id
  const byId = matchGetElementById(node)
  if (byId !== null) return { id: byId }
  // this — o elemento atual dentro de um handler.
  if (node.type === 'ThisExpression') return { id: '', kind: 'this' }
  // `document` CRU (não `document.getElementById`/`addEventListener`, tratados
  // antes e separadamente): NÃO é um elemento. Devolver o sentinela `__document__`
  // fazia `document.classList`/`dataset`/property virarem
  // `getElementById("__document__")` (alvo inexistente → no-op) no round-trip da
  // Ponte; tratá-lo como 'var' arriscaria reescrever em matchers onde isso não
  // vale. Retornamos null → o statement inteiro cai em `rawJS` verbatim ("código é
  // sagrado"). O caminho de evento global (`document.addEventListener`) já é
  // resolvido em `tryMatchEventListener` ANTES de chegar aqui.
  if (node.type === 'Identifier' && node.name === 'document') {
    return null
  }
  // qualquer outra variável: assume que guarda um elemento (ex.: const x =
  // document.querySelector(...)) e referencia a própria variável.
  if (node.type === 'Identifier') {
    return { id: node.name, kind: 'var' }
  }
  return null
}

interface MatchedClassList {
  target: string
  targetKind?: 'var' | 'this'
  op: 'add' | 'remove' | 'toggle'
  className: string
}

function tryMatchClassList(expr: Node, ctx: ParseCtx): MatchedClassList | null {
  if (!expr || (expr.type !== 'CallExpression' && expr.type !== 'OptionalCallExpression')) {
    return null
  }
  const callee = expr.callee
  if (
    !callee ||
    (callee.type !== 'MemberExpression' && callee.type !== 'OptionalMemberExpression')
  ) {
    return null
  }
  const op = callee.property?.name as 'add' | 'remove' | 'toggle' | undefined
  if (!op || !CLASSLIST_OPS.has(op)) return null
  // callee.object precisa ser .classList em algo
  const obj = callee.object
  if (!obj || (obj.type !== 'MemberExpression' && obj.type !== 'OptionalMemberExpression'))
    return null
  if (obj.property?.name !== 'classList') return null
  const target = extractTarget(obj.object, ctx)
  if (!target) return null
  if (expr.arguments?.length !== 1 || expr.arguments[0].type !== 'StringLiteral') return null
  return {
    target: target.id,
    ...classTargetKindField(target),
    op,
    className: expr.arguments[0].value,
  }
}

/** `<alvo>.classList.contains('classe')` → `classContains` (valor). */
function matchClassContains(node: Node, ctx: ParseCtx): JSExpr | null {
  if (!node || (node.type !== 'CallExpression' && node.type !== 'OptionalCallExpression')) {
    return null
  }
  const callee = node.callee
  if (
    !callee ||
    (callee.type !== 'MemberExpression' && callee.type !== 'OptionalMemberExpression')
  ) {
    return null
  }
  if (callee.property?.name !== 'contains') return null
  const obj = callee.object
  if (!obj || (obj.type !== 'MemberExpression' && obj.type !== 'OptionalMemberExpression')) {
    return null
  }
  if (obj.property?.name !== 'classList') return null
  const target = extractTarget(obj.object, ctx)
  if (!target) return null
  if (node.arguments?.length !== 1 || node.arguments[0].type !== 'StringLiteral') return null
  return {
    type: 'classContains',
    targetId: target.id,
    ...classTargetKindField(target),
    className: node.arguments[0].value,
  }
}

function bodyOfBlock(node: Node, source: string, ctx: ParseCtx): JSStatement[] {
  if (!node) return []
  if (node.type === 'BlockStatement') {
    return mapStatementList(node.body, source, ctx)
  }
  // Statement único sem chaves
  return mapStatementList([node], source, ctx)
}

function bodyOfFn(fn: Node, source: string, ctx: ParseCtx): JSStatement[] {
  if (!fn?.body) return []
  if (fn.body.type === 'BlockStatement') return bodyOfBlock(fn.body, source, ctx)
  // Arrow function com expressão direta (sem chaves): trata o corpo como UM
  // statement. O ExpressionStatement sintético PRECISA herdar as posições de
  // origem (start/end/loc/range) do corpo: sem elas, qualquer statement que caia
  // em `asRaw` — ex.: `b => b.y -= b.speed`, cujo alvo é um MEMBRO (não um
  // Identifier, então não casa o atalho de "+=/-=") — seria fatiado de `source`
  // com `start` indefinido → `snippet` devolve '' → o statement SUMIA do
  // round-trip (era o bug do "tiro que não anda": `bullets.forEach(b => b.y -=
  // b.speed)` virava um forEach de corpo vazio).
  const exprStatement: Node = {
    type: 'ExpressionStatement',
    expression: fn.body,
    start: fn.body.start,
    end: fn.body.end,
    loc: fn.body.loc,
    range: fn.body.range,
  }
  return bodyOfBlock({ type: 'BlockStatement', body: [exprStatement] }, source, ctx)
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Erro de sintaxe em JavaScript.'
}
