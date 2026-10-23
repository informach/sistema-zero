'use client'

import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Spinner } from '@sistemazero/ui/spinner'
import { useState } from 'react'
import { z } from 'zod'
import { safeNextPath } from '@/lib/paths'

const Schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
})

interface LoginError {
  title: string
  detail?: string
}

/**
 * O erro fica no formulário até a pessoa tentar de novo (era um aviso que sumia sozinho): diz o
 * que houve e o que fazer.
 */
const ERROR_MESSAGES: Record<string, LoginError> = {
  INVALID_CREDENTIALS: {
    title: 'E-mail ou senha não conferem.',
    detail: 'Confira e tente de novo.',
  },
  FORBIDDEN: {
    title: 'Este e-mail não tem acesso ao admin.',
    detail:
      'O admin é só para a equipe. Se você é responsável por uma criança, entre pela Comunidade dos Criadores.',
  },
  INACTIVE: {
    title: 'Esta conta está inativa.',
    detail: 'Fale com alguém da equipe que seja Admin.',
  },
  INVALID_INPUT: { title: 'Confira o e-mail e a senha.' },
  TOO_MANY_ATTEMPTS: {
    title: 'Foram muitas tentativas seguidas.',
    detail: 'Espere um instante e tente de novo.',
  },
  SERVICE_UNAVAILABLE: {
    title: 'O admin não respondeu agora.',
    detail: 'Tente de novo em instantes.',
  },
}

const GENERIC_ERROR: LoginError = { title: 'Não foi possível entrar.', detail: 'Tente de novo.' }
const NETWORK_ERROR: LoginError = {
  title: 'Não conseguimos conectar agora.',
  detail: 'Confira a internet e tente de novo.',
}

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<LoginError | null>(null)

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
    setFormError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })
      if (res.ok) {
        // `?next=` preservado pelo proxy (deep-link no painel); validado anti
        // open-redirect. Lido aqui (event handler, só client) p/ não precisar
        // de Suspense de useSearchParams.
        const next = safeNextPath(new URLSearchParams(window.location.search).get('next'))
        // Navegação de DOCUMENTO: o login muda cookies HttpOnly e `router.replace
        // + router.refresh` corre um contra o outro (vercel/next.js#54766 — o
        // refresh re-renderiza /login, que agora redireciona, e o operador ficava
        // preso no /login até um F5; bug visto no community, mesmo padrão aqui).
        window.location.replace(next ?? '/admin/professor')
        return
      }
      const data = (await res.json().catch(() => null)) as { error?: { code?: string } } | null
      setFormError(ERROR_MESSAGES[data?.error?.code ?? ''] ?? GENERIC_ERROR)
    } catch {
      setFormError(NETWORK_ERROR)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex w-full max-w-[420px] flex-col gap-5 rounded-3xl border border-border bg-card p-8 md:p-9">
      <div className="space-y-1.5">
        <h1 className="font-display text-[28px] font-bold leading-tight">Entrar</h1>
        <p className="text-[15px] text-muted-foreground">
          Que bom ter você aqui. Entre com o e-mail da equipe.
        </p>
      </div>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field label="E-mail" htmlFor="email" error={errors.email}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(errors.email)}
            className="h-11"
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
            className="h-11"
          />
        </Field>
        <Button type="submit" disabled={loading} className="mt-1 h-11 text-[15px]">
          {loading ? <Spinner /> : null}
          Entrar
        </Button>
        <div aria-live="polite">
          {formError ? (
            <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-[15px] text-[#7e1f19]">
              <p className="font-bold">{formError.title}</p>
              {formError.detail ? <p className="mt-0.5">{formError.detail}</p> : null}
            </div>
          ) : null}
        </div>
      </form>
    </div>
  )
}
