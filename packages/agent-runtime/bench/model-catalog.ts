import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ClaudeBackend } from '../src/backends/claude'
import { CodexBackend } from '../src/backends/codex'
import { Processes } from '../src/process/manager'

const directory = await mkdtemp(join(tmpdir(), 'zero-model-catalog-'))
const processes = new Processes(directory)
const models = await Promise.allSettled([
  new ClaudeBackend(processes, directory).models(directory, AbortSignal.timeout(30000)),
  new CodexBackend(processes).models(directory, AbortSignal.timeout(30000)),
])
console.log(JSON.stringify(models, null, 2))
if (models.some((item) => item.status === 'rejected')) process.exitCode = 1
