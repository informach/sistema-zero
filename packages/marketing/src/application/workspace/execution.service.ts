import {
  claimRunSchema,
  contextRequestSchema,
  finishRunSchema,
  heartbeatSchema,
  idSchema,
  runCreateSchema,
  runListQuerySchema,
} from '@sistemazero/marketing-contracts'
import { z } from 'zod'
import type { ExecutionRepository } from '../../domain/ports/execution-repository.port'
import { WorkspaceError } from '../../domain/workspace/workspace-error'
import type { Actor } from '../actor'
import { parseWorkspace, payloadHash, workspaceActor } from './workspace.service'
export class ExecutionService {
  constructor(private readonly repo: ExecutionRepository) {}
  apply(actor: Actor, projectId: string, id: string, raw: unknown) {
    const input = parseWorkspace(
      z.object({ variantIndex: z.number().int().min(0).max(3) }).strict(),
      raw,
    )
    return this.repo.apply(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, id),
      input.variantIndex,
    )
  }
  undo(actor: Actor, projectId: string, id: string) {
    return this.repo.undo(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, id),
    )
  }
  context(actor: Actor, raw: unknown) {
    return this.repo.context(workspaceActor(actor), parseWorkspace(contextRequestSchema, raw))
  }
  create(actor: Actor, raw: unknown) {
    const input = parseWorkspace(runCreateSchema, raw)
    if (input.capability === 'research' && input.provider !== 'codex')
      throw new WorkspaceError(
        'INVALID_OPERATION',
        'A pesquisa com fontes requer Codex nesta versão',
      )
    return this.repo.create(workspaceActor(actor), input, payloadHash({ action: 'create', input }))
  }
  list(actor: Actor, projectId: string, raw: unknown = {}) {
    return this.repo.list(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(runListQuerySchema, raw),
    )
  }
  get(actor: Actor, projectId: string, id: string) {
    return this.repo.get(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, id),
    )
  }
  private executor(actor: Actor) {
    const actorId = workspaceActor(actor)
    if (!actor.desktopDeviceId)
      throw new WorkspaceError('DESKTOP_REQUIRED', 'Abra este trabalho no app desktop')
    return { actorId, deviceId: parseWorkspace(idSchema, actor.desktopDeviceId) }
  }
  claim(actor: Actor, projectId: string, id: string, raw: unknown) {
    const { actorId, deviceId } = this.executor(actor),
      input = parseWorkspace(claimRunSchema, raw)
    return this.repo.claim(
      actorId,
      deviceId,
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, id),
      input,
      payloadHash({ action: 'claim', id, deviceId, input }),
    )
  }
  heartbeat(actor: Actor, projectId: string, id: string, raw: unknown) {
    const { actorId, deviceId } = this.executor(actor),
      input = parseWorkspace(heartbeatSchema, raw)
    return this.repo.heartbeat(
      actorId,
      deviceId,
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, id),
      input,
      payloadHash({ action: 'heartbeat', id, deviceId, input }),
    )
  }
  finish(actor: Actor, projectId: string, id: string, raw: unknown) {
    const { actorId, deviceId } = this.executor(actor),
      input = parseWorkspace(finishRunSchema, raw)
    return this.repo.finish(
      actorId,
      deviceId,
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, id),
      input,
      payloadHash({ action: 'finish', id, deviceId, input }),
    )
  }
  cancel(actor: Actor, projectId: string, id: string, raw: unknown) {
    const input = parseWorkspace(z.object({ operationId: idSchema }).strict(), raw)
    return this.repo.cancel(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, id),
      input.operationId,
      payloadHash({ action: 'cancel', id, input }),
    )
  }
}
