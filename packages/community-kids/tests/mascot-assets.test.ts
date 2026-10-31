import { expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, resolve } from 'node:path'
import { BUILTIN_ART } from '@sistemazero/edisvg/builtins'
import { DIALOGUE_POSES } from '../../admin/src/lib/types'
import { type MascotExpression, ZAPPY_SRC } from '../src/components/kids/mascot'

test('every selectable expression points to its matching export-derived static pose', async () => {
  for (const pose of Object.keys(ZAPPY_SRC) as MascotExpression[]) {
    expect(ZAPPY_SRC[pose]).toBe(BUILTIN_ART[pose].poster.url)
    const bytes = await readFile(
      resolve(import.meta.dir, '../../edisvg/assets', basename(ZAPPY_SRC[pose])),
    )
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(BUILTIN_ART[pose].poster.sha256)
  }
  for (const pose of DIALOGUE_POSES) expect(ZAPPY_SRC[pose]).toBeTruthy()
})

test('the same verified media can be installed in Admin, Kids and adult public roots', async () => {
  const prefix = resolve(tmpdir(), 'sz-edisvg-public-')
  const temporary = await mkdtemp(prefix)
  try {
    const script = resolve(import.meta.dir, '../../edisvg/scripts/sync-assets.ts')
    for (const app of ['admin', 'kids', 'adulto']) {
      const publicRoot = resolve(temporary, app)
      execFileSync(process.execPath, [script, publicRoot], { stdio: 'pipe', windowsHide: true })
      for (const pose of DIALOGUE_POSES) {
        const bytes = await readFile(resolve(publicRoot, 'edisvg', basename(ZAPPY_SRC[pose])))
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(
          BUILTIN_ART[pose].poster.sha256,
        )
      }
    }
  } finally {
    expect(temporary.startsWith(prefix)).toBe(true)
    await rm(temporary, { recursive: true, force: true })
  }
})
