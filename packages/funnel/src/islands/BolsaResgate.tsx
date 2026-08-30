import { formatTelefone } from '@sistemazero/ui/phone'
import { useId, useState } from 'react'
import { ApiError, apiPost } from '../lib/api-fetch'

/**
 * Form de resgate da Bolsa do Primeiro Jogo (landing /bolsa/<codigo>). Dados do
 * RESPONSÁVEL (a bolsa é kids — mesmo aviso do pré-checkout); telefone opcional.
 * O resgate é retomável no servidor: repetir o envio após uma falha CONTINUA de
 * onde parou (mesmo e-mail), então o botão de tentar de novo é sempre seguro.
 */
export interface BolsaResgateProps {
  code: string
  referrerName: string
}

type Phase = 'form' | 'processing' | 'done'
type Errors = Partial<Record<'nome' | 'email', string>>

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export default function BolsaResgate({ code, referrerName }: BolsaResgateProps) {
  const [phase, setPhase] = useState<Phase>('form')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const uid = useId()

  function validate(): boolean {
    const next: Errors = {}
    if (nome.trim().length < 2) next.nome = 'Informe o nome completo do responsável.'
    if (!EMAIL_RE.test(email.trim())) next.email = 'Informe um e-mail válido.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function resgatar() {
    if (submitting || !validate()) return
    setSubmitting(true)
    setErroGeral(null)
    try {
      const res = await apiPost<{ status: 'completed' | 'processing' }>('/api/bolsa/resgatar', {
        code,
        nome: nome.trim(),
        email: email.trim(),
        ...(telefone.trim() ? { telefone: telefone.trim() } : {}),
      })
      setPhase(res.status === 'completed' ? 'done' : 'processing')
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'SCHOLARSHIP_ALREADY_REDEEMED') {
          setErroGeral(
            'Esse e-mail já resgatou a bolsa. Procure o e-mail de boas-vindas na sua caixa de entrada (vale olhar o spam) ou use "Esqueci minha senha" na plataforma.',
          )
        } else if (err.code === 'CODE_NOT_FOUND') {
          setErroGeral('Este link de bolsa não está mais ativo.')
        } else if (err.code === 'SCHOLARSHIP_FAILED') {
          setErroGeral(
            'Não conseguimos concluir o resgate para esse e-mail. Fale com a gente em contato@sistemazero.com.br que resolvemos rapidinho.',
          )
        } else {
          setErroGeral('Não foi possível concluir agora. Tente de novo em instantes.')
        }
      } else {
        setErroGeral('Não foi possível concluir agora. Confira a conexão e tente de novo.')
      }
      setSubmitting(false)
      return
    }
    setSubmitting(false)
  }

  if (phase === 'done') {
    return (
      <div className="card rounded-2xl border-line/80 bg-card p-6 text-center sm:p-8">
        <p className="text-4xl" aria-hidden="true">
          🎉
        </p>
        <h2 className="mt-2 text-xl font-bold text-ink">Bolsa ativada!</h2>
        <p className="mt-3 text-sm text-muted">
          Enviamos um e-mail para <strong className="text-ink">{email.trim()}</strong> com o link
          para criar a sua senha (vale olhar o spam). Depois é só entrar, criar o perfil da criança
          e começar o primeiro jogo.
        </p>
      </div>
    )
  }

  if (phase === 'processing') {
    return (
      <div className="card rounded-2xl border-line/80 bg-card p-6 text-center sm:p-8">
        <h2 className="text-xl font-bold text-ink">Quase lá…</h2>
        <p className="mt-3 text-sm text-muted">
          Estamos finalizando o seu resgate. Aguarde alguns segundos e toque no botão abaixo.
        </p>
        <button
          type="button"
          onClick={() => {
            setPhase('form')
            void resgatar()
          }}
          className="btn btn-primary mt-5"
        >
          Concluir resgate
        </button>
      </div>
    )
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void resgatar()
      }}
      className="card flex flex-col gap-4 rounded-2xl border-line/80 bg-card p-6 sm:p-8"
    >
      <p className="rounded-xl border border-cyan/30 bg-cyan/10 px-4 py-3 text-sm text-ink">
        <strong>Estes dados são do responsável</strong> (mãe, pai ou tutor). O perfil da criança
        (nome e idade) você cria depois, já dentro da plataforma.
      </p>

      <div>
        <label htmlFor={`${uid}-nome`} className="mb-1.5 block text-sm font-semibold text-ink">
          Nome do responsável
        </label>
        <input
          id={`${uid}-nome`}
          type="text"
          autoComplete="name"
          placeholder="Nome completo do responsável"
          value={nome}
          onChange={(e) => {
            setNome(e.target.value)
            if (errors.nome) setErrors((p) => ({ ...p, nome: undefined }))
          }}
          aria-invalid={errors.nome ? true : undefined}
          className={`w-full rounded-xl border bg-card px-4 py-3 text-ink outline-none transition placeholder:text-muted/60 focus:border-cyan ${errors.nome ? 'border-red-400/70' : 'border-line'}`}
        />
        {errors.nome && <p className="mt-1.5 text-sm text-red-400">{errors.nome}</p>}
      </div>

      <div>
        <label htmlFor={`${uid}-email`} className="mb-1.5 block text-sm font-semibold text-ink">
          E-mail do responsável
        </label>
        <input
          id={`${uid}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="voce@email.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (errors.email) setErrors((p) => ({ ...p, email: undefined }))
          }}
          aria-invalid={errors.email ? true : undefined}
          className={`w-full rounded-xl border bg-card px-4 py-3 text-ink outline-none transition placeholder:text-muted/60 focus:border-cyan ${errors.email ? 'border-red-400/70' : 'border-line'}`}
        />
        {errors.email && <p className="mt-1.5 text-sm text-red-400">{errors.email}</p>}
      </div>

      <div>
        <label htmlFor={`${uid}-telefone`} className="mb-1.5 block text-sm font-semibold text-ink">
          Telefone <span className="font-normal text-muted">(opcional)</span>
        </label>
        <input
          id={`${uid}-telefone`}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 99999-9999"
          value={telefone}
          onChange={(e) => setTelefone(formatTelefone(e.target.value))}
          className="w-full rounded-xl border border-line bg-card px-4 py-3 text-ink outline-none transition placeholder:text-muted/60 focus:border-cyan"
        />
      </div>

      {erroGeral && <p className="text-sm text-red-400">{erroGeral}</p>}

      <button type="submit" disabled={submitting} className="btn btn-primary disabled:opacity-50">
        {submitting ? 'Ativando a bolsa…' : 'Resgatar minha bolsa gratuita'}
      </button>
      <p className="text-center text-xs text-muted">
        Presente de {referrerName}: acesso completo e vitalício, sem pagar nada. Uma bolsa por
        família.
      </p>
    </form>
  )
}
