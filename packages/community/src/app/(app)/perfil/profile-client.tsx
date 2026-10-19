'use client'

import { Input } from '@sistemazero/ui/input'
import { PasswordInput } from '@sistemazero/ui/password-input'
import { brLocalDigits, formatTelefone, phoneDigits } from '@sistemazero/ui/phone'
import { Spinner } from '@sistemazero/ui/spinner'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { FIELD_CONTROL, PASSWORD_CONTROL, ProfileField } from '@/components/community/profile/field'
import { apiSend } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { UserView } from '@/lib/types'

const ProfileSchema = z.object({
  firstName: z.string().min(1, 'Informe o nome').max(100),
  lastName: z.string().min(1, 'Informe o sobrenome').max(100),
  // Obrigatório: todo comprador cadastra telefone na compra (o funil exige) —
  // mesmas regras/mensagens do ContactSchema do funil (BR: DDD + número).
  phone: z
    .string()
    .min(1, 'Informe seu telefone.')
    .refine((v) => {
      const n = phoneDigits(v).length
      return n === 10 || n === 11
    }, 'Telefone inválido. Use DDD + número.'),
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

/** "Dados pessoais": nome, sobrenome e telefone. O e-mail é o vínculo com as compras e não muda. */
export function PersonalDataSection({ user, readOnly }: { user: UserView; readOnly: boolean }) {
  const router = useRouter()
  const [firstName, setFirstName] = useState(user.firstName)
  const [lastName, setLastName] = useState(user.lastName)
  // O auth guarda só dígitos (o funil grava DDD+número na compra); dado legado
  // pode vir com DDI/formato livre → normaliza e exibe com a máscara BR.
  const [phone, setPhone] = useState(formatTelefone(brLocalDigits(user.phone ?? '')))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = ProfileSchema.safeParse({ firstName, lastName, phone })
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
        // Persiste SÓ DÍGITOS (consistente com o que o funil grava no auth).
        phone: phoneDigits(parsed.data.phone),
      })
      toast.success('Dados salvos.')
      router.refresh()
    } catch {
      toast.error('Não foi possível salvar. Tente de novo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section id="dados" aria-labelledby="perfil-dados" className="sz-card scroll-mt-28 p-6 md:p-8">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <h2 id="perfil-dados" className="sz-h3">
          Dados pessoais
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <ProfileField id="firstName" label="Nome" error={errors.firstName}>
            <Input
              id="firstName"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={FIELD_CONTROL}
            />
          </ProfileField>
          <ProfileField id="lastName" label="Sobrenome" error={errors.lastName}>
            <Input
              id="lastName"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={FIELD_CONTROL}
            />
          </ProfileField>
          <ProfileField id="phone" label="Telefone" error={errors.phone}>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(formatTelefone(e.target.value))}
              className={FIELD_CONTROL}
            />
          </ProfileField>
          <ProfileField id="email" label="E-mail" hint="O e-mail não muda por aqui.">
            <Input
              id="email"
              type="email"
              readOnly
              value={user.email}
              className={cn(FIELD_CONTROL, 'bg-background text-muted-foreground')}
            />
          </ProfileField>
        </div>
        {readOnly ? (
          <p className="text-[0.9rem] text-muted-foreground">
            Sessão de suporte somente leitura: os dados não podem ser salvos.
          </p>
        ) : null}
        <button type="submit" disabled={saving || readOnly} className="sz-btn self-start">
          {saving ? <Spinner /> : null}
          Salvar dados
        </button>
      </form>
    </section>
  )
}

/** "Alterar senha": a troca encerra todas as sessões, e a pessoa entra de novo com a senha nova. */
export function PasswordSection({ impersonating }: { impersonating: boolean }) {
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
    <section id="senha" aria-labelledby="perfil-senha" className="sz-card scroll-mt-28 p-6 md:p-8">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <h2 id="perfil-senha" className="sz-h3">
          Alterar senha
        </h2>
        <ProfileField
          id="currentPassword"
          label="Senha atual"
          error={errors.currentPassword}
          className={cn('max-w-[26rem]', PASSWORD_CONTROL)}
        >
          <PasswordInput
            id="currentPassword"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </ProfileField>
        <div className="grid gap-5 sm:grid-cols-2">
          <ProfileField
            id="newPassword"
            label="Nova senha"
            error={errors.newPassword}
            className={PASSWORD_CONTROL}
          >
            <PasswordInput
              id="newPassword"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </ProfileField>
          <ProfileField
            id="confirm"
            label="Confirmar nova senha"
            error={errors.confirm}
            className={PASSWORD_CONTROL}
          >
            <PasswordInput
              id="confirm"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </ProfileField>
        </div>
        <p className="text-[0.9rem] text-muted-foreground">
          {impersonating
            ? 'Numa sessão de suporte a senha não pode ser trocada.'
            : 'Ao trocar a senha, você sai de todos os aparelhos e entra de novo com a senha nova.'}
        </p>
        <button type="submit" disabled={saving || impersonating} className="sz-btn self-start">
          {saving ? <Spinner /> : null}
          Alterar senha
        </button>
      </form>
    </section>
  )
}
