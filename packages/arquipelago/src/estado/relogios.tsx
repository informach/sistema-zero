import { useEffect } from 'react'
import { ALTURA_DA_TERRA, CENTRO_DA_CASA } from '../mundo/medidas'
import { passarTempo } from '../sistemas/necessidades'
import { useJogo } from './contexto'

/**
 * O que corre com o tempo, fora da cena: necessidades, o cochilo quando a energia acaba, a
 * posição guardada de vez em quando e a conta do tempo livre.
 */
export function Relogios() {
  const { loja, controle, plataforma, rastro, pedidos, filaTempo } = useJogo()

  useEffect(() => {
    let ultimaPosicao = { x: rastro.x, z: rastro.z }
    let segundos = 0
    const t = setInterval(() => {
      const s = loja.getState()
      const ativo =
        document.visibilityState === 'visible' &&
        !s.menuAberto &&
        !s.ferramentaAberta &&
        !s.tempoAcabou &&
        !s.tempoPausado
      if (!ativo) return
      segundos++

      if (segundos % 2 === 0) {
        s.mudar((sv) => ({ ...sv, necessidades: passarTempo(sv.necessidades, 2, controle.correr) }))
        if (loja.getState().salvamento.necessidades.energia <= 0) {
          pedidos.teleporte = {
            x: CENTRO_DA_CASA.x,
            y: ALTURA_DA_TERRA + 1.2,
            z: CENTRO_DA_CASA.z + 1.5,
          }
          s.mudar((sv) => ({ ...sv, necessidades: { ...sv.necessidades, energia: 60 } }))
          s.dizer('Você cansou e tirou um cochilo em casa. Nada se perdeu.')
        }
      }

      if (
        segundos % 15 === 0 &&
        Math.hypot(rastro.x - ultimaPosicao.x, rastro.z - ultimaPosicao.z) > 1
      ) {
        ultimaPosicao = { x: rastro.x, z: rastro.z }
        s.mudar((sv) => ({ ...sv, posicao: { x: rastro.x, y: rastro.y + 0.3, z: rastro.z } }))
      }

      void filaTempo?.somarSegundo().catch((erro) => {
        plataforma.relatarErro(erro, 'armazenamento-tempo')
        loja.getState().definirTempoPausado(true)
        loja
          .getState()
          .dizer('Não consegui guardar o tempo de jogo. Atualize a página e tente novamente.')
      })
    }, 1000)
    const aoEsconder = () => {
      if (document.visibilityState === 'hidden') void filaTempo?.guardarEEnviar().catch(() => {})
    }
    document.addEventListener('visibilitychange', aoEsconder)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', aoEsconder)
      void filaTempo?.encerrar().catch(() => {})
    }
  }, [loja, controle, plataforma, rastro, pedidos, filaTempo])

  return null
}
