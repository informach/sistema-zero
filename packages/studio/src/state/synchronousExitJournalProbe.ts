/** Startup can probe recovery storage without loading its document encoder. */
export const EXIT_JOURNAL_PREFIX = 'sz:studio-exit:'

export class ExitJournalError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ExitJournalError'
  }
}

export function exitJournalUnavailable(cause?: unknown): ExitJournalError {
  return new ExitJournalError(
    'Não foi possível guardar a cópia de recuperação. Mantenha esta aba aberta até salvar ou exportar o projeto.',
    { cause },
  )
}

export function captureExitJournalStorage(): Storage | undefined {
  try {
    return globalThis.localStorage
  } catch (error) {
    const fail = (): never => {
      throw exitJournalUnavailable(error)
    }
    return new Proxy({} as Storage, { get: fail, ownKeys: fail })
  }
}

export function hasSynchronousExitJournal(storage: Storage | undefined, scope: string): boolean {
  if (!storage) return false
  try {
    return Object.keys(storage).some(
      (key) =>
        key.startsWith(EXIT_JOURNAL_PREFIX) &&
        key.slice(EXIT_JOURNAL_PREFIX.length).split('|')[1] === encodeURIComponent(scope),
    )
  } catch {
    return true
  } // The recovery boundary reports inaccessible storage explicitly.
}
