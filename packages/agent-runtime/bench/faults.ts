import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { effectSchema, runSchema } from '@sistemazero/agent-core'
import { OwnedProcess } from '../src/process/owned'
import { Store } from '../src/store/client'

const reports = []
for (const boundary of ['prepared', 'dispatched', 'accepted', 'confirmed']) {
  const directory = await mkdtemp(join(tmpdir(), 'zero-F6-'))
  const child = await OwnedProcess.start(directory, {
    executable: process.execPath,
    args: [join(import.meta.dir, 'crash-child.ts'), directory, boundary],
    cwd: directory,
  })
  let errors = ''
  child.stderr.on('data', (value) => {
    errors = (errors + value.toString()).slice(-4000)
  })
  try {
    await Promise.race([
      new Promise<void>((resolve) => {
        let output = ''
        child.stdout.on('data', (value) => {
          output += value.toString()
          if (output.includes('CUT')) resolve()
        })
      }),
      child.exited.then(() => {
        throw new Error('Child exited before boundary: ' + errors)
      }),
    ])
  } finally {
    await child.close()
  }
  const store = new Store(join(directory, 'state.sqlite'))
  try {
    const recovery = await store.call({ op: 'recover' })
    const run = runSchema.parse(await store.call({ op: 'run.get', id: 'r' }))
    const effect = effectSchema.parse(await store.call({ op: 'effect.get', id: 'effect' }))
    const receipt = await readFile(join(directory, 'external-receipt.txt'), 'utf8').catch(
      (error) => {
        if (error.code === 'ENOENT') return ''
        throw error
      },
    )
    if (
      run.state !== 'interrupted' ||
      effect.state !==
        (boundary === 'confirmed'
          ? 'confirmed'
          : boundary === 'prepared'
            ? 'prepared'
            : 'unknown') ||
      receipt.split('accepted').length - 1 !==
        (['accepted', 'confirmed'].includes(boundary) ? 1 : 0)
    )
      throw new Error(
        'Recovery invariant failed at ' +
          boundary +
          ': ' +
          JSON.stringify({ run, effect, receipt }),
      )
    const replay = await store.call({ op: 'recover' })
    reports.push({
      boundary,
      recovery,
      secondRecovery: replay,
      state: effect.state,
      receipts: receipt.split('accepted').length - 1,
      autoReplay: false,
    })
  } finally {
    await store.close()
  }
}
const output = resolve(
  import.meta.dir,
  '../../../.audits/tui-bench/working-tree/win32/F6-process-crashes.json',
)
await mkdir(resolve(output, '..'), { recursive: true })
await writeFile(output, JSON.stringify({ at: new Date().toISOString(), reports }, null, 2))
console.log(JSON.stringify({ output, reports }, null, 2))
