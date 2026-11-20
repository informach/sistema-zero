import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

test('every host ships the exact installed Blockly media and license', () => {
  const result = Bun.spawnSync([process.execPath, 'scripts/sync-blockly-media.ts', '--check'], {
    cwd: resolve(import.meta.dir, '../..'),
    stdout: 'pipe',
    stderr: 'pipe',
    windowsHide: true,
  })
  expect({ exit: result.exitCode, error: new TextDecoder().decode(result.stderr) }).toEqual({
    exit: 0,
    error: '',
  })
})
