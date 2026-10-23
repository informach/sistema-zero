import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createTestRenderer } from '@opentui/core/testing'
import { createRoot } from '@opentui/react'
import { act } from 'react'
import { SessionView } from '../src/app'
import { KeyboardLayerProvider } from '../src/providers/keyboard-layer'
import { ThemeProvider } from '../src/providers/theme'
import { ToastProvider } from '../src/providers/toast'
import { RuntimeState } from '../src/state/runtime'

const state = new RuntimeState(process.env.ZERO_BENCH_WORKSPACE ?? process.cwd())
if (process.env.ZERO_BENCH_PROFILE) {
  process.env.SISTEMAZERO_HOME = process.env.ZERO_BENCH_PROFILE
  await state.open()
}
const setup = await createTestRenderer({ width: 120, height: 40, targetFps: 30 })
const root = createRoot(setup.renderer)
await act(async () => {
  root.render(
    <ThemeProvider>
      <ToastProvider>
        <KeyboardLayerProvider>
          <SessionView state={state} />
        </KeyboardLayerProvider>
      </ToastProvider>
    </ThemeProvider>,
  )
})
// Match production's on-demand scheduler. Explicit start() forces continuous frames.
setup.renderer.auto()
setup.renderer.requestRender()
await setup.waitForFrame((frame) => frame.includes('SISTEMA ZERO'))
const measurements: number[] = []
const baselineMemory = process.memoryUsage()
async function frameWith(text: string, send: () => void | Promise<void>) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      setup.renderer.off('frame', frame)
      reject(
        new Error(
          'Frame deadline: ' +
            text +
            '; draft=' +
            JSON.stringify(state.draftText) +
            '; frame=' +
            setup.captureCharFrame(),
        ),
      )
    }, 3000)
    const frame = () => {
      if (setup.captureCharFrame().includes(text)) {
        clearTimeout(timer)
        setup.renderer.off('frame', frame)
        resolve()
      }
    }
    setup.renderer.on('frame', frame)
    Promise.resolve(send()).catch((error) => {
      clearTimeout(timer)
      setup.renderer.off('frame', frame)
      reject(error)
    })
  })
}
try {
  for (let i = -3; i < 1000; i++) {
    // Paste replaces a selected draft and traverses the same input handler as bracketed paste.
    const value = `inputproof${String(i + 3).padStart(4, '0')}`
    const start = performance.now()
    await frameWith(value, () => {
      setup.mockInput.pressKey('A', { ctrl: true })
      setup.mockInput.pressKey('K', { ctrl: true })
      return setup.mockInput.pasteBracketedText(value)
    })
    if (state.draftText !== value) throw new Error('Input fixture did not replace the prior draft')
    if (i >= 0) measurements.push(performance.now() - start)
  }
  const cpu = process.cpuUsage(),
    idleStart = performance.now()
  await Bun.sleep(5000)
  const after = process.cpuUsage(cpu),
    sorted = [...measurements].sort((a, b) => a - b)
  const golden = createHash('sha256')
    .update(setup.captureCharFrame())
    .update(state.draftText)
    .digest('hex')
  const result = {
    at: new Date().toISOString(),
    mode: process.env.ZERO_BENCH_PROFILE ? 'F5 IPC connected' : 'standalone renderer',
    execArgv: process.execArgv,
    dimensions: [120, 40],
    targetFps: 30,
    observed:
      'key/paste handler to FRAME with production on-demand scheduler; no forced renderOnce',
    golden,
    p50: sorted[499],
    p95: sorted[949],
    p99: sorted[989],
    milliseconds: measurements,
    baselineMemory,
    memory: process.memoryUsage(),
    idle: { milliseconds: performance.now() - idleStart, cpu: after },
  }
  const output = resolve(
    import.meta.dir,
    '../../../.audits/tui-bench/working-tree/win32/interaction' +
      (process.env.ZERO_BENCH_PROFILE
        ? '-F5'
        : process.execArgv.includes('--smol')
          ? '-smol'
          : '-ondemand') +
      '.json',
  )
  await mkdir(resolve(output, '..'), { recursive: true })
  await writeFile(output, JSON.stringify(result, null, 2))
  console.log(
    JSON.stringify({
      output,
      p50: result.p50,
      p95: result.p95,
      p99: result.p99,
      memory: result.memory,
    }),
  )
} finally {
  state.close()
  root.unmount()
  setup.renderer.destroy()
}
