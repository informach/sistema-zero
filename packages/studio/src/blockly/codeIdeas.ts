import { type ParserPlugin, parse } from '@babel/parser'
import type { SectionStructureRule } from '@sistemazero/core/learning'

/**
 * As IDEIAS de programação lidas do CÓDIGO (18/10/2026, etapa 2 dos objetivos do Estúdio). Os
 * blocos são lidos pela IR; o projeto Pro não tem IR (é uma árvore Vite), e na Ponte a criança
 * pode digitar código que o reverse-parse guarda como `rawJS`, onde a IR não enxerga. Aqui o
 * mesmo vocabulário dos objetivos (laço, variável, função, chamada) é procurado na árvore
 * sintática do código. Server-safe: só o parser do Babel, sem DOM.
 */
export type CodeIdeaRule = Exclude<SectionStructureRule, { type: 'usesBlock' }>

export interface CodeIdeas {
  loops: boolean
  variables: ReadonlySet<string>
  functions: ReadonlySet<string>
  calls: ReadonlySet<string>
}

/** Teto de código lido por projeto: o resto é ignorado (um objetivo nunca trava o servidor). */
export const CODE_IDEAS_MAX_CHARS = 2_000_000
const MAX_NODES = 400_000
const CODE_FILE = /\.(?:m?js|cjs|jsx|ts|tsx)$/i
/** Configuração do Vite e afins não são o jogo da criança. */
const IGNORED_FILE =
  /(?:^|\/)(?:node_modules|dist|build)\/|(?:^|\/)[^/]*\.config\.[a-z]+$|\.d\.ts$/i

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function pluginsFor(name: string): ParserPlugin[] {
  if (/\.tsx$/i.test(name)) return ['typescript', 'jsx']
  if (/\.ts$/i.test(name)) return ['typescript']
  return ['jsx']
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

/** Lê as ideias de uma lista de arquivos de código. Arquivo que não analisa é pulado. */
export function collectCodeIdeas(files: readonly { name: string; code: string }[]): CodeIdeas {
  const variables = new Set<string>()
  const functions = new Set<string>()
  const calls = new Set<string>()
  let loops = false
  let budget = CODE_IDEAS_MAX_CHARS
  let nodes = 0
  for (const file of files) {
    if (budget <= 0) break
    if (file.code.length > budget) continue
    budget -= file.code.length
    let ast: unknown
    try {
      ast = parse(file.code, {
        sourceType: 'unambiguous',
        errorRecovery: true,
        allowReturnOutsideFunction: true,
        allowAwaitOutsideFunction: true,
        plugins: pluginsFor(file.name),
      })
    } catch {
      continue
    }
    const stack: unknown[] = [ast]
    while (stack.length && nodes < MAX_NODES) {
      const node = stack.pop()
      if (Array.isArray(node)) {
        for (const child of node) stack.push(child)
        continue
      }
      if (!record(node) || typeof node.type !== 'string') continue
      nodes++
      const type = node.type
      if (LOOPS.has(type)) loops = true
      if (type === 'VariableDeclarator') {
        collectPatternNames(node.id, variables)
        const name = nameOf(node.id)
        if (name && record(node.init) && FUNCTION_VALUE.has(String(node.init.type)))
          functions.add(name)
      } else if (type === 'FunctionDeclaration') {
        const name = nameOf(node.id)
        if (name) functions.add(name)
      } else if (
        type === 'ClassMethod' ||
        type === 'ObjectMethod' ||
        type === 'ClassPrivateMethod'
      ) {
        const name = nameOf(node.key)
        if (name && node.kind !== 'constructor') functions.add(name)
      } else if (type === 'AssignmentExpression' && record(node.right)) {
        if (FUNCTION_VALUE.has(String(node.right.type))) {
          const target =
            record(node.left) && node.left.type === 'MemberExpression'
              ? node.left.property
              : node.left
          const name = nameOf(target)
          if (name) functions.add(name)
        }
      } else if (
        (type === 'ClassProperty' || type === 'ObjectProperty') &&
        record(node.value) &&
        FUNCTION_VALUE.has(String(node.value.type))
      ) {
        const name = nameOf(node.key)
        if (name) functions.add(name)
      } else if (type === 'CallExpression' || type === 'OptionalCallExpression') {
        const callee = node.callee
        const name =
          record(callee) &&
          (callee.type === 'MemberExpression' || callee.type === 'OptionalMemberExpression')
            ? nameOf(callee.property)
            : nameOf(callee)
        if (name) {
          calls.add(name)
          // `lista.forEach(...)` é o laço da IR (`forEach`) escrito em código.
          if (name === 'forEach') loops = true
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

export function codeIdeasPass(rule: CodeIdeaRule, ideas: CodeIdeas): boolean {
  switch (rule.type) {
    case 'usesLoop':
      return ideas.loops
    case 'declaresVariable':
      return ideas.variables.has(rule.name)
    case 'definesFunction':
      return ideas.functions.has(rule.name)
    case 'callsFunction':
      return ideas.calls.has(rule.name)
  }
}

/** O texto `rawJS` que o reverse-parse guardou na IR (o que a criança digitou e virou "código"). */
function rawCodeOfIR(ir: unknown): string[] {
  const out: string[] = []
  const stack = [ir]
  let visited = 0
  while (stack.length && visited < MAX_NODES) {
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
