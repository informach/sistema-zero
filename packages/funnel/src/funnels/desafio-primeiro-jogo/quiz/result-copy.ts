// Copy das cartas de resultado do quiz Kids do Desafio, v5 (21/10/2026, Canvas "Quiz do Desafio ·
// Kids e adulto", quadros Resultado917 e ResultadoMenor9). Cinco movimentos: o que a família contou,
// por que acontece, o que muda (ainda sem o produto), onde isso acontece (o Desafio, a tela real do
// jogo e um relato) e o que a família disse que precisa, com as condições ditas com honestidade.
//
// `[[...]]` marca a resposta da família devolvida no texto (vira `<mark>`). Texto no masculino; a
// carta inteira passa por `flexionar` quando a entrada é "Na minha filha", por isso "ele" é SEMPRE a
// criança (o personagem usa o substantivo). Fatos só das páginas aprovadas (`oferta/pagina-9a17.ts`,
// `oferta/pagina-menor9.ts`).
import type { Condition, DesafioProfile, M9Profile } from './engine'

export const m = (texto: string): string => `[[${texto}]]`

export const APPROXIMATE_NOTE =
  'Suas respostas apontaram para mais de um lado. Este foi o que mais apareceu.'
export const ASSINATURA = 'Helena e Júlio, Sistema Zero Kids'
export const WHERE_HEADING = 'Onde isso acontece'
export const NEEDS_HEADING = 'O que você disse que precisa'
export const CTA_UNMET_LABEL = 'Ver os requisitos e como funciona'
/** A linha abaixo do botão: pagamento único, sem planos. */
export const CTA_NOTA = 'O preço aparece na próxima página.'
export const ctaUnmetText = (itens: string[]): string => {
  const lista =
    itens.length > 1 ? `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}` : (itens[0] ?? '')
  return `Na próxima página, você vê como tudo funciona e confere, com calma, ${lista}.`
}
export const STILL_LOOKING = `Você disse que ${m('ainda está conhecendo')}. A próxima página mostra o jogo, as etapas e as condições, para você decidir com calma.`
export const ORCAMENTO = `Você quer que ${m('caiba no orçamento')}. É um pagamento único, sem renovação automática, com 7 dias de garantia.`
export const IMAGEM_FAROL = {
  src: '/img/desafio-primeiro-jogo/farol-jogo.png',
  largura: 1280,
  altura: 960,
}

// ---------------------------------------------------------------------------------------------
// Ramo de 9 a 17.
// ---------------------------------------------------------------------------------------------

export const PROFILE_LABELS_9A17: Record<DesafioProfile, string> = {
  A: 'Tempo de tela',
  B: 'A ideia de jogo',
  C: 'Personagens',
  D: 'Por dentro',
}

export const MARCAS_917 = {
  idade: { '9_12': 'entre 9 e 12 anos', '13_17': 'entre 13 e 17 anos' },
  tempo_tela: {
    menos_1: 'menos de 1 hora por dia',
    '1_2': 'de 1 a 2 horas por dia',
    '2_4': 'de 2 a 4 horas por dia',
    mais_4: 'mais de 4 horas por dia',
  },
} satisfies Record<string, Record<string, string>>

/** A cena de casa (P), como volta na carta: começa pelo verbo, o sujeito é "ele". */
export const CENA_917: Record<DesafioProfile, string> = {
  A: 'vive no jogo e no vídeo, e não faz nada com isso',
  B: 'inventa jogo o tempo todo, mas fica só na conversa',
  C: 'desenha personagem o tempo todo, e fica no papel',
  D: 'quer saber como os jogos são feitos, e você não sabe explicar',
}
/** A síntese (D), depois de "você quer". */
export const SINTESE_917: Record<DesafioProfile, string> = {
  A: 'que o tempo de tela sirva para alguma coisa',
  B: 'que as ideias de jogo dele saiam do papel',
  C: 'que os personagens dele ganhem vida na tela',
  D: 'que ele entenda como a tecnologia funciona por dentro',
}
/** A cena desejada (N), depois de "gostaria de ver". */
export const DESEJO_917: Record<DesafioProfile, string> = {
  A: 'ele chamando você: olha o que eu fiz',
  B: 'um amigo jogando um jogo que ele fez',
  C: 'ele escolhendo o personagem e o cenário do próprio jogo',
  D: 'ele explicando como o jogo funciona por dentro',
}

export const TITLES_917: Record<DesafioProfile, string> = {
  A: 'O tempo que seu filho passa no jogo pode virar um jogo feito por ele',
  B: 'As ideias de jogo do seu filho já existem. Falta a primeira sair do papel',
  C: 'Seu filho já cria personagens. O próximo passo é colocar um personagem para andar num jogo dele',
  D: 'Seu filho quer saber como os jogos funcionam. Montar um é o jeito mais direto de descobrir',
}
export const CLOSE_917: Record<DesafioProfile, string> = {
  A: 'Isso acontece em muitas casas, e tem uma explicação simples.',
  B: 'Isso é comum em quem gosta de criar, e tem uma explicação simples.',
  C: 'Isso é comum em quem gosta de desenhar, e tem uma explicação simples.',
  D: 'Essa curiosidade tem uma resposta simples.',
}

export const WHY_HEADING_917: Record<DesafioProfile, string> = {
  A: 'Por que tanto tempo de jogo não vira nada feito por ele',
  B: 'Por que as ideias ficam na conversa',
  C: 'Por que os personagens ficam no papel',
  D: 'Por que a curiosidade fica sem resposta',
}
export const WHY_START =
  'Num jogo pronto, alguém já decidiu tudo: o que o personagem faz, onde fica a chave, quando a fase acaba.'
export const WHY_917: Record<DesafioProfile, string> = {
  A: 'Ele joga muito bem o que outra pessoa decidiu, mas não chega a decidir nada. Por isso o tempo passa e, no fim do dia, não sobra nada que ele tenha feito.',
  B: 'Ele conhece isso de cor. Para a ideia dele virar jogo, falta o passo do meio: transformar a ideia em regras que o computador entende, como "quando o personagem encostar na chave, ela some e o jogo guarda que a chave foi pega".',
  C: 'Ele já cria o personagem no papel. O que falta é o passo seguinte: colocar um personagem dentro de um jogo e decidir o que o personagem faz quando a pessoa aperta uma tecla.',
  D: 'Por fora, ninguém vê essas decisões. Elas são regras, e regras dá para montar, testar e mudar. Quem monta uma vez entende como o jogo funciona por dentro.',
}
/** O que acontece quando ele tenta e não dá certo (I): a implicação, sem conta nem medo. */
export const TRAVA: Record<string, string> = {
  desiste: `Você disse que, quando algo não dá certo, ${m('ele desiste e volta para o jogo')}. Sem um próximo passo claro, desistir é o caminho mais curto.`,
  chama: `Você disse que, quando algo não dá certo, ${m('ele chama você, e você não sabe ajudar')}. Sem alguém que mostre o passo do meio, cada tentativa para no mesmo lugar.`,
  copia: `Você disse que, quando algo não dá certo, ${m('ele procura um vídeo e copia sem entender')}. Copiar faz funcionar uma vez, mas não mostra por que funcionou.`,
  insiste: `Você disse que, quando algo não dá certo, ${m('ele tenta de outro jeito até dar certo')}. Essa insistência é exatamente o que um primeiro jogo pede.`,
  nao_vi: '',
}

export const CHANGE_HEADING_917: Record<DesafioProfile, string> = {
  A: 'O que muda quando ele decide as regras',
  B: 'O que muda quando ele monta as regras',
  C: 'O que muda quando o personagem entra no jogo',
  D: 'O que muda quando ele monta um jogo por dentro',
}
export const CHANGE_START =
  'O primeiro jogo precisa ser pequeno de propósito, com começo, meio e fim. Ele monta as regras com blocos de encaixar, testa e vê na hora se o jogo faz o que ele imaginou.'
export const CHANGE_917: Record<DesafioProfile, string> = {
  A: 'O tempo na tela continua, mas agora sai dele alguma coisa que ele fez e pode mostrar.',
  B: 'A ideia sai da conversa e vira uma regra que funciona.',
  C: 'No primeiro jogo, ele escolhe o personagem e o cenário entre os do jogo. Desenhar os próprios personagens fica para depois.',
  D: 'Cada bloco é uma decisão que ele vê funcionar, e a lógica é a mesma do código.',
}
export const HELP_917 =
  'Quando trava, o vídeo está do lado dos blocos, e o botão Verificar esta parte mostra o que já está certo e o que falta.'
/** A cena desejada volta no fim do "o que muda" (quando ela não abriu a carta). */
export const WISH_917: Record<DesafioProfile, string> = {
  A: `A cena que você quer ver, ${m(DESEJO_917.A)}, é onde isso termina: um jogo pronto, feito por ele.`,
  B: `A cena que você quer ver, ${m(DESEJO_917.B)}, é onde isso termina: o jogo publicado, com um link que abre no celular.`,
  C: `A cena que você quer ver, ${m(DESEJO_917.C)}, faz parte do fim: o jogo fica com a cara dele.`,
  D: `A cena que você quer ver, ${m(DESEJO_917.D)}, vem de montar cada regra e testar.`,
}

export const WHERE_917 =
  'No Desafio do Primeiro Jogo, ele faz A Chave do Farol: o personagem anda, pega a chave e acende o farol. São 3 etapas, com 30 dias para fazer no ritmo dele. No fim, ele escolhe o personagem, o cenário e onde a chave fica escondida, e o jogo fica com a cara dele.'
export const LEGENDA_917 = 'A Chave do Farol, o jogo que ele monta'

/** O relato de cada perfil: o André (já jogava um monte) no A e no D; o Rafael no B e no C. */
export const RELATO_917: Record<DesafioProfile, { id: 'AV02' | 'AV04'; intro: string }> = {
  A: {
    id: 'AV04',
    intro:
      'O André, nosso filho, fez o Desafio do Primeiro Jogo na edição anterior e contou assim:',
  },
  B: {
    id: 'AV02',
    intro: 'O Rafael fez o Desafio do Primeiro Jogo na edição anterior e contou assim:',
  },
  C: {
    id: 'AV02',
    intro: 'O Rafael fez o Desafio do Primeiro Jogo na edição anterior e contou assim:',
  },
  D: {
    id: 'AV04',
    intro:
      'O André, nosso filho, fez o Desafio do Primeiro Jogo na edição anterior e contou assim:',
  },
}

export const NEED_917: Record<string, string> = {
  sozinho: `Você quer que ${m('ele consiga fazer sozinho')}. Quem já lê sozinho consegue: o vídeo fica do lado dos blocos, e o botão Verificar esta parte mostra o que falta.`,
  ajuda: `Você quer ${m('ter ajuda quando ele travar')}. Em cada parte da aula, o botão Verificar esta parte mostra o que falta, e o vídeo fica do lado dos blocos.`,
  acompanhar: `Você quer ${m('conseguir acompanhar de longe')}. Na Área dos pais, você vê o que ele fez na semana.`,
  tempo_tela: `Você quer que ${m('caiba no tempo de tela que vocês combinaram')}. O projeto fica guardado na conta dele: ele para quando o tempo acaba e continua no outro dia, do mesmo ponto.`,
  orcamento: ORCAMENTO,
  ao_vivo: `Você disse que precisa de ${m('professor ao vivo')}. As aulas são gravadas, com o vídeo do lado dos blocos, e não há aula ao vivo. Vale conferir na próxima página se esse formato serve para vocês.`,
}
export const COMPUTADOR_917: Record<string, string> = {
  so_dele: '',
  dividido: `E o computador ${m('é dividido em casa')}: o projeto fica guardado na conta dele, então ele para num dia e continua no outro, do mesmo ponto.`,
  celular_tablet: `E você disse que ${m('só tem celular ou tablet')}. Para montar o jogo, precisa de computador com mouse e teclado; depois de publicado, o jogo abre no celular.`,
  verificar: `E você ${m('ainda vai ver o computador')}: para montar, precisa de um com mouse e teclado.`,
}

export const CTA_TEXT_917 =
  'Na próxima página, você vê o jogo, as 3 etapas, como você acompanha pela Área dos pais e o que acontece depois dos 30 dias.'
export const CTA_LABEL_917: Record<DesafioProfile, string> = {
  A: 'Ver como ele faz o primeiro jogo',
  B: 'Ver como a ideia vira jogo',
  C: 'Ver como ele monta o jogo',
  D: 'Ver o jogo por dentro',
}
export const UNMET_917: Record<Condition, string> = {
  computador: 'o computador de que ele precisa',
  formato: 'o formato das aulas',
}

// ---------------------------------------------------------------------------------------------
// Ramo menor de 9 (criar junto).
// ---------------------------------------------------------------------------------------------

export const PROFILE_LABELS_M9: Record<M9Profile, string> = {
  A: 'Menor de 9 · Um tempo a dois',
  B: 'Menor de 9 · As ideias dele',
  D: 'Menor de 9 · A curiosidade',
}

export const MARCAS_M9 = {
  m9_leitura: {
    nao: 'ainda não lê',
    comecando: 'está começando a ler',
    prefere: 'lê, mas prefere que você leia',
    sozinho: 'já lê sozinho',
  },
  m9_tempo_juntos: {
    uma: 'uma vez por semana, um pouquinho',
    duas_tres: 'duas ou três vezes por semana',
    mais: 'várias vezes por semana',
  },
} satisfies Record<string, Record<string, string>>

export const CENA_M9: Record<M9Profile, string> = {
  A: 'só fica no joguinho pronto do tablet',
  B: 'inventa brincadeira e personagem o tempo todo',
  D: 'quer saber como tudo funciona e apertar tudo',
}
export const SINTESE_M9: Record<M9Profile, string> = {
  A: 'um tempo de tela que seja de vocês dois',
  B: 'ver as ideias dele virando jogo',
  D: 'que ele entenda como as coisas funcionam',
}
/** A cena desejada; a dos avós (`A2`) tem frase própria. */
export const DESEJO_M9: Record<string, string> = {
  A: 'ele chamando você para ver o que vocês fizeram',
  B: 'o personagem que ele escolheu andando na tela',
  D: 'ele explicando o que cada bloco faz',
  A2: 'os avós jogando um jogo de vocês',
}

export const TITLES_M9: Record<M9Profile, string> = {
  A: 'A tela pode virar um tempo de vocês dois',
  B: 'As brincadeiras que seu filho inventa podem virar o primeiro jogo de vocês',
  D: 'Seu filho quer apertar tudo para ver o que acontece. Num jogo montado por vocês, cada bloco mostra isso',
}
export const CLOSE_M9 =
  'Nessa idade a imaginação está a toda, e dá para aproveitar isso de um jeito novo.'

export const WHY_HEADING_M9: Record<M9Profile, string> = {
  A: 'Por que a tela ainda não é um tempo de vocês',
  B: 'Por que, na tela, ele só joga o que está pronto',
  D: 'Por que a curiosidade dele fica sem resposta na tela',
}
export const WHY_M9: Record<M9Profile, string> = {
  A: 'No tablet, os joguinhos já vêm decididos: ele aperta, e o jogo faz o resto. Cada um fica na sua tela, e o tempo passa sem nada que vocês tenham feito juntos.',
  B: 'Fora da tela, ele inventa o personagem, a regra e o fim da história. No tablet, os joguinhos já vêm decididos: ele só aperta. Falta um lugar onde a ideia dele mande no que acontece, com você do lado para ler e ajudar com o mouse.',
  D: 'Ele quer apertar tudo para ver o que acontece, mas os joguinhos prontos escondem o porquê. Falta um lugar onde cada botão mostre o que faz, com você do lado para ler e ajudar com o mouse.',
}
export const IRMAO = `Você contou também que ${m('ele quer fazer o que o irmão mais velho faz')}. Montar um jogo com você do lado é um jeito de ele fazer o mesmo, no tamanho dele.`

export const CHANGE_HEADING_M9: Record<M9Profile, string> = {
  A: 'O que muda quando vocês montam juntos',
  B: 'O que muda quando a brincadeira vira jogo',
  D: 'O que muda quando ele vê o que cada bloco faz',
}
export const CHANGE_START_M9 = 'Ele decide, e vocês montam.'
export const LEITURA_M9: Record<string, string> = {
  nao: 'Como ele ainda não lê, você lê as instruções em voz alta, ou aperta Ouvir e o Zappy lê as falas.',
  comecando:
    'Como ele está começando a ler, você lê as instruções em voz alta, ou aperta Ouvir e o Zappy lê as falas.',
  prefere:
    'Como ele prefere que você leia, as instruções ficam com você, ou você aperta Ouvir e o Zappy lê as falas.',
  sozinho:
    'Ele já lê sozinho, então pode ir lendo as instruções, e você fica do lado para ajudar com o mouse.',
}
export const CHANGE_M9: Record<M9Profile, string> = {
  A: 'Ele vê na hora o que cada bloco faz. No fim, é um jogo de vocês dois.',
  B: 'Ele vê na hora o que cada bloco faz, e a brincadeira que ele inventa vira regra que funciona.',
  D: 'Ele vê na hora o que cada bloco faz: cada bloco mostra o que acontece quando ele aperta.',
}
export const WISH_M9: Record<string, string> = {
  A: `A cena que você quer ver, ${m(DESEJO_M9.A ?? '')}, é onde isso termina.`,
  B: `A cena que você quer ver, ${m(DESEJO_M9.B ?? '')}, é onde isso chega: na primeira etapa o personagem já anda com as setas, e no fim ele escolhe qual personagem vai ser.`,
  D: `A cena que você quer ver, ${m(DESEJO_M9.D ?? '')}, vem de montar e testar cada parte juntos.`,
  A2: `A cena que você quer ver, ${m(DESEJO_M9.A2 ?? '')}, é onde isso termina: no fim, vocês mostram o jogo para a família.`,
}

export const WHERE_M9 =
  'No Desafio do Primeiro Jogo, vocês fazem juntos A Chave do Farol: o personagem anda, pega a chave e acende o farol. São 3 etapas, com 30 dias para fazer no ritmo de vocês. Cada aula é dividida em partes curtas, e tudo fica salvo para continuar outro dia. No fim, vocês mostram o jogo para a família.'
export const LEGENDA_M9 = 'A Chave do Farol, o jogo que vocês montam juntos'
/** A Débora, filha dos fundadores: "aluna, 7 anos" (decisão da dona, 19/10/2026). */
export const RELATO_M9 = {
  intro: 'A Débora passou pelo Desafio do Primeiro Jogo com 7 anos e contou assim:',
  autor: 'Débora, aluna, 7 anos',
  foto: '/img/comunidade-dos-criadores/depo-debora-rosto.webp',
} as const

export const NEED_M9: Record<string, string> = {
  nao_programar: `Você quer ${m('não precisar saber programar')}. O vídeo mostra cada passo, e os blocos têm as palavras escritas: o seu papel é ler, perguntar e deixar ele escolher.`,
  curtas: `Você quer ${m('sessões curtas, que caibam no dia')}. Vocês param quando o tempo acaba e, no outro dia, continuam do mesmo ponto.`,
  ele_escolhe: `Você quer que ${m('ele escolha, e você só ajude')}. É assim que a sessão funciona: ele decide o personagem e o cenário, você lê e ajuda com o mouse.`,
  orcamento: ORCAMENTO,
  ao_vivo: `Você disse que precisa de ${m('professor ao vivo')}. As aulas são gravadas e não há aula ao vivo. Vale conferir na próxima página se esse formato serve para vocês.`,
}
export const COMPUTADOR_M9: Record<string, string> = {
  sim: '',
  organizar: `E o computador ${m('precisa de um horário combinado')}: como as aulas são gravadas, vocês escolhem a hora.`,
  celular_tablet: `E você disse que ${m('só tem celular ou tablet')}. Para montar o jogo, precisa de computador com mouse e teclado; depois de publicado, o jogo abre no celular e no tablet.`,
  verificar: `E você ${m('ainda vai ver o computador')}: para montar, precisa de um com mouse e teclado.`,
}
export const TEMPO_NAO_SEI = `Você disse que ${m('ainda não sabe quantas vezes vão conseguir sentar juntos')}: o projeto espera por vocês, e cada parte é curta.`

export const CTA_TEXT_M9 =
  'Na próxima página, você vê como é uma sessão de vocês, as 3 etapas e o que acontece depois dos 30 dias.'
export const CTA_LABEL_M9: Record<M9Profile, string> = {
  A: 'Ver como é uma sessão de vocês',
  B: 'Ver como criar o primeiro jogo de vocês',
  D: 'Ver como ele descobre o que cada bloco faz',
}
export const UNMET_M9: Record<Condition, string> = {
  computador: 'o computador de que vocês precisam',
  formato: 'o formato das aulas',
}
