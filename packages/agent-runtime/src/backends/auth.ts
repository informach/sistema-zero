import { ensureProfile, profileDirectory } from '../config'
import { Processes } from '../process/manager'
import { type NativeName, nativeExecutable } from './native-process'

/** Interactive account operations remain in the official client, outside model conversations. */
export async function nativeAuth(name: NativeName, operation: 'login' | 'logout') {
  const directory = profileDirectory()
  await ensureProfile(directory)
  const executable = await nativeExecutable(name)
  const args =
    name === 'claude'
      ? ['auth', operation, ...(operation === 'login' ? ['--claudeai'] : [])]
      : [operation, ...(operation === 'login' ? ['--device-auth'] : [])]
  const child = await new Processes(directory).open({ executable, args, cwd: directory })
  const cancel = () => child.cancel()
  const input = (bytes: Buffer) => {
    try {
      child.send(bytes)
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'Authentication input failed')
      cancel()
    }
  }
  process.once('SIGINT', cancel)
  process.stdin.on('data', input)
  const timer = setTimeout(cancel, 10 * 60 * 1000)
  child.stdout.pipe(process.stdout, { end: false })
  child.stderr.pipe(process.stderr, { end: false })
  try {
    const result = await child.exited
    if (result.code !== 0) throw new Error(`${name} authentication exited with code ${result.code}`)
  } finally {
    clearTimeout(timer)
    process.stdin.off('data', input)
    process.stdin.pause()
    process.off('SIGINT', cancel)
    await child.close()
  }
}
