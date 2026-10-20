import { sha256Hex } from '../../packages/core/src/creations'
import { StudioPythonWebPayloadSchema } from '../../packages/core/src/studio/python-execution-content'
import {
  studioPythonDeploymentRoute,
  studioPythonRuntimeRoute,
} from '../../packages/core/src/studio/python-runtime-distribution'
import {
  createStudioRuntimeCatalog,
  type StudioRuntimeRelease,
} from '../../packages/core/src/studio/runtime-catalog'
import { createStudioProjectDocument } from '../../packages/studio/src/core/projectFactory'
import { preparePythonExecutionSnapshot } from '../../packages/studio/src/runtime/python/snapshot'

/** Controlled source fixtures; this does not authorize or expose account projects. */
export async function createPythonInspectionProbe(
  release: StudioRuntimeRelease,
  runtimeOrigin: string,
) {
  const catalog = await createStudioRuntimeCatalog({
    releases: [release],
    profiles: [
      {
        id: release.profileId,
        languages: ['python'],
        kinds: release.manifest.kinds,
        modes: release.manifest.modes,
        levels: [],
        releases: [{ id: release.releaseId, manifestSha256: release.manifestSha256 }],
      },
    ],
  })
  const sources: Readonly<Record<string, string>> = {
    structure:
      '\uFEFFimport absent_student_package\nraise RuntimeError("Do not execute")\nimport turtle as t\ntype Alias[T] = list[T]\ndef jogar[U](valor: U):\n    return [p for p in range(3) if p]\nt.forward(1)\nfactory().method()\n',
    valid:
      'import absent_student_package\nraise RuntimeError("Compilation must not execute this")\n',
    syntax: 'def invalid(:\n    pass\n',
    return: 'return 1\n',
    yield: 'yield 1\n',
    corrupt: 'print("verified original")\n',
    ascii: '# coding: ascii\nprint("ação")\n',
    unknown: '# coding: no_such_encoding\nprint(1)\n',
    bom: '\uFEFF# coding: latin-1\nprint(1)\n',
    identifier: '# coding: latin-1\né = 1\n',
    validbom: '\uFEFFprint("ação")\n',
  }
  async function prepare(scenario: string, source: string) {
    const project = await createStudioProjectDocument(
      {
        id: `inspection-${scenario}`,
        name: 'Inspeção Python',
        programmingLanguage: 'python',
        kind: 'pro',
      },
      {
        catalog,
        runtime: {
          profileId: release.profileId,
          releaseId: release.releaseId,
          manifestSha256: release.manifestSha256,
        },
        releaseStatus: 'active',
      },
    )
    if (project.programmingLanguage !== 'python' || project.kind !== 'pro')
      throw new Error('Python fixture required')
    project.python.entrypoint = 'main.py'
    project.python.dependencyLock.requirementsSha256 = await sha256Hex('')
    project.tree = {
      'main.py': { kind: 'file', content: source },
      'empty.py': { kind: 'file', content: '' },
      'requirements.txt': { kind: 'file', content: '' },
    }
    const snapshot = await preparePythonExecutionSnapshot(project)
    const payload = StudioPythonWebPayloadSchema.parse({
      version: 1,
      name: project.name,
      snapshot: {
        ...snapshot,
        files: snapshot.files.map(({ bytes, ...file }) => ({
          ...file,
          byteLength: bytes.byteLength,
        })),
      },
    })
    return { payload, files: new Map(snapshot.files.map((file) => [file.path, file.bytes])) }
  }
  const cached = new Map<string, ReturnType<typeof prepare>>()
  return async (request: Request) => {
    const url = new URL(request.url)
    const match = /^\/inspection-probe\/([a-z]+)\/(.*)$/.exec(url.pathname)
    const scenario = match?.[1],
      path = match?.[2]
    const source = scenario && sources[scenario]
    if (!scenario || source === undefined || !['GET', 'HEAD'].includes(request.method))
      return new Response('Not found', { status: 404 })
    if (path === '') {
      const runtime = `${runtimeOrigin}${studioPythonRuntimeRoute(release.manifestSha256)}`
      const deployment = `${runtimeOrigin}${studioPythonDeploymentRoute(release.manifestSha256)}`
      return new Response(
        `<!doctype html><html data-python-structure="${scenario === 'structure'}"><head><meta charset="utf-8"><title>Inspeção Python</title><script type="module" src="${runtime}inspect.mjs"></script></head><body></body></html>`,
        {
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-store',
            'content-security-policy': `default-src 'none'; script-src ${runtime}; connect-src 'self' ${runtime} ${deployment}; frame-src ${runtime}; worker-src 'none'; base-uri 'none'; object-src 'none'; form-action 'none'`,
          },
        },
      )
    }
    let pending = cached.get(scenario)
    if (!pending) {
      pending = prepare(scenario, source)
      cached.set(scenario, pending)
    }
    const fixture = await pending
    if (path === 'payload.json') return Response.json(fixture.payload)
    const file = path?.startsWith('project/') && fixture.files.get(path.slice('project/'.length))
    if (!file) return new Response('Not found', { status: 404 })
    return new Response(
      scenario === 'corrupt' && path === 'project/main.py'
        ? new TextEncoder().encode('changed\n')
        : file,
      { headers: { 'content-type': 'application/octet-stream', 'cache-control': 'no-store' } },
    )
  }
}
