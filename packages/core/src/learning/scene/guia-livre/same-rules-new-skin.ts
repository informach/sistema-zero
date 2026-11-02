import type { GuiaLivre } from './tipos'

/**
 * A experiência `same-rules-new-skin` em exploração livre (Construtor, 02/11/2026): só a IDEIA e o convite à
 * investigação. Antes do teste, a fala pergunta e diz o que observar; o resultado só vem depois.
 * As chaves das falas começam com `same-rules-new-skin-`.
 *
 * A ideia: trocar a história (nave, carrinho, submarino) muda só a APARÊNCIA; o que o jogo faz quando
 * você aperta a tecla continua o mesmo. Desligar o tiro, ao contrário, muda o jogo de verdade. Nada de
 * "regra" (decisão de 02/11/2026: a palavra é da programação); a tela fala de "o que o jogo faz".
 *
 * ⚠️ Os rótulos citados são os da tela livre (`scene-livre/same-rules-new-skin.tsx`): "Nave no espaço",
 * "Carrinho na estrada", "Submarino no mar", "Desligar o tiro", "Ligar o tiro de volta", "Tecla de tiro", "Mover" e "Jogar".
 */
export const guia: GuiaLivre = {
  speech: {
    'same-rules-new-skin-start':
      'Jogue um pouco: clique em Mover e em Tecla de tiro. Agora, se a história virar a do carrinho, o que muda: só a aparência, ou também o que o jogo faz? Escolha Carrinho na estrada e observe a lista do que o jogo faz.',
    'same-rules-new-skin-after-off':
      'Desligar o tiro mudou o jogo: a tecla não soltou tiro. E trocar a aparência, muda o que o jogo faz? Escolha Carrinho na estrada e observe a lista do que o jogo faz.',
    'same-rules-new-skin-road':
      'Virou carrinho, e o jogo continuou fazendo as mesmas coisas: só a aparência mudou. E nas outras histórias, alguma coisa que o jogo faz apaga? Passe pelo Submarino no mar e observe a lista do que o jogo faz.',
    'same-rules-new-skin-skins':
      'Nas três histórias, o jogo fez as mesmas coisas: o que o jogo faz quando você aperta a tecla continua o mesmo; só a aparência muda. E se o tiro for desligado, o jogo fica igual? Clique em Desligar o tiro, clique em Tecla de tiro e deixe o jogo andar. Observe o jogo e a lista.',
    'same-rules-new-skin-off':
      'O tiro está desligado agora. O que acontece quando você clica em Tecla de tiro? Clique em Tecla de tiro, deixe o jogo andar e observe o jogo e a lista.',
    'same-rules-new-skin-back':
      'Com o tiro desligado, a tecla não soltou tiro: o jogo mudou de verdade. Agora ligue o tiro de volta para comparar as histórias: clique em Ligar o tiro de volta.',
    'same-rules-new-skin-complete':
      'Você comparou tudo. Trocar a história muda só a aparência: nave, carrinho ou submarino, o jogo continua fazendo as mesmas coisas. Desligar o tiro é diferente: aí o jogo muda de verdade. A aparência e o que o jogo faz são escolhas separadas, e você escolhe o que troca.',
  },
  guidance: (state, has, activity) => {
    const alvo = activity.setup?.goals
    const feito = (id: string) => has(id) || (!!alvo && !alvo.includes(id))
    const tema = feito('skin-only'),
      tres = feito('three-skins'),
      tiro = feito('rule-off')
    const ligado = state.skinGame.shootEnabled
    if (tema && tres && tiro) return 'same-rules-new-skin-complete'
    // Com o tiro desligado e o teste dele ainda por fazer, a fala acompanha esse teste.
    if (!ligado && !tiro) return 'same-rules-new-skin-off'
    if (!tema || !tres) {
      if (!ligado) return 'same-rules-new-skin-back'
      if (!tema)
        return has('rule-off') ? 'same-rules-new-skin-after-off' : 'same-rules-new-skin-start'
      return 'same-rules-new-skin-road'
    }
    return 'same-rules-new-skin-skins'
  },
}
