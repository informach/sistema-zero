'use client'

import { UserAvatar } from '@sistemazero/member-shell/components/user-avatar'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { PasswordInput } from '@sistemazero/ui/password-input'
import { Spinner } from '@sistemazero/ui/spinner'
import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { GuideBalloon } from '@/components/kids/parent-guide'
import {
  ADULT_COMMUNITY_INSTAGRAM,
  ADULT_COMMUNITY_INSTAGRAM_URL,
  isProfileAgeRestricted,
  PROFILE_AGE_ERROR_MESSAGE,
} from '@/lib/profile-age'
import type { ProfileView } from '@/lib/types'

const JSON_HEADERS = { 'content-type': 'application/json' }

export function ProfileTile({
  profile,
  photoUrl,
  managing,
  disabled,
  onSelect,
  onEdit,
  buttonRef,
  ariaDescribedBy,
}: {
  profile: ProfileView
  /** SNAPSHOT do avatar 3D (members) — a ÚNICA fonte da cara da criança (24/07). */
  photoUrl: string | null
  managing: boolean
  disabled: boolean
  onSelect: () => void
  onEdit: () => void
  buttonRef?: React.Ref<HTMLButtonElement>
  ariaDescribedBy?: string
}) {
  return (
    <button
      ref={buttonRef}
      aria-describedby={ariaDescribedBy}
      type="button"
      disabled={disabled}
      onClick={managing ? onEdit : onSelect}
      className="kid-pop group flex w-28 flex-col items-center gap-2 rounded-2xl p-2 disabled:opacity-50"
    >
      <span className="relative">
        <UserAvatar
          avatarUrl={photoUrl}
          firstName={profile.name}
          size="xl"
          className="size-20 ring-2 ring-transparent transition group-hover:ring-primary"
        />
        {managing ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/40 text-background">
            <Pencil className="size-6" />
          </span>
        ) : null}
      </span>
      <span className="line-clamp-1 max-w-full font-semibold text-foreground text-sm">
        {profile.name}
      </span>
    </button>
  )
}

/**
 * Formulário de criar/editar perfil (nome + nascimento + perfil público). SEM foto
 * (24/07): a cara da criança vem EXCLUSIVAMENTE do snapshot do avatar 3D — ela
 * mesma troca em /meu-avatar; os pais não editam imagem.
 */
export function ProfileForm({
  editing,
  busy,
  showGuideHint = false,
  onCancel,
  onSave,
  onArchive,
}: {
  editing: { mode: 'create' } | { mode: 'edit'; profile: ProfileView }
  busy: boolean
  /** Passo `form` do tutorial guiado dos pais: dica do Zappy no topo. */
  showGuideHint?: boolean
  onCancel: () => void
  onSave: (
    name: string,
    birthDate: string | null,
    publicProfileEnabled: boolean,
    existing?: ProfileView,
  ) => void
  onArchive: (p: ProfileView) => void
}) {
  const isEdit = editing.mode === 'edit'
  const profile = isEdit ? editing.profile : null
  const [name, setName] = useState(profile?.name ?? '')
  const [birthDate, setBirthDate] = useState(profile?.birthDate ?? '')
  const [publicProfileEnabled, setPublicProfileEnabled] = useState(
    profile?.publicProfileEnabled ?? false,
  )
  // `max` do seletor = hoje (nascimento não pode ser no futuro).
  const today = new Date().toISOString().slice(0, 10)
  // O auth exige nome com ≥3 caracteres — validar AQUI dá a mensagem amigável em
  // vez do toast genérico ("Bê" e "Jô" caíam num "Não foi possível salvar").
  const trimmedName = name.trim()
  const nameTooShort = trimmedName.length > 0 && trimmedName.length < 3
  const birthDateChanged = birthDate !== (profile?.birthDate ?? '')
  const ageRestricted =
    birthDate.length > 0 && birthDateChanged && isProfileAgeRestricted(birthDate, today)

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-12">
      {showGuideHint ? (
        <GuideBalloon arrow="none">
          Coloque o nome da criança. A data de nascimento é opcional, e é aqui que você decide se o
          perfil aparece para outras crianças na comunidade.
        </GuideBalloon>
      ) : null}
      <h1 className="sz-display text-2xl text-foreground">
        {isEdit ? 'Editar perfil' : 'Novo perfil'}
      </h1>
      <form
        className="flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault()
          if (busy || trimmedName.length < 3 || ageRestricted) return
          onSave(trimmedName, birthDate || null, publicProfileEnabled, profile ?? undefined)
        }}
      >
        <Field
          label="Nome do perfil"
          htmlFor="profileName"
          error={nameTooShort ? 'O nome precisa de pelo menos 3 letras.' : undefined}
        >
          <Input
            id="profileName"
            name="profileName"
            autoComplete="off"
            value={name}
            maxLength={60}
            placeholder="Ex.: Sofia"
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <Field
          label="Data de nascimento da criança (opcional)"
          htmlFor="profileBirthDate"
          error={ageRestricted ? PROFILE_AGE_ERROR_MESSAGE : undefined}
        >
          <Input
            id="profileBirthDate"
            name="birthDate"
            type="date"
            autoComplete="off"
            value={birthDate}
            max={today}
            onChange={(e) => setBirthDate(e.target.value)}
          />
          <p className="mt-1 text-muted-foreground text-xs">
            Só os responsáveis editam. Para conhecer a comunidade de adultos, fale com a gente no
            Instagram{' '}
            <a
              href={ADULT_COMMUNITY_INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-primary underline underline-offset-2"
            >
              {ADULT_COMMUNITY_INSTAGRAM}
            </a>
            .
          </p>
        </Field>

        {/* Também na CRIAÇÃO (04/08/2026): o pai decide o perfil público já no primeiro
            preenchimento — antes o opt-in só existia na edição, e ninguém voltava para
            ligá-lo. Nasce DESLIGADO (opt-in de verdade); o auth aceita o campo no create
            desde o mesmo lote. */}
        <label className="flex items-start gap-3 rounded-2xl border-2 border-border bg-card p-4">
          <input
            name="publicProfileEnabled"
            type="checkbox"
            checked={publicProfileEnabled}
            onChange={(e) => setPublicProfileEnabled(e.target.checked)}
            className="mt-1 size-4 accent-primary"
          />
          <span className="flex flex-col gap-1">
            <span className="font-semibold text-sm">Perfil público na comunidade kids</span>
            <span className="text-muted-foreground text-xs">
              Mostra nome, avatar, conquistas e quarto para outras crianças. Nunca mostra e-mail,
              telefone ou nascimento.
            </span>
          </span>
        </label>

        <div className="flex items-center justify-between gap-3">
          {profile ? (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => onArchive(profile)}
              className="text-destructive"
            >
              <Trash2 className="size-4" /> Remover
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy || trimmedName.length < 3 || ageRestricted}>
              {busy ? <Spinner className="size-4" /> : 'Salvar'}
            </Button>
          </div>
        </div>
      </form>
    </main>
  )
}

/**
 * Troca a senha da CONTA do responsável (Área dos pais — sessão da conta). É da
 * CONTA, não do perfil: por isso fica aqui e NÃO na página "Meu perfil" da criança.
 * Trocar a senha revoga TODAS as sessões no auth → re-login (navegação de documento).
 */
export function ParentPasswordChange({ onCancel }: { onCancel: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const formId = 'parentPasswordChangeForm'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 10) {
      setError('A nova senha precisa de ao menos 10 caracteres.')
      return
    }
    if (newPassword !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/auth/me/password', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      if (res.ok) {
        toast.success('Senha alterada! Entre novamente com a nova senha.')
        window.location.replace('/login')
        return
      }
      const data = (await res.json().catch(() => null)) as { error?: { code?: string } } | null
      setError(
        data?.error?.code === 'INVALID_CREDENTIALS'
          ? 'Senha atual incorreta.'
          : 'Não foi possível alterar a senha.',
      )
    } catch {
      setError('Falha de rede. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      onClose={() => {
        if (!saving) onCancel()
      }}
      title="Alterar senha do responsável"
      description="Por segurança, você será desconectado de todos os dispositivos."
      className="max-w-sm rounded-2xl"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} disabled={saving || !currentPassword || !newPassword}>
            {saving ? <Spinner className="size-4" /> : 'Alterar'}
          </Button>
        </>
      }
    >
      <form id={formId} className="flex flex-col gap-4" onSubmit={onSubmit}>
        <Field label="Senha atual" htmlFor="currentPassword">
          <PasswordInput
            id="currentPassword"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </Field>
        <Field label="Nova senha" htmlFor="newPassword">
          <PasswordInput
            id="newPassword"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </Field>
        <Field label="Confirmar nova senha" htmlFor="confirmPassword" error={error ?? undefined}>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
      </form>
    </Dialog>
  )
}
