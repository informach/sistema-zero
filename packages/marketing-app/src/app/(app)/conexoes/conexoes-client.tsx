'use client'

import { Button } from '@sistemazero/ui/button'
import { Card, CardContent } from '@sistemazero/ui/card'
import { ConfirmDialog } from '@sistemazero/ui/confirm-dialog'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { CircleCheck, Music2, TriangleAlert, Youtube } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { NETWORK_LABELS } from '@/lib/networks'
import type { AccountsResponse, SocialAccountView } from '@/lib/types'
import { AutoPublishBadge, StatusChip, TokenInfoLine } from './account-bits'
import { MetaSection } from './meta-section'

// ── Banner de retorno do OAuth (o callback redireciona pra cá) ──

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  state_invalid: 'A autorização expirou ou já foi usada. Comece de novo.',
  access_denied: 'Você cancelou a autorização.',
  exchange_failed: 'Não foi possível concluir a conexão. Tente de novo.',
  no_accounts:
    'Nenhuma Página encontrada na conta. Vincule uma Página do Facebook (com Instagram profissional) e tente de novo.',
}

const CONNECTED_MESSAGES: Record<string, string> = {
  youtube: 'Conta do Google conectada.',
  facebook: 'Facebook e Instagram conectados.',
  tiktok: 'Conta do TikTok conectada.',
}

/**
 * Lê `?connected=youtube|facebook` / `?error=<code>` do retorno do OAuth,
 * guarda a mensagem em estado local e LIMPA a query da URL (um F5 não repete o
 * banner). Componente próprio p/ o `useSearchParams` viver dentro de um Suspense.
 */
function OAuthReturnBanner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [banner, setBanner] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)

  const connected = searchParams.get('connected')
  const errorCode = searchParams.get('error')

  useEffect(() => {
    if (!connected && !errorCode) return
    const success = connected ? CONNECTED_MESSAGES[connected] : undefined
    if (success) {
      setBanner({ kind: 'success', message: success })
    } else if (errorCode) {
      setBanner({
        kind: 'error',
        message:
          OAUTH_ERROR_MESSAGES[errorCode] ?? 'Não foi possível conectar a conta. Tente de novo.',
      })
    }
    router.replace('/conexoes', { scroll: false })
  }, [connected, errorCode, router])

  if (!banner) return null
  const isError = banner.kind === 'error'
  const Icon = isError ? TriangleAlert : CircleCheck
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={
        isError
          ? 'flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive'
          : 'flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-success-foreground'
      }
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {banner.message}
    </div>
  )
}

/** Mesma preferência do backend: a conta conectada vence; senão a primeira. */
function pickAccount(
  items: SocialAccountView[] | undefined,
  network: 'youtube' | 'tiktok',
): SocialAccountView | null {
  const filtered = (items ?? []).filter((it) => it.network === network)
  return filtered.find((it) => it.status === 'connected') ?? filtered[0] ?? null
}

export function ConexoesClient({ isAdmin }: { isAdmin: boolean }) {
  const [data, setData] = useState<AccountsResponse | null>(null)
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [starting, setStarting] = useState<'youtube' | 'facebook' | 'tiktok' | null>(null)
  const [disconnectTarget, setDisconnectTarget] = useState<SocialAccountView | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: `reloadKey` é só o gatilho do retry — bump força a re-carga sem ser lido no corpo.
  useEffect(() => {
    let alive = true
    setFailed(false)
    apiGet<AccountsResponse>('/api/marketing/accounts')
      .then((res) => {
        if (alive) setData(res)
      })
      .catch(() => {
        // Erro não vira "nenhuma conta" (indistinguível de nada conectado).
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [reloadKey])

  const youtube = pickAccount(data?.items, 'youtube')
  const tiktok = pickAccount(data?.items, 'tiktok')

  async function startOAuth(network: 'youtube' | 'facebook' | 'tiktok') {
    setStarting(network)
    try {
      const { authorizeUrl } = await apiSend<{ authorizeUrl: string }>(
        `/api/marketing/oauth/${network}/start`,
        'POST',
      )
      // Navegação de documento: o consentimento acontece no provedor e o
      // callback volta pra esta tela com `?connected=` ou `?error=`.
      window.location.href = authorizeUrl
      // `starting` fica ligado de propósito: a página está indo embora.
    } catch (error) {
      const apiError = error as ApiError
      if (apiError.status === 503) {
        toast.error('OAuth do provedor não configurado neste ambiente.')
      } else if (apiError.status === 403) {
        toast.error('Conectar contas exige perfil de administração.')
      } else {
        toast.error('Não foi possível iniciar a conexão. Tente de novo.')
      }
      setStarting(null)
    }
  }

  async function confirmDisconnect() {
    if (!disconnectTarget) return
    try {
      const updated = await apiSend<SocialAccountView>(
        `/api/marketing/accounts/${disconnectTarget.id}`,
        'DELETE',
      )
      setData((cur) =>
        cur ? { ...cur, items: cur.items.map((it) => (it.id === updated.id ? updated : it)) } : cur,
      )
      toast.success('Conta desconectada.')
      setDisconnectTarget(null)
    } catch (error) {
      const apiError = error as ApiError
      toast.error(
        apiError.status === 403
          ? 'Desconectar contas exige perfil de administração.'
          : 'Não foi possível desconectar a conta. Tente de novo.',
      )
    }
  }

  return (
    <div className="space-y-4">
      <Suspense fallback={null}>
        <OAuthReturnBanner />
      </Suspense>

      {failed ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
          <p className="text-sm text-destructive" role="alert">
            Não foi possível carregar as contas conectadas.
          </p>
          <Button variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
            Tentar de novo
          </Button>
        </div>
      ) : data === null ? (
        <div className="grid gap-4 sm:grid-cols-2" aria-busy="true">
          <span className="sr-only">Carregando contas conectadas</span>
          {['a', 'b', 'c', 'd'].map((key) => (
            <Skeleton key={key} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <MetaSection
            accounts={data.items}
            isAdmin={isAdmin}
            starting={starting === 'facebook'}
            onConnect={() => startOAuth('facebook')}
            onDisconnect={setDisconnectTarget}
          />
          <YoutubeCard
            account={youtube}
            isAdmin={isAdmin}
            starting={starting === 'youtube'}
            onConnect={() => startOAuth('youtube')}
            onDisconnect={setDisconnectTarget}
          />
          <TikTokCard
            account={tiktok}
            isAdmin={isAdmin}
            starting={starting === 'tiktok'}
            onConnect={() => startOAuth('tiktok')}
            onDisconnect={setDisconnectTarget}
          />
        </div>
      )}

      {!isAdmin ? (
        <p className="text-xs text-muted-foreground">
          Conectar e desconectar contas exige perfil de administração.
        </p>
      ) : null}

      <ConfirmDialog
        open={disconnectTarget !== null}
        onClose={() => setDisconnectTarget(null)}
        title="Desconectar conta"
        message={
          disconnectTarget
            ? `A conta "${disconnectTarget.displayName}" (${NETWORK_LABELS[disconnectTarget.network]}) será desconectada e a publicação automática dessa rede para de funcionar. As publicações agendadas passam a depender do fluxo manual.`
            : ''
        }
        confirmText="Desconectar"
        confirmVariant="destructive"
        onConfirm={confirmDisconnect}
      />
    </div>
  )
}

function YoutubeCard({
  account,
  isAdmin,
  starting,
  onConnect,
  onDisconnect,
}: {
  account: SocialAccountView | null
  isAdmin: boolean
  starting: boolean
  onConnect: () => void
  onDisconnect: (account: SocialAccountView) => void
}) {
  const needsReconnect = account?.status === 'needs_reauth' || account?.status === 'revoked'
  const canDisconnect = account !== null && account.status !== 'revoked'

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Youtube className="size-5 text-muted-foreground" aria-hidden />
            <h2 className="font-medium">{NETWORK_LABELS.youtube}</h2>
          </div>
          {account ? <StatusChip status={account.status} /> : null}
        </div>

        {account ? (
          <div className="space-y-2">
            <div className="space-y-0.5">
              <p className="text-sm">
                Conectado como <span className="font-medium">{account.displayName}</span>
              </p>
              {account.metadata.channelTitle || account.metadata.email ? (
                <p className="text-xs text-muted-foreground">
                  {[
                    account.metadata.channelTitle ? `Canal ${account.metadata.channelTitle}` : null,
                    account.metadata.email,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              ) : null}
            </div>
            <TokenInfoLine account={account} />
            <AutoPublishBadge account={account} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma conta conectada. Conecte a conta do Google do canal para publicar e coletar
            métricas automaticamente.
          </p>
        )}

        {isAdmin ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {!account ? (
              <Button size="sm" onClick={onConnect} disabled={starting}>
                {starting ? 'Abrindo o Google…' : 'Conectar'}
              </Button>
            ) : null}
            {needsReconnect ? (
              <Button size="sm" onClick={onConnect} disabled={starting}>
                {starting ? 'Abrindo o Google…' : 'Reconectar'}
              </Button>
            ) : null}
            {canDisconnect ? (
              <Button variant="destructive" size="sm" onClick={() => onDisconnect(account)}>
                Desconectar
              </Button>
            ) : null}
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground">
          A mesma conta cuida do Drive: importar mídia e arquivar o que já foi publicado. Reconectar
          libera o arquivamento automático no Drive (permissão nova).
        </p>
      </CardContent>
    </Card>
  )
}

function TikTokCard({
  account,
  isAdmin,
  starting,
  onConnect,
  onDisconnect,
}: {
  account: SocialAccountView | null
  isAdmin: boolean
  starting: boolean
  onConnect: () => void
  onDisconnect: (account: SocialAccountView) => void
}) {
  const needsReconnect = account?.status === 'needs_reauth' || account?.status === 'revoked'
  const canDisconnect = account !== null && account.status !== 'revoked'

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Music2 className="size-5 text-muted-foreground" aria-hidden />
            <h2 className="font-medium">{NETWORK_LABELS.tiktok}</h2>
          </div>
          {account ? <StatusChip status={account.status} /> : null}
        </div>

        {account ? (
          <div className="space-y-2">
            <p className="text-sm">
              Conectado como{' '}
              <span className="font-medium">
                {account.username ? `@${account.username}` : account.displayName}
              </span>
            </p>
            <TokenInfoLine account={account} />
            <AutoPublishBadge account={account} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma conta conectada. Conecte a conta do TikTok para publicar e coletar métricas
            automaticamente.
          </p>
        )}

        {isAdmin ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {!account || needsReconnect ? (
              <Button size="sm" onClick={onConnect} disabled={starting}>
                {starting ? 'Abrindo o TikTok…' : account ? 'Reconectar' : 'Conectar'}
              </Button>
            ) : null}
            {canDisconnect ? (
              <Button variant="destructive" size="sm" onClick={() => onDisconnect(account)}>
                Desconectar
              </Button>
            ) : null}
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Até a auditoria do app na TikTok, os posts automáticos sobem PRIVADOS (só a conta vê) — dá
          para torná-los públicos no próprio app. O login se renova sozinho.
        </p>
      </CardContent>
    </Card>
  )
}
