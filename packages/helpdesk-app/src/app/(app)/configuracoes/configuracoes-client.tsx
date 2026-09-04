'use client'

import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@sistemazero/ui/card'
import { ConfirmDialog } from '@sistemazero/ui/confirm-dialog'
import { Field } from '@sistemazero/ui/label'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { Textarea } from '@sistemazero/ui/textarea'
import { Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { formatDate } from '@/lib/format'
import type { ConnectionView, SettingsView } from '@/lib/types'

export function ConfiguracoesClient() {
  return (
    <div className="space-y-6">
      <ConnectionCard />
      <SignatureCard />
    </div>
  )
}

/** Mensagens dos erros que o callback do OAuth pode devolver no `?error=`. */
const OAUTH_ERROR_LABELS: Record<string, string> = {
  access_denied: 'Conexão cancelada no Google.',
  state_invalid: 'A conexão expirou. Tente de novo.',
  identity_missing: 'O Google não devolveu a identidade da conta. Tente de novo.',
  exchange_failed: 'Não foi possível concluir a conexão com o Google. Tente de novo.',
  provider_not_supported: 'Provedor não suportado.',
}

/** Estado da conexão Gmail + conectar/reconectar/desconectar via OAuth. */
function ConnectionCard() {
  const [connection, setConnection] = useState<ConnectionView | null>(null)
  const [failed, setFailed] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

  function load() {
    apiGet<ConnectionView>('/api/helpdesk/connection')
      .then(setConnection)
      .catch(() => setFailed(true))
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: efeito de montagem — roda uma vez.
  useEffect(() => {
    load()
    // Retorno do callback do Google: ?connected=google ou ?error=<code>.
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('connected')
    const error = params.get('error')
    if (connected) toast.success('Caixa contato@ conectada.')
    else if (error) toast.error(OAUTH_ERROR_LABELS[error] ?? 'Não foi possível conectar a caixa.')
    if (connected || error) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  async function connect() {
    setConnecting(true)
    try {
      const { authorizeUrl } = await apiSend<{ authorizeUrl: string }>(
        '/api/helpdesk/oauth/google/start',
        'POST',
      )
      window.location.href = authorizeUrl
    } catch (error) {
      const apiError = error as ApiError
      if (apiError.code === 'GMAIL_NOT_CONFIGURED') {
        toast.error('A integração com o Gmail ainda não foi configurada pela equipe técnica.')
      } else if (apiError.status === 403) {
        toast.error('Só admin pode conectar a caixa.')
      } else {
        toast.error('Não foi possível iniciar a conexão. Tente novamente.')
      }
      setConnecting(false)
    }
  }

  async function disconnect() {
    setDisconnecting(true)
    try {
      const view = await apiSend<ConnectionView>('/api/helpdesk/connection', 'DELETE')
      setConnection(view)
      toast.success('Caixa desconectada.')
    } catch (error) {
      toast.error(
        (error as ApiError).status === 403
          ? 'Só admin pode desconectar a caixa.'
          : 'Não foi possível desconectar. Tente novamente.',
      )
    } finally {
      setDisconnecting(false)
      setConfirmDisconnect(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conexão Gmail</CardTitle>
        <CardDescription>
          A caixa contato@ alimenta a caixa de entrada e envia as respostas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {failed ? (
          <p className="text-sm text-destructive" role="alert">
            Não foi possível carregar o estado da conexão. Recarregue a página.
          </p>
        ) : connection === null ? (
          <Skeleton className="h-14 w-full rounded-lg" />
        ) : connection.connected ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Mail className="size-4 text-muted-foreground" aria-hidden />
              <p className="text-sm font-medium">{connection.emailAddress}</p>
              {connection.status === 'connected' ? (
                <Badge variant="success">Conectada</Badge>
              ) : (
                <Badge variant="destructive">Reautenticação necessária</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Conectada em {formatDate(connection.connectedAt)} · Última sincronização{' '}
              {formatDate(connection.lastSyncAt)}
            </p>
            {connection.lastSyncError ? (
              <p className="text-xs text-destructive" role="alert">
                Erro na última sincronização: {connection.lastSyncError}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {connection.status === 'needs_reauth' ? (
                <Button onClick={connect} disabled={connecting}>
                  {connecting ? 'Abrindo…' : 'Reconectar'}
                </Button>
              ) : null}
              <Button
                variant="outline"
                onClick={() => setConfirmDisconnect(true)}
                disabled={disconnecting}
              >
                Desconectar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Caixa contato@ ainda não conectada</p>
            <Button onClick={connect} disabled={connecting}>
              {connecting ? 'Abrindo…' : 'Conectar'}
            </Button>
          </div>
        )}
      </CardContent>
      <ConfirmDialog
        open={confirmDisconnect}
        onClose={() => setConfirmDisconnect(false)}
        title="Desconectar a caixa?"
        message="Os tickets já recebidos continuam aqui, mas novos e-mails deixam de entrar até você reconectar."
        confirmText="Desconectar"
        confirmVariant="destructive"
        onConfirm={disconnect}
      />
    </Card>
  )
}

/** Assinatura anexada às respostas enviadas pela equipe. */
function SignatureCard() {
  const [settings, setSettings] = useState<SettingsView | null>(null)
  const [failed, setFailed] = useState(false)
  const [signature, setSignature] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    apiGet<SettingsView>('/api/helpdesk/settings')
      .then((view) => {
        if (!alive) return
        setSettings(view)
        setSignature(view.signature)
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [])

  async function save() {
    setSaving(true)
    try {
      const saved = await apiSend<SettingsView>('/api/helpdesk/settings', 'PATCH', {
        signature,
      })
      setSettings(saved)
      toast.success('Configurações salvas.')
    } catch {
      toast.error('Não foi possível salvar as configurações. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assinatura das respostas</CardTitle>
        <CardDescription>
          A IA prepara resumos e rascunhos para revisão. Toda resposta é enviada por uma pessoa da
          equipe.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {failed ? (
          <p className="text-sm text-destructive" role="alert">
            Não foi possível carregar as configurações. Recarregue a página.
          </p>
        ) : settings === null ? (
          <div className="space-y-3" aria-busy="true">
            <span className="sr-only">Carregando configurações</span>
            {['a', 'b', 'c'].map((key) => (
              <Skeleton key={key} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            <Field
              label="Assinatura"
              htmlFor="reply-signature"
              hint="Entra no fim de toda resposta enviada pelo helpdesk."
            >
              <Textarea
                id="reply-signature"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                disabled={saving}
                maxLength={2000}
                placeholder="Equipe Sistema Zero"
                className="min-h-24"
              />
            </Field>

            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>
                {saving ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
