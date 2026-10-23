import {
  idSchema,
  importCalendarApplySchema,
  importChunkSchema,
  importCoverageQuerySchema,
  importDecisionApplySchema,
  importDeltaQuerySchema,
  importOfficeApplySchema,
  importProductBindSchema,
  importProductionShareSchema,
  importReconcileApplySchema,
  importReleaseApplySchema,
  importSourceLoadSchema,
  importStartSchema,
  importStructureApplySchema,
  productionLinkApplySchema,
} from '@sistemazero/marketing-contracts'
import { z } from 'zod'
import type { ImportRepository } from '../../domain/ports/import-repository.port'
import type { Actor } from '../actor'
import { parseWorkspace, workspaceActor } from './workspace.service'
export class ImportService {
  constructor(private readonly repo: ImportRepository) {}
  reconcile(actor: Actor, projectId: string, runId: string, raw: unknown) {
    return this.repo.reconcile(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, runId),
      parseWorkspace(importReconcileApplySchema, raw),
    )
  }
  officeText(actor: Actor, projectId: string, sourceId: string) {
    return this.repo.officeText(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, sourceId),
    )
  }
  extractOfficeText(actor: Actor, projectId: string, sourceId: string, raw: unknown) {
    return this.repo.extractOfficeText(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, sourceId),
      parseWorkspace(importOfficeApplySchema, raw),
    )
  }
  previewRelease(actor: Actor, projectId: string, runId: string) {
    return this.repo.previewRelease(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, runId),
    )
  }
  release(actor: Actor, projectId: string, runId: string, raw: unknown) {
    return this.repo.release(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, runId),
      parseWorkspace(importReleaseApplySchema, raw),
    )
  }
  decideSource(actor: Actor, projectId: string, runId: string, raw: unknown) {
    return this.repo.decideSource(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, runId),
      parseWorkspace(importDecisionApplySchema, raw),
    )
  }
  delta(actor: Actor, projectId: string, runId: string, query: unknown) {
    return this.repo.delta(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, runId),
      parseWorkspace(importDeltaQuerySchema, query),
    )
  }
  coverage(actor: Actor, projectId: string, runId: string, query: unknown) {
    return this.repo.coverage(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, runId),
      parseWorkspace(importCoverageQuerySchema, query),
    )
  }
  previewProductionLink(actor: Actor, projectId: string, reportId: string) {
    return this.repo.previewProductionLink(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, reportId),
    )
  }
  applyProductionLink(actor: Actor, projectId: string, reportId: string, raw: unknown) {
    return this.repo.applyProductionLink(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, reportId),
      parseWorkspace(productionLinkApplySchema, raw),
    )
  }
  shareProduction(actor: Actor, projectId: string, runId: string, raw: unknown) {
    return this.repo.shareProduction(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, runId),
      parseWorkspace(importProductionShareSchema, raw),
    )
  }
  productionReports(actor: Actor, projectId: string, runId: string, after: unknown) {
    return this.repo.productionReports(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, runId),
      after === undefined ? null : parseWorkspace(idSchema, after),
    )
  }
  productBindings(actor: Actor, projectId: string) {
    return this.repo.productBindings(workspaceActor(actor), parseWorkspace(idSchema, projectId))
  }
  bindProduct(actor: Actor, projectId: string, raw: unknown) {
    return this.repo.bindProduct(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(importProductBindSchema, raw),
    )
  }
  previewCalendar(actor: Actor, projectId: string, sourceId: string) {
    return this.repo.previewCalendar(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, sourceId),
    )
  }
  applyCalendar(actor: Actor, projectId: string, raw: unknown) {
    return this.repo.applyCalendar(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(importCalendarApplySchema, raw),
    )
  }
  previewStructure(actor: Actor, projectId: string, sourceId: string) {
    return this.repo.previewStructure(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, sourceId),
    )
  }
  applyStructure(actor: Actor, projectId: string, raw: unknown) {
    return this.repo.applyStructure(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(importStructureApplySchema, raw),
    )
  }
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
