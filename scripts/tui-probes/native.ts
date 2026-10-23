import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CodexBackend } from '../../packages/agent-runtime/src/backends/codex'
import { claudeAccount } from '../../packages/agent-runtime/src/backends/native-process'
import { Processes } from '../../packages/agent-runtime/src/process/manager'

const directory = await mkdtemp(join(tmpdir(), 'zero-native-proof-'))
const processes = new Processes(directory)
const signal = AbortSignal.timeout(45000)
const codex = new CodexBackend(processes)
const result = await Promise.allSettled([
  codex.account(directory, signal),
  claudeAccount(processes, directory, directory, signal),
])
console.log(
  JSON.stringify(
    result.map((value, index) =>
      value.status === 'fulfilled'
        ? { name: index === 0 ? 'codex' : 'claude', ...value.value }
        : { name: index === 0 ? 'codex' : 'claude', error: String(value.reason) },
    ),
    null,
    2,
  ),
)
