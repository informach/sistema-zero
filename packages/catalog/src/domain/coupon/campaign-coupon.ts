import { ValidationError } from '../shared/errors'

/** Vínculo permanente: removê-lo permitiria escapar do calendário da campanha. */
export function couponCampaignId(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  if (!metadata || !Object.hasOwn(metadata, 'campaignId')) return null
  const id = metadata.campaignId
  if (
    typeof id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    throw new ValidationError('Vínculo de campanha inválido.')
  return id
}
