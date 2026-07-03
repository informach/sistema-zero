import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { MembersClient } from '../server/clients'
import type { SessionModule } from '../server/session'

export type PensaRoutes = ReturnType<typeof createPensaRoutes>

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

const invalid = () =>
  NextResponse.json(
    { error: { code: 'VALIDATION_ERROR', message: 'Corpo inválido' } },
    { status: 400 },
  )
const notFound = () => NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })

// ── Schemas da borda (o members revalida tudo; aqui é a 1ª linha de defesa) ──
const PROJECT_NAME = z.string().trim().min(2).max(120)
const StageParam = z.enum(['z', 'e', 'r', 'o'])
const ArtifactTypeParam = z.enum([
  'idea',
  'prd',
  'friendly_spec',
  'identity',
  'mission_plan',
  'checklist_seed',
])

const CreateProjectBody = z.object({
  name: PROJECT_NAME,
  kind: z.enum(['game', 'webapp']),
})
const UpdateProjectBody = z
  .object({
    name: PROJECT_NAME.optional(),
    status: z.enum(['active', 'archived']).optional(),
    // Charset do id de projeto do Estúdio (IndexedDB) — sem `:` (gotcha do studio).
    studioProjectId: z
      .string()
      .regex(/^[A-Za-z0-9_-]{1,128}$/)
      .optional(),
    // Onde construir (escolha da criança na etapa R).
    buildEnv: z.enum(['embedded', 'studio', 'external']).optional(),
  })
  .refine(
    (b) =>
      b.name !== undefined ||
      b.status !== undefined ||
      b.studioProjectId !== undefined ||
      b.buildEnv !== undefined,
  )

/** Teto do snapshot serializado (espelha o cap do members; o gateway corta em 2MB). */
const SNAPSHOT_MAX_CHARS = 1_800_000
const CreateCycleBody = z.object({ goal: z.string().trim().min(2).max(500) })
const AdvanceBody = z.object({ from: StageParam })

// Missão (autoria manual) — o members revalida com o TypeBox; aqui é a 1ª defesa.
const MissionZod = z.object({
  story: z.string().max(2000).optional(),
  steps: z
    .array(z.object({ text: z.string().min(1).max(500), hint: z.string().max(500).optional() }))
    .min(1)
    .max(12),
  studioHints: z
    .object({
      categories: z.array(z.string().max(80)).max(20),
      blocks: z.array(z.string().max(80)).max(50),
    })
    .optional(),
  doneWhen: z.array(z.string().min(1).max(300)).min(1).max(3),
  artKind: z.enum(['sprite', 'background', 'tileset']).optional(),
  palette: z.array(z.string().max(20)).max(8).optional(),
})
const TaskInputZod = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().max(2000).nullable().optional(),
  taskType: z.string().max(40).nullable().optional(),
  mission: MissionZod,
})
/** APPEND de missões (autoria manual "+ Nova missão"; o members cobra o teto de 60). */
const TasksAppendBody = z.object({ tasks: z.array(TaskInputZod).min(1).max(60) })

const TaskUpdateBody = z
  .object({
    column: z.enum(['backlog', 'doing', 'review', 'done']).optional(),
    position: z.number().int().min(0).max(500).optional(),
    notes: z.string().max(2000).nullable().optional(),
    // Autoria manual: editar o conteúdo da missão.
    title: z.string().min(1).max(200).optional(),
    summary: z.string().max(2000).nullable().optional(),
    taskType: z.string().max(40).nullable().optional(),
    mission: MissionZod.optional(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined))
const ChecklistToggleBody = z.object({ done: z.boolean() })

/**
 * Rotas do Pensa (planejamento guiado — metodologia ZERO), consumidas pelo pacote
 * `@sistemazero/pensa` embarcado nos apps de aluno. TUDO aqui é passthrough fino
 * (Zod na borda → client → members via gateway); o members é o portão real
 * (ownership por perfil, gate de produto no create, gates do advance).
 *
 * A rota de IA (chat SSE `/api/pensa/chat`) NÃO vive aqui — chega na fase da
 * etapa Z, em módulo próprio (streaming tem shape de handler diferente).
 */
export function createPensaRoutes(deps: { members: MembersClient; session: SessionModule }) {
  const { members, session } = deps

  /** Impersonação (claim `act`) é SOMENTE-LEITURA: suporte não planeja pelo aluno. */
  async function requireWritableSession(): Promise<NextResponse | null> {
    const user = await session.getSession()
    if (!user?.act) return null
    return NextResponse.json(
      { error: { code: 'IMPERSONATION_READONLY', message: 'Sessão de suporte é só leitura.' } },
      { status: 403 },
    )
  }

  const pensaProjects = {
    GET: async () => {
      const { status, body } = await members.pensaListProjects()
      return NextResponse.json(body ?? { ok: status === 200 }, { status })
    },
    POST: async (req: Request) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const parsed = CreateProjectBody.safeParse(await req.json().catch(() => null))
      if (!parsed.success) return invalid()
      const { status, body } = await members.pensaCreateProject(parsed.data)
      return NextResponse.json(body ?? { ok: status === 200 }, { status })
    },
  }

  const pensaProject = {
    GET: async (_req: Request, ctx: { params: Promise<{ projectId: string }> }) => {
      const { projectId } = await ctx.params
      if (!UUID_RE.test(projectId)) return notFound()
      const { status, body } = await members.pensaGetProject(projectId)
      return NextResponse.json(body ?? { ok: status === 200 }, { status })
    },
    PATCH: async (req: Request, ctx: { params: Promise<{ projectId: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const { projectId } = await ctx.params
      if (!UUID_RE.test(projectId)) return notFound()
      const parsed = UpdateProjectBody.safeParse(await req.json().catch(() => null))
      if (!parsed.success) return invalid()
      const { status, body } = await members.pensaUpdateProject(projectId, parsed.data)
      return NextResponse.json(body ?? { ok: status === 200 }, { status })
    },
  }

  const pensaStudioSnapshot = {
    // Backup do JOGO em construção (JSON do projeto do Estúdio) atrelado ao projeto
    // do Pensa: GET restaura em navegador novo; PUT sobe o snapshot (debounced no
    // host). O members é o portão (ownership + cap); aqui só a 1ª linha de defesa.
    GET: async (_req: Request, ctx: { params: Promise<{ projectId: string }> }) => {
      const { projectId } = await ctx.params
      if (!UUID_RE.test(projectId)) return notFound()
      const { status, body } = await members.pensaGetStudioSnapshot(projectId)
      return NextResponse.json(body ?? { ok: status === 200 }, { status })
    },
    PUT: async (req: Request, ctx: { params: Promise<{ projectId: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const { projectId } = await ctx.params
      if (!UUID_RE.test(projectId)) return notFound()
      let parsed: { project?: unknown }
      try {
        parsed = (await req.json()) as { project?: unknown }
      } catch {
        return invalid()
      }
      const project = parsed?.project
      if (!project || typeof project !== 'object' || Array.isArray(project)) return invalid()
      if (JSON.stringify(project).length > SNAPSHOT_MAX_CHARS) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Projeto grande demais para o backup' } },
          { status: 413 },
        )
      }
      const { status, body } = await members.pensaSaveStudioSnapshot(projectId, project)
      return NextResponse.json(body ?? { ok: status === 200 }, { status })
    },
  }

  const pensaCycleCreate = {
    POST: async (req: Request, ctx: { params: Promise<{ projectId: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const { projectId } = await ctx.params
      if (!UUID_RE.test(projectId)) return notFound()
      const parsed = CreateCycleBody.safeParse(await req.json().catch(() => null))
      if (!parsed.success) return invalid()
      const { status, body } = await members.pensaCreateCycle(projectId, parsed.data.goal)
      return NextResponse.json(body ?? { ok: status === 200 }, { status })
    },
  }

  const pensaStage = {
    GET: async (_req: Request, ctx: { params: Promise<{ cycleId: string; stage: string }> }) => {
      const { cycleId, stage } = await ctx.params
      if (!UUID_RE.test(cycleId) || !StageParam.safeParse(stage).success) return notFound()
      const { status, body } = await members.pensaGetStage(cycleId, stage)
      return NextResponse.json(body ?? { ok: status === 200 }, { status })
    },
  }

  const pensaArtifactValidate = {
    POST: async (_req: Request, ctx: { params: Promise<{ cycleId: string; type: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const { cycleId, type } = await ctx.params
      const parsedType = ArtifactTypeParam.safeParse(type)
      if (!UUID_RE.test(cycleId) || !parsedType.success) return notFound()
      const { status, body } = await members.pensaValidateArtifact(cycleId, parsedType.data)
      return NextResponse.json(body ?? { ok: status === 200 }, { status })
    },
  }

  const pensaAdvance = {
    POST: async (req: Request, ctx: { params: Promise<{ cycleId: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const { cycleId } = await ctx.params
      if (!UUID_RE.test(cycleId)) return notFound()
      const parsed = AdvanceBody.safeParse(await req.json().catch(() => null))
      if (!parsed.success) return invalid()
      const { status, body } = await members.pensaAdvance(cycleId, parsed.data.from)
      return NextResponse.json(body ?? { ok: status === 200 }, { status })
    },
  }

  // POST /cycles/:cycleId/tasks — APPEND (autoria manual "+ Nova missão").
  const pensaTaskCreate = {
    POST: async (req: Request, ctx: { params: Promise<{ cycleId: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const { cycleId } = await ctx.params
      if (!UUID_RE.test(cycleId)) return notFound()
      const parsed = TasksAppendBody.safeParse(await req.json().catch(() => null))
      if (!parsed.success) return invalid()
      const { status, body } = await members.pensaAppendTasks(cycleId, parsed.data.tasks)
      return NextResponse.json(body ?? { ok: status === 200 }, { status })
    },
  }

  const pensaTaskUpdate = {
    PATCH: async (req: Request, ctx: { params: Promise<{ taskId: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const { taskId } = await ctx.params
      if (!UUID_RE.test(taskId)) return notFound()
      const parsed = TaskUpdateBody.safeParse(await req.json().catch(() => null))
      if (!parsed.success) return invalid()
      const { status, body } = await members.pensaUpdateTask(taskId, parsed.data)
      return NextResponse.json(body ?? { ok: status === 200 }, { status })
    },
    // DELETE /tasks/:taskId — apagar 1 card (autoria manual).
    DELETE: async (_req: Request, ctx: { params: Promise<{ taskId: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const { taskId } = await ctx.params
      if (!UUID_RE.test(taskId)) return notFound()
      const { status, body } = await members.pensaDeleteTask(taskId)
      return NextResponse.json(body ?? { ok: status === 200 }, { status })
    },
  }

  const pensaChecklistToggle = {
    PATCH: async (req: Request, ctx: { params: Promise<{ itemId: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const { itemId } = await ctx.params
      if (!UUID_RE.test(itemId)) return notFound()
      const parsed = ChecklistToggleBody.safeParse(await req.json().catch(() => null))
      if (!parsed.success) return invalid()
      const { status, body } = await members.pensaToggleChecklist(itemId, parsed.data.done)
      return NextResponse.json(body ?? { ok: status === 200 }, { status })
    },
  }

  return {
    pensaProjects,
    pensaProject,
    pensaStudioSnapshot,
    pensaCycleCreate,
    pensaStage,
    pensaArtifactValidate,
    pensaAdvance,
    pensaTaskCreate,
    pensaTaskUpdate,
    pensaChecklistToggle,
  }
}
