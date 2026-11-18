import * as Blockly from 'blockly/core'
import { beginWorkspaceLoad, endWorkspaceLoad } from './loadFence'

type BlockState = Blockly.serialization.blocks.State
interface Attachment {
  parentId: string
  childId: string
  input: string | null
}
interface Chunk {
  state: BlockState
  count: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isBlockState(value: unknown): value is BlockState {
  return isRecord(value) && typeof value.type === 'string'
}

/** Shape dispatch only; native Blockly still validates every serialized block. */
export function isIncrementalWorkspaceState(value: unknown): value is IncrementalWorkspaceState {
  if (!isRecord(value) || !isRecord(value.blocks)) return false
  return Array.isArray(value.blocks.blocks) && value.blocks.blocks.every(isBlockState)
}

export function serializedWorkspaceBlockCount(
  state: IncrementalWorkspaceState,
  stopAt = Infinity,
): number {
  const pending = [...state.blocks.blocks]
  let count = 0
  while (pending.length && count < stopAt) {
    const block = pending.pop()
    if (!block) break
    count++
    for (const connection of Object.values(block.inputs ?? {})) {
      const child = connection.block ?? connection.shadow
      if (child) pending.push(child)
    }
    const next = block.next?.block ?? block.next?.shadow
    if (next) pending.push(next)
  }
  return count
}

/** Copy the editable state, never the student's source or an opaque generated block. */
function copyBlock(source: BlockState): BlockState {
  return {
    ...source,
    id: source.id ?? Blockly.utils.idGenerator.genUid(),
    ...(source.inputs && {
      inputs: Object.fromEntries(
        Object.entries(source.inputs).map(([key, value]) => [key, { ...value }]),
      ),
    }),
    ...(source.next && { next: { ...source.next } }),
  }
}

/** Iterative partitioning also handles long next chains without recursive copying. */
function partition(roots: readonly BlockState[], maximum: number) {
  const chunks: Chunk[] = []
  const attachments: Attachment[] = []
  const pending: { copy: BlockState; chunk: Chunk }[] = []
  for (const source of roots) {
    const copy = copyBlock(source)
    const chunk = { state: copy, count: 1 }
    chunks.push(chunk)
    pending.push({ copy, chunk })
  }
  while (pending.length) {
    const item = pending.pop()
    if (!item) break
    const connections = [
      ...Object.entries(item.copy.inputs ?? {}).map(([input, connection]) => ({
        input,
        connection,
      })),
      ...(item.copy.next ? [{ input: null, connection: item.copy.next }] : []),
    ]
    for (const { input, connection } of connections) {
      const source = connection.block
      if (!source) continue
      const copy = copyBlock(source)
      let chunk = item.chunk
      if (chunk.count >= maximum) {
        if (!item.copy.id || !copy.id) throw new Error('Missing block identity during load')
        chunk = { state: copy, count: 0 }
        // Temporary roots must not collide with real stacks or each other while
        // Blockly renders them. Connecting later restores their actual layout.
        copy.x = 1_000_000 + (chunks.length % 32) * 32_768
        copy.y = Math.floor(chunks.length / 32) * 32_768
        chunks.push(chunk)
        attachments.push({ parentId: item.copy.id, childId: copy.id, input })
        delete connection.block
      } else connection.block = copy
      chunk.count++
      pending.push({ copy, chunk })
    }
  }
  return { chunks, attachments }
}

function withoutEvents<T>(operation: () => T): T {
  Blockly.Events.disable()
  try {
    return operation()
  } finally {
    Blockly.Events.enable()
  }
}

export interface IncrementalWorkspaceState extends Record<string, unknown> {
  blocks: { languageVersion?: number; blocks: BlockState[] }
}

/**
 * Loading is an exclusive operation on this workspace. The caller keeps the full
 * project authoritative and blocks edits/history until this promise settles.
 * No global Blockly event fence survives an await; other editors remain editable.
 */
export async function loadWorkspaceIncrementally(
  state: IncrementalWorkspaceState,
  workspace: Blockly.Workspace,
  options: {
    signal: AbortSignal
    chunkBlocks?: number
    yieldControl?: () => Promise<void>
  },
): Promise<void> {
  const maximum = options.chunkBlocks ?? 64
  if (!Number.isSafeInteger(maximum) || maximum < 1)
    throw new Error('Invalid incremental workspace chunk size')
  const check = () => options.signal.throwIfAborted()
  const yieldControl =
    options.yieldControl ?? (() => new Promise<void>((resolve) => setTimeout(resolve, 0)))
  check()
  const { chunks, attachments } = partition(state.blocks.blocks, maximum)
  beginWorkspaceLoad(workspace)
  let released = false
  const release = () => {
    if (released) return
    released = true
    endWorkspaceLoad(workspace)
  }
  options.signal.addEventListener('abort', release, { once: true })
  async function batches<T>(items: readonly T[], operation: (item: T) => void): Promise<void> {
    let index = 0
    while (index < items.length) {
      check()
      const start = performance.now()
      const first = index === 0
      // The native cache is synchronous by contract: never retain it over a yield.
      Blockly.utils.dom.startTextWidthCache()
      try {
        do {
          check()
          const item = items[index++]
          if (item === undefined) throw new Error('Missing workspace load item')
          operation(item)
        } while (!first && index < items.length && performance.now() - start < 8)
      } finally {
        Blockly.utils.dom.stopTextWidthCache()
      }
      await yieldControl()
    }
  }
  try {
    withoutEvents(() =>
      Blockly.serialization.workspaces.load(
        { ...state, blocks: { ...state.blocks, blocks: [] } },
        workspace,
      ),
    )
    await batches(chunks, (chunk) => Blockly.serialization.blocks.append(chunk.state, workspace))
    // Descendants first: no new chunk is loaded under an already-long ancestor chain.
    await batches(attachments.reverse(), (attachment) => {
      const parent = workspace.getBlockById(attachment.parentId)
      const child = workspace.getBlockById(attachment.childId)
      const connection =
        attachment.input === null
          ? parent?.nextConnection
          : parent?.getInput(attachment.input)?.connection
      const childConnection = child?.outputConnection ?? child?.previousConnection
      if (!connection || !childConnection) throw new Error('Cannot restore block connection')
      const recordUndo = Blockly.Events.getRecordUndo()
      Blockly.Events.setRecordUndo(false)
      try {
        connection.connect(childConnection)
      } finally {
        Blockly.Events.setRecordUndo(recordUndo)
      }
      if (connection.targetConnection !== childConnection)
        throw new Error('Blockly refused a saved block connection')
    })
    check()
    await Blockly.renderManagement.finishQueuedRenders()
    check()
  } finally {
    options.signal.removeEventListener('abort', release)
    release()
  }
  Blockly.Events.fire(new Blockly.Events.FinishedLoading(workspace))
}
