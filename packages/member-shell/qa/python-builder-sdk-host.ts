import assert from 'node:assert/strict'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import path from 'node:path'
import { canonicalJson } from '@sistemazero/core/creations'
import { initialKidsJourneyPolicy } from '@sistemazero/core/journey'
import { StudioAuthoringCatalogSchema } from '@sistemazero/core/studio/authoring-catalog'
import { applyStudioProChange, studioProDigest } from '@sistemazero/core/studio/pro-revision'
import type { StudioPythonBuilderPreview } from '@sistemazero/core/studio/python-builder-preview'
import { parsePythonLanguageCommand } from '@sistemazero/core/studio/python-language'
import { StudioPythonLanguageOpenSchema } from '@sistemazero/core/studio/python-language-authorization'
import { verifyStudioPythonPreviewManifest } from '@sistemazero/core/studio/python-preview'
import { verifyStudioPythonDeployment } from '@sistemazero/core/studio/python-runtime-distribution'
import { createStudioRuntimeCatalog } from '@sistemazero/core/studio/runtime-catalog'
import { pythonCourseBlockClosure } from '@sistemazero/studio/python-course-unlocks'
import { KidsJourneyQueryService } from '../../members/src/application/kids-journey/kids-journey-query.service'
import { AuthorizeFreeRuntimeService } from '../../members/src/application/studio/authorize-free-runtime.service'
import { FreeStudioAccessService } from '../../members/src/application/studio/free-studio-access.service'
import { StudioPythonBuilderPolicy } from '../../members/src/application/studio-pro/python-builder-policy'
import { StudioBuilderService } from '../../members/src/application/studio-pro/studio-builder.service'
import type { KidsJourneySnapshot } from '../../members/src/domain/ports/kids-journey-repository.port'
import { createStudioAuthoringPolicy } from '../../members/src/domain/studio/authoring-policy'
import { createStudioRuntimeHosts } from '../../members/src/domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from '../../members/src/domain/studio/runtime-policy'
import { createDbConnection } from '../../members/src/infrastructure/persistence/drizzle/db'
import { DrizzleStudioBuilderRepository } from '../../members/src/infrastructure/persistence/drizzle/studio-builder.repository'
import { createStudioProjectDocument } from '../../studio/src/core/projectFactory'
import { capturePythonProRevisionPayload } from '../../studio/src/state/pythonProRevision'
import { PythonLanguageSession } from '../../studio-language-service/runtime/pyright'
import { refreshStudioBuilderPreview } from '../src/server/studio-builder'
import { runStudioPythonBuilderValidation } from '../src/server/studio-python-builder'

/** Explicit local SDK proof. The session reservation gateway is controlled; Pyright itself is real. */
export async function runStudioPythonBuilderSdkProof(input: {
  origin: string
  internalToken: string
  proofToken: string
  deployment: unknown
  databaseUrl: string
  files: { path: string; bytes: number[] }[]
  evidence: string
  signal: AbortSignal
}) {
  const databaseTarget = new URL(input.databaseUrl),
    origin = new URL(input.origin)
  if (
    databaseTarget.hostname !== '127.0.0.1' ||
    databaseTarget.port !== '5434' ||
    !/^\/sz_gallery_qa_\d+$/.test(databaseTarget.pathname) ||
    origin.hostname !== '127.0.0.1' ||
    origin.protocol !== 'http:' ||
    origin.origin !== input.origin
  )
    throw new Error('The SDK builder proof requires owned local services and database')
  const deployment = await verifyStudioPythonDeployment(input.deployment),
    release = deployment.release,
    runtime = {
      profileId: release.profileId,
      releaseId: release.releaseId,
      manifestSha256: release.manifestSha256,
    },
    catalog = await createStudioRuntimeCatalog({
      releases: [release],
      profiles: [
        {
          id: release.profileId,
          languages: ['python'],
          kinds: ['classic', 'pro'],
          modes: ['blocks', 'bridge', 'code'],
          levels: ['avancado'],
          releases: [{ id: release.releaseId, manifestSha256: release.manifestSha256 }],
        },
      ],
    }),
    project = await createStudioProjectDocument(
      { id: randomUUID(), name: 'Proposta SDK Python', programmingLanguage: 'python', kind: 'pro' },
      { catalog, runtime, releaseStatus: 'active' },
    )
  if (project.programmingLanguage !== 'python' || project.kind !== 'pro')
    throw new Error('Python Pro expected')
  project.assets = []
  project.tree.rascunhos = { kind: 'dir' }
  for (const file of input.files) {
    const bytes = new Uint8Array(file.bytes)
    if (file.path.endsWith('.py'))
      project.tree[file.path] = {
        kind: 'file',
        content: new TextDecoder('utf-8', { fatal: true }).decode(bytes),
      }
    else if (file.path === 'hero.png')
      project.assets.push({
        id: 'sdk-hero',
        name: 'hero',
        kind: 'image',
        source: 'upload',
        proPath: 'hero.png',
        dataUrl: `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`,
      })
  }
  project.installedExtensions = release.manifest.extensions.map((extension) => {
    const version = extension.versions[0]
    if (!version) throw new Error('Extension version missing')
    return { id: extension.id, version, installedAt: 1 }
  })
  const payload = await capturePythonProRevisionPayload(project),
    configuration = StudioAuthoringCatalogSchema.parse({
      version: 1,
      catalog,
      releases: [
        {
          runtime,
          status: 'active',
          proTemplateIds: ['python-blank'],
          blockIds: ['sz_py_pass', ...pythonCourseBlockClosure(['sz_py_turtle_module_forward'])],
          categoryIds: ['python-basics'],
        },
      ],
    }),
    authoring = await createStudioAuthoringPolicy(configuration),
    runtimePolicy = await createStudioRuntimePolicy(
      configuration,
      createStudioRuntimeHosts(catalog, [{ runtime, origin: input.origin }]),
    ),
    actor = { accountId: randomUUID(), userId: randomUUID(), privileged: false },
    connection = createDbConnection(input.databaseUrl, { max: 4 }),
    languageToken = randomBytes(32).toString('hex'),
    sessions = new Map<
      string,
      { owner: string; binding: string; session: PythonLanguageSession }
    >(),
    languageRequests: string[] = []
  let owned = true,
    policies = 0
  const access = new FreeStudioAccessService(
      {
        execute: async () => ({
          grants: owned ? ['estudio-completo'] : [],
          communities: [],
          hasMaster: false,
          hasMasterKids: false,
        }),
      },
      {
        execute: async () => ({ blocks: [...configuration.releases[0]!.blockIds] }),
      },
      new KidsJourneyQueryService({
        async readSnapshot(owners): Promise<KidsJourneySnapshot> {
          return {
            policy: {
              phase: 'published',
              version: 1,
              policy: initialKidsJourneyPolicy(),
              updatedAt: new Date(0),
            },
            catalog: [],
            profiles: new Map(
              owners
                .filter(
                  (owner) => owner.userId === actor.userId && owner.accountId === actor.accountId,
                )
                .map((owner) => [
                  owner.userId,
                  {
                    ...owner,
                    registered: true,
                    milestones: [],
                    earned: {
                      level: 'god',
                      capabilities: [],
                      courseAccess: { entry: [], expanded: [], reward: [] },
                    },
                  },
                ]),
            ),
          }
        },
      }),
    ),
    permission = new StudioPythonBuilderPolicy(
      new AuthorizeFreeRuntimeService(access, runtimePolicy, authoring),
      true,
    ),
    service = new StudioBuilderService(
      new DrizzleStudioBuilderRepository(connection.db, input.origin),
      () => new Date(),
      true,
      false,
      async (...args) => {
        policies++
        await permission.execute(...args)
      },
    )
  const language = createServer(async (request, response) => {
    const json = (status: number, body: unknown) => {
      response.writeHead(status, {
        'content-type': 'application/json',
        'cache-control': 'no-store',
      })
      response.end(JSON.stringify(body))
    }
    try {
      if (request.headers.authorization !== `Bearer ${languageToken}`) {
        request.resume()
        json(401, {})
        return
      }
      const route = /^\/v1\/python-language\/([a-f0-9]{64})\/(open|[a-f0-9]{32})(\/start)?$/.exec(
        request.url ?? '',
      )
      if (!route) {
        request.resume()
        json(404, {})
        return
      }
      const [, owner, id, start] = route
      if (!owner || !id) throw new Error('Invalid session route')
      languageRequests.push(
        `${request.method} ${id === 'open' ? 'open' : start ? 'start' : 'session'}`,
      )
      const chunks: Buffer[] = []
      let length = 0
      for await (const chunk of request) {
        const bytes = Buffer.from(chunk)
        length += bytes.length
        if (length > 9 * 1024 * 1024) throw new Error('Language body quota')
        chunks.push(bytes)
      }
      const text = Buffer.concat(chunks).toString('utf8')
      if (id === 'open' && request.method === 'POST') {
        const opened = StudioPythonLanguageOpenSchema.parse(JSON.parse(text)),
          sessionId = randomBytes(16).toString('hex'),
          root = path.join(input.evidence, 'builder-language', sessionId)
        await mkdir(root, { recursive: true })
        const session = new PythonLanguageSession({
          providedModules: [],
          root,
          nodePath: process.execPath,
          serverPath: createRequire(path.join(process.cwd(), 'package.json')).resolve(
            'pyright/dist/pyright-langserver.js',
          ),
        })
        sessions.set(sessionId, { owner, binding: opened.binding, session })
        json(200, { version: 1, sessionId, projectId: opened.projectId })
        return
      }
      const current = sessions.get(id)
      if (!current || current.owner !== owner) {
        json(404, {})
        return
      }
      if (request.method === 'DELETE') {
        current.session.dispose()
        sessions.delete(id)
        json(200, { closed: true })
        return
      }
      if (start) {
        json(200, { ready: true })
        return
      }
      if (request.headers['x-studio-python-binding'] !== current.binding) {
        json(403, {})
        return
      }
      const command = parsePythonLanguageCommand(JSON.parse(text))
      if (command.kind !== request.headers['x-studio-python-operation']) {
        json(400, {})
        return
      }
      json(
        200,
        await current.session.handle(
          command,
          AbortSignal.any([input.signal, AbortSignal.timeout(15000)]),
        ),
      )
    } catch (error) {
      json(400, { error: error instanceof Error ? error.message : 'Language request failed' })
    }
  })
  await new Promise<void>((resolve, reject) => {
    language.once('error', reject)
    language.listen(0, '127.0.0.1', resolve)
  })
  const address = language.address()
  if (!address || typeof address === 'string') throw new Error('Language listener missing')
  const id = randomUUID(),
    projectId = project.id
  try {
    await service.execute(
      actor,
      {
        operation: 'create',
        id,
        objective: 'Mostrar uma mensagem',
        model: 'qa/deterministic',
        parentOrigin: 'https://kids.test',
        ...payload,
      },
      input.signal,
    )
    const generating = await service.execute(
      actor,
      { operation: 'claim', id, projectId },
      input.signal,
    )
    if (!generating?.token) throw new Error('Generation lease missing')
    const source = payload.base.files['main.py']
    if (source === undefined) throw new Error('Entrypoint missing')
    const change = {
        baseHash: payload.base.hash,
        summary: 'Mensagem da proposta',
        patches: [
          {
            path: 'main.py',
            before: await studioProDigest(source),
            content: `print("builder-proposed-ação")\n${source}`,
          },
        ],
      },
      revision = (await applyStudioProChange(payload.base, change)).revision
    await service.execute(
      actor,
      {
        operation: 'checkpoint',
        id,
        projectId,
        token: generating.token,
        version: generating.job.version,
        phase: 'validating',
        result: { change, revisionHash: revision.hash, plan: ['Adicionar mensagem'], evidence: [] },
        error: null,
        cost: null,
        notes: [],
      },
      input.signal,
    )
    const validating = await service.execute(
      actor,
      { operation: 'claim', id, projectId },
      input.signal,
    )
    if (!validating?.token || !validating.job.result) throw new Error('Validation lease missing')
    const result = await runStudioPythonBuilderValidation({
      actor,
      job: validating.job,
      token: validating.token,
      revision,
      binaries: payload.binaries,
      parentOrigin: 'https://kids.test',
      signal: input.signal,
      runtime: {
        runtimeUrl: input.origin,
        runtimeToken: input.internalToken,
        languageUrl: `http://127.0.0.1:${address.port}`,
        languageToken,
        allowLocalHttp: true,
      },
      members: {
        async studioBuilder(owner, command, signal) {
          return { status: 200, body: { state: await service.execute(owner, command, signal) } }
        },
      },
      async accept(outcome) {
        if (!validating.job.result || !validating.token) throw new Error('Candidate missing')
        return (
          (
            await service.execute(
              actor,
              {
                operation: 'checkpoint',
                id,
                projectId,
                token: validating.token,
                version: validating.job.version,
                phase: 'review',
                result: {
                  ...validating.job.result,
                  preview: outcome.preview,
                  evidence: outcome.evidence,
                },
                error: null,
                cost: null,
                notes: [],
              },
              input.signal,
            )
          )?.job ?? null
        )
      },
    })
    assert.equal(result.status, 'checkpointed', canonicalJson(result))
    if (result.status !== 'checkpointed' || !result.job) throw new Error('Review not persisted')
    const preview = result.job.result?.preview
    assert.equal(preview?.kind, 'python')
    if (preview?.kind !== 'python') throw new Error('Python preview missing')
    assert.equal(preview.validation.types.status, 'passed')
    assert.equal(preview.validation.report.status, 'passed')
    assert.equal(preview.revisionHash, revision.hash)
    assert.notEqual(preview.reference.revision, revision.hash)
    assert.equal(sessions.size, 0)
    async function archivePreview(candidate: StudioPythonBuilderPreview, name: string) {
      const privateHeaders = { Authorization: `Bearer ${input.proofToken}` },
        manifestResponse = await fetch(
          `${input.origin}/__proof/preview/${candidate.reference.id}`,
          {
            headers: privateHeaders,
            signal: input.signal,
          },
        )
      assert.equal(manifestResponse.status, 200)
      const manifestBytes = new Uint8Array(await manifestResponse.arrayBuffer())
      assert.equal(
        createHash('sha256').update(manifestBytes).digest('hex'),
        candidate.reference.sha256,
      )
      const manifest = await verifyStudioPythonPreviewManifest(
          JSON.parse(new TextDecoder().decode(manifestBytes)),
          candidate.validation.snapshot,
          candidate.validation.report,
        ),
        stateResponse = await fetch(
          `${input.origin}/__proof/builder/inspection/${manifest.jobId}`,
          {
            headers: privateHeaders,
            signal: input.signal,
          },
        )
      assert.equal(stateResponse.status, 200)
      const sdk: {
        created: number
        execStarted: number
        execFinished: number
        destroyStarted: number
        destroyFinished: number
        job: { status: string; cleanupConfirmed: boolean }
      } = await stateResponse.json()
      assert.deepEqual(
        [sdk.created, sdk.execStarted, sdk.execFinished, sdk.destroyStarted, sdk.destroyFinished],
        [1, 2, 2, 1, 1],
      )
      assert.equal(sdk.job.status, 'succeeded')
      assert.equal(sdk.job.cleanupConfirmed, true)
      const archive = path.join(input.evidence, name)
      await mkdir(archive, { recursive: true })
      await writeFile(path.join(archive, 'manifest.json'), manifestBytes)
      for (const file of manifest.files) {
        const response: Response = await fetch(new URL(file.path, candidate.reference.url), {
          signal: input.signal,
        })
        assert.equal(response.status, 200)
        const bytes = new Uint8Array(await response.arrayBuffer())
        assert.equal(bytes.byteLength, file.bytes)
        assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256)
        const destination = path.join(archive, 'files', file.path)
        await mkdir(path.dirname(destination), { recursive: true })
        await writeFile(destination, bytes)
      }
      return {
        created: sdk.created,
        execStarted: sdk.execStarted,
        execFinished: sdk.execFinished,
        destroyStarted: sdk.destroyStarted,
        destroyFinished: sdk.destroyFinished,
        status: sdk.job.status,
        cleanupConfirmed: sdk.job.cleanupConfirmed,
      }
    }
    const sdk = await archivePreview(preview, 'builder-preview')
    const command = {
        operation: 'authorize-proposal' as const,
        id,
        projectId,
        version: result.job.version,
        revisionHash: revision.hash,
        purpose: 'preview' as const,
        preview: { id: preview.reference.id, sha256: preview.reference.sha256 },
      },
      authorization = await service.execute(actor, command, input.signal)
    assert.equal(authorization?.authorization?.executionRevision, preview.reference.revision)
    const response = await fetch(preview.reference.url, { signal: input.signal })
    assert.equal(response.status, 200)
    assert.ok((await response.text()).includes('studio-python-preview-parent'))
    const refreshed = await refreshStudioBuilderPreview({
      actor,
      id,
      projectId,
      parentOrigin: 'https://kids.test',
      signal: input.signal,
      pythonRuntime: {
        runtimeUrl: input.origin,
        runtimeToken: input.internalToken,
        languageUrl: `http://127.0.0.1:${address.port}`,
        languageToken,
        allowLocalHttp: true,
      },
      members: {
        async studioBuilder(owner, request, signal) {
          return { status: 200, body: { state: await service.execute(owner, request, signal) } }
        },
      },
    })
    if (refreshed?.result?.preview?.kind !== 'python')
      throw new Error('Refreshed Python review missing')
    assert.equal(refreshed.phase, 'review')
    assert.equal(refreshed.modelCalls, result.job.modelCalls)
    assert.equal(refreshed.result.revisionHash, revision.hash)
    assert.equal(refreshed.result.preview.reference.revision, preview.reference.revision)
    assert.notEqual(refreshed.result.preview.reference.id, preview.reference.id)
    assert.equal(refreshed.assistance?.previewRefreshes, 1)
    assert.equal(sessions.size, 0)
    const refreshedSdk = await archivePreview(refreshed.result.preview, 'builder-refreshed-preview')
    // A stale UI must re-read the persisted successor; its old capability is not reusable.
    await assert.rejects(service.execute(actor, command, input.signal))
    const currentCommand = {
      ...command,
      version: refreshed.version,
      preview: {
        id: refreshed.result.preview.reference.id,
        sha256: refreshed.result.preview.reference.sha256,
      },
    }
    assert.equal(
      (await service.execute(actor, currentCommand, input.signal))?.authorization
        ?.executionRevision,
      preview.reference.revision,
    )
    const application = await service.execute(
      actor,
      {
        operation: 'authorize-proposal',
        id,
        projectId,
        version: refreshed.version,
        revisionHash: revision.hash,
        purpose: 'apply',
      },
      input.signal,
    )
    assert.equal(application?.authorization?.revisionHash, revision.hash)
    const recovered = await service.execute(
      actor,
      { operation: 'get', id, projectId },
      input.signal,
    )
    assert.equal(recovered?.job.version, refreshed.version)
    assert.deepEqual(recovered?.job.result, refreshed.result)
    owned = false
    await assert.rejects(service.execute(actor, currentCommand, input.signal), /acesso/)
    await writeFile(
      path.join(input.evidence, 'builder-result.json'),
      JSON.stringify(
        {
          verified: true,
          projectId,
          jobId: id,
          policies,
          languageRequests,
          revision: revision.hash,
          preview,
          sdk,
          renewal: {
            preview: refreshed.result.preview,
            sdk: refreshedSdk,
            modelCalls: refreshed.modelCalls,
            previewRefreshes: refreshed.assistance?.previewRefreshes,
            version: refreshed.version,
            applicationAuthorized: application?.authorization?.revisionHash === revision.hash,
            recovered: recovered?.job.version === refreshed.version,
          },
          evidence: result.job.result?.evidence,
          limits: {
            model: 'deterministic fixture; no provider dispatch or credits',
            languageGateway: 'local controlled reservation; real Pyright',
            accessFacts: 'controlled; real policy',
            compiler: 'real workerd/R2/DO/SDK/CPython/playtest',
            playtest:
              'production default recipe; observation/capture may stop at waiting-input, no scripted stdin/keys/clicks',
            database: 'real disposable PostgreSQL',
            application:
              'fresh authorization and SQL recovery; browser apply/IndexedDB not exercised here',
          },
        },
        null,
        2,
      ),
    )
    console.info(
      JSON.stringify({ phase: 'builder-sdk', verified: true, projectId, revision: revision.hash }),
    )
  } finally {
    for (const current of sessions.values()) current.session.dispose()
    sessions.clear()
    language.closeAllConnections()
    try {
      await new Promise<void>((resolve, reject) =>
        language.close((error) => (error ? reject(error) : resolve())),
      )
    } finally {
      try {
        await connection.sql`delete from members.studio_builder_jobs where account_id = ${actor.accountId}`
        await connection.sql`delete from members.studio_ai_accounts where account_id = ${actor.accountId}`
      } finally {
        await connection.close()
      }
    }
  }
}
