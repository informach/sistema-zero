import path from 'node:path'
import { nativeEnvironment } from '../native-client'

export async function renderProcess(
  propsFile: string,
  output: string,
  mode: 'art' | 'art-jpeg' | 'timeline',
  signal: AbortSignal,
) {
  signal.throwIfAborted()
  const { app, utilityProcess } = await import('electron')
  const dist = path.join(app.getAppPath(), 'dist')
  await new Promise<void>((resolve, reject) => {
    const child = utilityProcess.fork(
      path.join(dist, 'render-worker.cjs'),
      [propsFile, output, path.join(dist, 'remotion'), mode],
      { stdio: 'pipe', serviceName: 'Produção de mídia', env: nativeEnvironment(process.env) },
    )
    let stderr = '',
      complete = false,
      stdout = '',
      killTimer: ReturnType<typeof setTimeout> | undefined
    const abort = () => {
      child.postMessage('cancel')
      killTimer = setTimeout(() => child.kill(), 5000)
    }
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) abort()
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-4000)
    })
    child.once('error', (type, location) => {
      stderr = `O processo de renderização encerrou (${type}, ${location.slice(0, 200)}).`
    })
    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
      if (stdout.length > 32000) {
        child.kill()
        return
      }
      const lines = stdout.split('\n')
      stdout = lines.pop() ?? ''
      for (const line of lines) if (line.trim() === '{"complete":true}') complete = true
    })
    child.once('exit', (code) => {
      signal.removeEventListener('abort', abort)
      if (killTimer) clearTimeout(killTimer)
      if (signal.aborted) reject(signal.reason)
      else if (code === 0 && complete) resolve()
      else reject(new Error(stderr || 'O render terminou sem confirmar o arquivo'))
    })
  })
  signal.throwIfAborted()
}
