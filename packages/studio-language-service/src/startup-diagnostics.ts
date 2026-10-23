const names = new Set([
  'Error',
  'TypeError',
  'RangeError',
  'DOMException',
  'DataCloneError',
  'SandboxError',
])
const codes = new Set([
  'COMMAND_NOT_FOUND',
  'COMMAND_PERMISSION_DENIED',
  'COMMAND_EXECUTION_ERROR',
  'PROCESS_ERROR',
  'PROCESS_READY_TIMEOUT',
  'PROCESS_EXITED_BEFORE_READY',
  'INTERNAL_ERROR',
  'RPC_TRANSPORT_ERROR',
])
const reasons: ReadonlyArray<readonly [string, string]> = [
  ['AbortSignal serialization is not enabled.', 'abort-signal-serialization'],
  ['not a function', 'missing-method'],
  ['does not implement', 'rpc-method'],
  ['could not be cloned', 'rpc-serialization'],
  ['Cannot perform I/O on behalf of a different request', 'request-ownership'],
  ['No such file or directory', 'missing-file'],
  ['Permission denied', 'permission-denied'],
  ['Container is currently provisioning', 'provisioning'],
  ['Language startup cancelled', 'cancelled'],
  ['Language startup failed', 'health-check'],
  ['Language configuration failed', 'configuration'],
]

/** Never log SDK messages/context: they may contain process environments or tokens. */
export function languageStartupDiagnostic(error: unknown) {
  let code = 'unknown'
  let name = 'unknown'
  let reason = 'unknown'
  try {
    if (error && typeof error === 'object' && 'code' in error) {
      const candidate = error.code
      if (typeof candidate === 'string' && codes.has(candidate)) code = candidate
    }
  } catch {
    // A diagnostic must never replace the original failure or prevent cleanup.
  }
  try {
    if (error instanceof Error) {
      const candidate = error.name
      if (names.has(candidate)) name = candidate
    }
  } catch {
    // SDK errors can expose properties through throwing getters.
  }
  try {
    if (error instanceof Error) {
      const message = error.message
      if (typeof message === 'string')
        reason = reasons.find(([phrase]) => message.includes(phrase))?.[1] ?? 'unknown'
    }
  } catch {
    // Cleanup must remain available even if diagnostic inspection fails.
  }
  return { name, code, reason }
}

export class LanguageStartupFailure extends Error {
  readonly diagnostic
  constructor(stage: 'sandbox' | 'process' | 'port' | 'configure' | 'health', cause: unknown) {
    super('Language startup failed', { cause })
    this.diagnostic = { stage, ...languageStartupDiagnostic(cause) }
  }
}
