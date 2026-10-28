import { type ParserPlugin, parse } from '@babel/parser'
import {
  ProjectStructureAnalysisLimitError,
  type SectionStructureRule,
} from '@sistemazero/core/learning'

/**
 * As IDEIAS de programação lidas do CÓDIGO (18/10/2026, etapa 2 dos objetivos do Estúdio). Os
 * blocos são lidos pela IR; o projeto Pro não tem IR (é uma árvore Vite), e na Ponte a criança
 * pode digitar código que o reverse-parse guarda como `rawJS`, onde a IR não enxerga. Aqui o
 * mesmo vocabulário dos objetivos (laço, variável, função, chamada) é procurado na árvore
 * sintática do código. Server-safe: só o parser do Babel, sem DOM.
 */
export type CodeIdeaRule = Exclude<
  SectionStructureRule,
  { type: 'usesBlock' | 'collectionMemory' | 'changedGamePosition' }
>

/** Quantas vezes cada ideia aparece. Contar (e não só saber se tem) é o que deixa comparar com o
 * projeto inicial: no Pro o modelo já traz laços e dezenas de funções, e só vale o que a criança
 * ACRESCENTOU. */
export interface CodeIdeas {
  loops: number
  variables: ReadonlyMap<string, number>
  functions: ReadonlyMap<string, number>
  calls: ReadonlyMap<string, number>
}

/** Teto de código lido por projeto: exceder torna a análise inconclusiva, sem contagens parciais.
 * Medido: 1,4 MB de TypeScript custa ~700 ms de análise; 500 mil caracteres ficam em ~250 ms. */
export const CODE_IDEAS_MAX_CHARS = 500_000
const MAX_NODES = 200_000
const CODE_FILE = /\.(?:m?js|cjs|jsx|mts|cts|ts|tsx)$/i
/** Configuração do Vite, dependências e os runtimes que a conversão para o Pro copia
 * (`public/sz-*.js`, `public/sz-ext/`) não são o jogo da criança. */
const IGNORED_FILE =
  /(?:^|\/)(?:node_modules|dist)\/|^build\/|(?:^|\/)[^/]*\.config\.[a-z]+$|\.d\.[mc]?ts$|^public\/(?:sz-[^/]*\.js$|sz-ext\/|sw\.js$)/i

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function pluginsFor(name: string): ParserPlugin[] {
  if (/\.tsx$/i.test(name)) return ['typescript', 'jsx']
  if (/\.[mc]?ts$/i.test(name)) return ['typescript']
  return ['jsx']
}

/** `(() => {})`, `fn as Tipo`, `fn satisfies Tipo` e `fn!` continuam sendo a mesma função. */
function unwrap(node: unknown): unknown {
  let current = node
  for (let depth = 0; depth < 20 && record(current); depth++) {
    if (
      [
        'TSAsExpression',
        'TSSatisfiesExpression',
        'TSNonNullExpression',
        'ParenthesizedExpression',
        'TSTypeAssertion',
      ].includes(String(current.type))
    )
      current = current.expression
    else break
  }
  return current
}

const isFunctionValue = (node: unknown) => {
  const value = unwrap(node)
  return record(value) && FUNCTION_VALUE.has(String(value.type))
}

/** O nome de uma propriedade: `obj.pular` e `obj['pular']`, nunca `obj[pular]`. */
function propertyName(member: Record<string, unknown>): string | null {
  if (member.computed) {
    const key = member.property
    return record(key) && key.type === 'StringLiteral' && typeof key.value === 'string'
      ? key.value
      : null
  }
  return nameOf(member.property)
}

function parseCode(file: { name: string; code: string }): unknown {
  const options = (plugins: ParserPlugin[]) => ({
    sourceType: 'unambiguous' as const,
    errorRecovery: true,
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
    plugins,
  })
  try {
    return parse(file.code, options(pluginsFor(file.name)))
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw new ProjectStructureAnalysisLimitError()
    // JSX num .ts ou tipos num .js: um erro sem recuperação jogaria fora o arquivo inteiro.
    try {
      return parse(file.code, options(['typescript', 'jsx']))
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw new ProjectStructureAnalysisLimitError()
      return null
    }
  }
}

function bump(map: Map<string, number>, name: string) {
  map.set(name, (map.get(name) ?? 0) + 1)
}

function nameOf(node: unknown): string | null {
  if (!record(node)) return null
  if (node.type === 'Identifier' && typeof node.name === 'string') return node.name
  if (node.type === 'StringLiteral' && typeof node.value === 'string') return node.value
  if (node.type === 'PrivateName') return nameOf(node.id)
  return null
}

const FUNCTION_VALUE = new Set(['ArrowFunctionExpression', 'FunctionExpression'])
const LOOPS = new Set([
  'ForStatement',
  'WhileStatement',
  'DoWhileStatement',
  'ForOfStatement',
  'ForInStatement',
])

function collectPatternNames(pattern: unknown, into: Set<string>) {
  const stack = [pattern]
  while (stack.length) {
    const node = stack.pop()
    if (!record(node)) continue
    if (node.type === 'Identifier' && typeof node.name === 'string') into.add(node.name)
    else if (node.type === 'ObjectPattern' && Array.isArray(node.properties))
      for (const p of node.properties)
        stack.push(record(p) && p.type === 'RestElement' ? p.argument : record(p) ? p.value : null)
    else if (node.type === 'ArrayPattern' && Array.isArray(node.elements))
      stack.push(...node.elements)
    else if (node.type === 'AssignmentPattern') stack.push(node.left)
    else if (node.type === 'RestElement') stack.push(node.argument)
  }
}

/** Lê arquivos completos. Sintaxe inválida não fornece ideias; limites nunca significam ausência. */
export function collectCodeIdeas(files: readonly { name: string; code: string }[]): CodeIdeas {
  const variables = new Map<string, number>()
  const functions = new Map<string, number>()
  const calls = new Map<string, number>()
  let loops = 0
  let budget = CODE_IDEAS_MAX_CHARS
  let nodes = 0
  for (const file of files) {
    if (file.code.length > budget) throw new ProjectStructureAnalysisLimitError()
    budget -= file.code.length
    const ast = parseCode(file)
    if (!ast) continue
    const stack: unknown[] = [ast]
    while (stack.length) {
      const node = stack.pop()
      if (Array.isArray(node)) {
        for (const child of node) stack.push(child)
        continue
      }
      if (!record(node) || typeof node.type !== 'string') continue
      if (nodes >= MAX_NODES) throw new ProjectStructureAnalysisLimitError()
      nodes++
      const type = node.type
      if (LOOPS.has(type)) loops++
      if (type === 'VariableDeclaration' && node.declare) continue
      if (type === 'VariableDeclarator') {
        const names = new Set<string>()
        collectPatternNames(node.id, names)
        for (const name of names) bump(variables, name)
        const name = nameOf(node.id)
        if (name && isFunctionValue(node.init)) bump(functions, name)
      } else if (type === 'FunctionDeclaration') {
        const name = nameOf(node.id)
        if (name) bump(functions, name)
      } else if (
        type === 'ClassMethod' ||
        type === 'ObjectMethod' ||
        type === 'ClassPrivateMethod'
      ) {
        const name = nameOf(node.key)
        if (name && node.kind !== 'constructor') bump(functions, name)
      } else if (type === 'AssignmentExpression' && isFunctionValue(node.right)) {
        const left = record(node.left) ? node.left : null
        const name =
          left && left.type === 'MemberExpression' ? propertyName(left) : nameOf(node.left)
        if (name) bump(functions, name)
      } else if (
        (type === 'ClassProperty' ||
          type === 'ClassPrivateProperty' ||
          type === 'ObjectProperty') &&
        isFunctionValue(node.value)
      ) {
        const name = nameOf(node.key)
        if (name) bump(functions, name)
      } else if (type === 'CallExpression' || type === 'OptionalCallExpression') {
        const callee = unwrap(node.callee)
        const member =
          record(callee) &&
          (callee.type === 'MemberExpression' || callee.type === 'OptionalMemberExpression')
            ? callee
            : null
        // `pular.call(...)` e `pular.apply(...)` ainda chamam `pular`.
        const viaCall =
          member &&
          ['call', 'apply'].includes(String(propertyName(member))) &&
          record(member.object) &&
          member.object.type === 'Identifier'
        const name = viaCall
          ? nameOf((member as Record<string, unknown>).object)
          : member
            ? propertyName(member)
            : nameOf(callee)
        if (name) {
          bump(calls, name)
          // `lista.forEach(...)` é o laço da IR (`forEach`) escrito em código; `forEach(x)` solto
          // é uma função qualquer com esse nome.
          if (name === 'forEach' && member && !viaCall) loops++
        }
      }
      for (const key in node) {
        if (
          key === 'loc' ||
          key === 'start' ||
          key === 'end' ||
          key === 'extra' ||
          key === 'comments' ||
          key === 'leadingComments' ||
          key === 'trailingComments' ||
          key === 'innerComments' ||
          key === 'errors' ||
          key === 'tokens'
        )
          continue
        const child = node[key]
        if (record(child) || Array.isArray(child)) stack.push(child)
      }
    }
  }
  return { loops, variables, functions, calls }
}

/**
 * A ideia está no código? Com o projeto inicial (`baseline`), só conta o que a criança
 * ACRESCENTOU: mais laços do que o modelo tinha, ou o nome mais vezes do que lá.
 */
export function codeIdeasPass(rule: CodeIdeaRule, ideas: CodeIdeas, baseline?: CodeIdeas): boolean {
  switch (rule.type) {
    case 'usesLoop':
      return ideas.loops > (baseline?.loops ?? 0)
    case 'declaresVariable':
      return (ideas.variables.get(rule.name) ?? 0) > (baseline?.variables.get(rule.name) ?? 0)
    case 'definesFunction':
      return (ideas.functions.get(rule.name) ?? 0) > (baseline?.functions.get(rule.name) ?? 0)
    case 'callsFunction':
      return (ideas.calls.get(rule.name) ?? 0) > (baseline?.calls.get(rule.name) ?? 0)
  }
}

/** O texto `rawJS` que o reverse-parse guardou na IR (o que a criança digitou e virou "código"). */
function rawCodeOfIR(ir: unknown): string[] {
  const out: string[] = []
  const stack = [ir]
  let visited = 0
  while (stack.length) {
    if (visited >= MAX_NODES) throw new ProjectStructureAnalysisLimitError()
    const node = stack.pop()
    visited++
    if (Array.isArray(node)) {
      for (const child of node) stack.push(child)
      continue
    }
    if (!record(node)) continue
    if (node.type === 'rawJS' && typeof node.code === 'string') out.push(node.code)
    for (const key in node) {
      const child = node[key]
      if (record(child) || Array.isArray(child)) stack.push(child)
    }
  }
  return out
}

/**
 * Os arquivos de código de um projeto em que procurar as ideias:
 * - Pro: a árvore do projeto (sem configuração e sem dependências);
 * - clássico com IR: só o código que a IR não traduziu em blocos (`rawJS`), porque o resto o
 *   avaliador de blocos já lê, e o `script.js` gerado traz código de máquina (pré-carregador)
 *   que não é da criança;
 * - clássico sem IR (código da Ponte mais novo que os blocos): o `script.js` e os extras.
 */
export function projectCodeFiles(project: unknown): { name: string; code: string }[] {
  if (!record(project)) return []
  if (project.kind === 'pro') {
    const tree = record(project.tree) ? project.tree : {}
    return Object.entries(tree).flatMap(([name, node]) =>
      CODE_FILE.test(name) &&
      !IGNORED_FILE.test(name) &&
      record(node) &&
      node.kind === 'file' &&
      typeof node.content === 'string'
        ? [{ name, code: node.content }]
        : [],
    )
  }
  if (record(project.ir)) return rawCodeOfIR(project.ir).map((code) => ({ name: 'raw.js', code }))
  const files = record(project.files) ? project.files : {}
  const extras = Array.isArray(project.extraFiles) ? project.extraFiles : []
  return [
    ...(typeof files['script.js'] === 'string'
      ? [{ name: 'script.js', code: files['script.js'] }]
      : []),
    ...extras.flatMap((extra) =>
      record(extra) &&
      typeof extra.name === 'string' &&
      CODE_FILE.test(extra.name) &&
      typeof extra.content === 'string'
        ? [{ name: extra.name, code: extra.content }]
        : [],
    ),
  ]
}

/** Cache por projeto: uma verificação confere várias regras no MESMO projeto. */
const ideasByProject = new WeakMap<object, CodeIdeas>()
export function projectCodeIdeas(project: unknown): CodeIdeas {
  if (record(project)) {
    const known = ideasByProject.get(project)
    if (known) return known
    const ideas = collectCodeIdeas(projectCodeFiles(project))
    ideasByProject.set(project, ideas)
    return ideas
  }
  return collectCodeIdeas([])
}
