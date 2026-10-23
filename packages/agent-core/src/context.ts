import { z } from 'zod'
export const memorySchema = z.object({
  id: z.string(),
  scope: z.enum(['project', 'session', 'profile']),
  workspace: z.string(),
  sessionId: z.string().optional(),
  body: z.string().min(1).max(8000),
  source: z.enum(['user', 'agent', 'file']),
  evidence: z.array(z.string().max(1000)).max(20),
  createdAt: z.string(),
  updatedAt: z.string(),
  expiresAt: z.string().nullable(),
  deleted: z.boolean().default(false),
})
export type Memory = z.infer<typeof memorySchema>
export interface ContextItem {
  source: string
  sha256: string
  kind: 'rules' | 'skill' | 'memory' | 'map'
  text: string
}
export interface ContextBundle {
  items: ContextItem[]
  bytes: number
  omitted: string[]
  revision: string
}
