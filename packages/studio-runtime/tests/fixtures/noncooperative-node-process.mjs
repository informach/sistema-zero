import { spawn } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'

const [mode, input, marker] = process.argv.slice(2)
if (mode === 'normal') {
  console.log('completed')
} else if (mode === 'overflow') {
  process.stdout.write('x'.repeat(65537))
  setInterval(() => {}, 1000)
} else {
  const grandchild = spawn(
    process.execPath,
    [
      '-e',
      "process.stdout.write('ready'); process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)",
    ],
    { stdio: ['ignore', 'pipe', 'inherit'], windowsHide: true },
  )
  await new Promise((resolve, reject) => {
    grandchild.once('error', reject)
    grandchild.stdout.once('data', resolve)
  })
  const retainedInput = await readFile(input, 'utf8')
  await writeFile(
    marker,
    JSON.stringify({ parent: process.pid, grandchild: grandchild.pid, retainedInput }),
  )
  process.on('SIGTERM', () => {})
  // Deliberately noncooperative teardown: only the parent's independent deadline can retire us.
  setInterval(() => {}, 1000)
  await new Promise(() => {})
}
