'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { Spinner } from '@/components/ui/spinner'
import { apiSend } from '@/lib/api'
import type { UserView } from '@/lib/types'

const ProfileSchema = z.object({
  firstName: z.string().min(1, 'Informe o nome').max(100),
  lastName: z.string().min(1, 'Informe o sobrenome').max(100),
  phone: z.string().max(20).optional(),
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

export function ProfileClient({ user }: { user: UserView }) {
  return (
    <div className="flex flex-col gap-6">
      <ProfileForm user={user} />
      <PasswordForm />
    </div>
  )
}

function ProfileForm({ user }: { user: UserView }) {
  const router = useRouter()
  const [firstName, setFirstName] = useState(user.firstName)
  const [lastName, setLastName] = useState(user.lastName)
  const [phone, setPhone] = useState(user.phone ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = ProfileSchema.safeParse({ firstName, lastName, phone: phone || undefined })
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
        phone: parsed.data.phone ?? null,
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
          <Field label="Telefone (opcional)" htmlFor="phone" error={errors.phone}>
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-invalid={Boolean(errors.phone)}
            />
          </Field>
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
  const router = useRouter()
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
        toast.success('Senha alterada! Entre novamente com a nova senha.')
        router.replace('/login')
        router.refresh()
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
