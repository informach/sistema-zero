'use client'

import { UserAvatar } from '@sistemazero/member-shell/components/user-avatar'
import { Button } from '@sistemazero/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@sistemazero/ui/card'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { PasswordInput } from '@sistemazero/ui/password-input'
import { Spinner } from '@sistemazero/ui/spinner'
import { Camera, Pencil, Trophy } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { apiSend } from '@/lib/api'
import type { UserView } from '@/lib/types'
import { getUserDisplayName } from '@/lib/user-display'

const AVATAR_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const AVATAR_MAX_BYTES = 5 * 1024 * 1024 // 5MB (mesma régua do servidor)

/** Colocação no ranking kids (XP) — `null` = gamificação indisponível (esconde a linha). */
export interface RankingInfo {
  position: number
  totalStudents: number
}

// SEM campo de telefone no kids (decisão da v1): o aluno infanto-juvenil não tem
// telefone próprio — o contato é do RESPONSÁVEL e vive no cadastro da compra.
// A borda PATCH /api/auth/me aceita OMITIR o campo (só não aceita null).
const ProfileSchema = z.object({
  firstName: z.string().min(1, 'Informe o nome').max(100),
  lastName: z.string().min(1, 'Informe o sobrenome').max(100),
})

const PasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: z.string().min(10, 'A nova senha precisa de ao menos 10 caracteres'),
    confirm: z.string(),
  })
  .refine((d) => d.newPassword === d.confirm, {
    message: 'As senhas não coincidem',
    path: ['confirm'],
  })

/**
 * Perfil kids: 1 card de identidade (foto CLICÁVEL = único caminho de troca,
 * nome + e-mail + colocação no ranking kids) e o botão "Editar perfil" abre o
 * modal com os formulários de dados pessoais e senha (decisão 06/2026 — antes
 * eram dois cards soltos na página).
 */
export function ProfileClient({ user, ranking }: { user: UserView; ranking: RankingInfo | null }) {
  const [editing, setEditing] = useState(false)

  return (
    <>
      <IdentityCard user={user} ranking={ranking} onEdit={() => setEditing(true)} />
      <Dialog open={editing} onClose={() => setEditing(false)} title="Editar perfil">
        <div className="flex flex-col gap-5">
          <ProfileForm user={user} />
          <PasswordForm />
        </div>
      </Dialog>
    </>
  )
}

function IdentityCard({
  user,
  ranking,
  onEdit,
}: {
  user: UserView
  ranking: RankingInfo | null
  onEdit: () => void
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite re-selecionar o mesmo arquivo
    if (!file) return
    if (!AVATAR_MIME_TYPES.has(file.type)) {
      toast.error('Formato inválido. Use PNG, JPG ou WebP.')
      return
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error('A foto deve ter no máximo 5MB.')
      return
    }

    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)
    setUploading(true)
    try {
      const form = new FormData()
      form.set('file', file)
      const res = await fetch('/api/me/avatar', { method: 'POST', body: form })
      const data = (await res.json().catch(() => null)) as {
        url?: string
        error?: { message?: string }
      } | null
      if (!res.ok) {
        setPreview(null)
        toast.error(data?.error?.message ?? 'Não foi possível enviar a foto.')
        return
      }
      toast.success('Foto de perfil atualizada!')
      router.refresh()
    } catch {
      setPreview(null)
      toast.error('Falha de rede. Tente novamente.')
    } finally {
      setUploading(false)
      URL.revokeObjectURL(localUrl)
    }
  }

  return (
    <Card>
      {/* Sem CardHeader: o pt-0 default do CardContent deixaria o card sem topo. */}
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-center gap-5">
          {/* ÚNICO caminho de troca da foto: clicar na própria foto. */}
          <button
            type="button"
            aria-label="Trocar foto de perfil"
            title="Trocar foto"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="group relative shrink-0 cursor-pointer overflow-hidden rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <UserAvatar
              avatarUrl={preview ?? user.avatarUrl}
              firstName={user.firstName}
              lastName={user.lastName}
              email={user.email}
              size="xl"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              {uploading ? (
                <Spinner className="text-white" />
              ) : (
                <Camera className="size-6 text-white" />
              )}
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              {getUserDisplayName(user.firstName, user.lastName, user.email)}
            </p>
            <p className="truncate text-muted-foreground text-sm">{user.email}</p>
            {ranking ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm">
                <Trophy className="size-4 shrink-0 text-primary" />
                <span className="font-bold [font-family:var(--font-display)]">
                  {ranking.position}º lugar
                </span>
                <span className="text-muted-foreground">no ranking</span>
              </p>
            ) : null}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onFileChange}
          />
          <Button type="button" variant="outline" onClick={onEdit}>
            <Pencil className="size-4" />
            Editar perfil
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ProfileForm({ user }: { user: UserView }) {
  const router = useRouter()
  const [firstName, setFirstName] = useState(user.firstName)
  const [lastName, setLastName] = useState(user.lastName)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = ProfileSchema.safeParse({ firstName, lastName })
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message
      setErrors(next)
      return
    }
    setErrors({})
    setSaving(true)
    try {
      await apiSend('/api/auth/me', 'PATCH', {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
      })
      toast.success('Perfil atualizado!')
      router.refresh()
    } catch {
      toast.error('Não foi possível salvar. Tente de novo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados pessoais</CardTitle>
        <CardDescription>
          Seu e-mail de acesso é <span className="font-medium">{user.email}</span> e não pode ser
          alterado (é o vínculo com suas compras).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" htmlFor="firstName" error={errors.firstName}>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                aria-invalid={Boolean(errors.firstName)}
              />
            </Field>
            <Field label="Sobrenome" htmlFor="lastName" error={errors.lastName}>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                aria-invalid={Boolean(errors.lastName)}
              />
            </Field>
          </div>
          <Button type="submit" disabled={saving} className="self-start">
            {saving ? <Spinner /> : null}
            Salvar alterações
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = PasswordSchema.safeParse({ currentPassword, newPassword, confirm })
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message
      setErrors(next)
      return
    }
    setErrors({})
    setSaving(true)
    try {
      const res = await fetch('/api/auth/me/password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          currentPassword: parsed.data.currentPassword,
          newPassword: parsed.data.newPassword,
        }),
      })
      if (res.ok) {
        // A troca revoga TODAS as sessões (segurança) → re-login com a senha nova.
        // Navegação de DOCUMENTO: cookies HttpOnly mudaram e `router.replace +
        // router.refresh` corre um contra o outro (vercel/next.js#54766); o full
        // load também descarta o router cache com dados RSC da sessão revogada.
        toast.success('Senha alterada! Entre novamente com a nova senha.')
        window.location.replace('/login')
        return
      }
      const data = (await res.json().catch(() => null)) as { error?: { code?: string } } | null
      toast.error(
        data?.error?.code === 'INVALID_CREDENTIALS'
          ? 'Senha atual incorreta.'
          : 'Não foi possível alterar a senha.',
      )
    } catch {
      toast.error('Falha de rede. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alterar senha</CardTitle>
        <CardDescription>
          Por segurança, ao trocar a senha você será desconectado de todos os dispositivos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Field label="Senha atual" htmlFor="currentPassword" error={errors.currentPassword}>
            <PasswordInput
              id="currentPassword"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              aria-invalid={Boolean(errors.currentPassword)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nova senha" htmlFor="newPassword" error={errors.newPassword}>
              <PasswordInput
                id="newPassword"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                aria-invalid={Boolean(errors.newPassword)}
              />
            </Field>
            <Field label="Confirmar nova senha" htmlFor="confirm" error={errors.confirm}>
              <PasswordInput
                id="confirm"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                aria-invalid={Boolean(errors.confirm)}
              />
            </Field>
          </div>
          <Button type="submit" disabled={saving} className="self-start">
            {saving ? <Spinner /> : null}
            Alterar senha
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
