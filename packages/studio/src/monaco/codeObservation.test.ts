import { expect, test } from 'bun:test'
import { studioSourceSha256 } from '@sistemazero/core/studio/code-anchor'
import { createCodeObservationRegistry, type ObservedCodeEditor } from './codeObservation'

function fixture() {
  let source = 'print("😀")',
    version = 1,
    disposed = false,
    path = 'main.py',
    visible = true
  const node = document.createElement('div')
  node.getBoundingClientRect = () => new DOMRect(100, 200, 500, 300)
  const model = {
    uri: { path: 'buffer/main.py', toString: () => 'buffer/main.py' },
    dispose: () => {
      disposed = true
    },
    isDisposed: () => disposed,
    getValue: () => source,
    getVersionId: () => version,
    getOffsetAt: ({ column }: { column: number }) => column - 1,
    getPositionAt: (offset: number) => ({ lineNumber: 1, column: offset + 1 }),
  }
  let active: typeof model | null = model
  const editor: ObservedCodeEditor = {
    getModel: () => active,
    getDomNode: () => node,
    getTargetAtClientPoint: () => ({ position: { lineNumber: 1, column: 8 } }),
    getVisibleRanges: () =>
      visible
        ? [{ startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: source.length + 1 }]
        : [],
    getScrolledVisiblePosition: () => ({ left: 40, top: 10, height: 20 }),
  }
  const registry = createCodeObservationRegistry()
  const unregister = registry.register(editor, () => ({ path, source }))
  return {
    model,
    registry,
    unregister,
    edit: () => {
      source += ' '
      version++
    },
    rename: () => {
      path = 'renamed.py'
    },
    switch: () => {
      active = { ...model }
    },
    hide: () => {
      visible = false
    },
  }
}

test('maps UTF-16 against the observed buffer and uses local scroll geometry', async () => {
  const f = fixture()
  const anchor = await f.registry.anchorAt(10, 10)
  expect(anchor).toEqual({
    kind: 'code',
    id: 'main.py',
    start: 7,
    end: 7,
    modelVersion: 1,
    sourceSha256: await studioSourceSha256('print("😀")'),
  })
  expect(await f.registry.positionOf({ ...anchor!, modelVersion: 999 })).toEqual({
    left: 140,
    top: 220,
  })
  expect(await createCodeObservationRegistry().positionOf(anchor!)).toBeNull()
  f.hide()
  expect(await f.registry.positionOf(anchor!)).toBeNull()
})

for (const change of ['edit', 'rename', 'switch', 'unregister'] as const)
  test(`${change} while hashing cancels the preceding pointer and observer result`, async () => {
    const f = fixture()
    const pending = f.registry.anchorAt(10, 10)
    f[change]()
    expect(await pending).toBeNull()
    const g = fixture(),
      anchor = await g.registry.anchorAt(10, 10)
    const position = g.registry.positionOf(anchor!)
    g[change]()
    expect(await position).toBeNull()
  })

test('a disposed model cannot reappear from an in-flight hash', async () => {
  const f = fixture()
  const pending = f.registry.anchorAt(10, 10)
  f.model.dispose()
  expect(await pending).toBeNull()
})
