import { expect } from 'bun:test'
import { createHash, randomUUID } from 'node:crypto'
import { defaultLessonSection } from '@sistemazero/core/learning'
import { verifyStudioPythonExecutionMetadata } from '@sistemazero/core/studio/python-execution-content'
import { StudioPythonInspectionReportSchema } from '@sistemazero/core/studio/python-inspection'
import { createStudioRuntimeCatalog } from '@sistemazero/core/studio/runtime-catalog'
import { PythonActivityInspectionService } from '../../src/application/studio/python-activity-inspection.service'
import { createStudioRuntimeHosts } from '../../src/domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from '../../src/domain/studio/runtime-policy'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'
import { galleryPythonSourceFixture, PNG } from './gallery-python-source'

export const GALLERY_TEST_USER = '22222222-2222-2222-2222-222222222222'
// Real Members handler/services, HTTP gzip reader, snapshots, report verifiers and persistence
// ports. The external compiler transport and the storage object contents are controlled.
export async function pythonGalleryFixture(
  kind: 'classic' | 'pro',
  unavailable = false,
  inspectGate?: (count: number, main: string) => Promise<void>,
) {
  const source = await galleryPythonSourceFixture(kind)
  const catalog = await createStudioRuntimeCatalog(source.configuration.catalog)
  const policy = await createStudioRuntimePolicy(
    source.configuration,
    createStudioRuntimeHosts(catalog, [
      { runtime: source.project.runtime, origin: 'https://runtime.test' },
    ]),
  )
  let inspections = 0
  const inspector = new PythonActivityInspectionService({
    runtimeUrl: 'https://runtime.test',
    runtimeToken: 's'.repeat(32),
    policy,
    async inspect(input) {
      inspections++
      const snapshot = await verifyStudioPythonExecutionMetadata(input.snapshot)
      const main = new TextDecoder().decode(await input.read('main.py', input.signal))
      if (inspectGate) await inspectGate(inspections, main)
      else expect(main).toBe('while False:\n    pass\n')
      const asset = snapshot.files.find((file) => file.kind === 'asset')
      if (!asset) throw new Error('Missing Pinta asset in compilation revision')
      const expected = Buffer.from(PNG.split(',')[1]!, 'base64')
      expect(asset.sha256).toBe(createHash('sha256').update(expected).digest('hex'))
      expect(await input.read(asset.path, input.signal)).toEqual(new Uint8Array(expected))
      return StudioPythonInspectionReportSchema.parse({
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
              usesLoop: file.path === 'main.py' && main.includes('while'),
              usesConditional: false,
              assignedNames: [],
              definedFunctions: [],
              callTargets: [],
            },
          })),
      })
    },
  })
  const env = buildApp({
    pythonActivities: inspector,
    galleryStudioSource: unavailable ? undefined : source.service,
  })
  const course = seedSampleCourse(env.courses, 'curso-demo', 'published', 'kids')
  const lessonId = course.lessonIds[0],
    blockId = randomUUID(),
    revision = 'a'.repeat(32)
  env.courses.blocks = env.courses.blocks.filter((block) => block.lessonId !== lessonId)
  env.courses.blocks.push({
    id: blockId,
    lessonId,
    kind: 'studio',
    contentRevision: revision,
    sortOrder: 0,
    content: {
      kind: 'studio',
      initialProject: source.project,
      gallery: { minItems: 1, maxItems: 1 },
    },
  })
  env.learningRepository.structures.set(lessonId, {
    revision: randomUUID(),
    sections: [
      {
        ...defaultLessonSection(randomUUID(), 'Minha entrega', [blockId]),
        intent: 'delivery',
        completion: { version: 1, blockIds: [blockId] },
      },
    ],
  })
  grantLifetime(env.entitlements, { userId: GALLERY_TEST_USER, courseRef: course.slug })
  const limits = { maxItemBytes: 100_000_000, maxTotalBytes: 100_000_000, maxItemsPerTool: 100 }
  const upload = await env.creations.reserveUpload({
    userId: GALLERY_TEST_USER,
    accountId: GALLERY_TEST_USER,
    tool: 'studio',
    itemId: source.project.id,
    name: source.project.name,
    kind: 'program',
    itemUpdatedAt: new Date(),
    bytes: 100,
    thumb: null,
    parts: source.item.parts.map((part) => ({ hash: part.hash, bytes: 100 })),
    now: new Date(),
    limits,
    formatVersion: 3,
  })
  if (!upload.ok) throw new Error('Creation reservation failed')
  expect(
    (
      await env.creations.commit({
        userId: GALLERY_TEST_USER,
        tool: 'studio',
        itemId: source.project.id,
        revision: upload.revision,
        storageRef: 'original/project.gz',
        uploadedParts: source.item.parts.map((part) => part.hash),
        verifiedPartHashes: source.item.parts.map((part) => part.hash),
        verifiedFormatVersion: 3,
        now: new Date(),
        limits,
      })
    ).ok,
  ).toBe(true)
  const actor = { userId: GALLERY_TEST_USER, accountId: GALLERY_TEST_USER, privileged: false }
  const input = {
    requestId: randomUUID(),
    revision,
    items: [{ itemId: source.project.id, revision: upload.revision }],
  }
  const plan = await env.gallery.prepare(actor, lessonId, blockId, input)
  if (plan.completed) throw new Error('Unexpected prior delivery')
  const reference = source.bindItem(plan.snapshot.items[0]!)
  const submit = (projectForChecks: unknown = reference) =>
    env.app.handle(
      new Request(
        `http://localhost/members/internal/lessons/${lessonId}/blocks/${blockId}/gallery-commit`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-consumer-id': 'member-shell' },
          body: JSON.stringify({
            actor,
            input,
            projectForChecks,
            copyGeneration: plan.copyGeneration,
          }),
        },
      ),
    )
  return {
    ...env,
    source,
    actor,
    input,
    lessonId,
    blockId,
    reference,
    plan,
    submit,
    inspected: () => inspections,
    saved: () => env.studioSubmissions.getOne(GALLERY_TEST_USER, blockId),
  }
}
