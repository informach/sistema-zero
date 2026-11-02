import type { GuiaLivre } from './tipos'

/**
 * A experiência `published-copy` em exploração livre (Construtor, 02/11/2026): só a IDEIA e o convite à
 * investigação. Antes do teste, a fala pergunta e diz o que observar; o resultado só vem depois.
 * As chaves das falas começam com `published-copy-`.
 *
 * A ideia: publicar põe no Mural uma CÓPIA do jogo daquele momento; o projeto continua seu, e cada
 * publicação guarda a sua versão. "Publicar" é a ação da plataforma (a ferramenta) e aparece pelo nome.
 *
 * ⚠️ Os rótulos citados são os da tela livre (`scene-livre/published-copy.tsx`): "Publicar", as cores da
 * nave do projeto e "Abrir a versão do Mural".
 */
export const guia: GuiaLivre = {
  speech: {
    'published-copy-start':
      'À esquerda está o seu projeto; à direita, o Mural, ainda vazio. Se você publicar, o que aparece no Mural? Clique em Publicar e compare as duas telas.',
    'published-copy-first':
      'As duas telas mostram a mesma nave: publicar pôs no Mural uma cópia do seu jogo. E se você trocar a cor da nave no seu projeto, a nave do Mural muda junto? Escolha outra cor para a nave do projeto e compare as duas telas.',
    'published-copy-only':
      'Só o seu projeto mudou; a cópia do Mural ficou como estava. E se você publicar de novo, o que acontece no Mural com a publicação que já estava lá? Clique em Publicar e olhe os cartões do Mural.',
    'published-copy-complete':
      'Você comparou tudo. Publicar põe no Mural uma cópia do jogo como ele estava naquele momento. O seu projeto continua seu para mexer, e mudar ele não muda o Mural. Publicar de novo cria uma publicação nova, e a anterior continua lá. Pode continuar testando quando quiser.',
  },
  guidance: (_state, has, activity) => {
    const alvo = activity.setup?.goals
    const feito = (id: string) => has(id) || (!!alvo && !alvo.includes(id))
    if (!feito('first-publish')) return 'published-copy-start'
    if (!feito('only-project')) return 'published-copy-first'
    if (!feito('republish')) return 'published-copy-only'
    return 'published-copy-complete'
  },
}
