import { z } from 'zod'
import { parseStudioBuildSubmission, studioBuildSchema } from '../studio/build-contract'

const id = z.string().uuid()
const page = {
  limit: z.number().int().min(1).max(50).default(25),
  offset: z.number().int().min(0).max(100000).default(0),
}
export const staffMessageSchema = z
  .object({
    intentId: z
      .string()
      .min(8)
      .max(100)
      .regex(/^[\w-]+$/),
    channel: z.enum(['email', 'whatsapp']),
    templateKey: z.string().min(1).max(150),
    recipient: z
      .object({
        name: z.string().min(1).max(200),
        email: z.string().email().max(320).optional(),
        phone: z
          .string()
          .regex(/^\+?[1-9]\d{9,14}$/)
          .optional(),
      })
      .strict(),
    variables: z.record(z.string().max(100), z.string().max(10000)).default({}),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (Object.keys(value.variables).length > 50)
      ctx.addIssue({ code: 'custom', message: 'Too many variables' })
    if (
      value.channel === 'email'
        ? !value.recipient.email || Boolean(value.recipient.phone)
        : !value.recipient.phone || Boolean(value.recipient.email)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Exactly one destination, matching the channel, is required',
      })
  })
export const staffOperationSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('identity') }).strict(),
  z.object({ action: z.literal('messages.send'), message: staffMessageSchema }).strict(),
  z
    .object({ action: z.literal('messages.status'), intentId: staffMessageSchema.shape.intentId })
    .strict(),
  z.object({ action: z.literal('messages.templates'), ...page }).strict(),
  z
    .object({
      action: z.literal('helpdesk.list'),
      q: z.string().max(200).optional(),
      cursor: z.string().max(1024).optional(),
      limit: page.limit,
    })
    .strict(),
  z.object({ action: z.literal('helpdesk.ticket'), id }).strict(),
  z.object({ action: z.literal('helpdesk.kb.list'), ...page }).strict(),
  z.object({ action: z.literal('helpdesk.kb.get'), id }).strict(),
  z
    .object({
      action: z.literal('helpdesk.reply'),
      id,
      version: z.number().int().nonnegative(),
      body: z.string().min(1).max(50000),
    })
    .strict(),
  z.object({ action: z.literal('studio.submissions'), ...page }).strict(),
  z.object({ action: z.literal('studio.submission'), blockId: id, userId: id }).strict(),
  z
    .object({
      action: z.literal('studio.build'),
      build: studioBuildSchema.superRefine((value, ctx) => {
        try {
          parseStudioBuildSubmission(value)
        } catch {
          ctx.addIssue({ code: 'custom', message: 'Invalid Studio build contract' })
        }
      }),
    })
    .strict(),
])
export type StaffOperation = z.infer<typeof staffOperationSchema>
export const staffRequestSchema = z
  .object({ refreshToken: z.string().min(20).max(4096), operation: staffOperationSchema })
  .strict()
export function staffMutation(operation: StaffOperation) {
  return ['messages.send', 'helpdesk.reply', 'studio.build'].includes(operation.action)
}
export function staffRoles(operation: StaffOperation) {
  return operation.action === 'messages.send'
    ? ['superadmin', 'admin']
    : ['superadmin', 'admin', 'staff']
}
export function staffCanonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(staffCanonical).join(',')}]`
  return `{${Object.entries(value)
    .filter(([, child]) => child !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, child]) => `${JSON.stringify(key)}:${staffCanonical(child)}`)
    .join(',')}}`
}
