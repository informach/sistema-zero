import { appendFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { app, type BrowserWindow } from 'electron'

/** Development proof only: metrics/stacks, never user documents or credentials. */
export async function profileImport(window: BrowserWindow, directory: string) {
  if (app.isPackaged) throw new Error('Perfil restrito à revisão de desenvolvimento')
  const debuggerApi = window.webContents.debugger
  debuggerApi.attach('1.3')
  await debuggerApi.sendCommand('HeapProfiler.startSampling', { samplingInterval: 65536 })
  const file = path.join(directory, 'import-memory-profile.jsonl')
  await writeFile(file, '')
  let flight: Promise<void> | undefined
  let stopped = false
  let samples = 0
  async function sample() {
    const heap: unknown = await debuggerApi.sendCommand('Runtime.getHeapUsage')
    const dom: unknown = await debuggerApi.sendCommand('Memory.getDOMCounters')
    await appendFile(
      file,
      `${JSON.stringify({ at: new Date().toISOString(), heap, dom, processes: app.getAppMetrics().map(({ pid, type, memory, cpu }) => ({ pid, type, memory, cpu })) })}\n`,
    )
  }
  await sample()
  async function finish() {
    if (stopped) return
    stopped = true
    clearInterval(timer)
    await flight
    try {
      await sample()
      const allocation: unknown = await debuggerApi.sendCommand('HeapProfiler.stopSampling')
      await writeFile(
        path.join(directory, 'import-allocation-profile.json'),
        JSON.stringify(allocation),
      )
      await debuggerApi.sendCommand('HeapProfiler.collectGarbage')
      await sample()
    } finally {
      if (debuggerApi.isAttached()) debuggerApi.detach()
    }
  }
  const timer = setInterval(() => {
    if (flight || stopped) return
    flight = sample().finally(() => {
      flight = undefined
    })
    void flight
      .then(() => {
        if (++samples >= 12) return finish()
      })
      .catch((error) => {
        console.error(
          'Perfil da importação falhou:',
          error instanceof Error ? error.message : error,
        )
      })
  }, 10000)
  return finish
}
