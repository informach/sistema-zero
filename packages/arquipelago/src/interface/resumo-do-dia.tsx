import { useEffect, useState } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { diaDe } from '../sistemas/moradores'
import {
  BOA_NOITE,
  type FotoDoDia,
  fotoDoDia,
  lerFotoDoDia,
  resumoDoDia,
} from '../sistemas/resumo-do-dia'

/** O painel do resumo do dia (ao deitar na cama). */
export const PAINEL_DO_RESUMO = 'resumo-do-dia'

const chave = (publico: string, perfil: string) => `arquipelago:resumo-do-dia:${publico}:${perfil}`

/**
 * A foto do começo do dia, guardada no aparelho por perfil: a primeira vez que o jogo abre num dia,
 * fotografa o salvamento; nas outras, lê. Sem armazenamento, a foto é a da abertura do jogo.
 */
export function useFotoDoDia(): FotoDoDia | null {
  const { loja, plataforma } = useJogo()
  const carregado = useEstado((s) => s.salvamento.criadoEm)
  const [foto, setFoto] = useState<FotoDoDia | null>(null)
  useEffect(() => {
    if (!carregado) return
    const hoje = diaDe(new Date())
    const k = chave(plataforma.publico, plataforma.perfil.id)
    let lida: FotoDoDia | null = null
    try {
      lida = lerFotoDoDia(localStorage.getItem(k), hoje)
    } catch {
      lida = null
    }
    if (!lida) {
      lida = fotoDoDia(loja.getState().salvamento, hoje)
      try {
        localStorage.setItem(k, JSON.stringify(lida))
      } catch {
        // Aba anônima: o resumo conta desde a abertura do jogo.
      }
    }
    setFoto(lida)
  }, [carregado, loja, plataforma])
  return foto
}

/** As linhas do resumo de hoje (o que ela fez de bom), sem nada de cobrança. */
export function ListaDoResumo({ foto }: { foto: FotoDoDia | null }) {
  const salvamento = useEstado((s) => s.salvamento)
  const linhas = foto ? resumoDoDia(foto, salvamento, diaDe(new Date())) : []
  return (
    <div className="arq-resumo">
      <h3>Hoje na sua ilha</h3>
      {linhas.length > 0 ? (
        <ul>
          {linhas.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      ) : (
        <p>Um dia calmo, de passeio.</p>
      )}
      <p className="arq-resumo-boa-noite">{BOA_NOITE}</p>
    </div>
  )
}

/** Ao deitar na cama, o resumo do dia (N06); "Continuar" volta ao jogo, ainda deitada. */
export function PainelDoResumo({ foto }: { foto: FotoDoDia | null }) {
  const { loja } = useJogo()
  return (
    <div className="arq-sobre">
      <div
        className="arq-menu arq-cartao arq-quadro"
        role="dialog"
        aria-modal="true"
        aria-label="Resumo do dia"
      >
        <ListaDoResumo foto={foto} />
        <button
          type="button"
          className="arq-botao"
          onClick={() => loja.getState().abrirPainel(null)}
        >
          Continuar
        </button>
      </div>
    </div>
  )
}
