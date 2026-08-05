import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveStudioTier } from '../lib/studio-tier'
import type { PensaArtifactView, PensaStageView } from '../lib/types'
import type { MembersClient } from '../server/clients'
import { auditPlan } from '../server/pensa-agents/plan-audit'
import {
  availablePlannerCatalog,
  IdeaArtifactSchema,
  VisualDirectionArtifactSchema,
} from '../server/pensa-agents/planner-contract'
import type { SessionModule } from '../server/session'

export type PensaRoutes = ReturnType<typeof createPensaRoutes>

const UUID = z.uuid()
const PROJECT_NAME = z.string().trim().min(2).max(120)
const WorkStage = z.enum(['z', 'e', 'r', 'o'])
const Stage = z.enum(['z', 'e', 'r', 'o', 'done'])
const ClientEditableArtifactType = z.enum(['idea', 'game_design', 'visual_direction'])
export const ClientValidatableArtifactType = z.enum([
  'idea',
  'game_design',
  'visual_direction',
  'task_plan',
])
const Destination = z.enum(['pinta', 'studio'])
const Category = z.enum(['art', 'setup', 'gameplay', 'scene', 'ui', 'polish'])

const invalid = () =>
  NextResponse.json(
    { error: { code: 'VALIDATION_ERROR', message: 'Corpo inválido' } },
    { status: 400 },
  )
const notFound = () => NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
const response = (status: number, body: unknown) =>
  NextResponse.json(body ?? { ok: status === 200 }, { status })

const CreateProjectBody = z.strictObject({ name: PROJECT_NAME })
const UpdateProjectBody = z
  .strictObject({
    name: PROJECT_NAME.optional(),
    status: z.enum(['active', 'archived']).optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined))
const CreateCycleBody = z.strictObject({ goal: z.string().trim().min(2).max(500) })
export const ClientArtifactBody = z.strictObject({
  stage: WorkStage,
  type: ClientEditableArtifactType,
  content: z.unknown(),
})
const AdvanceBody = z.strictObject({ from: WorkStage })

const GuideItem = z.strictObject({
  id: z.string().min(1).max(100),
  text: z.string().min(1).max(500),
  hint: z.string().max(500).optional(),
  required: z.boolean(),
})
const Guide = z.strictObject({
  steps: z.array(GuideItem).min(1).max(20),
  criteria: z.array(GuideItem).min(1).max(10),
})
const PintaContext = z.strictObject({
  kind: z.literal('pinta'),
  assetId: z.string().min(1).max(100),
  artKind: z.enum(['sprite', 'background', 'tileset', 'tilemap']),
  style: z.enum(['pixel', 'vector', 'either']),
  preset: z.string().max(100).optional(),
  palette: z
    .array(z.strictObject({ role: z.string().min(1).max(80), color: z.string().max(20) }))
    .max(16),
  appearance: z.string().min(1).max(2000),
  animations: z.array(z.string().max(200)).max(20),
  states: z.array(z.string().max(200)).max(20),
  usage: z.string().min(1).max(2000),
  requiresStudioUse: z.boolean(),
})
const StudioBlock = z.strictObject({
  id: z.string().min(1).max(160),
  label: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  subcategory: z.string().min(1).max(100),
  area: z.enum(['structure', 'appearance', 'start', 'events', 'loops', 'value']),
  extension: z.string().max(100).nullable(),
})
const StudioContext = z.strictObject({
  kind: z.literal('studio'),
  dimension: z.enum(['2d', '3d']),
  visualAssetIds: z.array(z.string().min(1).max(100)).max(20),
  blockIds: z.array(z.string().max(160)).max(80),
  blocks: z.array(StudioBlock).max(80),
  mechanicDocumentIds: z.array(z.string().max(100)).max(10),
  extensionIds: z.array(z.string().max(100)).max(10),
})
const TaskContext = z.discriminatedUnion('kind', [PintaContext, StudioContext])
const TaskInput = z
  .strictObject({
    key: z.string().min(1).max(100),
    title: z.string().min(1).max(200),
    summary: z.string().max(2000).nullable().optional(),
    destination: Destination,
    category: Category,
    estimatedMinutes: z.number().int().min(5).max(240),
    dependencies: z.array(z.string().min(1).max(100)).max(40).optional(),
    guide: Guide,
    context: TaskContext,
  })
  .refine((task) => task.destination === task.context.kind)
const TasksBody = z.strictObject({ tasks: z.array(TaskInput).min(1).max(60) })
const TaskUpdateBody = z
  .strictObject({
    position: z.number().int().min(0).max(1000).optional(),
    title: z.string().min(1).max(200).optional(),
    summary: z.string().max(2000).nullable().optional(),
    destination: Destination.optional(),
    category: Category.optional(),
    estimatedMinutes: z.number().int().min(5).max(240).optional(),
    dependencies: z.array(UUID).max(40).optional(),
    guide: Guide.optional(),
    context: TaskContext.optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined))
const OutputRef = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('pinta_asset'),
    assetId: z.string().min(1).max(200),
    assetName: z.string().max(200).optional(),
    usedInStudioAt: z.iso.datetime().optional(),
  }),
  z.strictObject({
    kind: z.literal('studio_project'),
    projectId: z.string().min(1).max(200),
    saveRevision: z.string().max(200).optional(),
  }),
])
const ProgressBody = z
  .strictObject({
    status: z.enum(['planned', 'in_progress', 'completed']).optional(),
    completedStepIds: z.array(z.string().min(1).max(100)).max(20).optional(),
    completedCriteriaIds: z.array(z.string().min(1).max(100)).max(10).optional(),
    outputRef: OutputRef.nullable().optional(),
    expectedUpdatedAt: z.iso.datetime().nullable(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined))

/** BFF fino do planejador; autoria do plano e progresso das ferramentas ficam separados. */
export function createPensaRoutes(deps: { members: MembersClient; session: SessionModule }) {
  const { members, session } = deps
  async function requireWritableSession(): Promise<NextResponse | null> {
    const user = await session.getSession()
    if (!user?.act) return null
    return NextResponse.json(
      { error: { code: 'IMPERSONATION_READONLY', message: 'Sessão de suporte é só leitura.' } },
      { status: 403 },
    )
  }
  const parseId = (id: string) => UUID.safeParse(id).success
  const latest = (stage: PensaStageView, type: string): PensaArtifactView | null =>
    stage.artifacts.find((artifact) => artifact.type === type) ?? null

  async function auditBeforeApproval(cycleId: string): Promise<NextResponse | null> {
    const [user, oStage, zStage, eStage, gamification] = await Promise.all([
      session.getSession(),
      members.pensaGetStage(cycleId, 'o'),
      members.pensaGetStage(cycleId, 'z'),
      members.pensaGetStage(cycleId, 'e'),
      members.getGamification(),
    ])
    if (
      !user ||
      oStage.status !== 200 ||
      !oStage.body ||
      zStage.status !== 200 ||
      !zStage.body ||
      eStage.status !== 200 ||
      !eStage.body ||
      gamification.status !== 200
    ) {
      return NextResponse.json(
        {
          error: {
            code: 'PENSA_AUDIT_UNAVAILABLE',
            message: 'Não consegui conferir o plano agora. Tente novamente.',
          },
        },
        { status: 503 },
      )
    }
    const idea = IdeaArtifactSchema.safeParse(latest(zStage.body, 'idea')?.content)
    const visual = VisualDirectionArtifactSchema.safeParse(
      latest(eStage.body, 'visual_direction')?.content,
    )
    if (!idea.success || !visual.success) {
      return NextResponse.json(
        {
          error: {
            code: 'PENSA_PLAN_AUDIT_STALE',
            message: 'A ideia ou a Bíblia Visual mudou. Execute uma nova auditoria.',
          },
        },
        { status: 409 },
      )
    }
    const tier = resolveStudioTier(gamification.body?.level?.slug ?? 'noob', user.role)
    const review = auditPlan(
      oStage.body,
      availablePlannerCatalog(tier, idea.data.dimension),
      idea.data.dimension,
      true,
      visual.data,
    )
    if (review.approved) return null
    return NextResponse.json(
      {
        error: {
          code: 'PENSA_PLAN_AUDIT_STALE',
          message: 'O plano mudou ou usa algo que não está disponível. Revise novamente.',
        },
        details: { findings: review.findings },
      },
      { status: 409 },
    )
  }

  const pensaProjects = {
    GET: async () => {
      const result = await members.pensaListProjects()
      return response(result.status, result.body)
    },
    POST: async (req: Request) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const parsed = CreateProjectBody.safeParse(await req.json().catch(() => null))
      if (!parsed.success) return invalid()
      const result = await members.pensaCreateProject(parsed.data)
      return response(result.status, result.body)
    },
  }

  const pensaProject = {
    GET: async (_req: Request, ctx: { params: Promise<{ projectId: string }> }) => {
      const { projectId } = await ctx.params
      if (!parseId(projectId)) return notFound()
      const result = await members.pensaGetProject(projectId)
      return response(result.status, result.body)
    },
    PATCH: async (req: Request, ctx: { params: Promise<{ projectId: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const { projectId } = await ctx.params
      if (!parseId(projectId)) return notFound()
      const parsed = UpdateProjectBody.safeParse(await req.json().catch(() => null))
      if (!parsed.success) return invalid()
      const result = await members.pensaUpdateProject(projectId, parsed.data)
      return response(result.status, result.body)
    },
  }

  const pensaCycleCreate = {
    POST: async (req: Request, ctx: { params: Promise<{ projectId: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const { projectId } = await ctx.params
      const parsed = CreateCycleBody.safeParse(await req.json().catch(() => null))
      if (!parseId(projectId) || !parsed.success) return invalid()
      const result = await members.pensaCreateCycle(projectId, parsed.data.goal)
      return response(result.status, result.body)
    },
  }

  const pensaStage = {
    GET: async (_req: Request, ctx: { params: Promise<{ cycleId: string; stage: string }> }) => {
      const { cycleId, stage } = await ctx.params
      if (!parseId(cycleId) || !Stage.safeParse(stage).success) return notFound()
      const result = await members.pensaGetStage(cycleId, stage)
      return response(result.status, result.body)
    },
  }

  const pensaArtifactCreate = {
    POST: async (req: Request, ctx: { params: Promise<{ cycleId: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const { cycleId } = await ctx.params
      const parsed = ClientArtifactBody.safeParse(await req.json().catch(() => null))
      if (!parseId(cycleId) || !parsed.success) return invalid()
      const result = await members.pensaSaveArtifact(cycleId, parsed.data)
      return response(result.status, result.body)
    },
  }

  const pensaArtifactValidate = {
    POST: async (_req: Request, ctx: { params: Promise<{ cycleId: string; type: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const { cycleId, type } = await ctx.params
      const parsed = ClientValidatableArtifactType.safeParse(type)
      if (!parseId(cycleId) || !parsed.success) return notFound()
      const result = await members.pensaValidateArtifact(cycleId, parsed.data)
      return response(result.status, result.body)
    },
  }

  const pensaAdvance = {
    POST: async (req: Request, ctx: { params: Promise<{ cycleId: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const { cycleId } = await ctx.params
      const parsed = AdvanceBody.safeParse(await req.json().catch(() => null))
      if (!parseId(cycleId) || !parsed.success) return invalid()
      if (parsed.data.from === 'o') {
        const auditFailure = await auditBeforeApproval(cycleId)
        if (auditFailure) return auditFailure
      }
      const result = await members.pensaAdvance(cycleId, parsed.data.from)
      return response(result.status, result.body)
    },
  }

  const taskCollection =
    (method: 'PUT' | 'POST') =>
    async (req: Request, ctx: { params: Promise<{ cycleId: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const { cycleId } = await ctx.params
      const parsed = TasksBody.safeParse(await req.json().catch(() => null))
      if (!parseId(cycleId) || !parsed.success) return invalid()
      const result =
        method === 'PUT'
          ? await members.pensaReplaceTasks(cycleId, parsed.data.tasks)
          : await members.pensaAppendTasks(cycleId, parsed.data.tasks)
      return response(result.status, result.body)
    }
  const pensaTasks = { PUT: taskCollection('PUT'), POST: taskCollection('POST') }

  const pensaTask = {
    PATCH: async (req: Request, ctx: { params: Promise<{ taskId: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const { taskId } = await ctx.params
      const parsed = TaskUpdateBody.safeParse(await req.json().catch(() => null))
      if (!parseId(taskId) || !parsed.success) return invalid()
      const result = await members.pensaUpdateTask(taskId, parsed.data)
      return response(result.status, result.body)
    },
    DELETE: async (_req: Request, ctx: { params: Promise<{ taskId: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const { taskId } = await ctx.params
      if (!parseId(taskId)) return notFound()
      const result = await members.pensaDeleteTask(taskId)
      return response(result.status, result.body)
    },
  }

  const pensaTaskHandoff = {
    GET: async (_req: Request, ctx: { params: Promise<{ taskId: string }> }) => {
      const { taskId } = await ctx.params
      if (!parseId(taskId)) return notFound()
      const result = await members.pensaGetTaskHandoff(taskId)
      return response(result.status, result.body)
    },
  }

  const pensaTaskProgress = {
    PATCH: async (req: Request, ctx: { params: Promise<{ taskId: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const { taskId } = await ctx.params
      const parsed = ProgressBody.safeParse(await req.json().catch(() => null))
      if (!parseId(taskId) || !parsed.success) return invalid()
      const result = await members.pensaUpdateTaskProgress(taskId, parsed.data)
      return response(result.status, result.body)
    },
  }

  return {
    pensaProjects,
    pensaProject,
    pensaCycleCreate,
    pensaStage,
    pensaArtifactCreate,
    pensaArtifactValidate,
    pensaAdvance,
    pensaTasks,
    pensaTask,
    pensaTaskHandoff,
    pensaTaskProgress,
  }
}
