import { beforeAll, describe, expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import { BEHAVIOR_AREAS_STATE_KEY, BEHAVIOR_AREAS_STATE_VERSION } from '../blocksStateVersion'
import { jsonPlainCopy } from '../jsonPlainCopy'
import { saveWorkspaceState } from '../savedWorkspaceState'
import { ensureBlocklyInitialized } from '../setup'

beforeAll(() => {
  ensureBlocklyInitialized()
})

/** Todo objeto e lista do valor, sem recursão (o estado de teste é uma cadeia longa). */
function containers(value: unknown): object[] {
  const found: object[] = []
  const pending: unknown[] = [value]
  while (pending.length > 0) {
    const current = pending.pop()
    if (current === null || typeof current !== 'object') continue
    found.push(current)
    pending.push(...Object.values(current))
  }
  return found
}

function chainState(length: number) {
  const root: Record<string, unknown> = { type: 'controls_if', id: 'b0' }
  let cursor = root
  for (let index = 1; index < length; index++) {
    const block: Record<string, unknown> = { type: 'controls_if', id: `b${index}` }
    cursor.next = { block }
    cursor = block
  }
  return { blocks: { languageVersion: 0, blocks: [root] } }
}

describe('o estado que sai do Blockly', () => {
  test('só tem objetos e listas comuns, nunca um objeto sem protótipo', () => {
    const workspace = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(chainState(40), workspace)
      // O próprio Blockly devolve objetos sem protótipo: é o que faz o V8 recursar.
      const raw = Blockly.serialization.workspaces.save(workspace)
      expect(containers(raw).some((item) => Object.getPrototypeOf(item) === null)).toBe(true)

      const saved = saveWorkspaceState(workspace)
      const all = containers(saved)
      expect(all.length).toBeGreaterThan(40)
      for (const item of all)
        expect(Object.getPrototypeOf(item)).toBe(
          Array.isArray(item) ? Array.prototype : Object.prototype,
        )
      expect((saved as Record<string, unknown>)[BEHAVIOR_AREAS_STATE_KEY]).toBe(
        BEHAVIOR_AREAS_STATE_VERSION,
      )
      // O conteúdo é o mesmo que o save do Blockly, só em objetos comuns.
      expect(JSON.stringify(saved)).toBe(
        JSON.stringify({ ...raw, [BEHAVIOR_AREAS_STATE_KEY]: BEHAVIOR_AREAS_STATE_VERSION }),
      )
    } finally {
      workspace.dispose()
    }
  })
})

describe('jsonPlainCopy', () => {
  test('devolve o mesmo que JSON.parse(JSON.stringify(...))', () => {
    const nullProto = Object.assign(Object.create(null), { a: 1, b: [1, Number.NaN, undefined] })
    const sample = {
      text: 'olá',
      yes: true,
      none: null,
      infinite: Number.POSITIVE_INFINITY,
      missing: undefined,
      fn: () => 1,
      list: [undefined, () => 2, Symbol('x'), 3, { deep: [{}] }],
      nested: nullProto,
      date: new Date(0),
      withJson: { toJSON: (key: string) => `chave:${key}` },
    }
    expect(jsonPlainCopy(sample)).toEqual(JSON.parse(JSON.stringify(sample)))
    expect(JSON.stringify(jsonPlainCopy(sample))).toBe(JSON.stringify(sample))
  })

  test('a chave __proto__ vira propriedade própria, como no JSON.parse', () => {
    const source = JSON.parse('{"__proto__":{"x":1},"y":2}')
    const copy = jsonPlainCopy(source) as Record<string, unknown>
    expect(Object.getPrototypeOf(copy)).toBe(Object.prototype)
    expect(Object.hasOwn(copy, '__proto__')).toBe(true)
    expect(JSON.stringify(copy)).toBe('{"__proto__":{"x":1},"y":2}')
  })

  test('referência circular lança, e referência repetida sem ciclo não', () => {
    const shared = { n: 1 }
    expect(jsonPlainCopy({ a: shared, b: shared })).toEqual({ a: { n: 1 }, b: { n: 1 } })
    const loop: Record<string, unknown> = {}
    loop.self = loop
    expect(() => jsonPlainCopy(loop)).toThrow(TypeError)
  })

  test('copia uma cadeia muito mais funda que a pilha', () => {
    let deepest: Record<string, unknown> = Object.create(null)
    const root = deepest
    for (let index = 0; index < 200_000; index++) {
      const next = Object.create(null)
      deepest.next = { block: next }
      deepest = next
    }
    const copy = jsonPlainCopy(root) as Record<string, unknown>
    let depth = 0
    let cursor: Record<string, unknown> | undefined = copy
    while (cursor?.next) {
      cursor = (cursor.next as { block: Record<string, unknown> }).block
      depth++
    }
    expect(depth).toBe(200_000)
  })
})
