import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { verifyStudioPythonExecutionMetadata } from '@sistemazero/core/studio/python-execution-content'
import { StudioPythonInspectionReportSchema } from '@sistemazero/core/studio/python-inspection'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { PythonProjectCheckerService } from '../../src/application/studio/python-project-checker.service'
import { createStudioRuntimeHosts } from '../../src/domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from '../../src/domain/studio/runtime-policy'
import { controlledPythonValidation } from '../fakes/python-execution-evidence'
import { authoringFixture } from '../fakes/studio-authoring-policy'
import { buildApp, seedSampleCourse } from '../helpers'

test('Admin objective rehearsal checks the exact current draft, active staff and authoritative checker without saving learner progress', async () => {
  const f = await authoringFixture('python', 'pro')
  const policy = await createStudioRuntimePolicy(
    f.configuration,
    createStudioRuntimeHosts(f.configuration.catalog, [
      { runtime: f.project.runtime, origin: 'https://runtime.example.test' },
    ]),
  )
  let called = 0
  const checker = new PythonProjectCheckerService({
    policy,
    runtimeUrl: 'https://runtime.example.test',
    runtimeToken: 's'.repeat(32),
    validate: async (options) => {
      called++
      const snapshot = await verifyStudioPythonExecutionMetadata(options.snapshot)
      const inspection = StudioPythonInspectionReportSchema.parse({
        version: 1,
        revision: snapshot.revision,
        runtimeManifestSha256: snapshot.configuration.runtime.manifestSha256,
        pythonVersion: '3.14.2',
        status: 'passed',
        files: snapshot.files
          .filter((file) => file.path.endsWith('.py'))
          .map((file) => ({
            path: file.path,
            sha256: file.sha256,
            status: 'passed',
            diagnostics: [],
            structure: {
              version: 1,
              nodesVisited: 1,
              usesLoop: false,
              usesConditional: false,
              assignedNames: [],
              definedFunctions: [],
              callTargets: [],
            },
          })),
      })
      return controlledPythonValidation(options, inspection)
    },
  })
  const env = buildApp({ studioRuntimePolicy: policy, pythonProjectChecker: checker })
  const course = seedSampleCourse(env.courses)
  const lessonId = course.lessonIds[0]
  const draft = await env.drafts.read(lessonId)
  const body = {
    project: f.project,
    checks: [
      {
        id: 'loop',
        label: 'Use repetição',
        programmingLanguage: 'python',
        profileId: f.project.runtime.profileId,
        rule: { type: 'usesLoop' },
      },
    ],
    context: {
      kind: 'authoring',
      lessonId,
      draftRevision: draft.revision,
      blockId: null,
      purpose: 'authoring',
    },
  }
  const request = (input: unknown = body, headers: Record<string, string> = {}) =>
    env.app.handle(
      new Request('http://localhost/members/admin/python-project-checks/test', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-auth-user-id': '11111111-1111-4111-8111-111111111111',
          'x-auth-user-role': 'staff',
          'x-auth-user-status': 'active',
          ...headers,
        },
        body: JSON.stringify(input),
      }),
    )
  const response = await request()
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  expect(await response.json()).toMatchObject({
    passed: false,
    results: [{ checkId: 'loop', verifiedBy: 'server', kind: 'structure', passed: false }],
  })
  expect(called).toBe(1)
  const large = structuredClone(body)
  if (large.project.programmingLanguage !== 'python' || large.project.kind !== 'pro')
    throw new Error('Missing Pro fixture')
  large.project.tree['main.py'] = {
    kind: 'file',
    content: '# projeto real com mais de 64 KB\n'.repeat(3000),
  }
  expect((await request(large)).status).toBe(200)
  expect(called).toBe(2)
  expect((await request(body, { 'content-length': '4500001' })).status).toBe(413)
  const deniedHeaders: Record<string, string>[] = [
    { 'x-auth-user-role': 'student' },
    { 'x-auth-user-status': 'inactive' },
    { 'x-auth-impersonator-id': randomUUID() },
  ]
  for (const headers of deniedHeaders) expect((await request(body, headers)).status).toBe(403)
  expect(
    (await request({ ...body, clientResults: [{ checkId: 'loop', passed: true }] })).status,
  ).toBe(400)
  env.drafts.drafts.get(lessonId)!.revision = randomUUID()
  expect((await request()).status).toBe(409)
  expect(called).toBe(2)
  expect(studioRuntimeSubject(f.project).programmingLanguage).toBe('python')
})
