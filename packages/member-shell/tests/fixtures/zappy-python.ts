import { mock } from 'bun:test'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import type { JourneyLevelSlug } from '@sistemazero/core/journey'
import { lessonStudioProjectId } from '@sistemazero/core/studio/lesson-project-id'
import { StudioPythonAnalysisAuthorizationSchema } from '@sistemazero/core/studio/python-language-authorization'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { AuthorizeLessonRuntimeService } from '../../../members/src/application/studio/authorize-lesson-runtime.service'
import { AuthorizePythonAnalysisService } from '../../../members/src/application/studio/authorize-python-analysis.service'
import { studioLessonBaseline } from '../../../members/src/domain/studio/lesson-baseline'
import { createStudioRuntimeHosts } from '../../../members/src/domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from '../../../members/src/domain/studio/runtime-policy'
import { authoringFixture } from '../../../members/tests/fakes/studio-authoring-policy'
import { PYTHON_PROGRAMMING_CODECS } from '../../../studio/src/python/blocks/catalog'
import { buildStudioTutorRequest } from '../../../studio/src/studio/tutor'
import { studioTutorSourceHash } from '../../../studio/src/studio/tutorSafety'
import type { SessionUser } from '../../src/lib/types'
import { pensaKidsJourney } from '../pensa-fixtures'

mock.module('server-only', () => ({}))
process.env.JWT_HS256_SECRET ??= 'test-jwt-secret-with-32-characters'
process.env.OPENROUTER_API_KEY ??= 'test-openrouter-key'
const { createStudioZappyRoutes } = await import('../../src/routes/studio-zappy')

export async function pythonZappyFixture(
  kind: 'classic' | 'pro',
  audience: 'kids' | 'adult' = 'kids',
) {
  const user: SessionUser = {
    id: crypto.randomUUID(),
    email: '',
    firstName: 'Bia',
    lastName: '',
    role: 'user',
    status: 'active',
    ...(audience === 'kids' ? { activeProfile: { accountId: crypto.randomUUID() } } : {}),
  }
  const fixture = await authoringFixture('python', kind)
  const document = fixture.project
  if (document.programmingLanguage !== 'python') throw new Error('Python fixture required')
  const project = { ...document, assets: [] }
  const lessonId = crypto.randomUUID(),
    blockId = crypto.randomUUID()
  project.id = lessonStudioProjectId(blockId, user.id)
  fixture.configuration.releases[0]!.blockIds = PYTHON_PROGRAMMING_CODECS.map((codec) => codec.id)
  const policy = await createStudioRuntimePolicy(
    fixture.configuration,
    createStudioRuntimeHosts(fixture.configuration.catalog, [
      { runtime: project.runtime, origin: 'https://runtime.test' },
    ]),
  )
  const baseline = studioLessonBaseline({
    lessonId,
    blockId,
    courseId: crypto.randomUUID(),
    configuration: {
      initialProject: project,
      pythonLevel: 2,
      allowedModes: ['blocks', 'bridge', 'code'],
    },
  })
  const state = {
    allowed: true,
    levelSlug: 'hacker' as JourneyLevelSlug,
    adultAi: true,
    policies: 0,
    reservations: 0,
    freeAccess: 0,
    knowledge: 0,
    history: 0,
    deletions: 0,
    feedback: 0,
    reservationStatus: 200,
    onReservation: async () => {},
    onGamification: () => {},
    mutate: (value: unknown): unknown => value,
  }
  const service = new AuthorizePythonAnalysisService({
    lesson: new AuthorizeLessonRuntimeService(
      { execute: async () => ({ ...baseline, bound: state.allowed, readOnly: false }) },
      policy,
    ),
  })
  const subject = studioRuntimeSubject(project)
  const authorization = StudioPythonAnalysisAuthorizationSchema.parse({
    operation: 'analyze',
    context: { kind: 'lesson', lessonId, blockId, baselineId: baseline.id },
    subject,
    revision: await sha256Hex(canonicalJson(subject)),
  })
  const input = {
    ...buildStudioTutorRequest({
      project,
      selectedBlockId: null,
      lastError: null,
      question: 'Me explique este projeto',
      proEditor:
        kind === 'pro'
          ? {
              projectId: project.id,
              activeFile: project.python.entrypoint,
              diagnostics: [
                {
                  path: project.python.entrypoint,
                  code: 'reportUndefinedVariable',
                  source: 'pyright',
                  line: 2,
                  message: 'Nome não definido',
                  sourceHash: studioTutorSourceHash('from helper import n\nprint(n)'),
                },
              ],
            }
          : undefined,
    }),
    projectId: project.id,
    clientMessageId: crypto.randomUUID(),
    authorization,
    transportVersion: 1,
  }
  const members = {
    authorizePythonAnalysis: async (value: typeof authorization) => {
      state.policies++
      try {
        return {
          status: 200,
          body: state.mutate(
            await service.execute(
              {
                userId: user.id,
                accountId: user.activeProfile?.accountId ?? user.id,
                name: 'Bia',
                privileged: false,
                readOnly: false,
              },
              value,
            ),
          ),
        }
      } catch {
        return { status: 409, body: { error: { code: 'CONTEXT_CHANGED' } } }
      }
    },
    checkStudioAccess: async () => {
      state.freeAccess++
      return { status: 200, body: { access: { 'estudio-completo': false } } }
    },
    getGamification: async () => {
      state.onGamification()
      return {
        status: 200,
        body: {
          level: { slug: state.levelSlug },
          ...(audience === 'adult'
            ? { journey: { capabilities: state.adultAi ? ['ai'] : [] } }
            : {
                kidsJourney: pensaKidsJourney(state.levelSlug, ['studio', 'pinta', 'ai', 'pensa']),
              }),
        },
      }
    },
    zappyHistory: async () => {
      state.history++
      return { status: 200, body: { messages: [], nextCursor: null } }
    },
    zappyDeleteHistory: async () => {
      state.deletions++
      return { status: 200, body: { ok: true } }
    },
    zappyFeedback: async () => {
      state.feedback++
      return { status: 200, body: { ok: true } }
    },
    zappyReserveQuestion: async () => {
      state.reservations++
      await state.onReservation()
      if (state.reservationStatus !== 200)
        return { status: state.reservationStatus, body: { error: { code: 'RATE_LIMITED' } } }
      return { status: 200, body: { created: true, questionId: crypto.randomUUID() } }
    },
    zappyCompleteQuestion: async (_id: string, value: { response: unknown }) => ({
      status: 200,
      body: value.response,
    }),
    studioAiUsage: async (_actor: unknown, action: { operation: string }) => ({
      status: 200,
      body:
        action.operation === 'reserve'
          ? {
              reservation: {
                allowed: true,
                source: 'platform',
                priceCaps: { prompt: 1, completion: 4, request: 0 },
                expiresAt: new Date(Date.now() + 300000).toISOString(),
              },
            }
          : action.operation === 'dispatch'
            ? { dispatch: { source: 'platform', apiKey: null } }
            : { ok: true },
    }),
    getAiCredits: async () => ({ status: 503, body: null }),
    zappyKnowledgeSearch: async () => {
      state.knowledge++
      throw new Error('JavaScript knowledge must not be used')
    },
  }
  // Only the owned Members/session boundary is stubbed; authorization uses the real domain services.
  const routes = createStudioZappyRoutes({
    audience,
    members,
    session: { getSession: async () => user },
  } as never)
  const request = (body: unknown = input) =>
    routes.studioZappyMessage.POST(
      new Request('https://kids.test/api/studio/zappy/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    )
  const historyRequest = (body: unknown) =>
    routes.studioZappyHistory.POST(
      new Request('https://kids.test/api/studio/zappy', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    )
  return { project, input, request, state, historyRequest, routes }
}
