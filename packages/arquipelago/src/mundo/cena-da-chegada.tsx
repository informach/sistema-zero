import { useFrame } from '@react-three/fiber'
import { ILHAS, type IlhaId } from '@sistemazero/arquipelago-contracts'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useRef } from 'react'
import { lojaDaChegada, PAINEL_DA_CHEGADA } from '../estado/chegada'
import { lojaDoConforto, useConforto } from '../estado/conforto'
import { useJogo } from '../estado/contexto'
import { artigoDaIlha } from '../sistemas/luneta'
import {
  etapaDaChegada,
  falaDaChegada,
  ilhaParaChegar,
  podeComecarAChegada,
} from './chegada-da-ponte'

/**
 * Quem conduz a cena da subida de posto (N02): espera o mundo livre (fora de casa, sem painel,
 * menu, corrida ou visita), abre a cena da próxima ilha cuja ponte a pessoa ainda não viu chegar,
 * conta o tempo e, no fim (ou ao pular, inclusive pelo Esc que fecha o painel), grava a ponte
 * como vista e diz a fala. Uma ilha por vez, na ordem dos postos. A câmera e o Zappy leem a loja.
 */
export function CenaDaChegada() {
  const { loja, movimento } = useJogo()
  const chegada = lojaDaChegada(loja)
  const aparelhoPedeMenos = useReducedMotion()
  const jogoPedeMenos = useConforto(lojaDoConforto(loja), (s) => s.conforto.menosMovimento)
  const menosMovimento = aparelhoPedeMenos || jogoPedeMenos
  // Sem gravar (suporte, salvamento pausado), a cena não se repete nesta montagem.
  const terminadas = useRef(new Set<IlhaId>())

  useFrame((_, dt) => {
    const c = chegada.getState()
    const s = loja.getState()
    if (c.ilha === null) {
      if (!podeComecarAChegada({ ...s, correndo: movimento.corrida !== null })) return
      const vistas = [...s.salvamento.pontesVistas, ...terminadas.current]
      const ilha = ilhaParaChegar(s.jornada, vistas)
      if (!ilha) return
      chegada.setState({ ilha: ilha.id, tempo: 0, pular: false, menosMovimento })
      s.abrirPainel(PAINEL_DA_CHEGADA)
      return
    }
    // O Esc fecha o painel: vale como pular.
    const pulou = c.pular || s.painelAberto !== PAINEL_DA_CHEGADA
    if (s.menuAberto && !pulou) return
    const tempo = c.tempo + Math.min(dt, 0.1)
    if (!pulou && etapaDaChegada(tempo, c.menosMovimento) !== 'fim') {
      chegada.setState({ tempo })
      return
    }
    const id = c.ilha
    const ilha = ILHAS.find((i) => i.id === id)
    terminadas.current.add(id)
    s.mudar((sal) =>
      sal.pontesVistas.includes(id) ? sal : { ...sal, pontesVistas: [...sal.pontesVistas, id] },
    )
    chegada.setState({ ilha: null, tempo: 0, pular: false })
    if (loja.getState().painelAberto === PAINEL_DA_CHEGADA) loja.getState().abrirPainel(null)
    if (ilha) loja.getState().dizer(falaDaChegada(ilha, artigoDaIlha(ilha)))
  })
  return null
}
