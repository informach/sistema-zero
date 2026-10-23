import { z } from 'zod'
import { STUDIO_PRO_TEMPLATE_IDS } from './pro-templates'
import { StudioSha256Schema } from './project-environment'
import { StudioLiveRuntimeContextSchema } from './runtime-authorization'

/** The browser supplies identity/revision only; Members reads the saved source. */
export const StudioLiveProBuildRequestSchema = z.strictObject({
  context: StudioLiveRuntimeContextSchema,
  expectedWorkspaceRevision: z.number().int().nonnegative(),
})
export type StudioLiveProBuildRequest = z.infer<typeof StudioLiveProBuildRequestSchema>

/** Private Members → BFF response. Never return this envelope to the browser. */
export const StudioLiveProSnapshotSchema = z.strictObject({
  context: StudioLiveRuntimeContextSchema,
  actor: z.strictObject({ userId: z.uuid(), accountId: z.uuid() }),
  workspaceRevision: z.number().int().nonnegative(),
  project: z.record(z.string(), z.unknown()),
  projectSha256: StudioSha256Schema,
  templateId: z.enum(STUDIO_PRO_TEMPLATE_IDS),
  expiresAt: z.number().int().nonnegative(),
})
export type StudioLiveProSnapshot = z.infer<typeof StudioLiveProSnapshotSchema>
