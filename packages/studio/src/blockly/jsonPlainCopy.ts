/**
 * O mesmo valor que `JSON.parse(JSON.stringify(valor))` devolveria, sem recursão e só com objetos
 * comuns.
 *
 * Por que existe: o Blockly monta o estado salvo com `Object.create(null)`. O `JSON.stringify` do
 * V8 só anda sem recursão em objetos comuns; nos sem protótipo ele cai no caminho recursivo e
 * estoura a pilha numa cadeia `next` longa. Medido no Chromium 156: 811 elos sem protótipo, mais de
 * 2 milhões com objetos comuns (`docs/estudio-evolucao/classico-em-escala.md`). Com 10 mil blocos o
 * estado não virava texto e nenhuma edição chegava ao código.
 *
 * Segue o `SerializeJSONProperty` da especificação, passo a passo (revisão do lote 1, 21/11/2026,
 * achou os desvios da primeira versão):
 * - `toJSON` é chamado em objeto, função e BigInt, com a chave como argumento (`''` na raiz);
 * - número, texto e booleano embrulhados (`new Number(5)`) viram o primitivo, pelo slot interno;
 * - número não finito vira `null` e `-0` vira `0`;
 * - BigInt sem `toJSON` lança `TypeError`;
 * - `undefined`, função e símbolo somem de objeto e viram `null` em lista; na raiz, o
 *   `JSON.stringify` devolve `undefined` e o `JSON.parse` lança `SyntaxError`, e aqui também;
 * - referência circular lança `TypeError`;
 * - a chave `__proto__` vira propriedade própria, como no `JSON.parse`.
 */

const OMIT = Symbol('omit')

type Container = Record<string, unknown> | unknown[]
type Work = { value: unknown; target: Container; key: string; inArray: boolean } | { leave: object }

const objectToString = Object.prototype.toString

/** O slot interno existe se o `valueOf` do protótipo nativo aceita o valor (a régua da especificação). */
function hasSlot(nativeValueOf: (this: unknown) => unknown, value: object): boolean {
  try {
    nativeValueOf.call(value)
    return true
  } catch {
    return false
  }
}

/**
 * Número, texto, booleano e BigInt embrulhados viram o primitivo. Sem `Symbol.toStringTag`, o
 * `Object.prototype.toString` diz o slot interno sem lançar nada: é o caminho dos objetos comuns
 * (todo o estado do Blockly). Com a marca (BigInt embrulhado, Map, lista tipada, ou alguém
 * fingindo), confere o slot pelo `valueOf` nativo.
 */
function unwrapPrimitive(value: object): unknown {
  if (Symbol.toStringTag in value) {
    if (hasSlot(Number.prototype.valueOf, value)) return Number(value)
    if (hasSlot(String.prototype.valueOf, value)) return String(value)
    if (hasSlot(Boolean.prototype.valueOf, value)) return Boolean.prototype.valueOf.call(value)
    if (hasSlot(BigInt.prototype.valueOf, value)) return BigInt.prototype.valueOf.call(value)
    return value
  }
  switch (objectToString.call(value)) {
    case '[object Number]':
      return Number(value)
    case '[object String]':
      return String(value)
    case '[object Boolean]':
      return Boolean.prototype.valueOf.call(value)
    default:
      return value
  }
}

/** O valor depois do `toJSON` e dos embrulhos: um primitivo do JSON, `OMIT` ou um objeto a copiar. */
function resolve(value: unknown, key: string): unknown {
  let current = value
  if (
    (typeof current === 'object' && current !== null) ||
    typeof current === 'function' ||
    typeof current === 'bigint'
  ) {
    const toJSON = (current as { toJSON?: unknown }).toJSON
    if (typeof toJSON === 'function') current = toJSON.call(current, key)
  }
  if (typeof current === 'object' && current !== null) current = unwrapPrimitive(current)
  if (current === null || typeof current === 'string' || typeof current === 'boolean')
    return current
  if (typeof current === 'number') {
    if (!Number.isFinite(current)) return null
    return current === 0 ? 0 : current
  }
  if (typeof current === 'bigint') throw new TypeError('Do not know how to serialize a BigInt')
  if (typeof current === 'object') return current
  return OMIT
}

function place(target: Container, key: string, value: unknown, inArray: boolean): void {
  if (value === OMIT) {
    if (inArray) (target as unknown[])[Number(key)] = null
    return
  }
  if (key === '__proto__')
    Object.defineProperty(target, key, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    })
  else (target as Record<string, unknown>)[key] = value
}

export function jsonPlainCopy(input: unknown): unknown {
  const holder: Record<string, unknown> = {}
  const pending: Work[] = [{ value: input, target: holder, key: '', inArray: false }]
  const ancestors = new Set<object>()
  while (pending.length > 0) {
    const work = pending.pop() as Work
    if ('leave' in work) {
      ancestors.delete(work.leave)
      continue
    }
    const value = resolve(work.value, work.key)
    if (value === null || typeof value !== 'object') {
      place(work.target, work.key, value, work.inArray)
      continue
    }
    if (ancestors.has(value)) throw new TypeError('Converting circular structure to JSON')
    const source = value as Record<string, unknown> | unknown[]
    const array = Array.isArray(source)
    const copy: Container = array ? new Array(source.length) : {}
    place(work.target, work.key, copy, work.inArray)
    ancestors.add(source)
    pending.push({ leave: source })
    if (array) {
      for (let index = source.length - 1; index >= 0; index--)
        pending.push({ value: source[index], target: copy, key: String(index), inArray: true })
    } else {
      const keys = Object.keys(source)
      for (let index = keys.length - 1; index >= 0; index--) {
        const key = keys[index] as string
        pending.push({ value: source[key], target: copy, key, inArray: false })
      }
    }
  }
  if (!Object.hasOwn(holder, '')) throw new SyntaxError('"undefined" is not valid JSON')
  return holder['']
}

type TextFrame =
  | { kind: 'array'; source: unknown[]; index: number }
  | {
      kind: 'object'
      source: Record<string, unknown>
      keys: string[]
      index: number
      wrote: boolean
    }

/**
 * O mesmo texto que `JSON.stringify(valor)` devolveria (sem `replacer` nem recuo), sem recursão.
 *
 * Por que existe (lote 3, conserto B, 21/11/2026): numa sequência única de 10 mil blocos o estado
 * do Blockly é uma cadeia `next` de 20 mil níveis, e o `JSON.stringify` nativo estoura a pilha no
 * Chromium (o seletor da barra que procura blocos 3D derrubava o editor inteiro), no Firefox (a
 * partir de ~2 mil elos, mesmo em objetos comuns) e no JavaScriptCore (20 mil). As regras são as
 * de `resolve`, as mesmas da `jsonPlainCopy`; texto e chaves são escritos pelo próprio
 * `JSON.stringify`, que não recursa num valor primitivo.
 */
export function jsonStringify(input: unknown): string | undefined {
  const root = resolve(input, '')
  if (root === OMIT) return undefined
  const out: string[] = []
  const stack: TextFrame[] = []
  const ancestors = new Set<object>()
  const emit = (value: unknown) => {
    if (value === null || typeof value !== 'object') {
      out.push(JSON.stringify(value))
      return
    }
    if (ancestors.has(value)) throw new TypeError('Converting circular structure to JSON')
    ancestors.add(value)
    if (Array.isArray(value)) {
      out.push('[')
      stack.push({ kind: 'array', source: value, index: 0 })
    } else {
      out.push('{')
      const source = value as Record<string, unknown>
      stack.push({ kind: 'object', source, keys: Object.keys(source), index: 0, wrote: false })
    }
  }
  emit(root)
  while (stack.length > 0) {
    const top = stack[stack.length - 1] as TextFrame
    if (top.kind === 'array') {
      if (top.index >= top.source.length) {
        out.push(']')
        stack.pop()
        ancestors.delete(top.source)
        continue
      }
      if (top.index > 0) out.push(',')
      const index = top.index++
      const value = resolve(top.source[index], String(index))
      if (value === OMIT) out.push('null')
      else emit(value)
      continue
    }
    let descended = false
    while (top.index < top.keys.length) {
      const key = top.keys[top.index++] as string
      const value = resolve(top.source[key], key)
      if (value === OMIT) continue
      if (top.wrote) out.push(',')
      top.wrote = true
      out.push(JSON.stringify(key), ':')
      const depth = stack.length
      emit(value)
      if (stack.length > depth) {
        descended = true
        break
      }
    }
    if (!descended) {
      out.push('}')
      stack.pop()
      ancestors.delete(top.source)
    }
  }
  return out.join('')
}
