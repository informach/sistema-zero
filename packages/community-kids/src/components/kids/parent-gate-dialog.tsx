'use client'

import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Field } from '@sistemazero/ui/label'
import { PasswordInput } from '@sistemazero/ui/password-input'
import { Spinner } from '@sistemazero/ui/spinner'
import { useState } from 'react'

/** Gate da área dos pais, isolado da grade de perfis para manter o fluxo de senha reutilizável. */
export function ParentGateDialog({
  busy,
  onCancel,
  onConfirm,
}: {
  busy: boolean
  onCancel: () => void
  onConfirm: (password: string) => void
}) {
  const [password, setPassword] = useState('')
  const formId = 'parentGateForm'
  return (
    <Dialog
      open
      onClose={() => {
        if (!busy) onCancel()
      }}
      title="Área dos pais"
      description="Digite a senha do responsável para gerenciar os perfis."
      className="max-w-sm rounded-2xl"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} disabled={busy || password.length === 0}>
            {busy ? <Spinner className="size-4" /> : 'Entrar'}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (password) onConfirm(password)
        }}
      >
        <Field label="Senha do responsável" htmlFor="parentPassword">
          <PasswordInput
            id="parentPassword"
            value={password}
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
      </form>
    </Dialog>
  )
}
