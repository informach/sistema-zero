import type { OfferAggregate } from '../offer/offer.aggregate'

/**
 * Porta de persistência de ofertas. Consultas retornam `null` quando não existe.
 */
export interface OfferRepository {
  findById(id: string): Promise<OfferAggregate | null>
  findBySlug(slug: string): Promise<OfferAggregate | null>
  /** Carrega várias ofertas por id num único batch (ids inexistentes são omitidos). */
  findByIds(ids: string[]): Promise<OfferAggregate[]>
  /**
   * Insere uma oferta (+ itens). Em violação de unicidade (code/slug) lança
   * `DuplicateOfferError`.
   */
  create(offer: OfferAggregate): Promise<void>
  /**
   * Atualiza uma oferta (+ itens) com concorrência otimista (WHERE version).
   * Em conflito lança `ConcurrencyConflictError`; em unicidade, `DuplicateOfferError`.
   */
  update(offer: OfferAggregate): Promise<void>
}
