import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

test('every host ships the exact installed Blockly media and license', () => {
  const result = Bun.spawnSync([process.execPath, 'scripts/sync-blockly-media.ts', '--check'], {
    cwd: resolve(import.meta.dir, '../..'),
    stdout: 'pipe',
    stderr: 'pipe',
    windowsHide: true,
  })
  // Só o código de saída decide: um aviso do runtime no stderr não é diferença de mídia.
  expect(result.exitCode, new TextDecoder().decode(result.stderr)).toBe(0)
})
