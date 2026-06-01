import { useState } from 'react'
import { AdminLoginSchema } from '../../lib/admin-schema'
import { apiPost } from '../../lib/api-fetch'

type FieldErr = { usuario?: string; senha?: string }

const inputBase =
  'w-full rounded-xl border bg-card px-4 py-3 text-ink outline-none transition placeholder:text-muted/60 focus:border-cyan'

export default function AdminLogin() {
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [fieldErr, setFieldErr] = useState<FieldErr>({})

  async function entrar() {
    if (submitting) return
    const parsed = AdminLoginSchema.safeParse({ usuario, senha })
    if (!parsed.success) {
      const fe: FieldErr = {}
      for (const issue of parsed.error.issues) {
        const k = String(issue.path[0] ?? '')
        if ((k === 'usuario' || k === 'senha') && !fe[k]) fe[k] = issue.message
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
      setErro('Usuário ou senha inválidos.')
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
      <p className="mt-1 text-sm text-muted">Entre para acessar os dados do funil.</p>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void entrar()
        }}
        className="mt-6 flex flex-col gap-4"
      >
        <div>
          <label htmlFor="admin-usuario" className="mb-1.5 block text-sm font-semibold text-ink">
            Usuário
          </label>
          <input
            id="admin-usuario"
            // biome-ignore lint/a11y/noAutofocus: foco direto no primeiro campo do login
            autoFocus
            autoComplete="username"
            value={usuario}
            onChange={(e) => {
              setUsuario(e.target.value)
              if (fieldErr.usuario) setFieldErr((p) => ({ ...p, usuario: undefined }))
            }}
            aria-invalid={fieldErr.usuario ? true : undefined}
            className={`${inputBase} ${fieldErr.usuario ? 'border-red-400/70' : 'border-line'}`}
          />
          {fieldErr.usuario && <p className="mt-1.5 text-sm text-red-400">{fieldErr.usuario}</p>}
        </div>

        <div>
          <label htmlFor="admin-senha" className="mb-1.5 block text-sm font-semibold text-ink">
            Senha
          </label>
          <input
            id="admin-senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => {
              setSenha(e.target.value)
              if (fieldErr.senha) setFieldErr((p) => ({ ...p, senha: undefined }))
            }}
            aria-invalid={fieldErr.senha ? true : undefined}
            className={`${inputBase} ${fieldErr.senha ? 'border-red-400/70' : 'border-line'}`}
          />
          {fieldErr.senha && <p className="mt-1.5 text-sm text-red-400">{fieldErr.senha}</p>}
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
