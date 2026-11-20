import type { ExecutionJson, FunctionCase } from '@sistemazero/core/learning'

/**
 * O teste de função da aba Meus testes no Python (prancha "Meus testes no Pro", que o Python
 * segue: "Depois você escreve o que ela recebe e o que ela tem de responder, um caso por linha").
 * Cada linha é o que a função recebe, uma seta e o que ela tem de responder, escritos como no
 * Python: `2, 3 -> 5`, `"Ana" -> "Olá, Ana"`, `[1, 2] -> 3`, `-> True`. Os valores viram JSON no
 * contrato dos objetivos (`FunctionCase`), e voltam a ser escritos como no Python ao editar.
 */

/** A função que a aba oferece: o nome e o arquivo (sem arquivo, o `main.py`). */
export interface PythonTestFunction {
  name: string
  module?: string
}

const DEF = /^def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/gm

/**
 * As funções de cada arquivo `.py` do projeto, as de nível de cima (`def` no começo da linha),
 * na ordem dos arquivos: primeiro o `main.py`. Funções com o mesmo nome em arquivos diferentes
 * aparecem as duas (o arquivo vai junto).
 */
export function pythonTestFunctions(
  files: Readonly<Record<string, string>>,
  entrypoint = 'main.py',
): PythonTestFunction[] {
  const paths = Object.keys(files)
    .filter((path) => path.endsWith('.py'))
    .sort((a, b) => (a === entrypoint ? -1 : b === entrypoint ? 1 : a.localeCompare(b)))
  const found: PythonTestFunction[] = []
  const seen = new Set<string>()
  for (const path of paths) {
    for (const match of (files[path] ?? '').matchAll(DEF)) {
      const name = match[1]
      if (!name || name.startsWith('__')) continue
      const key = `${path}:${name}`
      if (seen.has(key)) continue
      seen.add(key)
      found.push(path === entrypoint ? { name } : { name, module: path })
    }
  }
  return found
}

/** A chave de uma função no `<select>` (o arquivo e o nome). */
export const functionKey = (fn: PythonTestFunction) =>
  fn.module ? `${fn.module}:${fn.name}` : fn.name

/** Um valor escrito como no Python (`True`, `None`, `"texto"`, `[1, 2]`). */
export function pythonLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'None'
  if (value === true) return 'True'
  if (value === false) return 'False'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'None'
  if (typeof value === 'string') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(pythonLiteral).join(', ')}]`
  if (typeof value === 'object')
    return `{${Object.entries(value)
      .map(([key, item]) => `${JSON.stringify(key)}: ${pythonLiteral(item)}`)
      .join(', ')}}`
  return String(value)
}

/** A chamada de um caso como a criança a lê: `dobro(2)`. */
export function pythonCall(name: string, args: readonly unknown[]): string {
  return `${name}(${args.map(pythonLiteral).join(', ')})`
}

/** Os casos do teste, de volta ao texto da caixa (um por linha). */
export function pythonCasesText(
  cases: readonly { args: readonly unknown[]; expected: unknown }[],
): string {
  return cases
    .map((item) => {
      const args = item.args.map(pythonLiteral).join(', ')
      return args
        ? `${args} -> ${pythonLiteral(item.expected)}`
        : `-> ${pythonLiteral(item.expected)}`
    })
    .join('\n')
}

class Unreadable extends Error {}

/** Lê os valores de uma linha, como no Python, até o fim ou até a seta. */
function reader(line: string) {
  let at = 0
  const space = () => {
    while (at < line.length && /\s/.test(line[at] ?? '')) at++
  }
  const arrow = () => {
    space()
    if (line.startsWith('->', at)) return 2
    if (line[at] === '→') return 1
    return 0
  }
  const value = (depth: number): ExecutionJson => {
    if (depth > 8) throw new Unreadable()
    space()
    const char = line[at]
    if (char === '"' || char === "'") {
      at++
      let text = ''
      while (at < line.length && line[at] !== char) {
        if (line[at] === '\\') {
          const next = line[at + 1]
          text += next === 'n' ? '\n' : next === 't' ? '\t' : (next ?? '')
          at += 2
          continue
        }
        text += line[at]
        at++
      }
      if (line[at] !== char) throw new Unreadable()
      at++
      return text
    }
    if (char === '[' || char === '(') {
      const close = char === '[' ? ']' : ')'
      at++
      const items: ExecutionJson[] = []
      space()
      while (line[at] !== close) {
        items.push(value(depth + 1))
        space()
        if (line[at] === ',') {
          at++
          space()
        } else if (line[at] !== close) throw new Unreadable()
      }
      at++
      return items
    }
    if (char === '{') {
      at++
      const entries: Record<string, ExecutionJson> = {}
      space()
      while (line[at] !== '}') {
        const key = value(depth + 1)
        if (typeof key !== 'string') throw new Unreadable()
        space()
        if (line[at] !== ':') throw new Unreadable()
        at++
        entries[key] = value(depth + 1)
        space()
        if (line[at] === ',') {
          at++
          space()
        } else if (line[at] !== '}') throw new Unreadable()
      }
      at++
      return entries
    }
    const number = /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(line.slice(at))
    if (number) {
      at += number[0].length
      return Number(number[0])
    }
    const word = /^[A-Za-z_]+/.exec(line.slice(at))?.[0]
    if (word === 'True' || word === 'False' || word === 'None') {
      at += word.length
      return word === 'True' ? true : word === 'False' ? false : null
    }
    throw new Unreadable()
  }
  return {
    /** O que a função recebe: valores separados por vírgula até a seta. */
    args(): ExecutionJson[] {
      const args: ExecutionJson[] = []
      if (arrow()) return args
      for (;;) {
        args.push(value(0))
        space()
        if (line[at] === ',') {
          at++
          continue
        }
        if (arrow()) return args
        throw new Unreadable()
      }
    },
    /** A seta e o que a função tem de responder, até o fim da linha. */
    expected(): ExecutionJson {
      const size = arrow()
      if (!size) throw new Unreadable()
      at += size
      const result = value(0)
      space()
      if (at < line.length) throw new Unreadable()
      return result
    },
  }
}

export type CasesProblem = 'tests.form.needCases' | 'tests.form.badCase' | 'tests.form.tooManyCases'

/** As linhas da caixa como casos, ou o problema que impede salvar. */
export function parsePythonCases(
  text: string,
  max: number,
): { cases: FunctionCase[] } | { problem: CasesProblem } {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0) return { problem: 'tests.form.needCases' }
  if (lines.length > max) return { problem: 'tests.form.tooManyCases' }
  const cases: FunctionCase[] = []
  for (const line of lines) {
    try {
      const read = reader(line)
      const args = read.args()
      cases.push({ args, expected: read.expected() })
    } catch (error) {
      if (error instanceof Unreadable) return { problem: 'tests.form.badCase' }
      throw error
    }
  }
  return { cases }
}
