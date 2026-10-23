import type { SourceConfig } from 'railway/iac'

// Literal metadata qualified after all18 native autodeploys were disabled.
// Absent branch/checkSuites are intentional; github() would inject main.
export const PRODUCTION_APPLICATION_NAMES = [
  'admin',
  'api-gateway',
  'auth',
  'catalog',
  'community',
  'community-kids',
  'fiscal',
  'funnel',
  'helpdesk',
  'helpdesk-app',
  'hub',
  'live-recorder',
  'marketing',
  'marketing-app',
  'members',
  'messaging',
  'payments',
  'referrals',
] as const

type ProductionApplicationName = (typeof PRODUCTION_APPLICATION_NAMES)[number]

export const PRODUCTION_GITHUB_SOURCES = Object.freeze({
  admin: Object.freeze({
    type: 'github',
    branch: 'main',
    repo: 'informach/sistema-zero',
    rootDirectory: '/',
  }),
  'api-gateway': Object.freeze({
    type: 'github',
    branch: 'main',
    repo: 'informach/sistema-zero',
    rootDirectory: '/',
  }),
  auth: Object.freeze({
    type: 'github',
    branch: 'main',
    repo: 'informach/sistema-zero',
    rootDirectory: '/',
  }),
  catalog: Object.freeze({
    type: 'github',
    branch: 'main',
    repo: 'informach/sistema-zero',
    rootDirectory: '/',
  }),
  community: Object.freeze({
    type: 'github',
    branch: 'main',
    repo: 'informach/sistema-zero',
    rootDirectory: '/',
  }),
  'community-kids': Object.freeze({
    type: 'github',
    branch: 'main',
    repo: 'informach/sistema-zero',
    rootDirectory: '/',
  }),
  fiscal: Object.freeze({
    type: 'github',
    repo: 'informach/sistema-zero',
  }),
  funnel: Object.freeze({
    type: 'github',
    branch: 'main',
    repo: 'informach/sistema-zero',
    rootDirectory: '/',
  }),
  helpdesk: Object.freeze({
    type: 'github',
    repo: 'informach/sistema-zero',
  }),
  'helpdesk-app': Object.freeze({
    type: 'github',
    repo: 'informach/sistema-zero',
  }),
  hub: Object.freeze({
    type: 'github',
    repo: 'informach/sistema-zero',
  }),
  'live-recorder': Object.freeze({
    type: 'github',
    branch: 'main',
    repo: 'informach/sistema-zero',
    rootDirectory: '/',
  }),
  marketing: Object.freeze({
    type: 'github',
    repo: 'informach/sistema-zero',
  }),
  'marketing-app': Object.freeze({
    type: 'github',
    repo: 'informach/sistema-zero',
  }),
  members: Object.freeze({
    type: 'github',
    branch: 'main',
    repo: 'informach/sistema-zero',
    rootDirectory: '/',
  }),
  messaging: Object.freeze({
    type: 'github',
    branch: 'main',
    repo: 'informach/sistema-zero',
    rootDirectory: '/',
  }),
  payments: Object.freeze({
    type: 'github',
    branch: 'main',
    repo: 'informach/sistema-zero',
    rootDirectory: '/',
  }),
  referrals: Object.freeze({
    type: 'github',
    repo: 'informach/sistema-zero',
  }),
} satisfies Record<ProductionApplicationName, SourceConfig>)

export function productionSource(name: string): SourceConfig {
  const known = PRODUCTION_APPLICATION_NAMES.find((candidate) => candidate === name)
  if (!known) throw new Error('Aplicação sem origem de produção homologada')
  return PRODUCTION_GITHUB_SOURCES[known]
}
