import type {
  CampaignInput,
  CampaignKind,
  CampaignLinkTarget,
  CampaignState,
  GiftAudience,
  GiftSource,
} from '@sistemazero/core/referrals'

export interface CampaignRecord
  extends Omit<
    CampaignInput,
    | 'startsAt'
    | 'endsAt'
    | 'audience'
    | 'kind'
    | 'saleOfferId'
    | 'linkTarget'
    | 'redirectPath'
    | 'redirectUntil'
  > {
  audience: GiftAudience
  kind: CampaignKind
  saleOfferId: string | null
  linkTarget: CampaignLinkTarget
  redirectPath: string | null
  redirectUntil: Date | null
  id: string
  startsAt: Date
  endsAt: Date
  createdAt: Date
  updatedAt: Date
}

/** A oferta que a campanha entrega: a do presente ou a da venda (nula em campanha antiga). */
export function campaignOfferId(
  campaign: Pick<CampaignRecord, 'kind' | 'giftOfferId' | 'saleOfferId'>,
) {
  return campaign.kind === 'sale' ? campaign.saleOfferId : (campaign.giftOfferId ?? null)
}

/** Endereço antigo ainda redirecionando para a campanha. */
export function campaignRedirectActive(
  campaign: Pick<CampaignRecord, 'redirectPath' | 'redirectUntil' | 'status'>,
  now = new Date(),
): boolean {
  return (
    campaign.redirectPath !== null &&
    campaign.redirectUntil !== null &&
    campaign.status !== 'draft' &&
    now < campaign.redirectUntil
  )
}

export function campaignState(
  campaign: Pick<CampaignRecord, 'status' | 'startsAt' | 'endsAt'>,
  now = new Date(),
): CampaignState {
  if (campaign.status === 'draft') return 'draft'
  if (campaign.status === 'ended' || now >= campaign.endsAt) return 'ended'
  if (campaign.status === 'paused') return 'paused'
  if (now < campaign.startsAt) return 'scheduled'
  return 'active'
}

export function campaignSource(campaign: CampaignRecord): GiftSource {
  return {
    kind: 'campaign',
    name: campaign.publicTitle,
    campaignId: campaign.id,
    context: campaign.context,
    description: campaign.description,
  }
}

export class CampaignUnavailableError extends Error {
  constructor(readonly state: CampaignState) {
    super('Esta campanha não aceita novos cadastros agora.')
  }
}

export class CampaignValidationError extends Error {}

/**
 * Público só muda em rascunho sem resgates; depois, só duplicando (mesma regra do código).
 */
export class CampaignAudienceLockedError extends Error {
  constructor() {
    super(
      'O público de uma campanha só muda enquanto ela está em rascunho e sem cadastros. Duplique a campanha para criar uma edição com outro público.',
    )
  }
}

/**
 * Oferta do presente só muda em rascunho sem resgates (a mesma régua do público); depois, só
 * duplicando. Ligar uma oferta a uma campanha antiga que ainda não tinha é permitido.
 */
export class CampaignGiftOfferLockedError extends Error {
  constructor() {
    super(
      'A oferta do presente só muda enquanto a campanha está em rascunho e sem cadastros. Duplique a campanha para criar uma edição com outra oferta.',
    )
  }
}

/** O tipo (presente ou venda) segue a régua do público: só muda em rascunho sem cadastros. */
export class CampaignKindLockedError extends Error {
  constructor() {
    super(
      'O tipo da campanha só muda enquanto ela está em rascunho e sem cadastros. Duplique a campanha para criar uma edição de outro tipo.',
    )
  }
}

/** Outro endereço antigo já redireciona para uma campanha (UNIQUE `redirect_path`). */
export class CampaignRedirectTakenError extends Error {
  constructor() {
    super('Este endereço antigo já redireciona para outra campanha.')
  }
}

/** O Catálogo não respondeu ao conferir a oferta do presente (tente de novo). */
export class GiftCatalogUnavailableError extends Error {
  constructor() {
    super('Não foi possível conferir a oferta do presente no Catálogo agora. Tente de novo.')
  }
}

/**
 * A oferta resolvida antes do claim não é mais a da campanha (trocada entre a leitura e o lock).
 * Transitório: a próxima submissão resolve a oferta atual.
 */
export class GiftOfferChangedError extends Error {
  constructor() {
    super('A oferta do presente mudou durante o cadastro.')
  }
}

export class CampaignConflictError extends Error {
  constructor() {
    super(
      'Esta campanha foi alterada em outra aba ou por outra pessoa. Feche o formulário, atualize a lista e confira os dados antes de editar novamente.',
    )
  }
}
