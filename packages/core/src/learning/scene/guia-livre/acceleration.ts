import { falaDaSequencia, type PassoDaSequencia } from './dino-sequencia'
import type { GuiaLivre } from './tipos'

/**
 * A experiência `acceleration` em exploração livre (Corre Dino, aula 13, 02/11/2026): só a IDEIA. A
 * cada 5 segundos a BASE (a velocidade dos cactos novos) ganha −1, e o cacto que nasce guarda o
 * número dele; a pergunta "a base é maior que −9?" decide se a base continua diminuindo. Nada de Se,
 * "condição", "Mudar velocidade" nem bloco: os blocos ficam para a montagem do Estúdio.
 *
 * Antes do teste, a fala pergunta e diz o que observar; o resultado só vem na fala de DEPOIS dele.
 * ⚠️ Os rótulos citados são os da tela livre (`scene-livre/acceleration.tsx`): "Passar 5 segundos",
 * "Ligar a pergunta", "Desligar a pergunta" e "Voltar ao começo" (guarda as descobertas e a pergunta).
 * ⚠️ A ordem: os cactos que guardam o número (`old-speed`, que cai no segundo cacto diferente), a
 * base que para (`base-limit`), o −10 com a base parada (`variation-limit`) e a base sem a pergunta
 * (`past-limit`).
 */
export const ACCELERATION_SPEECH = {
  'acceleration-start':
    'A cada 5 segundos, a base ganha -1. Quando a base muda, o que acontece com os cactos que já estão na pista? Clique em Passar 5 segundos algumas vezes e observe o número embaixo de cada cacto.',
  'acceleration-para':
    'Os cactos que já nasceram guardaram o número deles: a base mudou, e eles não. E a base, até onde ela vai? A cada 5 segundos, o jogo pergunta: a base é maior que -9? Com a pergunta ligada, clique em Passar 5 segundos até a base chegar no -9 e continue clicando. Observe a base. Com a base já abaixo do -9, clique antes em Voltar ao começo.',
  'acceleration-para-first':
    'E a base, até onde ela vai? A cada 5 segundos, o jogo pergunta: a base é maior que -9? Com a pergunta ligada, clique em Passar 5 segundos até a base chegar no -9 e continue clicando. Observe a base. Com a base já abaixo do -9, clique antes em Voltar ao começo.',
  'acceleration-sorteio':
    'No -9, a resposta da pergunta foi não, e a base parou ali. E os cactos novos, com a base parada no -9: pode nascer algum mais rápido que -9? Com a pergunta ligada, continue clicando em Passar 5 segundos e observe o número de cada cacto novo.',
  'acceleration-sem':
    'Mesmo com a base parada no -9, nasceu um cacto com -10: o sorteio vem depois da base, e o cacto guarda a conta dele. E sem a pergunta, até onde a base vai? Clique em Desligar a pergunta e depois em Passar 5 segundos algumas vezes. Observe a base.',
  'acceleration-sem-first':
    'E sem a pergunta, até onde a base vai? Clique em Desligar a pergunta e depois em Passar 5 segundos algumas vezes. Observe a base.',
  'acceleration-complete':
    'Você comparou. A cada 5 segundos a base muda, e os cactos que já nasceram guardam o número deles. Com a pergunta ligada, no -9 a resposta é não, e a base para ali; mesmo assim um cacto pode nascer com -10, porque o sorteio vem depois da base. Sem a pergunta, a base passa do -9 e não para mais. Pode continuar testando.',
  'acceleration-complete-parcial':
    'Você fez os testes que esta experiência pede. Pode continuar passando 5 segundos, ligando e desligando a pergunta.',
} as const

export type FalaDaAceleracao = keyof typeof ACCELERATION_SPEECH

/** Os testes na ordem do curso. O apelido de caso `spawned-ten` conta no passo do sorteio. */
export const PASSOS_DA_ACELERACAO: readonly PassoDaSequencia[] = [
  { chave: 'start', metas: ['old-speed'] },
  { chave: 'para', metas: ['base-limit'] },
  // O −10 só conta com a base JÁ parada em −9 (`passarCincoSegundos`): por isso sem `-first`.
  { chave: 'sorteio', metas: ['variation-limit', 'spawned-ten'], requer: 'para' },
  { chave: 'sem', metas: ['past-limit'] },
]

export const guia: GuiaLivre = {
  speech: ACCELERATION_SPEECH,
  guidance: (_state, has, activity) =>
    falaDaSequencia({
      cena: 'acceleration',
      activity,
      has,
      passos: PASSOS_DA_ACELERACAO,
      fabrica: ['base-limit', 'variation-limit', 'old-speed', 'past-limit'],
      fimParcial: () => 'acceleration-complete-parcial',
    }) as FalaDaAceleracao,
}
