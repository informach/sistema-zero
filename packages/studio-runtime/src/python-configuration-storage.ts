import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { awaitWithSignal } from '@sistemazero/core/http'
import { StudioSha256Schema } from '@sistemazero/core/studio/project-environment'
import { StudioPythonRuntimeConfigurationSchema } from '@sistemazero/core/studio/python-runtime-distribution'
import {
  createConfiguredPythonRuntime,
  PYTHON_CONFIGURATION_MAX_BYTES,
} from './python-configuration'
import type { PythonDistributionRegistry, RuntimeDistributionBucket } from './python-distributions'
import { verifiedPythonFileStream } from './python-file-stream'

type ConfigurationBucket = Pick<RuntimeDistributionBucket, 'get'>
const LOAD_TIMEOUT_MS = 10_000
const MAX_CACHED_CONFIGURATIONS = 8

export function pythonRuntimeConfigurationKey(sha256: string) {
  return `runtime-configs/${StudioSha256Schema.parse(sha256)}.json`
}

/** Canonical public descriptor: publishing an object never activates it. */
export async function describePythonRuntimeConfiguration(raw: unknown) {
  const configuration = StudioPythonRuntimeConfigurationSchema.parse(raw)
  const text = canonicalJson(configuration)
  const bytes = new TextEncoder().encode(text).byteLength
  if (bytes > PYTHON_CONFIGURATION_MAX_BYTES)
    throw new Error('A configuração Python excede o limite.')
  await createConfiguredPythonRuntime(text)
  const sha256 = await sha256Hex(text)
  return { sha256, key: pythonRuntimeConfigurationKey(sha256), bytes }
}

/** Native checksum + conditional creation. A conflicting object is never overwritten. */
export async function storePythonRuntimeConfiguration(options: {
  bucket: RuntimeDistributionBucket
  configuration: unknown
}) {
  const configuration = StudioPythonRuntimeConfigurationSchema.parse(options.configuration)
  const descriptor = await describePythonRuntimeConfiguration(configuration)
  const bytes = new TextEncoder().encode(canonicalJson(configuration))
  const stored = await options.bucket.put(descriptor.key, bytes, {
    sha256: descriptor.sha256,
    onlyIf: { etagDoesNotMatch: '*' },
  })
  if (!stored)
    await readPythonRuntimeConfiguration(
      options.bucket,
      descriptor.sha256,
      AbortSignal.timeout(LOAD_TIMEOUT_MS),
    )
  return descriptor
}

/** Byte limits apply before materialization; the native checksum is not a substitute for hashing bytes. */
export async function readPythonRuntimeConfiguration(
  bucket: ConfigurationBucket,
  digest: string,
  signal: AbortSignal,
) {
  const key = pythonRuntimeConfigurationKey(digest)
  const object = await awaitWithSignal(
    () => bucket.get(key),
    signal,
    (late) => {
      void late?.body.cancel().catch(() => {})
    },
  )
  if (!object) throw new Error('Catálogo Python indisponível.')
  const checksum = object.checksums?.sha256
  if (
    !Number.isSafeInteger(object.size) ||
    object.size < 1 ||
    object.size > PYTHON_CONFIGURATION_MAX_BYTES ||
    !checksum ||
    new Uint8Array(checksum).length !== 32 ||
    Array.from(new Uint8Array(checksum), (value) => value.toString(16).padStart(2, '0')).join(
      '',
    ) !== digest
  ) {
    void object.body.cancel().catch(() => {})
    throw new Error('Identidade ou limite do catálogo Python inválido.')
  }
  const verified = verifiedPythonFileStream({
    body: object.body,
    bytes: object.size,
    sha256: digest,
    signal,
  })
  const text = await new Response(verified.stream).text()
  await verified.complete
  signal.throwIfAborted()
  return StudioPythonRuntimeConfigurationSchema.parse(JSON.parse(text))
}

interface CachedConfiguration {
  promise: Promise<PythonDistributionRegistry>
  controller: AbortController
  waiting: number
  settled: boolean
}

/** One isolate/owner shares in-flight reads only for the exact bucket identity and pinned digest. */
export function createPythonRuntimeConfigurationLoader() {
  const buckets = new WeakMap<ConfigurationBucket, Map<string, CachedConfiguration>>()
  return async (
    bucket: ConfigurationBucket,
    digest: string,
    context: { signal: AbortSignal; assertCurrent(): void },
  ) => {
    const check = () => {
      context.signal.throwIfAborted()
      context.assertCurrent()
    }
    check()
    pythonRuntimeConfigurationKey(digest)
    let cache = buckets.get(bucket)
    if (!cache) {
      cache = new Map()
      buckets.set(bucket, cache)
    }
    let entry = cache.get(digest)
    if (!entry) {
      if (cache.size >= MAX_CACHED_CONFIGURATIONS) {
        const oldest = [...cache].find(([, value]) => value.settled)
        if (!oldest) throw new Error('Há leituras demais de catálogos Python em andamento.')
        cache.delete(oldest[0])
      }
      const controller = new AbortController()
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(LOAD_TIMEOUT_MS)])
      const pending: CachedConfiguration = {
        controller,
        waiting: 0,
        settled: false,
        promise: Promise.resolve().then(async () => {
          const configuration = await readPythonRuntimeConfiguration(bucket, digest, signal)
          const registry = await createConfiguredPythonRuntime(canonicalJson(configuration))
          signal.throwIfAborted()
          return registry
        }),
      }
      const capturedCache = cache
      pending.promise = pending.promise.then(
        (registry) => {
          pending.settled = true
          return registry
        },
        (error) => {
          pending.settled = true
          if (capturedCache.get(digest) === pending) capturedCache.delete(digest)
          throw error
        },
      )
      void pending.promise.catch(() => {})
      cache.set(digest, pending)
      entry = pending
    }
    entry.waiting++
    const selected = entry
    try {
      const registry = await awaitWithSignal(() => selected.promise, context.signal)
      check()
      return registry
    } finally {
      entry.waiting--
      if (!entry.waiting && !entry.settled) {
        if (cache.get(digest) === entry) cache.delete(digest)
        entry.controller.abort(new Error('A leitura do catálogo Python perdeu seus solicitantes.'))
      }
    }
  }
}
