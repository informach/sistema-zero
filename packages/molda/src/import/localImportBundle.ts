/** Browser file metadata; reading is deferred until the complete selection passes preflight. */
export interface LocalImportChosenFile {
  name: string
  size: number
  webkitRelativePath?: string
  arrayBuffer(): Promise<ArrayBuffer>
}
export interface LocalImportFile {
  path: string
  bytes: Uint8Array
}
export interface LocalImportBundle {
  /** Session-owned read-only bytes. Appending does not recopy existing buffers. */
  files: LocalImportFile[]
  entries: string[]
}

/** Previous files must belong to this same staging session, not arbitrary external buffers. */
export async function readLocalImportBundle(
  chosen: readonly LocalImportChosenFile[],
  signal: AbortSignal,
  previous: readonly LocalImportFile[],
  format: {
    resources: number
    fileBytes: number
    selectedFileBytes: number
    path(value: string): string
    entry(path: string): boolean
    error(reason: 'invalid' | 'budget', path: string, message: string): Error
  },
): Promise<LocalImportBundle> {
  signal.throwIfAborted()
  if (chosen.length + previous.length > format.resources + 1)
    throw format.error(
      'budget',
      'files',
      `Escolha no máximo ${(format.resources + 1).toLocaleString(
        'pt-BR',
      )} arquivos, incluindo o modelo.`,
    )
  const paths = new Set(previous.map((file) => file.path))
  let bytes = previous.reduce((sum, file) => sum + file.bytes.byteLength, 0)
  const plans = chosen.map((file) => {
    const path = format.path(file.webkitRelativePath || file.name)
    if (paths.has(path))
      throw format.error(
        'invalid',
        'files',
        'Já existe um arquivo com esse caminho. Escolha o conjunto completo novamente para trocá-lo.',
      )
    paths.add(path)
    if (!Number.isSafeInteger(file.size) || file.size < 0)
      throw format.error('invalid', path, 'O tamanho deste arquivo é inválido.')
    bytes += file.size
    if (file.size > format.fileBytes || bytes > format.selectedFileBytes)
      throw format.error('budget', path, 'Use arquivos de até 32 MiB e um conjunto de até 64 MiB.')
    return { file, path, size: file.size }
  })
  const files = previous.map((file) => ({ path: file.path, bytes: file.bytes }))
  for (const plan of plans) {
    signal.throwIfAborted()
    const buffer = await plan.file.arrayBuffer()
    signal.throwIfAborted()
    if (!(buffer instanceof ArrayBuffer) || buffer.byteLength !== plan.size)
      throw format.error(
        'invalid',
        plan.path,
        'O tamanho lido não corresponde ao arquivo escolhido.',
      )
    files.push({ path: plan.path, bytes: new Uint8Array(buffer) })
  }
  return {
    files,
    entries: files.filter((file) => format.entry(file.path)).map((file) => file.path),
  }
}
