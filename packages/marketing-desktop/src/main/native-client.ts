import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

export function nativeEnvironment(source: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const allowed =
    /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|TMPDIR|USERPROFILE|HOME|HOMEDRIVE|HOMEPATH|APPDATA|LOCALAPPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|PROGRAMDATA|LANG|LC_ALL|SYSTEMDRIVE|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE)$/i
  return Object.fromEntries(Object.entries(source).filter(([key]) => allowed.test(key)))
}

export function findNativeClient(name: 'codex' | 'claude'): string {
  const executable = process.platform === 'win32' ? `${name}.exe` : name
  const candidates = [
    ...(process.env.PATH ?? '')
      .split(path.delimiter)
      .filter(Boolean)
      .map((dir) => path.join(dir, executable)),
    path.join(homedir(), '.local', 'bin', executable),
    path.join(homedir(), '.bun', 'bin', executable),
    ...(name === 'claude' && process.platform === 'win32' && process.env.APPDATA
      ? [
          path.join(
            process.env.APPDATA,
            'npm',
            'node_modules',
            '@anthropic-ai',
            'claude-code',
            'bin',
            'claude.exe',
          ),
        ]
      : []),
  ]
  const found = candidates.find((candidate) => path.isAbsolute(candidate) && existsSync(candidate))
  if (!found) throw new Error(`Instale o cliente oficial ${name} para continuar.`)
  return found
}

export function launchNative(
  name: 'codex' | 'claude',
  args: string[],
  cwd: string,
): ChildProcessWithoutNullStreams {
  return spawn(findNativeClient(name), args, {
    cwd,
    env: nativeEnvironment(),
    windowsHide: true,
    shell: false,
    stdio: 'pipe',
  })
}

export function collectProcess(
  child: ChildProcessWithoutNullStreams,
  timeoutMs = 20000,
  signal?: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let output = ''
    let settled = false
    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      if (error) {
        child.kill()
        reject(error)
      } else resolve(output)
    }
    const abort = () => finish(new Error('Operação cancelada.'))
    const timer = setTimeout(
      () => finish(new Error('O cliente demorou além do limite. Tente retomar.')),
      timeoutMs,
    )
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      output += chunk
      if (output.length > 2_000_000) finish(new Error('Resposta acima do limite permitido.'))
    })
    child.stderr.resume()
    child.stdin.on('error', () => finish(new Error('O canal com o cliente oficial foi encerrado.')))
    child.on('error', () => finish(new Error('Não foi possível iniciar o cliente oficial.')))
    child.on('close', (code) =>
      finish(
        code === 0
          ? undefined
          : new Error('O cliente não concluiu a operação. Confira login e limite da assinatura.'),
      ),
    )
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) abort()
  })
}
