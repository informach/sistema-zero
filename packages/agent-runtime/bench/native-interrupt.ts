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
const directory = await mkdtemp(join(tmpdir(), 'zero-native-interrupt-'))
await writeFile(
  join(directory, 'wait.ts'),
  'const child=Bun.spawn([process.execPath,"-e","setInterval(()=>{},1000)"],{stdout:"ignore",stderr:"ignore"});await Bun.write("pids.json",JSON.stringify([process.pid,child.pid]));setInterval(()=>{},1000)\n',
)
const supervisor = new Supervisor(directory, new Store(join(directory, 'state.sqlite')))
await supervisor.initialize()
const application = process.argv.includes('--managed') ? configure(supervisor) : undefined
await application?.ready
const native = new NativeBackends(supervisor, new Processes(directory), application?.dispatcher)
supervisor.executor = (run, workspace, signal) => native.execute(run, workspace, signal)
const signal = AbortSignal.timeout(120000)
const call = (method: string, params: unknown = {}) =>
  supervisor.handle({ id: crypto.randomUUID(), method, params }, signal)
const session = sessionSchema.parse(await call('session.create', { workspace: directory }))
const run = runSchema.parse(
  await call('run.start', {
    requestId: crypto.randomUUID(),
    sessionId: session.id,
    backend,
    model: backend === 'codex' ? 'gpt-6.1-sol' : '',
    mode: 'build',
    input:
      'Fixture de cancelamento. Execute somente bun wait.ts neste diretório temporário em primeiro plano e aguarde. Ele cria processos de teste que nosso host vai interromper. Não edite arquivos, não acesse a rede e não use outras ferramentas.',
  }),
)
let canceledAt = 0
let checking = false
let failure: unknown
const timer = setInterval(() => {
  if (checking || canceledAt) return
  checking = true
  void Bun.file(join(directory, 'pids.json'))
    .exists()
    .then(async (exists) => {
      if (exists) {
        canceledAt = performance.now()
        await call('run.cancel', { id: run.id })
      }
    })
    .catch((error) => {
      failure = error
    })
    .finally(() => {
      checking = false
    })
}, 100)
try {
  let cursor = 0
  let done = false
  while (!done) {
    const events = z
      .array(eventSchema)
      .parse(await call('events', { runId: run.id, after: cursor, wait: true }))
    if (failure) throw failure
    for (const event of events) {
      cursor = event.sequence
      if (event.type === 'question.created') {
        const question = questionSchema.parse(event.payload)
        console.log(JSON.stringify({ backend, event: 'approval', prompt: question.prompt }))
        await call('question.answer', { id: question.id, answer: 'approve' })
      } else if (event.type === 'assistant.final' || event.type === 'native.progress')
        console.log(JSON.stringify({ backend, event: event.type, payload: event.payload }))
      else if (event.type === 'run.state') {
        const current = runSchema.parse(event.payload)
        if (terminalStates.has(current.state)) {
          if (current.state !== 'canceled' || !canceledAt)
            throw new Error(current.error ?? 'Fixture did not reach cancellation')
          const pids = z
            .array(z.number().int().positive())
            .parse(JSON.parse(await readFile(join(directory, 'pids.json'), 'utf8')))
          for (const pid of pids) {
            let alive = true
            try {
              process.kill(pid, 0)
            } catch (error) {
              if (error instanceof Error && 'code' in error && error.code === 'ESRCH') alive = false
              else throw error
            }
            if (alive) throw new Error(`Native descendant survived interruption: ${pid}`)
          }
          console.log(
            JSON.stringify({
              backend,
              state: current.state,
              descendants: pids.length,
              cancelMs: Math.round(performance.now() - canceledAt),
            }),
          )
          done = true
        }
      }
    }
  }
} finally {
  clearInterval(timer)
  await call('run.cancel', { id: run.id })
  await supervisor.shutdown()
}
