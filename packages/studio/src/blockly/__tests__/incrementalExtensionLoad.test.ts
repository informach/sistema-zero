import { beforeAll, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import * as Blockly from 'blockly/core'
import { loadExtensionExamples } from '../../extensions'
import { SZIRInputSchema } from '../../ir/schema'
import { OFFICIAL_CATALOG } from '../../official-extensions'
import { registerExtensionBlocks } from '../blocks'
import {
  isIncrementalWorkspaceState,
  loadWorkspaceIncrementally,
} from '../incrementalWorkspaceLoad'
import { ensureBlocklyInitialized } from '../setup'
import { buildWorkspaceStateFromIR } from '../workspaceState'

beforeAll(() => {
  ensureBlocklyInitialized()
  for (const extension of OFFICIAL_CATALOG) registerExtensionBlocks(extension.blockly.blocks)
})
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0))
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')

for (const extension of OFFICIAL_CATALOG) {
  for (const [index, example] of (await loadExtensionExamples(extension)).entries()) {
    test(`${extension.manifest.id}/${index}: incremental load preserves the official editable example`, async () => {
      const full = new Blockly.Workspace()
      const incremental = new Blockly.Workspace()
      try {
        Blockly.serialization.workspaces.load(
          buildWorkspaceStateFromIR(SZIRInputSchema.parse(example.ir)),
          full,
        )
        await tick()
        const canonical = Blockly.serialization.workspaces.save(full)
        if (!isIncrementalWorkspaceState(canonical)) throw new Error('Invalid example workspace')
        await loadWorkspaceIncrementally(canonical, incremental, {
          signal: new AbortController().signal,
          chunkBlocks: 8,
          yieldControl: () => new Promise((resolve) => setTimeout(resolve, 0)),
        })
        await tick()
        expect(digest(Blockly.serialization.workspaces.save(incremental))).toBe(digest(canonical))
      } finally {
        full.dispose()
        incremental.dispose()
      }
    })
  }
}
