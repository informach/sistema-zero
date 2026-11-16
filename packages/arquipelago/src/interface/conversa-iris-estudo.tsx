import { useEffect, useRef } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
export function ConversaDaIrisDeEstudo() {
  const { loja, pedidos, controle } = useJogo(),
    aberto = useEstado((s) => s.painelAberto === 'faisca-iris'),
    alvo = useEstado((s) => s.alvo)
  const botao = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!aberto) return
    botao.current?.focus()
    const esc = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.stopImmediatePropagation()
        loja.getState().abrirPainel(null)
        pedidos.conversa = null
      }
    }
    window.addEventListener('keydown', esc, true)
    return () => window.removeEventListener('keydown', esc, true)
  }, [aberto, loja, pedidos])
  if (!aberto)
    return alvo ? (
      <div
        style={{ position: 'absolute', bottom: 110, left: '50%', transform: 'translateX(-50%)' }}
      >
        <button
          className="arq-botao"
          type="button"
          onClick={(e) => {
            e.currentTarget.blur()
            controle.usar++
          }}
        >
          {alvo.rotulo} · E
        </button>
      </div>
    ) : null
  return (
    <div className="arq-capi" role="dialog" aria-modal="true" aria-labelledby="faisca-iris-nome">
      <div className="arq-capi-topo">
        <h2 id="faisca-iris-nome">Íris · estudo da personagem</h2>
      </div>
      <p className="arq-capi-fala">
        Eu sou a Íris, guardiã da Faísca. Fui eu que te escrevi. Da praça você pode conhecer a
        horta, o Pátio ou a praia. Você escolhe.
      </p>
      <div className="arq-menu-acoes">
        <button
          ref={botao}
          className="arq-botao"
          type="button"
          onClick={(e) => {
            e.currentTarget.blur()
            pedidos.conversa = null
            loja.getState().abrirPainel(null)
          }}
        >
          Continuar explorando
        </button>
      </div>
      <small>
        Modelo-base e enquadramento em teste. Acessórios e gestos do capítulo ainda serão
        produzidos.
      </small>
    </div>
  )
}
