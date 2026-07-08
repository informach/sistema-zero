'use client'

import { Badge } from '@sistemazero/ui/badge'
import { Zap } from 'lucide-react'
import { formatShortSp } from '@/lib/dates'
import type { AccountStatus, SocialAccountView } from '@/lib/types'

/** Chips de estado da conta (compartilhados entre YouTube e Meta). */
export const STATUS_CHIPS: Record<AccountStatus, { label: string; className: string }> = {
  connected: {
    label: 'Conectada',
    className: 'border-transparent bg-success/15 text-success-foreground',
  },
  needs_reauth: {
    label: 'Precisa reconectar',
    className: 'border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400',
  },
  revoked: { label: 'Desconectada', className: 'border-border bg-muted text-muted-foreground' },
  disabled: { label: 'Desativada', className: 'border-border bg-muted text-muted-foreground' },
}

export function StatusChip({ status }: { status: AccountStatus }) {
  return (
    <Badge variant="outline" className={STATUS_CHIPS[status].className}>
      {STATUS_CHIPS[status].label}
    </Badge>
  )
}

/** Linha de vida do token (page token da Meta não expira → diz isso). */
export function TokenInfoLine({ account }: { account: SocialAccountView }) {
  const parts = [
    account.tokenExpiresAt
      ? `Token válido até ${formatShortSp(account.tokenExpiresAt)}`
      : account.network === 'facebook' || account.network === 'instagram'
        ? 'Token da Página não expira'
        : null,
    account.lastRefreshAt ? `Último refresh ${formatShortSp(account.lastRefreshAt)}` : null,
  ].filter(Boolean)
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">
        {parts.join(' · ') || 'Sem informações de token ainda.'}
      </p>
      {account.lastRefreshError ? (
        <p className="text-xs text-destructive" role="alert">
          Falha no último refresh: {account.lastRefreshError}
        </p>
      ) : null}
    </div>
  )
}

export function AutoPublishBadge({ account }: { account: SocialAccountView }) {
  if (!account.canAutoPublish) return null
  return (
    <Badge variant="success">
      <Zap className="size-3" aria-hidden />
      Publicação automática ativa
    </Badge>
  )
}
