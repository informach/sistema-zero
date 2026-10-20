'use client'

import type {
  StudioAiAccountView,
  StudioAiCostView,
  StudioAiFundingSource,
} from '@sistemazero/core/ai-credits'
import { sessionFetch as fetch } from '@sistemazero/member-shell/lib/session-fetch'
import { useCallback, useEffect, useState } from 'react'

function microUsd(value: string): number | null {
  const text = value.trim().replace(',', '.')
  if (!text) return null
  if (!/^\d{1,4}(?:\.\d{1,6})?$/.test(text))
    throw new Error('Digite um valor em dólares com até seis casas decimais.')
  const amount = Math.round(Number(text) * 1_000_000)
  if (amount < 1 || amount > 1_000_000_000)
    throw new Error('O limite deve ser maior que zero e até US$ 1.000.')
  return amount
}
export function StudioOpenRouterCard() {
  const [account, setAccount] = useState<StudioAiAccountView | null>(null)
  const [costs, setCosts] = useState<StudioAiCostView | null>(null)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<StudioAiFundingSource>('platform')
  const [daily, setDaily] = useState('')
  const [monthly, setMonthly] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const update = useCallback((view: StudioAiAccountView) => {
    setAccount(view)
    setSource(view.source)
    setDaily(
      view.externalDailyLimitMicroUsd === null
        ? ''
        : String(view.externalDailyLimitMicroUsd / 1_000_000),
    )
    setMonthly(
      view.externalMonthlyLimitMicroUsd === null
        ? ''
        : String(view.externalMonthlyLimitMicroUsd / 1_000_000),
    )
  }, [])
  useEffect(() => {
    void reload
    const controller = new AbortController()
    setError(null)
    setLoading(true)
    const result = new URLSearchParams(window.location.search).get('openrouter')
    if (result === 'connected')
      setNotice('Conta conectada. Escolha a fonte de uso e salve os limites para utilizá-la.')
    if (result === 'failed') setError('A conexão não foi concluída. Você pode tentar novamente.')
    void fetch('/api/parents/openrouter', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error()
        const data = (await response.json()) as {
          account: StudioAiAccountView
          costs?: StudioAiCostView | null
        }
        if (!controller.signal.aborted) {
          update(data.account)
          setCosts(data.costs ?? null)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Não foi possível consultar a conexão agora.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [reload, update])
  async function submit(action: 'connect' | 'policy' | 'disconnect') {
    if (busy) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch(
        `/api/parents/openrouter${action === 'connect' ? '/connect' : ''}`,
        {
          method: action === 'connect' ? 'POST' : action === 'policy' ? 'PUT' : 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          ...(action === 'policy'
            ? {
                body: JSON.stringify({
                  source,
                  externalDailyLimitMicroUsd: microUsd(daily),
                  externalMonthlyLimitMicroUsd: microUsd(monthly),
                }),
              }
            : {}),
        },
      )
      if (!response.ok)
        throw new Error(
          'Não foi possível salvar. Confira a conexão e os limites e tente novamente.',
        )
      const data = (await response.json()) as { account?: StudioAiAccountView; url?: string }
      if (
        action === 'connect' &&
        data.url &&
        new URL(data.url).origin === 'https://openrouter.ai'
      ) {
        window.location.assign(data.url)
        return
      }
      if (!data.account) throw new Error('Resposta de conexão inválida. Tente novamente.')
      update(data.account)
      setNotice(
        action === 'disconnect'
          ? 'Conexão removida do Sistema Zero. A fonte de uso foi mantida; você pode alterá-la abaixo.'
          : 'Preferências salvas.',
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível concluir agora.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section aria-labelledby="parents-openrouter" className="kids-carta flex flex-col gap-4 p-6">
      <h2 id="parents-openrouter" className="sz-display text-xl">
        Assistentes no Estúdio
      </h2>
      <p className="text-sm text-muted-foreground">
        A franquia é compartilhada pela família. Você pode conectar uma conta OpenRouter e pagar os
        assistentes do Estúdio com o seu próprio saldo no OpenRouter. As crianças não têm acesso à
        chave.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
      {costs && (
        <div className="space-y-3 text-sm">
          <p>Uso dos assistentes no Estúdio neste mês ({costs.month})</p>
          {(['platform', 'openrouter'] as const).map((funding) => {
            const usage = costs[funding].month
            const money = (micro: number) =>
              new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 6,
              }).format(micro / 1_000_000)
            return (
              <dl key={funding} className="rounded-lg border border-border p-3">
                <dt className="font-medium">
                  {funding === 'platform' ? 'Incluído no Sistema Zero' : 'Sua conta OpenRouter'}
                </dt>
                <dd>
                  {money(usage.confirmedMicroUsd)} de custo confirmado · {usage.calls} chamadas
                </dd>
                {usage.reservedMicroUsd > 0 && (
                  <dd>{money(usage.reservedMicroUsd)} reservados para operações em andamento</dd>
                )}
                {usage.uncertainMicroUsd > 0 && (
                  <dd>
                    {money(usage.uncertainMicroUsd)} estimados, ainda não confirmados pelo provedor
                  </dd>
                )}
              </dl>
            )
          })}
          <p className="text-xs text-muted-foreground">
            Chamadas de reparo aparecem no custo; cada pergunta usa no máximo uma interação da
            franquia. As reservas evitam que tarefas simultâneas utilizem o mesmo saldo. O custo
            incluído é informativo e não é uma cobrança adicional.
          </p>
        </div>
      )}
      {loading ? (
        <p role="status" className="text-sm">
          Consultando conexão…
        </p>
      ) : !account ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => setReload((v) => v + 1)}
          className="text-sm underline"
        >
          Tentar carregar novamente
        </button>
      ) : (
        <>
          {!account.available && (
            <p className="text-sm text-muted-foreground">
              A conexão opcional ainda não está disponível neste ambiente. Você pode escolher a
              franquia incluída.
            </p>
          )}
          <p className="text-sm">
            {account.connected
              ? 'Conta OpenRouter conectada.'
              : 'Nenhuma conta OpenRouter conectada.'}
          </p>
          <button
            type="button"
            disabled={busy || !account.available}
            onClick={() => void submit('connect')}
            className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50"
          >
            {account.connected ? 'Trocar conexão' : 'Conectar OpenRouter'}
          </button>
          {account.keyManagementUrl && (
            <a
              href={account.keyManagementUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline"
            >
              Gerenciar ou revogar a chave no OpenRouter
            </a>
          )}
          <label className="flex flex-col gap-1 text-sm">
            Fonte de consumo
            <select
              value={source}
              disabled={busy}
              onChange={(event) => setSource(event.target.value as StudioAiFundingSource)}
              className="rounded-lg border border-border bg-background p-2"
            >
              <option value="platform">Franquia Sistema Zero</option>
              <option
                value="openrouter"
                disabled={
                  (!account.available || !account.connected) && account.source !== 'openrouter'
                }
              >
                Conta OpenRouter do responsável
              </option>
            </select>
          </label>
          <p className="text-xs text-muted-foreground">
            A fonte escolhida é usada sem troca automática se os créditos acabarem. Os limites
            abaixo valem para sua conta conectada, por dia e mês civil de São Paulo; o saldo do
            OpenRouter pode acabar antes.
          </p>
          <label className="flex flex-col gap-1 text-sm">
            Limite diário (US$)
            <input
              value={daily}
              inputMode="decimal"
              disabled={busy}
              onChange={(event) => setDaily(event.target.value)}
              className="rounded-lg border border-border bg-background p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Limite mensal (US$)
            <input
              value={monthly}
              inputMode="decimal"
              disabled={busy}
              onChange={(event) => setMonthly(event.target.value)}
              className="rounded-lg border border-border bg-background p-2"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit('policy')}
            className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            Salvar preferências
          </button>
          {account.connected && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit('disconnect')}
              className="text-sm underline"
            >
              Desconectar do Sistema Zero
            </button>
          )}
          <p className="text-xs text-muted-foreground">
            Desconectar remove o acesso aqui. Para revogar a chave no provedor, use o link de
            gerenciamento. A conexão não inclui serviços externos de imagem ou modelagem.
          </p>
        </>
      )}
    </section>
  )
}
