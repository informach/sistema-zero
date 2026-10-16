import {
  idSchema,
  importChunkSchema,
  importSourceLoadSchema,
  importStartSchema,
} from '@sistemazero/marketing-contracts'
import { z } from 'zod'
import type { ImportRepository } from '../../domain/ports/import-repository.port'
import type { Actor } from '../actor'
import { parseWorkspace, workspaceActor } from './workspace.service'
export class ImportService {
  constructor(private readonly repo: ImportRepository) {}
  loadSource(actor: Actor, projectId: string, runId: string, raw: unknown) {
    return this.repo.loadSource(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, runId),
      parseWorkspace(importSourceLoadSchema, raw),
    )
  }
  start(actor: Actor, projectId: string, raw: unknown) {
    return this.repo.start(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(importStartSchema, raw),
    )
  }
  chunk(actor: Actor, projectId: string, runId: string, raw: unknown) {
    return this.repo.chunk(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, runId),
      parseWorkspace(importChunkSchema, raw),
    )
  }
  finish(actor: Actor, projectId: string, runId: string) {
    return this.repo.finish(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, runId),
    )
  }
  retire(actor: Actor, projectId: string, runId: string) {
    return this.repo.retire(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, runId),
    )
  }
  list(actor: Actor, projectId: string, before: unknown) {
    return this.repo.list(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      before === undefined ? null : parseWorkspace(idSchema, before),
    )
  }
  page(actor: Actor, projectId: string, runId: string, cursor: unknown) {
    return this.repo.page(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, runId),
      cursor === undefined ? 0 : parseWorkspace(z.coerce.number().int().min(0).max(100000), cursor),
    )
  }
}
