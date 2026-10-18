import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))
const config = fileURLToPath(new URL('../e2e-python-editor/vite.config.ts', import.meta.url))
let child
let stopping = false
console.info(`[python-editor-server] Node ${process.version}; libuv ${process.versions.uv}`)

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    stopping = true
    child?.kill()
  })
}

async function run(phase) {
  return new Promise((resolve) => {
    child = spawn(process.execPath, [vite, phase, '--config', config], {
      cwd: root,
      stdio: 'inherit',
      windowsHide: true,
    })
    child.once('error', (error) => {
      console.error(`[python-editor-server] ${phase} could not start: ${error.message}`)
      resolve(1)
    })
    child.once('exit', (code, signal) => {
      if (!stopping && (phase === 'preview' || code !== 0)) {
        console.error(
          `[python-editor-server] ${phase} exited: code=${code}, signal=${signal}, pid=${child.pid}`,
        )
      }
      resolve(code ?? 1)
    })
  })
}

const built = await run('build')
if (!stopping && built === 0) {
  const served = await run('preview')
  process.exitCode = stopping ? 0 : served || 1
} else process.exitCode = stopping ? 0 : built
