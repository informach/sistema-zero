'use client'

import Link from 'next/link'
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

const emailSchema = z.string().email('E-mail inválido')

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'E-mail ou senha incorretos.',
  INVALID_OTP: 'Código inválido ou expirado.',
  INACTIVE: 'Conta inativa. Fale com o suporte.',
  INVALID_INPUT: 'Dados inválidos.',
}

type Mode = 'password' | 'otp'
type Errors = { email?: string; password?: string; code?: string }

/** Login do aluno: por SENHA (padrão) ou por CÓDIGO (OTP por e-mail, passwordless). */
export function LoginForm() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [loading, setLoading] = useState(false)

  function goHome() {
    router.replace('/')
    router.refresh()
  }

  function setIssues(error: z.ZodError) {
    const next: Errors = {}
    for (const issue of error.issues) {
      const key = issue.path[0]
      if (key === 'email' || key === 'password' || key === 'code') next[key] = issue.message
    }
    setErrors(next)
  }

  async function post(path: string, body: unknown): Promise<Response> {
    return fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  async function toastError(res: Response, fallback: string) {
    const data = (await res.json().catch(() => null)) as { error?: { code?: string } } | null
    toast.error(ERROR_MESSAGES[data?.error?.code ?? ''] ?? fallback)
  }

  async function run(fn: () => Promise<void>) {
    setLoading(true)
    try {
      await fn()
    } catch {
      toast.error('Falha de rede. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function submitPassword() {
    const parsed = z
      .object({ email: emailSchema, password: z.string().min(1, 'Informe a senha') })
      .safeParse({ email, password })
    if (!parsed.success) return setIssues(parsed.error)
    setErrors({})
    await run(async () => {
      const res = await post('/api/auth/login', parsed.data)
      if (res.ok) return goHome()
      await toastError(res, 'Não foi possível entrar.')
    })
  }

  async function sendCode() {
    const parsed = emailSchema.safeParse(email)
    if (!parsed.success) return setErrors({ email: parsed.error.issues[0]?.message })
    setErrors({})
    await run(async () => {
      // Anti-enumeração: o backend responde SEMPRE 200; seguimos para o passo do código.
      await post('/api/auth/otp/request', { email, purpose: 'sign_in' })
      setCodeSent(true)
      toast.success('Se houver uma conta com este e-mail, enviamos um código.')
    })
  }

  async function verifyCode() {
    const parsed = z
      .object({ email: emailSchema, code: z.string().min(4, 'Informe o código') })
      .safeParse({ email, code })
    if (!parsed.success) return setIssues(parsed.error)
    setErrors({})
    await run(async () => {
      const res = await post('/api/auth/otp/verify', { email, code })
      if (res.ok) return goHome()
      await toastError(res, 'Não foi possível entrar.')
    })
  }

  function switchMode(next: Mode) {
    setMode(next)
    setErrors({})
    setCode('')
    setCodeSent(false)
    setPassword('')
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Entrar</CardTitle>
        <CardDescription>
          {mode === 'password'
            ? 'Acesse sua área de aluno.'
            : 'Receba um código de acesso por e-mail.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mode === 'password' ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              await submitPassword()
            }}
            noValidate
            className="flex flex-col gap-4"
          >
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
              <PasswordInput
                id="password"
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
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              await (codeSent ? verifyCode() : sendCode())
            }}
            noValidate
            className="flex flex-col gap-4"
          >
            <Field label="E-mail" htmlFor="email" error={errors.email}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly={codeSent}
                aria-invalid={Boolean(errors.email)}
              />
            </Field>
            {codeSent ? (
              <Field label="Código de acesso" htmlFor="code" error={errors.code}>
                <Input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  aria-invalid={Boolean(errors.code)}
                />
              </Field>
            ) : null}
            <Button type="submit" disabled={loading} className="mt-2">
              {loading ? <Spinner /> : null}
              {codeSent ? 'Entrar' : 'Enviar código'}
            </Button>
            {codeSent ? (
              <button
                type="button"
                onClick={() => sendCode()}
                disabled={loading}
                className="text-center text-sm text-interactive hover:text-interactive-hover"
              >
                Reenviar código
              </button>
            ) : null}
          </form>
        )}

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => switchMode(mode === 'password' ? 'otp' : 'password')}
            className="text-center text-sm text-interactive hover:text-interactive-hover"
          >
            {mode === 'password' ? 'Entrar com código por e-mail' : 'Entrar com senha'}
          </button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/esqueci-senha" className="text-interactive hover:text-interactive-hover">
              Esqueci minha senha
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
