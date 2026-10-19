import { DurableObject } from 'cloudflare:workers'
import { getSandbox } from '@cloudflare/sandbox'
import { canonicalJson } from '@sistemazero/core/creations'
import { awaitWithSignal, readJsonBodyWithLimit } from '@sistemazero/core/http'
import {
  STUDIO_PYTHON_JOB_DEADLINE_MS,
  type StudioPythonInspectionJobState,
  studioPythonInspectionJobId,
  studioPythonInspectionJobRetentionUntil,
  studioPythonInspectionSandboxId,
  verifyStudioPythonInspectionJobState,
} from '@sistemazero/core/studio/python-inspection-job'
import { StudioPythonPreviewAvailabilitySchema } from '@sistemazero/core/studio/python-preview-input'
import { STUDIO_PYTHON_VALIDATION_LIMITS } from '@sistemazero/core/studio/python-validation'
import {
  type StudioPythonInputReference,
  StudioPythonInputReferenceSchema,
  StudioPythonInspectionRequestSchema,
  StudioPythonValidationRequestSchema,
} from '@sistemazero/core/studio/python-validation-input'
import validationProfile from '../runtime/validation-profile.json' with { type: 'json' }
import type { Env } from './index'
import { createPythonRuntimeConfigurationLoader } from './python-configuration-storage'
import type { PythonInspectionSandbox } from './python-inspection'
import { createPythonJobStateStore } from './python-job-state'
import { createPythonR2InputStorage } from './python-r2-inputs'
import { handlePythonRequest } from './python-requests'

export interface PythonInspectionJobResponse {
  status: number
  bodyJson: string
}
const retired = (): PythonInspectionJobResponse => ({
  status: 408,
  bodyJson: JSON.stringify({ ok: false, code: 'REQUEST_RETIRED' }),
})
const unavailable = (): PythonInspectionJobResponse => ({
  status: 503,
  bodyJson: JSON.stringify({ ok: false, code: 'PYTHON_INSPECTION_FAILED' }),
})

/**
 * One immutable input generation owns this coordinator and its SDK sandbox.
 * Its alarm is independent of the Sandbox SDK's own container alarm/lifecycle.
 */
export class PythonInspectionJob extends DurableObject<Env> {
  private readonly store = createPythonJobStateStore(this.ctx.storage.sql)
  private readonly pythonRegistry = createPythonRuntimeConfigurationLoader()
  private controller?: AbortController
  private sdk?: PythonInspectionSandbox
  private destruction?: Promise<void>

  protected createOwnedSandbox(jobId: string): PythonInspectionSandbox {
    return getSandbox(this.env.ProBuildSandbox, studioPythonInspectionSandboxId(jobId), {
      enableDefaultSession: false,
      transport: 'rpc',
    })
  }

  private current(jobId: string) {
    const state = this.store.read()
    if (!state || state.jobId !== jobId) throw new Error('O proprietário do job Python mudou.')
    return state
  }

  private async destroyOwned() {
    const state = this.store.read()
    if (!state || state.cleanupConfirmed) return
    if (!this.destruction) {
      this.destruction = (async () => {
        const owned = await verifyStudioPythonInspectionJobState(state)
        if (owned.sandboxCreated) {
          const sdk = this.sdk ?? this.createOwnedSandbox(owned.jobId)
          await sdk.destroy()
        }
        const current = this.current(owned.jobId)
        if (!current.cleanupConfirmed && !this.store.update(current, { cleanupConfirmed: true }))
          throw new Error('A confirmação de limpeza Python perdeu sua versão.')
      })().catch((error) => {
        this.destruction = undefined
        throw error
      })
    }
    const destruction = this.destruction
    await awaitWithSignal(() => destruction, AbortSignal.timeout(5000))
  }

  private async scheduleRetention() {
    const state = this.store.read()
    if (!state) return
    await this.ctx.storage.setAlarm(
      state.cleanupConfirmed
        ? Math.max(Date.now() + 1, studioPythonInspectionJobRetentionUntil(state))
        : Date.now() + 30_000,
    )
  }

  private retirePreview() {
    const state = this.store.read()
    if (
      state?.operation?.preview &&
      !state.previewRetired &&
      !this.store.update(state, { previewRetired: true })
    )
      throw new Error('O encerramento do preview Python perdeu sua versão.')
  }

  async inspect(raw: unknown): Promise<PythonInspectionJobResponse> {
    return this.admit(StudioPythonInspectionRequestSchema.parse(raw))
  }

  async validate(raw: unknown): Promise<PythonInspectionJobResponse> {
    const request = StudioPythonValidationRequestSchema.parse(raw)
    return this.admit(request, {
      mode: 'validate',
      recipe: request.recipe,
      ...(request.preview ? { preview: request.preview } : {}),
    })
  }

  private async admit(
    request: { input: StudioPythonInputReference; structure: boolean },
    operation?: StudioPythonInspectionJobState['operation'],
  ): Promise<PythonInspectionJobResponse> {
    const input = request.input
    const jobId = await studioPythonInspectionJobId(input)
    const existing = this.store.read()
    if (existing) {
      if (
        existing.jobId !== jobId ||
        existing.structure !== request.structure ||
        canonicalJson(existing.operation) !== canonicalJson(operation)
      )
        return { status: 409, bodyJson: JSON.stringify({ ok: false, code: 'JOB_SCOPE_CHANGED' }) }
      return {
        status: existing.status === 'running' ? 409 : 410,
        bodyJson: JSON.stringify({
          ok: false,
          code: existing.status === 'running' ? 'JOB_ALREADY_RUNNING' : 'JOB_RETIRED',
        }),
      }
    }
    const now = Date.now()
    if (input.expiresAt <= now)
      return { status: 410, bodyJson: JSON.stringify({ ok: false, code: 'INPUT_EXPIRED' }) }
    const state: StudioPythonInspectionJobState = {
      version: 1,
      stateVersion: 1,
      jobId,
      input,
      structure: request.structure,
      ...(operation ? { operation } : {}),
      status: 'running',
      createdAt: now,
      deadline: Math.min(now + STUDIO_PYTHON_JOB_DEADLINE_MS, input.expiresAt),
      sandboxCreated: false,
      cleanupConfirmed: false,
    }
    if (!this.store.claim(state))
      return { status: 409, bodyJson: JSON.stringify({ ok: false, code: 'JOB_ALREADY_RUNNING' }) }
    const controller = new AbortController()
    this.controller = controller
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(state.deadline - now)])
    const work = this.perform(state, signal).finally(() => {
      if (this.controller === controller) this.controller = undefined
    })
    // A caller can disappear before headers. The job remains owned until explicit
    // cancellation, deadline or completion, including its independently bounded cleanup.
    this.ctx.waitUntil(
      work.then(
        () => {},
        () => {},
      ),
    )
    return work
  }

  private async perform(
    state: StudioPythonInspectionJobState,
    signal: AbortSignal,
  ): Promise<PythonInspectionJobResponse> {
    let outcome = unavailable()
    try {
      await this.ctx.storage.setAlarm(state.deadline)
      const configuration = this.env.STUDIO_PYTHON_DISTRIBUTIONS_SHA256
      const bucket = this.env.PYTHON_INPUTS
      const runtimeBucket = this.env.PRO_ARTIFACTS
      const namespace = this.env.ProBuildSandbox
      const previewBucket = this.env.PYTHON_PREVIEWS
      const previewOrigin = this.env.STUDIO_PYTHON_PREVIEW_ORIGIN
      if (!configuration || !bucket) throw new Error('Ambiente Python indisponível.')
      const check = () => {
        signal.throwIfAborted()
        const current = this.current(state.jobId)
        if (
          current.status !== 'running' ||
          Date.now() >= current.deadline ||
          this.env.STUDIO_PYTHON_DISTRIBUTIONS_SHA256 !== configuration ||
          this.env.PYTHON_INPUTS !== bucket ||
          this.env.PRO_ARTIFACTS !== runtimeBucket ||
          this.env.ProBuildSandbox !== namespace ||
          this.env.PYTHON_PREVIEWS !== previewBucket ||
          this.env.STUDIO_PYTHON_PREVIEW_ORIGIN !== previewOrigin
        )
          throw new Error('O job Python foi retirado.')
      }
      check()
      const registry = await this.pythonRegistry(runtimeBucket, configuration, {
        signal,
        assertCurrent: check,
      })
      check()
      const validation = state.operation
      const response = await handlePythonRequest(
        new Request(`https://python-job.invalid/v1/python/${validation ? 'validate' : 'inspect'}`, {
          method: 'POST',
          signal,
          body: JSON.stringify(
            validation
              ? {
                  version: 1,
                  input: state.input,
                  structure: state.structure,
                  recipe: validation.recipe,
                  ...(validation.preview ? { preview: validation.preview } : {}),
                }
              : state.structure
                ? { version: 1, input: state.input, structure: true }
                : state.input,
          ),
        }),
        {
          bucket: createPythonR2InputStorage(bucket),
          runtimeBucket,
          registry,
          assertCurrent: check,
          ...(previewBucket && previewOrigin
            ? {
                preview: {
                  bucket: createPythonR2InputStorage(previewBucket),
                  serviceOrigin: previewOrigin,
                  validation: {
                    profileVersion: 1 as const,
                    runtimeFingerprint: validationProfile.runtimeFingerprint,
                  },
                },
              }
            : {}),
          // The authenticated ingress enforces job/owner quotas before invoking this private RPC.
          async limit() {
            return true
          },
          createSandbox: () => {
            check()
            const current = this.current(state.jobId)
            if (!this.store.update(current, { sandboxCreated: true }))
              throw new Error('A admissão do sandbox Python perdeu sua versão.')
            const sdk = this.createOwnedSandbox(state.jobId)
            this.sdk = sdk
            return {
              mkdir: (...args) => sdk.mkdir(...args),
              writeFile: (...args) => sdk.writeFile(...args),
              readFile: (...args) => sdk.readFile(...args),
              exec: (...args) => sdk.exec(...args),
              destroy: () => this.destroyOwned(),
            }
          },
        },
      )
      const body = await readJsonBodyWithLimit(
        response,
        validation ? STUDIO_PYTHON_VALIDATION_LIMITS.responseBytes : 2 * 1024 * 1024,
        signal,
      )
      await this.destroyOwned()
      check()
      const current = this.current(state.jobId)
      if (
        !current.cleanupConfirmed ||
        !this.store.update(current, {
          status: response.ok ? 'succeeded' : 'failed',
        })
      )
        throw new Error('O encerramento do job Python perdeu sua versão.')
      outcome = { status: response.status, bodyJson: JSON.stringify(body) }
    } catch {
      const current = this.current(state.jobId)
      if (current.status === 'running')
        this.store.update(current, { status: signal.aborted ? 'cancelled' : 'failed' })
      outcome =
        signal.aborted || this.current(state.jobId).status === 'cancelled'
          ? retired()
          : unavailable()
    } finally {
      try {
        await this.destroyOwned()
      } catch {
        outcome = unavailable()
        console.warn('[studio-python] owned job cleanup pending')
      }
      if (outcome.status !== 200 || signal.aborted) this.retirePreview()
      try {
        await this.scheduleRetention()
      } catch {
        this.retirePreview()
        outcome = unavailable()
        console.warn('[studio-python] preview retention pending')
      }
    }
    // Cancellation can arrive while the terminal state/alarm is being persisted.
    if (signal.aborted) this.retirePreview()
    return signal.aborted ? retired() : outcome
  }

  async cancel(raw: unknown) {
    const input = StudioPythonInputReferenceSchema.parse(raw)
    const jobId = await studioPythonInspectionJobId(input)
    let state = this.store.read()
    if (state && state.jobId !== jobId)
      throw new Error('O cancelamento pertence a outro job Python.')
    if (!state) {
      const now = Date.now()
      if (input.expiresAt <= now) return { retired: true, cleanupConfirmed: true }
      this.store.claim({
        version: 1,
        stateVersion: 1,
        jobId,
        input,
        structure: false,
        status: 'cancelled',
        createdAt: now,
        deadline: Math.min(now + STUDIO_PYTHON_JOB_DEADLINE_MS, input.expiresAt),
        sandboxCreated: false,
        cleanupConfirmed: true,
      })
      state = this.current(jobId)
    }
    if (state.status === 'running') this.store.update(state, { status: 'cancelled' })
    this.controller?.abort(new Error('O job Python foi cancelado pelo proprietário.'))
    try {
      await this.destroyOwned()
    } finally {
      await this.scheduleRetention()
    }
    return { retired: true, cleanupConfirmed: this.current(jobId).cleanupConfirmed }
  }

  /** A private RPC decision, checked again for every public preview response. */
  async previewAvailable(raw: unknown) {
    const scope = StudioPythonPreviewAvailabilitySchema.parse(raw)
    const state = this.store.read()
    return Boolean(
      state &&
        state.jobId === scope.jobId &&
        state.status === 'succeeded' &&
        state.cleanupConfirmed &&
        !state.previewRetired &&
        state.input.projectId === scope.projectId &&
        state.input.revision === scope.revision &&
        state.operation?.preview?.parentOrigin === scope.parentOrigin &&
        scope.expiresAt > Date.now() &&
        scope.expiresAt <= studioPythonInspectionJobRetentionUntil(state),
    )
  }

  /** Explicit rejection by the authorized host; normal successful input retirement preserves its preview. */
  async discardPreview(raw: unknown) {
    const input = StudioPythonInputReferenceSchema.parse(raw)
    const jobId = await studioPythonInspectionJobId(input)
    const existing = this.store.read()
    if (existing && existing.jobId !== jobId)
      throw new Error('O descarte pertence a outro job Python.')
    if (
      existing &&
      !existing.previewRetired &&
      !this.store.update(existing, { previewRetired: true })
    )
      throw new Error('O descarte do preview perdeu sua versão.')
    return this.cancel(input)
  }

  async alarm() {
    let state = this.store.read()
    if (!state) return
    await verifyStudioPythonInspectionJobState(state)
    state = this.current(state.jobId)
    if (state.status === 'running' && Date.now() < state.deadline) {
      await this.ctx.storage.setAlarm(state.deadline)
      return
    }
    if (state.status === 'running') this.store.update(state, { status: 'cancelled' })
    this.controller?.abort(new Error('O prazo do job Python terminou.'))
    try {
      await this.destroyOwned()
    } catch {
      console.warn('[studio-python] owned job cleanup pending')
      await this.ctx.storage.setAlarm(Date.now() + 30_000)
      return
    }
    state = this.current(state.jobId)
    if (Date.now() >= studioPythonInspectionJobRetentionUntil(state)) {
      // An in-memory owner can still be unwinding cancelled SDK work. Keep its
      // persisted terminal fence until its result/finally has released ownership.
      // After eviction there is no local work, so verified cleanup permits purge.
      if (this.controller) {
        await this.ctx.storage.setAlarm(Date.now() + 30_000)
        return
      }
      this.store.purgeExpired(state, Date.now())
      await this.ctx.storage.deleteAlarm()
    } else await this.scheduleRetention()
  }
}
