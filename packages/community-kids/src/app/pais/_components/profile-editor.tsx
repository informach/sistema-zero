'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { ProfileForm, type ProfileFormValues } from '@/components/kids/profile-management'
import { trackOnboardingEvent } from '@/lib/onboarding-telemetry'
import { profileAgeMessage } from '@/lib/profile-age'
import { StudyRequestError, studyRequest } from '@/lib/study-access-client'
import type { ProfileView } from '@/lib/types'
import { childHref } from '../parent-routes'
import { ParentShell } from './parent-shell'
import { archiveProfile, RemoveProfileDialog, showProfileActionError } from './remove-profile'

/** O recado para a página da criança viaja no endereço (lido e apagado por ela, `child-client`). */
function comAviso(href: string, aviso: 'fala-entrar' | 'fala-nao-gravou'): string {
  return `${href}${href.includes('?') ? '&' : '?'}aviso=${aviso}`
}

/**
 * Adicionar e editar o perfil de uma criança, numa página da área dos pais (era uma tela que
 * tomava o lugar da área inteira, sem endereço). Salvar uma criança nova leva direto ao acesso
 * nos aparelhos dela, que é o passo seguinte.
 */
export function ProfileEditor({
  parentName,
  profile,
  showGuideHint = false,
  voiceAvailable = false,
}: {
  parentName?: string
  /** Ausente = criança nova. */
  profile?: ProfileView
  /** Primeiro perfil da família: o Zappy explica os campos. */
  showGuideHint?: boolean
  /** A fala está ligada no servidor: o formulário oferece "Falar em vez de escrever". */
  voiceAvailable?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState(false)
  const back = profile ? childHref(profile.id) : '/pais'

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } catch (error) {
      // O login recente que arquivar, o nascimento, o perfil público e a fala pedem tem atalho.
      showProfileActionError(error)
      setBusy(false)
    }
  }

  function save(values: ProfileFormValues, existing?: ProfileView) {
    void run(async () => {
      try {
        const salvar = (corpo: ProfileFormValues) =>
          studyRequest<{ profile: ProfileView }>(
            existing ? `/api/profiles/${existing.id}` : '/api/profiles',
            corpo,
            existing ? 'PATCH' : 'POST',
          )
        let result: { profile: ProfileView }
        try {
          result = await salvar(values)
        } catch (error) {
          // ⚠️ Ligar a fala pede login recente, e na CRIAÇÃO a recusa levava o formulário inteiro
          // junto (o responsável entrava de novo e voltava a uma página vazia). Cria sem a fala e
          // a página da criança explica como ligar depois de entrar de novo.
          if (
            existing ||
            values.voiceInputEnabled !== true ||
            !(error instanceof StudyRequestError) ||
            error.code !== 'PARENT_REAUTH_REQUIRED'
          )
            throw error
          const criado = await salvar({ ...values, voiceInputEnabled: false })
          trackOnboardingEvent({ audience: 'parent', action: 'profile_created', step: 'profile' })
          window.location.assign(comAviso(childHref(criado.profile.id), 'fala-entrar'))
          return
        }
        if (!existing)
          trackOnboardingEvent({ audience: 'parent', action: 'profile_created', step: 'profile' })
        // Um servidor antigo responde 200 sem gravar a fala: confere o que voltou antes de seguir.
        // Na criação o perfil JÁ existe, então segue para a página dela (salvar de novo aqui
        // criaria outro perfil) e o aviso vai junto pelo endereço (um toast antes de navegar
        // sumia com a página); na edição o formulário fica aberto para tentar de novo.
        const falaNaoGravou =
          values.voiceInputEnabled !== undefined &&
          (result.profile.voiceInputEnabled === true) !== values.voiceInputEnabled
        if (falaNaoGravou && existing) {
          toast.error(
            'Não consegui guardar a escolha da fala agora. Confira em Editar perfil daqui a pouco.',
          )
          setBusy(false)
          return
        }
        const destino = childHref(result.profile.id)
        window.location.assign(falaNaoGravou ? comAviso(destino, 'fala-nao-gravou') : destino)
      } catch (error) {
        if (error instanceof StudyRequestError && error.code === 'PROFILE_AGE_RESTRICTED')
          throw new StudyRequestError(error.code, profileAgeMessage(Boolean(existing)))
        throw error
      }
    })
  }

  function remove() {
    if (!profile) return
    void run(async () => {
      await archiveProfile(profile.id)
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
        voiceAvailable={voiceAvailable}
        onCancel={() => window.location.assign(back)}
        onSave={save}
        onArchive={() => setRemoving(true)}
      />
      <RemoveProfileDialog
        name={profile?.name}
        open={removing}
        busy={busy}
        onCancel={() => setRemoving(false)}
        onConfirm={remove}
      />
    </ParentShell>
  )
}
