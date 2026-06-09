// Hero da /oferta por perfil (Seção 1). O perfil chega em `?perfil=` da URL; sem
// param/valor inválido → variação `padrao` (fallback). Copy verbatim do briefing.
// O `botao` NÃO traz o preço — a /oferta anexa "(R$ 37)" com o preço do catálogo.

import type { Perfil } from '../lib/perfil'

export interface HeroVariacao {
  titulo: string
  abertura: string
  botao: string
}

/** Parágrafo comum (igual em todas as variações), abaixo da abertura, antes do botão. */
export const HERO_PARAGRAFO_COMUM =
  'Você não precisa virar programador para criar sistemas, páginas, ferramentas, quizzes, jogos ou automações com a ajuda da IA. Também não dá para abrir o ChatGPT, pedir "cria um sistema completo para mim" e torcer para dar certo. O No Comando da IA é um material direto para ler e aplicar, pensado para quem é de fora da área técnica, que ensina o mínimo certo para organizar a ideia, pedir melhor e avaliar o que a IA entrega. No fim, você sai com um mapa de uma página da sua ideia: o problema, pra quem é, as telas, os dados, as regras e a primeira versão possível. Ele não promete que você vai sair criando um sistema complexo sozinho. Ele organiza o começo certo: clareza antes do código.'

export const HERO_PADRAO: HeroVariacao = {
  titulo: 'Tire a sua ideia da cabeça e bote a IA pra construir, sem virar programador.',
  abertura:
    'Talvez você tenha uma ideia parada, talvez já tenha tentado criar com a IA e se perdido no caminho, talvez dependa de alguém pra cada ajuste, ou talvez nem saiba se o que ela entrega tá certo. Seja qual for o seu caso, o começo é o mesmo: organizar a ideia num mapa de uma página, que é um resumo dela numa folha só, com o problema, pra quem é, as telas, os dados e as regras. É esse mapa que dá à IA o caminho pra construir. Clareza antes do código, sem virar programador e sem só pedir e torcer.',
  botao: 'Quero meu mapa de 1 página',
}

export const HERO_POR_PERFIL: Record<Perfil, HeroVariacao> = {
  ideia_parada: {
    titulo:
      'Sua ideia não parou por falta de capacidade. Parou por falta de um plano que a IA entenda.',
    abertura:
      'Você acabou de ver onde trava, e não é falta de capacidade. É que, do jeito que está hoje, a ideia ainda é grande demais na sua cabeça e pequena demais no papel pra IA conseguir construir. O primeiro passo não é aprender a programar. É organizar essa ideia num mapa de uma página, que é um resumo dela inteira numa folha só: o problema, pra quem é, as telas, os dados e as regras. É esse mapa que dá à IA o caminho que faltava. Clareza antes do código, sem virar programador e sem só pedir e torcer.',
    botao: 'Quero meu mapa de 1 página',
  },
  criando_no_escuro: {
    titulo: 'Funcionou de primeira. Aí quebrou, e você não soube nem por onde começar a olhar.',
    abertura:
      'Você já viu a IA criar em minutos. Talvez tenha funcionado de primeira. Aí, quando quebrou, virou uma caixa-preta: você pede pra consertar, ela conserta um pedaço e estraga outro, e você fica refém de cada resposta. O ponto não é a IA ter errado. É você não ter tido a referência mínima pra perceber o erro antes dele aparecer. É isso que você ganha aqui: o critério pra entender o que a IA fez, testar antes de confiar e ajustar com segurança, sem virar programador. Quem entende a base conduz a ferramenta. Quem não entende copia, cola e torce.',
    botao: 'Quero sair do escuro',
  },
  refem_ajustes: {
    titulo: 'Tem algo seu no ar, mas você depende de outra pessoa pra cada ajuste.',
    abertura:
      'Você tem algo iniciado, ou que queria colocar pra rodar, mas cada mudança pequena trava na mão de outra pessoa ou da IA: trocar uma regra, corrigir um erro, ajustar uma tela. Aí o seu projeto anda no ritmo dos outros, não no seu. E isso não acontece porque é difícil, acontece porque ninguém te mostrou o básico de como aquilo é montado: telas, dados e regras. Quando você entende esse mínimo, os ajustes simples voltam pra sua mão. Você não precisa fazer tudo sozinho, só parar de depender pra cada detalhe. Sem virar programador, sem abrir chamado, sem esperar a fila de um freelancer.',
    botao: 'Quero autonomia nos ajustes',
  },
  sem_criterio: {
    titulo:
      'Você cria com a IA, mas fica aquela sensação de estar fazendo algo errado sem perceber.',
    abertura:
      'Você cria com a IA e às vezes até entrega, mas fica aquela voz no fundo: será que tá certo mesmo? Essa sensação tem origem: você não tem como saber se o que a IA gerou está seguro, se vai quebrar depois ou se deixou algum dado exposto. Funcionar na tela não quer dizer estar pronto. O que resolve isso não é um curso de programação, é um critério pra olhar a entrega da IA e saber o que aceitar, o que questionar e o que testar antes de publicar. É leitura crítica do que a ferramenta faz, do jeito de quem está no comando.',
    botao: 'Quero criar com mais segurança',
  },
}
