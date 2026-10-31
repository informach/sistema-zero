import { ilha } from '@sistemazero/arquipelago-contracts'
import { useEffect, useRef, useState } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { destinosDoPorto, portoDoPainel } from '../sistemas/rede-do-barco'

/** O mesmo painel e os mesmos comandos para teclado, toque e as duas comunidades. */
export function PainelDoBarco() {
  const { loja, movimento } = useJogo()
  const painel = useEstado((s) => s.painelAberto)
  const jornada = useEstado((s) => s.jornada)
  const origem = portoDoPainel(painel)
  const [erro, definirErro] = useState(false)
  const primeiro = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    definirErro(false)
    if (!origem) return
    const anterior = document.activeElement
    primeiro.current?.focus({ preventScroll: true })
    return () => {
      if (anterior instanceof HTMLElement && anterior.isConnected)
        anterior.focus({ preventScroll: true })
    }
  }, [origem])
  if (!origem) return null
  const destinos = destinosDoPorto(origem, jornada)
  return (
    <div className="arq-sobre">
      <section
        className="arq-menu arq-cartao arq-quadro"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arq-barco-titulo"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation()
            loja.getState().abrirPainel(null)
          } else if (e.key === 'Tab') {
            const botoes =
              e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
            const primeiro = botoes[0],
              ultimo = botoes[botoes.length - 1]
            if (e.shiftKey && document.activeElement === primeiro) {
              e.preventDefault()
              ultimo?.focus()
            }
            if (!e.shiftKey && document.activeElement === ultimo) {
              e.preventDefault()
              primeiro?.focus()
            }
          }
        }}
      >
        <h2 id="arq-barco-titulo">Viagem de barco</h2>
        <p className="arq-quadro-sub">
          Saída: {ilha(origem).nome}. O barco segue pela borda e leva você até o outro cais.
        </p>
        <div className="arq-menu-acoes">
          {destinos.map((destino, i) => (
            <button
              key={destino}
              type="button"
              className="arq-botao"
              ref={i === 0 ? primeiro : undefined}
              onClick={() => {
                if (!movimento.embarcarPara?.(origem, destino)) definirErro(true)
              }}
            >
              Ir para {ilha(destino).nome}
            </button>
          ))}
          {/* A volta das boias (lacunas, 01/11/2026): a regata, do cais da sua ilha. */}
          {origem === 'sua-ilha' && destinos.length > 0 ? (
            <button
              type="button"
              className="arq-botao"
              onClick={() => {
                if (!movimento.embarcarNaRegata?.()) definirErro(true)
              }}
            >
              Volta das boias
            </button>
          ) : null}
          <button
            ref={destinos.length === 0 ? primeiro : undefined}
            type="button"
            className="arq-botao leve"
            onClick={() => loja.getState().abrirPainel(null)}
          >
            Agora não
          </button>
        </div>
        {destinos.length === 0 && <p>As novas rotas chegam com as ilhas da jornada.</p>}
        {erro && (
          <p role="alert">A viagem não começou. Volte para perto do cais e tente de novo.</p>
        )}
      </section>
    </div>
  )
}
