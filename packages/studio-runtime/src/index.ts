import { getSandbox, Sandbox } from '@cloudflare/sandbox'
import {
  InvalidBuildRequestError,
  PRO_BUILD_LIMITS,
  type ProBuildFailure,
  type ProBuildResponse,
  parseBuildRequest,
  trustedPackageJson,
  trustedViteConfig,
} from './contracts'

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
}

const BUILD_ROOT = '/workspace/builds'
const BUILD_TIMEOUT_MS = 45_000

export function createStudioRuntimeHandler(
  sandboxFactory: typeof getSandbox = getSandbox,
): ExportedHandler<Env> {
  return {
    async fetch(request: Request, env: Env): Promise<Response> {
      const url = new URL(request.url)
      if (request.method === 'GET' && url.pathname === '/healthz') {
        return Response.json({ ok: true })
      }
      if (request.method !== 'POST' || url.pathname !== '/v1/build') {
        return json({ ok: false, code: 'INVALID_REQUEST', message: 'Rota não encontrada.' }, 404)
      }
      if (!isAuthorized(request, env.INTERNAL_TOKEN)) {
        return json({ ok: false, code: 'INVALID_REQUEST', message: 'Não autorizado.' }, 401)
      }

      try {
        const raw = await request.json()
        const input = parseBuildRequest(raw)
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

        const startedAt = Date.now()
        const sandbox = sandboxFactory(env.ProBuildSandbox, input.executionId, {
          enableDefaultSession: false,
          transport: 'rpc',
        })
        const buildId = crypto.randomUUID().replace(/-/g, '')
        const cwd = `${BUILD_ROOT}/${buildId}`

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
            sandbox.writeFile(`${cwd}/package.json`, trustedPackageJson(input.templateId)),
            sandbox.writeFile(`${cwd}/vite.config.mjs`, trustedViteConfig(input.templateId)),
          ])

          const build = await sandbox.exec(
            'ln -s /opt/sz-runtime/node_modules ./node_modules && node /opt/sz-runtime/node_modules/vite/bin/vite.js build && node /opt/sz-runtime/inline-preview.mjs',
            { cwd, timeout: BUILD_TIMEOUT_MS },
          )
          const output = capOutput(`${build.stdout}\n${build.stderr}`.trim())
          if (!build.success) {
            return json(
              {
                ok: false,
                code: 'BUILD_FAILED',
                message: 'O projeto tem um erro de compilação.',
                output,
              },
              422,
            )
          }

          const preview = await sandbox.readFile(`${cwd}/preview.html`, { encoding: 'utf-8' })
          if (preview.content.length > PRO_BUILD_LIMITS.maxOutputChars) {
            return json(
              {
                ok: false,
                code: 'OUTPUT_TOO_LARGE',
                message: 'O resultado compilado ficou grande demais para a atividade.',
                output,
              },
              413,
            )
          }
          return json({
            ok: true,
            html: preview.content,
            output,
            durationMs: Date.now() - startedAt,
          })
        } finally {
          await sandbox.exec('rm -rf ./* ./.??*', { cwd, timeout: 5_000 }).catch(() => undefined)
        }
      } catch (error) {
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

function json(body: ProBuildResponse | ProBuildFailure, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
