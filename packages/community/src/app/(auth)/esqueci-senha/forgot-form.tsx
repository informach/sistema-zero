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
const resetSchema = z
  .object({
    code: z.string().min(4, 'Informe o código'),
    password: z.string().min(10, 'Mínimo de 10 caracteres'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ['confirm'],
    message: 'As senhas não conferem',
  })

type Errors = { email?: string; code?: string; password?: string; confirm?: string }

/**
 * Recuperação de senha por OTP (código por e-mail): passo 1 pede o código, passo 2
 * digita o código + a nova senha. Anti-enumeração: o backend responde sempre 200 ao
 * pedir o código (a mesma UI segue para o passo do código de qualquer forma).
 */
export function ForgotForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [loading, setLoading] = useState(false)

  async function post(path: string, body: unknown): Promise<Response> {
    return fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
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

  async function sendCode() {
    const parsed = emailSchema.safeParse(email)
    if (!parsed.success) return setErrors({ email: parsed.error.issues[0]?.message })
    setErrors({})
    await run(async () => {
      await post('/api/auth/otp/request', { email, purpose: 'password_reset' })
      setCodeSent(true)
      toast.success('Se houver uma conta com este e-mail, enviamos um código.')
    })
  }

  async function submitReset() {
    const parsed = resetSchema.safeParse({ code, password, confirm })
    if (!parsed.success) {
      const next: Errors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]
        if (key === 'code' || key === 'password' || key === 'confirm') next[key] = issue.message
      }
      return setErrors(next)
    }
    setErrors({})
    await run(async () => {
      const res = await post('/api/auth/password/reset-otp', {
        email,
        code,
        newPassword: password,
      })
      if (res.ok) {
        toast.success('Senha redefinida! Entre com a nova senha.')
        router.replace('/login')
        return
      }
      const data = (await res.json().catch(() => null)) as { error?: { code?: string } } | null
      toast.error(
        data?.error?.code === 'INVALID_OTP'
          ? 'Código inválido ou expirado.'
          : 'Não foi possível redefinir a senha.',
      )
    })
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Esqueci minha senha</CardTitle>
        <CardDescription>
          {codeSent
            ? 'Digite o código que enviamos por e-mail e escolha uma nova senha.'
            : 'Informe seu e-mail de compra e enviaremos um código para redefinir a senha.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            await (codeSent ? submitReset() : sendCode())
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
            <>
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
              <Field label="Nova senha" htmlFor="password" error={errors.password}>
                <PasswordInput
                  id="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={Boolean(errors.password)}
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
            </>
          ) : null}

          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? <Spinner /> : null}
            {codeSent ? 'Redefinir senha' : 'Enviar código'}
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

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-interactive hover:text-interactive-hover">
              Voltar ao login
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
