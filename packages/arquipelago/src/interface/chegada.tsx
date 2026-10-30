import { ILHAS } from '@sistemazero/arquipelago-contracts'
import { lojaDaChegada, useChegada } from '../estado/chegada'
import { useJogo } from '../estado/contexto'
import { etapaDaChegada } from '../mundo/chegada-da-ponte'
import { artigoDaIlha } from '../sistemas/luneta'

/** A legenda de cada etapa da cena da subida de posto (as palavras da proposta). */
export function legendaDaChegada(nome: string, artigo: 'a' | 'o', etapa: string): string {
  if (etapa === 'voo') return `O Zappy voou até ${artigo} ${nome}. A cor está voltando.`
  if (etapa === 'ponte') return 'A ponte se monta tábua por tábua.'
  return `A travessia para ${artigo} ${nome} está pronta.`
}

/**
 * A HUD durante a cena da subida de posto (N02): só a legenda e o Pular (o Esc também pula). O
 * resto da HUD some, como na luneta, para a cena aparecer inteira.
 */
export function LegendaDaChegada() {
  const { loja } = useJogo()
  const id = useChegada(loja, (c) => c.ilha)
  const etapa = useChegada(loja, (c) => etapaDaChegada(c.tempo, c.menosMovimento))
  const ilha = ILHAS.find((i) => i.id === id)
  if (!ilha) return null
  return (
    <div className="arq-chegada" role="status" aria-live="polite">
      <p className="arq-vidro arq-chegada-legenda">
        {legendaDaChegada(ilha.nome, artigoDaIlha(ilha), etapa)}
      </p>
      <button
        type="button"
        className="arq-botao leve arq-chegada-pular"
        onClick={() => lojaDaChegada(loja).setState({ pular: true })}
      >
        Pular
      </button>
    </div>
  )
}
