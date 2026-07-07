import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'
import { t } from '#core'
import { Button, Modal } from '#ui'
import type { ProTemplate } from '../code/pro-templates'

export interface NewProjectCreateOptions {
  kind: 'pro'
  templateId: string
}

export interface NewProjectModalProps {
  open: boolean
  defaultName: string
  onClose: () => void
  onCreate: (name: string, opts?: NewProjectCreateOptions) => void | Promise<void>
  /** Quando true, mostra a opção de criar um projeto profissional. */
  professionalAvailable?: boolean
  /** Templates profissionais oferecidos (quando `professionalAvailable`). */
  templates?: ProTemplate[]
}

export function NewProjectModal({
  open,
  defaultName,
  onClose,
  onCreate,
  professionalAvailable = false,
  templates = [],
}: NewProjectModalProps): JSX.Element | null {
  const [name, setName] = useState(defaultName)
  const [kind, setKind] = useState<'basic' | 'pro'>('basic')
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) {
      setName(defaultName)
      setKind('basic')
      setTemplateId(templates[0]?.id ?? '')
    }
  }, [open, defaultName, templates])

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
      const opts = kind === 'pro' && templateId ? { kind: 'pro' as const, templateId } : undefined
      await onCreate(name.trim() || defaultName, opts)
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = name.trim() && (kind === 'basic' || Boolean(templateId))

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
            disabled={submitting || !canSubmit}
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

      {professionalAvailable && (
        <fieldset className="mt-4 space-y-2">
          <legend className="text-xs font-semibold uppercase text-sz-fg-mute">
            Tipo de projeto
          </legend>
          <label className="flex items-start gap-2 text-sm text-sz-fg-soft">
            <input
              type="radio"
              name="project-kind"
              checked={kind === 'basic'}
              onChange={() => setKind('basic')}
              className="mt-1"
            />
            <span>
              <span className="font-medium text-sz-fg">Básico</span>
              <span className="block text-xs text-sz-fg-mute">
                Crie com blocos e código, vendo o resultado na hora. Perfeito para começar.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-sz-fg-soft">
            <input
              type="radio"
              name="project-kind"
              checked={kind === 'pro'}
              onChange={() => setKind('pro')}
              className="mt-1"
            />
            <span>
              <span className="font-medium text-sz-fg">Profissional</span>
              <span className="block text-xs text-sz-fg-mute">
                Programe como os profissionais, com vários arquivos e só código (sem blocos).
              </span>
            </span>
          </label>

          {kind === 'pro' && templates.length > 0 && (
            <label className="mt-2 block text-sm text-sz-fg-soft">
              Template
              <select
                name="project-template"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="mt-1 w-full rounded border border-sz-border bg-sz-bg px-3 py-2 text-sm text-sz-fg outline-none focus:border-sz-accent"
              >
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
              {templates.find((tpl) => tpl.id === templateId)?.description && (
                <span className="mt-1 block text-xs text-sz-fg-mute">
                  {templates.find((tpl) => tpl.id === templateId)?.description}
                </span>
              )}
            </label>
          )}
        </fieldset>
      )}
    </Modal>
  )
}
