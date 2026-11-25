import type { Logger } from '@sistemazero/core/logging'
import { serializeError } from '@sistemazero/core/logging'
import { type BonusDefaults, giftAcquisition } from '../../domain/acquisition'
import type { AcquisitionRepository } from '../../domain/ports/acquisition-repository.port'
import type { CatalogClient } from '../../domain/ports/clients.port'

export interface AcquisitionMaintenanceConfig {
  defaults: BonusDefaults
  /**
   * Prazo do acordo capturado para presentes que viram aquisição pelo REPARO/backfill. Os
   * resgates de antes de 25/11/2026 aceitaram um acordo SEM prazo (o link pessoal valia para
   * sempre): o backfill os grava com um prazo longo para não tirar o bônus de quem já tinha.
   */
  repairWindowDays: number
  /**
   * Quando a 0013 entrou no ar (`ORIGIN_LEGACY_BEFORE`): presente concluído ANTES disso é do
   * acordo antigo e ganha o prazo longo; depois, é falha do registro em tempo real e ganha o
   * prazo de hoje. Sem a data, todo presente reparado ganha o prazo longo (o lado que não tira
   * bônus de ninguém).
   */
  legacyBefore?: Date | null
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

  /**
   * Devolve quantas aquisições de presente foram criadas. Com `email`, repara só os presentes
   * dessa pessoa e LANÇA na falha (o pagamento dela pede reentrega em vez de seguir sem o
   * presente); no ciclo do sweep, cada falha só vira aviso.
   */
  async repairGifts(limit = this.config.batchSize, email?: string): Promise<number> {
    const pending = await this.acquisitions.listCompletedRedemptionsWithoutAcquisition(limit, email)
    const legacyBefore = this.config.legacyBefore ?? null
    let created = 0
    for (const { redemption, code } of pending) {
      const completedAt = redemption.completedAt ?? redemption.createdAt
      const legacy = !legacyBefore || completedAt.getTime() < legacyBefore.getTime()
      try {
        const result = await this.acquisitions.insert(
          giftAcquisition(redemption, code, completedAt, {
            ...this.config.defaults,
            windowDays: legacy ? this.config.repairWindowDays : this.config.defaults.windowDays,
          }),
        )
        if (result.created) created++
      } catch (error) {
        if (email) throw error
        this.logger.warn('referrals.gift_acquisition_repair_failed', {
          redemptionId: redemption.id,
          error: serializeError(error),
        })
      }
    }
    return created
  }

  /** Onde o último ciclo parou: oferta que o catálogo não resolve não trava a fila. */
  private slugCursor: { createdAt: Date; id: string } | null = null

  /** Devolve quantos slugs foram preenchidos. Catálogo fora: tenta no próximo ciclo. */
  async fillOfferSlugs(limit = this.config.batchSize): Promise<number> {
    const missing = await this.acquisitions.listMissingOfferSlug(limit, this.slugCursor)
    // Lote incompleto = chegou ao fim; o próximo ciclo recomeça do início (as que o catálogo
    // não resolvia ganham outra chance).
    const last = missing.at(-1)
    this.slugCursor =
      missing.length < limit || !last ? null : { createdAt: last.createdAt, id: last.id }
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
