import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { PasswordInput } from '@sistemazero/ui/password-input'
import { useState } from 'react'
import { AdminLoginSchema } from '../../lib/admin-schema'
import { apiPost } from '../../lib/api-fetch'

type FieldErr = { email?: string; password?: string }

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [fieldErr, setFieldErr] = useState<FieldErr>({})

  async function entrar() {
    if (submitting) return
    const parsed = AdminLoginSchema.safeParse({ email, password })
    if (!parsed.success) {
      const fe: FieldErr = {}
      for (const issue of parsed.error.issues) {
        const k = String(issue.path[0] ?? '')
        if ((k === 'email' || k === 'password') && !fe[k]) fe[k] = issue.message
      }
      setFieldErr(fe)
      setErro(null)
      return
    }
    setFieldErr({})
    setSubmitting(true)
    setErro(null)
    try {
      await apiPost('/api/admin/login', parsed.data)
      window.location.href = '/admin'
    } catch {
      setErro('E-mail ou senha inválidos, ou sua conta não tem acesso ao painel.')
      setSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-sm p-7 shadow-2xl shadow-black/40">
      <div className="flex flex-col items-center text-center">
        {/* Logo do sistema-zero (versão p/ fundo escuro — o /admin é sempre dark). */}
        <img
          src="/logo_dark.svg"
          alt="Sistema Zero"
          width={515}
          height={44}
          className="h-auto w-[196px] max-w-full"
        />
        <h1 className="mt-6 text-xl font-bold text-foreground">Painel administrativo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Entre com sua conta para acessar os dados do funil.
        </p>
      </div>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void entrar()
        }}
        className="mt-6 flex flex-col gap-4"
      >
        <Field label="E-mail" htmlFor="admin-email" error={fieldErr.email}>
          <Input
            id="admin-email"
            type="email"
            autoFocus
            autoComplete="username"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (fieldErr.email) setFieldErr((p) => ({ ...p, email: undefined }))
            }}
            aria-invalid={fieldErr.email ? true : undefined}
          />
        </Field>

        <Field label="Senha" htmlFor="admin-senha" error={fieldErr.password}>
          <PasswordInput
            id="admin-senha"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (fieldErr.password) setFieldErr((p) => ({ ...p, password: undefined }))
            }}
            aria-invalid={fieldErr.password ? true : undefined}
          />
        </Field>

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <Button type="submit" disabled={submitting} className="mt-1 h-11 w-full">
          {submitting ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </Card>
  )
}
