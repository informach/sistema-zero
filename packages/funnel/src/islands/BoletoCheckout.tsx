import { useEffect, useState } from 'react'
import { apiGet, apiPost } from '../lib/api-fetch'
import { BoletoFormSchema, pathErrors } from '../lib/checkout-schema'
import {
  AddressFields,
  type AddressValue,
  emptyAddress,
  Field,
  inputClass,
} from './checkout-fields'

interface Boleto {
  barcode: string
  digitableLine: string
  pdfUrl: string
  expiresAt: string | null
}
interface StartResp {
  paymentId: string
  status: string
  boleto: Boleto | null
}
interface StatusResp {
  status: string
}

export default function BoletoCheckout({ email }: { email: string }) {
  const [cpf, setCpf] = useState('')
  const [address, setAddress] = useState<AddressValue>(emptyAddress)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [boleto, setBoleto] = useState<Boleto | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  function onAddress(key: keyof AddressValue, v: string) {
    setAddress((a) => ({ ...a, [key]: v }))
  }

  async function submit() {
    setErro(null)
    const payload = {
      cpf,
      address: { ...address, complement: address.complement || undefined },
    }
    const parsed = BoletoFormSchema.safeParse(payload)
    if (!parsed.success) {
      setErrors(pathErrors(parsed.error))
      return
    }
    setErrors({})
    setLoading(true)
    try {
      const r = await apiPost<StartResp>('/api/checkout/boleto', payload)
      if (r.boleto) {
        setBoleto(r.boleto)
        setPaymentId(r.paymentId)
      } else {
        setErro('Não foi possível gerar o boleto. Tente novamente.')
      }
    } catch {
      setErro('Não foi possível gerar o boleto. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Janela curta de polling enquanto a aba fica aberta (boleto compensa em 1–2
  // dias úteis; a confirmação real chega pelo webhook).
  useEffect(() => {
    if (!paymentId) return
    const startedAt = Date.now()
    const MAX_MS = 90 * 1000
    const timer = setInterval(async () => {
      if (Date.now() - startedAt > MAX_MS) {
        clearInterval(timer)
        return
      }
      try {
        const r = await apiGet<StatusResp>(`/api/checkout/${paymentId}`)
        if (r.status === 'PAID') {
          clearInterval(timer)
          window.location.href = '/obrigado'
        }
      } catch {
        /* tenta no próximo ciclo */
      }
    }, 3500)
    return () => clearInterval(timer)
  }, [paymentId])

  async function copiar() {
    if (!boleto) return
    try {
      await navigator.clipboard.writeText(boleto.digitableLine)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      /* clipboard indisponível */
    }
  }

  if (boleto) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-center text-sm text-muted">
          Boleto gerado! Pague em qualquer banco ou app.
        </p>
        <div>
          <p className="mb-1 text-sm text-muted">Linha digitável</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={boleto.digitableLine}
              aria-label="Linha digitável do boleto"
              className="w-full truncate rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink"
            />
            <button
              type="button"
              onClick={copiar}
              className="btn btn-primary shrink-0 px-4 py-2 text-sm"
            >
              {copiado ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>
        <a
          href={boleto.pdfUrl}
          target="_blank"
          rel="noreferrer"
          className="btn btn-primary text-center"
        >
          Abrir boleto (PDF)
        </a>
        <p className="text-center text-xs text-muted">
          Após o pagamento (a compensação leva até 1–2 dias úteis), você receberá o acesso no e-mail{' '}
          <span className="text-ink">{email}</span>. Pode fechar esta página.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
      noValidate
      className="flex flex-col gap-4"
    >
      <p className="text-sm text-muted">Informe seus dados para gerar o boleto.</p>
      <Field label="CPF" error={errors.cpf}>
        <input
          className={inputClass}
          inputMode="numeric"
          placeholder="000.000.000-00"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
        />
      </Field>
      <AddressFields value={address} errors={errors} onChange={onAddress} />
      {erro && <p className="text-center text-sm text-red-400">{erro}</p>}
      <button type="submit" disabled={loading} className="btn btn-primary disabled:opacity-60">
        {loading ? 'Gerando boleto…' : 'Gerar boleto'}
      </button>
    </form>
  )
}
