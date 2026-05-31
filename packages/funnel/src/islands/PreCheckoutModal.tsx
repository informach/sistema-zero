import { useEffect, useRef, useState } from 'react'
import { apiPost } from '../lib/api-fetch'

const inputClass =
  'w-full rounded-xl border border-line bg-card px-4 py-3 text-ink outline-none focus:border-cyan'

export default function PreCheckoutModal() {
  const [open, setOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const lastFocusedRef = useRef<HTMLElement | null>(null)

  // Garante o lead (mesmo p/ quem cai direto na oferta) e marca viu_pagina_vendas.
  useEffect(() => {
    ;(async () => {
      try {
        await apiPost('/api/leads')
        await apiPost('/api/events', { eventName: 'viu_pagina_vendas' })
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
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('keydown', onKey)
      firstFieldRef.current?.focus() // move o foco para o diálogo ao abrir
    } else {
      lastFocusedRef.current?.focus() // devolve o foco ao gatilho ao fechar
    }
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  async function enviar() {
    if (submitting) return
    if (!nome.trim() || !email.trim() || telefone.trim().length < 8) {
      setErro('Preencha nome, e-mail e telefone.')
      return
    }
    setSubmitting(true)
    setErro(null)
    try {
      await apiPost('/api/contact', { nome, email, telefone })
      window.location.href = '/checkout'
    } catch {
      setErro('Não foi possível continuar. Confira os dados e tente novamente.')
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pré-checkout"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false)
      }}
    >
      <div className="card w-full max-w-md rounded-t-2xl p-6 sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold text-ink">Falta pouco!</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fechar"
            className="text-muted transition hover:text-ink"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">Preencha para ir ao pagamento seguro.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void enviar()
          }}
          className="mt-5 flex flex-col gap-3"
        >
          <input
            ref={firstFieldRef}
            className={inputClass}
            placeholder="Seu nome"
            aria-label="Seu nome"
            autoComplete="name"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <input
            className={inputClass}
            type="email"
            placeholder="Seu melhor e-mail"
            aria-label="Seu melhor e-mail"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className={inputClass}
            type="tel"
            inputMode="tel"
            placeholder="WhatsApp com DDD"
            aria-label="WhatsApp com DDD"
            autoComplete="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />
          {erro && <p className="text-sm text-red-400">{erro}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary mt-2 disabled:opacity-50"
          >
            {submitting ? 'Aguarde…' : 'Ir para o pagamento — R$ 37'}
          </button>
          <p className="text-center text-xs text-muted">
            Pagamento via Pix, com garantia de 7 dias.
          </p>
        </form>
      </div>
    </div>
  )
}
