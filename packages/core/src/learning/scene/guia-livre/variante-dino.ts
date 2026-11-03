import type { SceneActivity } from '../index'
import type { GuiaLivre } from './tipos'

/**
 * A variante do Corre Dino de uma cena que a Nave contra Asteroides também usa em exploração livre
 * (Corre Dino, 02/11/2026). A cena é a mesma, mas o jogo é outro: o Dino e os cactos, com os casos de
 * fábrica do Corre Dino (o cacto da esquerda, o relógio em segundos, o toque na tela). Quem escolhe a
 * variante é o CENÁRIO que o manifesto declara (`activity.cenario`): todos os blocos de cena dos
 * cursos declaram o seu, e a Nave continua com as falas de sempre.
 */
export const ehDoDino = (activity: Pick<SceneActivity, 'cenario'>) =>
  activity.cenario === 'corre-dino'

/**
 * O guia de uma cena compartilhada: as falas das duas variantes juntas (a voz grava e o Admin ajusta
 * todas pelo mesmo registro) e a escolha da fala pelo cenário.
 *
 * ⚠️ Os ids do Dino são `<cena>-dino-…`: começam com o nome da cena, como toda fala do registro (os
 * testes da Nave conferem o prefixo em todas as falas da cena), e o `-dino-` os separa dos da Nave.
 */
export function comVarianteDoDino(nave: GuiaLivre, dino: GuiaLivre): GuiaLivre {
  return {
    speech: { ...nave.speech, ...dino.speech },
    guidance: (state, has, activity) =>
      (ehDoDino(activity) ? dino : nave).guidance(state, has, activity),
  }
}

/**
 * A variante do Dino que segue a MESMA escolha da Nave (a mesma ordem de testes, as mesmas metas), só
 * com as palavras do Corre Dino: `<cena>-x` vira `<cena>-dino-x`. As telas livres leem o passo pelo
 * id da Nave (`semDino` no member-shell), então o destaque do botão também é o mesmo.
 *
 * ⚠️ Um passo da Nave sem fala do Dino continua com a fala da Nave (é o caso da `layers` apresentada
 * como a lista Camadas do Pinta, que o Corre Dino não usa). O teste `livre-dino-a` confere que todo
 * passo que os blocos do Dino alcançam tem a fala do Dino.
 */
export function espelhoDoDino(
  cena: string,
  nave: GuiaLivre,
  speech: Readonly<Record<string, string>>,
): GuiaLivre {
  return {
    speech,
    guidance: (state, has, activity) => {
      const id = nave.guidance(state, has, activity)
      const doDino = id.replace(`${cena}-`, `${cena}-dino-`)
      return Object.hasOwn(speech, doDino) ? doDino : id
    },
  }
}
