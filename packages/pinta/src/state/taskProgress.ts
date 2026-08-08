import type { PintaTaskSession } from '../core/types'

type TaskProgressInput = Parameters<PintaTaskSession['onProgress']>[0]

/** Persiste o progresso pelo host sem transformar uma rejeição em unhandled. */
export async function updateTaskProgress(
  session: Pick<PintaTaskSession, 'onProgress'>,
  input: TaskProgressInput,
): Promise<boolean> {
  try {
    await session.onProgress(input)
    return true
  } catch {
    return false
  }
}
