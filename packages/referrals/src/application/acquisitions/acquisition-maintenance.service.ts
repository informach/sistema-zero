import type { Logger } from '@sistemazero/core/logging'
import { serializeError } from '@sistemazero/core/logging'
import { type BonusDefaults, giftAcquisition } from '../../domain/acquisition'
import type { AcquisitionRepository } from '../../domain/ports/acquisition-repository.port'
import type { CatalogClient } from '../../domain/ports/clients.port'

/** Até quantos dias depois de concluído um presente sem aquisição é tratado como falha recente. */
const RECENT_REPAIR_DAYS = 7

export interface AcquisitionMaintenanceConfig {
  defaults: BonusDefaults
  /**
   * Prazo do acordo capturado para presentes que viram aquisição pelo REPARO/backfill. Os
   * resgates de antes de 25/11/2026 aceitaram um acordo SEM prazo (o link pessoal valia para
   * sempre): o backfill os grava com um prazo longo para não tirar o bônus de quem já tinha.
   */
  repairWindowDays: number
  batchSize: number
  /** Slugs da Comunidade: a compra dessas ofertas é assinatura, mesmo no anual à vista. */
  conversionOfferSlugs: string[]
}

/**
 * Manutenção das aquisições, no ciclo do sweep:
 * - presentes concluídos sem aquisição (o registro best-effort falhou, ou resgates anteriores à
 *   0013) viram aquisição `gift` com o acordo do resgate;
 * - compras gravadas sem o slug da oferta (o catálogo não foi consultado no caminho quente)
 *   recebem o slug, para os relatórios.
 */
export class AcquisitionMaintenanceService {
  constructor(
    private readonly acquisitions: AcquisitionRepository,
    private readonly catalog: CatalogClient,
    private readonly config: AcquisitionMaintenanceConfig,
    private readonly logger: Logger,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Devolve quantas aquisições de presente foram criadas. */
  async repairGifts(limit = this.config.batchSize): Promise<number> {
    const pending = await this.acquisitions.listCompletedRedemptionsWithoutAcquisition(limit)
    let created = 0
    for (const { redemption, code } of pending) {
      const completedAt = redemption.completedAt ?? redemption.createdAt
      // Falha recente do registro em tempo real: o acordo é o de hoje. Presente antigo (o
      // backfill da 0013): o acordo dele não tinha prazo, então o prazo é o longo.
      const recent = this.now().getTime() - completedAt.getTime() <= RECENT_REPAIR_DAYS * 86_400_000
      try {
        const result = await this.acquisitions.insert(
          giftAcquisition(redemption, code, completedAt, {
            ...this.config.defaults,
            windowDays: recent ? this.config.defaults.windowDays : this.config.repairWindowDays,
          }),
        )
        if (result.created) created++
      } catch (error) {
        this.logger.warn('referrals.gift_acquisition_repair_failed', {
          redemptionId: redemption.id,
          error: serializeError(error),
        })
      }
    }
    return created
  }

  /** Devolve quantos slugs foram preenchidos. Catálogo fora: tenta no próximo ciclo. */
  async fillOfferSlugs(limit = this.config.batchSize): Promise<number> {
    const missing = await this.acquisitions.listMissingOfferSlug(limit)
    const cache = new Map<string, string | null>()
    let filled = 0
    for (const item of missing) {
      let slug = cache.get(item.offerId)
      if (slug === undefined) {
        try {
          slug = (await this.catalog.getOfferById(item.offerId))?.slug ?? null
        } catch (error) {
          this.logger.warn('referrals.acquisition_slug_catalog_failed', {
            error: serializeError(error),
          })
          return filled
        }
        cache.set(item.offerId, slug)
      }
      if (!slug) continue
      await this.acquisitions.setOfferSlug(
        item.id,
        slug,
        this.config.conversionOfferSlugs.includes(slug),
      )
      filled++
    }
    return filled
  }
}
