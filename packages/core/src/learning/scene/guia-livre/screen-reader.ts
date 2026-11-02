import { SCREEN_READER_EMPTY, type SceneState } from '../state'
import { metaFeita } from './atelie-metas'
import type { GuiaLivre } from './tipos'

/**
 * A experiência `screen-reader` em exploração livre (Corre Dino, Aula 2, 02/11/2026): só a IDEIA. O
 * leitor de tela lê a tela em voz alta para quem não consegue ver; sem uma frase, ele não tem o que
 * contar do jogo. O nome do bloco que guarda a frase fica para a montagem do Estúdio. Antes de cada
 * escuta a fala pergunta o que a pessoa vai ouvir; o que ela ouve (com e sem a frase) só vem na fala
 * de DEPOIS. As chaves começam com `screen-reader-`.
 *
 * ⚠️ Os rótulos citados são o botão "Ouvir a tela" e o campo "Descrição do jogo" da tela livre
 * (`scene-livre/screen-reader.tsx`). O campo abre depois da primeira escuta (o palco de sempre).
 */
export const SCREEN_READER_SPEECH = {
  'screen-reader-start':
    'Quem não consegue ver bem a tela usa um leitor de tela: um programa que lê a tela em voz alta. O que será que a pessoa vai ouvir sobre o seu jogo? Clique em Ouvir a tela e escute com atenção.',
  'screen-reader-empty':
    'Com o campo vazio, a pessoa ouviu só “Tela do jogo. Imagem.”: o programa não vê o desenho e não tem como contar o que acontece no jogo. E se você escrever uma frase? Escreva no campo Descrição do jogo o que se faz no jogo e como se joga. Depois clique em Ouvir a tela e compare.',
  'screen-reader-written':
    'Você escreveu uma frase no campo Descrição do jogo. O que a pessoa vai ouvir agora? Clique em Ouvir a tela e compare com o que ela ouviu com o campo vazio.',
  'screen-reader-goal-only':
    'A pessoa ouviu a sua frase e já sabe o que fazer no jogo. Mas como ela joga? Com que tecla? Escreva também a tecla, como apertando espaço, e clique em Ouvir a tela de novo.',
  'screen-reader-control-only':
    'A pessoa ouviu a sua frase e já sabe como jogar. Mas o que ela precisa fazer no jogo? Escreva também o que se faz, como correr e pular os cactos, e clique em Ouvir a tela de novo.',
  'screen-reader-neither':
    'A pessoa ouviu a sua frase, mas as marcas ainda dizem “ainda não”: a frase não conta o que fazer no jogo nem como jogar. Escreva o que se faz e com que tecla, e clique em Ouvir a tela de novo.',
  'screen-reader-erase':
    'A sua frase já diz o que fazer e como jogar. Falta ouvir a tela sem nenhuma frase, para comparar. Apague o campo Descrição do jogo e clique em Ouvir a tela.',
  'screen-reader-complete':
    'Você comparou as duas escutas. Sem a frase, o leitor de tela diz só “Imagem”, porque o programa não vê o desenho. Com a sua frase, a pessoa fica sabendo o que fazer e como jogar, mesmo sem ver a tela. É como explicar um jogo por telefone. Pode continuar testando outras frases.',
} as const

export type FalaDoLeitor = keyof typeof SCREEN_READER_SPEECH

const METAS = ['heard-empty', 'says-goal', 'says-control'] as const

/**
 * Qual fala vale agora. A escuta sem frase vem primeiro (o campo do palco abre depois dela); depois
 * a fala acompanha o que a frase já diz e o que falta. "Escrita e ainda não ouvida" é o texto do campo
 * diferente da última frase ouvida.
 */
export function screenReaderGuidance(
  state: Pick<SceneState, 'description'>,
  feita: (meta: string) => boolean,
): FalaDoLeitor {
  const { text, said } = state.description
  if (METAS.every(feita)) return 'screen-reader-complete'
  const frase = text.trim()
  if (!feita('heard-empty') && !frase) return 'screen-reader-start'
  const ouvida = said !== '' && said !== SCREEN_READER_EMPTY && said === `Tela do jogo. ${frase}`
  if (frase && !ouvida) return 'screen-reader-written'
  if (!said || said === SCREEN_READER_EMPTY || !frase) return 'screen-reader-empty'
  const objetivo = feita('says-goal'),
    controle = feita('says-control')
  if (objetivo && !controle) return 'screen-reader-goal-only'
  if (controle && !objetivo) return 'screen-reader-control-only'
  // As duas já caíram e falta só a escuta vazia (um caso que abriu com uma frase escrita).
  if (objetivo && controle) return 'screen-reader-erase'
  return 'screen-reader-neither'
}

export const guia: GuiaLivre = {
  speech: SCREEN_READER_SPEECH,
  guidance: (state, has, activity) => screenReaderGuidance(state, metaFeita(activity, METAS, has)),
}
