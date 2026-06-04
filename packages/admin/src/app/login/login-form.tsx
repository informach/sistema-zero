'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'

const Schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
})

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'E-mail ou senha incorretos.',
  FORBIDDEN: 'Esta conta não tem acesso ao painel.',
  INACTIVE: 'Conta inativa. Procure um administrador.',
  INVALID_INPUT: 'Dados inválidos.',
}

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = Schema.safeParse({ email, password })
    if (!parsed.success) {
      const fieldErrors: { email?: string; password?: string } = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]
        if (key === 'email' || key === 'password') fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    setLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })
      if (res.ok) {
        router.replace('/admin')
        router.refresh()
        return
      }
      const data = (await res.json().catch(() => null)) as { error?: { code?: string } } | null
      toast.error(ERROR_MESSAGES[data?.error?.code ?? ''] ?? 'Não foi possível entrar.')
    } catch {
      toast.error('Falha de rede. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        {/* Logo dual-theme (mesmos SVGs da referência/community): dark ⇄ light */}
        <div className="flex justify-center pb-1">
          <Image
            src="/logo_dark.svg"
            width={515}
            height={75}
            alt="Sistema Zero"
            className="hidden h-auto w-[220px] max-w-full dark:block"
            priority
          />
          <Image
            src="/logo_white.svg"
            width={515}
            height={72}
            alt="Sistema Zero"
            className="block h-auto w-[220px] max-w-full dark:hidden"
            priority
          />
        </div>
        <CardTitle className="sr-only">Sistema Zero — Admin</CardTitle>
        <CardDescription className="text-center">
          Entre com sua conta de administrador.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Field label="E-mail" htmlFor="email" error={errors.email}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errors.email)}
            />
          </Field>
          <Field label="Senha" htmlFor="password" error={errors.password}>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(errors.password)}
            />
          </Field>
          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? <Spinner /> : null}
            Entrar
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
