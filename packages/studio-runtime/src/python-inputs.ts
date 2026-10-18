import { verifyStudioPythonExecutionMetadata } from '@sistemazero/core/studio/python-execution-content'
import {
  STUDIO_PYTHON_INPUT_LIMITS,
  StudioPythonInputOpenSchema,
  type StudioPythonInputReference,
  StudioPythonInputReferenceSchema,
  type StudioPythonInputState,
  StudioPythonInputStateSchema,
} from '@sistemazero/core/studio/python-validation-input'
import { sha256 } from './artifacts'
import { verifiedPythonFileStream } from './python-file-stream'

/** Private binary storage port; the production R2 binding supports checksums and conditional writes. */
export interface PythonInputBucket {
  get(key: string): Promise<{
    body: ReadableStream<Uint8Array>
    size: number
    checksums?: { sha256?: ArrayBuffer }
  } | null>
  put(
    key: string,
    value: Uint8Array | ReadableStream<Uint8Array>,
    options: { sha256: string; onlyIf?: { etagDoesNotMatch: '*' }; bytes?: number },
  ): Promise<{ etag: string } | null>
  delete(keys: string[]): Promise<void>
}
export class PythonInputError extends Error {
  constructor(
    readonly status: 400 | 404 | 409 | 410 | 413,
    message: string,
  ) {
    super(message)
  }
}
export const pythonInputFileKey = (
  state: Pick<StudioPythonInputState, 'inputId' | 'generation'>,
  hash: string,
) => `python-inputs/${state.inputId}/${state.generation}/files/${hash}`
export const PYTHON_INPUT_STATE_PREFIX = 'python-input-states/'
export const pythonInputStateKey = (id: string) => `${PYTHON_INPUT_STATE_PREFIX}${id}.json`
const closedKey = (state: Pick<StudioPythonInputState, 'inputId' | 'generation'>) =>
  `python-inputs/${state.inputId}/${state.generation}/closed.json`
const closedBytes = new TextEncoder().encode('{"version":1}')
const checksum = (value: ArrayBuffer | undefined) => value && Buffer.from(value).toString('hex')

export function inputAwait<Value>(
  pending: Promise<Value>,
  signal: AbortSignal,
  retire?: (value: Value) => void,
) {
  return new Promise<Value>((resolve, reject) => {
    let settled = false
    const abort = () => {
      if (!settled) {
        settled = true
        signal.removeEventListener('abort', abort)
        reject(signal.reason)
      }
    }
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) abort()
    pending.then(
      (value) => {
        signal.removeEventListener('abort', abort)
        if (settled || signal.aborted) {
          retire?.(value)
          if (!settled) reject(signal.reason)
          return
        }
        settled = true
        resolve(value)
      },
      (error) => {
        signal.removeEventListener('abort', abort)
        if (!settled) {
          settled = true
          reject(error)
        }
      },
    )
  })
}
const operationSignal = (signal: AbortSignal) =>
  AbortSignal.any([signal, AbortSignal.timeout(STUDIO_PYTHON_INPUT_LIMITS.uploadDeadlineMs)])

/** Storage is not execution authorization. Every caller must be an authenticated S2S endpoint. */
export function createPythonInputStore(bucket: PythonInputBucket, now: () => number = Date.now) {
  async function isClosed(state: StudioPythonInputState, signal: AbortSignal) {
    const object = await inputAwait(bucket.get(closedKey(state)), signal, (object) => {
      void object?.body.cancel(signal.reason).catch(() => {})
    })
    if (!object) return false
    void object.body.cancel().catch(() => {})
    const valid =
      object.size === closedBytes.byteLength &&
      checksum(object.checksums?.sha256) === (await sha256(closedBytes))
    signal.throwIfAborted()
    if (!valid) throw new PythonInputError(409, 'O fechamento do input Python está inválido.')
    return true
  }
  const check = (state: StudioPythonInputState, signal: AbortSignal) => {
    signal.throwIfAborted()
    if (now() >= state.expiresAt)
      throw new PythonInputError(410, 'O input Python expirou. Prepare uma nova revisão.')
  }
  const reference = (state: StudioPythonInputState): StudioPythonInputReference => ({
    version: 1,
    inputId: state.inputId,
    requestId: state.requestId,
    generation: state.generation,
    projectId: state.snapshot.projectId,
    owner: state.owner,
    executionId: state.executionId,
    revision: state.snapshot.revision,
    expiresAt: state.expiresAt,
  })
  async function readState(id: string, signal: AbortSignal, allowClosed = false) {
    signal.throwIfAborted()
    const object = await inputAwait(bucket.get(pythonInputStateKey(id)), signal, (object) => {
      void object?.body.cancel(signal.reason).catch(() => {})
    })
    if (!object) throw new PythonInputError(404, 'Input Python não encontrado.')
    let transfer: ReturnType<typeof verifiedPythonFileStream> | undefined
    try {
      signal.throwIfAborted()
      const hash = checksum(object.checksums?.sha256)
      if (!hash || object.size > STUDIO_PYTHON_INPUT_LIMITS.metadataBytes) {
        throw new PythonInputError(409, 'Metadata do input Python inválida.')
      }
      transfer = verifiedPythonFileStream({
        body: object.body,
        bytes: object.size,
        sha256: hash,
        signal,
      })
      const raw: unknown = JSON.parse(await new Response(transfer.stream).text())
      await transfer.complete
      const state = StudioPythonInputStateSchema.parse(raw)
      if (state.inputId !== id)
        throw new PythonInputError(409, 'A identidade do input Python mudou.')
      check(state, signal)
      await verifyStudioPythonExecutionMetadata(state.snapshot)
      if (!allowClosed && (await isClosed(state, signal)))
        throw new PythonInputError(
          410,
          'O input Python foi encerrado. Prepare uma nova solicitação.',
        )
      check(state, signal)
      return state
    } catch (error) {
      if (transfer) transfer.cancel(error)
      else void object.body.cancel(error).catch(() => {})
      throw error
    }
  }
  async function load(raw: unknown, signal: AbortSignal, allowClosed = false) {
    const ref = StudioPythonInputReferenceSchema.parse(raw)
    const state = await readState(ref.inputId, signal, allowClosed)
    if (
      state.owner !== ref.owner ||
      state.requestId !== ref.requestId ||
      state.generation !== ref.generation ||
      state.snapshot.projectId !== ref.projectId ||
      state.executionId !== ref.executionId ||
      state.snapshot.revision !== ref.revision ||
      state.expiresAt !== ref.expiresAt
    )
      throw new PythonInputError(409, 'O input pertence a outra execução Python.')
    check(state, signal)
    return state
  }
  async function open(raw: unknown, signal: AbortSignal) {
    signal = operationSignal(signal)
    const request = StudioPythonInputOpenSchema.parse(raw)
    let snapshot: StudioPythonInputState['snapshot']
    try {
      snapshot = await verifyStudioPythonExecutionMetadata(request.snapshot)
    } catch {
      throw new PythonInputError(400, 'A revisão do input Python não corresponde à metadata.')
    }
    signal.throwIfAborted()
    const lengths = new Map<string, number>()
    for (const file of snapshot.files) {
      if (lengths.has(file.sha256) && lengths.get(file.sha256) !== file.byteLength)
        throw new PythonInputError(400, 'O mesmo hash foi declarado com tamanhos diferentes.')
      lengths.set(file.sha256, file.byteLength)
    }
    // Stable request nonce permits recovery after a lost response; id is still derived by the service.
    const inputId = (
      await sha256(
        new TextEncoder().encode(
          JSON.stringify([
            'python-input-v1',
            request.owner,
            request.executionId,
            snapshot.projectId,
            snapshot.revision,
            request.requestId,
          ]),
        ),
      )
    ).slice(0, 32)
    const createdAt = now()
    const state = StudioPythonInputStateSchema.parse({
      ...request,
      snapshot,
      inputId,
      generation: crypto.randomUUID(),
      createdAt,
      expiresAt: createdAt + STUDIO_PYTHON_INPUT_LIMITS.lifetimeMs,
    })
    const bytes = new TextEncoder().encode(JSON.stringify(state))
    if (bytes.byteLength > STUDIO_PYTHON_INPUT_LIMITS.metadataBytes)
      throw new PythonInputError(413, 'Metadata Python excessiva.')
    check(state, signal)
    const stored = await inputAwait(
      bucket.put(pythonInputStateKey(inputId), bytes, {
        sha256: await sha256(bytes),
        onlyIf: { etagDoesNotMatch: '*' },
      }),
      signal,
    )
    check(state, signal)
    if (stored) return reference(state)
    const existing = await readState(inputId, signal)
    if (
      existing.owner !== request.owner ||
      existing.executionId !== request.executionId ||
      existing.requestId !== request.requestId ||
      existing.snapshot.projectId !== snapshot.projectId ||
      existing.snapshot.revision !== snapshot.revision
    )
      throw new PythonInputError(409, 'Conflito ao recuperar o input Python.')
    check(existing, signal)
    return reference(existing)
  }
  async function upload(
    raw: unknown,
    fileHash: string,
    body: ReadableStream<Uint8Array>,
    signal: AbortSignal,
  ) {
    signal = operationSignal(signal)
    let ownedBody: ReadableStream<Uint8Array> | undefined = body
    let transfer: ReturnType<typeof verifiedPythonFileStream> | undefined
    try {
      const state = await load(raw, signal)
      const file = state.snapshot.files.find((file) => file.sha256 === fileHash)
      if (!file) throw new PythonInputError(400, 'O arquivo não pertence a este input Python.')
      const lifetime = AbortSignal.any([
        signal,
        AbortSignal.timeout(STUDIO_PYTHON_INPUT_LIMITS.uploadDeadlineMs),
        AbortSignal.timeout(Math.max(1, state.expiresAt - now())),
      ])
      transfer = verifiedPythonFileStream({
        body,
        bytes: file.byteLength,
        sha256: file.sha256,
        signal: lifetime,
      })
      ownedBody = undefined
      const key = pythonInputFileKey(state, file.sha256)
      const stored = await inputAwait(
        bucket.put(key, transfer.stream, {
          sha256: file.sha256,
          bytes: file.byteLength,
          onlyIf: { etagDoesNotMatch: '*' },
        }),
        lifetime,
      )
      if (!stored) {
        transfer.cancel(new Error('Upload Python já presente.'))
        const existing = await inputAwait(bucket.get(key), lifetime, (object) => {
          void object?.body.cancel(lifetime.reason).catch(() => {})
        })
        if (!existing) throw new PythonInputError(409, 'O arquivo não foi confirmado.')
        await inputAwait(existing.body.cancel(), lifetime)
        if (
          existing.size !== file.byteLength ||
          checksum(existing.checksums?.sha256) !== file.sha256
        )
          throw new PythonInputError(409, 'Há outros bytes no endereço imutável do input.')
      } else await transfer.complete
      check(state, lifetime)
      await load(reference(state), lifetime)
      check(state, lifetime)
      return { sha256: file.sha256, bytes: file.byteLength }
    } catch (error) {
      transfer?.cancel(error)
      throw error
    } finally {
      if (ownedBody) void ownedBody.cancel().catch(() => {})
    }
  }
  async function resolve(raw: unknown, signal: AbortSignal) {
    signal = operationSignal(signal)
    const state = await load(raw, signal)
    check(state, signal)
    return {
      snapshot: structuredClone(state.snapshot),
      expiresAt: state.expiresAt,
      async read(path: string, operationSignal: AbortSignal) {
        check(state, operationSignal)
        const file = state.snapshot.files.find((file) => file.path === path)
        if (!file) throw new PythonInputError(404, 'Arquivo ausente no input Python.')
        const object = await inputAwait(
          bucket.get(pythonInputFileKey(state, file.sha256)),
          operationSignal,
          (object) => {
            void object?.body.cancel(operationSignal.reason).catch(() => {})
          },
        )
        if (!object) throw new PythonInputError(409, 'O input Python ainda está incompleto.')
        try {
          check(state, operationSignal)
          if (object.size !== file.byteLength || checksum(object.checksums?.sha256) !== file.sha256)
            throw new PythonInputError(409, 'O arquivo do input Python mudou.')
          const lifetime = AbortSignal.any([
            operationSignal,
            AbortSignal.timeout(Math.max(1, state.expiresAt - now())),
          ])
          return verifiedPythonFileStream({
            body: object.body,
            bytes: file.byteLength,
            sha256: file.sha256,
            signal: lifetime,
          }).stream
        } catch (error) {
          void object.body.cancel(error).catch(() => {})
          throw error
        }
      },
    }
  }
  async function remove(raw: unknown, signal: AbortSignal) {
    signal = operationSignal(signal)
    const state = await load(raw, signal, true)
    const stored = await inputAwait(
      bucket.put(closedKey(state), closedBytes, {
        sha256: await sha256(closedBytes),
        onlyIf: { etagDoesNotMatch: '*' },
      }),
      signal,
    )
    if (!stored && !(await isClosed(state, signal)))
      throw new PythonInputError(409, 'O fechamento do input Python não foi confirmado.')
    signal.throwIfAborted()
    await inputAwait(
      bucket.delete([
        ...new Set(state.snapshot.files.map((file) => pythonInputFileKey(state, file.sha256))),
      ]),
      signal,
    )
    signal.throwIfAborted()
  }
  return { open, upload, resolve, remove }
}
