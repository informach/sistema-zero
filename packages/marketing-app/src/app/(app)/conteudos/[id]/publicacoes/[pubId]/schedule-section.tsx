'use client'

import { Button } from '@sistemazero/ui/button'
import { Card, CardContent } from '@sistemazero/ui/card'
import { ConfirmDialog } from '@sistemazero/ui/confirm-dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiSend } from '@/lib/api'
import { datetimeLocalToIso, isoToDatetimeLocalSp } from '@/lib/dates'
import { canCancelPublication, canSchedule, validateScheduleWindow } from '@/lib/publications'
import type { PublicationView } from '@/lib/types'
import { handleConflict } from '../../../shared'

/**
 * Agendamento: datetime-local em hora de São Paulo, validação client da janela
 * (o backend revalida) e cancelamento. Agendar é rota própria — nunca vai no
 * PATCH, e não existe "limpar horário" de uma agendada (cancele ou reagende).
 */
export function ScheduleSection({
  view,
  onView,
  reload,
}: {
  view: PublicationView
  onView: (view: PublicationView) => void
  reload: () => Promise<void>
}) {
  const [value, setValue] = useState(view.scheduledAt ? isoToDatetimeLocalSp(view.scheduledAt) : '')
  const [error, setError] = useState<string | null>(null)
  const [scheduling, setScheduling] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  // Mesmo padrão do form: re-sincroniza o input só quando a versão muda.
  const syncedVersion = useRef(view.version)
  useEffect(() => {
    if (view.version === syncedVersion.current) return
    syncedVersion.current = view.version
    setValue(view.scheduledAt ? isoToDatetimeLocalSp(view.scheduledAt) : '')
    setError(null)
  }, [view])

  const allowed = canSchedule(view.status)
  const cancelable = canCancelPublication(view.status)

  async function schedule() {
    const iso = datetimeLocalToIso(value)
    if (!iso) {
      setError('Escolha uma data e hora válidas')
      return
    }
    const windowError = validateScheduleWindow(new Date(iso), new Date())
    if (windowError) {
      setError(windowError)
      return
    }
    setError(null)
    setScheduling(true)
    try {
      const updated = await apiSend<PublicationView>(
        `/api/marketing/publications/${view.id}/schedule`,
        'POST',
        { scheduledAt: iso },
      )
      onView(updated)
      toast.success(view.status === 'scheduled' ? 'Publicação reagendada.' : 'Publicação agendada.')
    } catch (err) {
      if (await handleConflict(err, reload)) return
      toast.error((err as ApiError).message)
    } finally {
      setScheduling(false)
    }
  }

  async function cancelPublication() {
    try {
      const updated = await apiSend<PublicationView>(
        `/api/marketing/publications/${view.id}/cancel`,
        'POST',
      )
      onView(updated)
      setCancelOpen(false)
      toast.success('Publicação cancelada.')
    } catch (err) {
      toast.error((err as ApiError).message)
    }
  }

  return (
    <Card id="schedule-section">
      <CardContent className="space-y-4 p-5">
        <h2 className="text-sm font-semibold">Agendamento</h2>
        <Field
          label="Data e hora (horário de São Paulo)"
          htmlFor="composer-schedule-at"
          error={error ?? undefined}
          hint={error ? undefined : 'Janela válida: de agora até 2 anos.'}
        >
          <Input
            id="composer-schedule-at"
            type="datetime-local"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError(null)
            }}
            disabled={!allowed}
          />
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {cancelable ? (
            <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)}>
              Cancelar publicação
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={schedule} disabled={!allowed || scheduling || !value}>
            {scheduling ? 'Agendando…' : view.status === 'scheduled' ? 'Reagendar' : 'Agendar'}
          </Button>
        </div>
      </CardContent>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancelar publicação"
        message="A publicação sai do calendário e não vai ao ar. O conteúdo continua no pipeline."
        confirmText="Cancelar publicação"
        cancelText="Voltar"
        confirmVariant="destructive"
        onConfirm={cancelPublication}
      />
    </Card>
  )
}
