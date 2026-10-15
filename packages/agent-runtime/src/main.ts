import { join } from 'node:path'
import { configure } from './application'
import { ensureProfile, profileDirectory } from './config'
import { listen } from './ipc/server'
import { Store } from './store/client'
import { Supervisor } from './supervisor'

const directory = profileDirectory()
await ensureProfile(directory)
let supervisor: Supervisor | undefined
let ready!: () => void
const initialized = new Promise<void>((resolve) => {
  ready = resolve
})
const host = await listen(directory, async (command, signal) => {
  await initialized
  if (!supervisor) throw new Error('Supervisor unavailable')
  return supervisor.handle(command, signal)
})
try {
  const store = new Store(join(directory, 'state.sqlite'))
  supervisor = new Supervisor(directory, store)
  await supervisor.initialize()
  const application = configure(supervisor)
  supervisor.readiness = 'recovering'
  const runtime = supervisor
  void application.ready.then(
    () => {
      runtime.readiness = 'ready'
      runtime.notifyProjection()
    },
    (error: unknown) => {
      runtime.readiness = 'failed'
      runtime.recoveryError = error instanceof Error ? error.message : 'Recovery failed'
      runtime.notifyProjection()
    },
  )
  supervisor.commands.set('runtime.shutdown', async () => {
    void stop().catch(console.error)
    return { stopping: true }
  })
  ready()
} catch (error) {
  await host.close()
  throw error
}
let stopping = false
async function stop() {
  if (stopping) return
  stopping = true
  await supervisor?.shutdown()
  await host.close()
}
process.once('SIGINT', () => void stop().catch(console.error))
process.once('SIGTERM', () => void stop().catch(console.error))
