import 'server-only'
import type { StudioAiActor } from '@sistemazero/core/ai-credits'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { awaitWithSignal } from '@sistemazero/core/http'
import type { StudioProBuilderJob } from '@sistemazero/core/studio/pro-builder'
import type { StudioProRevision } from '@sistemazero/core/studio/pro-revision'
import {
  type StudioPythonBuilderValidationOutcome,
  validateStudioPythonBuilderCandidate,
} from '@sistemazero/core/studio/python-builder-validation'
import type { MembersClient } from './clients'

export interface StudioPythonBuilderRuntime {
  runtimeUrl: string
  runtimeToken: string
  languageUrl: string
  languageToken: string
  allowLocalHttp: boolean
}
type Passed = Extract<StudioPythonBuilderValidationOutcome, { status: 'passed' }>
type Failed = Exclude<StudioPythonBuilderValidationOutcome, Passed>
const ownsPreview = (
  job: StudioProBuilderJob | null,
  outcome: Passed,
  expected: StudioProBuilderJob,
) =>
  job?.id === expected.id &&
  job.projectId === expected.projectId &&
  job?.phase === 'review' &&
  job.assistance?.disposition !== 'discarded' &&
  job.result?.revisionHash === outcome.preview.revisionHash &&
  job.result.preview?.kind === 'python' &&
  job.result.preview.reference.id === outcome.preview.reference.id &&
  job.result.preview.reference.sha256 === outcome.preview.reference.sha256

/** Only an authoritative absence or a fenced successor proves the in-flight write cannot win. */
const refusesPreview = (current: StudioProBuilderJob | null, expected: StudioProBuilderJob) =>
  current === null ||
  (current?.id === expected.id &&
    current.projectId === expected.projectId &&
    Number.isSafeInteger(current.version) &&
    current.version >= expected.version &&
    (current.version > expected.version ||
      current.phase === 'failed' ||
      current.phase === 'cancelled' ||
      current.assistance?.disposition === 'discarded'))

/** Holds disposal ownership until the SQL acknowledgement, including lost acknowledgements.
 * A withdrawn owner cannot start a successor; retirement/recovery cannot execute learner code. */
export async function runStudioPythonBuilderValidation(input: {
  members: Pick<MembersClient, 'studioBuilder'>
  actor: StudioAiActor
  job: StudioProBuilderJob
  token: string
  revision: StudioProRevision
  binaries: Record<string, { base64: string; sha256: string }>
  parentOrigin: string
  runtime: StudioPythonBuilderRuntime
  signal: AbortSignal
  accept(outcome: Passed): Promise<StudioProBuilderJob | null>
}): Promise<
  | { status: 'checkpointed'; job: StudioProBuilderJob | null }
  | { status: 'validation-failed'; outcome: Failed }
> {
  const {
    members,
    actor: rawActor,
    job: rawJob,
    token,
    parentOrigin,
    runtime: rawRuntime,
    signal,
    accept,
  } = input
  const actor = { ...rawActor },
    job = structuredClone(rawJob),
    runtime = { ...rawRuntime }
  signal.throwIfAborted()
  const revision = structuredClone(input.revision),
    binaries = structuredClone(input.binaries)
  const owner = await sha256Hex(
    canonicalJson({ kind: 'studio-builder', accountId: actor.accountId, userId: actor.userId }),
  )
  const binding = await sha256Hex(
    canonicalJson({
      owner,
      jobId: job.id,
      token,
      version: job.version,
      revisionHash: revision.hash,
    }),
  )
  signal.throwIfAborted()
  const outcome = await validateStudioPythonBuilderCandidate({
    revision,
    binaries,
    owner,
    binding,
    serviceUrl: runtime.languageUrl,
    serviceToken: runtime.languageToken,
    allowLocalHttp: runtime.allowLocalHttp,
    signal,
    runtime: {
      url: runtime.runtimeUrl,
      token: runtime.runtimeToken,
      executionId: `builder-${job.id.replaceAll('-', '')}-${job.version}`,
      requestId: token,
      parentOrigin,
      recipe: { version: 1 },
    },
    async authorize(base, metadata, runtimeOperation, operationSignal) {
      if (base.hash !== revision.hash)
        throw new Error('A revisão candidata mudou durante a validação.')
      const response = await awaitWithSignal(
        () =>
          members.studioBuilder(
            actor,
            {
              operation: 'authorize-validation',
              id: job.id,
              projectId: job.projectId,
              token,
              version: job.version,
              revisionHash: base.hash,
              runtimeOperation,
            },
            operationSignal,
          ),
        operationSignal,
      )
      operationSignal.throwIfAborted()
      const authorized = response.status === 200 ? response.body?.state?.authorization : undefined
      if (
        !authorized ||
        authorized.revisionHash !== base.hash ||
        authorized.executionRevision !== metadata.revision ||
        authorized.parentOrigin !== parentOrigin
      )
        throw new Error('A autorização desta revisão Python foi retirada.')
    },
    cleanupFailed() {
      console.warn('[studio-python-builder] language retirement pending', { jobId: job.id })
    },
    runtimeCleanupFailed() {
      console.warn('[studio-python-builder] execution retirement pending', { jobId: job.id })
    },
  })
  let dispatched = false,
    confirmed = false
  try {
    signal.throwIfAborted()
    if (outcome.status !== 'passed') return { status: 'validation-failed', outcome }
    dispatched = true
    const accepted = await accept(outcome)
    confirmed = ownsPreview(accepted, outcome, job)
    if (!confirmed) {
      if (!refusesPreview(accepted, job)) throw new Error('Preview acknowledgement inconclusive')
      await outcome.discardPreview()
    }
    signal.throwIfAborted()
    return { status: 'checkpointed', job: accepted }
  } catch (error) {
    if (outcome.status === 'passed' && !confirmed) {
      if (!dispatched) await outcome.discardPreview()
      else {
        // The UPDATE may already have committed. Never delete its game based on a lost reply.
        const recoverySignal = AbortSignal.timeout(5000)
        try {
          const recovered = await awaitWithSignal(
            () =>
              members.studioBuilder(
                actor,
                {
                  operation: 'get',
                  id: job.id,
                  projectId: job.projectId,
                },
                recoverySignal,
              ),
            recoverySignal,
          )
          recoverySignal.throwIfAborted()
          if (recovered.status !== 200 || !recovered.body)
            throw new Error('Receipt recovery unavailable')
          const state = recovered.body.state
          if (state !== null && (!state || typeof state.job !== 'object' || !state.job))
            throw new Error('Preview receipt recovery invalid')
          const recoveredJob = state === null ? null : state.job
          confirmed = ownsPreview(recoveredJob, outcome, job)
          if (!confirmed) {
            if (!refusesPreview(recoveredJob, job))
              throw new Error('Preview receipt recovery still pending')
            await outcome.discardPreview()
          } else if (!signal.aborted) return { status: 'checkpointed', job: recoveredJob }
        } catch {
          // The runtime's durable TTL retains cleanup ownership when receipt recovery is uncertain.
          console.warn('[studio-python-builder] preview receipt recovery pending', {
            jobId: job.id,
          })
        }
      }
    }
    throw error
  }
}
