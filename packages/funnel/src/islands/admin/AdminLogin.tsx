import { useState } from 'react'
import { AdminLoginSchema } from '../../lib/admin-schema'
import { apiPost } from '../../lib/api-fetch'

type FieldErr = { email?: string; password?: string }

const inputBase =
  'w-full rounded-xl border bg-card px-4 py-3 text-ink outline-none transition placeholder:text-muted/60 focus:border-cyan'

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
    <div className="card w-full max-w-sm border-line/80 bg-card-2/60 p-7 shadow-2xl shadow-black/40">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime/15 text-lime">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect
            x="4"
            y="10"
            width="16"
            height="10"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M8 10V8a4 4 0 018 0v2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <h1 className="mt-5 text-xl font-bold text-ink">Painel administrativo</h1>
      <p className="mt-1 text-sm text-muted">Entre com sua conta para acessar os dados do funil.</p>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void entrar()
        }}
        className="mt-6 flex flex-col gap-4"
      >
        <div>
          <label htmlFor="admin-email" className="mb-1.5 block text-sm font-semibold text-ink">
            E-mail
          </label>
          <input
            id="admin-email"
            type="email"
            // biome-ignore lint/a11y/noAutofocus: foco direto no primeiro campo do login
            autoFocus
            autoComplete="username"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (fieldErr.email) setFieldErr((p) => ({ ...p, email: undefined }))
            }}
            aria-invalid={fieldErr.email ? true : undefined}
            className={`${inputBase} ${fieldErr.email ? 'border-red-400/70' : 'border-line'}`}
          />
          {fieldErr.email && <p className="mt-1.5 text-sm text-red-400">{fieldErr.email}</p>}
        </div>

        <div>
          <label htmlFor="admin-senha" className="mb-1.5 block text-sm font-semibold text-ink">
            Senha
          </label>
          <input
            id="admin-senha"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (fieldErr.password) setFieldErr((p) => ({ ...p, password: undefined }))
            }}
            aria-invalid={fieldErr.password ? true : undefined}
            className={`${inputBase} ${fieldErr.password ? 'border-red-400/70' : 'border-line'}`}
          />
          {fieldErr.password && <p className="mt-1.5 text-sm text-red-400">{fieldErr.password}</p>}
        </div>

        {erro && <p className="text-sm text-red-400">{erro}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary mt-1 disabled:opacity-50"
        >
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
