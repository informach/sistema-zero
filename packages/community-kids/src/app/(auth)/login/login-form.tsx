'use client'

import {
  sessionFetch as fetch,
  notifySessionChange,
} from '@sistemazero/member-shell/lib/session-fetch'
import { Button } from '@sistemazero/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@sistemazero/ui/card'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { PasswordInput } from '@sistemazero/ui/password-input'
import { Spinner } from '@sistemazero/ui/spinner'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { AUTH_CARD, AUTH_TITLE } from '@/components/kids/auth-card'
import { parentLoginDestination } from '@/lib/entry-destination'

const emailSchema = z.string().email('E-mail inválido')

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'E-mail ou senha incorretos.',
  INVALID_OTP: 'Código inválido ou expirado.',
  INACTIVE: 'Conta inativa. Fale com o suporte.',
  INVALID_INPUT: 'Dados inválidos.',
  TOO_MANY_ATTEMPTS: 'Muitas tentativas. Aguarde um minuto e tente novamente.',
  SERVICE_UNAVAILABLE: 'Serviço indisponível no momento. Tente novamente em instantes.',
}

type Mode = 'password' | 'otp'
type Errors = { email?: string; password?: string; code?: string }

/** Entrada exclusiva do responsável por senha ou código enviado ao e-mail. */
export function LoginForm() {
  const [mode, setMode] = useState<Mode>('otp')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [loading, setLoading] = useState(false)

  function goHome() {
    // Navegação de DOCUMENTO de propósito: o login muda cookies HttpOnly e o
    // par `router.replace + router.refresh` corre um contra o outro (o refresh
    // não espera a navegação commitar e re-renderiza /login, que agora redireciona
    // — vercel/next.js#54766; o aluno ficava preso no /login até um F5). O full
    // load garante que o servidor veja a sessão nova; `replace` tira o /login do
    // histórico (voltar não retorna ao form).
    notifySessionChange()
    // O `next` interno do link (área dos pais, ou a fase que a criança vai abrir depois) é
    // conferido em `parentLoginDestination`; o resto cai na área dos pais.
    window.location.replace(parentLoginDestination(window.location.search))
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
      // Anti-enumeração: com o AUTH de pé a resposta é sempre 200 — mas rate
      // limit (429) e indisponibilidade (503) são reais e o aluno precisa saber.
      const res = await post('/api/auth/otp/request', { email, purpose: 'sign_in' })
      if (!res.ok) {
        await toastError(res, 'Não foi possível enviar o código.')
        return
      }
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
      const data = (await res.json().catch(() => null)) as { error?: { code?: string } } | null
      const errCode = data?.error?.code ?? ''
      toast.error(ERROR_MESSAGES[errCode] ?? 'Não foi possível entrar.')
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
    <Card className={AUTH_CARD}>
      <CardHeader>
        <CardTitle className={AUTH_TITLE}>Área dos pais</CardTitle>
        <CardDescription>
          {mode === 'password'
            ? 'Entre com o seu e-mail e sua senha.'
            : 'Receba um código no e-mail do responsável.'}
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
            <Button type="submit" disabled={loading} className="mt-2 h-11">
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
              <Field label="Código enviado ao seu e-mail" htmlFor="code" error={errors.code}>
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
            <Button type="submit" disabled={loading} className="mt-2 h-11">
              {loading ? <Spinner /> : null}
              {codeSent ? 'Entrar' : 'Enviar código'}
            </Button>
            {codeSent ? (
              <button
                type="button"
                onClick={() => sendCode()}
                disabled={loading}
                className="min-h-11 text-center text-sm text-interactive hover:text-interactive-hover"
              >
                Reenviar código
              </button>
            ) : null}
          </form>
        )}

        <div className="mt-4 flex flex-col gap-2">
          {
            <button
              type="button"
              onClick={() => switchMode(mode === 'password' ? 'otp' : 'password')}
              className="min-h-11 text-center text-sm text-interactive hover:text-interactive-hover"
            >
              {mode === 'password' ? 'Entrar com código por e-mail' : 'Entrar com senha'}
            </button>
          }
          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/esqueci-senha"
              className="inline-flex min-h-11 items-center text-interactive hover:text-interactive-hover"
            >
              Esqueci minha senha
            </Link>
          </p>
        </div>
        <Link
          href="/login"
          className="mt-3 flex min-h-11 items-center justify-center text-sm underline underline-offset-4"
        >
          Voltar à escolha de entrada
        </Link>
      </CardContent>
    </Card>
  )
}
