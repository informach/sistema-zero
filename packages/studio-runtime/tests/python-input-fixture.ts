import { studioPythonExecutionRevision } from '@sistemazero/core/studio/python-execution-content'
import { sha256 } from '../src/artifacts'
import { createPythonInputStore, type PythonInputBucket } from '../src/python-inputs'

export async function pythonInputFixture() {
  const bytes = new Uint8Array([239, 187, 191, 0, 255, 42])
  const fileHash = await sha256(bytes)
  const content = {
    version: 1 as const,
    configuration: {
      runtime: { profileId: 'python-browser', releaseId: 'test-1', manifestSha256: 'a'.repeat(64) },
      extensions: [],
      python: {
        entrypoint: 'main.py',
        dependencyLock: {
          lockVersion: 1 as const,
          target: 'browser' as const,
          pythonVersion: '3.14.2',
          runtimeManifestSha256: 'a'.repeat(64),
          requirementsSha256: 'b'.repeat(64),
          packages: [],
        },
      },
    },
    directories: [],
    files: [
      { path: 'main.py', kind: 'source' as const, sha256: fileHash, byteLength: bytes.byteLength },
    ],
  }
  const request = {
    version: 1 as const,
    owner: 'd'.repeat(64),
    requestId: crypto.randomUUID(),
    executionId: 'python-1234567890abcdef',
    snapshot: {
      ...content,
      projectId: 'game',
      revision: await studioPythonExecutionRevision(content),
    },
  }
  let time = 1000
  const objects = new Map<string, { bytes: Uint8Array<ArrayBuffer>; hash: ArrayBuffer }>()
  const bucket: PythonInputBucket = {
    async get(key) {
      const object = objects.get(key)
      return object
        ? {
            body: new Blob([object.bytes]).stream(),
            size: object.bytes.byteLength,
            checksums: { sha256: object.hash },
          }
        : null
    },
    async put(key, value, options) {
      if (options.onlyIf && objects.has(key)) return null
      const data =
        value instanceof Uint8Array
          ? new Uint8Array(value)
          : new Uint8Array(await new Response(value).arrayBuffer())
      if ((await sha256(data)) !== options.sha256) throw new Error('R2 checksum mismatch')
      objects.set(key, { bytes: data, hash: await crypto.subtle.digest('SHA-256', data) })
      return { etag: options.sha256 }
    },
    async delete(keys) {
      for (const key of keys) objects.delete(key)
    },
  }
  const controller = new AbortController()
  return {
    bytes,
    fileHash,
    request,
    objects,
    bucket,
    controller,
    store: createPythonInputStore(bucket, () => time),
    setTime(value: number) {
      time = value
    },
  }
}
