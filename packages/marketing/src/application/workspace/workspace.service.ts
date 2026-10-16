import { createHash } from 'node:crypto'
import { ForbiddenError } from '@sistemazero/core/http'
import {
  batchOperationSchema,
  canonicalJson,
  handoffCreateSchema,
  idSchema,
  operationSchema,
  projectCreateSchema,
  projectMemberSchema,
} from '@sistemazero/marketing-contracts'
import { z } from 'zod'
import type { StaffDirectory } from '../../domain/ports/staff-directory.port'
import type { WorkspaceRepository } from '../../domain/ports/workspace-repository.port'
import { WorkspaceError } from '../../domain/workspace/workspace-error'
import type { Actor } from '../actor'
export const payloadHash = (value: unknown) =>
  createHash('sha256').update(canonicalJson(value)).digest('hex')
export function parseWorkspace<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value)
  if (!parsed.success)
    throw new WorkspaceError(
      'VALIDATION_ERROR',
      parsed.error.issues
        .map((i) => i.message)
        .join('; ')
        .slice(0, 1000),
    )
  return parsed.data
}
export function workspaceActor(actor: Actor) {
  if (actor.status !== 'active' || !['staff', 'admin', 'superadmin'].includes(actor.role ?? ''))
    throw new ForbiddenError('Acesso restrito à equipe ativa')
  return parseWorkspace(idSchema, actor.userId)
}
export class WorkspaceService {
  constructor(
    private repo: WorkspaceRepository,
    private directory: StaffDirectory,
  ) {}
  actionReceipt(actor: Actor, projectId: string, operationId: string) {
    return this.repo.actionReceipt(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, operationId),
    )
  }
  async team(actor: Actor, id: string) {
    const members = await this.repo.members(workspaceActor(actor), parseWorkspace(idSchema, id))
    const identities = await this.directory.lookup({ ids: members.map((member) => member.userId) })
    return members.map((member) => ({
      id: member.userId,
      name: identities.find((identity) => identity.id === member.userId)?.name ?? 'Conta removida',
      active: identities.find((identity) => identity.id === member.userId)?.active ?? false,
      permissions: member.permissions,
    }))
  }
  async searchStaff(actor: Actor, id: string, query: unknown) {
    await this.repo.members(workspaceActor(actor), parseWorkspace(idSchema, id), 'admin')
    return this.directory.lookup({
      query: parseWorkspace(z.string().trim().min(2).max(100), query),
    })
  }
  createHandoff(actor: Actor, raw: unknown) {
    const input = parseWorkspace(handoffCreateSchema, raw)
    return this.repo.createHandoff(workspaceActor(actor), {
      ...input,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    })
  }
  resolveHandoff(actor: Actor, id: string) {
    return this.repo.resolveHandoff(workspaceActor(actor), parseWorkspace(idSchema, id))
  }
  list(actor: Actor) {
    return this.repo.listProjects(workspaceActor(actor))
  }
  create(actor: Actor, raw: unknown) {
    const input = parseWorkspace(projectCreateSchema, raw)
    return this.repo.createProject(workspaceActor(actor), input, payloadHash(input))
  }
  snapshot(actor: Actor, id: string) {
    return this.repo.snapshot(workspaceActor(actor), parseWorkspace(idSchema, id))
  }
  history(actor: Actor, id: string, entity: string) {
    return this.repo.history(
      workspaceActor(actor),
      parseWorkspace(idSchema, id),
      parseWorkspace(idSchema, entity),
    )
  }
  changes(actor: Actor, id: string, cursor: unknown) {
    return this.repo.changes(
      workspaceActor(actor),
      parseWorkspace(idSchema, id),
      parseWorkspace(z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER), cursor),
    )
  }
  apply(actor: Actor, raw: unknown) {
    const input = parseWorkspace(operationSchema, raw)
    return this.repo.apply(workspaceActor(actor), input, payloadHash(input))
  }
  applyBatch(actor: Actor, raw: unknown) {
    const input = parseWorkspace(batchOperationSchema, raw)
    if (Buffer.byteLength(canonicalJson(input)) > 500000)
      throw new WorkspaceError('CONTEXT_TOO_LARGE', 'Divida a alteração em grupos menores de peças')
    return this.repo.applyBatch(
      workspaceActor(actor),
      input,
      payloadHash({ action: 'batch', input }),
    )
  }
  async setMember(actor: Actor, id: string, raw: unknown) {
    const input = parseWorkspace(projectMemberSchema, raw)
    const actorId = workspaceActor(actor),
      projectId = parseWorkspace(idSchema, id)
    await this.repo.members(actorId, projectId, 'admin')
    if (input.permissions.length) {
      const identities = await this.directory.lookup({ ids: [input.userId] })
      if (!identities.some((identity) => identity.id === input.userId && identity.active))
        throw new WorkspaceError('VALIDATION_ERROR', 'Escolha uma conta ativa da equipe')
    }
    return this.repo.setMember(actorId, projectId, input, payloadHash(input))
  }
}
