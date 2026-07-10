import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, apiGet, apiPost } from '../lib/api-fetch'
import type { CheckoutContactInput } from '../lib/checkout-schema'

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

// Falha genérica (timeout/502): re-tenta sozinho ANTES de pintar erro — a 1ª
// chamada com a Efí fria pode estourar o timeout e o retry já pega o token quente.
const GENERIC_RETRIES = 2
const GENERIC_RETRY_DELAY_MS = 4_000
// 409 PAYMENT_IN_PROGRESS (cobrança ainda em criação no payments — reserva de
// idempotência viva, expira em ≤60s): "aguarde" + retry, não é erro.
const IN_PROGRESS_MAX_CYCLES = 8
const IN_PROGRESS_RETRY_DELAY_MS = 7_000

function pixChargeKey(
  contact: CheckoutContactInput | null,
  couponCode?: string,
  offerSlug?: string,
): string {
  if (!contact) return `no-contact|${couponCode ?? ''}|${offerSlug ?? ''}`
  return [
    contact.nome.trim(),
    contact.email.trim().toLowerCase(),
    contact.cpf.replace(/\D/g, ''),
    couponCode ?? '',
    offerSlug ?? '',
  ].join('|')
}

/**
 * Painel do Pix. O QR NÃO é gerado automaticamente: o usuário clica em "Gerar
 * código Pix" (desabilitado até os dados pessoais estarem válidos) — assim a
 * cobrança vai à Efí com nome/e-mail/CPF e não criamos transação à toa (ex.:
 * quem decide pagar no cartão). Depois do clique, mantém a máquina de estados
 * de sempre: auto-retry, "aguarde" no 409, polling do status e expiração.
 */
export default function PixCheckout({
  contact,
  couponCode,
  successPath,
  offerSlug,
}: {
  contact: CheckoutContactInput | null
  couponCode?: string
  /** Para onde ir quando o pagamento confirmar (próximo passo do funil; obrigatório). */
  successPath: string
  /** Oferta ESCOLHIDA no alternador mensal↔anual (o servidor valida o link). */
  offerSlug?: string
}) {
  const [started, setStarted] = useState(false)
  const [pix, setPix] = useState<Pix | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [aguardando, setAguardando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [expirado, setExpirado] = useState(false)
  const chargeKey = useMemo(
    () => pixChargeKey(contact, couponCode, offerSlug),
    [contact, couponCode, offerSlug],
  )
  const lastChargeKey = useRef(chargeKey)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const genericAttempts = useRef(0)
  const inProgressCycles = useRef(0)

  const clearRetryTimer = useCallback(() => {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current)
      retryTimer.current = null
    }
  }, [])

  // Uma tentativa de criação; em falha agenda o próprio retry (auto-retry com
  // teto). O budget de "aguarde" (409) é separado do de falha genérica.
  const requestPix = useCallback(
    function attempt() {
      if (!contact) return
      apiPost<StartResp>('/api/checkout/pix', {
        contact,
        ...(couponCode ? { couponCode } : {}),
        ...(offerSlug ? { offerSlug } : {}),
      })
        .then((r) => {
          if (lastChargeKey.current !== chargeKey) return
          genericAttempts.current = 0
          inProgressCycles.current = 0
          setAguardando(false)
          setPaymentId(r.paymentId)
          if (r.pix) setPix(r.pix)
        })
        .catch((e) => {
          const inProgress =
            e instanceof ApiError && e.status === 409 && e.code === 'PAYMENT_IN_PROGRESS'
          if (lastChargeKey.current !== chargeKey) return
          if (inProgress && inProgressCycles.current < IN_PROGRESS_MAX_CYCLES) {
            inProgressCycles.current += 1
            setAguardando(true)
            retryTimer.current = setTimeout(attempt, IN_PROGRESS_RETRY_DELAY_MS)
            return
          }
          if (!inProgress && genericAttempts.current < GENERIC_RETRIES) {
            genericAttempts.current += 1
            retryTimer.current = setTimeout(attempt, GENERIC_RETRY_DELAY_MS)
            return
          }
          setAguardando(false)
          setErro('Não foi possível gerar o Pix. Tente novamente.')
        })
    },
    [chargeKey, couponCode, contact, offerSlug],
  )

  // Gera (ou re-gera) a cobrança Pix do zero: usado pelo botão "Gerar código
  // Pix" e pelo "Tentar de novo" — reseta os budgets de retry.
  const createPix = useCallback(() => {
    clearRetryTimer()
    lastChargeKey.current = chargeKey
    genericAttempts.current = 0
    inProgressCycles.current = 0
    setStarted(true)
    setPix(null)
    setPaymentId(null)
    setErro(null)
    setAguardando(false)
    setExpirado(false)
    requestPix()
  }, [chargeKey, requestPix, clearRetryTimer])

  // Dados que compõem a cobrança mudaram (contato ou cupom): volta ao estado
  // inicial para o usuário gerar de novo — NUNCA regenera sozinho.
  useEffect(() => {
    if (lastChargeKey.current === chargeKey) return
    lastChargeKey.current = chargeKey
    if (!started) return
    clearRetryTimer()
    setStarted(false)
    setPix(null)
    setPaymentId(null)
    setErro(null)
    setAguardando(false)
    setExpirado(false)
  }, [chargeKey, started, clearRetryTimer])

  // Cancela retries pendentes no unmount (troca de método, navegação).
  useEffect(() => clearRetryTimer, [clearRetryTimer])

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
          window.location.href = successPath
        }
      } catch {
        /* tenta de novo no próximo ciclo */
      }
    }, 3500)
    return () => clearInterval(timer)
  }, [paymentId, pix?.expiresAt, successPath])

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

  // Estado inicial: explica o Pix e só gera o código por clique explícito.
  if (!started)
    return (
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex flex-1 flex-col gap-4">
          <ul className="flex flex-col gap-3 text-sm leading-relaxed text-muted">
            <PixBullet>
              Aprovação na hora: o acesso é liberado assim que o pagamento confirmar.
            </PixBullet>
            <PixBullet>Escaneie o QR Code ou copie o código e pague no app do seu banco.</PixBullet>
          </ul>
          <button
            type="button"
            onClick={createPix}
            disabled={!contact}
            className="btn btn-primary disabled:opacity-60"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 3h3m3 0v3m-6 0h3m3-6h-3m-3 0v3"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Gerar código Pix
          </button>
          {!contact && (
            <p className="text-xs text-muted">
              Preencha seus dados pessoais acima para gerar o código.
            </p>
          )}
        </div>
        <div
          aria-hidden="true"
          className="hidden h-36 w-36 shrink-0 items-center justify-center self-center rounded-xl border border-line/60 bg-card/40 text-line sm:flex"
        >
          <svg className="h-20 w-20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 3h3m3 0v3m-6 0h3m3-6h-3m-3 0v3"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    )

  if (!pix)
    return (
      <p className="py-10 text-center text-muted">
        {aguardando
          ? 'Seu Pix ainda está sendo gerado, só mais alguns segundos…'
          : 'Gerando seu Pix…'}
      </p>
    )

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

function PixBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <svg
        className="mt-0.5 h-4 w-4 shrink-0 text-lime"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4 10.5l3.5 3.5L16 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{children}</span>
    </li>
  )
}
