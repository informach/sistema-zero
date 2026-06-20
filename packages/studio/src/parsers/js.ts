import { type ParserOptions, parse } from '@babel/parser'
import type { EventKind, JSExpr, JSStatement } from '#ir'

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
    elementVars: new Map(),
    canvasElementVars: new Set(),
    ctxVars: new Set(),
    elementToCtx: new Map(),
    instanceVars: new Set(),
    spriteVars: new Set(),
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
  elementVars: Map<string, string>
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
}

const KNOWN_EVENT_KINDS: ReadonlySet<EventKind> = new Set([
  'click',
  'keydown',
  'keyup',
  'mouseover',
  'mouseout',
  'submit',
  'input',
  'change',
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
  const methods: Array<{ name: string; params: string[]; body: JSStatement[] }> = []
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
function tryMatchEventMethod(expr: Node): JSStatement | null {
  if (expr?.type !== 'CallExpression' || expr.callee?.type !== 'MemberExpression') return null
  const obj = expr.callee.object
  if (obj?.type !== 'Identifier' || obj.name !== 'event') return null
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
    return [{ type: 'createElement', tag: createdTag, varName: name }]
  }
  // canvasSetup: const ctx = <canvasVar>.getContext('2d'), onde <canvasVar>
  // veio de um getElementById anterior. Funde o par numa única IR canvasSetup.
  const canvasVar = matchGetContext(init)
  if (canvasVar) {
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
  // newInstance: const x = new Classe(args). Date/Image têm tratamento próprio.
  if (
    init?.type === 'NewExpression' &&
    init.callee?.type === 'Identifier' &&
    init.callee.name !== 'Date' &&
    init.callee.name !== 'Image'
  ) {
    const args = (init.arguments ?? []).map((a: Node) => toExpr(a, ctx))
    if (args.every(isSimpleValue)) {
      ctx.instanceVars.add(name)
      return [
        {
          type: 'newInstance',
          varName: name,
          className: init.callee.name,
          args: args as JSExpr[],
        },
      ]
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
  // Demais inicializadores (contas, Math.*, variável, etc.): viram um `var`
  // se o valor for representável por um bloco; senão preserva como avançado.
  const value = toExpr(init, ctx)
  if (isSimpleValue(value)) return [{ type: 'var', name, value, ...kindField }]
  return null
}

function mapExpressionStatement(node: Node, source: string, ctx: ParseCtx): JSStatement {
  const expr = node.expression
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

  // x += n / x -= n → assign(x = x ± n). Round-trip do bloco "Somar N".
  if (
    expr?.type === 'AssignmentExpression' &&
    (expr.operator === '+=' || expr.operator === '-=') &&
    expr.left?.type === 'Identifier'
  ) {
    const name: string = expr.left.name
    const right = toExpr(expr.right, ctx)
    if (isSimpleValue(right)) {
      return {
        type: 'assign',
        name,
        value: {
          type: 'binop',
          op: expr.operator === '+=' ? '+' : '-',
          left: { type: 'var', name },
          right,
        },
      }
    }
    return asRaw(source, node)
  }

  // x++ / x-- → assign(x = x ± 1).
  if (expr?.type === 'UpdateExpression' && expr.argument?.type === 'Identifier') {
    const name: string = expr.argument.name
    return {
      type: 'assign',
      name,
      value: {
        type: 'binop',
        op: expr.operator === '++' ? '+' : '-',
        left: { type: 'var', name },
        right: { type: 'num', value: 1 },
      },
    }
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
    const bodyStmts = bodyOfFn(evt.callback, source, ctx)
    return {
      type: 'event',
      target: evt.target,
      ...(evt.targetKind ? { targetKind: evt.targetKind } : {}),
      event: evt.event,
      body: bodyStmts,
    }
  }

  // localStorage.setItem(chave, valor) / sessionStorage.setItem(...)
  const storageSet = tryMatchStorageSet(expr, ctx)
  if (storageSet) return storageSet

  // event.preventDefault() / event.stopPropagation()
  const eventMethod = tryMatchEventMethod(expr)
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

  // cancelAnimationFrame(id) — para o loop de animação.
  const cancelAnim = tryMatchCancelAnimationFrame(expr, ctx)
  if (cancelAnim) return cancelAnim

  // Métodos de canvas de uma linha: ctx.fillRect(...), ctx.save(), etc.
  const canvasCall = tryMatchCanvasCall(expr, ctx)
  if (canvasCall) return canvasCall

  // lista.push(valor) / lista.pop() / lista.shift()
  const arrayOp = tryMatchArrayOp(expr, ctx)
  if (arrayOp) return arrayOp

  // pai.appendChild(filho)
  const append = tryMatchAppendChild(expr, ctx)
  if (append) return append

  // lista.forEach((item, i) => { … })
  const forEach = tryMatchForEach(expr, source, ctx)
  if (forEach) return forEach

  // setTimeout(() => { … }, ms)
  const timeout = tryMatchSetTimeout(expr, source, ctx)
  if (timeout) return timeout

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

  // objeto.metodo(args) — chamada de método de um objeto guardado em variável.
  const methodCall = tryMatchMethodCall(expr, ctx)
  if (methodCall) return methodCall

  // nome(args) — chamada de uma função do aluno como comando.
  const fnCall = tryMatchFunctionCall(expr, ctx)
  if (fnCall) return fnCall

  return asRaw(source, node)
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

/** `<lista>.forEach((item[, i]) => { … })` → `forEach`. */
function tryMatchForEach(expr: Node, source: string, ctx: ParseCtx): JSStatement | null {
  if (expr?.type !== 'CallExpression') return null
  const callee = expr.callee
  if (callee?.type !== 'MemberExpression' || callee.computed) return null
  if (callee.object?.type !== 'Identifier' || callee.property?.name !== 'forEach') return null
  if (ctx.instanceVars.has(callee.object.name)) return null
  if (expr.arguments?.length !== 1) return null
  const cb = expr.arguments[0]
  if (cb.type !== 'ArrowFunctionExpression' && cb.type !== 'FunctionExpression') return null
  const params = cb.params ?? []
  if (params.length < 1 || params.length > 2) return null
  if (!params.every((p: Node) => p?.type === 'Identifier')) return null
  const itemName: string = params[0].name
  const indexName: string | undefined = params[1]?.name
  const body = bodyOfFn(cb, source, ctx)
  return {
    type: 'forEach',
    arrayVar: callee.object.name,
    itemName,
    ...(indexName ? { indexName } : {}),
    body,
  }
}

/** `setTimeout(() => { … }, ms)` → `setTimeout`. Callback sem parâmetros. */
function tryMatchSetTimeout(expr: Node, source: string, ctx: ParseCtx): JSStatement | null {
  if (expr?.type !== 'CallExpression' || expr.callee?.type !== 'Identifier') return null
  if (expr.callee.name !== 'setTimeout' || expr.arguments?.length !== 2) return null
  const cb = expr.arguments[0]
  if (cb.type !== 'ArrowFunctionExpression' && cb.type !== 'FunctionExpression') return null
  if ((cb.params?.length ?? 0) !== 0) return null
  const delay = toExpr(expr.arguments[1], ctx)
  if (!isSimpleValue(delay)) return null
  const body = bodyOfFn(cb, source, ctx)
  return { type: 'setTimeout', delay, body }
}

/** `setInterval(() => { … }, ms)` → `setInterval`. Callback sem parâmetros. */
function tryMatchSetInterval(expr: Node, source: string, ctx: ParseCtx): JSStatement | null {
  if (expr?.type !== 'CallExpression' || expr.callee?.type !== 'Identifier') return null
  if (expr.callee.name !== 'setInterval' || expr.arguments?.length !== 2) return null
  const cb = expr.arguments[0]
  if (cb.type !== 'ArrowFunctionExpression' && cb.type !== 'FunctionExpression') return null
  if ((cb.params?.length ?? 0) !== 0) return null
  const delay = toExpr(expr.arguments[1], ctx)
  if (!isSimpleValue(delay)) return null
  const body = bodyOfFn(cb, source, ctx)
  return { type: 'setInterval', delay, body }
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
function matchGame2DExpr(node: Node): JSExpr | null {
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
  if (method === 'sceneIs' && args[0]?.type === 'StringLiteral') {
    return { type: 'g2d:sceneIs', name: args[0].value as string }
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
): { x: number; y: number; w: number; h: number; color: string; image: string | null } | null {
  const result = { x: 0, y: 0, w: 32, h: 32, color: '#22d3ee', image: null as string | null }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (key === 'x' || key === 'y' || key === 'w' || key === 'h') {
      const v = numericLiteralValue(prop.value)
      if (v === null) return null
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
 * image/solid/grid são strings; tile é número. null se alguma chave faltar/for
 * não-literal/desconhecida — o caminho cai no helper genérico.
 */
function readTileMapOptions(
  obj: Node,
): { image: string; tile: number; solid: string; grid: string } | null {
  const result = { image: null as string | null, tile: null as number | null, solid: '', grid: '' }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (key === 'tile') {
      const v = numericLiteralValue(prop.value)
      if (v === null) return null
      result.tile = v
    } else if (key === 'image' || key === 'solid' || key === 'grid') {
      if (prop.value?.type !== 'StringLiteral') return null
      result[key] = prop.value.value as string
    } else {
      return null
    }
  }
  if (result.image === null || result.tile === null) return null
  return { image: result.image, tile: result.tile, solid: result.solid, grid: result.grid }
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
  w: number
  h: number
  color: string
  image: string | null
} | null {
  const num0: JSExpr = { type: 'num', value: 0 }
  const out = {
    x: num0 as JSExpr,
    y: num0 as JSExpr,
    vx: num0 as JSExpr,
    vy: num0 as JSExpr,
    w: 20,
    h: 20,
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
    if (key === 'x' || key === 'y' || key === 'vx' || key === 'vy') {
      const v = toExpr(prop.value, ctx)
      if (!isSimpleValue(v)) return null
      out[key] = v
    } else if (key === 'w' || key === 'h') {
      const v = numericLiteralValue(prop.value)
      if (v === null) return null
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
): { x: number; y: number; w: number; h: number; body: string; wings: string } | null {
  const out = { x: 0, y: 0, w: 54, h: 62, body: '#35e8ff', wings: '#2568ff' }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (key === 'x' || key === 'y' || key === 'w' || key === 'h') {
      const v = numericLiteralValue(prop.value)
      if (v === null) return null
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

/**
 * Lê `{ x, y, size, color, vx, vy }` de `SZGame2D.spawnAsteroid(g, {...})`. x/y/vx/vy
 * são expressões; size número; color string. null se alguma chave não casar.
 */
function readAsteroidOptions(
  obj: Node,
  ctx: ParseCtx,
): { x: JSExpr; y: JSExpr; vx: JSExpr; vy: JSExpr; size: number; color: string } | null {
  const num0: JSExpr = { type: 'num', value: 0 }
  const out = {
    x: num0 as JSExpr,
    y: num0 as JSExpr,
    vx: num0 as JSExpr,
    vy: num0 as JSExpr,
    size: 36,
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
    if (key === 'x' || key === 'y' || key === 'vx' || key === 'vy') {
      const v = toExpr(prop.value, ctx)
      if (!isSimpleValue(v)) return null
      out[key] = v
    } else if (key === 'size') {
      const v = numericLiteralValue(prop.value)
      if (v === null) return null
      out.size = v
    } else if (key === 'color') {
      if (prop.value?.type !== 'StringLiteral') return null
      out.color = prop.value.value as string
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
): { x: JSExpr; y: JSExpr; vx: JSExpr; vy: JSExpr; radius: number; color: string } | null {
  const num0: JSExpr = { type: 'num', value: 0 }
  const out = {
    x: num0 as JSExpr,
    y: num0 as JSExpr,
    vx: num0 as JSExpr,
    vy: num0 as JSExpr,
    radius: 5,
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
    if (key === 'x' || key === 'y' || key === 'vx' || key === 'vy') {
      const v = toExpr(prop.value, ctx)
      if (!isSimpleValue(v)) return null
      out[key] = v
    } else if (key === 'radius') {
      const v = numericLiteralValue(prop.value)
      if (v === null) return null
      out.radius = v
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
      const value = numericLiteralValue(args[0])
      return value !== null ? { type: 'g2d:setGravity', value } : null
    }
    case 'playSound': {
      const freq = numericLiteralValue(args[0])
      const durationMs = numericLiteralValue(args[1])
      return freq !== null && durationMs !== null
        ? { type: 'g2d:playSound', freq, durationMs }
        : null
    }
    case 'setImage': {
      // generator: SZGame2D.setImage(sprite, 'nome')
      const spriteVar = identifierName(args[0])
      if (!spriteVar || args[1]?.type !== 'StringLiteral') return null
      return { type: 'g2d:setImage', spriteVar, image: args[1].value as string }
    }
    case 'setAnimation': {
      // generator: SZGame2D.setAnimation(sprite, sheet, from, to, fps)
      const spriteVar = identifierName(args[0])
      const sheetVar = identifierName(args[1])
      const from = numericLiteralValue(args[2])
      const to = numericLiteralValue(args[3])
      const fps = numericLiteralValue(args[4])
      return spriteVar && sheetVar && from !== null && to !== null && fps !== null
        ? { type: 'g2d:animateSprite', spriteVar, sheetVar, from, to, fps }
        : null
    }
    case 'drawFrame': {
      // generator: SZGame2D.drawFrame(ctx, sheet, index, x, y, w, h)
      const ctxVar = identifierName(args[0])
      const sheetVar = identifierName(args[1])
      const index = numericLiteralValue(args[2])
      const x = numericLiteralValue(args[3])
      const y = numericLiteralValue(args[4])
      const w = numericLiteralValue(args[5])
      const h = numericLiteralValue(args[6])
      return ctxVar &&
        sheetVar &&
        index !== null &&
        x !== null &&
        y !== null &&
        w !== null &&
        h !== null
        ? { type: 'g2d:drawFrame', ctxVar, sheetVar, index, x, y, w, h }
        : null
    }
    case 'platformer': {
      // generator: SZGame2D.platformer(sprite, ctx, speed, jump)
      const spriteVar = identifierName(args[0])
      const ctxVar = identifierName(args[1])
      const speed = numericLiteralValue(args[2])
      const jump = numericLiteralValue(args[3])
      return spriteVar && ctxVar && speed !== null && jump !== null
        ? { type: 'g2d:platformer', spriteVar, ctxVar, speed, jump }
        : null
    }
    case 'topDown': {
      const spriteVar = identifierName(args[0])
      const speed = numericLiteralValue(args[1])
      return spriteVar && speed !== null ? { type: 'g2d:topDown', spriteVar, speed } : null
    }
    case 'followPointer': {
      const spriteVar = identifierName(args[0])
      const speed = numericLiteralValue(args[1])
      return spriteVar && speed !== null ? { type: 'g2d:followPointer', spriteVar, speed } : null
    }
    case 'clampToScreen': {
      const spriteVar = identifierName(args[0])
      const ctxVar = identifierName(args[1])
      return spriteVar && ctxVar ? { type: 'g2d:clampToScreen', spriteVar, ctxVar } : null
    }
    case 'flash': {
      // generator: SZGame2D.flash(ctx, "color")
      const ctxVar = identifierName(args[0])
      if (!ctxVar || args[1]?.type !== 'StringLiteral') return null
      return { type: 'g2d:flash', ctxVar, color: args[1].value as string }
    }
    case 'shake': {
      const ctxVar = identifierName(args[0])
      const intensity = numericLiteralValue(args[1])
      return ctxVar && intensity !== null ? { type: 'g2d:shake', ctxVar, intensity } : null
    }
    case 'emitParticles': {
      // generator: SZGame2D.emitParticles(x, y, count, "color")
      const x = numericLiteralValue(args[0])
      const y = numericLiteralValue(args[1])
      const count = numericLiteralValue(args[2])
      if (x === null || y === null || count === null || args[3]?.type !== 'StringLiteral')
        return null
      return { type: 'g2d:emitParticles', x, y, count, color: args[3].value as string }
    }
    case 'drawParticles': {
      const ctxVar = identifierName(args[0])
      return ctxVar ? { type: 'g2d:drawParticles', ctxVar } : null
    }
    case 'drawTileMap': {
      // generator: SZGame2D.drawTileMap(ctx, map, x, y)
      const ctxVar = identifierName(args[0])
      const mapVar = identifierName(args[1])
      const x = numericLiteralValue(args[2])
      const y = numericLiteralValue(args[3])
      return ctxVar && mapVar && x !== null && y !== null
        ? { type: 'g2d:drawTileMap', ctxVar, mapVar, x, y }
        : null
    }
    case 'collideTileMap': {
      // generator: SZGame2D.collideTileMap(sprite, map)
      const spriteVar = identifierName(args[0])
      const mapVar = identifierName(args[1])
      return spriteVar && mapVar ? { type: 'g2d:tileMapCollide', spriteVar, mapVar } : null
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
      const x = numericLiteralValue(args[3])
      const y = numericLiteralValue(args[4])
      const size = numericLiteralValue(args[6])
      if (
        !ctxVar ||
        args[1]?.type !== 'StringLiteral' ||
        !isSimpleValue(value) ||
        x === null ||
        y === null ||
        args[5]?.type !== 'StringLiteral' ||
        size === null
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
      const x = numericLiteralValue(args[2])
      const y = numericLiteralValue(args[3])
      const size = numericLiteralValue(args[5])
      if (
        !ctxVar ||
        args[1]?.type !== 'StringLiteral' ||
        x === null ||
        y === null ||
        args[4]?.type !== 'StringLiteral' ||
        size === null ||
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
      const x = numericLiteralValue(args[2])
      const y = numericLiteralValue(args[3])
      const size = numericLiteralValue(args[4])
      if (
        !ctxVar ||
        !isSimpleValue(count) ||
        x === null ||
        y === null ||
        size === null ||
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
      const x = numericLiteralValue(args[3])
      const y = numericLiteralValue(args[4])
      const w = numericLiteralValue(args[5])
      const h = numericLiteralValue(args[6])
      if (
        !ctxVar ||
        !isSimpleValue(value) ||
        !isSimpleValue(max) ||
        x === null ||
        y === null ||
        w === null ||
        h === null ||
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
      // generator: SZGame2D.showScreen(ctx, "title", "subtitle", "hint", "bg")
      const ctxVar = identifierName(args[0])
      if (
        !ctxVar ||
        args[1]?.type !== 'StringLiteral' ||
        args[2]?.type !== 'StringLiteral' ||
        args[3]?.type !== 'StringLiteral' ||
        args[4]?.type !== 'StringLiteral'
      ) {
        return null
      }
      return {
        type: 'g2d:showScreen',
        ctxVar,
        title: args[1].value as string,
        subtitle: args[2].value as string,
        hint: args[3].value as string,
        bg: args[4].value as string,
      }
    }
    case 'restart':
      return { type: 'g2d:restart' }
    case 'drawStarfield': {
      // generator: SZGame2D.drawStarfield(ctx, speed)
      const ctxVar = identifierName(args[0])
      const speed = numericLiteralValue(args[1])
      return ctxVar && speed !== null ? { type: 'g2d:starfield', ctxVar, speed } : null
    }
    case 'dragX': {
      const spriteVar = identifierName(args[0])
      return spriteVar ? { type: 'g2d:dragX', spriteVar } : null
    }
    case 'fitScreen': {
      const percent = numericLiteralValue(args[0])
      return percent !== null ? { type: 'g2d:fitScreen', percent } : null
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
      const speed = numericLiteralValue(args[1])
      return spriteVar && speed !== null ? { type: 'g2d:arrowsX', spriteVar, speed } : null
    }
    case 'blink': {
      // generator: SZGame2D.blink(sprite, frames)
      const spriteVar = identifierName(args[0])
      const frames = numericLiteralValue(args[1])
      return spriteVar && frames !== null ? { type: 'g2d:blinkSprite', spriteVar, frames } : null
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
    const sprite = readSpriteOptions(args[0])
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
  if (method === 'createGroup') {
    // generator: const g = SZGame2D.createGroup()
    return { type: 'g2d:createGroup', varName: name }
  }
  if (method === 'createShip') {
    // generator: const nave = SZGame2D.createShip({ x, y, w, h, body, wings })
    if (args[0]?.type !== 'ObjectExpression') return null
    const o = readShipOptions(args[0])
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
  if (method === 'loadSpriteSheet') {
    // generator: const v = SZGame2D.loadSpriteSheet('nome', fw, fh)
    if (args[0]?.type !== 'StringLiteral') return null
    const frameW = numericLiteralValue(args[1])
    const frameH = numericLiteralValue(args[2])
    if (frameW === null || frameH === null) return null
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
    const opts = readTileMapOptions(args[0])
    if (!opts) return null
    return { type: 'g2d:createTileMap', varName: name, ...opts }
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
function readBoxOptions(obj: Node): { size: number; color: string } | null {
  const result = { size: 1, color: '#22d3ee' }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (key === 'size') {
      const v = numericLiteralValue(prop.value)
      if (v === null) return null
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

/** Lê `{ radius, color }` de um literal de objeto. null se alguma chave for não-literal/desconhecida. */
function readSphereOptions(obj: Node): { radius: number; color: string } | null {
  const result = { radius: 0.5, color: '#f59e0b' }
  for (const prop of obj.properties ?? []) {
    if (prop?.type !== 'ObjectProperty' || prop.computed) return null
    const key =
      prop.key?.type === 'Identifier'
        ? (prop.key.name as string)
        : prop.key?.type === 'StringLiteral'
          ? (prop.key.value as string)
          : null
    if (key === 'radius') {
      const v = numericLiteralValue(prop.value)
      if (v === null) return null
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

/**
 * SZGame3D.setBackground/setCameraPosition/setPosition/setRotation/animate como
 * statement. ANTES do método genérico — senão viram memberCall. As coordenadas
 * (x/y/z) precisam ser valores representáveis; senão a linha cai em código avançado.
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
    default:
      // createScene/createBox/createSphere são var-init (tryMatchGame3DVarInit);
      // como chamada solta caem no método genérico.
      return null
  }
}

/** `const x = SZGame3D.createScene("id") | createBox(world,{…}) | createSphere(world,{…})`. */
function tryMatchGame3DVarInit(name: string, init: Node, _ctx: ParseCtx): JSStatement | null {
  const call = asSZGame3DCall(init)
  if (!call) return null
  const { method, args } = call
  if (method === 'createScene') {
    if (args[0]?.type !== 'StringLiteral') return null
    return { type: 'g3d:createScene', canvasId: args[0].value as string, varName: name }
  }
  if (method === 'createBox') {
    const worldVar = identifierName(args[0])
    if (!worldVar || args[1]?.type !== 'ObjectExpression') return null
    const box = readBoxOptions(args[1])
    if (!box) return null
    return { type: 'g3d:createBox', varName: name, worldVar, ...box }
  }
  if (method === 'createSphere') {
    const worldVar = identifierName(args[0])
    if (!worldVar || args[1]?.type !== 'ObjectExpression') return null
    const sphere = readSphereOptions(args[1])
    if (!sphere) return null
    return { type: 'g3d:createSphere', varName: name, worldVar, ...sphere }
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

/**
 * `if (SZGame2D.everyFrames("chave", N)) { … }` / `everySeconds` → bloco
 * "a cada N quadros/segundos". A chave (literal estável que o gerador cria) é
 * descartada no parse e recriada no gerar — round-trip continua estável. Só casa
 * SEM `else` (o bloco não tem ramo senão).
 */
function tryMatchEvery(node: Node, source: string, ctx: ParseCtx): JSStatement | null {
  if (node.alternate) return null
  const call = asSZGame2DCall(node.test)
  if (!call) return null
  if (call.method === 'everyFrames') {
    const n = toExpr(call.args[1], ctx)
    if (!isSimpleValue(n)) return null
    return { type: 'g2d:everyFrames', n, body: bodyOfBlock(node.consequent, source, ctx) }
  }
  if (call.method === 'everySeconds') {
    const seconds = numericLiteralValue(call.args[1])
    if (seconds === null) return null
    return { type: 'g2d:everySeconds', seconds, body: bodyOfBlock(node.consequent, source, ctx) }
  }
  return null
}

function mapIf(node: Node, source: string, ctx: ParseCtx): JSStatement {
  // "a cada N quadros/segundos" tem prioridade — é um if (SZGame2D.everyX(...)).
  const every = tryMatchEvery(node, source, ctx)
  if (every) return every
  // if (<condição>) { ... } else { ... } — a condição é qualquer valor
  // representável por bloco (comparação, lógico &&/||, classList.contains,
  // .length, variável…); senão a linha inteira vira código avançado.
  const cond = toExpr(node.test, ctx)
  if (!isSimpleValue(cond)) return asRaw(source, node)
  const thenBody = bodyOfBlock(node.consequent, source, ctx)
  const elseBody = node.alternate ? bodyOfBlock(node.alternate, source, ctx) : undefined
  return {
    type: 'if',
    cond,
    then: thenBody,
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
  // preserva o round-trip do sz_js_repeat.
  if (
    from.type === 'num' &&
    from.value === 0 &&
    to.type === 'num' &&
    step.type === 'num' &&
    step.value === 1
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
    case 'Identifier':
      return { type: 'var', name: node.name }
    // `this` (o elemento atual dentro de um handler).
    case 'ThisExpression':
      return { type: 'thisRef' }
    case 'MemberExpression': {
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
      }
      // event.clientX / event.clientY → posição do clique (sz_val_event_pos).
      if (
        !node.computed &&
        node.object?.type === 'Identifier' &&
        node.object.name === 'event' &&
        node.property?.type === 'Identifier' &&
        (node.property.name === 'clientX' || node.property.name === 'clientY')
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
      // `arr[i]` → item da lista por índice (sz_val_array_index).
      if (node.computed && node.object?.type === 'Identifier' && node.property) {
        const idx = toExpr(node.property, ctx)
        if (isSimpleValue(idx)) return { type: 'index', arrayVar: node.object.name, index: idx }
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
      // (arg * Math.PI / 180) / (arg * 180 / Math.PI) → conversão de ângulo.
      const angle = matchAngleConvert(node, ctx)
      if (angle) return angle
      return tryMatchBinop(node, ctx)
    }
    // `a && b` / `a || b` → operador lógico (sz_val_logic). Aninha cadeias longas.
    case 'LogicalExpression': {
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
      // SZGame2D.keyDown("…") / SZGame2D.touches(a, b) → perguntas (booleanos).
      const g2dExpr = matchGame2DExpr(node)
      if (g2dExpr) return g2dExpr
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
    case 'g2d:sceneIs':
    case 'inputKeyPressed':
    case 'inputPointer':
      return true
    case 'datasetGet':
    case 'classContains':
    case 'shuffle':
    case 'thisRef':
      return true
    case 'concat':
    case 'concatArrays':
      return expr.parts.every(isSimpleValue)
    case 'index':
      return isSimpleValue(expr.index)
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
  targetKind?: 'var' | 'document'
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
