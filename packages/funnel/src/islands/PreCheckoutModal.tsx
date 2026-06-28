import { formatTelefone } from '@sistemazero/ui/phone'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { type Ref, useEffect, useId, useRef, useState } from 'react'
import { apiPost } from '../lib/api-fetch'
import { ContactSchema, fieldErrors } from '../lib/contact-schema'

type Errors = Partial<Record<'nome' | 'email' | 'telefone', string>>

/** Navegação + origem do funil, injetadas pela página (a ilha não lê a rota). */
export interface PreCheckoutModalProps {
  /** Prefixo do funil (`/pro/no-comando-da-ia`) p/ montar o destino do checkout. */
  basePath: string
  /** Chave do funil (`pro/no-comando-da-ia`) — gravada na criação do lead. */
  funnel: string
}

export default function PreCheckoutModal({ basePath, funnel }: PreCheckoutModalProps) {
  const [open, setOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const lastFocusedRef = useRef<HTMLElement | null>(null)
  const reduce = useReducedMotion()
  const uid = useId()
  // Funil kids → os dados do pré-checkout são do RESPONSÁVEL (quem compra/paga); o
  // perfil da criança é criado DEPOIS, já na plataforma. A chave é `audience/produto`
  // (audience ∈ {pro, kids}) — ver registry. Deixar isso explícito evita o pai
  // preencher os dados da criança aqui.
  const isKids = funnel.startsWith('kids/')

  // Garante o lead (mesmo p/ quem cai direto na oferta) e marca viu_pagina_vendas
  // com o perfil que veio na URL (`?perfil=`), quando válido.
  useEffect(() => {
    ;(async () => {
      try {
        await apiPost('/api/leads', { funnel })
        // Perfil é POR FUNIL (string livre) — repassa o que veio na URL; o servidor
        // valida `perfil_resultado` (max 32). Antes usava o enum do NCI e descartava
        // os perfis dos outros funis (ex.: kids).
        const perfilParam = new URLSearchParams(window.location.search).get('perfil')?.trim()
        const metadata = perfilParam ? { perfil_resultado: perfilParam.slice(0, 32) } : undefined
        await apiPost('/api/events', {
          eventName: 'viu_pagina_vendas',
          ...(metadata ? { metadata } : {}),
        })
      } catch {
        /* silencioso */
      }
    })()

    function onDocClick(e: MouseEvent) {
      const el = (e.target as HTMLElement | null)?.closest('[data-checkout-cta]')
      if (el) {
        e.preventDefault()
        lastFocusedRef.current = document.activeElement as HTMLElement | null
        setOpen(true)
        apiPost('/api/events', { eventName: 'abriu_checkout' }).catch(() => {})
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [funnel])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('keydown', onKey)
      // Aguarda o frame de montagem do diálogo p/ mover o foco.
      const t = setTimeout(() => firstFieldRef.current?.focus(), 30)
      return () => {
        document.removeEventListener('keydown', onKey)
        clearTimeout(t)
      }
    }
    lastFocusedRef.current?.focus()
    return undefined
  }, [open])

  async function enviar() {
    if (submitting) return
    // Validação no app (Zod) — sem depender do navegador (form é noValidate).
    const parsed = ContactSchema.safeParse({ nome, email, telefone })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error) as Errors)
      setErroGeral(null)
      return
    }
    setErrors({})
    setSubmitting(true)
    setErroGeral(null)
    try {
      await apiPost('/api/contact', parsed.data)
      // Lead completo já gravado (contato + respostas do quiz + perfil) — marca o envio.
      await apiPost('/api/events', { eventName: 'enviou_precheckout' }).catch(() => {})
      // Contato também vai na URL: se o cookie do lead se perder (ou a página for
      // recarregada num contexto novo), o checkout ainda pré-popula e recupera.
      const q = new URLSearchParams({
        nome: parsed.data.nome,
        email: parsed.data.email,
        telefone: parsed.data.telefone,
      })
      // Marca o redirecionamento antes de sair da página (best-effort, aguardado).
      await apiPost('/api/events', { eventName: 'redirecionou_checkout' }).catch(() => {})
      window.location.href = `${basePath}/checkout?${q.toString()}`
    } catch {
      setErroGeral('Não foi possível continuar. Confira os dados e tente novamente.')
      setSubmitting(false)
    }
  }

  const overlayAnim = reduce
    ? { initial: false as const, animate: {}, exit: {} }
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
  const dialogAnim = reduce
    ? { initial: false as const, animate: {}, exit: {} }
    : {
        initial: { opacity: 0, y: 24, scale: 0.97 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 16, scale: 0.98 },
      }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          {...overlayAnim}
          transition={{ duration: reduce ? 0 : 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${uid}-title`}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <motion.div
            key="dialog"
            {...dialogAnim}
            transition={{ duration: reduce ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="card w-full max-w-md rounded-t-2xl border-line/80 bg-card-2 p-6 shadow-2xl shadow-black/50 sm:rounded-2xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={`${uid}-title`} className="text-xl font-bold text-ink">
                  Falta um passo
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {isKids
                    ? 'Confirme os dados do responsável para ir ao pagamento seguro.'
                    : 'Confirme seus dados para ir pro pagamento seguro.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="-mr-1 -mt-1 rounded-lg p-1 text-muted transition hover:text-ink"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M5 5l10 10M15 5L5 15"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {isKids && (
              <p className="mt-4 rounded-xl border border-cyan/30 bg-cyan/10 px-4 py-3 text-sm text-ink">
                <strong>Estes dados são do responsável</strong> (mãe, pai ou tutor). O perfil da
                criança — nome e idade — você cria depois, já dentro da plataforma.
              </p>
            )}

            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                void enviar()
              }}
              className="mt-6 flex flex-col gap-4"
            >
              <Field
                id={`${uid}-nome`}
                label={isKids ? 'Nome do responsável' : 'Nome'}
                placeholder={isKids ? 'Nome completo do responsável' : 'Seu nome completo'}
                autoComplete="name"
                inputRef={firstFieldRef}
                value={nome}
                error={errors.nome}
                onChange={(v) => {
                  setNome(v)
                  if (errors.nome) setErrors((p) => ({ ...p, nome: undefined }))
                }}
              />
              <Field
                id={`${uid}-email`}
                label={isKids ? 'E-mail do responsável' : 'E-mail'}
                type="email"
                inputMode="email"
                placeholder="voce@email.com"
                autoComplete="email"
                value={email}
                error={errors.email}
                onChange={(v) => {
                  setEmail(v)
                  if (errors.email) setErrors((p) => ({ ...p, email: undefined }))
                }}
              />
              <Field
                id={`${uid}-telefone`}
                label={isKids ? 'Telefone do responsável' : 'Telefone'}
                type="tel"
                inputMode="tel"
                placeholder="(11) 99999-9999"
                autoComplete="tel"
                value={telefone}
                error={errors.telefone}
                onChange={(v) => {
                  setTelefone(formatTelefone(v))
                  if (errors.telefone) setErrors((p) => ({ ...p, telefone: undefined }))
                }}
              />

              {erroGeral && <p className="text-sm text-red-400">{erroGeral}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary mt-1 disabled:opacity-50"
              >
                {submitting ? 'Aguarde…' : 'Ir pro pagamento seguro →'}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-center text-sm text-muted transition hover:text-ink"
              >
                Cancelar
              </button>
              <p className="text-center text-xs text-muted">
                Pagamento via Pix ou cartão de crédito, com garantia de 7 dias.
              </p>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface FieldProps {
  id: string
  label: string
  placeholder: string
  value: string
  error?: string
  onChange: (value: string) => void
  type?: string
  inputMode?: 'text' | 'email' | 'tel'
  autoComplete?: string
  inputRef?: Ref<HTMLInputElement>
}

function Field({
  id,
  label,
  placeholder,
  value,
  error,
  onChange,
  type = 'text',
  inputMode,
  autoComplete,
  inputRef,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className={`w-full rounded-xl border bg-card px-4 py-3 text-ink outline-none transition placeholder:text-muted/60 focus:border-cyan ${
          error ? 'border-red-400/70' : 'border-line'
        }`}
      />
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
