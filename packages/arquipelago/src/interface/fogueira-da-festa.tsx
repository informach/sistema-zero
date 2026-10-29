import { useEffect, useRef } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { useFesta } from '../estado/festas'
import { PAINEL_DA_FOGUEIRA } from '../sistemas/festas'
import { ListaDeReceitas } from './receitas'

export function FogueiraDaFesta() {
  const { loja } = useJogo()
  const aberto = useEstado((s) => s.painelAberto === PAINEL_DA_FOGUEIRA)
  const festa = useFesta(),
    voltar = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (aberto) voltar.current?.focus({ preventScroll: true })
  }, [aberto])
  useEffect(() => {
    if (aberto && festa !== 'junina') loja.getState().abrirPainel(null)
  }, [aberto, festa, loja])
  if (!aberto || festa !== 'junina') return null
  return (
    <div className="arq-sobre">
      <div
        className="arq-menu arq-cartao arq-quadro arq-objeto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arq-fogueira-titulo"
      >
        <h2 id="arq-fogueira-titulo">Fogueira da Festa Junina</h2>
        <p className="arq-quadro-sub">
          O milho da horta vira pipoca de festa. A receita volta todo junho.
        </p>
        <ListaDeReceitas onde="fogueira" />
        <div className="arq-menu-acoes">
          <button
            ref={voltar}
            type="button"
            className="arq-botao leve"
            onClick={() => loja.getState().abrirPainel(null)}
          >
            Voltar ao jogo
          </button>
        </div>
      </div>
    </div>
  )
}
