import { spawn } from 'node:child_process'
import path from 'node:path'
import { z } from 'zod'
import { nativeEnvironment } from '../native-client'

const packages: Record<string, string> = {
  'win32:x64': '@remotion/compositor-win32-x64-msvc',
  'darwin:arm64': '@remotion/compositor-darwin-arm64',
  'darwin:x64': '@remotion/compositor-darwin-x64',
}
export async function mediaBinary(name: 'ffmpeg' | 'ffprobe') {
  const packageName = packages[`${process.platform}:${process.arch}`]
  if (!packageName) throw new Error('A preparação de mídia não está disponível nesta plataforma')
  const { dir } = z.object({ dir: z.string().min(1) }).parse(await import(packageName))
  // electron-builder unpacks this explicitly declared package; child processes need its real path.
  const directory = dir.replace(/([\\/])app\.asar([\\/])/, '$1app.asar.unpacked$2')
  return path.join(directory, `${name}${process.platform === 'win32' ? '.exe' : ''}`)
}
/** Fixed executables, argument arrays, bounded output and cancellation; never a shell command. */
export async function mediaProcess(
  name: 'ffmpeg' | 'ffprobe',
  args: string[],
  signal: AbortSignal,
  timeoutMs = 120000,
  onStderr?: (chunk: string) => void,
) {
  const executable = await mediaBinary(name)
  return boundedMediaProcess(executable, args, signal, timeoutMs, onStderr)
}
/** Internal native executables only; this function is never exposed through IPC. */
export function boundedMediaProcess(
  executable: string,
  args: string[],
  signal: AbortSignal,
  timeoutMs = 120000,
  onStderr?: (chunk: string) => void,
) {
  const deadline = AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
  deadline.throwIfAborted()
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(executable, args, {
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: nativeEnvironment(process.env),
    })
    let stdout = '',
      stderr = '',
      failure: unknown
    const abort = () => {
      failure = deadline.reason
      child.kill()
    }
    deadline.addEventListener('abort', abort, { once: true })
    if (deadline.aborted) abort()
    child.on('error', (error) => {
      failure = error
    })
    child.stdout.on('data', (chunk: Buffer) => {
      if (failure) return
      stdout += chunk.toString()
      if (Buffer.byteLength(stdout) > 2_000_000) {
        failure = new Error('A análise da mídia excedeu o limite de resposta')
        child.kill()
      }
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-6000)
      try {
        onStderr?.(chunk.toString())
      } catch (error) {
        failure = error
        child.kill()
      }
    })
    child.once('close', (code) => {
      deadline.removeEventListener('abort', abort)
      if (failure) reject(failure)
      else if (code !== 0)
        reject(
          new Error(
            `Não foi possível processar a mídia: ${stderr.slice(-1000) || `código ${code}`}`,
          ),
        )
      else resolve({ stdout, stderr })
    })
  })
}
export function mediaInputArguments(file: string, mime: string) {
  const demuxer: Record<string, string> = {
    'video/mp4': 'mov',
    'video/quicktime': 'mov',
    'video/webm': 'matroska',
    'audio/wav': 'wav',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'mov',
  }
  const format = demuxer[mime]
  if (!format) throw new Error('Formato de mídia não suportado para preparação')
  return ['-protocol_whitelist', 'file,pipe', '-f', format, '-i', path.resolve(file)]
}
