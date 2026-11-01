import type {
  CoursePublicationJobView,
  CoursePublicationMediaPlan,
  CoursePublicationMediaResult,
  CoursePublicationMediaTask,
  CourseTransferContext,
  CourseTransferResult,
  CourseTransferTask,
} from '@sistemazero/core/course/publication'
import type { LessonDraftDocument } from '@sistemazero/core/learning'
import type {
  CourseSnapshot,
  Environment,
  MediaProof,
  Snapshot,
} from '../course-publication/course-sync'
import type { CoursePublicationSeed, PublicationTaskSeed } from '../course-publication/jobs'

export interface PublicationClaim {
  id: string
  token: string
}
export interface PublicationWorkTask {
  id: string
  taskKey: string
  kind: PublicationTaskSeed['kind']
  status: 'pending' | 'completed' | 'failed'
  input: Record<string, unknown>
  result: Record<string, unknown> | null
}
export interface CoursePublicationWorkRepository {
  claim(): Promise<PublicationClaim | null>
  capture(
    id: string,
  ): Promise<{ operation: string; snapshot: Snapshot; snapshotHash: string } | null>
  renew(claim: PublicationClaim): Promise<void>
  initializeTasks(
    claim: PublicationClaim,
    tasks: readonly PublicationTaskSeed[],
    progress?: { taskId: string; result: Record<string, unknown> },
  ): Promise<void>
  nextTask(claim: PublicationClaim): Promise<PublicationWorkTask | null>
  deferTask(claim: PublicationClaim, taskId: string): Promise<void>
  planTask(claim: PublicationClaim): Promise<PublicationWorkTask>
  finishTask(claim: PublicationClaim, id: string, result: Record<string, unknown>): Promise<void>
  savePlanProgress(
    claim: PublicationClaim,
    id: string,
    result: Record<string, unknown>,
  ): Promise<void>
  completedTasks(claim: PublicationClaim): Promise<PublicationWorkTask[]>
  fail(claim: PublicationClaim, message: string): Promise<void>
  release(claim: PublicationClaim, delaySeconds?: number): Promise<void>
  publishMirror(claim: PublicationClaim, media: MediaProof): Promise<unknown>
  publishPromotion(
    claim: PublicationClaim,
    media: MediaProof,
    sourceSeal: { sourceHash: string; checkedAt: Date },
  ): Promise<unknown>
}
export interface CoursePublicationMediaPort {
  plan(
    documents: readonly LessonDraftDocument[],
    signal: AbortSignal,
  ): Promise<CoursePublicationMediaPlan>
  execute(
    task: CoursePublicationMediaTask,
    signal: AbortSignal,
    profileHash: string,
  ): Promise<CoursePublicationMediaResult>
}
export interface CoursePublicationTransferPort {
  context(salesPageUrl: string | undefined, signal: AbortSignal): Promise<CourseTransferContext>
  execute(
    task: CourseTransferTask,
    context: CourseTransferContext,
    signal: AbortSignal,
  ): Promise<CourseTransferResult>
  verify(
    task: CourseTransferTask,
    result: CourseTransferResult,
    context: CourseTransferContext,
    signal: AbortSignal,
  ): Promise<void>
}
export interface CoursePublicationAdminRepository {
  sourceForPromotion(sourceCourseId: string): Promise<CourseSnapshot>
  snapshotForPromotion(source: CourseSnapshot, targetSlug: string): Promise<Snapshot>
  promotionBinding(id: string): Promise<{
    id: string
    operation: string
    status: CoursePublicationJobView['status']
    sourceHash: string | null
    sourceCourseId: string
    sourceEnvironment: string | null
    environment: string
  } | null>
  snapshotForMirror(
    environment: Environment,
    sourceCourseId: string,
    targetSlug: string,
  ): Promise<Snapshot>
  create(seed: CoursePublicationSeed): Promise<string>
  view(id: string): Promise<CoursePublicationJobView | null>
  latest(sourceCourseId: string): Promise<(CoursePublicationJobView | null)[]>
  approve(id: string, version: number, planHash: string): Promise<void>
  cancel(id: string, version: number): Promise<void>
  resume(id: string, version: number, planHash: string): Promise<void>
}
