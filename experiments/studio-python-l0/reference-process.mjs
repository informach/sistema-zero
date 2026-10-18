import { spawn } from 'node:child_process'
import { join } from 'node:path'

// Windows-only helper for the portable kit. Kill the owned process tree while
// its root PID is still alive; never use image-name termination.
export async function runOwnedProcess(executable, args, options, timeoutMs) {
  let timedOut = false
  let cleanup
  let cleanupFailure
  const child = spawn(executable, args, { ...options, windowsHide: true })
  const finished = new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('close', (code, signal) => resolve({ code, signal }))
  })
  const timer = setTimeout(() => {
    timedOut = true
    if (child.pid === undefined) return
    const pid = child.pid
    cleanup = new Promise((done) => {
      const killer = spawn(
        join(process.env.SystemRoot ?? 'C:\\Windows', 'System32/taskkill.exe'),
        ['/PID', String(pid), '/T', '/F'],
        { windowsHide: true, stdio: 'ignore', timeout: 10000 },
      )
      killer.once('error', (error) => {
        cleanupFailure = String(error)
        child.kill()
        done()
      })
      killer.once('close', (code) => {
        if (code !== 0) {
          cleanupFailure = `Process-tree cleanup exited ${code}`
          child.kill()
        }
        done()
      })
    })
  }, timeoutMs)
  try {
    const result = await finished
    await cleanup
    return { ...result, timedOut, cleanupFailure }
  } finally {
    clearTimeout(timer)
  }
}
