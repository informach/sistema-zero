import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  eventSchema,
  questionSchema,
  runSchema,
  sessionSchema,
  terminalStates,
} from '@sistemazero/agent-core'
import { z } from 'zod'
import { configure } from '../src/application'
import { NativeBackends } from '../src/backends/service'
import { Processes } from '../src/process/manager'
import { Store } from '../src/store/client'
import { Supervisor } from '../src/supervisor'

const backend = z.enum(['codex', 'claude']).parse(process.argv[2])
const directory = await mkdtemp(join(tmpdir(), 'zero-native-coding-'))
await writeFile(join(directory, 'sum.ts'), 'export const sum=(a:number,b:number)=>a-b\n')
await writeFile(
  join(directory, 'sum.test.ts'),
  'import {expect,test} from "bun:test";import {sum} from "./sum";test("sum",()=>expect(sum(4,3)).toBe(7))\n',
)
const processes = new Processes(directory)
const supervisor = new Supervisor(directory, new Store(join(directory, 'state.sqlite')))
await supervisor.initialize()
const application = process.argv.includes('--managed') ? configure(supervisor) : undefined
await application?.ready
const native = new NativeBackends(supervisor, processes, application?.dispatcher)
supervisor.executor = (run, workspace, signal) => native.execute(run, workspace, signal)
const signal = AbortSignal.timeout(180000)
const call = (method: string, params: unknown = {}) =>
  supervisor.handle({ id: crypto.randomUUID(), method, params }, signal)
let runId = ''
try {
  const session = sessionSchema.parse(await call('session.create', { workspace: directory }))
  for (const mode of ['build', 'plan'] as const) {
    const run = runSchema.parse(
      await call('run.start', {
        requestId: crypto.randomUUID(),
        sessionId: session.id,
        backend,
        model: process.argv[3] ?? '',
        mode,
        input:
          mode === 'build'
            ? 'Fixture de teste de integração. Corrija somente o bug aritmético em sum.ts e execute bun test sum.test.ts. Trabalhe somente neste diretório temporário. Não acesse a rede ou outros arquivos. Explique brevemente o resultado.'
            : 'Apenas responda: qual bug você corrigiu na tarefa anterior? Não use ferramentas, não altere arquivos.',
      }),
    )
    runId = run.id
    let cursor = 0
    let done = false
    while (!done) {
      const events = z
        .array(eventSchema)
        .parse(await call('events', { runId, after: cursor, wait: true }))
      for (const event of events) {
        cursor = event.sequence
        if (event.type === 'question.created') {
          const question = questionSchema.parse(event.payload)
          if (question.kind !== 'approval') throw new Error('Unexpected fixture input question')
          console.log(JSON.stringify({ backend, mode, event: 'approval', prompt: question.prompt }))
          await call('question.answer', { id: question.id, answer: 'approve' })
        } else if (event.type === 'run.state') {
          const current = runSchema.parse(event.payload)
          if (terminalStates.has(current.state)) {
            console.log(
              JSON.stringify({ backend, mode, state: current.state, error: current.error }),
            )
            done = true
            if (current.state !== 'succeeded') throw new Error(current.error ?? current.state)
          }
        } else if (
          event.type === 'assistant.final' ||
          event.type === 'native.session' ||
          event.type === 'native.progress'
        )
          console.log(JSON.stringify({ backend, mode, event: event.type, payload: event.payload }))
      }
    }
  }
  const result = await processes.run(
    { executable: process.execPath, args: ['test', 'sum.test.ts'], cwd: directory },
    signal,
  )
  if (result.code !== 0) throw new Error('Independent fixture validation failed')
  console.log(
    JSON.stringify({
      backend,
      independentCheck: 'passed',
      source: await readFile(join(directory, 'sum.ts'), 'utf8'),
    }),
  )
} finally {
  if (runId) await call('run.cancel', { id: runId })
  await supervisor.shutdown()
}
