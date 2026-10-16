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

export async function collectProcess(
  child: ChildProcessWithoutNullStreams,
  timeoutMs = 20000,
  signal?: AbortSignal,
): Promise<string> {
  const result = await collectProcessResult(child, timeoutMs, signal)
  if (result.code !== 0)
    throw new Error(
      `O cliente não concluiu a operação (código ${result.code ?? 'encerrado'}). Confira login e limite da assinatura.`,
    )
  return result.output
}
export function collectProcessResult(
  child: ChildProcessWithoutNullStreams,
  timeoutMs = 20000,
  signal?: AbortSignal,
  capture?: (
    result: { output: string; stderr: string; code: number | null },
    complete: boolean,
  ) => Promise<void>,
): Promise<{ output: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    let output = ''
    let stderr = ''
    let exitCode: number | null = null
    let inputClosed = false
    let settled = false
    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      if (error) child.kill()
      const result = { output, stderr, code: exitCode }
      // Flush evidence before reporting completion/failure to the execution supervisor.
      const captured = capture ? capture(result, !error && exitCode === 0) : Promise.resolve()
      void captured.then(() => (error ? reject(error) : resolve(result)), reject)
    }
    const abort = () => finish(new Error('Operação cancelada.'))
    const timer = setTimeout(
      () => finish(new Error('O cliente demorou além do limite. Tente retomar.')),
      timeoutMs,
    )
    child.stdout.setEncoding('utf8')
    child.stdout.on('error', () =>
      finish(new Error('O canal de saída do cliente oficial foi encerrado.')),
    )
    child.stdout.on('data', (chunk: string) => {
      if (settled) return
      output += chunk
      if (output.length > 2_000_000) finish(new Error('Resposta acima do limite permitido.'))
    })
    child.stderr.setEncoding('utf8')
    child.stderr.on('error', () =>
      finish(new Error('O canal de diagnóstico do cliente oficial foi encerrado.')),
    )
    child.stderr.on('data', (chunk: string) => {
      if (settled) return
      stderr = (stderr + chunk).slice(-32000)
    })
    // A CLI can reject its arguments before reading stdin. Preserve its stderr/exit status
    // instead of replacing the useful diagnostic with a pipe error.
    child.stdin.on('error', () => {
      inputClosed = true
    })
    child.on('error', (error) => {
      const code = 'code' in error && typeof error.code === 'string' ? error.code : 'UNKNOWN'
      finish(new Error(`Não foi possível iniciar o cliente oficial (${code}).`, { cause: error }))
    })
    child.on('close', (code) => {
      exitCode = code
      finish(
        code === 0 && inputClosed
          ? new Error('O cliente encerrou o canal antes de receber o pedido completo.')
          : undefined,
      )
    })
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) abort()
  })
}
