import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'
import { t } from '#core'
import { Button, Modal } from '#ui'

export interface NewProjectModalProps {
  open: boolean
  defaultName: string
  onClose: () => void
  onCreate: (name: string) => void | Promise<void>
}

export function NewProjectModal({
  open,
  defaultName,
  onClose,
  onCreate,
}: NewProjectModalProps): JSX.Element | null {
  const [name, setName] = useState(defaultName)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) setName(defaultName)
  }, [open, defaultName])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [open])

  if (!open) return null

  const submit = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      await onCreate(name.trim() || defaultName)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('projects.newModal.title')}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            {t('projects.newModal.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void submit()}
            disabled={submitting || !name.trim()}
          >
            {submitting ? 'Criando…' : t('projects.newModal.create')}
          </Button>
        </>
      }
    >
      <label className="block text-sm text-sz-fg-soft">
        {t('projects.newModal.nameLabel')}
        <input
          ref={inputRef}
          name="new-project-name"
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit()
          }}
          placeholder={t('projects.newModal.placeholder')}
          className="mt-2 w-full rounded border border-sz-border bg-sz-bg px-3 py-2 text-sm text-sz-fg outline-none focus:border-sz-accent focus-visible:ring-2 focus-visible:ring-sz-accent/60"
        />
      </label>
    </Modal>
  )
}
