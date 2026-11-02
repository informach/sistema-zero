import type { GuiaLivre } from './tipos'

/**
 * A experiência `variable` em exploração livre (Construtor, Nave contra Asteroides, 02/11/2026): só
 * a IDEIA. Guardar um número (a caixa pontos) é uma coisa; mostrar o número na tela (o placar, um
 * recado para quem joga) é outra; cada acerto muda o número guardado, apareça ele ou não. Nada de
 * bloco, regra nem código: os blocos ficam para a montagem do Estúdio.
 *
 * Antes do teste, a fala pergunta e diz o que observar; o resultado só vem na fala de DEPOIS dele.
 * ⚠️ Os rótulos citados são os botões da tela livre (`scene-livre/variable.tsx`): "Guardar o número
 * 0", "Acertar um asteroide", "Mostrar o número na tela" e "Tirar o número da tela".
 */
export const VARIABLE_SPEECH = {
  'variable-start':
    'Um jogo pode guardar um número sem mostrar para ninguém. Clique em Guardar o número 0 e observe duas coisas: a caixa pontos e a tela do jogo. O que aparece em cada uma?',
  'variable-stored':
    'O número ficou guardado na caixa pontos, e a tela continuou sem número: guardar não é mostrar. E se a nave acertar um asteroide agora, com o número fora da tela, o que acontece com pontos? Clique em Acertar um asteroide e compare a caixa com a tela.',
  'variable-hide':
    'O número guardado está na tela. E se ele sair da tela, continua guardado e mudando? Clique em Tirar o número da tela, depois em Acertar um asteroide, e compare a caixa pontos com a tela.',
  'variable-shown':
    'A tela mostrou o número que já estava guardado, como um recado para quem joga, e pontos continuou igual. E se o número sair da tela, ele continua mudando? Clique em Tirar o número da tela, depois em Acertar um asteroide, e compare a caixa pontos com a tela.',
  'variable-shown-hidden':
    'A tela mostrou o número que já estava guardado, como um recado para quem joga, e pontos continuou igual. Agora o número está fora da tela. E se a nave acertar um asteroide, pontos muda mesmo sem aparecer? Clique em Acertar um asteroide e compare a caixa com a tela.',
  'variable-hidden':
    'Pontos mudou, e a tela nem ficou sabendo: o número guardado muda mesmo escondido. E quando a tela mostrar o número, qual vai aparecer? Clique em Mostrar o número na tela e compare com a caixa pontos.',
  'variable-complete':
    'Você comparou guardar e mostrar. O jogo guarda o número na caixa pontos, e cada acerto muda esse número, apareça ele ou não. Mostrar é deixar um recado na tela: o placar conta o número guardado, sem mudar nada nele. Uma caixa que guarda um número se chama variável. Pode continuar testando.',
} as const

export type FalaDaVariavel = keyof typeof VARIABLE_SPEECH

export const guia: GuiaLivre = {
  speech: VARIABLE_SPEECH,
  /**
   * A ordem sugerida é a do jogo (guardar, mudar escondido, mostrar), mas cada fala só explica o que
   * a criança JÁ testou: quem mostra antes de mudar é convidada a tirar o número da tela e acertar.
   */
  guidance: (state, has): FalaDaVariavel => {
    const { shown: naTela } = state.box
    const guardou = has('stored'),
      escondido = has('changed-hidden'),
      mostrou = has('shown')
    if (!guardou) return 'variable-start'
    if (escondido && mostrou) return 'variable-complete'
    if (escondido) return 'variable-hidden'
    if (mostrou) return naTela ? 'variable-shown' : 'variable-shown-hidden'
    // A tela já estava mostrando quando o número foi guardado: mostrar ainda não foi testado.
    return naTela ? 'variable-hide' : 'variable-stored'
  },
}
