import { getSandbox, Sandbox } from '@cloudflare/sandbox'
import {
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBodyWithLimit,
} from '@sistemazero/core/http'
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
import validationProfile from '../runtime/validation-profile.json' with { type: 'json' }
import { serveArtifact, storeArtifact, unavailableArtifact } from './artifacts'
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
  currentPublishedSource,
  type PublicationBucket,
  PublicationError,
  publicationCommand,
  purgePublication,
  servePublishedArtifact,
} from './publications'

export class ProBuildSandbox extends Sandbox {
  enableInternet = false
}

interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>
}

export interface Env {
  ProBuildSandbox: DurableObjectNamespace<ProBuildSandbox>
  BUILD_RATE_LIMITER: RateLimitBinding
  INTERNAL_TOKEN: string
  PRO_ARTIFACTS: PublicationBucket
  PUBLICATION_AUTHORIZATION_URL?: string
  PUBLICATION_CLEANUP_URL?: string
}

const BUILD_ROOT = '/workspace/builds'
const BUILD_TIMEOUT_MS = 45_000

export function createStudioRuntimeHandler(
  sandboxFactory: typeof getSandbox = getSandbox,
): ExportedHandler<Env> {
  let authorization:
    | { endpoint: string | undefined; token: string; check: (playId: string) => Promise<boolean> }
    | undefined
  return {
    async scheduled(_event, env, ctx) {
      if (env.PUBLICATION_CLEANUP_URL && env.INTERNAL_TOKEN)
        ctx.waitUntil(
          fetch(env.PUBLICATION_CLEANUP_URL, {
            method: 'POST',
            redirect: 'error',
            headers: { Authorization: `Bearer ${env.INTERNAL_TOKEN}` },
            signal: AbortSignal.timeout(60_000),
          }).then(async (response) => {
            await response.body?.cancel()
            if (!response.ok) throw new Error(`Publication cleanup pending (${response.status})`)
          }),
        )
      ctx.waitUntil(
        collectPublicationGarbage(env.PRO_ARTIFACTS).then((result) => {
          console.info('[studio-publication] collection', result)
        }),
      )
    },
    async fetch(request: Request, env: Env): Promise<Response> {
      const url = new URL(request.url)
      if (url.pathname.startsWith('/v1/published/')) {
        if (
          !authorization ||
          authorization.endpoint !== env.PUBLICATION_AUTHORIZATION_URL ||
          authorization.token !== env.INTERNAL_TOKEN
        ) {
          authorization = {
            endpoint: env.PUBLICATION_AUTHORIZATION_URL,
            token: env.INTERNAL_TOKEN,
            check: createPublicationAuthorizer(
              env.PUBLICATION_AUTHORIZATION_URL,
              env.INTERNAL_TOKEN,
            ),
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
        !['/v1/build', '/v1/dependencies', '/v1/preflight', '/v1/publications'].includes(
          url.pathname,
        )
      ) {
        return json({ ok: false, code: 'INVALID_REQUEST', message: 'Rota não encontrada.' }, 404)
      }
      if (!isAuthorized(request, env.INTERNAL_TOKEN)) {
        return json({ ok: false, code: 'INVALID_REQUEST', message: 'Não autorizado.' }, 401)
      }

      try {
        if (url.pathname === '/v1/publications') {
          const body = await readJsonBodyWithLimit(
            request,
            STUDIO_PRO_PUBLICATION_LIMITS.maxRequestBytes,
          )
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
            ['promote', 'activate'].includes(String(body.operation)) &&
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
            body.operation === 'resolve' &&
            'playId' in body &&
            isStudioPublicationId(body.playId)
          ) {
            return Response.json(await currentPublishedSource(env.PRO_ARTIFACTS, body.playId), {
              headers: { 'Cache-Control': 'no-store' },
            })
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
