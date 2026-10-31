import { createContext, type ReactNode, useContext } from 'react'
import { useJogo } from '../estado/contexto'

/**
 * Os painéis que o menu mostra por dentro (31/10/2026, pedido da dona): diário, álbum, caderno dos
 * Lumis, mapa, moradores em casa e visitas abrem no meio do menu, no estilo dele, com o menu à vista
 * o tempo todo. Dentro do menu o painel é uma seção do corpo; fora dele (os que o mundo abre), a
 * janela de sempre por cima do jogo.
 */
export const NoMenuContexto = createContext<{ fechar(): void } | null>(null)

/** O painel está dentro do menu? */
export function useNoMenu(): boolean {
  return useContext(NoMenuContexto) !== null
}

/** Fechar o painel: dentro do menu, volta ao jogo fechando o menu; fora, fecha a janela. */
export function useFecharPainel(): () => void {
  const { loja } = useJogo()
  const noMenu = useContext(NoMenuContexto)
  return noMenu ? noMenu.fechar : () => loja.getState().abrirPainel(null)
}

export function JanelaDoPainel({
  classes,
  rotulo,
  children,
}: {
  /** As classes próprias do painel (sem `arq-menu` e `arq-cartao`, que são da janela). */
  classes: string
  /** O id do título (`aria-labelledby`). */
  rotulo: string
  children: ReactNode
}) {
  if (useNoMenu())
    return (
      <section className={`arq-pausa-secao arq-no-menu ${classes}`} aria-labelledby={rotulo}>
        {children}
      </section>
    )
  return (
    <div className="arq-sobre">
      <section
        className={`arq-menu arq-cartao ${classes}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={rotulo}
      >
        {children}
      </section>
    </div>
  )
}
