import { expect, test } from 'bun:test'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { artifactSchema, runSchema, sessionSchema } from '@sistemazero/agent-core'
import {
  staffOperationSchema,
  studioBuildResponseSchema,
} from '@sistemazero/agent-integrations/sistemazero'
import { z } from 'zod'
import { parseBuildRequest, verifyBuildBinaries } from '../../studio-runtime/src/contracts'
import { Dispatcher } from '../src/execution/dispatcher'
import { setupStaff } from '../src/integrations/staff'
import { Artifacts } from '../src/store/artifacts'
import { Store } from '../src/store/client'
import { Supervisor } from '../src/supervisor'
import { hash } from '../src/tools/paths'

test('Studio snapshot preserves reviewed binary bytes and dependency declarations across the runtime contract', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-studio-'))
  const supervisor = new Supervisor(directory, new Store(join(directory, 'state.sqlite')))
  await supervisor.initialize()
  const dispatcher = new Dispatcher(supervisor)
  setupStaff(supervisor, dispatcher)
  const sources = {
    'index.html': '<main>Fixture</main>',
    'package.json': JSON.stringify({ dependencies: { three: '0.180.0' } }),
    'vite.config.ts': 'untrusted()',
  }
  const material = Buffer.from([0, 255, 128, 1])
  await mkdir(join(directory, 'public'))
  for (const [path, content] of Object.entries(sources))
    await writeFile(join(directory, path), content)
  await writeFile(join(directory, 'public/material.bin'), material)
  const input = {
    templateId: 'vanilla-js',
    parentOrigin: 'https://kids.test',
    files: Object.entries(sources).map(([path, content]) => ({ path, sha256: hash(content) })),
    binaries: [{ path: 'public/material.bin', sha256: hash(material) }],
  }
  const call = (method: string, params: unknown) =>
    supervisor.handle({ id: crypto.randomUUID(), method, params }, AbortSignal.timeout(10000))
  supervisor.executor = async (run, workspace, signal) => {
    const result = await dispatcher.dispatch(
      run,
      workspace,
      'capture',
      'studio_build_prepare',
      input,
      signal,
    )
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') throw new Error(JSON.stringify(result))
    const prepared = z
      .object({ artifact: artifactSchema, validate: z.boolean() })
      .parse(result.value)
    expect(prepared.validate).toBe(true)
    const wire: unknown = JSON.parse(
      (await new Artifacts(directory).read(prepared.artifact)).toString('utf8'),
    )
    const request = staffOperationSchema.parse({ action: 'studio.build', build: wire })
    if (request.action !== 'studio.build') throw new Error('Wrong action')
    expect(request.build.files['package.json']).toBe(sources['package.json'])
    expect(request.build.files['vite.config.ts']).toBeUndefined()
    const runtime = parseBuildRequest(request.build)
    expect(runtime.dependencies.dependencies.three).toBe('0.180.0')
    expect(runtime.files['package.json']).toBeUndefined()
    expect(runtime.parentOrigin).toBe(input.parentOrigin)
    expect(Buffer.from(runtime.binaries!['public/material.bin']!.base64, 'base64')).toEqual(
      material,
    )
    await verifyBuildBinaries(runtime.binaries)
    await writeFile(join(directory, 'public/material.bin'), 'changed')
    expect(
      (await dispatcher.dispatch(run, workspace, 'stale', 'studio_build_prepare', input, signal))
        .kind,
    ).toBe('failed')
    expect(() => parseBuildRequest({ ...request.build, dependencies: {} })).toThrow()
    expect(() =>
      parseBuildRequest({
        ...request.build,
        files: { ...request.build.files, 'Index.html': 'collision' },
      }),
    ).toThrow('colidem')
    expect(() =>
      parseBuildRequest({
        ...request.build,
        files: { ...request.build.files, '../escape.ts': '' },
      }),
    ).toThrow()
  }
  try {
    const session = sessionSchema.parse(await call('session.create', { workspace: directory }))
    const run = runSchema.parse(
      await call('run.start', {
        requestId: 'studio',
        sessionId: session.id,
        input: 'Capture fixture',
        mode: 'plan',
      }),
    )
    await supervisor.waitRun(run.id, AbortSignal.timeout(10000))
    expect(runSchema.parse(await call('run.get', { id: run.id })).state).toBe('succeeded')
  } finally {
    await supervisor.shutdown()
  }
})

test('Studio response accepts expiring compiled artifacts and validation evidence, never legacy HTML or unsafe preview URLs', () => {
  const id = 'a'.repeat(64)
  const response: z.infer<typeof studioBuildResponseSchema> = {
    ok: true,
    artifact: {
      id,
      sha256: id,
      url: `https://build.test/v1/artifacts/${id}/index.html`,
      expiresAt: Date.now() + 60000,
    },
    output: 'Built',
    durationMs: 12,
    evidence: [{ kind: 'types', status: 'passed', detail: 'No diagnostics' }],
    validation: { profileVersion: 1, runtimeFingerprint: 'b'.repeat(64) },
  }
  expect(studioBuildResponseSchema.parse(response)).toEqual(response)
  expect(
    studioBuildResponseSchema.safeParse({
      ...response,
      artifact: { ...response.artifact, url: 'javascript:alert(1)' },
    }).success,
  ).toBe(false)
  expect(
    studioBuildResponseSchema.safeParse({ ok: true, html: '<main/>', output: '', durationMs: 1 })
      .success,
  ).toBe(false)
  expect(
    studioBuildResponseSchema.parse({
      ok: false,
      code: 'PLAYTEST_FAILED',
      message: 'Player failed',
      output: 'diagnostic',
    }),
  ).toMatchObject({ code: 'PLAYTEST_FAILED' })
})
