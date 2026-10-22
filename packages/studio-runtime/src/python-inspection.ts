import { verifyStudioPythonExecutionMetadata } from '@sistemazero/core/studio/python-execution-content'
import {
  STUDIO_PYTHON_INSPECTION_LIMITS,
  verifyStudioPythonInspectionReport,
  verifyStudioPythonStructureEvidence,
} from '@sistemazero/core/studio/python-inspection'
import {
  studioPythonLogicalFiles,
  studioPythonRuntimeRoute,
  verifyStudioPythonDeployment,
} from '@sistemazero/core/studio/python-runtime-distribution'
import { pythonFrameContentSecurityPolicy } from '@sistemazero/core/studio/python-runtime-policy'
import { verifiedPythonFileStream } from './python-file-stream'

/** Minimal SDK port. A factory must create a new container owned exclusively by this job. */
export interface PythonInspectionSandbox {
  mkdir(path: string, options: { recursive: true }): Promise<unknown>
  writeFile(
    path: string,
    content: string | ReadableStream<Uint8Array>,
    options?: { encoding: 'utf-8' },
  ): Promise<unknown>
  readFile(path: string, options: { encoding: 'utf-8' | 'base64' }): Promise<{ content: string }>
  exec(
    command: string,
    options: { cwd: string; timeout: number },
  ): Promise<{ success: boolean; stdout: string; stderr: string }>
  destroy(): Promise<unknown>
}

export interface PythonProjectPreparationOptions {
  snapshot: unknown
  approvedDeployment: unknown
  signal: AbortSignal
  /** Host/configuration/runtime fences, captured once and checked between every asynchronous step. */
  assertCurrent?(): void
  createSandbox(): PythonInspectionSandbox
  readRuntime(path: string, signal: AbortSignal): Promise<ReadableStream<Uint8Array>>
  readProject(path: string, signal: AbortSignal): Promise<ReadableStream<Uint8Array>>
}

export interface PreparedPythonProject {
  sandbox: PythonInspectionSandbox
  cwd: string
  snapshot: Awaited<ReturnType<typeof verifyStudioPythonExecutionMetadata>>
  deployment: Awaited<ReturnType<typeof verifyStudioPythonDeployment>>
  signal: AbortSignal
  step<T>(pending: Promise<T>): Promise<T>
  check(): void
}

/** One exclusively owned sandbox; trusted phases complete before the single outer cleanup. */
export async function withIsolatedPythonProject<Result>(
  options: PythonProjectPreparationOptions,
  task: (project: PreparedPythonProject) => Promise<Result>,
): Promise<Result> {
  const signal = AbortSignal.any([options.signal, AbortSignal.timeout(120_000)])
  const assertCurrent = options.assertCurrent
  const check = () => {
    signal.throwIfAborted()
    assertCurrent?.()
  }
  check()
  // Both validators capture their inputs synchronously before their first await.
  const [snapshot, deployment] = await Promise.all([
    verifyStudioPythonExecutionMetadata(options.snapshot),
    verifyStudioPythonDeployment(options.approvedDeployment),
  ])
  check()
  const runtime = snapshot.configuration.runtime
  const release = deployment.release
  if (
    runtime.manifestSha256 !== release.manifestSha256 ||
    runtime.profileId !== release.profileId ||
    runtime.releaseId !== release.releaseId ||
    snapshot.configuration.python.dependencyLock.pythonVersion !==
      deployment.distribution.pythonVersion
  )
    throw new Error('O snapshot não corresponde à distribuição aprovada para inspeção.')
  const sources = snapshot.files.filter(
    (file) => file.kind === 'source' && /\.pyi?$/.test(file.path),
  )
  if (
    !sources.length ||
    sources.length > STUDIO_PYTHON_INSPECTION_LIMITS.files ||
    sources.some((file) => file.byteLength > 1024 * 1024)
  )
    throw new Error('Os arquivos excedem o perfil de inspeção Python.')
  const paths = new Set(deployment.distribution.files.map((file) => file.path))
  if (!paths.has('inspect.mjs') || !paths.has('analysis.html'))
    throw new Error('Esta distribuição ainda não oferece inspeção dos bytes Python.')

  const sandbox = options.createSandbox()
  const cwd = `/workspace/python-inspection/${crypto.randomUUID().replaceAll('-', '')}`
  let destruction: Promise<unknown> | undefined
  const destroy = () => (destruction ??= Promise.resolve().then(() => sandbox.destroy()))
  let rejectAbort!: (reason: unknown) => void
  const cancelled = new Promise<never>((_resolve, reject) => {
    rejectAbort = reject
  })
  void cancelled.catch(() => {})
  const step = <T>(pending: Promise<T>) => Promise.race([pending, cancelled])
  const abort = () => {
    rejectAbort(signal.reason)
    void destroy().catch(() => {})
  }
  signal.addEventListener('abort', abort, { once: true })
  try {
    check()
    await step(sandbox.mkdir(`${cwd}/runtime`, { recursive: true }))
    check()
    await step(sandbox.mkdir(`${cwd}/project`, { recursive: true }))
    for (const [kind, files, read] of [
      [
        'runtime',
        studioPythonLogicalFiles(deployment.distribution).map((file) => ({
          path: file.path,
          sha256: file.sha256,
          bytes: file.bytes,
        })),
        options.readRuntime,
      ],
      [
        'project',
        snapshot.files.map((file) => ({
          path: file.path,
          sha256: file.sha256,
          bytes: file.byteLength,
        })),
        options.readProject,
      ],
    ] as const) {
      for (const file of files) {
        check()
        let pendingBody: ReadableStream<Uint8Array> | undefined
        let transfer: ReturnType<typeof verifiedPythonFileStream> | undefined
        try {
          const body = await step(
            read(file.path, signal).then((body) => {
              if (signal.aborted) {
                void body.cancel(signal.reason).catch(() => {})
                throw signal.reason
              }
              pendingBody = body
              return body
            }),
          )
          transfer = verifiedPythonFileStream({
            body,
            bytes: file.bytes,
            sha256: file.sha256,
            signal,
          })
          pendingBody = undefined
          check()
          const slash = file.path.lastIndexOf('/')
          if (slash >= 0)
            await step(
              sandbox.mkdir(`${cwd}/${kind}/${file.path.slice(0, slash)}`, { recursive: true }),
            )
          check()
          await step(
            Promise.all([
              sandbox.writeFile(`${cwd}/${kind}/${file.path}`, transfer.stream),
              transfer.complete,
            ]),
          )
        } catch (error) {
          transfer?.cancel(error)
          if (pendingBody) void pendingBody.cancel(error).catch(() => {})
          throw error
        }
      }
    }
    check()
    const result = await step(task({ sandbox, cwd, snapshot, deployment, signal, step, check }))
    check()
    return result
  } finally {
    let cleanupTimer: ReturnType<typeof setTimeout> | undefined
    try {
      // Cleanup has a small, explicit grace period even after cancellation. A stuck
      // SDK cannot keep the job open indefinitely or turn a late report into proof.
      await Promise.race([
        destroy(),
        new Promise<never>((_resolve, reject) => {
          cleanupTimer = setTimeout(
            () =>
              reject(new Error('Não foi possível confirmar o encerramento da inspeção Python.')),
            5000,
          )
        }),
      ])
      check()
    } finally {
      clearTimeout(cleanupTimer)
      signal.removeEventListener('abort', abort)
    }
  }
}

/** Compilation remains a distinct phase, without importing or executing learner modules. */
export function preparedPythonBrowserOptions(project: PreparedPythonProject) {
  const { deployment, snapshot } = project
  const hash = deployment.release.manifestSha256
  return {
    version: 1,
    runtimeManifestSha256: hash,
    runtimeContentSecurityPolicy: pythonFrameContentSecurityPolicy(
      `https://studio-python-runtime.invalid${studioPythonRuntimeRoute(hash)}`,
    ),
    runtimeFiles: studioPythonLogicalFiles(deployment.distribution),
    runtimeDeployment: { release: deployment.release, distribution: deployment.distribution },
    payload: { version: 1, name: '', snapshot },
  }
}

export async function inspectPreparedPythonProject(
  project: PreparedPythonProject,
  structureRequested: boolean,
) {
  const { sandbox, cwd, snapshot, step, check } = project
  check()
  await step(
    sandbox.writeFile(
      `${cwd}/python-inspection-options.json`,
      JSON.stringify({
        ...preparedPythonBrowserOptions(project),
        structure: structureRequested,
      }),
      { encoding: 'utf-8' },
    ),
  )
  check()
  const executed = await step(
    sandbox.exec('node /opt/sz-runtime/python-inspect.mjs', {
      cwd,
      timeout: 115_000,
    }),
  )
  check()
  if (!executed.success) throw new Error('A inspeção Python isolada não pôde ser concluída.')
  const result = await step(
    sandbox.readFile(`${cwd}/python-inspection-result.json`, {
      encoding: 'utf-8',
    }),
  )
  check()
  if (
    new TextEncoder().encode(result.content).byteLength >
    STUDIO_PYTHON_INSPECTION_LIMITS.reportBytes
  )
    throw new Error('O relatório de inspeção Python excede o limite.')
  const report = await verifyStudioPythonInspectionReport(JSON.parse(result.content), snapshot)
  if (structureRequested && report.status === 'passed')
    await verifyStudioPythonStructureEvidence(report, snapshot)
  check()
  return report
}

/** Explicit compilation or structural inspection owns its complete isolated lifecycle. */
export async function runIsolatedPythonInspection(
  options: PythonProjectPreparationOptions & { structure: boolean },
) {
  if (typeof options.structure !== 'boolean')
    throw new Error('A inspeção exige uma escolha explícita de estrutura.')
  const structure = options.structure
  return withIsolatedPythonProject(options, (project) =>
    inspectPreparedPythonProject(project, structure),
  )
}
