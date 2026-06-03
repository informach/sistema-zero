import type { Logger } from '@sistemazero/core/logging'
import { CourseNotFoundError } from '../../domain/course/course.errors'
import { EntitlementAggregate } from '../../domain/entitlement/entitlement.aggregate'
import {
  EntitlementConflictError,
  OfferNotFoundError,
} from '../../domain/entitlement/entitlement.errors'
import type { EntitlementSnapshot } from '../../domain/entitlement/entitlement-snapshot'
import type { AccessType } from '../../domain/entitlement/fulfillment'
import type { CatalogGateway } from '../../domain/ports/catalog-gateway.port'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { EntitlementRepository } from '../../domain/ports/entitlement-repository.port'
import { type AdminEntitlementView, toAdminEntitlementView } from '../mappers/admin-views'

/**
 * Concessão MANUAL pelo admin (cortesia/suporte/correção). Reusa o agregado + repo
 * (NÃO o motor de webhook, que tem `sourceKind` fixo). Duas modalidades:
 * - `offer`: resolve a oferta no catálogo e congela o snapshot, igual a uma compra.
 * - `course`: concede direto um curso (sem oferta), com snapshot sintético.
 *
 * Idempotente por `manual:${userId}:${productId}` (+ índice único user/product/source):
 * re-conceder o MESMO produto a um membro com matrícula manual ATIVA devolve a
 * existente; se a existente estiver revogada/expirada, falha 409 (use estender).
 */
export type GrantManualCommand =
  | { mode: 'offer'; userId: string; offerRef: string; expiresAt?: Date | null }
  | { mode: 'course'; userId: string; courseRef: string; expiresAt?: Date | null }

export interface GrantManualResult {
  granted: AdminEntitlementView[]
}

export interface GrantManualDeps {
  catalog: CatalogGateway
  courses: CourseRepository
  entitlements: EntitlementRepository
  newId: () => string
  clock: () => Date
  logger?: Logger
}

interface GrantOneInput {
  userId: string
  productId: string
  productKind: string
  accessType: AccessType
  courseRef: string | null
  offerId: string | null
  snapshot: EntitlementSnapshot
  expiresAt: Date | null
  now: Date
}

export class GrantManualEntitlementService {
  constructor(private readonly deps: GrantManualDeps) {}

  async execute(cmd: GrantManualCommand): Promise<GrantManualResult> {
    const now = this.deps.clock()
    const expiresAt = cmd.expiresAt ?? null
    return cmd.mode === 'offer'
      ? this.grantByOffer(cmd.userId, cmd.offerRef, expiresAt, now)
      : this.grantByCourse(cmd.userId, cmd.courseRef, expiresAt, now)
  }

  private async grantByOffer(
    userId: string,
    offerRef: string,
    expiresAt: Date | null,
    now: Date,
  ): Promise<GrantManualResult> {
    const offer = await this.deps.catalog.resolveOfferEntitlements(offerRef)
    if (!offer) throw new OfferNotFoundError()

    const granted: AdminEntitlementView[] = []
    for (const item of offer.items) {
      const snapshot: EntitlementSnapshot = {
        offerId: offer.offerId,
        offerSlug: offer.offerSlug,
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        kind: item.kind,
        accessType: item.fulfillment?.accessType ?? 'none',
        courseRef: item.fulfillment?.courseRef ?? null,
        fulfillment: item.fulfillment,
        resolvedAt: now.toISOString(),
      }
      granted.push(
        await this.grantOne({
          userId,
          productId: item.productId,
          productKind: item.kind,
          accessType: snapshot.accessType,
          courseRef: snapshot.courseRef,
          offerId: offer.offerId,
          snapshot,
          expiresAt,
          now,
        }),
      )
    }
    this.deps.logger?.info('grant.manual.offer', { userId, offerRef, granted: granted.length })
    return { granted }
  }

  private async grantByCourse(
    userId: string,
    courseRef: string,
    expiresAt: Date | null,
    now: Date,
  ): Promise<GrantManualResult> {
    const course = await this.deps.courses.findCourseBySlug(courseRef)
    if (!course) throw new CourseNotFoundError()

    // `product_id = course.id`: uuid estável → o índice de dedupe funciona (re-conceder
    // o mesmo curso ao mesmo membro colide em vez de duplicar). Snapshot sintético (sem oferta).
    const snapshot: EntitlementSnapshot = {
      offerId: '',
      offerSlug: '',
      productId: course.id,
      sku: '',
      name: course.title,
      kind: 'course',
      accessType: 'course',
      courseRef: course.slug,
      fulfillment: { accessType: 'course', courseRef: course.slug },
      resolvedAt: now.toISOString(),
    }
    const view = await this.grantOne({
      userId,
      productId: course.id,
      productKind: 'course',
      accessType: 'course',
      courseRef: course.slug,
      offerId: null,
      snapshot,
      expiresAt,
      now,
    })
    this.deps.logger?.info('grant.manual.course', { userId, courseRef })
    return { granted: [view] }
  }

  private async grantOne(p: GrantOneInput): Promise<AdminEntitlementView> {
    const idempotencyKey = `manual:${p.userId}:${p.productId}`
    const entitlement = EntitlementAggregate.grant({
      id: this.deps.newId(),
      userId: p.userId,
      productId: p.productId,
      productKind: p.productKind,
      accessType: p.accessType,
      courseRef: p.courseRef,
      offerId: p.offerId,
      snapshot: p.snapshot,
      sourceKind: 'manual',
      sourceId: 'manual',
      subscriptionId: null,
      grantedAt: p.now,
      expiresAt: p.expiresAt,
      idempotencyKey,
    })

    if (await this.deps.entitlements.save(entitlement)) return toAdminEntitlementView(entitlement)

    // Conflito num dos índices únicos → já existe uma matrícula manual p/ user+product.
    const existing = await this.deps.entitlements.findByIdempotencyKey(idempotencyKey)
    if (existing && existing.status === 'active') return toAdminEntitlementView(existing)
    throw new EntitlementConflictError(
      'Já existe uma matrícula manual para este produto (revogada/expirada). Use estender para reativar.',
    )
  }
}
