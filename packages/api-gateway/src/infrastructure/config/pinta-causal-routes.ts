import type { GatewayConfigInput } from './gateway-config.schema'

type Route = NonNullable<GatewayConfigInput['routes']>[number]

const SMALL_BODY_BYTES = 16 * 1024
const PAGE_OR_ATTESTATION_BYTES = 2 * 1024 * 1024

/** The gateway authenticates the service reporting storage facts, never a learner's JWT. */
export function pintaCausalRoutes(transforms: Route['transforms']): Route[] {
  const paths = [
    ['graph/page', SMALL_BODY_BYTES],
    ['graph/item', SMALL_BODY_BYTES],
    ['units/reserve', PAGE_OR_ATTESTATION_BYTES],
    ['units/status', SMALL_BODY_BYTES],
    ['units/member', SMALL_BODY_BYTES],
    ['units/attest', PAGE_OR_ATTESTATION_BYTES],
    ['units/commit', SMALL_BODY_BYTES],
    ['units/abort', SMALL_BODY_BYTES],
    ['backfill/ticket', SMALL_BODY_BYTES],
    ['backfill/attest', PAGE_OR_ATTESTATION_BYTES],
    ['palette/head', SMALL_BODY_BYTES],
    ['palette/reserve', SMALL_BODY_BYTES],
    ['palette/ticket', SMALL_BODY_BYTES],
    ['palette/commit', SMALL_BODY_BYTES],
    ['palette/delete', SMALL_BODY_BYTES],
  ] as const
  return verifiedStorageRoutes('pinta', 'pinta-causal', paths, transforms)
}

export function studioSealedRoutes(transforms: Route['transforms']): Route[] {
  return verifiedStorageRoutes(
    'studio',
    'studio-sealed',
    [
      ['seal/head', SMALL_BODY_BYTES],
      ['seal/reserve', PAGE_OR_ATTESTATION_BYTES],
      ['seal/ticket', SMALL_BODY_BYTES],
      ['seal/commit', PAGE_OR_ATTESTATION_BYTES],
      ['seal/delete', SMALL_BODY_BYTES],
    ],
    transforms,
  )
}

function verifiedStorageRoutes(
  tool: 'pinta' | 'studio',
  namespace: string,
  paths: readonly (readonly [string, number])[],
  transforms: Route['transforms'],
): Route[] {
  return paths.map(([path, maxBodyBytes]) => ({
    id: `members-${namespace}-${path.replace('/', '-')}`,
    pathPattern: `/members/internal/creations/${tool}/${path}`,
    methods: ['POST'],
    service: 'members',
    auth: { required: true, mode: 'any', strategies: ['hmac'], allowedConsumers: ['member-shell'] },
    transforms,
    maxBodyBytes,
    rateLimit: { max: 600, windowMs: 60_000, by: 'json-field', field: 'accountId' },
  }))
}
