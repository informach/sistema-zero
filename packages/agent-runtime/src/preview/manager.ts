import { artifactSchema, canonical, type ToolContext, ToolRejected } from '@sistemazero/agent-core'
import { z } from 'zod'
import type { Browsers } from '../browser/manager'
import { Locks } from '../execution/locks'
import type { Services } from '../services/registry'
import { Artifacts } from '../store/artifacts'
import type { Supervisor } from '../supervisor'
import { hash } from '../tools/paths'
import { sourceRevision } from './revision'

export const verificationSchema = z.object({
  browserId: z.string(),
  sourceDigest: z.string().regex(/^[a-f0-9]{64}$/),
  reporterPath: z
    .string()
    .regex(/^\/[a-zA-Z0-9/_.-]+$/)
    .optional(),
  includes: z.array(z.string().min(1).max(200)).min(1).max(20),
})
const reporterSchema = z.object({
  sourceDigest: z.string(),
  success: z.boolean(),
  checks: z
    .array(z.object({ name: z.string().max(200), success: z.boolean() }))
    .min(1)
    .max(100),
})
const evidenceSchema = z.object({
  id: z.string(),
  browserId: z.string(),
  serviceId: z.string(),
  sourceDigest: z.string(),
  domRevision: z.string(),
  at: z.string(),
  state: z.enum(['verified', 'failed', 'unverified', 'stale']),
  attempt: z.number(),
  fingerprint: z.string(),
  issues: z.array(z.string()),
  screenshot: artifactSchema,
  report: artifactSchema,
})
export class Previews {
  private locks = new Locks()
  private artifacts: Artifacts
  constructor(
    private supervisor: Supervisor,
    private browsers: Browsers,
    private services: Services,
  ) {
    this.artifacts = new Artifacts(supervisor.directory)
  }
  private async target(browserId: string, context: ToolContext) {
    const serviceId = this.browsers.service(browserId, context)
    if (!serviceId)
      throw new ToolRejected('NO_PREVIEW', 'Browser is not attached to an owned preview service')
    const service = await this.services.inspect(serviceId, context)
    if (service.state !== 'ready' || !service.process?.running || !service.url)
      throw new ToolRejected('PREVIEW_STOPPED', 'Preview is no longer ready')
    const lease = await this.services.environments.validate(service.lease, context)
    return { service, lease }
  }
  async revision(browserId: string, context: ToolContext) {
    const { service, lease } = await this.target(browserId, context)
    return {
      ...(await sourceRevision(lease.root, context.signal)),
      serviceId: service.id,
      lease: service.lease,
    }
  }
  async verify(raw: z.infer<typeof verificationSchema>, context: ToolContext) {
    const input = verificationSchema.parse(raw)
    return this.locks.with(input.browserId, async () => {
      const { service, lease } = await this.target(input.browserId, context)
      const before = await sourceRevision(lease.root, context.signal)
      if (before.digest !== input.sourceDigest)
        throw new ToolRejected('SOURCE_CHANGED', 'Source revision changed before verification')
      const key = hash(canonical({ browser: input.browserId, source: before.digest }))
      const oldRaw = await this.supervisor.store.call({
        op: 'document.get',
        namespace: 'preview-attempts',
        id: key,
      })
      const old = oldRaw
        ? z
            .object({ attempt: z.number(), fingerprint: z.string(), stopped: z.boolean() })
            .parse(oldRaw)
        : undefined
      if (old && (old.attempt >= 3 || old.stopped))
        throw new ToolRejected(
          'VERIFICATION_LIMIT',
          'Verification stopped: repeated result or three attempts without a new source revision',
        )
      const snapshot = await this.browsers.observe(input.browserId, context)
      const shot = await this.browsers.screenshot(input.browserId, context)
      const observed = await this.browsers.observe(input.browserId, context)
      const issues = observed.diagnostics.map((item) => `${item.kind}: ${item.text}`)
      for (const text of input.includes)
        if (!snapshot.text.includes(text)) issues.push(`Missing expected text: ${text}`)
      let reporter: z.infer<typeof reporterSchema> | undefined
      let reporterError: string | undefined
      if (input.reporterPath) {
        // The owned service origin is checked before and after this bounded read.
        try {
          const response = await fetch(new URL(input.reporterPath, service.url), {
            redirect: 'error',
            signal: AbortSignal.any([context.signal, AbortSignal.timeout(5000)]),
          })
          if (!response.ok) throw new Error(`Reporter HTTP ${response.status}`)
          const reader = response.body?.getReader()
          if (!reader) throw new Error('Empty reporter')
          let length = 0
          const chunks: Uint8Array[] = []
          try {
            while (true) {
              const next = await reader.read()
              if (next.done) break
              length += next.value.length
              if (length > 32000) throw new Error('Reporter exceeds 32 KB')
              chunks.push(next.value)
            }
          } finally {
            await reader.cancel()
            reader.releaseLock()
          }
          reporter = reporterSchema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')))
          if (reporter.sourceDigest !== before.digest)
            issues.push('Reporter served a different source revision')
          if (!reporter.success || reporter.checks.some((check) => !check.success))
            issues.push('Application reporter reported failure')
        } catch (error) {
          reporterError = String(error).slice(0, 1000)
        }
      } else
        reporterError =
          'Application reporter is absent; screenshot alone does not prove application health'
      await this.target(input.browserId, context)
      const after = await sourceRevision(lease.root, context.signal)
      const stale =
        after.digest !== before.digest ||
        shot.revision !== snapshot.revision ||
        observed.revision !== snapshot.revision
      const state = stale
        ? 'stale'
        : issues.length
          ? 'failed'
          : reporterError
            ? 'unverified'
            : 'verified'
      if (reporterError) issues.push(reporterError)
      const fingerprint = hash(canonical({ state, issues, dom: shot.revision }))
      const attempt = (old?.attempt ?? 0) + 1
      const report = await this.artifacts.put(
        JSON.stringify({ snapshot, reporter, issues, source: before, state }),
        'application/json',
      )
      const evidence = evidenceSchema.parse({
        id: crypto.randomUUID(),
        browserId: input.browserId,
        serviceId: service.id,
        sourceDigest: before.digest,
        domRevision: shot.revision,
        at: new Date().toISOString(),
        state,
        attempt,
        fingerprint,
        issues,
        screenshot: shot.artifact,
        report,
      })
      await this.supervisor.store.call({
        op: 'document.batch',
        documents: [
          { namespace: 'preview-evidence', id: evidence.id, value: evidence },
          {
            namespace: 'preview-attempts',
            id: key,
            value: { attempt, fingerprint, stopped: old?.fingerprint === fingerprint },
          },
          ...(state === 'verified'
            ? [{ namespace: 'preview-candidates', id: service.id, value: evidence }]
            : []),
        ],
      })
      return evidence
    })
  }
  async candidate(browserId: string, context: ToolContext) {
    const revision = await this.revision(browserId, context)
    const raw = await this.supervisor.store.call({
      op: 'document.get',
      namespace: 'preview-candidates',
      id: revision.serviceId,
    })
    if (!raw) return { state: 'unverified' }
    const evidence = evidenceSchema.parse(raw)
    return {
      ...evidence,
      state: evidence.sourceDigest === revision.digest ? evidence.state : 'stale',
    }
  }
}
