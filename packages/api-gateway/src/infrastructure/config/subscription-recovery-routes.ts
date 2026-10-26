import type { GatewayConfigInput } from './gateway-config.schema'

type Route = NonNullable<GatewayConfigInput['routes']>[number]
/** Explicit routes: no wildcard may turn a read-only staff account into a financial operator. */
export function subscriptionRecoveryRoutes(transforms: Route['transforms']): Route[] {
  const admin: Route[] = [
    {
      id: 'payments-admin-recovery-review',
      methods: ['GET'],
      pathPattern: '/payments/admin/subscription-recovery/review',
      service: 'payments',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    ...[
      ['confirm-period', 'payments/:id/confirm-period'],
      ['admit', 'payments/:id/admit'],
      ['confirm-payment', 'operations/:id/confirm-payment'],
      ['resolve-subsequent-payment', 'cases/:id/resolve-subsequent-payment'],
    ].map<Route>(([id, path]) => ({
      id: `payments-admin-recovery-${id}`,
      methods: ['POST'],
      pathPattern: `/payments/admin/subscription-recovery/${path}`,
      service: 'payments',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      transforms,
      maxBodyBytes: 1024,
      audit: {},
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
    })),
  ]
  const purchaser = ['retry-intents', 'retry-intents/:intentId'].flatMap((suffix, index) =>
    ['GET', 'POST'].map<Route>((method) => ({
      id: `payments-my-retry-${index ? 'intent' : 'active'}-${method.toLowerCase()}`,
      methods: [method === 'GET' ? 'GET' : 'POST'],
      pathPattern: `/payments/my/subscriptions/:id/${suffix}`,
      service: 'payments',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms,
      rateLimit: { max: method === 'GET' ? 120 : 10, windowMs: 60_000, by: 'principal' },
      ...(method === 'POST' ? { maxBodyBytes: 1024, audit: {} } : {}),
    })),
  )
  return [...admin, ...purchaser]
}
