import type {
  AmbassadorOfferItem,
  AmbassadorOfferKind,
  AmbassadorOfferView,
  GiftAudience,
} from '@sistemazero/core/referrals'

export interface AmbassadorOfferRepository {
  /** A lista do público (e do tipo, quando informado), na ordem da página do embaixador. */
  list(audience: GiftAudience, kind?: AmbassadorOfferKind): Promise<AmbassadorOfferView[]>
  /** Troca a lista inteira do público e tipo numa transação (a ordem é a posição no array). */
  replace(
    audience: GiftAudience,
    kind: AmbassadorOfferKind,
    items: AmbassadorOfferItem[],
  ): Promise<AmbassadorOfferView[]>
}
