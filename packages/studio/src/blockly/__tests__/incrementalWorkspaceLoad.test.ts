import { beforeAll, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import * as Blockly from 'blockly/core'
import { projetosDosCursos } from '../../../../../docs/aulas-interativas-tecnico/qa/matriz-compatibilidade'
import { gameTwoDBlocks } from '../../official-extensions/game-2d/blocks'
import { registerExtensionBlocks } from '../blocks'
import {
  isIncrementalWorkspaceState,
  loadWorkspaceIncrementally,
} from '../incrementalWorkspaceLoad'
import { beginWorkspaceLoad, endWorkspaceLoad, isWorkspaceLoading } from '../loadFence'
import { ensureBlocklyInitialized } from '../setup'

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameTwoDBlocks)
})

for (const { curso, origem, projeto } of projetosDosCursos()) {
  test(`${curso}/${origem}: chunked loading preserves every saved block and connection`, async () => {
    const full = new Blockly.Workspace()
    const incremental = new Blockly.Workspace()
    try {
      if (!isIncrementalWorkspaceState(projeto.blocksState))
        throw new Error('Invalid lesson fixture')
      Blockly.serialization.workspaces.load(projeto.blocksState, full)
      const canonical = Blockly.serialization.workspaces.save(full)
      if (!isIncrementalWorkspaceState(canonical)) throw new Error('Invalid serialized fixture')
      const original = JSON.stringify(canonical)
      let yields = 0
      await loadWorkspaceIncrementally(canonical, incremental, {
        signal: new AbortController().signal,
        chunkBlocks: 1,
        yieldControl: async () => {
          yields++
          expect(Blockly.Events.isEnabled()).toBe(true)
          expect(isWorkspaceLoading(incremental)).toBe(true)
          expect(isWorkspaceLoading(full)).toBe(false)
        },
      })
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
      expect(yields).toBeGreaterThan(0)
      expect(JSON.stringify(canonical)).toBe(original)
      expect(Blockly.serialization.workspaces.save(incremental)).toEqual(canonical)
      expect(isWorkspaceLoading(incremental)).toBe(false)
    } finally {
      full.dispose()
      incremental.dispose()
    }
  })
}

test('workspace fences do not prevent another instance from editing', () => {
  const one = {}
  const two = {}
  beginWorkspaceLoad(one)
  try {
    expect(isWorkspaceLoading(one)).toBe(true)
    expect(isWorkspaceLoading(two)).toBe(false)
    beginWorkspaceLoad(one)
    endWorkspaceLoad(one)
    expect(isWorkspaceLoading(one)).toBe(true)
  } finally {
    endWorkspaceLoad(one)
  }
  expect(isWorkspaceLoading(one)).toBe(false)
})

test('long statement chains do not fragment every input body into a separate load', async () => {
  const workspace = new Blockly.Workspace()
  let root: Blockly.serialization.blocks.State | undefined
  for (let index = 199; index >= 0; index--)
    root = {
      type: 'controls_repeat_ext',
      id: `repeat-body-${index}`,
      inputs: {
        TIMES: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
        DO: {
          block: {
            type: 'controls_if',
            inputs: {
              IF0: { block: { type: 'logic_boolean', fields: { BOOL: 'TRUE' } } },
              DO0: {
                block: {
                  type: 'text_print',
                  inputs: { TEXT: { block: { type: 'math_number', fields: { NUM: 1 } } } },
                },
              },
            },
          },
        },
      },
      ...(root && { next: { block: root } }),
    }
  if (!root) throw new Error('Missing chain fixture')
  let creates = 0
  workspace.addChangeListener((event) => {
    if (event.type === Blockly.Events.BLOCK_CREATE) creates++
  })
  try {
    await loadWorkspaceIncrementally({ blocks: { blocks: [root] } }, workspace, {
      signal: new AbortController().signal,
      yieldControl: () => new Promise((resolve) => setTimeout(resolve, 0)),
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(workspace.getAllBlocks(false).length).toBe(1200)
    // Each create event represents a native append/render pass. The old traversal
    // should batch bodies as well as the surrounding next chain.
    expect(creates).toBeLessThan(64)
  } finally {
    workspace.dispose()
  }
})

test('cancelling between chunks stops future work and releases the workspace fence', async () => {
  const workspace = new Blockly.Workspace()
  const controller = new AbortController()
  const state = {
    blocks: {
      blocks: [
        { type: 'math_number', id: 'one', fields: { NUM: 1 } },
        { type: 'math_number', id: 'two', fields: { NUM: 2 } },
      ],
    },
  }
  try {
    await expect(
      loadWorkspaceIncrementally(state, workspace, {
        signal: controller.signal,
        yieldControl: async () => controller.abort(),
      }),
    ).rejects.toThrow()
    expect(workspace.getBlockById('one') !== null).toBe(true)
    expect(workspace.getBlockById('two')).toBeNull()
    expect(isWorkspaceLoading(workspace)).toBe(false)
    expect(Blockly.Events.isEnabled()).toBe(true)
  } finally {
    workspace.dispose()
  }
})

test('another workspace receives real edits and undo events between load batches', async () => {
  const loading = new Blockly.Workspace()
  const editing = new Blockly.Workspace()
  const received: Blockly.Events.Abstract[] = []
  editing.addChangeListener((event) => received.push(event))
  let edited = false
  try {
    await loadWorkspaceIncrementally(
      { blocks: { blocks: [{ type: 'math_number', id: 'loading-number', fields: { NUM: 1 } }] } },
      loading,
      {
        signal: new AbortController().signal,
        yieldControl: async () => {
          expect(Blockly.Events.isEnabled()).toBe(true)
          expect(isWorkspaceLoading(editing)).toBe(false)
          if (!edited) {
            edited = true
            Blockly.Events.setGroup(true)
            try {
              editing.newBlock('math_number', 'other-number').setFieldValue(7, 'NUM')
            } finally {
              Blockly.Events.setGroup(false)
            }
          }
          await new Promise((resolve) => setTimeout(resolve, 0))
        },
      },
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(received.some((event) => event.type === Blockly.Events.BLOCK_CREATE)).toBe(true)
    expect(editing.getUndoStack().length).toBeGreaterThan(0)
    expect(editing.getBlockById('other-number')?.getFieldValue('NUM')).toBe(7)
    editing.undo(false)
    expect(editing.getBlockById('other-number')).toBeNull()
  } finally {
    loading.dispose()
    editing.dispose()
  }
})

test('10,000 editable blocks retain identities, shadows and connections after chunked loading', async () => {
  const roots: Blockly.serialization.blocks.State[] = []
  for (let area = 0; area < 20; area++) {
    let next: Blockly.serialization.blocks.State | undefined
    for (let i = 248; i >= 0; i--)
      next = {
        type: 'text_print',
        id: `print-${area}-${i}`,
        inputs: {
          TEXT: {
            shadow: { type: 'text', id: `text-${area}-${i}`, fields: { TEXT: `value ${i}` } },
          },
        },
        ...(next && { next: { block: next } }),
      }
    roots.push({
      type: 'controls_repeat_ext',
      id: `repeat-${area}`,
      x: area * 200,
      y: 0,
      inputs: {
        TIMES: { shadow: { type: 'math_number', id: `count-${area}`, fields: { NUM: 3 } } },
        DO: { block: next },
      },
    })
  }
  const full = new Blockly.Workspace()
  const incremental = new Blockly.Workspace()
  const digest = (value: unknown) =>
    createHash('sha256').update(JSON.stringify(value)).digest('hex')
  try {
    Blockly.serialization.workspaces.load({ blocks: { blocks: roots } }, full)
    expect(full.getAllBlocks(false).length).toBe(10_000)
    const canonical = Blockly.serialization.workspaces.save(full)
    if (!isIncrementalWorkspaceState(canonical)) throw new Error('Invalid stress fixture')
    const before = digest(canonical)
    await loadWorkspaceIncrementally(canonical, incremental, {
      signal: new AbortController().signal,
      yieldControl: async () => {},
    })
    expect(incremental.getAllBlocks(false).length).toBe(10_000)
    expect(digest(Blockly.serialization.workspaces.save(incremental))).toBe(before)
    expect(digest(canonical)).toBe(before)
  } finally {
    full.dispose()
    incremental.dispose()
  }
  // Integrity compares two complete 10k models; 5s Bun's default is not a latency SLA.
}, 30_000)
