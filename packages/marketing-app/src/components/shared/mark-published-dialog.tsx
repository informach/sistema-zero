'use client'

import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiSend } from '@/lib/api'
import type { PublicationView } from '@/lib/types'

/**
 * Modo lembrete: a pessoa postou NA MÃO e cola o link do post real. Compartilhado
 * entre o Painel ("hoje/amanhã"), o composer e o detalhe do conteúdo.
 */
export function MarkPublishedDialog({
  publicationId,
  open,
  onClose,
  onDone,
}: {
  publicationId: string
  open: boolean
  onClose: () => void
  /** Recebe a view atualizada (status `published`) p/ o chamador atualizar a lista. */
  onDone: (view: PublicationView) => void
}) {
  const [externalUrl, setExternalUrl] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit() {
    const url = externalUrl.trim()
    if (url && !/^https?:\/\//.test(url)) {
      setUrlError('Cole o link completo, começando com http(s)://')
      return
    }
    setUrlError(null)
    setSaving(true)
    try {
      const view = await apiSend<PublicationView>(
        `/api/marketing/publications/${publicationId}/mark-published`,
        'POST',
        url ? { externalUrl: url } : {},
      )
      toast.success('Publicação marcada como publicada.')
      setExternalUrl('')
      onDone(view)
      onClose()
    } catch (error) {
      const apiError = error as ApiError
      toast.error(
        apiError.status === 409
          ? apiError.message
          : 'Não foi possível marcar como publicada. Tente novamente.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Marcar como publicada"
      description="Confirme que o post já está no ar na rede. Se quiser, cole o link do post real."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Salvando…' : 'Marcar como publicada'}
          </Button>
        </div>
      }
    >
      <Field
        label="Link do post (opcional)"
        htmlFor="mark-published-url"
        error={urlError ?? undefined}
        hint="Fica salvo na publicação e vira o atalho de abrir o post."
      >
        <Input
          id="mark-published-url"
          value={externalUrl}
          onChange={(e) => setExternalUrl(e.target.value)}
          placeholder="https://…"
          inputMode="url"
        />
      </Field>
    </Dialog>
  )
}
