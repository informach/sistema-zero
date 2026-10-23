import { z } from 'zod'
import { artifactSchema } from './contracts'

export const environmentTemplateSchema = z
  .object({
    version: z.literal(1).default(1),
    name: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/),
    image: z
      .string()
      .regex(/^(?:[a-zA-Z0-9./:_-]+@)?sha256:[a-f0-9]{64}$/)
      .optional(),
    network: z.enum(['none', 'bridge']).default('none'),
    ports: z.array(z.number().int().min(1024).max(65535)).max(4).default([]),
    cpus: z.number().min(0.25).max(8).default(2),
    memoryMb: z.number().int().min(128).max(8192).default(1024),
    pids: z.number().int().min(16).max(512).default(128),
    lifetimeMs: z
      .number()
      .int()
      .min(1000)
      .max(4 * 3600000)
      .default(3600000),
    user: z
      .string()
      .regex(/^[1-9][0-9]{0,5}:[1-9][0-9]{0,5}$/)
      .default('1000:1000'),
  })
  .strict()
export type EnvironmentTemplate = z.infer<typeof environmentTemplateSchema>
export const environmentRequestSchema = z
  .object({
    intentId: z.string().min(1).max(100),
    kind: z.enum(['local', 'worktree', 'container']),
    snapshotId: z.string().optional(),
    template: environmentTemplateSchema,
  })
  .strict()
export type EnvironmentRequest = z.infer<typeof environmentRequestSchema>
export const leaseRefSchema = z.object({ id: z.string(), generation: z.number().int().positive() })
export const environmentLeaseSchema = z.object({
  id: z.string(),
  generation: z.number().int().positive(),
  intentDigest: z.string(),
  owner: z.string(),
  workspace: z.string(),
  root: z.string(),
  kind: z.enum(['local', 'worktree', 'container']),
  template: environmentTemplateSchema,
  templateDigest: z.string(),
  cacheKey: z.string(),
  snapshotId: z.string().optional(),
  worktreeId: z.string().optional(),
  resourceName: z.string(),
  resourceId: z.string().optional(),
  state: z.enum(['creating', 'ready', 'stopping', 'stopped', 'destroying', 'destroyed', 'unknown']),
  desiredState: z.enum(['ready', 'stopped', 'destroyed']).default('ready'),
  createdAt: z.string(),
  expiresAt: z.string(),
  elapsedMs: z.number().nonnegative().default(0),
  export: artifactSchema.optional(),
  error: z.string().optional(),
})
export type EnvironmentLease = z.infer<typeof environmentLeaseSchema>
