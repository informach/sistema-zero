import { metaFeita } from '../atelie-metas'
import type { GuiaLivre } from '../tipos'

/**
 * A `random` do Corre Dino em exploração livre (Aula 12, 02/11/2026): só a IDEIA. "O jogo sorteia" o
 * lugar onde cada cacto nasce (depois da borda da direita) e a velocidade dele; o bloco do sorteio
 * fica para a montagem do Estúdio. Antes do teste, a fala pergunta e diz o que observar; o resultado
 * (lugares diferentes, um lugar que repete, o −6 chegando mais longe) só vem na fala de DEPOIS
 * daquele teste. A comparação do fim é a do vídeo (o dado: ninguém sabe antes qual número vai
 * sair). As chaves começam com `random-dino-`.
 *
 * ⚠️ Os rótulos citados são os botões da tela livre do Dino (`scene-livre/dino/random.tsx`): "Sortear
 * um lugar" e "Sortear uma velocidade". ⚠️ O sorteio é DE VERDADE (o gesto leva o `Math.random()`).
 */
const speech = {
  'random-dino-start':
    'Cada cacto novo nasce num lugar que o jogo sorteia na hora, depois da borda da direita. Sai sempre o mesmo lugar? Clique em Sortear um lugar algumas vezes e observe as marquinhas na régua.',
  'random-dino-once':
    'Saiu um lugar, e a régua ganhou uma marquinha. E no próximo sorteio, que lugar sai? Clique de novo em Sortear um lugar e compare as marquinhas.',
  'random-dino-places':
    'Saíram lugares diferentes, todos entre 500 e 560, depois da borda da tela: o jogo sorteia, e ninguém sabe antes onde o cacto vai nascer. E um lugar pode sair de novo? Clique em Sortear um lugar mais algumas vezes e observe quantas marquinhas cada lugar ganha.',
  'random-dino-repeat-first':
    'O mesmo lugar saiu duas vezes: num sorteio, um resultado pode repetir. E os outros lugares da régua, também saem? Clique em Sortear um lugar mais algumas vezes e compare as marquinhas.',
  'random-dino-repeat':
    'Um lugar saiu de novo: num sorteio, o mesmo resultado pode repetir, sempre dentro dos limites da régua. E a velocidade de cada cacto, o jogo também pode sortear? Clique em Sortear uma velocidade algumas vezes e compare as raias.',
  'random-dino-speed-once':
    'Saiu uma velocidade, e o cacto correu um segundo na raia dele. E no próximo sorteio, sai a mesma velocidade? Clique de novo em Sortear uma velocidade e compare as raias.',
  'random-dino-speeds':
    'Saíram −5 e −6, e o cacto −6 chegou mais longe em um segundo: ele anda mais em cada quadro. E o lugar onde cada cacto nasce, também é sorteado? Clique em Sortear um lugar algumas vezes e observe as marquinhas na régua.',
  'random-dino-complete':
    'Você viu as três coisas. O jogo sorteia o lugar de cada cacto, sempre entre 500 e 560, e um lugar pode sair de novo, como num dado: ninguém sabe antes qual número vai sair, e o mesmo número pode sair outra vez. E também sorteia a velocidade: o cacto −6 anda mais em cada quadro e chega mais longe que o −5. Pode continuar sorteando quando quiser.',
} as const

export type FalaDoSorteioDino = keyof typeof speech

const METAS = ['positions', 'repeat', 'velocities'] as const

/**
 * Qual fala vale agora. A ordem sugerida é a do roteiro (o lugar, depois a velocidade), mas cada fala
 * só explica o que a criança JÁ testou: quem sorteia a velocidade antes é acompanhado nela.
 */
function guidance(...[state, has, activity]: Parameters<GuiaLivre['guidance']>) {
  const feita = metaFeita(activity, METAS, has)
  const lugares = feita('positions'),
    repete = feita('repeat'),
    velocidades = feita('velocities')
  if (lugares && repete && velocidades) return 'random-dino-complete'
  const sorteouLugar = state.speed.spots.some((n) => n > 0)
  const sorteouVelocidade = state.speed.samples.velocities.length > 0
  if (lugares && repete) return sorteouVelocidade ? 'random-dino-speed-once' : 'random-dino-repeat'
  if (has('positions')) return 'random-dino-places'
  if (has('repeat')) return 'random-dino-repeat-first'
  if (has('velocities')) return 'random-dino-speeds'
  if (sorteouLugar) return 'random-dino-once'
  return sorteouVelocidade ? 'random-dino-speed-once' : 'random-dino-start'
}

export const guia: GuiaLivre = { speech, guidance }
