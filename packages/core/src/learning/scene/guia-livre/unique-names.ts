import type { GuiaLivre } from './tipos'

/**
 * A experiência `unique-names` em exploração livre (Construtor, 02/11/2026): só a IDEIA e o convite à
 * investigação. Antes do teste, a fala pergunta e diz o que observar; o resultado só vem depois.
 * As chaves das falas começam com `unique-names-`.
 *
 * ⚠️ Exceção decidida pela responsável (02/11/2026): na Aula 6 do Meu Jeito o conceito É o bloco (como ele
 * acha o desenho pelo NOME), então os blocos e os nomes `nave`/`folha-nave` aparecem; o convite à
 * investigação vale igual.
 *
 * ⚠️ Os rótulos citados são os da tela livre (`scene-livre/unique-names.tsx`): "Tirar o bloco de cima",
 * "Pôr o bloco de cima de volta" e os nomes do bloco de baixo.
 */
export const guia: GuiaLivre = {
  speech: {
    'unique-names-start':
      'Os três blocos da direita procuram um desenho pelo nome nave. Quem cria esse nome é o bloco de cima. E se ele sair, o que acontece com os três blocos e com a prévia? Clique em Tirar o bloco de cima e observe os blocos e a prévia.',
    'unique-names-missing':
      'Sem o bloco que cria nave, os três blocos acenderam o aviso e a prévia parou: eles procuram um nome que ninguém criou. E se dois blocos criarem o mesmo nome? Ponha o bloco de cima de volta, escolha nave no bloco de baixo e leia o que aparece.',
    'unique-names-clash':
      'Dois blocos criando nave: o Estúdio avisa que esse nome já existe e pede um nome diferente, porque cada nome é de uma coisa só. E se a folha ganhar um nome só dela? Com o bloco de cima no lugar, escolha folha-nave no bloco de baixo e observe o aviso e a prévia.',
    'unique-names-own-first':
      'Com um nome só dela, a folha ficou junto da nave sem aviso. Agora, e se o bloco que cria nave sair, o que acontece com os três blocos e com a prévia? Clique em Tirar o bloco de cima e observe.',
    'unique-names-complete':
      'Você comparou tudo. Os blocos acham o desenho pelo nome. Sem o bloco que cria nave, os outros avisam e a prévia para. Com dois blocos criando nave, o Estúdio pede um nome diferente. Por isso a folha ganhou um nome só dela, folha-nave, e fica junto da nave sem briga.',
  },
  guidance: (_state, has, activity) => {
    const alvo = activity.setup?.goals
    const feito = (id: string) => has(id) || (!!alvo && !alvo.includes(id))
    const falta = feito('missing'),
      briga = feito('clash'),
      proprio = feito('own-name')
    if (falta && briga && proprio) return 'unique-names-complete'
    if (!briga) return falta ? 'unique-names-missing' : 'unique-names-start'
    if (!proprio) return 'unique-names-clash'
    return 'unique-names-own-first'
  },
}
