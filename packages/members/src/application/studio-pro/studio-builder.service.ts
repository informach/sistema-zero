import type { StudioAiActor } from '@sistemazero/core/ai-credits'
import { ValidationError } from '@sistemazero/core/errors'
import { awaitWithSignal } from '@sistemazero/core/http'
import {
  applyStudioProChange,
  createStudioProRevision,
  isStudioProArtifact,
  isStudioProAssistanceRequest,
  isStudioProValidationIdentity,
  STUDIO_PRO_BUILDER_LIMITS as limits,
  parseStudioProAssistanceRequest,
  type StudioProAssistanceRequest,
  type StudioProBuilderClaim,
  type StudioProBuilderCommand,
  type StudioProBuilderRepository,
  type StudioProRevisionV2,
} from '@sistemazero/core/studio'
import { StudioProRevisionConfigurationSchema } from '@sistemazero/core/studio/pro-revision-configuration'
import {
  createPythonBuilderPolicyResult,
  type StudioPythonBuilderPolicyResult,
} from '@sistemazero/core/studio/python-builder-authorization'
import { StudioPythonBuilderPreviewSchema } from '@sistemazero/core/studio/python-builder-preview'
import type { StudioPythonExecutionMetadata } from '@sistemazero/core/studio/python-execution-content'
import { prepareStudioPythonProExecution } from '@sistemazero/core/studio/python-pro-execution'
import { z } from 'zod'

const id = z.string().uuid(),
  projectId = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
  hash = z.string().regex(/^[a-f0-9]{64}$/)
const boundedText = z.string().max(2000)
function generationAuthorizationIsFresh(
  state: StudioProBuilderClaim | null,
  command: Extract<StudioProBuilderCommand, { operation: 'authorize-generation' }>,
  now: number,
) {
  const job = state?.job
  return Boolean(
    job &&
      job.id === command.id &&
      job.projectId === command.projectId &&
      job.version === command.version &&
      job.phase === 'generating' &&
      job.assistance?.disposition !== 'discarded' &&
      (job.result?.revisionHash ?? job.base.hash) === command.revisionHash &&
      state?.generationLease?.revisionHash === command.revisionHash &&
      Number.isFinite(now) &&
      [job.leaseUntil, job.deadlineAt, job.expiresAt].every((value) => {
        const deadline = Date.parse(value ?? '')
        return Number.isFinite(deadline) && deadline > now
      }),
  )
}
function builderAuthorizationIsFresh(
  state: StudioProBuilderClaim | null,
  command: Extract<
    StudioProBuilderCommand,
    { operation: 'authorize-validation' | 'authorize-proposal' }
  >,
  now: number,
) {
  const job = state?.job
  if (
    !job ||
    job.id !== command.id ||
    job.projectId !== command.projectId ||
    job.version !== command.version ||
    job.result?.revisionHash !== command.revisionHash ||
    !['validating', 'review'].includes(job.phase) ||
    job.assistance?.disposition === 'discarded'
  )
    return false
  const leaseUntil = Date.parse(job.leaseUntil ?? ''),
    expiresAt = Date.parse(job.expiresAt),
    deadlineAt = Date.parse(job.deadlineAt)
  if (command.operation === 'authorize-proposal') {
    if (
      job.phase !== 'review' ||
      !Number.isFinite(now) ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= now
    )
      return false
    if (command.purpose === 'apply') return true
    const preview = job.result?.preview
    return (
      preview?.kind === 'python' &&
      preview.reference.id === command.preview?.id &&
      preview.reference.sha256 === command.preview.sha256 &&
      preview.reference.expiresAt > now
    )
  }
  return (
    Number.isFinite(now) &&
    Number.isFinite(leaseUntil) &&
    Number.isFinite(expiresAt) &&
    Number.isFinite(deadlineAt) &&
    leaseUntil > now &&
    expiresAt > now &&
    (job.phase === 'review' || deadlineAt > now)
  )
}
const assistanceRequest = z
  .custom<StudioProAssistanceRequest>(isStudioProAssistanceRequest)
  .transform(parseStudioProAssistanceRequest)
const javascriptPreview = z
  .object({
    kind: z.literal('javascript').optional(),
    artifact: z.custom<import('@sistemazero/core/studio').StudioProArtifact>(isStudioProArtifact),
    revisionHash: hash,
    validation: z.custom<import('@sistemazero/core/studio').StudioProValidationIdentity>(
      isStudioProValidationIdentity,
    ),
  })
  .strict()
const preview = z.union([javascriptPreview, StudioPythonBuilderPreviewSchema])
const evidence = z
  .array(
    z
      .object({
        kind: z.enum(['types', 'build', 'playtest', 'capture']),
        status: z.enum(['passed', 'failed', 'unavailable']),
        detail: boundedText,
        artifactUrl: z.string().url().max(2048).optional(),
      })
      .strict(),
  )
  .max(12)
const revisionContent = {
  projectId,
  templateId: z.string().max(80),
  hash,
  files: z.record(z.string().max(240), z.string().max(256000)),
  directories: z.array(z.string().max(240)).max(160),
  assets: z.string().max(80000),
  assetFiles: z.record(z.string().max(240), hash),
}
const revision = z.discriminatedUnion('version', [
  z.strictObject({ ...revisionContent, version: z.literal(1), devScript: z.string().max(80) }),
  z.strictObject({
    ...revisionContent,
    version: z.literal(2),
    configuration: StudioProRevisionConfigurationSchema,
  }),
])
const result = z
  .object({
    change: z
      .object({
        baseHash: hash,
        summary: boundedText.min(1),
        patches: z
          .array(
            z
              .object({
                path: z.string().max(240),
                before: hash.nullable(),
                content: z.string().max(256000).nullable(),
              })
              .strict(),
          )
          .min(1)
          .max(24),
      })
      .strict(),
    revisionHash: hash,
    preview: preview.optional(),
    plan: z.array(z.string().min(1).max(400)).min(1).max(8),
    evidence: z
      .array(
        z
          .object({
            kind: z.enum(['types', 'build', 'playtest', 'capture']),
            status: z.enum(['passed', 'failed', 'unavailable']),
            detail: boundedText,
            artifactUrl: z.string().url().max(2048).optional(),
          })
          .strict(),
      )
      .max(12),
  })
  .strict()
const cost = z
  .object({
    source: z.enum(['platform', 'openrouter']),
    confirmedMicroUsd: z.number().int().min(0).max(1_000_000_000),
    uncertain: z.boolean(),
  })
  .strict()
  .nullable()
const commandSchema = z.discriminatedUnion('operation', [
  z.strictObject({
    operation: z.literal('authorize-generation'),
    id,
    projectId,
    token: id,
    version: z.number().int().min(0),
    revisionHash: hash,
  }),
  z
    .object({
      operation: z.literal('authorize-proposal'),
      id,
      projectId,
      version: z.number().int().min(0),
      revisionHash: hash,
      purpose: z.enum(['apply', 'preview']),
      preview: z.strictObject({ id: hash, sha256: hash }).optional(),
    })
    .strict()
    .refine((value) =>
      value.purpose === 'preview' ? Boolean(value.preview) : value.preview === undefined,
    ),
  z
    .object({
      operation: z.literal('create'),
      parentOrigin: z
        .string()
        .max(2048)
        .url()
        .refine((value) => {
          const url = new URL(value)
          return (
            ['http:', 'https:'].includes(url.protocol) &&
            url.origin === value &&
            !url.username &&
            !url.password
          )
        }),
      id,
      model: z.string().regex(/^[A-Za-z0-9_.:/-]{1,160}$/),
      binaries: z.record(
        z.string().max(240),
        z
          .object({
            base64: z
              .string()
              .max(2_000_000)
              .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),
            sha256: hash,
          })
          .strict(),
      ),
      objective: z.string().trim().min(1).max(limits.maxObjectiveChars),
      base: revision,
      request: assistanceRequest.optional(),
    })
    .strict(),
  ...(['get', 'cancel', 'claim', 'preview-claim'] as const).map((operation) =>
    z.object({ operation: z.literal(operation), id, projectId }).strict(),
  ),
  z.object({ operation: z.literal('latest'), projectId }).strict(),
  z.object({ operation: z.literal('remove-project'), projectId }).strict(),
  z
    .object({ operation: z.literal('discard'), id, projectId, version: z.number().int().min(0) })
    .strict(),
  z
    .object({
      operation: z.literal('preview-checkpoint'),
      id,
      projectId,
      token: id,
      version: z.number().int().min(0),
      preview,
      evidence,
    })
    .strict(),
  z
    .object({
      operation: z.literal('preview-release'),
      id,
      projectId,
      token: id,
      version: z.number().int().min(0),
      error: boundedText,
    })
    .strict(),
  z
    .object({
      operation: z.literal('authorize-validation'),
      id,
      projectId,
      token: id,
      version: z.number().int().min(0),
      revisionHash: hash,
      runtimeOperation: z.enum(['analyze', 'execute']),
    })
    .strict(),
  z
    .object({
      operation: z.literal('checkpoint'),
      id,
      projectId,
      token: id,
      version: z.number().int().min(0),
      phase: z.enum(['queued', 'validating', 'review', 'failed']),
      result: result.nullable(),
      error: boundedText.nullable(),
      cost,
      notes: z.array(z.string().max(16_000)).max(6),
    })
    .strict(),
])

export class StudioBuilderService {
  constructor(
    private readonly repository: StudioProBuilderRepository,
    private readonly clock = () => new Date(),
    readonly executionAvailable = false,
    readonly adultExecutionAvailable = false,
    private readonly authorizePythonRevision?: (
      actor: StudioAiActor,
      revision: StudioProRevisionV2,
      execution: StudioPythonExecutionMetadata,
      operation: 'analyze' | 'execute',
      signal: AbortSignal,
    ) => Promise<StudioPythonBuilderPolicyResult>,
  ) {}
  purgeExpired() {
    return this.repository.purgeExpired(this.clock())
  }
  async list(actor: StudioAiActor, input: unknown) {
    const parsed = z
      .object({ projectId, before: z.string().max(100).optional() })
      .strict()
      .safeParse(input)
    if (!parsed.success) throw new ValidationError('Consulta de propostas inválida.')
    return this.repository.list(actor, parsed.data, this.clock())
  }
  async execute(actor: StudioAiActor, input: unknown, callerSignal?: AbortSignal) {
    callerSignal?.throwIfAborted()
    if (new TextEncoder().encode(JSON.stringify(input)).byteLength > limits.maxPayloadBytes)
      throw new ValidationError('Revisão grande demais.')
    const parsed = commandSchema.safeParse(input)
    if (!parsed.success) throw new ValidationError('Comando de construção inválido.')
    const command: StudioProBuilderCommand = parsed.data
    if (command.operation === 'create') {
      if (!(actor.audience === 'adult' ? this.adultExecutionAvailable : this.executionAvailable))
        throw new ValidationError(
          'A execução automática está indisponível. Seu pedido continua no editor.',
        )
      let execution: StudioPythonExecutionMetadata | undefined
      try {
        const prepared =
          command.base.version === 2 && command.base.configuration.programmingLanguage === 'python'
            ? await prepareStudioPythonProExecution(command.base, command.binaries)
            : undefined
        const base = prepared?.base ?? (await createStudioProRevision(command.base))
        execution = prepared?.metadata
        if (base.hash !== command.base.hash) throw new Error('hash')
        const selected = command.request?.selection
        const baseline = command.request?.baseline
        if (baseline && baseline.revisionHash !== base.hash) throw new Error('baseline revision')
        for (const reference of [
          ...(selected ? [{ ...selected, line: selected.endLine }] : []),
          ...(baseline?.diagnostics ?? []),
        ]) {
          const source = base.files[reference.path]
          if (source === undefined || reference.line > source.split(/\r\n|\r|\n/).length)
            throw new Error('source reference')
          const digest = Buffer.from(
            await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source)),
          )
          if (
            ![
              digest.toString('hex'),
              digest.toString('base64'),
              `sha256-${digest.toString('base64')}`,
            ].includes(reference.sourceHash)
          )
            throw new Error('source revision')
        }
        if (!prepared) {
          if (Object.keys(command.binaries).length > 258) throw new Error('assets')
          if (Object.keys(command.binaries).length !== Object.keys(base.assetFiles).length)
            throw new Error('asset count')
          for (const [path, binary] of Object.entries(command.binaries)) {
            if (base.assetFiles[path] !== binary.sha256) throw new Error('asset revision')
            if (
              !/^public\/(?:[A-Za-z0-9_-][A-Za-z0-9._-]*\/)*[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(
                path,
              ) ||
              path.split('/').some((part) => ['node_modules', 'dist'].includes(part))
            )
              throw new Error('asset path')
            const digest = await crypto.subtle.digest(
              'SHA-256',
              Buffer.from(binary.base64, 'base64'),
            )
            if (Buffer.from(digest).toString('hex') !== binary.sha256)
              throw new Error('asset digest')
          }
        }
        command.base = base
      } catch {
        throw new ValidationError('A revisão-base é inválida.')
      }
      if (
        command.base.version === 2 &&
        command.base.configuration.programmingLanguage === 'python'
      ) {
        const authorizeRevision = this.authorizePythonRevision
        const base = command.base
        const metadata = execution
        if (!authorizeRevision || !metadata)
          throw new ValidationError(
            'O construtor Python ainda não está disponível neste ambiente. Seu projeto foi preservado.',
          )
        const signal = AbortSignal.any([
          ...(callerSignal ? [callerSignal] : []),
          AbortSignal.timeout(45000),
        ])
        const policy = await awaitWithSignal(
          () => authorizeRevision(actor, base, metadata, 'execute', signal),
          signal,
        )
        await createPythonBuilderPolicyResult(policy, metadata.configuration.runtime)
        signal.throwIfAborted()
      }
    }
    if (
      command.operation === 'authorize-generation' ||
      command.operation === 'authorize-validation' ||
      command.operation === 'authorize-proposal'
    ) {
      if (!this.authorizePythonRevision || !this.executionAvailable)
        throw new ValidationError('A validação Python está indisponível neste ambiente.')
      const signal = AbortSignal.any([
        ...(callerSignal ? [callerSignal] : []),
        AbortSignal.timeout(45000),
      ])
      const authorizeRevision = this.authorizePythonRevision
      const current = await awaitWithSignal(
        () => this.repository.execute(actor, command, this.clock(), signal),
        signal,
      )
      signal.throwIfAborted()
      const currentScope =
        command.operation === 'authorize-generation'
          ? current?.generationLease
          : command.operation === 'authorize-validation'
            ? current?.validationLease
            : current?.proposalScope
      if (
        !current ||
        (command.operation !== 'authorize-generation' && !current.job.result) ||
        !current.binaries ||
        !currentScope ||
        !(command.operation === 'authorize-generation'
          ? generationAuthorizationIsFresh(current, command, this.clock().getTime())
          : builderAuthorizationIsFresh(current, command, this.clock().getTime()))
      )
        throw new ValidationError('A autorização desta proposta não está mais disponível.')
      const parentOrigin = currentScope.parentOrigin
      const revision = current.job.result
        ? (await applyStudioProChange(current.job.base, current.job.result.change)).revision
        : current.job.base
      const prepared = await prepareStudioPythonProExecution(revision, current.binaries, signal)
      const base = prepared.base
      if (
        base.version !== 2 ||
        base.configuration.programmingLanguage !== 'python' ||
        base.hash !== command.revisionHash
      )
        throw new ValidationError('A revisão não corresponde à proposta Python autorizada.')
      const policy = await awaitWithSignal(
        () =>
          authorizeRevision(
            actor,
            structuredClone(base),
            structuredClone(prepared.metadata),
            command.operation === 'authorize-generation'
              ? 'analyze'
              : command.operation === 'authorize-validation'
                ? command.runtimeOperation
                : 'execute',
            signal,
          ),
        signal,
      )
      const authorized = await createPythonBuilderPolicyResult(
        policy,
        prepared.metadata.configuration.runtime,
      )
      // Policy reads can yield. Recheck the same durable lease after them, without
      // claiming a successor or extending the lease of this validation attempt.
      const fresh = await awaitWithSignal(
        () => this.repository.execute(actor, command, this.clock(), signal),
        signal,
      )
      signal.throwIfAborted()
      const freshScope =
        command.operation === 'authorize-generation'
          ? fresh?.generationLease
          : command.operation === 'authorize-validation'
            ? fresh?.validationLease
            : fresh?.proposalScope
      if (
        !fresh ||
        !freshScope ||
        freshScope.revisionHash !== command.revisionHash ||
        !(command.operation === 'authorize-generation'
          ? freshScope.parentOrigin === parentOrigin &&
            generationAuthorizationIsFresh(fresh, command, this.clock().getTime())
          : builderAuthorizationIsFresh(fresh, command, this.clock().getTime()))
      )
        throw new ValidationError('A autorização desta proposta foi retirada.')
      signal.throwIfAborted()
      return {
        job: fresh.job,
        token: null,
        authorization: {
          policy: authorized,
          revisionHash: prepared.base.hash,
          executionRevision: prepared.metadata.revision,
          parentOrigin: freshScope.parentOrigin,
        },
      }
    }
    const pythonPreview =
      command.operation === 'preview-checkpoint' && command.preview.kind === 'python'
        ? command.preview
        : command.operation === 'checkpoint' &&
            command.phase === 'review' &&
            command.result?.preview?.kind === 'python'
          ? command.result.preview
          : undefined
    if (
      pythonPreview &&
      (command.operation === 'checkpoint' || command.operation === 'preview-checkpoint')
    ) {
      // Reauthorization is owned by this backend; executor-reported success cannot freeze grants.
      await this.execute(
        actor,
        {
          operation: 'authorize-validation',
          id: command.id,
          projectId: command.projectId,
          token: command.token,
          version: command.version,
          revisionHash: pythonPreview.revisionHash,
          runtimeOperation: 'execute',
        },
        callerSignal,
      )
    }
    callerSignal?.throwIfAborted()
    const accepted = callerSignal
      ? await awaitWithSignal(
          () => this.repository.execute(actor, command, this.clock(), callerSignal),
          callerSignal,
        )
      : await this.repository.execute(actor, command, this.clock())
    callerSignal?.throwIfAborted()
    return accepted
  }
}
