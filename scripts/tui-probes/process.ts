import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Processes } from '../../packages/agent-runtime/src/process/manager'

const directory = await mkdtemp(join(tmpdir(), 'zero-process-bench-'))
const processes = new Processes(directory)
const times = []
for (let index = 0; index < 8; index++) {
  const start = performance.now()
  const result = await processes.run(
    { executable: 'git', args: ['--version'], cwd: directory },
    new AbortController().signal,
  )
  if (result.code !== 0) throw new Error(result.output)
  times.push(performance.now() - start)
}
console.log(JSON.stringify({ times, cold: times[0], warm: times.slice(1) }, null, 2))
