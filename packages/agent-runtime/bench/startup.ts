import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { cpus, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { z } from 'zod'
import { connectRuntime } from '../src/client'
import { Credentials } from '../src/credentials'
import { OwnedProcess } from '../src/process/owned'

const directory = await mkdtemp(join(tmpdir(), 'zero-startup-'))
const cli = resolve(import.meta.dir, '../../tui/dist/cli.js')
const profile = join(directory, 'warm-profile')
const client = await connectRuntime(profile)
const measurements: Record<string, number[]> = { help: [], warmPrompt: [], newProfilePrompt: [] }
const stats = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  return {
    p50: sorted[Math.ceil(sorted.length * 0.5) - 1],
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
    p99: sorted[Math.ceil(sorted.length * 0.99) - 1],
    samples: values,
  }
}
try {
  for (let i = -3; i < 30; i++) {
    const start = performance.now()
    const child = Bun.spawn([process.execPath, cli, '--help'], {
      cwd: directory,
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const [text, errors, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ])
    if (code || !text.includes('Sistema Zero')) throw new Error('Help failed: ' + errors)
    if (i >= 0) measurements.help!.push(performance.now() - start)
  }
  for (const cold of [false, true])
    for (let i = -3; i < 30; i++) {
      const selected = cold ? join(directory, `cold-${i}`) : profile
      const start = performance.now()
      const child = await OwnedProcess.start(directory, {
        executable: process.execPath,
        args: [cli],
        cwd: directory,
        terminal: { columns: 80, rows: 24 },
        env: { SISTEMAZERO_HOME: selected, NO_COLOR: '1' },
      })
      let output = '',
        errors = ''
      child.stdout.on('data', (chunk) => {
        output = (output + chunk.toString()).slice(-64000)
      })
      child.stderr.on('data', (chunk) => {
        errors = (errors + chunk.toString()).slice(-2000)
      })
      try {
        const deadline = Date.now() + 10000
        while (!output.includes('SISTEMA ZERO') || !output.includes('plan')) {
          if (Date.now() > deadline)
            throw new Error('TTY startup failed: ' + errors + ' OUTPUT ' + JSON.stringify(output))
          await Bun.sleep(2)
        }
        child.send('probestart')
        while (!output.includes('probestart')) {
          if (Date.now() > deadline)
            throw new Error(
              'TTY first input failed: ' + errors + ' OUTPUT ' + JSON.stringify(output),
            )
          await Bun.sleep(2)
        }
        if (i >= 0)
          measurements[cold ? 'newProfilePrompt' : 'warmPrompt']!.push(performance.now() - start)
        child.send('\u0003')
        await Promise.race([child.exited, Bun.sleep(1000)])
      } finally {
        await child.close()
        if (cold) await new Credentials(selected).delete('ipc')
      }
    }
  const metricSchema = z.object({
    memory: z.object({ rss: z.number(), heapUsed: z.number() }),
    cpu: z.object({ user: z.number(), system: z.number() }),
  })
  const before = metricSchema.parse(await client.request('runtime.metrics'))
  const idleStart = performance.now()
  for (let i = 0; i < 6; i++) {
    await Bun.sleep(10000)
    console.log(`Idle measurement ${i + 1}/6`)
  }
  const after = metricSchema.parse(await client.request('runtime.metrics'))
  const idleMs = performance.now() - idleStart
  const idleCpuPercentTotal =
    (100 * (after.cpu.user + after.cpu.system - before.cpu.user - before.cpu.system)) /
    (idleMs * 1000 * cpus().length)
  const result = {
    at: new Date().toISOString(),
    notes:
      'New processes; OS disk cache uncontrolled. Prompt measured through real ConPTY, including process owner startup. Idle RSS/CPU is supervisor plus its SQLite worker, UI is measured separately.',
    measurements: Object.fromEntries(
      Object.entries(measurements).map(([key, values]) => [key, stats(values)]),
    ),
    before,
    after,
    idleMs,
    idleCpuPercentTotal,
  }
  const output = resolve(
    import.meta.dir,
    '../../../.audits/tui-bench/working-tree/win32/startup.json',
  )
  await mkdir(resolve(output, '..'), { recursive: true })
  await writeFile(output, JSON.stringify(result, null, 2))
  console.log(JSON.stringify({ output, ...result }, null, 2))
} finally {
  await client.request('runtime.shutdown').catch(() => {})
  client.close()
  await new Credentials(profile).delete('ipc')
}
