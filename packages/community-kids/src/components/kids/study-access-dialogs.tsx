'use client'

import {
  STUDY_DURATIONS,
  type StudyDuration,
  type StudyGrantView,
} from '@sistemazero/member-shell/lib/study-access'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { useState } from 'react'
import { accessEndPreviewPhrase, formatAccessEnd, grantIsLive } from '@/lib/study-access-view'

/** Os botões dos diálogos em pílula de 44px, como os do resto da área dos pais. */
export const DIALOG_ACTIONS =
  'flex flex-wrap justify-end gap-2 [&_button]:min-h-11 [&_button]:rounded-full [&_button]:px-4'

export function DurationSelect({
  id,
  value,
  onChange,
  disabled,
  describedBy,
}: {
  id: string
  value: StudyDuration
  onChange: (value: StudyDuration) => void
  disabled?: boolean
  describedBy?: string
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(Number(event.target.value) as StudyDuration)}
      disabled={disabled}
      aria-describedby={describedBy}
      className="min-h-11 w-full rounded-xl border border-input bg-background px-3"
    >
      {STUDY_DURATIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

/**
 * Renovar mostra o que muda antes de confirmar: de quem é o acesso, em qual aparelho, o prazo
 * de hoje e a data nova. O prazo escolhido aqui é estado DESTE diálogo: renovar não mexe no
 * prazo que o responsável deixou no formulário de novo acesso. Quem abre passa `key` pelo id da
 * autorização, e o diálogo nasce com 90 dias a cada abertura.
 */
export function RenewAccessDialog({
  grant,
  name,
  busy,
  onCancel,
  onConfirm,
}: {
  grant: StudyGrantView | null
  name: string
  busy: boolean
  onCancel: () => void
  onConfirm: (durationDays: StudyDuration) => void
}) {
  const [days, setDays] = useState<StudyDuration>(90)
  return (
    <Dialog
      open={grant !== null}
      onClose={() => {
        if (!busy) onCancel()
      }}
      title="Renovar prazo"
      footer={
        <div className={DIALOG_ACTIONS}>
          <Button variant="secondary" disabled={busy} onClick={onCancel}>
            Cancelar
          </Button>
          <Button disabled={busy} onClick={() => onConfirm(days)}>
            {busy ? 'Renovando…' : 'Confirmar novo prazo'}
          </Button>
        </div>
      }
    >
      {grant ? (
        <div className="space-y-4">
          <dl className="grid gap-2 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
            <dt className="font-bold">Perfil</dt>
            <dd>{name}</dd>
            <dt className="font-bold">Aparelho</dt>
            <dd className="break-words">{grant.label}</dd>
            <dt className="font-bold">Prazo atual</dt>
            <dd>
              {grantIsLive(grant)
                ? `Até ${formatAccessEnd(grant.expiresAt)}`
                : `Venceu em ${formatAccessEnd(grant.expiresAt)}`}
            </dd>
          </dl>
          <Field label="Novo prazo, a partir de hoje" htmlFor="renew-duration">
            <DurationSelect
              id="renew-duration"
              value={days}
              onChange={setDays}
              disabled={busy}
              describedBy="renew-end"
            />
          </Field>
          <p id="renew-end" className="text-sm font-bold">
            Nova data: termina {accessEndPreviewPhrase(days)}.
          </p>
          <p className="text-xs text-muted-foreground">
            Só muda o acesso de {name} neste aparelho. Os irmãos continuam como estão.
          </p>
        </div>
      ) : null}
    </Dialog>
  )
}

export function RevokeAccessDialog({
  grant,
  name,
  busy,
  onCancel,
  onConfirm,
}: {
  grant: StudyGrantView | null
  name: string
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog
      open={grant !== null}
      onClose={() => {
        if (!busy) onCancel()
      }}
      title="Encerrar este acesso?"
      footer={
        <div className={DIALOG_ACTIONS}>
          <Button variant="secondary" disabled={busy} onClick={onCancel}>
            Voltar
          </Button>
          <Button variant="destructive" disabled={busy} onClick={onConfirm}>
            Encerrar acesso
          </Button>
        </div>
      }
    >
      <p>
        {name} vai precisar de outro código para entrar{' '}
        {grant?.isCurrentDevice ? 'neste navegador' : `em ${grant?.label ?? 'este aparelho'}`}. Os
        trabalhos salvos na conta continuam guardados.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Um acesso encerrado não volta. Para usar este aparelho de novo, clique em Autorizar aparelho
        outra vez.
      </p>
    </Dialog>
  )
}

export function RenameAccessDialog({
  grant,
  busy,
  onCancel,
  onConfirm,
}: {
  grant: StudyGrantView | null
  busy: boolean
  onCancel: () => void
  onConfirm: (label: string) => void
}) {
  const [label, setLabel] = useState(grant?.label ?? '')
  return (
    <Dialog
      open={grant !== null}
      onClose={() => {
        if (!busy) onCancel()
      }}
      title="Nome do aparelho"
      footer={
        <div className={DIALOG_ACTIONS}>
          <Button variant="secondary" disabled={busy} onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            disabled={busy || label.trim().length < 2}
            onClick={() => onConfirm(label.trim())}
          >
            Salvar nome
          </Button>
        </div>
      }
    >
      <Field label="Nome" htmlFor="rename-device">
        <Input
          id="rename-device"
          value={label}
          maxLength={60}
          onChange={(event) => setLabel(event.target.value)}
        />
      </Field>
    </Dialog>
  )
}
