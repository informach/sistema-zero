'use client'

import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@sistemazero/ui/card'
import { ConfirmDialog } from '@sistemazero/ui/confirm-dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { Switch } from '@sistemazero/ui/switch'
import { Textarea } from '@sistemazero/ui/textarea'
import { Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { CATEGORY_LABELS, TICKET_CATEGORIES } from '@/lib/categories'
import { formatDate } from '@/lib/format'
import type { ConnectionView, SettingsView, TicketCategory } from '@/lib/types'

export function ConfiguracoesClient() {
  return (
    <div className="space-y-6">
      <ConnectionCard />
      <AutoReplyCard />
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

/** Regras da auto-resposta (switch global, categorias, confiança e assinatura). */
function AutoReplyCard() {
  const [settings, setSettings] = useState<SettingsView | null>(null)
  const [failed, setFailed] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [categories, setCategories] = useState<TicketCategory[]>([])
  const [confidence, setConfidence] = useState('0.8')
  const [signature, setSignature] = useState('')
  const [confidenceError, setConfidenceError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    apiGet<SettingsView>('/api/helpdesk/settings')
      .then((view) => {
        if (!alive) return
        setSettings(view)
        setEnabled(view.autoReplyEnabled)
        setCategories(view.autoReplyCategories)
        setConfidence(String(view.autoReplyConfidenceMin))
        setSignature(view.signature)
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [])

  function toggleCategory(category: TicketCategory, checked: boolean) {
    setCategories((cur) => (checked ? [...cur, category] : cur.filter((item) => item !== category)))
  }

  async function save() {
    const parsed = Number(confidence)
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
      setConfidenceError('Informe um valor entre 0 e 1.')
      return
    }
    setConfidenceError(null)
    setSaving(true)
    try {
      const saved = await apiSend<SettingsView>('/api/helpdesk/settings', 'PATCH', {
        autoReplyEnabled: enabled,
        autoReplyCategories: categories,
        autoReplyConfidenceMin: parsed,
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
        <CardTitle>Auto-resposta</CardTitle>
        <CardDescription>
          Quando ligada, a IA responde sozinha os tickets das categorias marcadas, desde que a
          classificação atinja a confiança mínima.
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
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Responder automaticamente</p>
                <p className="text-xs text-muted-foreground">
                  Desligada, a IA só prepara rascunhos para a equipe revisar.
                </p>
              </div>
              <Switch
                id="auto-reply-enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
                disabled={saving}
              />
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Categorias com auto-resposta</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {TICKET_CATEGORIES.map((category) => (
                  <label
                    key={category}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={categories.includes(category)}
                      onChange={(e) => toggleCategory(category, e.target.checked)}
                      disabled={saving}
                      className="size-4 accent-[var(--primary)]"
                    />
                    {CATEGORY_LABELS[category]}
                  </label>
                ))}
              </div>
            </fieldset>

            <Field
              label="Confiança mínima"
              htmlFor="auto-reply-confidence"
              error={confidenceError ?? undefined}
              hint="De 0 a 1. A auto-resposta só sai quando a classificação da IA atinge esse valor."
            >
              <Input
                id="auto-reply-confidence"
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={confidence}
                onChange={(e) => setConfidence(e.target.value)}
                disabled={saving}
                className="max-w-32"
              />
            </Field>

            <Field
              label="Assinatura"
              htmlFor="auto-reply-signature"
              hint="Entra no fim de toda resposta enviada pelo helpdesk."
            >
              <Textarea
                id="auto-reply-signature"
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
