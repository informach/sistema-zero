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
 * Vincular o POST REAL a uma publicação já marcada como publicada (sem id):
 * cola o link, o backend resolve o id na conta conectada e a coleta de
 * métricas começa. Link que não bate → 404 com mensagem própria.
 */
export function LinkExternalDialog({
  publicationId,
  open,
  onClose,
  onDone,
}: {
  publicationId: string
  open: boolean
  onClose: () => void
  onDone: (view: PublicationView) => void
}) {
  const [url, setUrl] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit() {
    const trimmed = url.trim()
    if (!/^https?:\/\//.test(trimmed)) {
      setUrlError('Cole o link completo, começando com http(s)://')
      return
    }
    setUrlError(null)
    setSaving(true)
    try {
      const view = await apiSend<PublicationView>(
        `/api/marketing/publications/${publicationId}/link-external`,
        'POST',
        { url: trimmed },
      )
      toast.success('Post vinculado. As métricas começam a ser coletadas.')
      setUrl('')
      onDone(view)
      onClose()
    } catch (error) {
      const apiError = error as ApiError
      if (apiError.code === 'EXTERNAL_POST_NOT_FOUND') {
        setUrlError(apiError.message)
      } else {
        toast.error(apiError.message)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Vincular post real"
      description="Cole o link do post que foi ao ar. A plataforma acha o post na conta conectada e passa a coletar as métricas dele."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving || !url.trim()}>
            {saving ? 'Procurando o post…' : 'Vincular'}
          </Button>
        </div>
      }
    >
      <Field label="Link do post" htmlFor="link-external-url" error={urlError ?? undefined}>
        <Input
          id="link-external-url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            setUrlError(null)
          }}
          placeholder="https://…"
          inputMode="url"
        />
      </Field>
    </Dialog>
  )
}
