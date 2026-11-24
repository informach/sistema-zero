let anterior = Promise.resolve()

/** Shared by file export and Studio import: a canceled compiler releases before the next starts. */
export async function naFilaDeCompilacao<T>(
  sinal: AbortSignal,
  fazer: () => Promise<T>,
): Promise<T> {
  sinal.throwIfAborted()
  const esperar = anterior
  let concluir!: () => void
  anterior = new Promise<void>((resolve) => {
    concluir = resolve
  })
  try {
    await esperar
    sinal.throwIfAborted()
    return await fazer()
  } finally {
    concluir()
  }
}
