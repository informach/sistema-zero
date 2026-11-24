import { readFile } from 'node:fs/promises'

/** Linux kill(pid, 0) also succeeds for a terminated zombie awaiting wait(). */
export function linuxProcessIsRetired(stat: string): boolean {
  const close = stat.lastIndexOf(')')
  const state = /^\s+([RSDZTtXxKWPI])(?:\s|$)/.exec(stat.slice(close + 1))?.[1]
  if (!/^\d+\s+\(/.test(stat) || close < 1 || !state)
    throw new Error('Unrecognized Linux process state')
  return state === 'Z' || state === 'X' || state === 'x'
}

/** Test evidence only: uncertainty is an error, never permission to remove inputs. */
export async function nativeProcessIsRetired(pid: number): Promise<boolean> {
  if (!Number.isSafeInteger(pid) || pid < 1 || pid > 2147483647)
    throw new Error('Invalid owned process id')
  try {
    process.kill(pid, 0)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ESRCH') return true
    throw error
  }
  if (process.platform !== 'linux') return false
  try {
    return linuxProcessIsRetired(await readFile(`/proc/${pid}/stat`, 'utf8'))
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
      return true
    throw error
  }
}
