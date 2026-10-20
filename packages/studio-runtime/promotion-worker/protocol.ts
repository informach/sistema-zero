import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import {
  StudioPythonRuntimeConfigurationSchema,
  verifyStudioPythonDeployment,
} from '@sistemazero/core/studio/python-runtime-distribution'
import { z } from 'zod'
import { sha256 } from '../src/artifacts'
import { describePythonRuntimeConfiguration } from '../src/python-configuration-storage'

export const PROMOTION_FRAME_LIMIT = 32 * 1024 * 1024
export const PROMOTION_FILE_LIMIT = 512
export const PROMOTION_WINDOW_MS = 30 * 60_000
export const REQUEST_WINDOW_MS = 5 * 60_000
const magic = new TextEncoder().encode('SZPYPR01')
const hash = z.string().regex(/^[a-f0-9]{64}$/)
const origin = z.string().refine((value) => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.origin === value && !url.username && !url.password
  } catch {
    return false
  }
})

export const OperationalApprovalSchema = z.strictObject({
  version: z.literal(1),
  kind: z.literal('studio.python.operational-promotion-approval'),
  planSha256: hash,
  distributionSha256: hash,
  qualificationSha256: hash,
  workerName: z.string().regex(/^sistemazero-python-promoter-(staging|production)-[a-f0-9]{12}$/),
  operatorOrigin: origin,
  notBefore: z.number().int().nonnegative(),
  expiresAt: z.number().int().positive(),
})
export type OperationalApproval = z.infer<typeof OperationalApprovalSchema>

const planSchema = z.strictObject({
  version: z.literal(1),
  kind: z.literal('studio.python.operational-promotion'),
  approval: OperationalApprovalSchema,
  environment: z.enum(['staging', 'production']),
  accountId: z.string().regex(/^[a-f0-9]{32}$/),
  bucketName: z.enum(['sistemazero-studio-artifacts-staging', 'sistemazero-studio-artifacts']),
  deployment: z.unknown(),
  configuration: z.unknown(),
  frameSha256: hash,
  frameBytes: z.number().int().positive().max(PROMOTION_FRAME_LIMIT),
  operationalSha256: hash,
})

export function promotionFrameBytes(files: readonly { bytes: number }[]) {
  if (files.length < 1 || files.length > PROMOTION_FILE_LIMIT)
    throw new Error('Promotion frame file count refused.')
  let bytes = 12
  for (const file of files) {
    if (!Number.isSafeInteger(file.bytes) || file.bytes < 0)
      throw new Error('Promotion file length refused.')
    bytes += 4 + file.bytes
    if (!Number.isSafeInteger(bytes) || bytes > PROMOTION_FRAME_LIMIT)
      throw new Error('Promotion frame budget exceeded.')
  }
  return bytes
}

export async function captureOperationalPlan(raw: unknown) {
  const plan = planSchema.parse(structuredClone(raw))
  const { operationalSha256, ...body } = plan
  if ((await sha256Hex(canonicalJson(body))) !== operationalSha256)
    throw new Error('Operational plan digest refused.')
  const { approval } = plan
  if (
    approval.expiresAt <= approval.notBefore ||
    approval.expiresAt - approval.notBefore > PROMOTION_WINDOW_MS ||
    approval.workerName !==
      `sistemazero-python-promoter-${plan.environment}-${approval.planSha256.slice(0, 12)}` ||
    plan.bucketName !==
      (plan.environment === 'staging'
        ? 'sistemazero-studio-artifacts-staging'
        : 'sistemazero-studio-artifacts')
  )
    throw new Error('Operational approval boundary refused.')
  const verifiedDeployment = await verifyStudioPythonDeployment(plan.deployment)
  const deployment = {
    release: verifiedDeployment.release,
    distribution: verifiedDeployment.distribution,
  }
  if (
    (await sha256Hex(canonicalJson(deployment.distribution))) !== approval.distributionSha256 ||
    promotionFrameBytes(deployment.distribution.files) !== plan.frameBytes
  )
    throw new Error('Operational distribution boundary refused.')
  const configuration = StudioPythonRuntimeConfigurationSchema.parse(plan.configuration)
  if (
    !configuration.deployments.some(
      (item) => canonicalJson(item.deployment) === canonicalJson(deployment),
    )
  )
    throw new Error('Operational configuration excludes deployment.')
  const descriptor = await describePythonRuntimeConfiguration(configuration)
  return { ...plan, deployment, verifiedDeployment, configuration, descriptor }
}
export type OperationalPlan = Awaited<ReturnType<typeof captureOperationalPlan>>

/** One owned buffer; every file is a view, never a payload-provided path. */
export function frameFiles(
  frame: Uint8Array<ArrayBuffer>,
  files: readonly { path: string; bytes: number }[],
) {
  if (frame.byteLength !== promotionFrameBytes(files)) throw new Error('Frame size refused.')
  const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength)
  if (magic.some((value, index) => frame[index] !== value) || view.getUint32(8) !== files.length)
    throw new Error('Frame header refused.')
  let offset = 12
  const captured = new Map<string, Uint8Array<ArrayBuffer>>()
  for (const file of files) {
    if (view.getUint32(offset) !== file.bytes || captured.has(file.path))
      throw new Error('Frame ordering refused.')
    offset += 4
    captured.set(file.path, frame.subarray(offset, offset + file.bytes))
    offset += file.bytes
  }
  if (offset !== frame.byteLength) throw new Error('Frame trailing bytes refused.')
  return captured
}

export function encodePromotionFrame(
  files: readonly { path: string; bytes: number }[],
  contents: ReadonlyMap<string, Uint8Array<ArrayBuffer>>,
) {
  const frame = new Uint8Array(promotionFrameBytes(files))
  frame.set(magic)
  const view = new DataView(frame.buffer)
  view.setUint32(8, files.length)
  let offset = 12
  for (const file of files) {
    const bytes = contents.get(file.path)
    if (!bytes || bytes.byteLength !== file.bytes) throw new Error('Frame source refused.')
    view.setUint32(offset, bytes.byteLength)
    offset += 4
    frame.set(bytes, offset)
    offset += bytes.byteLength
  }
  frameFiles(frame, files)
  return frame
}

function hmacBytes(key: string) {
  if (!/^[a-f0-9]{64}$/.test(key)) throw new Error('Operator key unavailable.')
  return new Uint8Array(key.match(/../g)!.map((pair) => Number.parseInt(pair, 16)))
}
function authMessage(plan: OperationalPlan, versionId: string, nonce: string, expires: string) {
  return new TextEncoder().encode(
    [
      'SZ-PROMOTION-1',
      plan.operationalSha256,
      plan.approval.planSha256,
      versionId,
      nonce,
      expires,
      plan.frameSha256,
    ].join('\n'),
  )
}
export async function promotionAuthorization(options: {
  plan: OperationalPlan
  versionId: string
  nonce: string
  expiresAt: number
  key: string
}) {
  const key = await crypto.subtle.importKey(
    'raw',
    hmacBytes(options.key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    authMessage(options.plan, options.versionId, options.nonce, String(options.expiresAt)),
  )
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  )
}
export async function authorizePromotion(
  request: Request,
  plan: OperationalPlan,
  keyHex: string,
  versionId: string,
  now: number,
) {
  const url = new URL(request.url),
    nonce = request.headers.get('X-Promotion-Nonce') ?? ''
  const expires = request.headers.get('X-Promotion-Expires') ?? ''
  const signature = request.headers
    .get('Authorization')
    ?.match(/^SZ-Promotion-1 ([a-f0-9]{64})$/)?.[1]
  if (
    !Number.isSafeInteger(now) ||
    request.method !== 'POST' ||
    url.origin !== plan.approval.operatorOrigin ||
    url.pathname !== `/execute/${plan.operationalSha256}` ||
    url.search ||
    !/^[a-f0-9]{32}$/.test(nonce) ||
    !/^\d{13}$/.test(expires) ||
    !signature ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(versionId) ||
    request.headers.get('X-Promotion-Version') !== versionId ||
    now < plan.approval.notBefore ||
    now >= plan.approval.expiresAt ||
    Number(expires) <= now ||
    Number(expires) > Math.min(now + REQUEST_WINDOW_MS, plan.approval.expiresAt) ||
    request.headers.get('Content-Type') !== 'application/vnd.sistemazero.python-promotion' ||
    request.headers.get('Content-Length') !== String(plan.frameBytes)
  )
    throw new Error('Operator request refused.')
  const key = await crypto.subtle.importKey(
    'raw',
    hmacBytes(keyHex),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  if (
    !(await crypto.subtle.verify(
      'HMAC',
      key,
      hmacBytes(signature),
      authMessage(plan, versionId, nonce, expires),
    ))
  )
    throw new Error('Operator request refused.')
  return nonce
}

/** Private operator builds a request only; this function never fetches or reads credentials. */
export async function createPromotionRequest(options: {
  plan: OperationalPlan
  frame: Uint8Array<ArrayBuffer>
  key: string
  versionId: string
  nonce: string
  expiresAt: number
}) {
  if (
    options.frame.byteLength !== options.plan.frameBytes ||
    (await sha256(options.frame)) !== options.plan.frameSha256
  )
    throw new Error('Operator payload differs from approved frame.')
  const signature = await promotionAuthorization(options)
  return new Request(
    `${options.plan.approval.operatorOrigin}/execute/${options.plan.operationalSha256}`,
    {
      method: 'POST',
      body: options.frame,
      headers: {
        Authorization: `SZ-Promotion-1 ${signature}`,
        'X-Promotion-Nonce': options.nonce,
        'X-Promotion-Expires': String(options.expiresAt),
        'X-Promotion-Version': options.versionId,
        'Content-Type': 'application/vnd.sistemazero.python-promotion',
        'Content-Length': String(options.frame.byteLength),
      },
    },
  )
}
