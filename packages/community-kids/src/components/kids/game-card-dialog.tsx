'use client'

import { useModalA11y } from '@sistemazero/ui/use-modal-a11y'
import { Printer } from 'lucide-react'
import { toDataURL } from 'qrcode'
import { useEffect, useState } from 'react'
import { KidsLogo } from './kids-logo'

/**
 * "Cartão do jogo" (07/2026): um cartão bonito com capa + título + QR do link
 * público de jogar, pronto para IMPRIMIR e mostrar para a família ("aponte a
 * câmera e jogue!"). O QR é gerado no CLIENT (`qrcode`, canvas puro — sem WASM,
 * CSP-safe) a partir da URL ABSOLUTA (window.location.origin + /jogar/<id>).
 * Imprimir usa o truque de visibilidade: `body[data-print='game-card']` esconde
 * o resto da página (regra no globals.css) e o afterprint limpa o atributo.
 */
export function GameCardDialog({
  title,
  coverImageUrl,
  playUrl,
  onClose,
}: {
  title: string
  coverImageUrl?: string | null
  playUrl: string
  onClose: () => void
}) {
  const cardRef = useModalA11y<HTMLDivElement>({ open: true, onClose })
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [qrError, setQrError] = useState(false)

  useEffect(() => {
    let alive = true
    const abs = new URL(playUrl, window.location.origin).href
    toDataURL(abs, { errorCorrectionLevel: 'M', margin: 1, width: 480 })
      .then((url) => {
        if (alive) setQrDataUrl(url)
      })
      .catch(() => {
        if (alive) setQrError(true)
      })
    return () => {
      alive = false
    }
  }, [playUrl])

  useEffect(() => {
    const clear = () => {
      delete document.body.dataset.print
    }
    window.addEventListener('afterprint', clear)
    return () => {
      window.removeEventListener('afterprint', clear)
      clear()
    }
  }, [])

  function handlePrint() {
    document.body.dataset.print = 'game-card'
    window.print()
  }

  return (
    <div
      className="sz-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Cartão do jogo"
        onClick={(e) => e.stopPropagation()}
        className="sz-modal w-full max-w-sm rounded-3xl bg-card p-5 outline-none"
      >
        {/* O cartão em si: a área que sobrevive à impressão. */}
        <div className="game-card-print rounded-3xl border-2 border-border bg-card p-5 text-center">
          <div className="mb-3 flex justify-center">
            <KidsLogo />
          </div>
          <div className="mb-3 aspect-video w-full overflow-hidden rounded-2xl bg-(--kids-cyan-tint)">
            {coverImageUrl ? (
              <img src={coverImageUrl} alt="" className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-4xl" aria-hidden>
                🎮
              </div>
            )}
          </div>
          <p className="sz-display text-xl">{title}</p>
          <p className="mt-1 text-muted-foreground text-sm">
            Aponte a câmera do celular para o código e jogue!
          </p>
          <div className="mt-3 flex justify-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`Código QR para jogar ${title}`}
                className="size-40 rounded-xl border-2 border-border p-1"
              />
            ) : qrError ? (
              <p className="text-muted-foreground text-sm">
                Não consegui desenhar o código agora. Tente de novo.
              </p>
            ) : (
              <div className="grid size-40 place-items-center text-muted-foreground text-sm">
                Desenhando…
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            disabled={!qrDataUrl}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 font-bold text-primary-foreground text-sm disabled:opacity-60"
          >
            <Printer className="size-4" /> Imprimir
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center rounded-full border-2 border-border px-5 font-semibold text-muted-foreground text-sm"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
