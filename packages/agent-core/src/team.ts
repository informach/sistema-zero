import { z } from 'zod'
import { artifactSchema } from './contracts'
import { orderGraph } from './graph'

export const teamNodeSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_-]{0,39}$/),
  role: z.enum(['researcher', 'writer', 'reviewer']),
  input: z.string().min(1).max(16000),
  acceptance: z.array(z.string().min(1).max(300)).min(1).max(10),
  dependsOn: z.array(z.string()).max(5).default([]),
})
export const teamPlanSchema = z.object({
  version: z.literal(1),
  title: z.string().min(1).max(200),
  nodes: z.array(teamNodeSchema).min(1).max(6),
})
export function compileTeam(raw: unknown) {
  const plan = teamPlanSchema.parse(raw)
  const ordered = orderGraph(plan.nodes)
  const reviewer = ordered.at(-1)
  if (
    reviewer?.role !== 'reviewer' ||
    plan.nodes.filter((node) => node.role === 'reviewer').length !== 1
  )
    throw new Error('Team requires exactly one final reviewer')
  const ancestors = new Set<string>()
  const collect = (id: string) => {
    if (ancestors.has(id)) return
    ancestors.add(id)
    for (const dependency of ordered.find((node) => node.id === id)?.dependsOn ?? [])
      collect(dependency)
  }
  collect(reviewer.id)
  if (ancestors.size !== plan.nodes.length)
    throw new Error('Final reviewer must depend on every task')
  return { ...plan, nodes: ordered }
}
export const teamHandoffSchema = z.object({
  note: z.string().min(1).max(8000),
  sourceDigest: z.string().regex(/^[a-f0-9]{64}$/),
  acceptance: z
    .array(
      z.object({
        criterion: z.string().max(300),
        passed: z.boolean(),
        evidence: z.string().min(1).max(2000),
      }),
    )
    .min(1)
    .max(10),
  artifacts: z.array(artifactSchema).max(20).default([]),
  pending: z.array(z.string().max(500)).max(20).default([]),
})
