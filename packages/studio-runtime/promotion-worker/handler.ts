import { studioPythonRuntimePrefix } from '@sistemazero/core/studio/python-runtime-distribution'
import { sha256 } from '../src/artifacts'
import { storePythonRuntimeConfiguration } from '../src/python-configuration-storage'
import {
  type RuntimeDistributionBucket,
  storePythonRuntimeDistribution,
} from '../src/python-distributions'
import {
  authorizePromotion,
  captureOperationalPlan,
  frameFiles,
  type OperationalPlan,
  PROMOTION_FRAME_LIMIT,
} from './protocol'

/** Narrow native-binding ports. Wrangler-generated deployment types must satisfy this boundary. */
export interface OperationalPromotionBindings {
  PYTHON_RUNTIME: RuntimeDistributionBucket
  OPERATOR_HMAC_KEY: string
  CF_VERSION_METADATA: { id: string }
}
type Failure = { stage: string; error: unknown }
async function outcome<T>(operation: () => Promise<T>) {
  try {
    return { ok: true as const, value: await operation() }
  } catch (error) {
    return { ok: false as const, error }
  }
}
function throwFailures(failures: unknown[]) {
  if (failures.length === 1) throw failures[0]
  if (failures.length > 1)
    throw new AggregateError(failures, 'Promotion operation and/or cleanup failed.', {
      cause: failures[0],
    })
}

/** Cancel settles the pending read; no raced-away reader/opening can outlive this owner. */
export async function readPromotionBody(request: Request, bytes: number, signal: AbortSignal) {
  if (!Number.isSafeInteger(bytes) || bytes < 12 || bytes > PROMOTION_FRAME_LIMIT)
    throw new Error('Promotion body allocation refused.')
  if (!request.body) throw new Error('Promotion body missing.')
  const reader = request.body.getReader()
  let cancelled: ReturnType<typeof outcome<void>> | undefined
  const cancel = () => (cancelled ??= outcome(() => reader.cancel()))
  const abort = () => {
    void cancel()
  }
  signal.addEventListener('abort', abort, { once: true })
  let completed = false
  const result = await outcome(async () => {
    signal.throwIfAborted()
    const frame = new Uint8Array(bytes)
    let offset = 0
    while (true) {
      const next = await reader.read()
      signal.throwIfAborted()
      if (next.done) {
        if (offset !== bytes) throw new Error('Truncated promotion frame.')
        completed = true
        return frame
      }
      if (
        !(next.value instanceof Uint8Array) ||
        next.value.byteLength === 0 ||
        next.value.byteLength > bytes - offset
      )
        throw new Error('Oversized promotion frame.')
      frame.set(next.value, offset)
      offset += next.value.byteLength
    }
  })
  signal.removeEventListener('abort', abort)
  const failures: unknown[] = result.ok ? [] : [result.error]
  if (!completed || cancelled) {
    const cleanup = await cancel()
    if (!cleanup.ok) failures.push(cleanup.error)
  }
  try {
    reader.releaseLock()
  } catch (error) {
    failures.push(error)
  }
  throwFailures(failures)
  if (!result.ok) throw result.error
  return result.value
}

function expectedObjects(plan: OperationalPlan) {
  const prefix = studioPythonRuntimePrefix(plan.deployment.release.manifestSha256)
  return new Map([
    ...plan.deployment.distribution.files.map(
      (file) =>
        [`${prefix}files/${file.path}`, { bytes: file.bytes, sha256: file.sha256 }] as const,
    ),
    [
      `${prefix}complete.json`,
      {
        bytes: new TextEncoder().encode(plan.verifiedDeployment.marker).byteLength,
        sha256: plan.verifiedDeployment.markerSha256,
      },
    ],
    [plan.descriptor.key, { bytes: plan.descriptor.bytes, sha256: plan.descriptor.sha256 }],
  ])
}

/** Module-level admission is only a per-isolate memory semaphore, never global ordering. */
export function createPromotionHandler(rawPlan: unknown, now = () => Date.now()) {
  const snapshot = structuredClone(rawPlan)
  let busy = false
  return async function fetch(request: Request, env: OperationalPromotionBindings) {
    if (snapshot === null)
      return new Response('Operational promotion is not configured.', { status: 503 })
    let plan: OperationalPlan, nonce: string
    try {
      plan = await captureOperationalPlan(snapshot)
      nonce = await authorizePromotion(
        request,
        plan,
        env.OPERATOR_HMAC_KEY,
        env.CF_VERSION_METADATA.id,
        now(),
      )
    } catch {
      return new Response('Operational promotion refused.', { status: 401 })
    }
    // No await between admission and claim; a second authorized payload is never read.
    if (busy) return new Response('Operational promotion is busy.', { status: 429 })
    busy = true
    const failures: Failure[] = [],
      bodies = new Set<ReadableStream>()
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(100_000)])
    let stage = 'frame',
      verifiedObjects = 0,
      stored = false,
      bodyCleanupConfirmed = false
    const active = () => {
      signal.throwIfAborted()
      if (
        now() >=
        Math.min(Number(request.headers.get('X-Promotion-Expires')), plan.approval.expiresAt)
      )
        throw new Error('Operational promotion expired.')
    }
    const expected = expectedObjects(plan)
    const bucket: RuntimeDistributionBucket = {
      async get(key) {
        active()
        if (!expected.has(key)) throw new Error('Unplanned read refused.')
        const object = await env.PYTHON_RUNTIME.get(key)
        if (object) bodies.add(object.body)
        active()
        return object // Actual native object, with its unmodified native checksums/body.
      },
      async put(key, bytes, options) {
        active()
        const file = expected.get(key)
        if (
          !file ||
          bytes.byteLength !== file.bytes ||
          options.sha256 !== file.sha256 ||
          options.onlyIf.etagDoesNotMatch !== '*'
        )
          throw new Error('Unplanned write refused.')
        const result = await env.PYTHON_RUNTIME.put(key, bytes, options)
        active()
        return result
      },
    }
    try {
      active()
      const frame = await readPromotionBody(request, plan.frameBytes, signal)
      active()
      if ((await sha256(frame)) !== plan.frameSha256)
        throw new Error('Promotion frame digest refused.')
      const files = frameFiles(frame, plan.deployment.distribution.files)
      stage = 'distribution'
      await storePythonRuntimeDistribution({
        bucket,
        deployment: plan.deployment,
        read: async (path) => {
          active()
          const view = files.get(path)
          if (!view) throw new Error('Unplanned source refused.')
          return view
        },
      })
      active()
      stage = 'configuration'
      await storePythonRuntimeConfiguration({ bucket, configuration: plan.configuration })
      active()
      stored = true
      stage = 'readback'
      for (const [key, file] of expected) {
        const object = await bucket.get(key)
        const checksum = object?.checksums?.sha256
        if (
          !object ||
          object.size !== file.bytes ||
          !checksum ||
          checksum.byteLength !== 32 ||
          Array.from(new Uint8Array(checksum), (byte) => byte.toString(16).padStart(2, '0')).join(
            '',
          ) !== file.sha256
        )
          throw new Error('Native promotion readback refused.')
        await object.body.cancel()
        active()
        verifiedObjects++
      }
    } catch (error) {
      failures.push({ stage, error })
    } finally {
      // Every acquired native body is closed before the response; no waitUntil/early ACK.
      for (const body of bodies) {
        const cleanup = await outcome(() => body.cancel())
        if (!cleanup.ok) failures.push({ stage: 'body-cleanup', error: cleanup.error })
      }
      bodyCleanupConfirmed = !failures.some((failure) => failure.stage === 'body-cleanup')
      busy = false // Release only after all actual native operations and body cleanup settle.
    }
    const complete =
      stored && verifiedObjects === expected.size && bodyCleanupConfirmed && failures.length === 0
    return Response.json(
      {
        version: 1,
        state: complete ? 'complete' : 'failed',
        planSha256: plan.approval.planSha256,
        operationalSha256: plan.operationalSha256,
        distributionSha256: plan.approval.distributionSha256,
        releaseManifestSha256: plan.deployment.release.manifestSha256,
        configurationSha256: plan.descriptor.sha256,
        workerVersion: env.CF_VERSION_METADATA.id,
        nonce,
        files: plan.deployment.distribution.files.length,
        verifiedObjects,
        bodyCleanupConfirmed,
        failures: failures.map((failure) => ({
          stage: failure.stage,
          type: typeof failure.error,
          nullRejection: failure.error === null,
        })),
        activationPerformed: false,
      },
      { status: complete ? 200 : 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
