import { describe, expect, test } from 'bun:test'
import { GetProfileAllowanceService } from '../../src/application/profile-allowance/get-profile-allowance.service'
import { EntitlementAggregate } from '../../src/domain/entitlement/entitlement.aggregate'
import type { FulfillmentSpec } from '../../src/domain/entitlement/fulfillment'
import { InMemoryEntitlementRepository } from '../fakes/in-memory'

const T = (s: string) => new Date(s)
const NOW = T('2026-06-15')

let seq = 0
function grant(opts: {
  userId: string
  maxProfiles?: number
  expiresAt?: Date | null
  courseRef?: string
}): EntitlementAggregate {
  seq += 1
  const courseRef = opts.courseRef ?? 'kids-curso'
  const fulfillment: FulfillmentSpec | null =
    opts.maxProfiles === undefined
      ? null
      : { accessType: 'course', courseRef, maxProfiles: opts.maxProfiles }
  return EntitlementAggregate.grant({
    id: `e${seq}`,
    userId: opts.userId,
    productId: `p${seq}`,
    productKind: 'course',
    accessType: 'course',
    courseRef,
    offerId: `o${seq}`,
    snapshot: {
      offerId: `o${seq}`,
      offerSlug: 'o',
      productId: `p${seq}`,
      sku: 's',
      name: 'n',
      kind: 'course',
      accessType: 'course',
      courseRef,
      fulfillment,
      resolvedAt: NOW.toISOString(),
    },
    sourceKind: 'payment',
    sourceId: `pay${seq}`,
    grantedAt: T('2026-01-01'),
    expiresAt: opts.expiresAt ?? null,
    idempotencyKey: `k${seq}`,
  })
}

function service(repo: InMemoryEntitlementRepository, defaultMaxProfiles = 1) {
  return new GetProfileAllowanceService(repo, () => NOW, { defaultMaxProfiles })
}

describe('GetProfileAllowanceService', () => {
  test('vagas de oficinas permitem perfis antes da aula sem conceder produto, e plano maior prevalece', async () => {
    const repo = new InMemoryEntitlementRepository()
    const live = new GetProfileAllowanceService(
      repo,
      () => NOW,
      { defaultMaxProfiles: 1 },
      { maxProfiles: async () => 2 },
    )
    expect(await live.execute('pai')).toEqual({ maxProfiles: 2 })
    repo.seed(grant({ userId: 'pai', maxProfiles: 4 }))
    expect(await live.execute('pai')).toEqual({ maxProfiles: 4 })
  })
  test('conta sem matrícula ativa → 0 (não comprou, não cria perfil)', async () => {
    const repo = new InMemoryEntitlementRepository()
    expect(await service(repo).execute('conta-sem-compra')).toEqual({ maxProfiles: 0 })
  })

  test('matrícula define maxProfiles → usa o valor', async () => {
    const repo = new InMemoryEntitlementRepository()
    repo.seed(grant({ userId: 'pai', maxProfiles: 2 }))
    expect(await service(repo).execute('pai')).toEqual({ maxProfiles: 2 })
  })

  test('upgrade de plano (2 e 4 ativos) → o MAIOR', async () => {
    const repo = new InMemoryEntitlementRepository()
    repo.seed(grant({ userId: 'pai', maxProfiles: 2 }))
    repo.seed(grant({ userId: 'pai', maxProfiles: 4 }))
    expect(await service(repo).execute('pai')).toEqual({ maxProfiles: 4 })
  })

  test('matrícula ativa SEM o campo (legado) → default', async () => {
    const repo = new InMemoryEntitlementRepository()
    repo.seed(grant({ userId: 'pai' }))
    expect(await service(repo, 3).execute('pai')).toEqual({ maxProfiles: 3 })
  })

  test('matrícula EXPIRADA não conta', async () => {
    const repo = new InMemoryEntitlementRepository()
    repo.seed(grant({ userId: 'pai', maxProfiles: 4, expiresAt: T('2026-01-10') }))
    expect(await service(repo).execute('pai')).toEqual({ maxProfiles: 0 })
  })

  describe('curso para pais', () => {
    const cursos = {
      findAccessibleCoursesBySlugs: async (slugs: string[], learner?: string) =>
        learner === 'parents'
          ? slugs.filter((slug) => slug === 'curso-pais').map((slug) => ({ slug }) as never)
          : [],
    }
    const comCursos = (repo: InMemoryEntitlementRepository) =>
      new GetProfileAllowanceService(repo, () => NOW, { defaultMaxProfiles: 3 }, undefined, cursos)

    test('quem comprou só um curso para pais não libera perfil de filho (nem o teto do legado)', async () => {
      const repo = new InMemoryEntitlementRepository()
      repo.seed(grant({ userId: 'pai', courseRef: 'curso-pais' }))
      expect(await comCursos(repo).execute('pai')).toEqual({ maxProfiles: 0 })
    })

    test('com uma compra para a criança, vale a régua de sempre', async () => {
      const repo = new InMemoryEntitlementRepository()
      repo.seed(grant({ userId: 'pai', courseRef: 'curso-pais' }))
      repo.seed(grant({ userId: 'pai', maxProfiles: 2 }))
      expect(await comCursos(repo).execute('pai')).toEqual({ maxProfiles: 2 })
      const legado = new InMemoryEntitlementRepository()
      legado.seed(grant({ userId: 'pai', courseRef: 'curso-pais' }))
      legado.seed(grant({ userId: 'pai' }))
      expect(await comCursos(legado).execute('pai')).toEqual({ maxProfiles: 3 })
    })
  })

  test('só a matrícula de outra conta tem o campo → não vaza', async () => {
    const repo = new InMemoryEntitlementRepository()
    repo.seed(grant({ userId: 'outro-pai', maxProfiles: 4 }))
    expect(await service(repo).execute('pai')).toEqual({ maxProfiles: 0 })
  })
})
