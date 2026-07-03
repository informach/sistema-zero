/**
 * Criação em 1 passo: só o nome (2..120 após trim). Ao criar, o store já abre
 * o projeto novo (o <PensaApp> navega sozinho); aqui só fechamos o dialog.
 */
import type { FormEvent, JSX } from 'react'
import { useId, useState } from 'react'
import { usePensaApp, usePensaStore } from '../appContext'
import { Dialog } from '../common/Dialog'

const NAME_MIN = 2
const NAME_MAX = 120

export function NewProjectDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}): JSX.Element | null {
  const { adapter, copy } = usePensaApp()
  const creating = usePensaStore((s) => s.creating)
  const createError = usePensaStore((s) => s.createError)
  const createProject = usePensaStore((s) => s.createProject)
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const inputId = useId()

  const handleClose = (): void => {
    setNameError(null)
    onClose()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < NAME_MIN || trimmed.length > NAME_MAX) {
      setNameError(copy.newProject.nameTooShort)
      return
    }
    setNameError(null)
    const created = await createProject(trimmed, adapter.projectKind ?? 'game')
    if (created) {
      setName('')
      onClose()
    }
  }

  const message = nameError ?? createError

  return (
    <Dialog open={open} onClose={handleClose} title={copy.newProject.title}>
      <form
        onSubmit={(event) => {
          void handleSubmit(event)
        }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor={inputId} className="font-semibold text-pz-text">
            {copy.newProject.nameLabel}
          </label>
          <input
            id={inputId}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={copy.newProject.namePlaceholder}
            maxLength={NAME_MAX}
            autoComplete="off"
            className="min-h-11 w-full rounded-2xl border-2 border-pz-border bg-pz-bg px-4 py-2.5 text-pz-text outline-none placeholder:text-pz-muted focus:border-pz-accent"
          />
        </div>
        {message ? (
          <p
            role="alert"
            className="rounded-2xl bg-pz-bg px-4 py-2.5 text-sm font-semibold text-pz-warn"
          >
            {message}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="min-h-11 rounded-2xl border-2 border-pz-border px-5 font-semibold text-pz-muted transition hover:bg-pz-bg hover:text-pz-text"
          >
            {copy.newProject.cancel}
          </button>
          <button
            type="submit"
            disabled={creating}
            aria-busy={creating}
            className="min-h-11 rounded-2xl bg-pz-accent px-5 font-bold text-pz-accent-fg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {copy.newProject.submit}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
