import type { SceneState } from '../state'
import { metaFeita } from './atelie-metas'
import type { GuiaLivre } from './tipos'

/**
 * A experiência `gravity` em exploração livre (Corre Dino, Aula 3, 02/11/2026): só a IDEIA. A
 * gravidade é a força que puxa o Dino para baixo um pouco em cada quadro; o nome do bloco que a aplica
 * fica para a montagem do Estúdio. Antes de cada pulo a fala pergunta e diz o que observar (o Dino e o
 * número da altura); se ele volta ou não volta ao chão só vem na fala de DEPOIS. As chaves começam com
 * `gravity-`.
 *
 * ⚠️ Os rótulos citados são os botões da tela livre (`scene-livre/gravity.tsx`): "Pular", "Ligar a
 * gravidade" e "Desligar a gravidade". O tempo anda sozinho no pulo e para no pouso, ou com o Dino
 * sem gravidade lá no alto (`sceneClockShouldStop`).
 */
export const GRAVITY_SPEECH = {
  'gravity-start':
    'Aqui a gravidade está desligada. O que acontece com um pulo do Dino sem ela? Clique em Pular e observe o Dino e o número da altura até o tempo parar.',
  'gravity-start-on':
    'A gravidade está ligada. Como fica o pulo do Dino com ela? Clique em Pular e observe o Dino e o número da altura até o tempo parar.',
  'gravity-flying':
    'O Dino está no ar. Observe o número da altura enquanto o tempo passa: o número continua crescendo, ou muda de rumo?',
  'gravity-landed-first':
    'Com a gravidade ligada, o Dino subiu, foi ficando mais devagar, parou no alto e voltou ao chão. E sem a gravidade, o que muda? Clique em Desligar a gravidade e depois em Pular, observando o número da altura.',
  'gravity-landed-first-off':
    'Com a gravidade ligada, o Dino subiu, foi ficando mais devagar, parou no alto e voltou ao chão. Agora a gravidade está desligada. O que muda no pulo? Clique em Pular e observe o número da altura.',
  'gravity-floating':
    'Sem gravidade, o número da altura só cresce: nada puxa o Dino para baixo, e o Dino não para de subir. E se você ligar a gravidade agora, com o Dino no ar? Clique em Ligar a gravidade e observe o Dino e o número da altura.',
  'gravity-floating-ground':
    'Sem gravidade, o número da altura só cresceu: nada puxou o Dino para baixo. E com a gravidade ligada, como fica o pulo? Clique em Ligar a gravidade e depois em Pular, observando o número da altura.',
  'gravity-floating-on':
    'Sem gravidade, o número da altura só cresceu: nada puxou o Dino para baixo. Agora a gravidade está ligada. Clique em Pular e observe o Dino e o número da altura até o tempo parar.',
  'gravity-complete':
    'Você comparou os dois pulos. Sem gravidade, nada puxa o Dino para baixo, e ele sobe sem parar. Com a gravidade, o Dino é puxado para baixo um pouco em cada quadro: a subida fica mais devagar, para e vira queda, até o Dino voltar ao chão. É como jogar uma bola para cima. Pode continuar testando.',
} as const

export type FalaDaGravidade = keyof typeof GRAVITY_SPEECH

const METAS = ['floating', 'landed'] as const

/**
 * Qual fala vale agora. A ordem sugerida começa sem gravidade (o caso da aula), mas quem liga a
 * gravidade e pula primeiro é acompanhado: o pulo que voltou é explicado, e o pulo sem gravidade vira
 * o próximo convite. `landed` é a comparação: só cai com o pulo sem gravidade visto antes.
 */
export function gravityGuidance(
  state: Pick<SceneState, 'flight'>,
  feita: (meta: string) => boolean,
): FalaDaGravidade {
  const f = state.flight
  const noAr = f.time !== null
  if (METAS.every(feita)) return 'gravity-complete'
  if (feita('floating')) {
    // Com o Dino no ar e a gravidade desligada, o convite é ligar a gravidade ali mesmo.
    if (noAr && !f.gravity) return 'gravity-floating'
    if (noAr) return 'gravity-flying'
    return f.gravity ? 'gravity-floating-on' : 'gravity-floating-ground'
  }
  if (noAr) return 'gravity-flying'
  // Um pulo com gravidade já pousou (o pico fica até o próximo pulo), sem o pulo sem gravidade.
  if (f.peak > 0 && f.atGravity)
    return f.gravity ? 'gravity-landed-first' : 'gravity-landed-first-off'
  return f.gravity ? 'gravity-start-on' : 'gravity-start'
}

export const guia: GuiaLivre = {
  speech: GRAVITY_SPEECH,
  guidance: (state, has, activity) => gravityGuidance(state, metaFeita(activity, METAS, has)),
}
