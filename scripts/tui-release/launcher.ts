#!/usr/bin/env bun
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { verify } from './manifest'

const pointer = z
  .object({ release: z.string().regex(/^[a-f0-9]{64}$/) })
  .parse(JSON.parse(await readFile(join(import.meta.dir, 'active.json'), 'utf8')))
const directory = join(import.meta.dir, 'releases', pointer.release)
const integrity = await verify(directory)
if (integrity.digest !== pointer.release) throw new Error('Active release digest mismatch')
const child = Bun.spawn([process.execPath, join(directory, 'cli.js'), ...process.argv.slice(2)], {
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit',
})
// The child receives terminal signals; keep the launcher alive until it restores the terminal.
const interrupt = () => {}
process.on('SIGINT', interrupt)
process.on('SIGTERM', () => child.kill())
process.exitCode = await child.exited
process.off('SIGINT', interrupt)
