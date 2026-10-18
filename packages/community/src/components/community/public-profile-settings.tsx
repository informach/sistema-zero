'use client'

import {
  type AdultProfilePreferences,
  AdultProfilePreferencesSchema,
} from '@sistemazero/core/profiles'
import { apiGet, apiSend } from '@sistemazero/member-shell/lib/api'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Input } from '@sistemazero/ui/input'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'

export function PublicProfileSettings({
  initial,
  viewerId,
  readOnly,
  voiceAvailable = false,
}: {
  initial: AdultProfilePreferences | null
  viewerId: string
  readOnly: boolean
  voiceAvailable?: boolean
}) {
  const [preferences, setPreferences] = useState(initial)
  const [busy, setBusy] = useState(false)
  async function reload() {
    setBusy(true)
    try {
      setPreferences(await apiGet<AdultProfilePreferences>('/api/members/adult/profile'))
    } catch {
      toast.error('Não foi possível carregar suas preferências.')
    } finally {
      setBusy(false)
    }
  }
  async function save() {
    const parsed = AdultProfilePreferencesSchema.safeParse(preferences)
    if (!parsed.success) {
      toast.error('Informe um nome de exibição com até 60 caracteres.')
      return
    }
    setBusy(true)
    try {
      const result = await apiSend<AdultProfilePreferences>(
        '/api/members/adult/profile',
        'PUT',
        parsed.data,
        { 'x-sz-viewer': viewerId },
      )
      setPreferences(result)
      toast.success('Preferências salvas.')
    } catch {
      toast.error('Não foi possível salvar. Suas alterações foram preservadas.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card className="space-y-4 p-6">
      <h2 className="text-xl font-semibold">Identidade na comunidade</h2>
      {preferences ? (
        <>
          <label className="grid gap-2 text-sm">
            Nome de exibição
            <Input
              maxLength={60}
              disabled={busy || readOnly}
              value={preferences.displayName}
              onChange={(event) =>
                setPreferences({ ...preferences, displayName: event.target.value })
              }
            />
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              disabled={busy || readOnly}
              checked={preferences.publicEnabled}
              onChange={(event) =>
                setPreferences({ ...preferences, publicEnabled: event.target.checked })
              }
            />
            <span>
              Exibir meu perfil para os membros da comunidade.
              <span className="mt-1 block text-muted-foreground">
                Nome escolhido, avatar, progresso, conquistas, jogos e espaço 3D. Seus dados de
                acesso continuam privados.
              </span>
            </span>
          </label>
          {voiceAvailable ? (
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={preferences.voiceEnabled}
                disabled={busy || readOnly}
                onChange={(event) =>
                  setPreferences({ ...preferences, voiceEnabled: event.target.checked })
                }
              />
              <span>
                Usar voz no Pensa e no tutor.
                <span className="mt-1 block text-muted-foreground">
                  Você pode desligar quando quiser. Confira a transcrição antes de enviá-la.
                </span>
              </span>
            </label>
          ) : null}
          <div className="flex flex-wrap gap-4">
            <Button disabled={busy || readOnly} onClick={() => void save()}>
              {busy ? 'Salvando...' : 'Salvar preferências'}
            </Button>
            {preferences.publicEnabled ? (
              <Link
                className="self-center text-sm text-primary underline"
                href={`/criador/${viewerId}`}
              >
                Ver meu perfil público
              </Link>
            ) : null}
            <Link className="self-center text-sm text-primary underline" href="/meu-avatar">
              Personalizar avatar 3D
            </Link>
          </div>
        </>
      ) : (
        <>
          <p role="status" className="text-sm text-muted-foreground">
            Preferências indisponíveis agora.
          </p>
          <Button variant="outline" disabled={busy} onClick={() => void reload()}>
            Tentar novamente
          </Button>
        </>
      )}
    </Card>
  )
}
