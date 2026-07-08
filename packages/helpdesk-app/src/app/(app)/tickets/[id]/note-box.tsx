'use client'

import { Button } from '@sistemazero/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@sistemazero/ui/card'
import { Textarea } from '@sistemazero/ui/textarea'
import { useState } from 'react'
import { toast } from 'sonner'
import { apiSend } from '@/lib/api'
import type { MessageView } from '@/lib/types'

type NoteResponse = { message: MessageView }

/** Nota interna: só para a equipe (não dispara e-mail). */
export function NoteBox({ ticketId, onAdded }: { ticketId: string; onAdded: () => void }) {
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)

  async function add() {
    const text = body.trim()
    if (!text || saving) return
    setSaving(true)
    try {
      await apiSend<NoteResponse>(`/api/helpdesk/tickets/${ticketId}/notes`, 'POST', { body: text })
      toast.success('Nota adicionada.')
      setBody('')
      onAdded()
    } catch {
      toast.error('Não foi possível adicionar a nota. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nota interna</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Anotação só para a equipe"
          className="min-h-24"
          disabled={saving}
          aria-label="Nota interna"
        />
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={add}
            disabled={saving || body.trim().length === 0}
          >
            {saving ? 'Adicionando…' : 'Adicionar nota'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
