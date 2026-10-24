'use client'

import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Input } from '@sistemazero/ui/input'
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { AdminHeader } from '@/components/admin/admin-header'
import { PaymentsTabs } from '@/components/admin/payments-tabs'
import { ReadOnlyNotice } from '@/components/admin/read-only-notice'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { type RecoveryPolicyView, recoveryPolicyInput } from '@/lib/subscription-recovery'
import { RecoveryReviewClient } from './recovery-review-client'

const endpoint = '/api/payments/recovery/policy'
export function RecoveryPolicyClient({ currentRole }: { currentRole: string }) {
  const canWrite = currentRole === 'admin' || currentRole === 'superadmin'
  const [view, setView] = useState<RecoveryPolicyView | null>(null)
  const [days, setDays] = useState('7')
  const [reminders, setReminders] = useState('3, 6')
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const request = useRef<AbortController | null>(null)
  const submitting = useRef(false)
  const apply = useCallback((next: RecoveryPolicyView) => {
    setView(next)
    if (next.configuration) {
      setDays(String(next.configuration.windowDays))
      setReminders(next.configuration.reminderDays.join(', '))
      setEnabled(next.configuration.enabled)
    }
  }, [])
  const load = useCallback(async () => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setLoading(true)
    setError('')
    setNotice('')
    try {
      apply(await apiGet<RecoveryPolicyView>(endpoint, { signal: controller.signal }))
    } catch (failure) {
      if (!controller.signal.aborted) {
        setView(null)
        setError((failure as ApiError).message ?? 'A configuração não carregou. Tente novamente.')
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [apply])
  useEffect(() => {
    void load()
    return () => request.current?.abort()
  }, [load])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canWrite || submitting.current || !view?.configuration) return
    const input = recoveryPolicyInput({
      version: view.configuration.version,
      days,
      reminders,
      enabled,
    })
    if (!input) {
      setError(
        'Use de 1 a 30 dias e até três lembretes, em ordem crescente, antes do encerramento.',
      )
      return
    }
    if (input.enabled && !view.configurationReady) {
      setError('Conclua a configuração de cobrança e avisos antes de ativar.')
      return
    }
    submitting.current = true
    setSaving(true)
    setError('')
    setNotice('')
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    try {
      apply(
        await apiSend<RecoveryPolicyView>(endpoint, 'PUT', input, { signal: controller.signal }),
      )
      setNotice('Configuração salva. As novas regras valem para os próximos casos.')
    } catch (failure) {
      if (!controller.signal.aborted)
        setError(
          (failure as ApiError).message ??
            'Não foi possível confirmar a alteração. Recarregue para conferir antes de tentar novamente.',
        )
    } finally {
      submitting.current = false
      if (!controller.signal.aborted) setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Regularização de assinaturas"
        description="Prazos e lembretes para renovações recusadas nas comunidades Kids e Adultos."
      />
      <PaymentsTabs />
      {!canWrite && <ReadOnlyNotice />}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          {error}
        </div>
      )}
      <Card className="space-y-5 p-5 md:p-6" aria-busy={loading || saving}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="font-display font-bold text-lg">Acompanhamento de novas renovações</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              No Kids, os avisos vão para o responsável. Na comunidade adulta, para quem assina.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={loading || saving}
            onClick={() => void load()}
          >
            Recarregar configuração
          </Button>
        </div>
        {loading ? (
          <p role="status" className="text-sm text-muted-foreground">
            Carregando configuração…
          </p>
        ) : !view?.configuration ? (
          <p className="text-sm text-muted-foreground">
            A configuração está indisponível. Recarregue para tentar novamente.
          </p>
        ) : (
          <form onSubmit={save} className="space-y-5">
            {!view.configurationReady && (
              <p className="rounded-lg bg-muted p-3 text-sm">
                A configuração de cobrança e avisos está incompleta. Você pode salvar os prazos, mas
                a ativação ficará indisponível.
              </p>
            )}
            <label className="flex min-h-11 items-center gap-3 font-medium text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={enabled}
                disabled={!canWrite || saving || (!view.configurationReady && !enabled)}
                onChange={(event) => setEnabled(event.target.checked)}
              />
              Acompanhar novas renovações recusadas
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="recovery-days" className="font-medium text-sm">
                  Prazo de regularização, em dias
                </label>
                <Input
                  id="recovery-days"
                  inputMode="numeric"
                  value={days}
                  maxLength={2}
                  disabled={!canWrite || saving}
                  onChange={(event) => setDays(event.target.value)}
                  aria-describedby="recovery-days-help"
                />
                <p id="recovery-days-help" className="text-muted-foreground text-xs">
                  De 1 a 30 dias, contados do aceite identificado do primeiro aviso.
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="recovery-reminders" className="font-medium text-sm">
                  Dias dos lembretes
                </label>
                <Input
                  id="recovery-reminders"
                  inputMode="numeric"
                  value={reminders}
                  maxLength={20}
                  disabled={!canWrite || saving}
                  onChange={(event) => setReminders(event.target.value)}
                  aria-describedby="recovery-reminders-help"
                />
                <p id="recovery-reminders-help" className="text-muted-foreground text-xs">
                  Até três dias antes do encerramento, separados por vírgula. Exemplo: 3, 6. Deixe
                  vazio para não enviar lembretes.
                </p>
              </div>
            </div>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Os casos já abertos mantêm os prazos informados. O acompanhamento não aumenta o acesso
              já pago e não autoriza novas tentativas automáticas de débito. Ao terminar o prazo sem
              regularização, a recorrência é encerrada após conferir a situação na operadora.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                disabled={!canWrite || saving || (enabled && !view.configurationReady)}
              >
                {saving ? 'Salvando…' : 'Salvar configuração'}
              </Button>
              <span role="status" className="text-sm text-muted-foreground">
                {notice}
              </span>
            </div>
          </form>
        )}
      </Card>
      <RecoveryReviewClient canWrite={canWrite} />
    </div>
  )
}
