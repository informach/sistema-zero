import { stat, statfs } from 'node:fs/promises'

/** Enforce the reservation while native tools write, before files can exhaust the disk. */
export async function withOutputBudget<T>(
  directory: string,
  files: string[],
  maximumBytes: number,
  signal: AbortSignal,
  work: (signal: AbortSignal) => Promise<T>,
) {
  const controller = new AbortController(),
    combined = AbortSignal.any([signal, controller.signal])
  combined.throwIfAborted()
  let checking: Promise<void> | undefined
  const check = async () => {
    const sizes = await Promise.all(
      files.map(async (file) => {
        try {
          return (await stat(file)).size
        } catch (error) {
          if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return 0
          throw error
        }
      }),
    )
    const disk = await statfs(directory)
    if (sizes.reduce((sum, size) => sum + size, 0) > maximumBytes)
      throw new Error('A saída excedeu o espaço reservado; prepare uma gravação menor')
    if (disk.bavail * disk.bsize < 512 * 1024 * 1024)
      throw new Error(
        'O disco ficou sem espaço seguro durante o processamento; o original foi preservado',
      )
  }
  await check()
  const timer = setInterval(() => {
    if (checking) return
    checking = check()
      .catch((error: unknown) => controller.abort(error))
      .finally(() => {
        checking = undefined
      })
  }, 1000)
  try {
    const value = await work(combined)
    await checking
    combined.throwIfAborted()
    await check()
    return value
  } finally {
    clearInterval(timer)
    await checking
  }
}
