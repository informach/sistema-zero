import { useEffect, useRef } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDaConversa, PAINEL_DA_MARE, useConversa } from '../estado/moradores'

/** Apresentação fixa, sem mostrar escolhas de amizade que ainda não existem. */
export function PainelDaMare() {
  const { loja } = useJogo()
  const conversa = lojaDaConversa(loja, 'mare')
  const aberto = useEstado((s) => s.painelAberto === PAINEL_DA_MARE)
  const falas = useConversa(conversa, (s) => s.falas)
  const indice = useConversa(conversa, (s) => s.indice)
  const principal = useRef<HTMLButtonElement>(null)
  const passo = aberto ? indice : null
  useEffect(() => {
    if (passo !== null) principal.current?.focus()
  }, [passo])
  if (!aberto) return null
  const ultima = indice >= falas.length - 1
  return (
    <div className="arq-capi" role="dialog" aria-modal="true" aria-labelledby="arq-mare-nome">
      <div className="arq-capi-topo">
        <h2 id="arq-mare-nome">Maré</h2>
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
          {ultima ? 'Tchau, Maré' : 'Continuar'}
        </button>
      </div>
    </div>
  )
}
