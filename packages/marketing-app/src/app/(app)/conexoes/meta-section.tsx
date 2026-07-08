'use client'

import { Button } from '@sistemazero/ui/button'
import { Card, CardContent } from '@sistemazero/ui/card'
import { Facebook, Instagram } from 'lucide-react'
import { NETWORK_LABELS } from '@/lib/networks'
import type { SocialAccountView } from '@/lib/types'
import { AutoPublishBadge, StatusChip, TokenInfoLine } from './account-bits'

/**
 * Card "Facebook e Instagram": UM login no Facebook conecta a(s) Página(s) e
 * o(s) Instagram profissional(is) vinculado(s) — por isso a seção é conjunta
 * (multi-conta), com desconectar POR conta.
 */
export function MetaSection({
  accounts,
  isAdmin,
  starting,
  onConnect,
  onDisconnect,
}: {
  accounts: SocialAccountView[]
  isAdmin: boolean
  starting: boolean
  onConnect: () => void
  onDisconnect: (account: SocialAccountView) => void
}) {
  const metaAccounts = accounts.filter((a) => a.network === 'facebook' || a.network === 'instagram')
  const visible = metaAccounts.filter((a) => a.status !== 'revoked')
  const needsReconnect = visible.some((a) => a.status === 'needs_reauth')
  const hasConnected = visible.some((a) => a.status === 'connected')

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Facebook className="size-5 text-muted-foreground" aria-hidden />
            <Instagram className="size-5 text-muted-foreground" aria-hidden />
            <h2 className="font-medium">Facebook e Instagram</h2>
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma conta conectada. Um login no Facebook conecta a Página e o Instagram
            profissional vinculado a ela, de uma vez.
          </p>
        ) : (
          <ul className="space-y-3">
            {visible.map((account) => (
              <li
                key={account.id}
                className="space-y-1.5 rounded-lg border border-border bg-background/40 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {account.network === 'instagram' ? (
                      <Instagram className="size-4 text-muted-foreground" aria-hidden />
                    ) : (
                      <Facebook className="size-4 text-muted-foreground" aria-hidden />
                    )}
                    <p className="text-sm font-medium">
                      {account.username ? `@${account.username}` : account.displayName}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {NETWORK_LABELS[account.network]}
                    </span>
                  </div>
                  <StatusChip status={account.status} />
                </div>
                <TokenInfoLine account={account} />
                <div className="flex flex-wrap items-center gap-2">
                  <AutoPublishBadge account={account} />
                  {isAdmin ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={() => onDisconnect(account)}
                    >
                      Desconectar
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        {isAdmin ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {!hasConnected || needsReconnect ? (
              <Button size="sm" onClick={onConnect} disabled={starting}>
                {starting
                  ? 'Abrindo o Facebook…'
                  : needsReconnect
                    ? 'Reconectar Facebook e Instagram'
                    : 'Conectar Facebook e Instagram'}
              </Button>
            ) : null}
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground">
          A conexão exige uma Página do Facebook com um Instagram profissional vinculado. Com o app
          da Meta em modo de desenvolvimento, os posts da Página só aparecem para a equipe do app.
        </p>
      </CardContent>
    </Card>
  )
}
