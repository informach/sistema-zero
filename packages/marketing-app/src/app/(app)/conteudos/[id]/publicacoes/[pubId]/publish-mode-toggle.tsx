'use client'

import { InfoTooltip } from '@sistemazero/ui/info-tooltip'
import { Label } from '@sistemazero/ui/label'
import { Switch } from '@sistemazero/ui/switch'
import { FORMAT_NETWORK, type PublicationFormat } from '@/lib/networks'
import { forcesManualMode } from '@/lib/publications'
import type { AccountsResponse, PublishMode } from '@/lib/types'

/**
 * Toggle auto/lembrete. `auto` só habilita quando o formato tem API (Stories
 * nunca têm), a rede está na lista `autoCapableNetworks` do backend E existe
 * conta conectada com `canAutoPublish`. A mudança entra no dirty-flag do
 * Salvar (PATCH `publishMode`) — o backend confirma com 409 quando não dá.
 */
export function PublishModeToggle({
  format,
  accounts,
  value,
  onChange,
  disabled,
}: {
  format: PublicationFormat
  accounts: AccountsResponse | null
  value: PublishMode
  onChange: (mode: PublishMode) => void
  disabled?: boolean
}) {
  const network = FORMAT_NETWORK[format]
  const autoAvailable =
    !forcesManualMode(format) &&
    accounts !== null &&
    accounts.autoCapableNetworks.includes(network) &&
    accounts.items.some((account) => account.network === network && account.canAutoPublish)
  const tooltip = forcesManualMode(format)
    ? 'Stories não têm publicação automática (limite das redes)'
    : 'A publicação automática chega quando a rede estiver conectada'
  // Auto indisponível ainda deixa DESLIGAR um auto legado — só não deixa ligar.
  const switchDisabled = disabled || (!autoAvailable && value !== 'auto')

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border px-4 py-3">
      <div className="space-y-0.5">
        <span className="flex items-center gap-1.5">
          <Label htmlFor="composer-publish-mode">Publicação automática</Label>
          {!autoAvailable ? <InfoTooltip text={tooltip} /> : null}
        </span>
        <p className="text-xs text-muted-foreground">
          {value === 'auto'
            ? 'A plataforma publica sozinha no horário agendado.'
            : 'Modo lembrete: você recebe o aviso na hora e posta na rede.'}
        </p>
      </div>
      <Switch
        id="composer-publish-mode"
        checked={value === 'auto'}
        onCheckedChange={(checked) => onChange(checked ? 'auto' : 'manual')}
        disabled={switchDisabled}
      />
    </div>
  )
}
