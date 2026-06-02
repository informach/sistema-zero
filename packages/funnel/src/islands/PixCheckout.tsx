import { useCallback, useEffect, useRef, useState } from 'react'
import { apiGet, apiPost } from '../lib/api-fetch'

interface Pix {
  txid: string
  copiaECola: string
  imagemQrcodeBase64?: string
  expiresAt: string | null
}
interface StartResp {
  paymentId: string
  status: string
  pix: Pix | null
}
interface StatusResp {
  status: string
  paidAt: string | null
  pix: Pix | null
}

export default function PixCheckout({ couponCode }: { couponCode?: string }) {
  const [pix, setPix] = useState<Pix | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [expirado, setExpirado] = useState(false)
  const lastCoupon = useRef<string | null | undefined>(null)

  // Cria (ou recria) a cobrança Pix. Reutilizado pelo efeito (mudança de cupom) e
  // pelo botão "Tentar de novo" — a 1ª chamada pós-restart pode ser lenta (cold
  // start da Efí) e, se estourar o timeout, o retry já pega o token aquecido.
  const createPix = useCallback(() => {
    setPix(null)
    setPaymentId(null)
    setErro(null)
    setExpirado(false)
    apiPost<StartResp>('/api/checkout/pix', couponCode ? { couponCode } : undefined)
      .then((r) => {
        setPaymentId(r.paymentId)
        if (r.pix) setPix(r.pix)
      })
      .catch(() => setErro('Não foi possível gerar o Pix. Tente novamente.'))
  }, [couponCode])

  // Recria quando o cupom muda (a cobrança Pix tem valor fixo).
  useEffect(() => {
    if (lastCoupon.current === couponCode) return
    lastCoupon.current = couponCode
    createPix()
  }, [couponCode, createPix])

  // Polling do status (UX/fallback; o webhook é a reconciliação durável).
  // Para de checar quando o Pix expira ou após 15 min (evita polling infinito).
  useEffect(() => {
    if (!paymentId) return
    const startedAt = Date.now()
    const MAX_MS = 15 * 60 * 1000
    const expiry = pix?.expiresAt ? Date.parse(pix.expiresAt) : null
    const timer = setInterval(async () => {
      if ((expiry && Date.now() > expiry) || Date.now() - startedAt > MAX_MS) {
        clearInterval(timer)
        setExpirado(true)
        return
      }
      try {
        const r = await apiGet<StatusResp>(`/api/checkout/${paymentId}`)
        if (r.pix) setPix((cur) => cur ?? r.pix)
        if (r.status === 'PAID') {
          clearInterval(timer)
          window.location.href = '/obrigado'
        }
      } catch {
        /* tenta de novo no próximo ciclo */
      }
    }, 3500)
    return () => clearInterval(timer)
  }, [paymentId, pix?.expiresAt])

  async function copiar() {
    if (!pix) return
    try {
      await navigator.clipboard.writeText(pix.copiaECola)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      /* clipboard indisponível */
    }
  }

  if (erro)
    return (
      <div className="py-6 text-center">
        <p className="text-red-400">{erro}</p>
        <button type="button" onClick={createPix} className="btn btn-primary mt-4">
          Tentar de novo
        </button>
      </div>
    )
  if (expirado)
    return (
      <div className="py-6 text-center">
        <p className="text-muted">O tempo para pagar este Pix expirou.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn btn-primary mt-4"
        >
          Recarregar
        </button>
      </div>
    )
  if (!pix) return <p className="py-10 text-center text-muted">Gerando seu Pix…</p>

  return (
    <div className="flex flex-col items-center gap-5">
      <p className="text-center text-sm text-muted">
        Escaneie o QR Code ou copie o código para pagar via Pix.
      </p>
      {pix.imagemQrcodeBase64 && (
        <img
          // A Efí já devolve `imagemQrcode` como data-URI completo
          // (`data:image/png;base64,…`); só prefixa se vier base64 cru, senão o
          // prefixo duplica e o src vira inválido (net::ERR_INVALID_URL).
          src={
            pix.imagemQrcodeBase64.startsWith('data:')
              ? pix.imagemQrcodeBase64
              : `data:image/png;base64,${pix.imagemQrcodeBase64}`
          }
          alt="QR Code do Pix"
          width={220}
          height={220}
          className="rounded-xl bg-white p-3"
        />
      )}
      <div className="w-full">
        <p className="mb-1 text-sm text-muted">Pix copia e cola</p>
        <div className="flex gap-2">
          <input
            readOnly
            value={pix.copiaECola}
            aria-label="Código Pix copia e cola"
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
      <p className="flex items-center gap-2 text-center text-sm text-cyan">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-cyan"></span>
        Aguardando pagamento… a tela atualiza sozinha.
      </p>
    </div>
  )
}
