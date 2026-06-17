'use client'

import { UserAvatar } from '@sistemazero/member-shell/components/user-avatar'
import type { ProfileView } from '@sistemazero/member-shell/lib/types'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { PasswordInput } from '@sistemazero/ui/password-input'
import { Spinner } from '@sistemazero/ui/spinner'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { KidsMascot } from '@/components/kids/mascot'

const JSON_HEADERS = { 'content-type': 'application/json' }

type Editing = { mode: 'create' } | { mode: 'edit'; profile: ProfileView } | null

/**
 * Grade de perfis estilo Netflix. **Selecionar** entra no perfil (1 clique, sem
 * PIN) → emite a sessão de perfil e recarrega a home. **Área dos pais** abre a
 * gestão: numa sessão de perfil, pede a SENHA do responsável (sai para a conta);
 * numa sessão da conta, gerencia direto (criar/editar/arquivar/foto). O limite de
 * perfis é do plano — criar acima dele devolve 409 (toast).
 */
export function PerfisClient({
  initialProfiles,
  isProfileSession,
}: {
  initialProfiles: ProfileView[]
  isProfileSession: boolean
}) {
  const [profiles, setProfiles] = useState(initialProfiles)
  const [managing, setManaging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [gate, setGate] = useState(false) // modal de senha (sair do perfil)
  const [changingPassword, setChangingPassword] = useState(false) // modal: trocar senha da conta
  const [editing, setEditing] = useState<Editing>(null)

  async function selectProfile(id: string) {
    if (busy) return
    setBusy(true)
    const res = await fetch(`/api/profiles/${id}/select`, { method: 'POST' })
    if (res.ok) {
      window.location.replace('/') // full reload: o servidor passa a ver a sessão de perfil
      return
    }
    setBusy(false)
    toast.error('Não foi possível entrar nesse perfil. Tente de novo.')
  }

  function openParentArea() {
    // Gerenciar exige sessão da CONTA. Numa sessão de perfil, pede a senha (sair).
    if (isProfileSession) setGate(true)
    else setManaging(true)
  }

  async function exitToParent(password: string) {
    setBusy(true)
    const res = await fetch('/api/profile-session/exit', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ password }),
    })
    setBusy(false)
    if (res.ok) {
      window.location.replace('/perfis') // recarrega como sessão da conta → gestão liberada
      return
    }
    toast.error(res.status === 401 ? 'Senha incorreta.' : 'Não foi possível abrir a área dos pais.')
  }

  async function saveProfile(name: string, existing?: ProfileView) {
    setBusy(true)
    const res = existing
      ? await fetch(`/api/profiles/${existing.id}`, {
          method: 'PATCH',
          headers: JSON_HEADERS,
          body: JSON.stringify({ name }),
        })
      : await fetch('/api/profiles', {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({ name }),
        })
    const body = (await res.json().catch(() => null)) as { profile?: ProfileView } | null
    setBusy(false)
    if (res.ok && body?.profile) {
      const saved = body.profile
      setProfiles((prev) =>
        existing ? prev.map((p) => (p.id === saved.id ? saved : p)) : [...prev, saved],
      )
      setEditing(null)
      return
    }
    if (res.status === 409) toast.error('Você atingiu o limite de perfis do seu plano.')
    else if (res.status === 403) toast.error('Abra a área dos pais para gerenciar os perfis.')
    else toast.error('Não foi possível salvar o perfil.')
  }

  async function archiveProfile(p: ProfileView) {
    if (!window.confirm(`Remover o perfil de ${p.name}? O progresso fica guardado.`)) return
    setBusy(true)
    const res = await fetch(`/api/profiles/${p.id}`, { method: 'DELETE' })
    setBusy(false)
    if (res.ok) {
      setProfiles((prev) => prev.filter((x) => x.id !== p.id))
      setEditing(null)
      return
    }
    toast.error('Não foi possível remover o perfil.')
  }

  async function uploadAvatar(p: ProfileView, file: File) {
    setBusy(true)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`/api/profiles/${p.id}/avatar`, { method: 'POST', body: form })
    const body = (await res.json().catch(() => null)) as { url?: string } | null
    setBusy(false)
    if (res.ok && body?.url) {
      const url = body.url
      setProfiles((prev) => prev.map((x) => (x.id === p.id ? { ...x, avatarUrl: url } : x)))
      setEditing((e) =>
        e?.mode === 'edit' && e.profile.id === p.id
          ? { mode: 'edit', profile: { ...e.profile, avatarUrl: url } }
          : e,
      )
      return
    }
    toast.error('Não foi possível trocar a foto.')
  }

  if (editing) {
    return (
      <ProfileForm
        editing={editing}
        busy={busy}
        onCancel={() => setEditing(null)}
        onSave={saveProfile}
        onArchive={archiveProfile}
        onAvatar={uploadAvatar}
      />
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <KidsMascot expression="happy" className="size-20" />
        <h1 className="sz-display text-3xl text-foreground sm:text-4xl">
          {managing ? 'Gerenciar perfis' : 'Quem vai aprender hoje?'}
        </h1>
      </div>

      <ul className="flex flex-wrap justify-center gap-6">
        {profiles.map((p) => (
          <li key={p.id}>
            <ProfileTile
              profile={p}
              managing={managing}
              disabled={busy}
              onSelect={() => selectProfile(p.id)}
              onEdit={() => setEditing({ mode: 'edit', profile: p })}
            />
          </li>
        ))}
        {managing ? (
          <li>
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing({ mode: 'create' })}
              className="kid-pop flex w-28 flex-col items-center gap-2 rounded-2xl p-2 disabled:opacity-50"
            >
              <span className="flex size-20 items-center justify-center rounded-full border-2 border-border border-dashed text-muted-foreground">
                <Plus className="size-8" />
              </span>
              <span className="font-semibold text-muted-foreground text-sm">Adicionar</span>
            </button>
          </li>
        ) : null}
      </ul>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {managing ? (
          <>
            {/* Senha É da CONTA (não do perfil): só aqui, na sessão do responsável. */}
            <Button variant="ghost" onClick={() => setChangingPassword(true)} disabled={busy}>
              Alterar senha do responsável
            </Button>
            <Button variant="secondary" onClick={() => setManaging(false)} disabled={busy}>
              Concluir
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={openParentArea} disabled={busy}>
            Área dos pais
          </Button>
        )}
      </div>

      {gate ? (
        <ParentGate busy={busy} onCancel={() => setGate(false)} onConfirm={exitToParent} />
      ) : null}
      {changingPassword ? (
        <ParentPasswordChange onCancel={() => setChangingPassword(false)} />
      ) : null}
    </main>
  )
}

/** Um rostinho da grade: selecionar (modo normal) ou editar (modo gestão). */
function ProfileTile({
  profile,
  managing,
  disabled,
  onSelect,
  onEdit,
}: {
  profile: ProfileView
  managing: boolean
  disabled: boolean
  onSelect: () => void
  onEdit: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={managing ? onEdit : onSelect}
      className="kid-pop group flex w-28 flex-col items-center gap-2 rounded-2xl p-2 disabled:opacity-50"
    >
      <span className="relative">
        <UserAvatar
          avatarUrl={profile.avatarUrl}
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

/** Formulário de criar/editar perfil (nome + foto + remover). */
function ProfileForm({
  editing,
  busy,
  onCancel,
  onSave,
  onArchive,
  onAvatar,
}: {
  editing: { mode: 'create' } | { mode: 'edit'; profile: ProfileView }
  busy: boolean
  onCancel: () => void
  onSave: (name: string, existing?: ProfileView) => void
  onArchive: (p: ProfileView) => void
  onAvatar: (p: ProfileView, file: File) => void
}) {
  const isEdit = editing.mode === 'edit'
  const profile = isEdit ? editing.profile : null
  const [name, setName] = useState(profile?.name ?? '')
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-12">
      <h1 className="sz-display text-2xl text-foreground">
        {isEdit ? 'Editar perfil' : 'Novo perfil'}
      </h1>

      {profile ? (
        <div className="flex items-center gap-4">
          <UserAvatar
            avatarUrl={profile.avatarUrl}
            firstName={profile.name || name}
            size="xl"
            className="size-20"
          />
          <div>
            <Button variant="secondary" disabled={busy} onClick={() => fileRef.current?.click()}>
              Trocar foto
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onAvatar(profile, file)
                e.target.value = ''
              }}
            />
            <p className="mt-1 text-muted-foreground text-xs">PNG, JPG ou WebP, até 5MB.</p>
          </div>
        </div>
      ) : null}

      <Field label="Nome do perfil" htmlFor="profileName">
        <Input
          id="profileName"
          value={name}
          maxLength={60}
          placeholder="Ex.: Sofia"
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <div className="flex items-center justify-between gap-3">
        {profile ? (
          <Button
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
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
          <Button
            onClick={() => onSave(name.trim(), profile ?? undefined)}
            disabled={busy || name.trim().length === 0}
          >
            {busy ? <Spinner className="size-4" /> : 'Salvar'}
          </Button>
        </div>
      </div>
    </main>
  )
}

/**
 * Troca a senha da CONTA do responsável (Área dos pais — sessão da conta). É da
 * CONTA, não do perfil: por isso fica aqui e NÃO na página "Meu perfil" da criança.
 * Trocar a senha revoga TODAS as sessões no auth → re-login (navegação de documento).
 */
function ParentPasswordChange({ onCancel }: { onCancel: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl">
        <h2 className="sz-display text-xl text-foreground">Alterar senha do responsável</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Por segurança, você será desconectado de todos os dispositivos.
        </p>
        <form className="mt-4 flex flex-col gap-4" onSubmit={onSubmit}>
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
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !currentPassword || !newPassword}>
              {saving ? <Spinner className="size-4" /> : 'Alterar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/** Gate da "área dos pais": pede a senha do responsável para sair do perfil. */
function ParentGate({
  busy,
  onCancel,
  onConfirm,
}: {
  busy: boolean
  onCancel: () => void
  onConfirm: (password: string) => void
}) {
  const [password, setPassword] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl">
        <h2 className="sz-display text-xl text-foreground">Área dos pais</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Digite a senha do responsável para gerenciar os perfis.
        </p>
        <form
          className="mt-4 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (password) onConfirm(password)
          }}
        >
          <Field label="Senha do responsável" htmlFor="parentPassword">
            <PasswordInput
              id="parentPassword"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy || password.length === 0}>
              {busy ? <Spinner className="size-4" /> : 'Entrar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
