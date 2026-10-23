import { getSandbox, Sandbox } from '@cloudflare/sandbox'
import {
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBodyWithLimit,
} from '@sistemazero/core/http'
import {
  executionObservationUnavailableReason,
  type ProjectCheckResponse,
} from '@sistemazero/core/learning'
import {
  buildProRuntimeBridgeScript,
  isStudioProBuilderEvidence,
  isStudioProValidationIdentity,
  isStudioPublicationHash,
  isStudioPublicationId,
  STUDIO_PRO_ARTIFACT_LIMITS,
  STUDIO_PRO_PUBLICATION_LIMITS,
  STUDIO_PRO_REMOTE_CAPABILITIES,
  type StudioProBuilderEvidence,
} from '@sistemazero/core/studio'
import { studioPythonInspectionJobId } from '@sistemazero/core/studio/python-inspection-job'
import { STUDIO_PYTHON_VALIDATION_LIMITS } from '@sistemazero/core/studio/python-validation'
import {
  StudioPythonInspectionRequestSchema,
  StudioPythonValidationRequestSchema,
} from '@sistemazero/core/studio/python-validation-input'
import validationProfile from '../runtime/validation-profile.json' with { type: 'json' }
import { serveArtifact, storeArtifact, unavailableArtifact } from './artifacts'
import {
  CHECK_ENTRY_PATH,
  CHECK_LIMITS,
  isKitTemplate,
  judgeCheck,
  parseCheckRequest,
  proCheckEntry,
  proCheckModules,
  withCheckEntry,
} from './check'
import {
  InvalidBuildRequestError,
  PRO_BUILD_LIMITS,
  type ProBuildFailure,
  type ProBuildResponse,
  parseBuildRequest,
  trustedPackageJson,
  trustedViteConfig,
  verifyBuildBinaries,
} from './contracts'
import { prepareRuntimeDependencyLock } from './dependency-lock'
import {
  collectPublicationGarbage,
  createPublicationAuthorizer,
  currentPublishedPublication,
  currentPublishedSource,
  type PublicationBucket,
  PublicationError,
  publicationCommand,
  purgePublication,
  retirePublicationReservation,
  servePublishedArtifact,
} from './publications'
import { createPythonRuntimeConfigurationLoader } from './python-configuration-storage'
import type { PythonDistributionServer } from './python-distributions'
import type { PythonInputGcBucket } from './python-input-gc'
import { collectStoredPythonInputGarbage } from './python-input-maintenance'
import { type PythonInputBucket, PythonInputError } from './python-inputs'
import type { PythonInspectionJobResponse } from './python-inspection-job'
import { collectStoredPythonPreviewGarbage } from './python-preview-maintenance'
import { servePythonPreview } from './python-previews'
import { createPythonR2InputStorage } from './python-r2-inputs'
import {
  handlePythonInputRemoval,
  handlePythonRequest,
  isPythonInternalPath,
} from './python-requests'

export class ProBuildSandbox extends Sandbox {
  enableInternet = false
}

interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>
}

/** Only authenticated admission/retirement operations are available to ingress. */
export interface PythonInspectionJobNamespace {
  getByName(name: string): {
    inspect(raw: unknown): Promise<PythonInspectionJobResponse>
    validate(raw: unknown): Promise<PythonInspectionJobResponse>
    previewAvailable(raw: unknown): Promise<boolean>
    discardPreview(raw: unknown): Promise<{ retired: boolean; cleanupConfirmed: boolean }>
    cancel(raw: unknown): Promise<{ retired: boolean; cleanupConfirmed: boolean }>
  }
}

export interface Env {
  ProBuildSandbox: DurableObjectNamespace<ProBuildSandbox>
  BUILD_RATE_LIMITER: RateLimitBinding
  INTERNAL_TOKEN: string
  PRO_ARTIFACTS: PublicationBucket
  PUBLICATION_AUTHORIZATION_URL?: string
  PUBLICATION_AUTHORIZATION_ADULT_URL?: string
  PUBLICATION_CLEANUP_URL?: string
  PUBLICATION_CLEANUP_ADULT_URL?: string
  /** Pinned immutable R2 catalog. Missing leaves Python unavailable and preserves JavaScript. */
  STUDIO_PYTHON_DISTRIBUTIONS_SHA256?: string
  /** Private temporary input bucket; absence keeps new S2S Python operations unavailable. */
  PYTHON_INPUTS?: PythonInputBucket & Pick<PythonInputGcBucket, 'list'>
  PYTHON_UPLOAD_RATE_LIMITER?: RateLimitBinding
  /** Separate coordinator; its persistent cancellation/alarm never overrides Sandbox lifecycle. */
  PythonInspectionJobs?: PythonInspectionJobNamespace
  /** Trusted fixed launcher is served from an origin distinct from every embedding application. */
  STUDIO_PYTHON_PREVIEW_ORIGIN?: string
  PYTHON_PREVIEWS?: PythonInputBucket & Pick<PythonInputGcBucket, 'list'>
}

const BUILD_ROOT = '/workspace/builds'
const BUILD_TIMEOUT_MS = 45_000

export function createStudioRuntimeHandler(
  sandboxFactory: typeof getSandbox = getSandbox,
  pythonDistributions?: PythonDistributionServer,
): ExportedHandler<Env> {
  const pythonRegistry = createPythonRuntimeConfigurationLoader()
  let authorization:
    | { endpointsKey: string; token: string; check: (playId: string) => Promise<boolean> }
    | undefined
  return {
    async scheduled(_event, env, ctx) {
      if (env.PYTHON_PREVIEWS)
        ctx.waitUntil(
          collectStoredPythonPreviewGarbage(env.PYTHON_PREVIEWS).then((result) => {
            console.info('[studio-python] preview collection', result)
          }),
        )
      if (env.PYTHON_INPUTS)
        ctx.waitUntil(
          collectStoredPythonInputGarbage(env.PYTHON_INPUTS).then((result) => {
            console.info('[studio-python] input collection', result)
          }),
        )
      for (const cleanupURL of [env.PUBLICATION_CLEANUP_URL, env.PUBLICATION_CLEANUP_ADULT_URL]) {
        if (!cleanupURL || !env.INTERNAL_TOKEN) continue
        ctx.waitUntil(
          fetch(cleanupURL, {
            method: 'POST',
            // Never follow a redirect carrying the service credential; Workers supports manual.
            redirect: 'manual',
            headers: { Authorization: `Bearer ${env.INTERNAL_TOKEN}` },
            signal: AbortSignal.timeout(60_000),
          }).then(async (response) => {
            await response.body?.cancel()
            if (!response.ok)
              throw new Error(`Publication cleanup pending (${response.status}): ${cleanupURL}`)
          }),
        )
      }
      ctx.waitUntil(
        collectPublicationGarbage(env.PRO_ARTIFACTS).then((result) => {
          console.info('[studio-publication] collection', result)
        }),
      )
    },
    async fetch(request: Request, env: Env): Promise<Response> {
      const url = new URL(request.url)
      if (url.pathname.startsWith('/v1/python-previews/')) {
        const configuration = env.STUDIO_PYTHON_DISTRIBUTIONS_SHA256
        const bucket = env.PYTHON_PREVIEWS
        const origin = env.STUDIO_PYTHON_PREVIEW_ORIGIN
        const runtimeBucket = env.PRO_ARTIFACTS
        const jobs = env.PythonInspectionJobs
        if (!configuration || !bucket || !origin || !jobs || url.origin !== origin)
          return unavailableArtifact()
        const assertCurrent = () => {
          request.signal.throwIfAborted()
          if (
            env.STUDIO_PYTHON_DISTRIBUTIONS_SHA256 !== configuration ||
            env.PYTHON_PREVIEWS !== bucket ||
            env.STUDIO_PYTHON_PREVIEW_ORIGIN !== origin ||
            env.PRO_ARTIFACTS !== runtimeBucket ||
            env.PythonInspectionJobs !== jobs
          )
            throw new Error('A configuração do preview Python mudou.')
        }
        try {
          const registry = await pythonRegistry(runtimeBucket, configuration, {
            signal: request.signal,
            assertCurrent,
          })
          assertCurrent()
          return await servePythonPreview(request, {
            bucket,
            runtimeBucket,
            registry,
            serviceOrigin: origin,
            assertCurrent,
            async authorize(manifest) {
              assertCurrent()
              const stub = jobs.getByName(manifest.jobId)
              const allowed = await stub.previewAvailable({
                jobId: manifest.jobId,
                projectId: manifest.projectId,
                revision: manifest.revision,
                parentOrigin: manifest.parentOrigin,
                expiresAt: manifest.expiresAt,
              })
              assertCurrent()
              return allowed
            },
          })
        } catch {
          return unavailableArtifact()
        }
      }
      if (
        url.pathname.startsWith('/v1/runtimes/') ||
        url.pathname.startsWith('/v1/runtime-deployments/')
      ) {
        if (pythonDistributions) return pythonDistributions(request, env.PRO_ARTIFACTS)
        const configuration = env.STUDIO_PYTHON_DISTRIBUTIONS_SHA256
        const runtimeBucket = env.PRO_ARTIFACTS
        if (!configuration) return unavailableArtifact()
        const assertCurrent = () => {
          request.signal.throwIfAborted()
          if (
            env.STUDIO_PYTHON_DISTRIBUTIONS_SHA256 !== configuration ||
            env.PRO_ARTIFACTS !== runtimeBucket
          )
            throw new Error('A configuração da distribuição Python mudou.')
        }
        try {
          const { serve: server } = await pythonRegistry(runtimeBucket, configuration, {
            signal: request.signal,
            assertCurrent,
          })
          assertCurrent()
          const response = await server(request, runtimeBucket)
          try {
            assertCurrent()
          } catch {
            await response.body?.cancel()
            return unavailableArtifact()
          }
          return response
        } catch {
          return unavailableArtifact()
        }
      }
      if (isPythonInternalPath(url.pathname)) {
        // Authentication precedes reading either JSON metadata or learner binary streams.
        if (!isAuthorized(request, env.INTERNAL_TOKEN))
          return json({ ok: false, code: 'INVALID_REQUEST', message: 'Não autorizado.' }, 401)
        const configuration = env.STUDIO_PYTHON_DISTRIBUTIONS_SHA256
        const bucket = env.PYTHON_INPUTS
        const uploadLimiter = env.PYTHON_UPLOAD_RATE_LIMITER
        const jobs = env.PythonInspectionJobs
        if (
          ['/v1/python/inputs/remove', '/v1/python/previews/remove'].includes(url.pathname) &&
          uploadLimiter &&
          jobs
        ) {
          const previewOnly = url.pathname === '/v1/python/previews/remove'
          const token = env.INTERNAL_TOKEN
          const assertCurrent = () => {
            if (
              env.INTERNAL_TOKEN !== token ||
              env.PYTHON_INPUTS !== bucket ||
              env.PYTHON_UPLOAD_RATE_LIMITER !== uploadLimiter ||
              env.PythonInspectionJobs !== jobs
            )
              throw new PythonInputError(409, 'O proprietário da limpeza Python mudou.')
          }
          return handlePythonInputRemoval(request, {
            ...(previewOnly ? { kind: 'preview' as const } : {}),
            bucket: bucket ? createPythonR2InputStorage(bucket) : undefined,
            assertCurrent,
            async limit(owner) {
              return (await uploadLimiter.limit({ key: `python-transfer-${owner}` })).success
            },
            async cancel(reference) {
              const jobId = await studioPythonInspectionJobId(reference)
              assertCurrent()
              const stub = jobs.getByName(jobId)
              if (!previewOnly) return stub.cancel(reference)
              return stub.discardPreview(reference)
            },
          })
        }
        if (!configuration || !bucket || !uploadLimiter || !jobs)
          return Response.json(
            { ok: false, code: 'PYTHON_UNAVAILABLE' },
            { status: 503, headers: { 'Cache-Control': 'no-store' } },
          )
        const token = env.INTERNAL_TOKEN
        const runtimeBucket = env.PRO_ARTIFACTS
        const jobLimiter = env.BUILD_RATE_LIMITER
        const namespace = env.ProBuildSandbox
        const previewBucket = env.PYTHON_PREVIEWS
        const previewOrigin = env.STUDIO_PYTHON_PREVIEW_ORIGIN
        const assertCurrent = () => {
          request.signal.throwIfAborted()
          if (
            env.STUDIO_PYTHON_DISTRIBUTIONS_SHA256 !== configuration ||
            env.INTERNAL_TOKEN !== token ||
            env.PYTHON_INPUTS !== bucket ||
            env.PRO_ARTIFACTS !== runtimeBucket ||
            env.PYTHON_UPLOAD_RATE_LIMITER !== uploadLimiter ||
            env.BUILD_RATE_LIMITER !== jobLimiter ||
            env.ProBuildSandbox !== namespace ||
            env.PythonInspectionJobs !== jobs ||
            env.PYTHON_PREVIEWS !== previewBucket ||
            env.STUDIO_PYTHON_PREVIEW_ORIGIN !== previewOrigin
          )
            throw new PythonInputError(409, 'A configuração Python mudou. Tente novamente.')
        }
        try {
          const registry = await pythonRegistry(runtimeBucket, configuration, {
            signal: request.signal,
            assertCurrent,
          })
          assertCurrent()
          const invokeJob = async (raw: unknown, mode: 'inspect' | 'validate') => {
            const input =
              mode === 'validate'
                ? StudioPythonValidationRequestSchema.parse(raw).input
                : StudioPythonInspectionRequestSchema.parse(raw).input
            const jobId = await studioPythonInspectionJobId(input)
            assertCurrent()
            const stub = jobs.getByName(jobId)
            const result = mode === 'validate' ? await stub.validate(raw) : await stub.inspect(raw)
            assertCurrent()
            const maximum =
              mode === 'validate' ? STUDIO_PYTHON_VALIDATION_LIMITS.responseBytes : 2 * 1024 * 1024
            if (new TextEncoder().encode(result.bodyJson).byteLength > maximum)
              throw new Error('O relatório do job Python excede o limite.')
            const body: unknown = JSON.parse(result.bodyJson)
            return { status: result.status, body }
          }
          return await handlePythonRequest(request, {
            bucket: createPythonR2InputStorage(bucket),
            runtimeBucket,
            registry,
            assertCurrent,
            ...(previewBucket && previewOrigin
              ? {
                  preview: {
                    bucket: createPythonR2InputStorage(previewBucket),
                    serviceOrigin: previewOrigin,
                    validation: {
                      profileVersion: 1 as const,
                      runtimeFingerprint: validationProfile.runtimeFingerprint,
                    },
                  },
                }
              : {}),
            async limit(owner, operation) {
              const binding = operation === 'job' ? jobLimiter : uploadLimiter
              return (await binding.limit({ key: `python-${operation}-${owner}` })).success
            },
            jobs: {
              async inspect(raw) {
                return invokeJob(raw, 'inspect')
              },
              async validate(raw) {
                return invokeJob(raw, 'validate')
              },
              async discardPreview(input) {
                const jobId = await studioPythonInspectionJobId(input)
                if (env.INTERNAL_TOKEN !== token || env.PythonInspectionJobs !== jobs)
                  throw new Error('O proprietário do descarte Python mudou.')
                const stub = jobs.getByName(jobId)
                return stub.discardPreview(input)
              },
              async cancel(input) {
                const jobId = await studioPythonInspectionJobId(input)
                assertCurrent()
                return jobs.getByName(jobId).cancel(input)
              },
            },
            createSandbox: () =>
              sandboxFactory(
                namespace,
                `python-inspect-${crypto.randomUUID().replaceAll('-', '')}`,
                {
                  enableDefaultSession: false,
                  transport: 'rpc',
                },
              ),
          })
        } catch {
          if (request.body && !request.bodyUsed) void request.body.cancel().catch(() => {})
          return Response.json(
            { ok: false, code: 'PYTHON_UNAVAILABLE' },
            { status: 503, headers: { 'Cache-Control': 'no-store' } },
          )
        }
      }
      if (url.pathname.startsWith('/v1/published/')) {
        const authorizationEndpoints = [
          env.PUBLICATION_AUTHORIZATION_URL,
          env.PUBLICATION_AUTHORIZATION_ADULT_URL,
        ].filter((endpoint): endpoint is string => Boolean(endpoint))
        const endpointsKey = JSON.stringify(authorizationEndpoints)
        if (
          !authorization ||
          authorization.endpointsKey !== endpointsKey ||
          authorization.token !== env.INTERNAL_TOKEN
        ) {
          authorization = {
            endpointsKey,
            token: env.INTERNAL_TOKEN,
            check: createPublicationAuthorizer(authorizationEndpoints, env.INTERNAL_TOKEN),
          }
        }
        try {
          return await servePublishedArtifact(request, env.PRO_ARTIFACTS, authorization.check)
        } catch {
          return unavailableArtifact()
        }
      }
      if (url.pathname.startsWith('/v1/artifacts/'))
        return serveArtifact(request, env.PRO_ARTIFACTS)
      if (request.method === 'GET' && url.pathname === '/healthz') {
        return Response.json({ ok: true })
      }
      if (
        request.method !== 'POST' ||
        ![
          '/v1/build',
          '/v1/check',
          '/v1/dependencies',
          '/v1/preflight',
          '/v1/publications',
        ].includes(url.pathname)
      ) {
        return json({ ok: false, code: 'INVALID_REQUEST', message: 'Rota não encontrada.' }, 404)
      }
      if (!isAuthorized(request, env.INTERNAL_TOKEN)) {
        return json({ ok: false, code: 'INVALID_REQUEST', message: 'Não autorizado.' }, 401)
      }

      try {
        if (url.pathname === '/v1/check') return await runProjectCheck(request, env, sandboxFactory)
        if (url.pathname === '/v1/publications') {
          const body = await readJsonBodyWithLimit(
            request,
            STUDIO_PRO_PUBLICATION_LIMITS.maxRequestBytes,
          )
          if (
            body &&
            typeof body === 'object' &&
            'operation' in body &&
            body.operation === 'retire-reservation'
          ) {
            if (
              !('playId' in body) ||
              !isStudioPublicationId(body.playId) ||
              !('owner' in body) ||
              !isStudioPublicationHash(body.owner) ||
              !('snapshotHash' in body) ||
              !isStudioPublicationHash(body.snapshotHash) ||
              !('retirementHash' in body) ||
              !isStudioPublicationHash(body.retirementHash)
            )
              throw new PublicationError(400, 'Reserva inválida.')
            return Response.json(
              await retirePublicationReservation(env.PRO_ARTIFACTS, {
                playId: body.playId,
                owner: body.owner,
                snapshotHash: body.snapshotHash,
                retirementHash: body.retirementHash,
              }),
            )
          }
          if (
            body &&
            typeof body === 'object' &&
            'operation' in body &&
            body.operation === 'purge' &&
            'playId' in body &&
            isStudioPublicationId(body.playId)
          )
            return Response.json(await purgePublication(env.PRO_ARTIFACTS, body.playId))
          if (
            body &&
            typeof body === 'object' &&
            'operation' in body &&
            ['promote', 'promote-python', 'activate'].includes(String(body.operation)) &&
            'owner' in body &&
            isStudioPublicationHash(body.owner)
          ) {
            if (!(await env.BUILD_RATE_LIMITER.limit({ key: `publication-${body.owner}` })).success)
              return json(
                {
                  ok: false,
                  code: 'RATE_LIMITED',
                  message: 'Aguarde antes de alterar outra publicação.',
                },
                429,
              )
          }
          if (
            body &&
            typeof body === 'object' &&
            'operation' in body &&
            ['resolve', 'resolve-metadata'].includes(String(body.operation)) &&
            'playId' in body &&
            isStudioPublicationId(body.playId)
          ) {
            return Response.json(
              await (body.operation === 'resolve'
                ? currentPublishedSource(env.PRO_ARTIFACTS, body.playId)
                : currentPublishedPublication(env.PRO_ARTIFACTS, body.playId)),
              {
                headers: { 'Cache-Control': 'no-store' },
              },
            )
          }
          return Response.json(await publicationCommand(env.PRO_ARTIFACTS, body), {
            headers: { 'Cache-Control': 'no-store' },
          })
        }
        if (url.pathname === '/v1/dependencies') {
          const body = (await readJsonBodyWithLimit(request, 32_768)) as {
            executionId?: unknown
            packageJson?: unknown
          } | null
          if (
            !body ||
            typeof body.executionId !== 'string' ||
            !/^[a-z0-9][a-z0-9-]{15,95}$/.test(body.executionId) ||
            typeof body.packageJson !== 'string' ||
            body.packageJson.length > 16_000
          )
            throw new InvalidBuildRequestError('Solicitação de dependências inválida.')
          if (!(await env.BUILD_RATE_LIMITER.limit({ key: body.executionId })).success)
            return json(
              {
                ok: false,
                code: 'RATE_LIMITED',
                message: 'Aguarde antes de preparar outras dependências.',
              },
              429,
            )
          try {
            return Response.json(
              { packageLock: prepareRuntimeDependencyLock(body.packageJson) },
              { headers: { 'Cache-Control': 'no-store' } },
            )
          } catch (error) {
            throw new InvalidBuildRequestError(
              error instanceof Error ? error.message : 'Dependências inválidas.',
            )
          }
        }
        const raw = await readJsonBodyWithLimit(request, PRO_BUILD_LIMITS.maxRequestBytes)
        const input = parseBuildRequest(raw)
        await verifyBuildBinaries(input.binaries)
        const rate = await env.BUILD_RATE_LIMITER.limit({ key: input.executionId })
        if (!rate.success) {
          return json(
            {
              ok: false,
              code: 'RATE_LIMITED',
              message: 'Muitas execuções em pouco tempo. Espere alguns segundos e tente novamente.',
            },
            429,
          )
        }

        if (url.pathname === '/v1/preflight')
          return json({ ok: true, capabilities: STUDIO_PRO_REMOTE_CAPABILITIES }, 200)

        const startedAt = Date.now()
        const buildId = crypto.randomUUID().replace(/-/g, '')
        // A browser validation owns its container; teardown cannot kill another project's build.
        const sandbox = sandboxFactory(
          env.ProBuildSandbox,
          input.validate ? `check-${buildId}` : input.executionId,
          {
            enableDefaultSession: false,
            transport: 'rpc',
          },
        )
        const cwd = `${BUILD_ROOT}/${buildId}`
        const evidence: StudioProBuilderEvidence[] = []
        let screenshot: Uint8Array<ArrayBuffer> | undefined

        try {
          await sandbox.mkdir(cwd, { recursive: true })
          await Promise.all(
            Object.entries(input.files).map(async ([path, content]) => {
              const slash = path.lastIndexOf('/')
              if (slash > 0)
                await sandbox.mkdir(`${cwd}/${path.slice(0, slash)}`, { recursive: true })
              await sandbox.writeFile(`${cwd}/${path}`, content)
            }),
          )
          await Promise.all([
            sandbox.writeFile(
              `${cwd}/package.json`,
              trustedPackageJson(input.templateId, input.dependencies),
            ),
            sandbox.writeFile(
              `${cwd}/vite.config.mjs`,
              trustedViteConfig(input.templateId, input.dependencies),
            ),
            sandbox.writeFile(
              `${cwd}/artifact-options.json`,
              JSON.stringify({ consoleBridge: buildProRuntimeBridgeScript(input.parentOrigin) }),
            ),
          ])
          for (const [path, entry] of Object.entries(input.binaries ?? {})) {
            await sandbox.mkdir(`${cwd}/${path.slice(0, path.lastIndexOf('/'))}`, {
              recursive: true,
            })
            await sandbox.writeFile(`${cwd}/${path}`, entry.base64, { encoding: 'base64' })
          }

          if (input.validate) {
            await sandbox.writeFile(
              `${cwd}/validation-options.json`,
              JSON.stringify({ templateId: input.templateId }),
            )
            const checked = await sandbox.exec(
              'ln -s /opt/sz-runtime/node_modules ./node_modules && node /opt/sz-runtime/check-project.mjs',
              { cwd, timeout: 30_000 },
            )
            if (!checked.success)
              return json(
                {
                  ok: false,
                  code: 'TYPECHECK_FAILED',
                  message: 'A revisão tem erros de tipos ou dependências.',
                  output: capOutput(`${checked.stdout}\n${checked.stderr}`),
                },
                422,
              )
            const typeReport = JSON.parse(
              (await sandbox.readFile(`${cwd}/typecheck-result.json`, { encoding: 'utf-8' }))
                .content,
            ) as {
              status?: unknown
              files?: unknown
              typescript?: unknown
              checkJs?: unknown
              validation?: unknown
            }
            if (
              typeReport.status !== 'passed' ||
              !Number.isInteger(typeReport.files) ||
              Number(typeReport.files) < 0 ||
              Number(typeReport.files) > 80 ||
              typeReport.typescript !== '5.9.3' ||
              typeof typeReport.checkJs !== 'boolean' ||
              !isStudioProValidationIdentity(typeReport.validation) ||
              typeReport.validation.runtimeFingerprint !== validationProfile.runtimeFingerprint
            )
              throw new Error('Relatório de tipos inválido.')
            evidence.push({
              kind: 'types',
              status: 'passed',
              detail:
                typeReport.files === 0
                  ? 'Esta revisão contém apenas HTML/CSS; não há arquivos TypeScript/JavaScript para verificar.'
                  : `TypeScript 5.9.3 verificou ${typeReport.files} arquivos de entrada com as declarações instaladas. Verificação semântica de JavaScript: ${typeReport.checkJs ? 'ativada' : 'desativada pela configuração do projeto'}.`,
            })
          }

          const build = await sandbox.exec(
            `${input.validate ? '' : 'ln -s /opt/sz-runtime/node_modules ./node_modules && '}node /opt/sz-runtime/node_modules/vite/bin/vite.js build --config ./vite.config.mjs --configLoader native && node /opt/sz-runtime/pack-artifact.mjs ${STUDIO_PRO_ARTIFACT_LIMITS.maxBytes} ${STUDIO_PRO_ARTIFACT_LIMITS.maxFiles}`,
            { cwd, timeout: BUILD_TIMEOUT_MS },
          )
          const output = capOutput(`${build.stdout}\n${build.stderr}`.trim())
          if (!build.success) {
            return json(
              {
                ok: false,
                code: output.includes('STUDIO_OUTPUT_TOO_LARGE')
                  ? 'OUTPUT_TOO_LARGE'
                  : 'BUILD_FAILED',
                message: output.includes('STUDIO_OUTPUT_TOO_LARGE')
                  ? 'O resultado compilado ultrapassa o limite de tamanho.'
                  : 'O projeto tem um erro de compilação.',
                output,
              },
              output.includes('STUDIO_OUTPUT_TOO_LARGE') ? 413 : 422,
            )
          }

          if (input.validate) {
            evidence.push({
              kind: 'build',
              status: 'passed',
              detail:
                'Vite compilou a revisão e o empacotador verificou caminhos, hashes e tamanho.',
            })
            const remaining = 140_000 - (Date.now() - startedAt)
            if (remaining < 10_000)
              throw new Error('O prazo da validação terminou antes do playtest.')
            const played = await sandbox.exec('node /opt/sz-runtime/playtest.mjs', {
              cwd,
              timeout: Math.min(120_000, remaining),
            })
            if (!played.success)
              return json(
                {
                  ok: false,
                  code: 'PLAYTEST_FAILED',
                  message: 'A revisão não passou pelo teste no navegador.',
                  output: capOutput(`${played.stdout}\n${played.stderr}`),
                },
                422,
              )
            const report = JSON.parse(
              (await sandbox.readFile(`${cwd}/playtest-result.json`, { encoding: 'utf-8' }))
                .content,
            ) as { evidence?: unknown; screenshot?: unknown }
            if (
              report.screenshot !== '__studio-proof.png' ||
              !Array.isArray(report.evidence) ||
              report.evidence.length !== 2 ||
              !report.evidence.every(isStudioProBuilderEvidence) ||
              report.evidence.some(
                (item) =>
                  !['playtest', 'capture'].includes(item.kind) ||
                  item.status !== 'passed' ||
                  item.artifactUrl !== undefined,
              ) ||
              new Set(report.evidence.map((item) => item.kind)).size !== 2
            )
              throw new Error('Relatório de validação inválido.')
            evidence.push(...report.evidence)
            const capture = await sandbox.readFile(`${cwd}/dist/__studio-proof.png`, {
              encoding: 'base64',
            })
            screenshot = Uint8Array.from(atob(capture.content), (character) =>
              character.charCodeAt(0),
            )
          }

          const packed = await sandbox.readFile(`${cwd}/artifact-manifest.json`, {
            encoding: 'utf-8',
          })
          if (packed.content.length > 100_000) throw new Error('Manifesto compilado grande demais.')
          const manifest = JSON.parse(packed.content)
          if (screenshot) {
            if (manifest.files.some((file: { path: string }) => file.path === '__studio-proof.png'))
              throw new Error('O projeto usa um caminho reservado à verificação.')
            const hash = await crypto.subtle.digest('SHA-256', new Uint8Array(screenshot))
            manifest.files.push({
              path: '__studio-proof.png',
              bytes: screenshot.length,
              sha256: Array.from(new Uint8Array(hash), (byte) =>
                byte.toString(16).padStart(2, '0'),
              ).join(''),
              contentType: 'image/png',
            })
            if (
              manifest.files.length > STUDIO_PRO_ARTIFACT_LIMITS.maxFiles ||
              manifest.files.reduce((sum: number, file: { bytes: number }) => sum + file.bytes, 0) >
                STUDIO_PRO_ARTIFACT_LIMITS.maxBytes
            )
              return json(
                {
                  ok: false,
                  code: 'OUTPUT_TOO_LARGE',
                  message: 'O artefato com a captura ultrapassou o limite.',
                },
                413,
              )
          }
          const artifact = await storeArtifact({
            bucket: env.PRO_ARTIFACTS,
            origin: url.origin,
            parentOrigin: input.parentOrigin,
            ...(input.validate
              ? {
                  validation: {
                    profileVersion: 1 as const,
                    runtimeFingerprint: validationProfile.runtimeFingerprint,
                  },
                }
              : {}),
            manifest,
            async read(path) {
              if (path === '__studio-proof.png' && screenshot) return screenshot
              const file = await sandbox.readFile(`${cwd}/dist/${path}`, { encoding: 'base64' })
              return Uint8Array.from(atob(file.content), (character) => character.charCodeAt(0))
            },
          })
          return json({
            ok: true,
            artifact,
            output,
            durationMs: Date.now() - startedAt,
            ...(input.validate
              ? {
                  validation: {
                    profileVersion: 1,
                    runtimeFingerprint: validationProfile.runtimeFingerprint,
                  },
                  evidence: evidence.map((item) =>
                    item.kind === 'capture'
                      ? { ...item, artifactUrl: new URL('__studio-proof.png', artifact.url).href }
                      : item,
                  ),
                }
              : {}),
          })
        } finally {
          if (input.validate) await sandbox.destroy().catch(() => undefined)
          else await sandbox.exec(`rm -rf '${cwd}'`, { timeout: 5_000 }).catch(() => undefined)
        }
      } catch (error) {
        if (error instanceof PublicationError)
          return Response.json(
            { error: { message: error.message } },
            { status: error.status, headers: { 'Cache-Control': 'no-store' } },
          )
        if (error instanceof RequestBodyTooLargeError) {
          return json(
            {
              ok: false,
              code: 'INVALID_REQUEST',
              message: 'O projeto ultrapassou o tamanho permitido.',
            },
            413,
          )
        }
        if (error instanceof InvalidJsonBodyError) {
          return json(
            {
              ok: false,
              code: 'INVALID_REQUEST',
              message: 'O corpo da requisição precisa ser um JSON válido.',
            },
            400,
          )
        }
        if (error instanceof InvalidBuildRequestError) {
          return json({ ok: false, code: 'INVALID_REQUEST', message: error.message }, 400)
        }
        console.error('studio-runtime build failed', error)
        return json(
          {
            ok: false,
            code: 'BUILD_FAILED',
            message: 'Não foi possível compilar o projeto agora.',
          },
          500,
        )
      }
    },
  } satisfies ExportedHandler<Env>
}

export default createStudioRuntimeHandler()

/**
 * `POST /v1/check`: um contêiner próprio por teste (destruído no fim), o jogo montado como no
 * build, e o `check-objectives.mjs` da imagem abrindo uma página nova por objetivo.
 */
async function runProjectCheck(
  request: Request,
  env: Env,
  sandboxFactory: typeof getSandbox,
): Promise<Response> {
  // O prazo é contado do começo do PEDIDO: quem chama (o Members) desiste em 150 s, e o tempo do
  // contêiner subir e do Vite compilar sai do mesmo orçamento (review da etapa 3).
  const started = Date.now()
  const input = parseCheckRequest(
    await readJsonBodyWithLimit(request, CHECK_LIMITS.maxRequestBytes),
  )
  if (input.mode === 'pro') await verifyBuildBinaries(input.build.binaries)
  if (!(await env.BUILD_RATE_LIMITER.limit({ key: `check-${input.executionId}` })).success)
    return checkJson(
      {
        ok: false,
        code: 'RATE_LIMITED',
        message: 'Muitos testes em pouco tempo. Espere alguns segundos e tente de novo.',
      },
      429,
    )
  const buildId = crypto.randomUUID().replace(/-/g, '')
  const sandbox = sandboxFactory(env.ProBuildSandbox, `check-${buildId}`, {
    enableDefaultSession: false,
    transport: 'rpc',
  })
  const cwd = `${BUILD_ROOT}/${buildId}`
  try {
    await sandbox.mkdir(cwd, { recursive: true })
    let kit = false
    if (input.mode === 'classic') {
      await sandbox.writeFile(`${cwd}/game.html`, input.document)
    } else {
      const build = input.build
      kit = isKitTemplate(build.templateId)
      const modules = proCheckModules(input.objectives)
      const files = modules.length
        ? {
            ...build.files,
            'index.html': withCheckEntry(build.files['index.html'] ?? ''),
            [CHECK_ENTRY_PATH]: proCheckEntry(input.scope, modules),
          }
        : build.files
      await Promise.all(
        Object.entries(files).map(async ([path, content]) => {
          const slash = path.lastIndexOf('/')
          if (slash > 0) await sandbox.mkdir(`${cwd}/${path.slice(0, slash)}`, { recursive: true })
          await sandbox.writeFile(`${cwd}/${path}`, content)
        }),
      )
      await Promise.all([
        sandbox.writeFile(
          `${cwd}/package.json`,
          trustedPackageJson(build.templateId, build.dependencies),
        ),
        sandbox.writeFile(
          `${cwd}/vite.config.mjs`,
          trustedViteConfig(build.templateId, build.dependencies),
        ),
      ])
      for (const [path, entry] of Object.entries(build.binaries ?? {})) {
        await sandbox.mkdir(`${cwd}/${path.slice(0, path.lastIndexOf('/'))}`, { recursive: true })
        await sandbox.writeFile(`${cwd}/${path}`, entry.base64, { encoding: 'base64' })
      }
      const compiled = await sandbox.exec(
        'ln -s /opt/sz-runtime/node_modules ./node_modules && node /opt/sz-runtime/node_modules/vite/bin/vite.js build --config ./vite.config.mjs --configLoader native',
        { cwd, timeout: BUILD_TIMEOUT_MS },
      )
      // Jogo que não compila não cumpre nada: é resposta do teste, não falha do executor. Sem
      // mensagem de erro do Vite (tempo esgotado, contêiner caiu), é falha do executor: nunca
      // vira resposta guardada para a criança.
      const compileOutput = `${compiled.stdout}\n${compiled.stderr}`.trim()
      if (!compiled.success && !/error/i.test(compileOutput)) {
        console.error('studio-runtime check build failed', capOutput(compileOutput))
        return checkFailed()
      }
      if (!compiled.success)
        return checkJson({
          ok: true,
          results: input.objectives.map((objective) => ({
            id: objective.id,
            passed: false,
            detail: `O projeto não compilou: ${capOutput(compileOutput).slice(-600)}`,
          })),
        })
    }
    const runTimeout = Math.min(
      CHECK_LIMITS.runTimeoutMs,
      CHECK_LIMITS.totalBudgetMs - (Date.now() - started),
    )
    if (runTimeout < CHECK_LIMITS.minRunMs) return checkFailed()
    await sandbox.writeFile(
      `${cwd}/check-options.json`,
      JSON.stringify({
        mode: input.mode,
        scope: input.scope,
        kit,
        screenshots: input.screenshots,
        objectives: input.objectives,
        deadlineMs: runTimeout - 5_000,
      }),
    )
    const ran = await sandbox.exec('node /opt/sz-runtime/check-objectives.mjs', {
      cwd,
      timeout: runTimeout,
    })
    if (!ran.success) {
      console.error('studio-runtime check failed', capOutput(`${ran.stdout}\n${ran.stderr}`))
      return checkFailed()
    }
    const report = JSON.parse(
      (await sandbox.readFile(`${cwd}/check-result.json`, { encoding: 'utf-8' })).content,
    ) as { observations?: unknown }
    const observations = Array.isArray(report.observations) ? report.observations : []
    // Objetivo que o navegador não conseguiu testar (página não abriu, contêiner lento) é falha do
    // EXECUTOR: devolver "não passou" deixaria a criança presa num resultado guardado que não é
    // dela. Falha nunca aprova e nunca é guardada.
    const broken = input.objectives
      .map((objective) =>
        executionObservationUnavailableReason(
          objective.rule,
          observations.find((item) => item?.id === objective.id),
        ),
      )
      .find((reason) => reason !== undefined)
    if (broken) {
      console.error('studio-runtime check objective failed', broken)
      return checkFailed()
    }
    const screenshots: Record<string, string> = {}
    for (const [index, objective] of input.objectives.entries()) {
      const observation = observations.find(
        (item: unknown) =>
          typeof item === 'object' &&
          item !== null &&
          (item as { id?: unknown }).id === objective.id,
      ) as { screenshot?: unknown } | undefined
      if (observation?.screenshot !== `check-shot-${index}.jpg`) continue
      const shot = await sandbox
        .readFile(`${cwd}/check-shot-${index}.jpg`, { encoding: 'base64' })
        .catch(() => null)
      if (shot && shot.content.length <= CHECK_LIMITS.maxScreenshotBase64)
        screenshots[objective.id] = shot.content
    }
    return checkJson({
      ok: true,
      results: judgeCheck(input.objectives, observations),
      ...(Object.keys(screenshots).length ? { screenshots } : {}),
    })
  } finally {
    await sandbox.destroy().catch(() => undefined)
  }
}

function checkFailed(): Response {
  return checkJson(
    { ok: false, code: 'CHECK_FAILED', message: 'Não foi possível testar o jogo agora.' },
    500,
  )
}

function checkJson(body: ProjectCheckResponse, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  })
}

function capOutput(output: string): string {
  const limit = 20_000
  return output.length <= limit ? output : `${output.slice(0, limit)}\n… saída reduzida`
}

function isAuthorized(request: Request, expected: string): boolean {
  if (!expected) return false
  const header = request.headers.get('authorization') ?? ''
  const provided = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (provided.length !== expected.length) return false
  let different = 0
  for (let index = 0; index < expected.length; index += 1) {
    different |= provided.charCodeAt(index) ^ expected.charCodeAt(index)
  }
  return different === 0
}

function json(
  body:
    | ProBuildResponse
    | ProBuildFailure
    | { ok: true; capabilities: typeof STUDIO_PRO_REMOTE_CAPABILITIES },
  status = 200,
): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
