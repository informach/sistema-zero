import { canonicalJson } from '@sistemazero/core/creations'
import {
  StudioPythonExecutionMetadataSchema,
  StudioPythonWebPayloadSchema,
  verifyStudioPythonExecutionMetadata,
} from '@sistemazero/core/studio/python-execution-content'
import { studioPythonInspectionJobId } from '@sistemazero/core/studio/python-inspection-job'
import { studioPythonPlayerPage } from '@sistemazero/core/studio/python-player-page'
import { verifyStudioPythonPlaytestCapture } from '@sistemazero/core/studio/python-playtest'
import {
  isStudioPythonWebOrigin,
  STUDIO_PYTHON_PREVIEW_LIMITS,
  type StudioPythonPreviewManifest,
  StudioPythonPreviewManifestSchema,
  StudioPythonPreviewReferenceSchema,
  StudioPythonPreviewRequestSchema,
  studioPythonPreviewRoute,
  verifyStudioPythonPreviewManifest,
  verifyStudioPythonPreviewReference,
} from '@sistemazero/core/studio/python-preview'
import {
  studioPythonDeploymentRoute,
  studioPythonRuntimeRoute,
} from '@sistemazero/core/studio/python-runtime-distribution'
import {
  StudioPythonValidationReportSchema,
  verifyStudioPythonValidationReport,
} from '@sistemazero/core/studio/python-validation'
import { StudioPythonInputReferenceSchema } from '@sistemazero/core/studio/python-validation-input'
import { sha256, unavailableArtifact } from './artifacts'
import type { PythonDistributionRegistry, RuntimeDistributionBucket } from './python-distributions'
import { PythonFileVerificationError, verifiedPythonFileStream } from './python-file-stream'
import type { PythonInputGcBucket } from './python-input-gc'
import { inputAwait, type PythonInputBucket } from './python-inputs'

export const PYTHON_PREVIEW_RECORD_PREFIX = 'python-preview-records/'
export const pythonPreviewRecordKey = (id: string) => `${PYTHON_PREVIEW_RECORD_PREFIX}${id}.json`
export const pythonPreviewPrefix = (id: string) => `python-previews/${id}/`
const encode = (text: string) => new TextEncoder().encode(text)
const checksum = (value: ArrayBuffer | undefined) => value && Buffer.from(value).toString('hex')
const markerBytes = (hash: string) => encode(canonicalJson({ version: 1, manifestSha256: hash }))
class PythonPreviewRecordError extends Error {}

/** The GC record precedes every data write. Failed/cancelled writes remain collectable after expiry. */
export async function storePythonPreview(options: {
  bucket: PythonInputBucket
  registry: PythonDistributionRegistry
  runtimeBucket: Pick<RuntimeDistributionBucket, 'get'>
  serviceOrigin: string
  preview: unknown
  snapshot: unknown
  input: unknown
  report: unknown
  captureBytes?: Uint8Array
  validation: { profileVersion: 1; runtimeFingerprint: string }
  signal: AbortSignal
  assertCurrent(): void
  readProject(path: string, signal: AbortSignal): Promise<ReadableStream<Uint8Array>>
  now?: number
}) {
  const { bucket, registry, runtimeBucket, assertCurrent, readProject } = options
  const signal = AbortSignal.any([options.signal, AbortSignal.timeout(90_000)])
  const put = (
    key: string,
    value: Parameters<PythonInputBucket['put']>[1],
    metadata: Parameters<PythonInputBucket['put']>[2],
    retain = false,
  ) =>
    inputAwait(bucket.put(key, value, metadata), signal, (stored) => {
      if (stored && !retain)
        void inputAwait(bucket.delete([key]), AbortSignal.timeout(5000)).catch(() =>
          console.error('[studio-python] late preview cleanup pending'),
        )
    })
  const preview = StudioPythonPreviewRequestSchema.parse(options.preview)
  const snapshotCopy = StudioPythonExecutionMetadataSchema.parse(options.snapshot)
  const input = StudioPythonInputReferenceSchema.parse(options.input)
  const reportCopy = StudioPythonValidationReportSchema.parse(options.report)
  const captureBytes = options.captureBytes && new Uint8Array(options.captureBytes)
  const validation = { ...options.validation }
  const origin = options.serviceOrigin
  const createdAt = options.now ?? Date.now()
  const check = () => {
    signal.throwIfAborted()
    assertCurrent()
    const deployment = registry.resolve(snapshotCopy.configuration.runtime)
    if (
      !deployment?.distribution.files.some((file) => file.path === 'standalone.mjs') ||
      !registry.allowsParentOrigin(preview.parentOrigin)
    )
      throw new Error('O ambiente ou a origem do preview Python foi retirado.')
  }
  if (!isStudioPythonWebOrigin(origin) || origin === preview.parentOrigin)
    throw new Error('O preview Python exige uma origem de serviço distinta do aplicativo.')
  if (input.projectId !== snapshotCopy.projectId || input.revision !== snapshotCopy.revision)
    throw new Error('O preview pertence a outro proprietário de execução.')
  const jobId = await studioPythonInspectionJobId(input)
  check()
  const [snapshot, report] = await Promise.all([
    verifyStudioPythonExecutionMetadata(snapshotCopy),
    verifyStudioPythonValidationReport(reportCopy, snapshotCopy, reportCopy.recipe),
  ])
  check()
  if (report.status !== 'passed') throw new Error('O preview exige validação Python aprovada.')
  if (report.execution?.capture) {
    if (!captureBytes) throw new Error('A captura validada está ausente.')
    await verifyStudioPythonPlaytestCapture(report.execution.capture, captureBytes)
  } else if (captureBytes) throw new Error('Captura sem evidência de execução.')
  check()
  const runtimeDirectory = `${origin}${studioPythonRuntimeRoute(snapshot.configuration.runtime.manifestSha256)}`
  const { html, css } = studioPythonPlayerPage(snapshot.configuration.runtime.manifestSha256, {
    runtimeDirectoryURL: runtimeDirectory,
    previewParentOrigin: preview.parentOrigin,
  })
  const generated = new Map<
    string,
    { role: StudioPythonPreviewManifest['files'][number]['role']; bytes: Uint8Array<ArrayBuffer> }
  >([
    ['index.html', { role: 'launcher', bytes: encode(html) }],
    ['player.css', { role: 'stylesheet', bytes: encode(css) }],
    [
      'payload.json',
      {
        role: 'payload',
        bytes: encode(
          canonicalJson(
            StudioPythonWebPayloadSchema.parse({ version: 1, name: 'Projeto Python', snapshot }),
          ),
        ),
      },
    ],
    ['validation.json', { role: 'validation', bytes: encode(canonicalJson(report)) }],
  ])
  if (captureBytes) generated.set('python-playtest.png', { role: 'capture', bytes: captureBytes })
  const id = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '')
  const files: StudioPythonPreviewManifest['files'] = snapshot.files.map((file) => ({
    role: 'project',
    path: `project/${file.path}`,
    bytes: file.byteLength,
    sha256: file.sha256,
  }))
  for (const [path, file] of generated)
    files.push({
      role: file.role,
      path,
      bytes: file.bytes.byteLength,
      sha256: await sha256(file.bytes),
    })
  const manifest = await verifyStudioPythonPreviewManifest(
    {
      kind: 'python-preview',
      version: 1,
      id,
      jobId,
      projectId: snapshot.projectId,
      revision: snapshot.revision,
      runtime: snapshot.configuration.runtime,
      pythonVersion: snapshot.configuration.python.dependencyLock.pythonVersion,
      createdAt,
      expiresAt: createdAt + STUDIO_PYTHON_PREVIEW_LIMITS.lifetimeMs,
      parentOrigin: preview.parentOrigin,
      validation,
      files,
    },
    snapshot,
    report,
  )
  const manifestBytes = encode(canonicalJson(manifest))
  const manifestHash = await sha256(manifestBytes)
  const prefix = pythonPreviewPrefix(id)
  const keys = files.map((file) => `${prefix}files/${file.path}`)
  const completeKey = `${prefix}complete.json`
  check()
  // The retained record makes uncertain writes collectable; a native ACK cannot block retirement.
  const recorded = await put(
    pythonPreviewRecordKey(id),
    manifestBytes,
    {
      sha256: manifestHash,
      onlyIf: { etagDoesNotMatch: '*' },
    },
    true,
  )
  if (!recorded) throw new Error('Identidade de preview Python já presente.')
  try {
    check()
    for (const file of files) {
      check()
      const local = generated.get(file.path)
      if (local) {
        const stored = await put(`${prefix}files/${file.path}`, local.bytes, {
          sha256: file.sha256,
          onlyIf: { etagDoesNotMatch: '*' },
        })
        if (!stored) throw new Error('Arquivo de preview Python já presente.')
      } else {
        const body = await inputAwait(readProject(file.path.slice(8), signal), signal, (body) => {
          void body.cancel(signal.reason).catch(() => {})
        })
        let transfer: ReturnType<typeof verifiedPythonFileStream> | undefined
        try {
          check()
          transfer = verifiedPythonFileStream({
            body,
            bytes: file.bytes,
            sha256: file.sha256,
            signal: signal,
          })
          const stored = await put(`${prefix}files/${file.path}`, transfer.stream, {
            bytes: file.bytes,
            sha256: file.sha256,
            onlyIf: { etagDoesNotMatch: '*' },
          })
          if (!stored) throw new Error('Arquivo de preview Python já presente.')
          await transfer.complete
        } catch (error) {
          if (transfer) transfer.cancel(error)
          else void body.cancel(error).catch(() => {})
          throw error
        }
      }
      check()
    }
    // Recheck the approved upload marker before publishing this preview's completion marker.
    const approved = await inputAwait(
      registry.serve(
        new Request(
          `${origin}/v1/runtime-deployments/${snapshot.configuration.runtime.manifestSha256}`,
          { method: 'HEAD' },
        ),
        runtimeBucket,
      ),
      signal,
      (response) => {
        void response.body?.cancel().catch(() => {})
      },
    )
    if (approved.body) await inputAwait(approved.body.cancel(), signal)
    check()
    if (!approved.ok) throw new Error('A distribuição Python está indisponível.')
    const marker = markerBytes(manifestHash)
    if (
      !(await put(completeKey, marker, {
        sha256: await sha256(marker),
        onlyIf: { etagDoesNotMatch: '*' },
      }))
    )
      throw new Error('Marcador do preview Python já presente.')
    check()
    return verifyStudioPythonPreviewReference(
      {
        kind: 'python-preview',
        version: 1,
        id,
        projectId: snapshot.projectId,
        revision: snapshot.revision,
        runtimeManifestSha256: snapshot.configuration.runtime.manifestSha256,
        previewHostAudioVersion: 1,
        url: `${origin}${studioPythonPreviewRoute(id)}index.html`,
        sha256: manifestHash,
        expiresAt: manifest.expiresAt,
      },
      {
        projectId: snapshot.projectId,
        revision: snapshot.revision,
        runtimeManifestSha256: snapshot.configuration.runtime.manifestSha256,
        serviceOrigin: origin,
        parentOrigin: preview.parentOrigin,
        now: createdAt,
      },
    )
  } catch (error) {
    try {
      await inputAwait(bucket.delete([...keys, completeKey]), AbortSignal.timeout(5000))
    } catch {
      console.error('[studio-python] preview cleanup pending')
    }
    // Do not delete the GC record: uncertain/late writes must still be collected.
    throw error
  }
}

async function readPreviewRecord(
  bucket: Pick<PythonInputBucket, 'get'>,
  id: string,
  signal: AbortSignal,
) {
  const object = await inputAwait(bucket.get(pythonPreviewRecordKey(id)), signal, (object) => {
    void object?.body.cancel(signal.reason).catch(() => {})
  })
  if (!object) return undefined
  let transfer: ReturnType<typeof verifiedPythonFileStream> | undefined
  try {
    const hash = checksum(object.checksums?.sha256)
    if (!hash || object.size > STUDIO_PYTHON_PREVIEW_LIMITS.manifestBytes)
      throw new PythonPreviewRecordError('Manifesto de preview inválido.')
    transfer = verifiedPythonFileStream({
      body: object.body,
      bytes: object.size,
      sha256: hash,
      signal,
    })
    const text = await new Response(transfer.stream).text()
    await transfer.complete
    let manifest: StudioPythonPreviewManifest
    try {
      manifest = StudioPythonPreviewManifestSchema.parse(JSON.parse(text))
      if (manifest.id !== id || canonicalJson(manifest) !== text)
        throw new Error('Identidade inválida')
    } catch {
      throw new PythonPreviewRecordError('Identidade do preview inválida.')
    }
    return { manifest, hash }
  } catch (error) {
    if (transfer) transfer.cancel(error)
    else void object.body.cancel(error).catch(() => {})
    throw error
  }
}

/** Best-effort physical rollback complements the coordinator's durable availability decision. */
export async function discardStoredPythonPreview(options: {
  bucket: Pick<PythonInputBucket, 'get' | 'delete'>
  preview: unknown
  jobId: string
  signal: AbortSignal
}) {
  const { bucket, jobId, signal } = options
  const preview = StudioPythonPreviewReferenceSchema.parse(options.preview)
  const record = await readPreviewRecord(bucket, preview.id, signal)
  if (!record) return
  if (
    record.manifest.jobId !== jobId ||
    record.manifest.projectId !== preview.projectId ||
    record.manifest.revision !== preview.revision
  )
    throw new Error('O descarte pertence a outro preview Python.')
  await inputAwait(bucket.delete([`${pythonPreviewPrefix(preview.id)}complete.json`]), signal)
  await inputAwait(
    bucket.delete(
      record.manifest.files.map((file) => `${pythonPreviewPrefix(preview.id)}files/${file.path}`),
    ),
    signal,
  )
  // Keep the GC record to collect uncertain/late storage writes.
}

/** Only the fixed service launcher is executable. Every authored file is inert binary data. */
export async function servePythonPreview(
  request: Request,
  options: {
    bucket: Pick<PythonInputBucket, 'get'>
    runtimeBucket: Pick<RuntimeDistributionBucket, 'get'>
    registry: PythonDistributionRegistry
    serviceOrigin: string
    assertCurrent(): void
    authorize(manifest: StudioPythonPreviewManifest): Promise<boolean>
    now?: () => number
  },
) {
  const { bucket, registry, runtimeBucket, assertCurrent, serviceOrigin, now, authorize } = options
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(25_000)])
  let pending: ReadableStream | undefined
  const cancel = async () => {
    const body = pending
    pending = undefined
    if (body) await inputAwait(body.cancel(), AbortSignal.any([signal, AbortSignal.timeout(5000)]))
  }
  const check = () => {
    signal.throwIfAborted()
    assertCurrent()
  }
  try {
    const url = new URL(request.url)
    const match = /^\/v1\/python-previews\/([a-f0-9]{64})\/(.+)$/.exec(url.pathname)
    if (
      !match?.[1] ||
      !match[2] ||
      url.origin !== serviceOrigin ||
      url.search ||
      !['GET', 'HEAD'].includes(request.method)
    )
      return unavailableArtifact()
    check()
    const record = await readPreviewRecord(bucket, match[1], signal)
    check()
    if (!record) return unavailableArtifact()
    const { manifest, hash } = record
    const valid = () =>
      manifest.expiresAt > (now?.() ?? Date.now()) &&
      manifest.parentOrigin !== url.origin &&
      registry.allowsParentOrigin(manifest.parentOrigin) &&
      registry.resolve(manifest.runtime) !== undefined
    if (!valid()) return unavailableArtifact()
    if (!(await inputAwait(authorize(structuredClone(manifest)), signal)))
      return unavailableArtifact()
    check()
    const file = manifest.files.find((file) => file.path === match[2])
    if (!file) return unavailableArtifact()
    const marker = await inputAwait(
      bucket.get(`${pythonPreviewPrefix(manifest.id)}complete.json`),
      signal,
      (object) => {
        void object?.body.cancel(signal.reason).catch(() => {})
      },
    )
    if (!marker) return unavailableArtifact()
    pending = marker.body
    await cancel()
    const expectedMarker = markerBytes(hash)
    if (
      marker.size !== expectedMarker.byteLength ||
      checksum(marker.checksums?.sha256) !== (await sha256(expectedMarker))
    )
      return unavailableArtifact()
    const approval = await inputAwait(
      registry.serve(
        new Request(`${url.origin}/v1/runtime-deployments/${manifest.runtime.manifestSha256}`, {
          method: 'HEAD',
        }),
        runtimeBucket,
      ),
      signal,
      (response) => {
        void response.body?.cancel().catch(() => {})
      },
    )
    if (approval.body) await inputAwait(approval.body.cancel(), signal)
    check()
    if (!approval.ok || !valid()) return unavailableArtifact()
    const object = await inputAwait(
      bucket.get(`${pythonPreviewPrefix(manifest.id)}files/${file.path}`),
      signal,
      (object) => {
        void object?.body.cancel(signal.reason).catch(() => {})
      },
    )
    if (!object) return unavailableArtifact()
    pending = object.body
    check()
    if (
      object.size !== file.bytes ||
      checksum(object.checksums?.sha256) !== file.sha256 ||
      !valid()
    )
      return unavailableArtifact()
    if (!(await inputAwait(authorize(structuredClone(manifest)), signal)))
      return unavailableArtifact()
    check()
    if (!valid()) return unavailableArtifact()
    const base = `${url.origin}${studioPythonPreviewRoute(manifest.id)}`
    const runtime = `${url.origin}${studioPythonRuntimeRoute(manifest.runtime.manifestSha256)}`
    const deployment = `${url.origin}${studioPythonDeploymentRoute(manifest.runtime.manifestSha256)}`
    const executable = file.role === 'launcher'
    const csp = executable
      ? [
          "default-src 'none'",
          'sandbox allow-scripts allow-same-origin allow-downloads allow-pointer-lock allow-forms',
          "base-uri 'none'",
          "object-src 'none'",
          "form-action 'none'",
          `frame-ancestors ${manifest.parentOrigin}`,
          `script-src ${runtime}`,
          `style-src ${base}player.css`,
          `connect-src ${base} ${runtime} ${deployment}`,
          `frame-src ${runtime}`,
          'img-src data: blob:',
          'media-src blob:',
        ].join('; ')
      : "default-src 'none'; sandbox; frame-ancestors 'none'; base-uri 'none'"
    const type = executable
      ? 'text/html; charset=utf-8'
      : file.role === 'stylesheet'
        ? 'text/css; charset=utf-8'
        : ['payload', 'validation'].includes(file.role)
          ? 'application/json; charset=utf-8'
          : file.role === 'capture'
            ? 'image/png'
            : 'application/octet-stream'
    const headers = new Headers({
      'Content-Type': type,
      'Content-Length': String(file.bytes),
      ETag: `"${file.sha256}"`,
      'Cache-Control': 'no-store',
      'Content-Security-Policy': csp,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Access-Control-Allow-Origin': manifest.parentOrigin,
      Vary: 'Origin',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      ...(file.role === 'project' ? { 'Content-Disposition': 'attachment' } : {}),
    })
    if (request.method === 'HEAD') {
      await cancel()
      return new Response(null, { headers })
    }
    const response = new Response(object.body, { headers })
    pending = undefined
    return response
  } catch {
    return unavailableArtifact()
  } finally {
    await cancel().catch(() => {})
  }
}

/** Separate prefix/cursor. Never touches shared runtimes, private inputs or permanent Mural revisions. */
export async function collectPythonPreviewGarbage(options: {
  bucket: PythonInputGcBucket
  cursor: { load(): Promise<string | undefined>; save(cursor?: string): Promise<void> }
  signal?: AbortSignal
  now?: () => number
}) {
  const { bucket, cursor: checkpoint, now } = options
  const signal = AbortSignal.any([
    ...(options.signal ? [options.signal] : []),
    AbortSignal.timeout(25_000),
  ])
  const cursor = await inputAwait(checkpoint.load(), signal)
  if (cursor !== undefined && (typeof cursor !== 'string' || cursor.length > 2048))
    throw new Error('Cursor de previews inválido.')
  const page = await inputAwait(
    bucket.list({
      prefix: PYTHON_PREVIEW_RECORD_PREFIX,
      limit: 100,
      ...(cursor ? { cursor } : {}),
    }),
    signal,
  )
  if (page.objects.length > 100 || (page.truncated && !page.cursor))
    throw new Error('Página de previews inválida.')
  let removed = 0,
    failed = 0
  for (const entry of page.objects) {
    const id = /^python-preview-records\/([a-f0-9]{64})\.json$/.exec(entry.key)?.[1]
    if (!id) continue
    let record: Awaited<ReturnType<typeof readPreviewRecord>>
    try {
      record = await readPreviewRecord(bucket, id, signal)
    } catch (error) {
      signal.throwIfAborted()
      if (
        !(error instanceof PythonPreviewRecordError) &&
        !(error instanceof PythonFileVerificationError)
      )
        throw error
      failed++
      continue
    }
    if (!record || record.manifest.expiresAt > (now?.() ?? Date.now())) continue
    await inputAwait(
      bucket.delete([
        ...record.manifest.files.map((file) => `${pythonPreviewPrefix(id)}files/${file.path}`),
        `${pythonPreviewPrefix(id)}complete.json`,
      ]),
      signal,
    )
    // Preserve the record on an uncertain delete; retry this page before advancing its cursor.
    await inputAwait(bucket.delete([entry.key]), signal)
    removed++
  }
  signal.throwIfAborted()
  await inputAwait(checkpoint.save(page.truncated ? page.cursor : undefined), signal)
  signal.throwIfAborted()
  return { scanned: page.objects.length, removed, failed }
}
