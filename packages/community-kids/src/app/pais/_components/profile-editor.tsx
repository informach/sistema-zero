'use client'

import { sessionFetch } from '@sistemazero/member-shell/lib/session-fetch'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { ProfileForm } from '@/components/kids/profile-management'
import { trackOnboardingEvent } from '@/lib/onboarding-telemetry'
import { PROFILE_AGE_ERROR_MESSAGE } from '@/lib/profile-age'
import { StudyRequestError, studyErrorMessage, studyRequest } from '@/lib/study-access-client'
import type { ProfileView } from '@/lib/types'
import { childHref } from '../parent-routes'
import { ParentShell } from './parent-shell'

/** Os botões do diálogo em pílula de 44px (o ui desenha 32px com cantos de 8px). */
const DIALOG_ACTIONS =
  'flex flex-wrap justify-end gap-2 [&_button]:min-h-11 [&_button]:rounded-full [&_button]:px-4'

/**
 * Adicionar e editar o perfil de uma criança, numa página da área dos pais (era uma tela que
 * tomava o lugar da área inteira, sem endereço). Salvar uma criança nova leva direto ao acesso
 * nos aparelhos dela, que é o passo seguinte.
 */
export function ProfileEditor({
  parentName,
  profile,
  showGuideHint = false,
}: {
  parentName?: string
  /** Ausente = criança nova. */
  profile?: ProfileView
  /** Primeiro perfil da família: o Zappy explica os campos. */
  showGuideHint?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState(false)
  const back = profile ? childHref(profile.id) : '/pais'

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } catch (error) {
      // ⚠️ Arquivar, mudar o nascimento e ligar o perfil público pedem login de até 15 min
      // (`PARENT_REAUTH_REQUIRED`, full review de 10/10/2026): sem o atalho, o responsável lia
      // o recado e ficava sem caminho. A entrada dos responsáveis volta para esta página.
      if (error instanceof StudyRequestError && error.code === 'PARENT_REAUTH_REQUIRED') {
        const next = encodeURIComponent(window.location.pathname)
        toast.error('Por segurança, entre de novo para salvar essa mudança.', {
          action: {
            label: 'Entrar de novo',
            onClick: () => window.location.assign(`/login/responsavel?next=${next}`),
          },
        })
      } else toast.error(studyErrorMessage(error))
      setBusy(false)
    }
  }

  function save(
    name: string,
    birthDate: string | null,
    publicProfileEnabled: boolean,
    existing?: ProfileView,
  ) {
    void run(async () => {
      try {
        const result = await studyRequest<{ profile: ProfileView }>(
          existing ? `/api/profiles/${existing.id}` : '/api/profiles',
          { name, birthDate, publicProfileEnabled },
          existing ? 'PATCH' : 'POST',
        )
        if (!existing)
          trackOnboardingEvent({ audience: 'parent', action: 'profile_created', step: 'profile' })
        window.location.assign(childHref(result.profile.id))
      } catch (error) {
        if (error instanceof StudyRequestError && error.code === 'PROFILE_AGE_RESTRICTED')
          throw new StudyRequestError(error.code, PROFILE_AGE_ERROR_MESSAGE)
        throw error
      }
    })
  }

  function remove() {
    if (!profile) return
    void run(async () => {
      const response = await sessionFetch(`/api/profiles/${profile.id}`, { method: 'DELETE' })
      if (!response.ok)
        throw new StudyRequestError('PROFILE_REMOVE_FAILED', 'Não foi possível remover o perfil.')
      window.location.assign('/pais')
    })
  }

  return (
    <ParentShell active="familia" parentName={parentName}>
      <Link
        href={back}
        className="-mb-4 inline-flex min-h-11 items-center gap-2 self-start font-bold text-muted-foreground text-sm hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> {profile ? profile.name : 'Família'}
      </Link>
      <ProfileForm
        editing={profile ? { mode: 'edit', profile } : { mode: 'create' }}
        busy={busy}
        showGuideHint={showGuideHint}
        onCancel={() => window.location.assign(back)}
        onSave={save}
        onArchive={() => setRemoving(true)}
      />
      <Dialog
        open={removing}
        onClose={() => {
          if (!busy) setRemoving(false)
        }}
        title="Remover perfil"
        footer={
          <div className={DIALOG_ACTIONS}>
            <Button variant="secondary" disabled={busy} onClick={() => setRemoving(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={busy} onClick={remove}>
              Remover
            </Button>
          </div>
        }
      >
        <p>
          Remover o perfil de {profile?.name}? Os acessos dessa criança serão encerrados. O
          progresso fica guardado.
        </p>
      </Dialog>
    </ParentShell>
  )
}
