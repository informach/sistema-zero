import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { profileIdentity } from '../profile-identity'
import { processEnvironment } from './environment'
import { windowsHelper } from './windows'

/** Kernel mutex, private to this user, released by the OS after owner termination. */
export async function lockProfile(directory: string) {
  if (process.platform !== 'win32') return { close: async () => {} }
  const identity = createHash('sha256')
    .update(profileIdentity(directory))
    .digest('hex')
    .slice(0, 24)
  const child = spawn(await windowsHelper(directory), [], {
    windowsHide: true,
    stdio: 'pipe',
    env: {
      ...processEnvironment(),
      ZERO_PROCESS_REQUEST: Buffer.from(JSON.stringify({ lock: identity })).toString('base64'),
    },
  })
  let closing = false,
    acquired = false,
    errors = ''
  child.stderr.on('data', (data) => {
    errors = (errors + data.toString()).slice(-4000)
  })
  child.stdin.on('error', () => {})
  const exited = new Promise<void>((resolve) =>
    child.once('close', () => {
      if (acquired && !closing) {
        // A supervisor cannot keep dispatching after losing its exclusive ownership.
        console.error('Runtime ownership lock was lost. Restart to reconcile interrupted work.')
        process.exit(70)
      }
      resolve()
    }),
  )
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Profile ownership lock timed out')), 10000)
      let output = ''
      child.once('error', (error) => {
        clearTimeout(timer)
        reject(error)
      })
      child.once('close', () => {
        clearTimeout(timer)
        reject(
          new Error(
            errors.includes('PROFILE_BUSY')
              ? 'Profile already owned by another runtime or installer'
              : `Profile lock failed: ${errors}`,
          ),
        )
      })
      child.stdout.on('data', (data) => {
        output += data.toString()
        if (output.includes('LOCKED\n') || output.includes('LOCKED\r\n')) {
          clearTimeout(timer)
          acquired = true
          resolve()
        } else if (output.length > 1024) {
          clearTimeout(timer)
          reject(new Error('Invalid lock response'))
        }
      })
    })
  } catch (error) {
    closing = true
    child.stdin.end()
    child.kill()
    await exited
    throw error
  }
  return {
    close: async () => {
      closing = true
      child.stdin.end()
      const timer = setTimeout(() => child.kill(), 2000)
      try {
        await exited
      } finally {
        clearTimeout(timer)
      }
    },
  }
}
