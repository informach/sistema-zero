import { falaDaSequencia, type PassoDaSequencia } from './dino-sequencia'
import type { GuiaLivre } from './tipos'

/**
 * A experiência `number-line` em exploração livre (Corre Dino, aula 13, 02/11/2026): só a IDEIA. A
 * reta dos números negativos, somar −1 (uma casa para a esquerda) e a pergunta "a velocidade é ___
 * −9?" com o sinal que a criança escolhe (>, = ou <). Sinais e números negativos são conceito e
 * aparecem; bloco, Se e "valor da base" não.
 *
 * Antes do teste, a fala pergunta e diz o que observar; o resultado só vem na fala de DEPOIS dele.
 * ⚠️ Os rótulos citados são os da tela livre (`scene-livre/number-line.tsx`): "Somar -1",
 * "> maior que", "= igual a", "< menor que" e "Voltar ao começo" (guarda as descobertas e o sinal).
 */
export const NUMBER_LINE_SPEECH = {
  'number-line-start':
    'Esta é a reta dos números, do -12 ao 0, e o marcador está no -5. Quando você soma -1, para que lado o marcador anda? E o número fica maior ou menor? Clique em Somar -1 três vezes e observe o marcador.',
  'number-line-maior':
    'Cada -1 levou o marcador uma casa para a esquerda: o número ficou menor, e o cacto, mais rápido para a esquerda. Agora a pergunta: -5 é maior que -9? Clique em Voltar ao começo, depois em > maior que, e observe a resposta.',
  'number-line-maior-first':
    'Agora a pergunta: -5 é maior que -9? Com o marcador no -5, clique em > maior que e observe a resposta. Caso o marcador tenha saído do -5, clique antes em Voltar ao começo.',
  'number-line-para':
    'No -5, a resposta foi sim: na reta, quem mora mais à direita é o maior, e o -5 mora à direita do -9. E no próprio -9: -9 é maior que -9? Com > maior que escolhido, clique em Somar -1 até o marcador chegar no -9 e observe a resposta. Caso o marcador passe do -9, clique em Voltar ao começo.',
  'number-line-para-first':
    'E no -9: -9 é maior que -9? Com > maior que escolhido, clique em Somar -1 até o marcador chegar no -9 e observe a resposta. Caso o marcador passe do -9, clique em Voltar ao começo.',
  'number-line-igual':
    'No -9, a resposta virou não: -9 não é maior que -9. E com o sinal de igual, em que lugar a resposta é sim? Clique em Voltar ao começo, depois em = igual a, e clique em Somar -1 quatro vezes. Acompanhe a resposta a cada casa.',
  'number-line-igual-first':
    'E com o sinal de igual, em que lugar a resposta é sim? Clique em Voltar ao começo, depois em = igual a, e clique em Somar -1 quatro vezes. Acompanhe a resposta a cada casa.',
  'number-line-complete':
    'Você comparou. Somar -1 leva o marcador para a esquerda, para números menores. Na reta, quem mora mais à direita é o maior: -5 é maior que -9, e no -9 a pergunta com > responde não, porque -9 não é maior que -9. Com o =, a resposta é não em todo lugar, menos no -9. Pode continuar testando, com o < menor que também.',
  'number-line-complete-parcial':
    'Você fez os testes que esta experiência pede. Pode continuar somando -1 e trocando o sinal da pergunta.',
} as const

export type FalaDaReta = keyof typeof NUMBER_LINE_SPEECH

/** Os testes na ordem do curso: somar −1, o > no −5, o > no −9 e o = do −5 ao −9. */
export const PASSOS_DA_RETA: readonly PassoDaSequencia[] = [
  { chave: 'start', metas: ['colder'] },
  { chave: 'maior', metas: ['greater'] },
  { chave: 'para', metas: ['stops'] },
  { chave: 'igual', metas: ['silent'] },
]

export const guia: GuiaLivre = {
  speech: NUMBER_LINE_SPEECH,
  guidance: (_state, has, activity) =>
    falaDaSequencia({
      cena: 'number-line',
      activity,
      has,
      passos: PASSOS_DA_RETA,
      fabrica: ['colder', 'greater', 'stops', 'silent'],
      fimParcial: () => 'number-line-complete-parcial',
    }) as FalaDaReta,
}
