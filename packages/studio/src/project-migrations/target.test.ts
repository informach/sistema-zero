import { expect, test } from 'bun:test'
import { assertTarget, migrationTarget, remoteGuard } from '../../scripts/project-migrations/target'

test('exige ambiente explícito e recusa destinos misturados no arquivo do lote', () => {
  expect(() => migrationTarget(undefined)).toThrow('--environment')
  expect(() => migrationTarget('prod')).toThrow('--environment')
  const staging = migrationTarget('staging')
  const production = migrationTarget('production')
  expect(() => assertTarget({ ...production, buckets: staging.buckets })).toThrow('buckets')
  expect(() => assertTarget({ ...production, environmentId: staging.environmentId })).toThrow(
    'Destino',
  )
  expect(() => assertTarget(staging, production)).toThrow('Destino')
})

test('o código enviado ao Railway recusa ambiente, projeto ou bucket incorreto antes de executar', () => {
  for (const environment of ['staging', 'production']) {
    const target = migrationTarget(environment)
    const env = {
      RAILWAY_PROJECT_ID: target.project,
      RAILWAY_ENVIRONMENT_NAME: target.environment,
      RAILWAY_ENVIRONMENT_ID: target.environmentId,
      R2_UGC_BUCKET: target.buckets.ugc,
      R2_PRIVATE_BUCKET: target.buckets.private,
    }
    const evaluate = new Function('process', `${remoteGuard(target, true)}return 'permitido'`)
    expect(evaluate({ env })).toBe('permitido')
    for (const key of Object.keys(env))
      expect(() => evaluate({ env: { ...env, [key]: 'outro-destino' } })).toThrow(key)
  }
})
