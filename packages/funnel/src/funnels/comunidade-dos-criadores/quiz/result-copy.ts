// Copy pública: docs/marketing/kids/comunidade-dos-criadores/copy/resultados-quiz.md
export interface ResultSection {
  title: string
  paragraphs: string[]
  steps?: string[]
  cta?: string
}
export interface PrimaryCopy {
  title: string
  sections: ResultSection[]
}
export const SECONDARY_CONTEXT: Record<string, string> = {
  A: 'Você também quer incluir aprendizagem no tempo de tela que já permite. Ao experimentar a ideia, peça que ele mostre o que fez e explique uma escolha. Essa conversa pode acompanhar o projeto dentro dos horários que vocês combinarem.',
  B: 'Criar os próprios jogos também é importante para você. Esse interesse pode aparecer numa primeira regra: imaginar o que o jogador fará e decidir o que deve acontecer em resposta. Vale ouvir qual ação seu filho teria vontade de inventar.',
  C: 'Você também quer dar espaço ao desenho. Um personagem que ele gosta de desenhar pode entrar na conversa: que aparência teria e o que faria na atividade? Assim, a expressão visual participa da ideia desde o começo.',
  /** O mesmo, para quem procura desenho SEM jogos: o personagem não precisa "fazer" nada. */
  C_SEM_JOGOS:
    'Você também quer dar espaço ao desenho. Um personagem que ele gosta de desenhar pode entrar na conversa: que aparência teria e que história contaria? Assim, a expressão visual participa da ideia desde o começo.',
  D: 'Você também procura uma sequência para ele começar a aprender programação. Ao conhecer uma atividade, observe como ela passa da explicação para uma tarefa e para o teste do resultado. Isso ajuda a acompanhar o que ele está praticando em cada etapa.',
}

export const COMMUNITY_INTRO = {
  title: 'Um lugar para seu filho aprender enquanto cria',
  paragraphs: [
    'A Comunidade dos Criadores é a plataforma por assinatura do Sistema Zero Kids para crianças e adolescentes de 9 a 14 anos. Aqui, seu filho acompanha aulas, cria jogos e pode preparar desenhos e personagens para usar nessas criações.',
    'A proposta reúne a orientação das aulas, as ferramentas para construir e um canal de mensagens para pedir ajuda. Seu filho encontra o próximo passo e os recursos para colocá-lo em prática dentro da mesma plataforma.',
    'Veja como esse começo se relaciona com o que você contou. As imagens a seguir são telas reais da plataforma e podem ser ampliadas.',
  ],
}

export const CHOOSING_ACTIVITY: Record<string, ResultSection> = {
  A: {
    title: 'Comece pelo que ele teria vontade de fazer',
    paragraphs: [
      'Para encaixar aprendizagem no tempo de tela, vale convidar seu filho a fazer algo que tenha sentido para ele. Pode ser inventar uma regra para um jogo ou imaginar uma ação para um personagem. A sua intenção de oferecer aprendizado e a curiosidade dele podem se encontrar nessa primeira escolha.',
      'Quando ele mostrar a tentativa, peça que explique uma mudança. A conversa deixa de depender só de “gostou da aula?” e passa a ter um exemplo diante de vocês.',
    ],
  },
  B: {
    title: 'Uma ideia que ele consiga colocar à prova',
    paragraphs: [
      'Se seu filho falar em criar um jogo inteiro, ajude a escolher uma parte: o que o personagem faria primeiro? Quando ele define essa ação, vocês já têm algo para desenhar, testar e conversar. O restante da ideia pode vir depois.',
      'Esse começo também permite ouvir se ele gosta da parte de inventar e ajustar as regras. Jogar e criar trazem experiências diferentes; vale conhecer o que ele tem vontade de experimentar.',
    ],
  },
  C: {
    title: 'Dê espaço para ele contar a ideia por trás do desenho',
    paragraphs: [
      'Escolha com seu filho um personagem ou cenário que ele goste de desenhar. Peça que conte o que acontece ali. Talvez a ideia seja uma cena, uma história ou algo que alguém possa controlar num jogo.',
      'Essa conversa ajuda a perceber qual uso ele gostaria de dar à criação. A passagem para jogos faz sentido quando ele também se interessa por inventar o que acontece com os personagens.',
    ],
  },
  D: {
    title: 'Um passo que ele faça, teste e consiga explicar',
    paragraphs: [
      'Ao conhecer uma atividade de programação, procure a ligação entre a explicação e o que seu filho faz com ela. Se ele monta um comando para mover um personagem, por exemplo, pode executar o projeto e conferir se o movimento aconteceu como imaginava.',
      'Você pode acompanhar pedindo que mostre essa relação. Uma mudança pequena, explicada por ele, já dá um assunto concreto para conversar sobre o que está entendendo.',
    ],
  },
}

export const PRIMARY_COPY: Record<string, PrimaryCopy> = {
  A: {
    title: 'Aprender criando no tempo de tela combinado',
    sections: [
      {
        title: 'O que pesou na sugestão',
        paragraphs: [
          'Você quer que parte do tempo de tela que seu filho já tem também seja uma oportunidade de aprender. Um bom começo é uma atividade em que ele consiga mostrar o que fez: uma regra que montou, uma escolha que testou ou uma mudança no próprio projeto. Assim, você tem algo concreto para conhecer e conversar com ele.',
        ],
      },
      {
        title: 'Experimentem em casa: um personagem, uma regra',
        paragraphs: [
          'Pergunte: “O que mudou quando você trocou a regra?”. A ideia é conversar sobre uma escolha que ele acabou de fazer. Se não quiser participar agora, vocês podem retomar o convite em outro momento.',
        ],
        steps: [
          'Numa folha, seu filho desenha um caminho curto. Uma tampinha pode representar o personagem.',
          'Combinem uma regra: a cada palma, o personagem avança uma casa. Façam algumas tentativas.',
          'Deixe que ele altere a regra e mostre a diferença. Por exemplo: duas palmas fazem o personagem voltar uma casa.',
        ],
      },
      {
        title: 'Uma parte do tempo de tela pode virar uma criação para ele mostrar',
        paragraphs: [
          'Imagine seu filho acompanhando uma aula de criação de jogos. Ele vê como montar uma ação, faz a tentativa na área ao lado e executa o jogo para conferir o resultado. Se quiser mudar o que acontece, volta aos comandos e testa outra escolha. O tempo dessa atividade inclui observar, decidir e construir.',
          'Para você, isso abre uma conversa bem concreta: “Me mostra o que você mudou?”. Ele pode abrir o projeto e comparar as tentativas. A produção e a explicação dele ajudam a acompanhar o que está entendendo, além de saber que assistiu à aula.',
          'Na tela abaixo, repare como a aula e a atividade ficam próximas. Seu filho pode consultar a orientação durante a criação. Vocês continuam combinando os horários e a duração do uso do computador dentro do tempo de tela que já permitem.',
        ],
        cta: 'Ver a proposta para aprender criando no tempo de tela',
      },
    ],
  },
  B: {
    title: 'Uma ideia de jogo que cabe numa primeira tentativa',
    sections: [
      {
        title: 'O que pesou na sugestão',
        paragraphs: [
          'Você quer encontrar um começo para seu filho criar os próprios jogos. Para sair da ideia e chegar a algo que ele consiga testar, vale começar por uma ação pequena: fazer um personagem aparecer, abrir uma passagem ou mudar o que acontece ao tocar num objeto. Cada tentativa dá uma parte do jogo para ele entender e construir.',
        ],
      },
      {
        title: 'Experimentem em casa: inventem uma regra de jogo',
        paragraphs: [
          'Pergunte qual versão ele prefere e por quê. A escolha dá um começo à conversa sobre construir jogos. Gostar de jogar e querer criar podem caminhar juntos; o convite ajuda a conhecer se essa segunda possibilidade interessa a ele.',
        ],
        steps: [
          'Numa folha, desenhem um caminho, a chegada e um obstáculo. Usem uma tampinha como personagem.',
          'Seu filho escolhe o que acontece ao encontrar o obstáculo: voltar uma casa, perder a vez ou tentar outro caminho.',
          'Joguem uma rodada. Depois, ele muda essa regra e vocês jogam de novo para comparar.',
        ],
      },
      {
        title: 'Ele monta uma regra e vê o que muda no jogo',
        paragraphs: [
          'O Estúdio é a ferramenta de criação de jogos da Comunidade. Seu filho monta comandos em blocos, que representam ações e regras, e executa o projeto para ver o resultado. As atividades iniciais trazem elementos preparados e a orientação da aula. Ele começa com uma tarefa definida e pode entender uma parte de cada vez.',
          'Nas duas telas abaixo, um experimento de uma aula mostra essa ideia. Com a reação desligada, tocar no arbusto deixa tudo como estava. Com a reação ligada, o arbusto some e o coelho aparece. Uma mudança na regra produz uma diferença que seu filho consegue observar e explicar.',
          'É essa ligação entre escolha e efeito que dá conteúdo à criação: ele pensa no que quer que aconteça, monta a regra e confere se funcionou. A aula oferece o passo; a tentativa mostra o que ele fez com aquela orientação.',
        ],
        cta: 'Ver como meu filho pode começar a criar jogos',
      },
    ],
  },
  C: {
    title: 'Do desenho a uma ideia de jogo',
    sections: [
      {
        title: 'O que pesou na sugestão',
        paragraphs: [
          'Você quer dar mais espaço aos desenhos e personagens nas criações do seu filho. Uma possibilidade é partir de uma ideia que ele gosta de desenhar e imaginar o que ela faria num jogo. O personagem pode encontrar uma chave, abrir uma porta ou mudar de aparência. A criação ganha também uma ação para ele planejar.',
        ],
      },
      {
        title: 'Experimentem em casa: um personagem em dois momentos',
        paragraphs: [
          'Conversem sobre a parte de que ele mais gostou: imaginar a aparência, a história ou a ação. A resposta ajuda a perceber se ele quer explorar também a interação. Não é necessário avaliar a qualidade do desenho.',
        ],
        steps: [
          'Seu filho escolhe um personagem que já desenhou ou faz um esboço simples.',
          'Em dois quadros no papel, mostra esse personagem antes e depois de alguma coisa acontecer. Por exemplo: encontra uma chave e abre uma porta.',
          'Pergunte o que o jogador faria para provocar essa mudança: apertar uma tecla, tocar num objeto ou fazer uma escolha.',
        ],
      },
      {
        title: 'O personagem que ele desenha pode entrar no jogo que ele cria',
        paragraphs: [
          'O Pinta é o editor de desenhos da Comunidade. Nele, seu filho pode trabalhar as cores, as formas e os detalhes de uma criação digital. O Estúdio é a ferramenta em que ele monta as regras dos jogos. As duas ferramentas se conectam: uma arte preparada no Pinta pode ser trazida para um projeto no Estúdio.',
          'Nas telas abaixo, acompanhe o cavaleiro: primeiro ele aparece no Pinta, depois é escolhido na janela “Trazer do Pinta” e passa a fazer parte dos materiais do jogo. A partir daí, preparar uma ação para esse personagem envolve montar e testar as regras no Estúdio.',
          'Isso dá um uso concreto ao desenho e abre outra possibilidade para a criatividade dele. Vale mostrar esse caminho ao seu filho e ouvir se a parte de inventar a interação também o interessa. A entrada na Comunidade acontece por atividades guiadas de jogos; o uso livre do Pinta e do Estúdio é liberado depois de concluir o curso obrigatório e publicar o projeto exigido, no posto Construtor.',
        ],
        cta: 'Ver como os desenhos dele podem participar de jogos',
      },
    ],
  },
  D: {
    title: 'Programação com um caminho para acompanhar',
    sections: [
      {
        title: 'O que pesou na sugestão',
        paragraphs: [
          'Você procura uma forma de seu filho começar a aprender programação com uma sequência para seguir. Um começo concreto é montar uma instrução e observar o efeito dela: o que faz o personagem se mover, o que acontece ao apertar uma tecla e o que muda quando ele altera um comando. Assim, a explicação fica ligada a algo que ele consegue testar.',
        ],
      },
      {
        title: 'Experimentem em casa: instruções que outra pessoa consegue seguir',
        paragraphs: [
          'Depois, peça que ele mostre qual instrução mudou e o que aconteceu com a tampinha. Essa conversa ajuda a aproximar a palavra “programação” de uma ação que vocês acabaram de experimentar: escrever um passo, testar e ajustar.',
        ],
        steps: [
          'Desenhem uma grade de três por três casas e marquem uma partida e uma chegada. Usem uma tampinha como personagem.',
          'Seu filho escreve instruções para levar a tampinha até a chegada, uma por linha: “uma casa para a direita”, por exemplo.',
          'Você segue as instruções na ordem. Se a tampinha parar em outro lugar, escolham uma instrução para mudar e tentem novamente.',
        ],
      },
      {
        title: 'Cada etapa dá algo para seu filho fazer e explicar',
        paragraphs: [
          'Na Comunidade, seu filho aprende a montar regras de jogos no Estúdio, a ferramenta de criação da plataforma. Ele acompanha a explicação, monta os comandos e executa o projeto. Se a ação saiu diferente do que esperava, pode comparar com o passo da aula e rever a montagem. Programar começa a fazer sentido pelo que ele vê acontecer.',
          'A Jornada do Criador organiza esse percurso e mostra quais etapas e liberações vêm a seguir. Isso ajuda seu filho a localizar o próximo passo e ajuda você a conhecer o caminho que ele está percorrendo. Nas telas abaixo, você pode ver a Jornada e um exemplo de atividade.',
          'Para acompanhar, peça que ele mostre uma regra e conte o que acontece quando ela muda. Essa conversa permite conhecer o que ele entendeu por trás da atividade concluída. Ao olhar a Jornada, confira também os postos marcados como em construção: eles indicam etapas futuras, não conteúdo disponível hoje.',
        ],
        cta: 'Ver o caminho para meu filho começar a programar',
      },
    ],
  },
}

export const ACTIVITY_VARIANTS = {
  adolescente: {
    A: {
      title: 'Para conversar em casa: uma ideia que ele gostaria de criar',
      steps: [
        'Peça que seu filho escolha algo que conhece bem: um jogo, um personagem ou um assunto que acompanha em vídeos.',
        'Numa folha, ele esboça uma criação a partir dessa referência. Pode ser uma cena de jogo ou um personagem com uma ação, como abrir uma passagem ao encontrar uma chave.',
        'Ele mostra o esboço e escolhe uma parte que teria vontade de aprender a construir no computador.',
      ],
      paragraphs: [
        'Pergunte o que ele precisaria descobrir para fazer essa parte funcionar. A ideia é sair de um assunto que já o interessa e chegar a uma pergunta que ele queira investigar. Se a proposta não o atrair, ouça qual criação faria mais sentido para ele.',
      ],
    },
    B: {
      title: 'Para experimentar: mudar uma regra de um jogo que ele conhece',
      steps: [
        'Seu filho escolhe uma situação de um jogo conhecido e explica como ela funciona.',
        'Ele muda uma única regra no papel. Por exemplo: o personagem só pode abrir uma porta depois de encontrar dois objetos.',
        'Vocês imaginam duas jogadas: uma em que ele já encontrou os objetos e outra em que ainda falta um. Seu filho descreve o que deve acontecer em cada caso.',
      ],
      paragraphs: [
        'Peça que ele conte por que escolheu essa mudança e o que ela acrescentaria ao jogo. Essa é uma parte concreta do trabalho de criar: decidir uma regra e prever como o jogo deve responder.',
      ],
    },
    C: {
      title: 'Para experimentar: um personagem em duas versões',
      steps: [
        'Seu filho escolhe um personagem próprio ou faz um esboço de uma ideia nova.',
        'Ele desenha duas versões para situações diferentes. Por exemplo: preparado para explorar uma floresta e depois de encontrar um objeto misterioso.',
        'Ele explica o que mudou na aparência e imagina uma ação que provocaria essa mudança se o personagem estivesse num jogo.',
      ],
      paragraphs: [
        'Conversem sobre a parte que mais deu vontade de desenvolver: o visual, a história ou a ação. Deixe que ele mostre o motivo das escolhas. A resposta ajuda a descobrir se também gostaria de construir a interação.',
      ],
    },
    D: {
      title: 'Para experimentar: planejar uma regra antes de programar',
      steps: [
        'Seu filho escolhe uma ação simples, como abrir uma porta quando o personagem encontra uma chave.',
        'Ele escreve o que precisa acontecer primeiro e qual deve ser a resposta em cada situação: com a chave, sem a chave ou depois de a porta já estar aberta.',
        'Você propõe uma dessas situações, e ele confere se as instruções escritas explicam o que fazer. Se faltar um caso, ele ajusta a regra.',
      ],
      paragraphs: [
        'Pergunte o que ele precisou acrescentar depois do teste. Assim, vocês conversam sobre uma parte da programação antes de abrir um editor: organizar o que deve acontecer e conferir se a regra cobre as situações do projeto.',
      ],
    },
  },
  projetoExistente: {
    title: 'Partam de uma ideia que ele já tentou construir',
    steps: [
      'Peça que seu filho mostre uma tentativa de jogo que já fez. Se o projeto não estiver disponível, ele pode desenhar como a ideia deveria funcionar.',
      'Ele escolhe uma ação que gostaria de mudar ou entender melhor: o movimento, a reação a um toque ou a chegada a um objetivo.',
      'Peça que conte o que espera que aconteça e o que já tentou. Se puder testar no projeto, comparem o resultado; caso contrário, registrem a regra no papel.',
    ],
    paragraphs: [
      'Essa conversa valoriza o que ele já experimentou e ajuda a localizar uma dúvida de verdade. Você pode perguntar: “Qual parte você gostaria de aprender a fazer agora?”. Ter tentado criar um jogo dá um ponto de partida para a conversa; seguir uma orientação passo a passo continua importante.',
    ],
  },
  desenhoSemJogos: {
    title: 'Para experimentar: uma nova versão de um desenho dele',
    steps: [
      'Seu filho escolhe um desenho que já fez ou esboça uma ideia que esteja com vontade de desenhar.',
      'Ele escolhe um detalhe para explorar: a expressão do personagem, as cores ou o lugar em que a cena acontece.',
      'Depois de fazer uma nova versão, ele coloca as duas lado a lado e conta qual prefere e o que quis mudar.',
    ],
    paragraphs: [
      'Pergunte qual outra mudança ele teria vontade de experimentar. Vocês podem conhecer o interesse em continuar desenhando pelo que ele escolhe fazer e explicar, respeitando a procura de vocês por uma atividade de desenho.',
    ],
  },
}

export const RESULT_COPY: Record<string, ResultSection[]> = {
  'Contexto: o que a criança já expressou': [
    {
      title: '',
      paragraphs: [
        'Como ele já falou em fazer um jogo próprio, você pode partir de uma ideia dele: peça que conte o que o jogador faria primeiro. Isso ajuda a escolher uma pequena ação para experimentar.',
        'Ele já falou em criar desenhos ou personagens. Convide-o a mostrar uma ideia que tenha em mente e contar o que mais gostaria de desenvolver nela: a aparência, a história ou alguma ação.',
        'Ele já falou em entender programação. Você pode perguntar o que gostaria de fazer funcionar no computador. Uma ação escolhida por ele dá um exemplo concreto para começar a conhecer os comandos.',
        'Ele também demonstrou vontade de fazer outro tipo de criação. Peça que descreva a ideia com as palavras dele, para vocês considerarem esse interesse ao escolher uma atividade.',
      ],
    },
  ],
  'Contexto: jogos e desenho': [
    {
      title: '',
      paragraphs: [
        'Você contou que ele já falou em criar jogos e desenhos. Um personagem próprio pode ligar esses interesses: ele escolhe a aparência e imagina uma ação para colocar no jogo.',
      ],
    },
  ],
  'Contexto: jogos e programação': [
    {
      title: '',
      paragraphs: [
        'Você contou que ele já falou em criar jogos e entender programação. Uma regra de jogo pode ligar essas vontades: pensar no que deve acontecer e investigar como construir esse efeito.',
      ],
    },
  ],
  'Contexto: desenho e programação': [
    {
      title: '',
      paragraphs: [
        'Você contou que ele já falou em desenhar e entender programação. Imaginar uma interação para um personagem oferece uma forma de conversar sobre os dois interesses.',
      ],
    },
  ],
  'Contexto: os três interesses': [
    {
      title: '',
      paragraphs: [
        'Você contou que ele já falou em jogos, desenho e programação. Uma criação pode reunir essas possibilidades. Para começar, escolham juntos uma parte pequena: a aparência do personagem, uma ação ou a regra que faz essa ação acontecer.',
      ],
    },
  ],
  'Contexto: ainda não expressou vontade de criar': [
    {
      title: '',
      paragraphs: [
        'Ele ainda não falou em criar algo assim. Por isso, vale apresentar a ideia como um convite: “Você teria vontade de inventar uma parte de um jogo ou desenhar um personagem seu?”. Ouça também se ele preferir outro tipo de criação. O que você procura para ele pode abrir a conversa, e a resposta dele ajuda a escolher como continuar.',
      ],
    },
  ],
  'Contexto: ainda não sabe': [
    {
      title: '',
      paragraphs: [
        'Para conhecer o que ele gostaria de criar, você pode mostrar as possibilidades e ouvir qual dá vontade de experimentar. A ideia abaixo oferece um começo para essa conversa. Se ele propuser outro tema, use a sugestão dele como referência.',
      ],
    },
  ],
  'Contexto: já tentou criar um jogo': [
    {
      title: '',
      paragraphs: [
        'Você observou tentativas de criar ou modificar um jogo. Se ele já tiver um projeto, pode usá-lo como assunto: peça que escolha uma regra que gostaria de mudar e explique o efeito esperado. Isso evita começar de uma tarefa que ele já conhece.',
      ],
    },
  ],
  'Dois objetivos com o mesmo peso': [
    {
      title: 'Um começo que reúna os dois objetivos',
      paragraphs: [
        'Você indicou dois objetivos e preferiu mantê-los com o mesmo peso. A sugestão combina essas prioridades numa primeira experiência. Depois, vocês podem conhecer o que deu vontade de continuar.',
      ],
    },
    {
      title: 'Aprendizagem no tempo de tela e criação de jogos',
      paragraphs: [
        'Inventar uma regra de jogo pode reunir as duas procuras. Seu filho experimenta uma ideia própria e você ganha um assunto para acompanhar: o que ele mudou e o que aconteceu depois.',
      ],
    },
    {
      title: 'Aprendizagem no tempo de tela e desenho',
      paragraphs: [
        'Um personagem em dois momentos permite começar pelo desenho e conversar sobre uma escolha. Vocês podem conhecer o interesse em levar essa ideia para uma atividade digital dentro do tempo de tela combinado.',
      ],
    },
    {
      title: 'Aprendizagem no tempo de tela e formação tecnológica',
      paragraphs: [
        'Uma sequência de instruções dá um primeiro assunto para acompanhar o aprendizado. Depois da tentativa, conversem sobre a mudança que fez o personagem chegar ao lugar esperado.',
      ],
    },
    {
      title: 'Criação de jogos e desenho',
      paragraphs: [
        'Um personagem em dois momentos liga a criação visual à ideia de interação. Vocês podem começar pela aparência e conversar sobre o que o jogador faria para provocar uma mudança.',
      ],
    },
    {
      title: 'Criação de jogos e formação tecnológica',
      paragraphs: [
        'Inventar e alterar uma regra permite conversar sobre a ideia do jogo e sobre seu funcionamento. Na experiência digital, vale conhecer tanto o projeto quanto a sequência de orientação para construí-lo.',
      ],
    },
    {
      title: 'Desenho e formação tecnológica',
      paragraphs: [
        'Um personagem em dois momentos aproxima uma escolha visual de uma sequência de ações. A conversa ajuda a conhecer o interesse em programar a interação, além de preparar a imagem.',
      ],
      cta: 'Conhecer a proposta completa da Comunidade',
    },
  ],
  'Procura ainda aberta': [
    {
      title: 'Primeiro, conheçam o que dá vontade de criar',
      paragraphs: [
        'Você quer conhecer as possibilidades antes de escolher uma atividade. Podemos começar por uma conversa em casa: entre inventar um jogo, desenhar um personagem e descobrir como uma regra funciona, o que daria vontade de experimentar?',
        'Apresente essas ideias ao seu filho e peça que escolha uma parte que gostaria de fazer. Pode ser desenhar a cena de um jogo, inventar uma ação para um personagem ou explicar como seria uma regra. Uma folha já permite registrar essa primeira ideia.',
        'Depois, pergunte o que ele teria vontade de aprender para continuar. Se nenhuma dessas possibilidades chamar a atenção, ouça qual tema ele escolheria. Você já sai dessa conversa com uma referência mais concreta para procurar a atividade.',
      ],
      cta: 'Conhecer a proposta da Comunidade',
    },
  ],
  'Quando a procura é outra': [
    {
      title: 'Vale começar pelo que vocês procuram',
      paragraphs: [
        'O que você procura para seu filho ficou fora das opções apresentadas. Então vale começar dando nome a esse desejo, antes de tentar encaixar a família numa das sugestões do quiz.',
        'Anote uma cena que você gostaria de ver acontecendo: seu filho mostrando uma criação, explicando algo que aprendeu ou se dedicando a uma atividade que escolheu. Depois, pergunte o que ele gostaria de experimentar e compare as duas ideias.',
        'A partir daí, vocês podem escolher uma pergunta para levar a quem oferece a atividade: o que ele vai fazer, que orientação terá ou como você poderá acompanhar. Essas respostas ajudam a comparar as opções com o que importa para vocês.',
      ],
      cta: 'Conhecer a proposta e conferir o que ela oferece',
    },
  ],
  'Apoio: costuma rever uma explicação': [
    {
      title: 'A explicação fica disponível para a próxima tentativa',
      paragraphs: [
        'Você contou que seu filho costuma voltar a uma explicação quando encontra dificuldade. Na Comunidade, ele pode localizar o trecho da aula, pausar e comparar o exemplo com o que montou. Por exemplo: conferir onde colocou um bloco antes de executar o jogo outra vez. Rever ganha uma finalidade concreta: descobrir qual parte da montagem precisa de atenção.',
      ],
    },
  ],
  'Apoio: costuma procurar uma pessoa': [
    {
      title: 'Seu filho tem um caminho para pedir ajuda',
      paragraphs: [
        'Quando seu filho chama alguém porque travou, ajuda ter um próximo passo combinado. Nas primeiras aulas, sente com ele para encontrar o botão de ajuda e escrever uma pergunta. Você pode pedir que mostre onde parou e o que esperava que acontecesse.',
        'Seu papel nessa hora pode ser ajudá-lo a contar a dúvida. A orientação sobre a atividade segue pelo canal da plataforma. Assim, vocês sabem a quem recorrer quando a dificuldade passa do que conseguem esclarecer juntos.',
      ],
    },
  ],
  'Apoio: costuma experimentar alternativas': [
    {
      title: 'As tentativas podem ajudar seu filho a encontrar a dúvida',
      paragraphs: [
        'Você contou que seu filho costuma experimentar alternativas. No Estúdio, ele pode mudar uma parte dos comandos, executar o jogo e comparar o efeito. Oriente-o a mexer numa coisa de cada vez: fica mais fácil perceber qual alteração produziu a diferença e o que ainda precisa entender.',
      ],
    },
  ],
  'Apoio: varia conforme a atividade': [
    {
      title: 'Ele pode rever, tentar e pedir ajuda conforme a tarefa',
      paragraphs: [
        'Você percebe que seu filho procura apoios diferentes conforme a atividade. Ele pode rever a demonstração quando esqueceu um passo, testar uma mudança quando tem uma ideia e enviar uma pergunta quando continua em dúvida. No começo, conhecer esses caminhos juntos ajuda a escolher o que fazer em cada situação.',
      ],
    },
  ],
  'Apoio: ainda falta observar': [
    {
      title: 'As primeiras tentativas ajudam a conhecer o apoio de que ele precisa',
      paragraphs: [
        'Você ainda não observou como seu filho reage a uma dificuldade no computador. Na primeira atividade, acompanhe um trecho: ele encontra o botão de pausa, consegue seguir a orientação ou chama você? Você pode mostrar esses controles e observar o que ele já faz por conta própria. Essa experiência ajuda a combinar sua presença nas próximas tentativas.',
      ],
    },
  ],
  'Dúvida principal: interesse': [
    {
      title: 'Um começo que permita ouvir o que ele quer criar',
      paragraphs: [
        'Sua principal dúvida é se a atividade vai despertar o interesse do seu filho. A ideia para experimentar em casa ajuda a abrir essa conversa: observe se ele quer mudar a regra, inventar outra ação ou desenhar o personagem. Pergunte o que gostaria de tentar depois e mostre as imagens da plataforma para ouvir a opinião dele.',
        'Na Comunidade, essa vontade encontra aulas e ferramentas para virar uma tentativa concreta. Ele pode conhecer um exemplo, seguir a tarefa e, conforme aprende e libera recursos, fazer novas escolhas nos projetos. A vontade de voltar à atividade precisa ser observada no uso; as respostas do quiz ajudam a escolher por onde convidá-lo.',
      ],
    },
  ],
  'Dúvida principal: interesse (desenho sem jogos)': [
    {
      title: 'Um começo que permita ouvir o que ele quer criar',
      paragraphs: [
        'Sua principal dúvida é se a atividade vai despertar o interesse do seu filho. A ideia para experimentar em casa ajuda a abrir essa conversa: observe se ele quer mudar a aparência do personagem, contar outra parte da história ou desenhar uma nova versão. Pergunte o que gostaria de tentar depois e mostre as imagens da plataforma para ouvir a opinião dele.',
        'Na Comunidade, o desenho entra nos projetos de jogos, e a diferença em relação ao que vocês procuram está explicada nesta página. A vontade de voltar à atividade precisa ser observada no uso; as respostas do quiz ajudam a escolher por onde convidá-lo.',
      ],
    },
  ],
  'Dúvida principal: começo': [
    {
      title: 'Seu filho encontra uma tarefa e a orientação para começar',
      paragraphs: [
        'Você quer entender como seu filho vai dar os primeiros passos. Nas atividades iniciais da Comunidade, a aula apresenta o que fazer e traz recursos preparados para aquela tarefa. Ele acompanha um trecho, realiza a ação e testa o resultado. Isso dá um ponto de partida antes de criar projetos livres.',
        'No início, sua companhia pode ajudar em ações como encontrar a aula, pausar o vídeo e usar os controles. Observe o que ele já consegue fazer e ajude no que ainda é novidade. Para acompanhar as atividades, ele precisa ler e usar mouse e teclado; o conteúdo de programação é apresentado ao longo das aulas.',
      ],
    },
  ],
  'Dúvida principal: ajuda': [
    {
      title: 'Quando a explicação ainda deixa uma dúvida',
      paragraphs: [
        'Na própria seção da aula, seu filho encontra o botão “Preciso de ajuda”. Ele pode escrever, por exemplo: “Coloquei o bloco como no vídeo, mas o personagem não apareceu”. Contar o que tentou e o que viu ajuda a equipe a entender o problema junto do contexto daquela atividade.',
        'A conversa continua nos Recados, a área de mensagens da plataforma. Ali ficam a pergunta, a resposta e o caminho de volta à aula. Seu filho pode consultar a orientação recebida e testar novamente. O retorno acontece por mensagens e pode exigir espera; enquanto isso, ele pode rever o trecho ou guardar a dúvida para retomar depois.',
      ],
    },
  ],
  'Dúvida principal: acompanhar a aprendizagem': [
    {
      title: 'Você pode acompanhar pelo que ele cria e consegue explicar',
      paragraphs: [
        'Você quer acompanhar o que seu filho está aprendendo. Quando ele vier mostrar uma criação, peça que execute uma parte e explique a escolha: “O que você fez para esse personagem aparecer?”. Ele pode mostrar o comando, testar e contar o que mudou desde a primeira tentativa.',
        'Essa conversa dá um jeito de participar do aprendizado com interesse pelo que ele fez e pelas escolhas que quer mostrar. As aulas e os canais de ajuda oferecem a orientação para construir, enquanto vocês compartilham as descobertas da atividade.',
        'Na Área dos pais, você encontra o progresso e informações sobre a participação dele. Use esses registros para puxar uma conversa específica: qual atividade ele fez, o que achou difícil e o que gostaria de tentar depois. Ver uma aula concluída ajuda a localizar o percurso; ouvir a explicação dele acrescenta o que compreendeu.',
      ],
    },
  ],
  'Dúvida principal: rotina': [
    {
      title: 'A atividade pode acompanhar os horários que vocês combinarem',
      paragraphs: [
        'Você quer entender onde essa atividade caberia na rotina. Pense num horário em que seu filho já pode usar o computador: uma parte desse tempo pode ser reservada para abrir a aula e experimentar um passo. Como as aulas são gravadas, vocês escolhem quando começar dentro do período de acesso.',
        'Quando chegar a hora de encerrar, ele pode pausar a explicação e conferir se o projeto ficou salvo. Antes de sair, peça que conte o que quer tentar na próxima vez. Esse pequeno combinado deixa um ponto de retomada, em vez de ter de decidir tudo de novo a cada dia.',
        'A tela abaixo mostra as criações e o aviso de salvamento. Se outras pessoas usam o mesmo computador, combine também quando ele estará livre para a próxima atividade. A rotina precisa caber nos horários da casa e no tempo de tela que vocês permitem.',
      ],
    },
  ],
  'Dúvida principal: investimento': [
    {
      title: 'O valor precisa fazer sentido junto com o uso que vocês planejam',
      paragraphs: [
        'Você quer avaliar o investimento junto com as outras escolhas da família. A assinatura reúne os cursos incluídos, as ferramentas de criação e os canais de ajuda. O valor desse conjunto aparece numa situação simples: seu filho encontra o que fazer, abre a atividade, constrói uma parte e tem onde pedir orientação para continuar.',
        'Antes de decidir, pense também no uso que vocês conseguiriam organizar: quando o computador estaria disponível e por qual criação ele gostaria de começar. Essa conversa ajuda a comparar o que a plataforma oferece com o espaço que a atividade teria na rotina de vocês.',
        'Na próxima página, confira os valores e as condições de pagamento, acesso, renovação e cancelamento. Os planos mensal e anual incluem o mesmo conjunto de recursos; as ferramentas para criar livremente são liberadas conforme ele avança na Jornada.',
      ],
    },
  ],
  'Formato: pode funcionar': [
    {
      title: 'Ele pode pausar a explicação para colocar o passo em prática',
      paragraphs: [
        'Você considera aulas gravadas com ajuda por mensagens. Na Comunidade, seu filho pode assistir ao passo, pausar o vídeo e realizar a tarefa ao lado. Se esquecer uma ação, volta ao trecho e compara com a própria montagem antes de seguir.',
        'Essa pausa permite dar à tentativa o tempo de que ele precisa naquele momento. E, como a explicação fica disponível durante o acesso, vocês escolhem quando fazer a atividade dentro dos combinados da família. Na imagem abaixo, veja o vídeo pausado junto da prática.',
      ],
    },
  ],
  'Formato: prefere ao vivo, mas considera outra possibilidade': [
    {
      title: 'A orientação pode acompanhar o tempo da tentativa dele',
      paragraphs: [
        'Você prefere aulas ao vivo, mas está aberto a conhecer outra forma de acompanhamento. Aqui, seu filho assiste à explicação gravada e faz a atividade na mesma tela. Pode pausar enquanto monta os comandos e repetir só o trecho que precisa conferir.',
        'A vantagem aparece durante a tarefa: se ele leva mais tempo para testar uma ideia, a explicação espera. Se quer rever um passo, pode voltar a ele. A família também escolhe o horário de acesso. Já a ajuda da equipe acontece por mensagens, com possível espera pela resposta; não há um professor ao vivo durante a atividade.',
      ],
    },
  ],
  'Formato: quer conhecer melhor': [
    {
      title: 'Veja como seu filho acompanha uma aula, passo a passo',
      paragraphs: [
        'Você ainda está conhecendo as formas de acompanhamento. Imagine seu filho numa das atividades integradas da Comunidade: de um lado, ele assiste à explicação; do outro, encontra a área para fazer a tarefa. Depois de ver um passo, pausa o vídeo e tenta realizar a ação.',
        'Se ficou em dúvida sobre onde colocar um comando, volta ao trecho, confere o exemplo e testa de novo. Isso permite consultar a orientação justamente enquanto está criando. A explicação pode acompanhar várias tentativas, no horário de estudo que vocês combinarem.',
        'Na tela abaixo, o vídeo está pausado junto da atividade. Nas primeiras aulas, você pode mostrar ao seu filho como usar a pausa e voltar ao trecho desejado. Depois, observe quais ações ele já consegue fazer e em quais ainda pede companhia. A seguir, veja também o caminho para enviar uma dúvida.',
      ],
    },
  ],
  'Formato: professor ao vivo indispensável': [
    {
      title: 'Você procura um professor presente durante a atividade',
      paragraphs: [
        'Você informou que ter um professor ao vivo durante a atividade é indispensável. Na Comunidade, seu filho acompanha aulas gravadas, e a ajuda da equipe acontece por mensagens. A resposta pode levar um tempo; não há um professor numa chamada acompanhando cada tentativa.',
        'Por isso, o formato atual não atende a essa condição que você indicou. As telas permitem conhecer como a proposta funciona, mas essa diferença precisa orientar sua escolha antes de contratar.',
      ],
    },
  ],
  'Equipamento: precisa organizar horários': [
    {
      title: 'Vale reservar um horário no computador que vocês compartilham',
      paragraphs: [
        'Você contou que há um computador, mas precisa organizar os horários de uso. Para criar aqui, seu filho usará o navegador, a internet, o mouse e o teclado. Ele precisa ter esse equipamento disponível tanto para acompanhar a explicação quanto para fazer a atividade.',
        'Como as aulas são gravadas, vocês podem escolher um horário em que o computador esteja livre. Combine esse momento com ele e com quem também usa o aparelho. Assim, a proposta já entra numa rotina possível para a família.',
      ],
    },
  ],
  'Equipamento: só celular ou tablet': [
    {
      title: 'Para criar na plataforma, ele precisará de um computador',
      paragraphs: [
        'Você contou que, por enquanto, seu filho tem acesso a celular ou tablet. Para as atividades de criação da Comunidade, ele precisa de um computador com internet, mouse e teclado. É nele que vai usar os controles dos editores e montar os projetos.',
        'Você pode conhecer as telas e ler a proposta pelo celular. Para seu filho realizar as atividades, porém, será preciso organizar o acesso ao computador antes de contratar. Pode ser um aparelho compartilhado, desde que esteja disponível no horário combinado.',
      ],
    },
  ],
  'Equipamento: ainda precisa verificar': [
    {
      title: 'Confira em qual computador ele poderá fazer as atividades',
      paragraphs: [
        'Você ainda vai verificar o acesso ao computador. Pense no aparelho que seu filho poderia usar para acompanhar a aula e criar: ele precisa ter internet, mouse e teclado. O computador pode ser compartilhado com a família.',
        'Além de encontrar o aparelho, vale combinar quando ele estará disponível. Esse cuidado ajuda a avaliar se a atividade cabe na rotina antes de contratar a assinatura.',
      ],
    },
  ],
  'Jogos: Roblox ou Minecraft indispensável': [
    {
      title: 'A ferramenta que vocês procuram faz diferença na escolha',
      paragraphs: [
        'Você indicou {{ferramenta}} como indispensável para a criação de jogos. A Comunidade ensina nas ferramentas próprias da plataforma, como o Estúdio, em que seu filho monta comandos em blocos e testa o efeito no jogo. Ela não oferece um curso de Roblox ou Minecraft.',
        'Se a vontade dele está ligada especificamente à ferramenta escolhida, essa diferença importa: criar no Estúdio é outra experiência. Você pode mostrar as telas a ele para conhecer a proposta, preservando o que vocês consideram necessário para escolher.',
      ],
    },
  ],
  'Jogos: outra ferramenta específica': [
    {
      title: 'Confira qual ferramenta seu filho quer usar',
      paragraphs: [
        'Você disse que uma ferramenta específica é importante, mas o quiz ainda não sabe qual é. A Comunidade usa o Estúdio, sua própria ferramenta para montar e testar jogos, junto dos outros recursos da plataforma.',
        'Antes de escolher, compare a ferramenta e o conteúdo que vocês procuram com os que aparecem na apresentação. Seu filho pode se interessar pela criação mostrada aqui, mas isso precisa ser conversado se ele espera aprender em outro programa.',
      ],
    },
  ],
  'Jogos: precisa conversar com o filho': [
    {
      title: 'Mostre um exemplo e ouça o que ele quer criar',
      paragraphs: [
        'Você quer conversar com seu filho antes de decidir sobre a ferramenta. Mostre o exemplo do Estúdio e pergunte o que chama a atenção dele: inventar as regras, escolher um personagem ou criar dentro de um jogo que já conhece.',
        'Essa conversa ajuda a distinguir duas vontades que podem ser diferentes: criar um jogo e usar uma ferramenta específica. Aqui, ele cria no Estúdio. Conhecer uma tela do que fará é uma forma concreta de conversar sobre essa possibilidade.',
      ],
    },
  ],
  'Desenho: precisa de uma atividade sem jogos': [
    {
      title: 'Vocês procuram desenho como uma atividade própria',
      paragraphs: [
        'Você indicou que quer uma atividade de desenho que não envolva jogos. Na Comunidade, o desenho se conecta à criação de jogos: seu filho pode preparar uma arte no Pinta e usá-la num projeto no Estúdio. O percurso começa com atividades guiadas de jogos.',
        'Por isso, essa proposta é diferente da condição que você escolheu. O uso livre do Pinta vem depois das etapas de entrada; a assinatura não deve ser escolhida como uma entrada imediata para um curso só de desenho.',
      ],
    },
  ],
  'Desenho: quer conhecer a integração': [
    {
      title: 'Acompanhe o caminho do desenho até o jogo',
      paragraphs: [
        'Você quer entender como um desenho entra num jogo. O Pinta é o editor de desenhos da Comunidade, e o Estúdio é onde seu filho monta as regras do jogo. Nas telas, acompanhe o cavaleiro: ele é preparado no Pinta, escolhido na janela “Trazer do Pinta” e adicionado aos materiais do projeto no Estúdio.',
        'Seu filho pode usar a arte na criação e decidir o que acontece com ela. Por exemplo, montar uma regra para o personagem aparecer quando o jogador tocar num objeto. A imagem dá a aparência; os comandos definem a ação. Ele trabalha as duas partes para chegar à interação que imaginou.',
        'Mostre esse caminho a ele e ouça qual parte dá vontade de experimentar. O começo na Comunidade é guiado por aulas de jogos. Depois de concluir o curso obrigatório e publicar o projeto exigido, ele chega à etapa chamada Construtor e libera o uso livre do Pinta e do Estúdio.',
      ],
    },
  ],
  'Para participar da Comunidade': [
    {
      title: 'Veja as atividades e os planos para a família',
      paragraphs: [
        'Na próxima página, você encontra os cursos, os recursos da plataforma e as condições dos planos. Para acompanhar as atividades, seu filho precisa ler e usar mouse e teclado num computador com internet.',
        'Seu filho começa com as aulas guiadas, conhecendo os passos e os comandos da atividade. Ao concluir o curso de entrada obrigatório e publicar o projeto pedido nessa etapa, ele chega ao posto Construtor. Ali, libera o uso livre do Estúdio, o editor de jogos, e do Pinta, o editor de desenhos. Vocês podem conhecer tanto esse começo quanto o caminho para criar com mais liberdade.',
      ],
    },
  ],
  'Botão quando há uma condição não atendida': [
    {
      title: '',
      paragraphs: [],
      cta: 'Conhecer a proposta e conferir seus requisitos',
    },
  ],
  'Depois do resultado': [
    {
      title: '',
      paragraphs: ['Esta sugestão representa o que vocês procuram neste momento?'],
      cta: 'Responder pensando em outro filho',
    },
  ],
  'Se a sugestão representar apenas em parte ou não representar': [
    {
      title: '',
      paragraphs: ['O que você gostaria de ajustar?', 'Sua opinião foi registrada nesta resposta.'],
      cta: 'Voltar ao resultado',
    },
  ],
}
