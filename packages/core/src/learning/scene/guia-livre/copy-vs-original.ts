import type { GuiaLivre } from './tipos'

/**
 * A experiência `copy-vs-original` em exploração livre (Construtor, 02/11/2026): só a IDEIA e o convite à
 * investigação. Antes do teste, a fala pergunta e diz o que observar; o resultado só vem depois.
 * As chaves das falas começam com `copy-vs-original-`.
 *
 * A ideia: baixar o projeto tira uma CÓPIA (o jogo continua na aula), importar transforma a cópia num
 * projeto seu, e daí em diante cada um segue o seu caminho. "Baixar o projeto" e "Importar" são as
 * ações da plataforma (a ferramenta), por isso aparecem pelo nome.
 *
 * ⚠️ Os rótulos citados são os da tela livre (`scene-livre/copy-vs-original.tsx`): "Baixar o projeto",
 * "Importar no Estúdio" e as cores das duas naves.
 */
export const guia: GuiaLivre = {
  speech: {
    'copy-vs-original-start':
      'Aqui está o jogo da aula. Se você baixar o projeto, o que acontece com o jogo da aula: ele sai daqui ou fica? Clique em Baixar o projeto e observe o lado da aula.',
    'copy-vs-original-exported':
      'O arquivo saiu e o jogo continuou na aula: baixar o projeto tira uma cópia. E se você importar esse arquivo, o que aparece no Estúdio? Clique em Importar no Estúdio e compare as duas telas.',
    'copy-vs-original-imported':
      'O mesmo jogo apareceu no Estúdio: a cópia virou um projeto seu. E agora, se você pintar a nave de um lado só, o outro lado muda junto? Escolha outra cor para a nave do Estúdio e observe a nave da aula.',
    'copy-vs-original-complete':
      'Você comparou tudo. Baixar o projeto tira uma cópia, e o jogo continua na aula. Importar transforma a cópia num projeto seu no Estúdio. Daí em diante cada um segue o seu caminho: pintar um lado não muda o outro. Pode continuar testando quando quiser.',
  },
  guidance: (_state, has, activity) => {
    const alvo = activity.setup?.goals
    const feito = (id: string) => has(id) || (!!alvo && !alvo.includes(id))
    if (!feito('exported')) return 'copy-vs-original-start'
    if (!feito('imported')) return 'copy-vs-original-exported'
    if (!feito('independent')) return 'copy-vs-original-imported'
    return 'copy-vs-original-complete'
  },
}
