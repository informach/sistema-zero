import type { Logger } from '@sistemazero/core/logging'
import { CourseNotFoundError } from '../../domain/course/course.errors'
import { EntitlementAggregate } from '../../domain/entitlement/entitlement.aggregate'
import {
  EntitlementConflictError,
  InvalidEntitlementCommandError,
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
 * (NÃO o motor de webhook, que tem `sourceKind` fixo). Três modalidades:
 * - `offer`: resolve a oferta no catálogo e congela o snapshot, igual a uma compra.
 * - `course`: concede direto um curso (sem oferta), com snapshot sintético.
 * - `all_courses`: chave-mestra ADULTA (todos os cursos adult, atuais e futuros), sem oferta.
 * - `all_kids_courses`: chave-mestra KIDS (todos os cursos kids), sem oferta.
 *
 * Idempotente por `manual:${userId}:${productId}` (+ índice único user/product/source):
 * re-conceder o MESMO produto a um membro com matrícula manual ATIVA devolve a
 * existente; se a existente estiver revogada/expirada, falha 409 (use estender).
 */
export type GrantManualCommand =
  | { mode: 'offer'; userId: string; offerRef: string; expiresAt?: Date | null }
  | { mode: 'course'; userId: string; courseRef: string; expiresAt?: Date | null }
  | { mode: 'all_courses'; userId: string; expiresAt?: Date | null }
  | { mode: 'all_kids_courses'; userId: string; expiresAt?: Date | null }

/**
 * `product_id` sintético das chaves-mestra MANUAIS (a coluna é uuid NOT NULL e não há
 * produto do catálogo envolvido). Constantes DISTINTAS → o índice único user/product/
 * source deduplica re-concessões de cada chave SEM as duas colidirem entre si. Grants
 * via OFERTA usam o productId REAL do produto do catálogo — não colidem com estes sentinels.
 */
export const MANUAL_ALL_COURSES_PRODUCT_ID = '00000000-0000-0000-0000-000000000000'
export const MANUAL_ALL_KIDS_COURSES_PRODUCT_ID = '00000000-0000-0000-0000-000000000001'
const MANUAL_SAVE_MAX_ATTEMPTS = 2

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
    switch (cmd.mode) {
      case 'offer':
        return this.grantByOffer(cmd.userId, cmd.offerRef, expiresAt, now)
      case 'course':
        return this.grantByCourse(cmd.userId, cmd.courseRef, expiresAt, now)
      case 'all_courses':
        return this.grantAllCourses(cmd.userId, expiresAt, now)
      case 'all_kids_courses':
        return this.grantAllKidsCourses(cmd.userId, expiresAt, now)
    }
  }

  private async grantByOffer(
    userId: string,
    offerRef: string,
    expiresAt: Date | null,
    now: Date,
  ): Promise<GrantManualResult> {
    const offer = await this.deps.catalog.resolveOfferEntitlements(offerRef)
    if (!offer) throw new OfferNotFoundError()
    // Oferta sem nenhum item resolvível (drift de contrato no catálogo) — o admin
    // precisa ver o erro, não um 201 vazio que parece sucesso.
    if (offer.items.length === 0) {
      throw new InvalidEntitlementCommandError(
        'A oferta foi resolvida mas não entrega nenhum item — verifique o catálogo',
      )
    }

    const granted: AdminEntitlementView[] = []
    const grants: GrantOneInput[] = []
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
      grants.push({
        userId,
        productId: item.productId,
        productKind: item.kind,
        accessType: snapshot.accessType,
        courseRef: snapshot.courseRef,
        offerId: offer.offerId,
        snapshot,
        expiresAt,
        now,
      })
    }
    granted.push(...(await this.grantMany(grants)))
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

  private async grantAllCourses(
    userId: string,
    expiresAt: Date | null,
    now: Date,
  ): Promise<GrantManualResult> {
    // Chave-mestra de cortesia: snapshot sintético, sem oferta nem curso específico.
    const snapshot: EntitlementSnapshot = {
      offerId: '',
      offerSlug: '',
      productId: MANUAL_ALL_COURSES_PRODUCT_ID,
      sku: '',
      name: 'Todos os cursos',
      kind: 'course',
      accessType: 'all_courses',
      courseRef: null,
      fulfillment: { accessType: 'all_courses' },
      resolvedAt: now.toISOString(),
    }
    const view = await this.grantOne({
      userId,
      productId: MANUAL_ALL_COURSES_PRODUCT_ID,
      productKind: 'course',
      accessType: 'all_courses',
      courseRef: null,
      offerId: null,
      snapshot,
      expiresAt,
      now,
    })
    this.deps.logger?.info('grant.manual.all_courses', { userId })
    return { granted: [view] }
  }

  private async grantAllKidsCourses(
    userId: string,
    expiresAt: Date | null,
    now: Date,
  ): Promise<GrantManualResult> {
    // Chave-mestra KIDS de cortesia: cobre todos os cursos kids (atuais e futuros).
    const snapshot: EntitlementSnapshot = {
      offerId: '',
      offerSlug: '',
      productId: MANUAL_ALL_KIDS_COURSES_PRODUCT_ID,
      sku: '',
      name: 'Todos os cursos kids',
      kind: 'course',
      accessType: 'all_kids_courses',
      courseRef: null,
      fulfillment: { accessType: 'all_kids_courses' },
      resolvedAt: now.toISOString(),
    }
    const view = await this.grantOne({
      userId,
      productId: MANUAL_ALL_KIDS_COURSES_PRODUCT_ID,
      productKind: 'course',
      accessType: 'all_kids_courses',
      courseRef: null,
      offerId: null,
      snapshot,
      expiresAt,
      now,
    })
    this.deps.logger?.info('grant.manual.all_kids_courses', { userId })
    return { granted: [view] }
  }

  private async grantOne(p: GrantOneInput): Promise<AdminEntitlementView> {
    const [view] = await this.grantMany([p])
    if (!view) {
      throw new EntitlementConflictError('Não foi possível conceder a matrícula manual')
    }
    return view
  }

  private async grantMany(grants: GrantOneInput[]): Promise<AdminEntitlementView[]> {
    for (let attempt = 0; attempt < MANUAL_SAVE_MAX_ATTEMPTS; attempt++) {
      const views: AdminEntitlementView[] = []
      const pending: EntitlementAggregate[] = []

      for (const grant of grants) {
        const idempotencyKey = manualIdempotencyKey(grant)
        const existing = await this.deps.entitlements.findByIdempotencyKey(idempotencyKey)
        if (existing) {
          if (existing.isActiveAt(grant.now)) {
            views.push(toAdminEntitlementView(existing))
            continue
          }
          throwManualConflict()
        }

        const entitlement = buildManualEntitlement(grant, idempotencyKey, this.deps.newId())
        pending.push(entitlement)
        views.push(toAdminEntitlementView(entitlement))
      }

      if (pending.length === 0) return views
      if (await this.deps.entitlements.saveMany(pending)) return views

      // Corrida com outro grant manual: nenhum item do lote ficou persistido
      // (`saveMany` é transacional), então recarrega e tenta classificar de novo
      // como idempotente ativo ou conflito real.
      this.deps.logger?.warn('grant.manual.save_conflict', {
        attempt,
        items: grants.length,
      })
    }

    throw new EntitlementConflictError('Conflito de concorrência ao conceder a matrícula manual')
  }
}

function manualIdempotencyKey(p: GrantOneInput): string {
  return `manual:${p.userId}:${p.productId}`
}

function buildManualEntitlement(
  p: GrantOneInput,
  idempotencyKey: string,
  id: string,
): EntitlementAggregate {
  return EntitlementAggregate.grant({
    id,
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
}

function throwManualConflict(): never {
  throw new EntitlementConflictError(
    'Já existe uma matrícula manual para este produto (revogada/expirada). Use estender para reativar.',
  )
}
