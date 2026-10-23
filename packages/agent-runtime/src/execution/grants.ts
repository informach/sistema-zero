import type { Run } from '@sistemazero/agent-core'
import { z } from 'zod'
import type { Store } from '../store/client'
import { hash } from '../tools/paths'

const grantSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  workspace: z.string(),
  capability: z.string(),
  digest: z.string(),
  expiresAt: z.string(),
  revoked: z.boolean().default(false),
})
export class Grants {
  constructor(private store: Store) {}
  private id(run: Run, workspace: string, capability: string, digest: string) {
    return hash(JSON.stringify([run.sessionId, workspace, capability, digest]))
  }
  async allows(run: Run, workspace: string, capability: string, digest: string) {
    const raw = await this.store.call({
      op: 'document.get',
      namespace: 'grants',
      id: this.id(run, workspace, capability, digest),
    })
    if (!raw) return false
    const grant = grantSchema.parse(raw)
    return !grant.revoked && Date.parse(grant.expiresAt) > Date.now()
  }
  async issue(run: Run, workspace: string, capability: string, digest: string) {
    const id = this.id(run, workspace, capability, digest)
    const value = grantSchema.parse({
      id,
      sessionId: run.sessionId,
      workspace,
      capability,
      digest,
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    })
    await this.store.call({ op: 'document.put', namespace: 'grants', id, value })
    return value
  }
  async revoke(id: string) {
    const raw = grantSchema.parse(
      await this.store.call({ op: 'document.get', namespace: 'grants', id }),
    )
    await this.store.call({
      op: 'document.put',
      namespace: 'grants',
      id,
      value: { ...raw, revoked: true },
    })
    return { revoked: true }
  }
}
