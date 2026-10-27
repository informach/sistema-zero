import { TempoRegistradoSchema } from '@sistemazero/arquipelago-contracts'
import { useEffect } from 'react'
import { ALTURA_DA_TERRA, CENTRO_DA_CASA } from '../mundo/medidas'
import { passarTempo } from '../sistemas/necessidades'
import { type ContadorDeTempo, contar } from '../sistemas/tempo-livre'
import { useJogo } from './contexto'

/**
 * O que corre com o tempo, fora da cena: necessidades, o cochilo quando a energia acaba, a
 * posição guardada de vez em quando e a conta do tempo livre.
 */
export function Relogios() {
  const { loja, controle, plataforma, rastro, pedidos } = useJogo()

  useEffect(() => {
    let contador: ContadorDeTempo = { acumulado: 0 }
    let ultimaPosicao = { x: rastro.x, z: rastro.z }
    let segundos = 0
    let enviando = false
    const t = setInterval(() => {
      const s = loja.getState()
      const ativo = document.visibilityState === 'visible' && !s.menuAberto && !s.tempoAcabou
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

      const r = contar(contador, 1)
      contador = r.contador
      if (r.enviar > 0 && !enviando) {
        enviando = true
        plataforma.servico
          .buscar('/tempo', { metodo: 'POST', corpo: { segundos: r.enviar } })
          .then((resp) => {
            if (resp.status !== 200) return
            const t = TempoRegistradoSchema.parse(resp.corpo)
            loja.getState().registrarTempo(t.usadoHojeSegundos, t.acabou)
          })
          .catch((e) => plataforma.relatarErro(e, 'tempo-livre'))
          .finally(() => {
            enviando = false
          })
      }
    }, 1000)
    return () => clearInterval(t)
  }, [loja, controle, plataforma, rastro, pedidos])

  return null
}
