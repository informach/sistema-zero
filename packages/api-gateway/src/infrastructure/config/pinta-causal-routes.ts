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
  ] as const
  return paths.map(([path, maxBodyBytes]) => ({
    id: `members-pinta-causal-${path.replace('/', '-')}`,
    pathPattern: `/members/internal/creations/pinta/${path}`,
    methods: ['POST'],
    service: 'members',
    auth: { required: true, mode: 'any', strategies: ['hmac'], allowedConsumers: ['member-shell'] },
    transforms,
    maxBodyBytes,
    rateLimit: { max: 600, windowMs: 60_000, by: 'json-field', field: 'accountId' },
  }))
}
