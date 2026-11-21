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
 * Regras do JSON mantidas: número não finito vira `null`; `undefined`, função e símbolo somem de
 * objeto e viram `null` em lista; `toJSON` é chamado; referência circular lança `TypeError`. A
 * chave `__proto__` vira propriedade própria, como no `JSON.parse`.
 */

const OMIT = Symbol('omit')

type Container = Record<string, unknown> | unknown[]
type Work = { value: unknown; target: Container; key: string; inArray: boolean } | { leave: object }

function leaf(value: unknown): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'bigint') throw new TypeError('Do not know how to serialize a BigInt')
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
  const pending: Work[] = [{ value: input, target: holder, key: 'value', inArray: false }]
  const ancestors = new Set<object>()
  while (pending.length > 0) {
    const work = pending.pop() as Work
    if ('leave' in work) {
      ancestors.delete(work.leave)
      continue
    }
    let value = work.value
    if (
      value !== null &&
      typeof value === 'object' &&
      typeof (value as { toJSON?: unknown }).toJSON === 'function'
    )
      value = (value as { toJSON(key: string): unknown }).toJSON(work.key)
    if (value === null || typeof value !== 'object') {
      place(work.target, work.key, leaf(value), work.inArray)
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
  return holder.value
}
