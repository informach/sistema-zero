import { verifyStudioPythonExecutionMetadata } from '@sistemazero/core/studio/python-execution-content'
import {
  STUDIO_PYTHON_INPUT_LIMITS,
  type StudioPythonInputState,
  StudioPythonInputStateSchema,
} from '@sistemazero/core/studio/python-validation-input'
import { PythonFileVerificationError, verifiedPythonFileStream } from './python-file-stream'
import {
  inputAwait,
  PYTHON_INPUT_STATE_PREFIX,
  type PythonInputBucket,
  pythonInputFileKey,
} from './python-inputs'

export interface PythonInputGcBucket extends Pick<PythonInputBucket, 'get' | 'delete'> {
  list(options: {
    prefix: string
    limit: number
    cursor?: string
  }): Promise<{ objects: { key: string }[]; truncated: boolean; cursor?: string }>
}

/** Deletes expired private bytes only. Small admission records remain as tombstones until lifecycle expiry. */
export async function collectPythonInputGarbage(options: {
  bucket: PythonInputGcBucket
  cursor: { load(): Promise<string | undefined>; save(cursor?: string): Promise<void> }
  signal?: AbortSignal
  now?: () => number
}) {
  const signal = AbortSignal.any([
    ...(options.signal ? [options.signal] : []),
    AbortSignal.timeout(25_000),
  ])
  const now = options.now ?? Date.now
  signal.throwIfAborted()
  const cursor = await inputAwait(options.cursor.load(), signal)
  if (cursor !== undefined && (typeof cursor !== 'string' || cursor.length > 2048))
    throw new Error('Cursor da limpeza Python inválido.')
  const page = await inputAwait(
    options.bucket.list({
      prefix: PYTHON_INPUT_STATE_PREFIX,
      limit: STUDIO_PYTHON_INPUT_LIMITS.cleanupBatch,
      ...(cursor ? { cursor } : {}),
    }),
    signal,
  )
  if (
    page.objects.length > STUDIO_PYTHON_INPUT_LIMITS.cleanupBatch ||
    (page.truncated && !page.cursor)
  )
    throw new Error('Página da limpeza Python inválida.')
  let states = 0,
    removalRequests = 0,
    failed = 0
  for (const entry of page.objects) {
    signal.throwIfAborted()
    const match = /^python-input-states\/([a-f0-9]{32})\.json$/.exec(entry.key)
    if (!match) continue
    states++
    // Operational failures must retry this page. Only proven invalid metadata may be skipped.
    const object = await inputAwait(options.bucket.get(entry.key), signal, (object) => {
      void object?.body.cancel(signal.reason).catch(() => {})
    })
    if (!object) continue
    let transfer: ReturnType<typeof verifiedPythonFileStream> | undefined
    let text: string
    try {
      signal.throwIfAborted()
      const checksum = object.checksums?.sha256
      if (!checksum || object.size > STUDIO_PYTHON_INPUT_LIMITS.metadataBytes)
        throw new PythonFileVerificationError('Metadata da limpeza Python inválida.')
      transfer = verifiedPythonFileStream({
        body: object.body,
        bytes: object.size,
        sha256: Buffer.from(checksum).toString('hex'),
        signal,
      })
      text = await new Response(transfer.stream).text()
      await transfer.complete
    } catch (error) {
      if (transfer) transfer.cancel(error)
      else void object.body.cancel(error).catch(() => {})
      signal.throwIfAborted()
      if (!(error instanceof PythonFileVerificationError)) throw error
      failed++
      continue
    }
    let state: StudioPythonInputState
    try {
      state = StudioPythonInputStateSchema.parse(JSON.parse(text))
      if (state.inputId !== match[1]) throw new Error('Identidade da limpeza Python inválida.')
      await verifyStudioPythonExecutionMetadata(state.snapshot)
    } catch {
      signal.throwIfAborted()
      failed++
      continue
    }
    signal.throwIfAborted()
    if (now() < state.expiresAt) continue
    const keys = [
      ...new Set(state.snapshot.files.map((file) => pythonInputFileKey(state, file.sha256))),
    ]
    await inputAwait(options.bucket.delete(keys), signal)
    removalRequests += keys.length
  }
  signal.throwIfAborted()
  await inputAwait(options.cursor.save(page.truncated ? page.cursor : undefined), signal)
  signal.throwIfAborted()
  return { scanned: page.objects.length, states, removalRequests, failed }
}
