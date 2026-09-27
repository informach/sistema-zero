/** Destinos operacionais explícitos; nunca inferidos do vínculo local do Railway. */
const PROJECT = '415d5a1c-5f75-432c-8445-b395d0977ce3'
const TARGETS = {
  staging: {
    environment: 'staging',
    project: PROJECT,
    environmentId: 'f634cff6-aafb-4804-8b69-172fad4e946e',
    buckets: { ugc: 'testes-ugc', private: 'testes-privado' },
  },
  production: {
    environment: 'production',
    project: PROJECT,
    environmentId: '19c212a5-85c0-493c-9630-a7a0569e8412',
    buckets: {
      ugc: 'comunidade-sistema-zero-ugc',
      private: 'comunidade-sistema-zero-privado',
    },
  },
} as const

export interface MigrationTarget {
  environment: keyof typeof TARGETS
  project: string
  environmentId: string
  buckets: { ugc: string; private: string }
}

export function migrationTarget(environment: string | undefined): MigrationTarget {
  if (environment !== 'staging' && environment !== 'production')
    throw new Error('Informe --environment staging ou --environment production explicitamente')
  return structuredClone(TARGETS[environment])
}

export function assertTarget(target: MigrationTarget, expected?: MigrationTarget): void {
  if (!target) throw new Error('Destino ausente: recapture inventários anteriores ao formato 2')
  const known = migrationTarget(target.environment)
  if (
    target.project !== known.project ||
    target.environmentId !== known.environmentId ||
    target.buckets?.ugc !== known.buckets.ugc ||
    target.buckets?.private !== known.buckets.private ||
    (expected && target.environment !== expected.environment)
  )
    throw new Error('Destino do lote diverge do ambiente ou dos buckets autorizados')
  if (expected) assertTarget(expected)
}

export function remoteGuard(target: MigrationTarget, objects = false): string {
  assertTarget(target)
  const required = {
    RAILWAY_PROJECT_ID: target.project,
    RAILWAY_ENVIRONMENT_ID: target.environmentId,
    RAILWAY_ENVIRONMENT_NAME: target.environment,
    ...(objects
      ? { R2_UGC_BUCKET: target.buckets.ugc, R2_PRIVATE_BUCKET: target.buckets.private }
      : {}),
  }
  return `for(const [key,value] of Object.entries(${JSON.stringify(required)})){if(process.env[key]!==value)throw Error('Destino remoto recusado: '+key);}`
}
