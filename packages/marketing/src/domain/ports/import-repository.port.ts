import type {
  ImportChunk,
  ImportPage,
  ImportRun,
  ImportStart,
} from '@sistemazero/marketing-contracts'
export interface ImportRepository {
  reconcile(
    actorId: string,
    projectId: string,
    runId: string,
    input: import('@sistemazero/marketing-contracts').ImportReconcileApply,
  ): Promise<import('@sistemazero/marketing-contracts').ImportReconcileResult>
  officeText(
    actorId: string,
    projectId: string,
    sourceId: string,
  ): Promise<import('@sistemazero/marketing-contracts').ImportOfficeView>
  extractOfficeText(
    actorId: string,
    projectId: string,
    sourceId: string,
    input: import('@sistemazero/marketing-contracts').ImportOfficeApply,
  ): Promise<import('@sistemazero/marketing-contracts').ImportOfficeView>
  previewRelease(
    actorId: string,
    projectId: string,
    runId: string,
  ): Promise<import('@sistemazero/marketing-contracts').ImportReleasePreview>
  release(
    actorId: string,
    projectId: string,
    runId: string,
    input: import('@sistemazero/marketing-contracts').ImportReleaseApply,
  ): Promise<import('@sistemazero/marketing-contracts').ImportRelease>
  decideSource(
    actorId: string,
    projectId: string,
    runId: string,
    input: import('@sistemazero/marketing-contracts').ImportDecisionApply,
  ): Promise<import('@sistemazero/marketing-contracts').ImportDecision>
  delta(
    actorId: string,
    projectId: string,
    runId: string,
    query: import('@sistemazero/marketing-contracts').ImportDeltaQuery,
  ): Promise<import('@sistemazero/marketing-contracts').ImportDelta>
  coverage(
    actorId: string,
    projectId: string,
    runId: string,
    query: import('@sistemazero/marketing-contracts').ImportCoverageQuery,
  ): Promise<import('@sistemazero/marketing-contracts').ImportCoverage>
  previewProductionLink(
    actorId: string,
    projectId: string,
    reportId: string,
  ): Promise<import('@sistemazero/marketing-contracts').ProductionLinkPreview>
  applyProductionLink(
    actorId: string,
    projectId: string,
    reportId: string,
    input: import('@sistemazero/marketing-contracts').ProductionLinkApply,
  ): Promise<import('@sistemazero/marketing-contracts').ProductionLink>
  shareProduction(
    actorId: string,
    projectId: string,
    runId: string,
    input: import('@sistemazero/marketing-contracts').ImportProductionShare,
  ): Promise<import('@sistemazero/marketing-contracts').ProductionReport>
  productionReports(
    actorId: string,
    projectId: string,
    runId: string,
    after: string | null,
  ): Promise<import('@sistemazero/marketing-contracts').ProductionReportPage>
  productBindings(
    actorId: string,
    projectId: string,
  ): Promise<import('@sistemazero/marketing-contracts').ImportProductBinding[]>
  bindProduct(
    actorId: string,
    projectId: string,
    input: import('@sistemazero/marketing-contracts').ImportProductBind,
  ): Promise<import('@sistemazero/marketing-contracts').ImportProductBinding>
  previewCalendar(
    actorId: string,
    projectId: string,
    sourceId: string,
  ): Promise<import('@sistemazero/marketing-contracts').ImportCalendarPreview>
  applyCalendar(
    actorId: string,
    projectId: string,
    input: import('@sistemazero/marketing-contracts').ImportCalendarApply,
  ): Promise<import('@sistemazero/marketing-contracts').ImportCalendarResult>
  previewStructure(
    actorId: string,
    projectId: string,
    sourceId: string,
  ): Promise<import('@sistemazero/marketing-contracts').ImportStructurePreview>
  applyStructure(
    actorId: string,
    projectId: string,
    input: import('@sistemazero/marketing-contracts').ImportStructureApply,
  ): Promise<import('@sistemazero/marketing-contracts').ImportStructureResult>
  loadSource(
    actorId: string,
    projectId: string,
    runId: string,
    input: import('@sistemazero/marketing-contracts').ImportSourceLoad,
  ): Promise<import('@sistemazero/marketing-contracts').ImportSourceResult>
  start(actorId: string, projectId: string, input: ImportStart): Promise<ImportRun>
  chunk(actorId: string, projectId: string, runId: string, input: ImportChunk): Promise<ImportRun>
  finish(actorId: string, projectId: string, runId: string): Promise<ImportRun>
  retire(actorId: string, projectId: string, runId: string): Promise<ImportRun>
  list(actorId: string, projectId: string, before: string | null): Promise<ImportRun[]>
  page(actorId: string, projectId: string, runId: string, cursor: number): Promise<ImportPage>
}
