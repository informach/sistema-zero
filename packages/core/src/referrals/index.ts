/** Contratos de transporte de convites e campanhas; sem dependência de serviço. */
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'ended'
export type CampaignState = CampaignStatus | 'scheduled'
export type CampaignContext = 'ad' | 'event' | 'other'
/** Direito efetivamente concedido pelo resgate, incluindo versões históricas. */
export type GiftMuralAccess = 'trial' | 'visitor' | 'none'
export interface GiftAttribution {
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
}
export interface GiftSource {
  kind: 'ambassador' | 'account' | 'campaign'
  name: string
  campaignId?: string
  context?: CampaignContext
  description?: string
}
export interface ReferralGiftView {
  code: string
  displayName: string
  ownerKind: GiftSource['kind']
  source: GiftSource
  state: Exclude<CampaignState, 'draft'>
  startsAt: string | null
  endsAt: string | null
  giftAvailable: boolean
}
export interface CampaignInput {
  name: string
  publicTitle: string
  description: string
  context: CampaignContext
  code: string
  startsAt: string
  endsAt: string
  status: CampaignStatus
  channel: string
}
export interface CampaignView extends CampaignInput {
  id: string
  state: CampaignState
  shareUrl: string
  createdAt: string
  updatedAt: string
  stats: { redemptions: number; pending: number; failed: number; conversions: number }
}
export interface CampaignUpdateInput extends CampaignInput {
  /** Versão lida pelo operador; impede sobrescrever uma edição mais recente. */
  expectedUpdatedAt: string
}
export interface CampaignAuditView {
  id: string
  action: 'created' | 'updated' | 'duplicated'
  actor: string
  createdAt: string
  changes: Partial<CampaignInput>
}
export interface CampaignDetailView {
  campaign: CampaignView
  history: CampaignAuditView[]
  redemptions: {
    id: string
    userId: string | null
    name: string
    email: string
    status: string
    createdAt: string
    expiresAt: string | null
    lastError: string | null
    attribution: GiftAttribution | null
  }[]
}

/** Identificadores de mídia, nunca dados livres de uma família. */
export function sanitizeGiftAttribution(value: unknown): GiftAttribution | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as Record<string, unknown>
  const clean = (entry: unknown) => {
    if (typeof entry !== 'string') return null
    const token = entry.trim().slice(0, 100)
    return /^[a-zA-Z0-9][a-zA-Z0-9._+-]*$/.test(token) ? token : null
  }
  const result = {
    utmSource: clean(raw.utmSource),
    utmMedium: clean(raw.utmMedium),
    utmCampaign: clean(raw.utmCampaign),
    utmContent: clean(raw.utmContent),
  }
  return Object.values(result).some(Boolean) ? result : null
}
