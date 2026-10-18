import { StudioRuntimeSelectionSchema } from '@sistemazero/core/studio/project-environment'
import {
  STUDIO_PYTHON_HTTP_GZIP_PREFIX,
  type StudioPythonDeployment,
  studioPythonRuntimePrefix,
  studioPythonRuntimeRoute,
  verifyStudioPythonDeployment,
} from '@sistemazero/core/studio/python-runtime-distribution'
import { pythonFrameContentSecurityPolicy } from '@sistemazero/core/studio/python-runtime-policy'
import type { StudioRuntimeReleaseStatus } from '@sistemazero/core/studio/runtime-catalog'
import { sha256 } from './artifacts'
import { pythonRuntimeNotModified, selectPythonRuntimeEncoding } from './python-http-negotiation'

/** R2 checksums are verified on upload and returned on GET, without buffering WASM at the edge. */
export interface RuntimeDistributionBucket {
  get(key: string): Promise<{
    body: ReadableStream
    size: number
    checksums?: { sha256?: ArrayBuffer }
  } | null>
  put(
    key: string,
    value: Uint8Array,
    options: { sha256: string; onlyIf: { etagDoesNotMatch: string } },
  ): Promise<{ etag: string } | null>
}

function hex(bytes: ArrayBuffer | undefined) {
  return (
    bytes &&
    Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')
  )
}

async function verifyGzipBytes(
  compressed: Uint8Array<ArrayBuffer>,
  logical: Uint8Array<ArrayBuffer>,
) {
  const reader = new Blob([compressed])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'))
    .getReader()
  let offset = 0
  let completed = false
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) {
        if (offset !== logical.byteLength) throw new Error('Tamanho descomprimido diferente.')
        completed = true
        return
      }
      if (
        offset + next.value.byteLength > logical.byteLength ||
        next.value.some((byte, index) => byte !== logical[offset + index])
      )
        throw new Error('Conteúdo descomprimido diferente.')
      offset += next.value.byteLength
    }
  } catch (error) {
    throw new Error('Representação gzip inválida.', { cause: error })
  } finally {
    if (!completed) await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}

/** Trusted packaging path only. No learner HTTP endpoint can call this operation. */
export async function storePythonRuntimeDistribution(options: {
  bucket: RuntimeDistributionBucket
  deployment: unknown
  read(path: string): Promise<Uint8Array<ArrayBuffer>>
}) {
  const deployment = await verifyStudioPythonDeployment(options.deployment)
  const prefix = studioPythonRuntimePrefix(deployment.release.manifestSha256)
  const logicalFiles = new Map(deployment.distribution.files.map((file) => [file.path, file]))
  const compressed = new Map(
    (deployment.distribution.httpRepresentations ?? []).map((representation) => [
      representation.artifactPath,
      logicalFiles.get(representation.path)!,
    ]),
  )
  async function putOnce(key: string, bytes: Uint8Array<ArrayBuffer>, hash: string) {
    const result = await options.bucket.put(key, bytes, {
      sha256: hash,
      onlyIf: { etagDoesNotMatch: '*' },
    })
    if (result !== null) return
    const existing = await options.bucket.get(key)
    if (!existing) throw new Error('Artefato imutável indisponível após conflito de gravação.')
    await existing.body.cancel()
    if (existing.size !== bytes.byteLength || hex(existing.checksums?.sha256) !== hash)
      throw new Error('Há um artefato diferente no endereço imutável da release.')
  }
  for (const file of deployment.distribution.files) {
    const bytes = new Uint8Array(await options.read(file.path))
    if (bytes.byteLength !== file.bytes || (await sha256(bytes)) !== file.sha256)
      throw new Error(`Integridade inválida: ${file.path}.`)
    const logicalFile = compressed.get(file.path)
    if (logicalFile) {
      const logical = new Uint8Array(await options.read(logicalFile.path))
      if (
        logical.byteLength !== logicalFile.bytes ||
        (await sha256(logical)) !== logicalFile.sha256
      )
        throw new Error(`Integridade inválida: ${logicalFile.path}.`)
      // Compare incrementally against the already verified logical bytes: no expanded output
      // buffer, and stop as soon as the declared length/content differs.
      await verifyGzipBytes(bytes, logical)
    }
    await putOnce(`${prefix}files/${file.path}`, bytes, file.sha256)
  }
  // Never delete shared immutable files on failure; retry fills a partial upload safely.
  // Only a complete, verified upload can make its marker visible.
  await putOnce(
    `${prefix}complete.json`,
    new TextEncoder().encode(deployment.marker),
    deployment.markerSha256,
  )
  return deployment
}

const unavailable = () =>
  new Response('Ambiente de execução indisponível.', {
    status: 404,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  })
const unacceptable = () =>
  new Response('Nenhuma representação HTTP aceitável.', {
    status: 406,
    headers: {
      'Cache-Control': 'no-store',
      Vary: 'Accept-Encoding',
      'X-Content-Type-Options': 'nosniff',
    },
  })
const mime: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  wasm: 'application/wasm',
  json: 'application/json',
  zip: 'application/zip',
  txt: 'text/plain; charset=utf-8',
}

/** Both editor and anonymous player use this route. Inputs are host configuration, never project data. */
export async function createPythonDistributionRegistry(options: {
  approvedDeployments: readonly unknown[]
  parentOrigins: readonly string[]
  status(manifestSha256: string): StudioRuntimeReleaseStatus | undefined
}) {
  const parents = [...new Set(options.parentOrigins)].map((value) => {
    const origin = new URL(value)
    if (
      origin.origin !== value ||
      origin.username ||
      origin.password ||
      (origin.protocol !== 'https:' &&
        !(
          origin.protocol === 'http:' &&
          ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)
        ))
    )
      throw new Error('Origem do editor/player inválida.')
    return origin.origin
  })
  if (!parents.length || parents.length > 32)
    throw new Error('Origens do editor/player ausentes ou excessivas.')
  const status = options.status
  // All verifiers parse/copy synchronously before their first await, including later entries.
  const verified = await Promise.all(
    [...options.approvedDeployments].map(verifyStudioPythonDeployment),
  )
  const deployments = new Map<string, StudioPythonDeployment>()
  for (const deployment of verified) {
    const hash = deployment.release.manifestSha256
    if (deployments.has(hash)) throw new Error('Distribuição aprovada repetida.')
    deployments.set(hash, deployment)
  }
  const serve = async (
    request: Request,
    bucket: Pick<RuntimeDistributionBucket, 'get'>,
  ): Promise<Response> => {
    let pendingBody: ReadableStream | undefined
    async function cancelBody() {
      const body = pendingBody
      pendingBody = undefined
      await body?.cancel()
    }
    try {
      const url = new URL(request.url)
      const match = /^\/v1\/runtimes\/([a-f0-9]{64})\/([A-Za-z0-9_./-]+)$/.exec(url.pathname)
      const metadata = /^\/v1\/runtime-deployments\/([a-f0-9]{64})$/.exec(url.pathname)
      if ((!match && !metadata) || url.search || !['GET', 'HEAD'].includes(request.method))
        return unavailable()
      const hash = match?.[1] ?? metadata?.[1]
      if (!hash) return unavailable()
      const deployment = deployments.get(hash)
      const releaseStatus = status(hash)
      // Retired versions remain usable for existing projects. Revoked or unknown never execute.
      if (!deployment || !['active', 'retired'].includes(releaseStatus ?? '')) return unavailable()
      const file = match
        ? deployment.distribution.files.find((item) => item.path === match[2])
        : undefined
      if (!metadata && !file) return unavailable()
      if (file?.path.startsWith(STUDIO_PYTHON_HTTP_GZIP_PREFIX)) return unavailable()
      const prefix = studioPythonRuntimePrefix(hash)
      const marker = await bucket.get(`${prefix}complete.json`)
      if (!marker) return unavailable()
      pendingBody = marker.body
      await cancelBody()
      if (
        marker.size !== new TextEncoder().encode(deployment.marker).byteLength ||
        hex(marker.checksums?.sha256) !== deployment.markerSha256 ||
        !['active', 'retired'].includes(status(hash) ?? '')
      )
        return unavailable()
      if (metadata) {
        if (!['active', 'retired'].includes(status(hash) ?? '')) return unavailable()
        const body = JSON.stringify({
          release: deployment.release,
          distribution: deployment.distribution,
        })
        return new Response(request.method === 'HEAD' ? null : body, {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': String(new TextEncoder().encode(body).byteLength),
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
            'Access-Control-Allow-Origin': '*',
            'Cross-Origin-Resource-Policy': 'cross-origin',
            'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
          },
        })
      }
      if (!file) return unavailable()
      const compressed = deployment.distribution.httpRepresentations?.find(
        (representation) => representation.path === file.path,
      )
      // This service also runs in portable SDK/test hosts with the standard Request type.
      const edge = 'cf' in request ? request.cf : undefined
      const originalClientEncoding =
        edge && typeof edge === 'object' && 'clientAcceptEncoding' in edge
          ? edge.clientAcceptEncoding
          : undefined
      const encoding = selectPythonRuntimeEncoding(
        // Cloudflare may normalize the header to br,gzip. Its original client value
        // remains authoritative, including an empty field or explicit q=0 exclusions.
        typeof originalClientEncoding === 'string'
          ? originalClientEncoding
          : request.headers.get('Accept-Encoding'),
        compressed !== undefined,
      )
      if (encoding === undefined) return unacceptable()
      const representation =
        encoding === 'gzip'
          ? deployment.distribution.files.find((item) => item.path === compressed?.artifactPath)
          : file
      if (!representation) return unavailable()
      const object = await bucket.get(`${prefix}files/${representation.path}`)
      if (!object) return unavailable()
      pendingBody = object.body
      if (
        object.size !== representation.bytes ||
        hex(object.checksums?.sha256) !== representation.sha256 ||
        !['active', 'retired'].includes(status(hash) ?? '')
      ) {
        return unavailable()
      }
      const headers = new Headers({
        'Content-Type': mime[file.path.split('.').pop() ?? ''] ?? 'application/octet-stream',
        'Content-Length': String(representation.bytes),
        ETag: `"${representation.sha256}"`,
        Vary: 'Accept-Encoding',
        // Entry frames always recheck operational policy. Versioned dependencies can be cached.
        'Cache-Control': file.path.endsWith('.html')
          ? 'no-store'
          : 'public, max-age=31536000, immutable',
        'Content-Security-Policy': `${pythonFrameContentSecurityPolicy(`${url.origin}${studioPythonRuntimeRoute(hash)}`)}; frame-ancestors 'self' ${parents.join(' ')}`,
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      })
      if (encoding === 'gzip') headers.set('Content-Encoding', 'gzip')
      const notModified = pythonRuntimeNotModified(
        request.headers.get('If-None-Match'),
        headers.get('ETag')!,
      )
      if (request.method === 'HEAD' || notModified) {
        await cancelBody()
        // Cancellation is asynchronous IO too; operational policy can change before its ACK.
        if (!['active', 'retired'].includes(status(hash) ?? '')) return unavailable()
        return new Response(null, {
          status: notModified ? 304 : 200,
          headers,
          ...(encoding === 'gzip' ? { encodeBody: 'manual' as const } : {}),
        })
      }
      // Workers otherwise compresses Content-Encoding bodies again, changing the pinned wire bytes.
      const response = new Response(object.body, {
        headers,
        ...(encoding === 'gzip' ? { encodeBody: 'manual' as const } : {}),
      })
      pendingBody = undefined
      return response
    } catch {
      return unavailable()
    } finally {
      // Includes exceptions from operational policy, CSP/header construction and Response.
      await cancelBody().catch(() => {})
    }
  }
  return {
    serve,
    allowsParentOrigin(value: string) {
      return parents.includes(value)
    },
    /** Approval is configuration, never the completion marker or the caller's manifest. */
    resolve(selection: unknown) {
      const parsed = StudioRuntimeSelectionSchema.safeParse(selection)
      if (!parsed.success) return undefined
      const { manifestSha256: hash, profileId, releaseId } = parsed.data
      const deployment = deployments.get(hash)
      if (
        !deployment ||
        deployment.release.profileId !== profileId ||
        deployment.release.releaseId !== releaseId ||
        !['active', 'retired'].includes(status(hash) ?? '')
      )
        return undefined
      return structuredClone(deployment)
    },
  }
}
/** Preserves the callable public server contract used by existing editor/player integrations. */
export async function createPythonDistributionServer(
  options: Parameters<typeof createPythonDistributionRegistry>[0],
) {
  return (await createPythonDistributionRegistry(options)).serve
}
export type PythonDistributionRegistry = Awaited<
  ReturnType<typeof createPythonDistributionRegistry>
>
export type PythonDistributionServer = Awaited<ReturnType<typeof createPythonDistributionServer>>
