import { verifyStudioPythonWebPayload } from '@sistemazero/core/studio/python-execution-content'
import type { PythonExecutionSnapshot } from './protocol'
import { fetchPythonWebBytes, pythonWebBytesSha256 } from './webFiles'

export const PYTHON_WEB_METADATA_BYTES = 2 * 1024 * 1024

/** Standalone and isolated validators consume the same immutable execution content. */
export async function loadPythonWebPayload(directory: URL, signal: AbortSignal) {
  if (
    !['http:', 'https:'].includes(directory.protocol) ||
    directory.username ||
    directory.password ||
    directory.search ||
    directory.hash ||
    !directory.pathname.endsWith('/')
  )
    throw new Error('Abra o pacote Python por um servidor HTTP.')
  const bytes = await fetchPythonWebBytes(
    new URL('payload.json', directory),
    PYTHON_WEB_METADATA_BYTES,
    signal,
  )
  const payload = await verifyStudioPythonWebPayload(
    JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)),
  )
  signal.throwIfAborted()
  const files: PythonExecutionSnapshot['files'] = []
  for (const file of payload.snapshot.files) {
    const bytes = await fetchPythonWebBytes(
      new URL(`project/${file.path}`, directory),
      file.byteLength,
      signal,
    )
    if (bytes.byteLength !== file.byteLength || (await pythonWebBytesSha256(bytes)) !== file.sha256)
      throw new Error(`O arquivo ${file.path} não corresponde ao pacote Python.`)
    signal.throwIfAborted()
    files.push({ path: file.path, kind: file.kind, sha256: file.sha256, bytes })
  }
  const snapshot: PythonExecutionSnapshot = { ...payload.snapshot, files }
  return { name: payload.name, snapshot }
}
