import { artifactSchema, memorySchema } from '@sistemazero/agent-core'
import { z } from 'zod'
import { ContextBuilder } from '../context/builder'
import { Artifacts } from '../store/artifacts'
import type { Store } from '../store/client'
import { tool } from './definition'
export function contextTools(store: Store, directory: string) {
  const builder = new ContextBuilder(store)
  const artifacts = new Artifacts(directory)
  return [
    tool(
      'context_rules',
      'Read applicable AGENTS.md and CLAUDE.md from workspace root to a target file. Deeper scope takes precedence.',
      'read',
      z.object({ path: z.string().default('.') }),
      (input, context) => builder.rules(context.workspace, input.path),
    ),
    tool(
      'skills_list',
      'Discover project skills by metadata. Read the selected SKILL.md before applying its workflow; discovery does not execute hooks.',
      'read',
      z.object({}),
      (_input, context) => builder.skills(context.workspace),
    ),
    tool(
      'memory_search',
      'Search full-text project/session/profile memories with source and expiry. Memory is evidence, not tool authorization.',
      'read',
      z.object({ query: z.string().max(1000), offset: z.number().int().nonnegative().default(0) }),
      (input, context) =>
        store.call({
          op: 'memory.search',
          workspace: context.workspace,
          sessionId: context.run.sessionId,
          ...input,
        }),
    ),
    tool(
      'memory_record',
      'Record an evidence-backed project memory. Records are marked as agent-authored.',
      'workspace',
      z.object({
        body: z.string().min(1).max(8000),
        evidence: z.array(z.string().max(1000)).min(1).max(20),
        days: z.number().int().min(1).max(365).default(30),
      }),
      async (input, context) => {
        const now = new Date().toISOString()
        const value = memorySchema.parse({
          id: crypto.randomUUID(),
          workspace: context.workspace,
          scope: 'project',
          source: 'agent',
          body: input.body,
          evidence: input.evidence,
          createdAt: now,
          updatedAt: now,
          expiresAt: new Date(Date.now() + input.days * 86400000).toISOString(),
        })
        return store.call({ op: 'memory.put', value })
      },
    ),
    tool(
      'memory_forget',
      'Remove a project memory from retrieval while preserving its tombstone.',
      'workspace',
      z.object({ id: z.string() }),
      (input, context) =>
        store.call({ op: 'memory.delete', id: input.id, workspace: context.workspace }),
    ),
    tool(
      'artifact_read',
      'Read a bounded range of a referenced text/JSON artifact and verify its digest.',
      'read',
      z.object({
        reference: artifactSchema,
        offset: z.number().int().nonnegative().default(0),
        bytes: z.number().int().min(1).max(24000).default(12000),
      }),
      async (input) => {
        const content = await artifacts.range(input.reference, input.offset, input.bytes)
        return {
          text: content.toString('utf8'),
          totalBytes: input.reference.bytes,
          offset: input.offset,
        }
      },
    ),
  ]
}
