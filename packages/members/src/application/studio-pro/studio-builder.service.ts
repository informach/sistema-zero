import type { StudioAiActor } from '@sistemazero/core/ai-credits'
import { ValidationError } from '@sistemazero/core/errors'
import {
  createStudioProRevision,
  isStudioProArtifact,
  isStudioProAssistanceRequest,
  isStudioProValidationIdentity,
  STUDIO_PRO_BUILDER_LIMITS as limits,
  parseStudioProAssistanceRequest,
  type StudioProAssistanceRequest,
  type StudioProBuilderCommand,
  type StudioProBuilderRepository,
} from '@sistemazero/core/studio'
import { z } from 'zod'

const id = z.string().uuid(),
  projectId = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
  hash = z.string().regex(/^[a-f0-9]{64}$/)
const boundedText = z.string().max(2000)
const assistanceRequest = z
  .custom<StudioProAssistanceRequest>(isStudioProAssistanceRequest)
  .transform(parseStudioProAssistanceRequest)
const preview = z
  .object({
    artifact: z.custom<import('@sistemazero/core/studio').StudioProArtifact>(isStudioProArtifact),
    revisionHash: hash,
    validation: z.custom<import('@sistemazero/core/studio').StudioProValidationIdentity>(
      isStudioProValidationIdentity,
    ),
  })
  .strict()
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
const revision = z
  .object({
    version: z.literal(1),
    projectId,
    templateId: z.string().max(80),
    devScript: z.string().max(80),
    hash,
    files: z.record(z.string().max(240), z.string().max(256000)),
    directories: z.array(z.string().max(240)).max(160),
    assets: z.string().max(80000),
    assetFiles: z.record(z.string().max(240), hash),
  })
  .strict()
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
  z
    .object({
      operation: z.literal('create'),
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
  async execute(actor: StudioAiActor, input: unknown) {
    if (new TextEncoder().encode(JSON.stringify(input)).byteLength > limits.maxPayloadBytes)
      throw new ValidationError('Revisão grande demais.')
    const parsed = commandSchema.safeParse(input)
    if (!parsed.success) throw new ValidationError('Comando de construção inválido.')
    const command: StudioProBuilderCommand = parsed.data
    if (command.operation === 'create') {
      try {
        const base = await createStudioProRevision(command.base)
        if (base.hash !== command.base.hash) throw new Error('hash')
        const selected = command.request?.selection
        const baseline = command.request?.baseline
        if (baseline && baseline.revisionHash !== base.hash) throw new Error('baseline revision')
        for (const reference of [
          ...(selected ? [{ ...selected, line: selected.endLine }] : []),
          ...(baseline?.diagnostics ?? []),
        ]) {
          const source = base.files[reference.path]
          if (source === undefined || reference.line > source.split('\n').length)
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
          const digest = await crypto.subtle.digest('SHA-256', Buffer.from(binary.base64, 'base64'))
          if (Buffer.from(digest).toString('hex') !== binary.sha256) throw new Error('asset digest')
        }
        command.base = base
      } catch {
        throw new ValidationError('A revisão-base é inválida.')
      }
    }
    return this.repository.execute(actor, command, this.clock())
  }
}
