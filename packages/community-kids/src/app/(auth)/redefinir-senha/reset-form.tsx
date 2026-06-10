'use client'

import { Button } from '@sistemazero/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@sistemazero/ui/card'
import { Field } from '@sistemazero/ui/label'
import { PasswordInput } from '@sistemazero/ui/password-input'
import { Spinner } from '@sistemazero/ui/spinner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

const Schema = z
  .object({
    password: z.string().min(10, 'A senha precisa de ao menos 10 caracteres'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'As senhas não coincidem',
    path: ['confirm'],
  })

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_RESET_TOKEN: 'Link inválido ou já utilizado. Solicite um novo.',
  RESET_TOKEN_EXPIRED: 'Link expirado. Solicite um novo.',
  VALIDATION_ERROR: 'Senha inválida (mínimo de 10 caracteres).',
}

export function ResetForm({ token }: { token: string }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({})
  const [loading, setLoading] = useState(false)

  if (!token) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl">Link inválido</CardTitle>
          <CardDescription>
            Este link de redefinição está incompleto. Solicite um novo em "Esqueci minha senha".
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/esqueci-senha" className="text-interactive hover:text-interactive-hover">
              Solicitar novo link
            </Link>
          </p>
        </CardContent>
      </Card>
    )
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = Schema.safeParse({ password, confirm })
    if (!parsed.success) {
      const fieldErrors: { password?: string; confirm?: string } = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]
        if (key === 'password' || key === 'confirm') fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, newPassword: parsed.data.password }),
      })
      if (res.ok) {
        toast.success('Senha definida! Entre com sua nova senha.')
        router.replace('/login')
        return
      }
      const data = (await res.json().catch(() => null)) as { error?: { code?: string } } | null
      toast.error(ERROR_MESSAGES[data?.error?.code ?? ''] ?? 'Não foi possível redefinir a senha.')
    } catch {
      toast.error('Falha de rede. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Definir senha</CardTitle>
        <CardDescription>Crie a senha de acesso à sua área de aluno.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Field label="Nova senha" htmlFor="password" error={errors.password}>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(errors.password)}
            />
          </Field>
          <Field label="Confirmar senha" htmlFor="confirm" error={errors.confirm}>
            <PasswordInput
              id="confirm"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-invalid={Boolean(errors.confirm)}
            />
          </Field>
          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? <Spinner /> : null}
            Salvar senha
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
