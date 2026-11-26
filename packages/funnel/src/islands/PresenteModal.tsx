import { useEffect, useId, useRef, useState } from 'react'
import BolsaResgate, { type BolsaResgateProps } from './BolsaResgate'

/**
 * A janela do cadastro do presente (modo presente da página da oferta, 26/11/2026). Abre com
 * qualquer botão `[data-presente-cta]` da página (o do cartão e o da barra do celular), como o
 * pré-checkout da venda abre com `[data-checkout-cta]`, e mostra o `BolsaResgate` com todos os
 * estados dele (processando, concluído com os próximos passos, já resgatado, erros). Fica montada
 * fechada: reabrir depois do cadastro mostra a confirmação, nunca um formulário em branco.
 * O visual vem da página (`presente-modal.css`, sob `.c917` ou `.cda`).
 */
export interface PresenteModalProps {
  resgate: BolsaResgateProps
  titulo: string
  texto: string
  /** Classes do título e do texto no tema da página. */
  classeTitulo: string
  classeTexto: string
}

const FOCAVEIS = 'button, input, select, textarea, a[href], [tabindex]'

export default function PresenteModal({
  resgate,
  titulo,
  texto,
  classeTitulo,
  classeTexto,
}: PresenteModalProps) {
  const [aberta, setAberta] = useState(false)
  const painel = useRef<HTMLDivElement>(null)
  const quemAbriu = useRef<HTMLElement | null>(null)
  const jaAbriu = useRef(false)
  const uid = useId()

  useEffect(() => {
    function abrir(e: MouseEvent) {
      const alvo = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-presente-cta]')
      if (!alvo) return
      e.preventDefault()
      quemAbriu.current = alvo
      setAberta(true)
    }
    document.addEventListener('click', abrir)
    return () => document.removeEventListener('click', abrir)
  }, [])

  useEffect(() => {
    if (!aberta) {
      if (jaAbriu.current) quemAbriu.current?.focus()
      return undefined
    }
    jaAbriu.current = true
    const raiz = document.documentElement
    const overflow = raiz.style.overflow
    raiz.style.overflow = 'hidden'
    const focaveis = () =>
      Array.from(painel.current?.querySelectorAll<HTMLElement>(FOCAVEIS) ?? []).filter(
        (el) => el.tabIndex >= 0 && !el.matches(':disabled') && el.getClientRects().length > 0,
      )
    function teclas(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setAberta(false)
        return
      }
      if (e.key !== 'Tab' || !painel.current) return
      const lista = focaveis()
      const primeiro = lista[0]
      const ultimo = lista[lista.length - 1]
      if (!primeiro || !ultimo) {
        e.preventDefault()
        painel.current.focus()
      } else if (
        !painel.current.contains(document.activeElement) ||
        (e.shiftKey && document.activeElement === primeiro) ||
        (!e.shiftKey && document.activeElement === ultimo)
      ) {
        e.preventDefault()
        ;(e.shiftKey ? ultimo : primeiro).focus()
      }
    }
    function prender(e: FocusEvent) {
      if (e.target instanceof Node && !painel.current?.contains(e.target))
        (painel.current?.querySelector<HTMLElement>('input') ?? painel.current)?.focus()
    }
    document.addEventListener('keydown', teclas)
    document.addEventListener('focusin', prender)
    const t = setTimeout(() => {
      if (painel.current?.contains(document.activeElement)) return
      ;(painel.current?.querySelector<HTMLElement>('input') ?? painel.current)?.focus()
    }, 30)
    return () => {
      raiz.style.overflow = overflow
      document.removeEventListener('keydown', teclas)
      document.removeEventListener('focusin', prender)
      clearTimeout(t)
    }
  }, [aberta])

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: o clique fora fecha; o teclado fecha com Esc
    <div
      className="pm-fundo"
      hidden={!aberta}
      onClick={(e) => {
        if (e.target === e.currentTarget) setAberta(false)
      }}
    >
      <div
        ref={painel}
        className="pm-painel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-titulo`}
        tabIndex={-1}
      >
        <div className="pm-cabeca">
          <div className="pm-cabeca__texto">
            <h2 id={`${uid}-titulo`} className={classeTitulo}>
              {titulo}
            </h2>
            <p className={classeTexto}>{texto}</p>
          </div>
          <button
            type="button"
            className="pm-fechar"
            aria-label="Fechar"
            onClick={() => setAberta(false)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <BolsaResgate {...resgate} />
      </div>
    </div>
  )
}
