import { useEffect } from 'react'
import { ALTURA_DA_TERRA, CENTRO_DA_CASA } from '../mundo/medidas'
import { passarTempoDoBicho } from '../sistemas/bichos'
import { descansar, FALA_DA_SONECA_CHEIA, sonecaAcabou } from '../sistemas/descanso'
import { passarTempo } from '../sistemas/necessidades'
import { salvamentoPausado } from '../sistemas/pausa'
import { useJogo } from './contexto'

/**
 * O que corre com o tempo, fora da cena: necessidades (e as do bicho adotado), o cochilo quando a
 * energia acaba, a posição guardada de vez em quando e a conta do tempo livre.
 */
export function Relogios() {
  const { loja, controle, plataforma, rastro, pedidos, gerenteTempo, movimento } = useJogo()

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
        !s.tempoPausado &&
        !salvamentoPausado(s.salvamentoSituacao) &&
        !s.tempoSincronizando
      if (!ativo) return
      if (gerenteTempo && !gerenteTempo.verificar()) return
      segundos++

      if (segundos % 2 === 0) {
        // O bicho adotado também sente o tempo jogado (fome, limpeza e carinho caem devagar).
        s.mudar((sv) => ({
          ...sv,
          necessidades: passarTempo(sv.necessidades, 2, controle.correr),
          bichos: sv.bichos.adotado
            ? { ...sv.bichos, adotado: passarTempoDoBicho(sv.bichos.adotado, 2) }
            : sv.bichos,
        }))
        // Sentada no banco ou deitada na cama, a energia volta aos poucos (`sistemas/descanso.ts`);
        // na cama, cheia, a soneca acaba e ela levanta.
        const jeito = loja.getState().descanso
        if (jeito) {
          s.mudar((sv) => ({ ...sv, necessidades: descansar(sv.necessidades, jeito, 2) }))
          if (sonecaAcabou(loja.getState().salvamento.necessidades, jeito)) {
            movimento.pedido = { tipo: 'levantar' }
            s.dizer(FALA_DA_SONECA_CHEIA)
          }
        }
        // Com um painel aberto (a conversa, o cuidar, o Quadro), o cochilo espera ele fechar.
        const agora = loja.getState()
        if (agora.salvamento.necessidades.energia <= 0 && agora.painelAberto === null) {
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

      if (segundos % 10 === 0) gerenteTempo?.pulsar()
    }, 1000)
    const ativoParaSessao = () => {
      const s = loja.getState()
      return (
        document.visibilityState === 'visible' &&
        !s.menuAberto &&
        !s.ferramentaAberta &&
        !s.tempoAcabou &&
        !s.tempoPausado &&
        !salvamentoPausado(s.salvamentoSituacao)
      )
    }
    let anterior = false
    const atualizar = () => {
      const ativo = ativoParaSessao()
      if (ativo === anterior) return
      anterior = ativo
      gerenteTempo?.atualizar(ativo)
    }
    const desinscrever = loja.subscribe(atualizar)
    document.addEventListener('visibilitychange', atualizar)
    atualizar()
    return () => {
      clearInterval(t)
      desinscrever()
      document.removeEventListener('visibilitychange', atualizar)
      void gerenteTempo?.encerrar().catch((erro) => plataforma.relatarErro(erro, 'encerrar-tempo'))
    }
  }, [loja, controle, plataforma, rastro, pedidos, gerenteTempo, movimento])

  return null
}
