import { z } from 'zod'

export const id = z.string().min(1).max(128)
export const modeSchema = z.enum(['plan', 'build'])
export const backendSchema = z.enum(['openrouter', 'claude', 'codex'])
export const stateSchema = z.enum([
  'queued',
  'running',
  'waiting_input',
  'waiting_approval',
  'blocked',
  'paused',
  'canceling',
  'interrupted',
  'succeeded',
  'failed',
  'canceled',
])
export type RunState = z.infer<typeof stateSchema>
export const terminalStates: ReadonlySet<RunState> = new Set([
  'interrupted',
  'succeeded',
  'failed',
  'canceled',
])
export const sessionSchema = z.object({
  id,
  title: z.string(),
  workspace: z.string(),
  createdAt: z.string(),
  archived: z.boolean().default(false),
})
export const taskSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('agent') }),
  z.object({
    kind: z.literal('tool'),
    name: z.string(),
    arguments: z.record(z.string(), z.unknown()),
  }),
])
export const runSchema = z.object({
  id,
  sessionId: id,
  input: z.string(),
  backend: backendSchema,
  task: taskSchema.default({ kind: 'agent' }),
  model: z.string(),
  mode: modeSchema,
  state: stateSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  error: z.string().optional(),
  maxCost: z.number().positive(),
  maxSteps: z.number().int().min(1).max(100),
  parentId: id.optional(),
  rootId: id.optional(),
  depth: z.number().int().min(0).max(2).default(0),
  allowedTools: z.array(z.string()).max(200).optional(),
})
export type Run = z.infer<typeof runSchema>
export const runSummarySchema = runSchema.omit({ allowedTools: true, task: true }).extend({
  task: z.object({ kind: z.enum(['agent', 'tool']) }),
})
export type RunSummary = z.infer<typeof runSummarySchema>
export const eventSchema = z.object({
  schemaVersion: z.literal(1),
  id,
  runId: id,
  sequence: z.number().int().nonnegative(),
  type: z.string(),
  payload: z.unknown(),
  occurredAt: z.string(),
})
export type RuntimeEvent = z.infer<typeof eventSchema>
export const artifactSchema = z.object({
  id,
  sha256: z.string(),
  mediaType: z.string(),
  bytes: z.number().int().nonnegative(),
})
export type ArtifactRef = z.infer<typeof artifactSchema>
export const outcomeSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('ok'),
    value: z.unknown(),
    artifacts: z.array(artifactSchema).default([]),
    valueArtifact: artifactSchema.optional(),
  }),
  z.object({
    kind: z.literal('failed'),
    code: z.string(),
    message: z.string(),
    retry: z.enum(['never', 'read', 'idempotent']),
  }),
  z.object({ kind: z.literal('unknown'), effectId: id, reason: z.string() }),
])
export type ToolOutcome = z.infer<typeof outcomeSchema>
export const effectSchema = z.object({
  id,
  runId: id,
  capability: z.string(),
  digest: z.string(),
  operationDigest: z.string().optional(),
  state: z.enum(['prepared', 'dispatched', 'confirmed', 'failed', 'unknown']),
  outcome: outcomeSchema.optional(),
})
export const questionSchema = z.object({
  id,
  runId: id,
  kind: z.enum(['input', 'approval']),
  prompt: z.string(),
  options: z.array(z.string()),
  digest: z.string().optional(),
  answer: z.string().optional(),
  createdAt: z.string(),
})
export const settingsSchema = z.object({
  version: z.literal(1).default(1),
  backend: backendSchema.default('openrouter'),
  model: z.string().default(''),
  mode: modeSchema.default('plan'),
  maxCost: z.number().positive().max(100).default(2),
  maxSteps: z.number().int().min(1).max(100).default(30),
  maxOutputTokens: z.number().int().min(256).max(32768).default(4096),
  contextBytes: z.number().int().min(8192).max(524288).default(96000),
  gatewayUrl: z.string().url().optional(),
  theme: z.string().default('Nightfox'),
})
export type Settings = z.infer<typeof settingsSchema>
export const startRunSchema = z.object({
  requestId: id,
  sessionId: id,
  input: z.string().min(1).max(128000),
  task: taskSchema.default({ kind: 'agent' }),
  backend: backendSchema.optional(),
  model: z.string().optional(),
  mode: modeSchema.optional(),
  parentId: id.optional(),
  allowedTools: z.array(z.string()).max(200).optional(),
  maxCost: z.number().positive().max(100).optional(),
  maxSteps: z.number().int().min(1).max(100).optional(),
})
export const capabilitySchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_.-]+$/),
  description: z.string(),
  effect: z.enum(['read', 'workspace', 'process', 'external']),
  input: z.record(z.string(), z.unknown()),
})
export type Capability = z.infer<typeof capabilitySchema>
export interface ToolContext {
  run: Run
  workspace: string
  signal: AbortSignal
  ask: (prompt: string, options?: string[]) => Promise<string>
}
export interface ToolDefinition {
  definition: Capability
  validate?: (input: unknown) => void | Promise<void>
  execute: (input: unknown, context: ToolContext) => Promise<unknown>
}
/** A trusted adapter proved that the requested effect was never dispatched. */
export class ToolRejected extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ToolRejected'
  }
}
export const commandSchema = z.object({ id, method: z.string().max(100), params: z.unknown() })
export type Command = z.infer<typeof commandSchema>
export const responseSchema = z.discriminatedUnion('ok', [
  z.object({ id, ok: z.literal(true), value: z.unknown() }),
  z.object({ id, ok: z.literal(false), error: z.string(), code: z.string() }),
])
export type ResponseMessage = z.infer<typeof responseSchema>

export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    const result = JSON.stringify(value)
    if (result === undefined) throw new Error('Value is not JSON')
    return result
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(Reflect.get(value, key))}`)
    .join(',')}}`
}
export function transition(from: RunState, to: RunState) {
  const allowed: Record<RunState, readonly RunState[]> = {
    queued: ['running', 'canceled', 'blocked', 'interrupted'],
    running: [
      'waiting_input',
      'waiting_approval',
      'blocked',
      'paused',
      'canceling',
      'succeeded',
      'failed',
      'interrupted',
    ],
    waiting_input: ['running', 'canceling', 'interrupted', 'failed'],
    waiting_approval: ['running', 'canceling', 'interrupted', 'failed'],
    blocked: ['running', 'canceling', 'canceled', 'interrupted'],
    paused: ['running', 'canceling', 'canceled', 'interrupted'],
    canceling: ['canceled', 'interrupted', 'failed'],
    interrupted: [],
    succeeded: [],
    failed: [],
    canceled: [],
  }
  if (!allowed[from].includes(to)) throw new Error(`Invalid run transition: ${from} -> ${to}`)
}
export function sanitize(text: string) {
  let output = ''
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code === 27) {
      const next = text[++i]
      if (next === '[') {
        while (++i < text.length) {
          const value = text.charCodeAt(i)
          if (value >= 64 && value <= 126) break
        }
      } else if (next === ']' || next === 'P' || next === '_' || next === '^') {
        while (++i < text.length) {
          if (text.charCodeAt(i) === 7) break
          if (text.charCodeAt(i) === 27 && text[i + 1] === '\\') {
            i++
            break
          }
        }
      }
      continue
    }
    if (code === 9 || code === 10 || code === 13 || (code >= 32 && (code < 127 || code > 159)))
      output += text[i]
  }
  return output
}
