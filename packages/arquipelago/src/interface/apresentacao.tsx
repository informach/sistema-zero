import { useEffect, useRef } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDaConversa, type QuemConversa, useConversa } from '../estado/moradores'

/**
 * A apresentação de um morador que ainda não tem amizade (a Maré, o Floco): as falas fixas, uma
 * por vez, sem mostrar escolhas que ainda não existem.
 */
export function PainelDeApresentacao({
  quem,
  painel,
  nome,
  tchau,
}: {
  quem: QuemConversa
  painel: string
  nome: string
  tchau: string
}) {
  const { loja } = useJogo()
  const conversa = lojaDaConversa(loja, quem)
  const aberto = useEstado((s) => s.painelAberto === painel)
  const falas = useConversa(conversa, (s) => s.falas)
  const indice = useConversa(conversa, (s) => s.indice)
  const principal = useRef<HTMLButtonElement>(null)
  const passo = aberto ? indice : null
  useEffect(() => {
    if (passo !== null) principal.current?.focus()
  }, [passo])
  if (!aberto) return null
  const ultima = indice >= falas.length - 1
  const titulo = `arq-${quem}-nome`
  return (
    <div className="arq-capi" role="dialog" aria-modal="true" aria-labelledby={titulo}>
      <div className="arq-capi-topo">
        <h2 id={titulo}>{nome}</h2>
      </div>
      <p className="arq-capi-fala" aria-live="polite">
        {falas[indice] ?? ''}
      </p>
      <div className="arq-menu-acoes">
        <button
          ref={principal}
          type="button"
          className="arq-botao"
          onClick={() => {
            if (ultima) loja.getState().abrirPainel(null)
            else conversa.getState().avancar()
          }}
        >
          {ultima ? tchau : 'Continuar'}
        </button>
      </div>
    </div>
  )
}
