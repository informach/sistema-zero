import { useStore } from 'zustand'
import { useEstado, useJogo } from '../estado/contexto'
import { casaMoradaStore, PAINEL_DA_MORADA, podeConstruirMorada } from '../estado/morada'
import { PAINEL_DOS_CONVIDADOS } from '../sistemas/visitas-dos-moradores'
import { Icone } from './icones'

/** Os modos continuam no cantinho original da HUD; só a fonte da obra mudou. */
export function ModosDoJogo() {
  const { loja, plataforma } = useJogo()
  const casa = casaMoradaStore(loja, plataforma)
  const open = useStore(casa, (s) => s.open)
  const editing = useStore(casa, (s) => s.editing)
  const blocked = useEstado(
    (s) =>
      s.menuAberto ||
      s.ferramentaAberta ||
      s.tempoAcabou ||
      s.tempoPausado ||
      s.tempoSincronizando ||
      (s.painelAberto !== null && s.painelAberto !== PAINEL_DA_MORADA) ||
      s.modo === 'barco' ||
      s.modo === 'balao',
  )
  const allowed = useEstado(podeConstruirMorada)
  if (blocked) return null
  if (!allowed)
    return open ? (
      <fieldset className="arq-modos">
        <legend className="arq-sr">Sua casa</legend>
        <button
          type="button"
          className="arq-botao leve"
          onClick={() => void casa.getState().close()}
        >
          Voltar à ilha
        </button>
      </fieldset>
    ) : null
  return (
    <fieldset className="arq-modos">
      <legend className="arq-sr">Modo do jogo</legend>
      <button
        type="button"
        className="arq-botao leve"
        aria-pressed={!editing}
        onClick={() => (open ? casa.getState().setEditing(false) : void casa.getState().enter())}
      >
        <Icone nome="casa" tamanho={18} />
        Viver
      </button>
      <button
        type="button"
        className="arq-botao leve"
        aria-pressed={editing}
        data-modo="construir"
        onClick={() => (open ? casa.getState().setEditing(true) : void casa.getState().enter(true))}
      >
        <Icone nome="martelo" tamanho={18} />
        Construir
      </button>
      {open && !editing ? (
        <button
          type="button"
          className="arq-botao leve"
          onClick={() => loja.getState().abrirPainel(PAINEL_DOS_CONVIDADOS)}
        >
          Moradores
        </button>
      ) : null}
      {open ? (
        <button
          type="button"
          className="arq-botao leve"
          onClick={() => void casa.getState().close()}
        >
          Voltar à ilha
        </button>
      ) : null}
    </fieldset>
  )
}
export function BarraDeConstruir() {
  return null
}
export const DICA_DA_ENTRADA_ESCOLHIDA = 'A entrada é feita com as portas da biblioteca Morada.'
