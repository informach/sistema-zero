// Copy aprovada: docs/marketing/kids/comunidade-dos-criadores/copy/resultados-quiz.md
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
export const PRIMARY_COPY: Record<string, PrimaryCopy> = {
  A: {
    title: 'Aprender criando no tempo de tela combinado',
    sections: [
      {
        title: 'O que pesou na sugestão',
        paragraphs: [
          'Você quer incluir aprendizagem no tempo de tela que a família já permite. Um projeto pequeno pode dar um assunto concreto para acompanhar: o que seu filho escolheu fazer, o que experimentou e o que mudou.',
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
        title: 'Como isso se aproxima da criação no computador',
        paragraphs: [
          'Num jogo digital, a criança também pode montar uma regra, executar o projeto e observar seu efeito. A experiência no papel dá uma ideia do que procurar numa atividade guiada; a construção digital depende da orientação e das ferramentas.',
          'Na Comunidade, a aula e a área de criação ficam próximas durante as atividades integradas. Seu filho pode consultar um passo, tentar e rever. A família encontra registros e produções para acompanhar o percurso, junto da conversa sobre o que ele fez.',
          'Os horários e a duração continuam sendo combinados por vocês. Para as atividades digitais, será necessário reservar acesso ao computador dentro do tempo de tela permitido.',
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
          'Você procura um começo para a criação de jogos. Escolher uma regra pequena ajuda a sair de uma ideia grande, como “quero fazer um jogo”, para algo que dá para experimentar.',
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
        title: 'Como essa ideia ganha vida na Comunidade',
        paragraphs: [
          'No Estúdio, a criança monta comandos em blocos e testa o que acontece no jogo. As primeiras atividades usam elementos preparados e a orientação da aula. Isso permite começar pelas regras e acrescentar escolhas conforme entende a montagem.',
          'A demonstração mostra uma regra desligada e ligada. Compare o efeito no exemplo. É uma forma de conhecer o trabalho que acontece entre imaginar uma ação e fazê-la funcionar.',
          'A entrada é guiada. Depois de concluir o curso obrigatório e publicar o projeto exigido, a criança chega ao posto Construtor e libera o uso livre do Estúdio e do Pinta. Na próxima página, veja as atividades, os apoios e esse percurso.',
        ],
        cta: 'Ver como funciona a criação de jogos na Comunidade',
      },
    ],
  },
  C: {
    title: 'Do desenho a uma ideia de jogo',
    sections: [
      {
        title: 'O que pesou na sugestão',
        paragraphs: [
          'Você quer dar espaço ao desenho em novas criações. Uma possibilidade é imaginar o que um personagem faria se alguém pudesse interagir com ele. Vale conhecer o interesse do seu filho por essa passagem.',
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
        title: 'Como desenho e interação se encontram na Comunidade',
        paragraphs: [
          'O Pinta é o espaço para trabalhar criações visuais. No Estúdio, uma arte pode participar do projeto, junto das regras que fazem o jogo funcionar. A demonstração mostra as telas desse caminho.',
          'A criança começa com atividades guiadas de jogos. O Estúdio e o Pinta livres são liberados no posto Construtor, depois de concluir o curso obrigatório de entrada e publicar o projeto exigido. Uma foto do desenho não se transforma automaticamente num jogo: preparar a arte digital e montar a interação são partes da criação.',
          'Na próxima página, veja essa integração e o percurso para chegar ao uso livre.',
        ],
        cta: 'Ver como desenho e jogos se encontram na Comunidade',
      },
    ],
  },
  D: {
    title: 'Programação com um caminho para acompanhar',
    sections: [
      {
        title: 'O que pesou na sugestão',
        paragraphs: [
          'Você procura uma iniciação em programação com uma sequência para seguir. Um começo útil é conhecer o que está sendo praticado e relacionar a explicação a uma tentativa que seu filho consiga mostrar.',
        ],
      },
      {
        title: 'Experimentem em casa: instruções que outra pessoa consegue seguir',
        paragraphs: [
          'Pergunte qual mudança resolveu a diferença. Esse exercício oferece uma conversa sobre sequência e revisão. Ele não mede o nível de programação da criança nem comprova aprendizagem por si só.',
        ],
        steps: [
          'Desenhem uma grade de três por três casas e marquem uma partida e uma chegada. Usem uma tampinha como personagem.',
          'Seu filho escreve instruções para levar a tampinha até a chegada, uma por linha: “uma casa para a direita”, por exemplo.',
          'Você segue as instruções na ordem. Se a tampinha parar em outro lugar, escolham uma instrução para mudar e tentem novamente.',
        ],
      },
      {
        title: 'Como acompanhar esse começo na Comunidade',
        paragraphs: [
          'As aulas apresentam tarefas de criação de jogos, e o Estúdio permite montar e testar as regras. A Jornada organiza o percurso e as condições de liberação. Os registros ajudam a localizar as atividades e produções para conversar com seu filho.',
          'Conheça o conteúdo disponível e peça que ele mostre uma escolha que fez. Uma atividade marcada como concluída é um registro do percurso; a conversa e a prática ajudam a conhecer o que foi compreendido.',
          'Na próxima página, veja as aulas, as ferramentas e os apoios. Algumas etapas dependem de cursos ainda em preparação; o conteúdo futuro não deve ser tratado como disponível hoje.',
        ],
        cta: 'Conhecer o percurso de aprendizagem da Comunidade',
      },
    ],
  },
}

export const RESULT_COPY: Record<string, ResultSection[]> = {
  'Contexto: o que a criança já expressou': [
    {
      title: '',
      paragraphs: [
        'Você contou que ele já falou em fazer um jogo próprio.',
        'Você contou que ele já falou em criar desenhos ou personagens.',
        'Você contou que ele já falou em entender como se programa.',
        'Você também relatou vontade de fazer outro tipo de criação. Vale ouvir como ele descreveria essa ideia.',
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
        'Você contou que ele ainda não expressou vontade de criar algo assim. Apresente a atividade como um convite. Conhecer a reação dele é parte desse começo; participar precisa fazer sentido para ele também.',
      ],
    },
  ],
  'Contexto: ainda não sabe': [
    {
      title: '',
      paragraphs: [
        'Ainda falta conhecer o que ele gostaria de criar. A experiência abaixo pode abrir essa conversa. Ouça o que chamou a atenção e o que ele teria vontade de tentar de novo.',
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
        'Você prefere conhecer atividades antes de escolher uma prioridade. Comecem por um convite pequeno.',
        'Numa folha, escrevam três possibilidades: inventar uma regra de jogo, desenhar um personagem em dois momentos ou planejar um caminho por instruções. Seu filho escolhe uma e conta a primeira coisa que faria. Se nenhuma interessar, pergunte o que ele gostaria de criar.',
        'Essa conversa já oferece uma informação útil: uma ideia que ele quer experimentar ou um sinal de que vale procurar outro tema. Na demonstração abaixo, vocês podem conhecer como uma aula e a área de criação aparecem juntas na Comunidade.',
      ],
      cta: 'Conhecer a proposta da Comunidade',
    },
  ],
  'Quando a procura é outra': [
    {
      title: 'Vale começar pelo que vocês procuram',
      paragraphs: [
        'Você informou que seu objetivo não aparece entre as opções. Ainda precisamos conhecer melhor sua procura para indicar um caminho.',
        'Para organizar a procura, anote o que você espera de uma atividade. Depois, ouça o que seu filho gostaria de experimentar. Compare as duas ideias e escolham uma pergunta para levar a quem oferece o curso, como o conteúdo ensinado ou a ajuda disponível.',
        'A Comunidade trabalha com criação de jogos e expressão visual integrada a esses projetos. Você pode conhecer essa proposta e verificar o que ela oferece em relação ao seu objetivo.',
      ],
      cta: 'Conhecer a proposta e conferir o que ela oferece',
    },
  ],
  'Quando existe um segundo objetivo': [
    {
      title: '',
      paragraphs: [
        'Você também marcou {{objetivo_complementar}} como objetivo importante. Ele continua fazendo parte da escolha. A página seguinte apresenta os recursos da Comunidade a partir da prioridade que você escolheu explorar primeiro.',
      ],
    },
  ],
  'Apoio: costuma rever uma explicação': [
    {
      title: '',
      paragraphs: [
        'Você contou que ele costuma voltar a uma explicação. Ao conhecer uma atividade digital, mostre como localizar o trecho do passo, pausar e comparar com a própria montagem. Na Comunidade, ele pode rever a aula e enviar uma dúvida se ainda precisar de ajuda.',
      ],
    },
  ],
  'Apoio: costuma procurar uma pessoa': [
    {
      title: '',
      paragraphs: [
        'Você contou que ele costuma procurar uma pessoa. No começo, vale conhecer juntos como pedir ajuda. Na Comunidade, o botão “Preciso de ajuda” parte da seção da aula e a conversa continua nos Recados. Enquanto aguarda o retorno, ele pode rever o passo e guardar a dúvida para retomar depois.',
      ],
    },
  ],
  'Apoio: costuma experimentar alternativas': [
    {
      title: '',
      paragraphs: [
        'Você contou que ele costuma fazer tentativas. Convide-o a mudar uma parte de cada vez e observar a diferença. Numa atividade digital, pode comparar com a orientação e enviar uma pergunta quando as tentativas não esclarecem o que aconteceu.',
      ],
    },
  ],
  'Apoio: varia conforme a atividade': [
    {
      title: '',
      paragraphs: [
        'Você percebe que o apoio muda conforme a tarefa. Vale combinar mais de um caminho: tentar uma parte, consultar a explicação e pedir ajuda quando necessário. Na Comunidade, a aula pode ser revista e as dúvidas podem seguir pelos Recados.',
      ],
    },
  ],
  'Apoio: ainda falta observar': [
    {
      title: '',
      paragraphs: [
        'A primeira experiência pode ajudar a conhecer o apoio de que ele precisa. Observe se pede um exemplo, faz tentativas ou chama você. Use isso para organizar a companhia inicial e conhecer os caminhos de ajuda da atividade digital.',
      ],
    },
  ],
  'Dúvida principal: interesse': [
    {
      title: '',
      paragraphs: [
        'Convide seu filho a experimentar a ideia, deixando espaço para mudar o tema. Se inventar um personagem não o atrair, ele pode preferir modificar uma regra. A reação dele ajuda vocês a escolher o começo; não garante que toda atividade futura terá o mesmo interesse.',
      ],
    },
  ],
  'Dúvida principal: começo': [
    {
      title: '',
      paragraphs: [
        'Na Comunidade, a entrada é guiada: a aula apresenta uma tarefa e usa recursos preparados para aquela atividade. Ler e usar mouse e teclado são requisitos. Algumas crianças precisam de companhia no começo para conhecer os controles e aprender a acompanhar a orientação.',
      ],
    },
  ],
  'Dúvida principal: ajuda': [
    {
      title: '',
      paragraphs: [
        'Na seção da aula, a criança encontra o botão “Preciso de ajuda”. Contar o que tentou e o que aconteceu ajuda a situar a pergunta. A conversa segue nos Recados, com histórico para consultar. O retorno é por mensagens e pode exigir espera.',
      ],
    },
  ],
  'Dúvida principal: acompanhar a aprendizagem': [
    {
      title: '',
      paragraphs: [
        'Peça que ele mostre uma escolha, a tentativa e o resultado. Os registros da plataforma ajudam a localizar a atividade; a explicação dele acrescenta o que entendeu. Você pode participar dessa conversa e deixar a orientação de programação com as aulas e os canais de ajuda.',
      ],
    },
  ],
  'Dúvida principal: rotina': [
    {
      title: '',
      paragraphs: [
        'Escolham quando a atividade poderá acontecer dentro do tempo de tela combinado. As aulas gravadas permitem pausar e rever a explicação. O projeto salvo pode ser retomado, por isso vale conferir o salvamento antes de encerrar uma sessão no computador.',
      ],
    },
  ],
  'Dúvida principal: investimento': [
    {
      title: '',
      paragraphs: [
        'Na página da Comunidade, confira o valor total, o período de acesso e a renovação de cada plano. Mensal e anual incluem o mesmo conjunto de recursos, com liberações conforme a Jornada. Considere também a disponibilidade de computador e como a atividade caberia na rotina.',
      ],
    },
  ],
  'Formato: pode funcionar': [
    {
      title: '',
      paragraphs: [
        'As aulas gravadas permitem rever um trecho e fazer a tentativa no horário escolhido pela família. Quando a explicação não resolve, a criança pode pedir ajuda por mensagens. Nas primeiras atividades, vale conhecer esses caminhos juntos.',
      ],
    },
  ],
  'Formato: prefere ao vivo, mas considera outra possibilidade': [
    {
      title: '',
      paragraphs: [
        'Você costuma preferir aulas ao vivo e está considerando outra possibilidade. Nas aulas gravadas, seu filho pode pausar para fazer a tarefa e voltar ao mesmo trecho. O apoio por mensagens permite enviar a dúvida e consultar a conversa depois; ele não oferece a intervenção imediata de um professor durante a atividade.',
        'As telas da próxima página mostram a aula, a prática e o pedido de ajuda. Use essa demonstração para conhecer o formato e avaliar o apoio de que seu filho precisaria no começo.',
      ],
    },
  ],
  'Formato: quer conhecer melhor': [
    {
      title: '',
      paragraphs: [
        'Nas telas da próxima página, veja onde a criança acompanha a explicação, faz a tentativa e pede ajuda. A aula pode ser revista e a dúvida pode ser enviada por mensagem. Algumas crianças precisam de companhia inicial para conhecer esses caminhos. A demonstração ajuda a entender a organização; o uso é que permitirá observar como ela funciona para seu filho.',
      ],
    },
  ],
  'Formato: professor ao vivo indispensável': [
    {
      title: '',
      paragraphs: [
        'Você informou que ter um professor ao vivo durante a atividade é indispensável. A Comunidade oferece aulas gravadas e ajuda por mensagens, que pode exigir espera. Essa condição da sua procura não é atendida pelo formato disponível. A atividade sugerida pode ajudar na conversa em casa; considere essa diferença antes de contratar.',
      ],
    },
  ],
  'Equipamento: precisa organizar horários': [
    {
      title: '',
      paragraphs: [
        'Combinar o horário de uso do computador é um passo importante antes de contratar. Reservem um momento em que ele esteja disponível para acompanhar a orientação e fazer a tentativa.',
      ],
    },
  ],
  'Equipamento: só celular ou tablet': [
    {
      title: '',
      paragraphs: [
        'Para as atividades digitais da Comunidade, seu filho precisa de computador com internet, mouse e teclado. O celular permite responder ao quiz e conhecer as demonstrações, mas não atende ao requisito das ferramentas de criação. Organizar o acesso ao computador vem antes da contratação.',
      ],
    },
  ],
  'Equipamento: ainda precisa verificar': [
    {
      title: '',
      paragraphs: [
        'Confirme se seu filho poderá usar um computador com internet, mouse e teclado. Esse requisito precisa estar resolvido para realizar as atividades digitais da Comunidade.',
      ],
    },
  ],
  'Jogos: Roblox ou Minecraft indispensável': [
    {
      title: '',
      paragraphs: [
        'Você indicou uma ferramenta específica como condição para a escolha. A Comunidade trabalha com o Estúdio e outras ferramentas próprias. Não oferece um curso de Roblox ou Minecraft. Essa diferença precisa ser considerada antes da contratação.',
      ],
    },
  ],
  'Jogos: outra ferramenta específica': [
    {
      title: '',
      paragraphs: [
        'Você informou que precisa de uma ferramenta específica, mas ainda não sabemos qual. A Comunidade usa o Estúdio e outras ferramentas próprias. Confira a ferramenta e o conteúdo procurados na apresentação da oferta antes de concluir que a proposta atende a essa necessidade.',
      ],
    },
  ],
  'Jogos: precisa conversar com o filho': [
    {
      title: '',
      paragraphs: [
        'Vale conversar sobre o que o atrai: criar um jogo ou usar uma ferramenta específica. A Comunidade usa o Estúdio. Mostrar um exemplo pode ajudar a conhecer o interesse por essa possibilidade.',
      ],
    },
  ],
  'Desenho: precisa de uma atividade sem jogos': [
    {
      title: '',
      paragraphs: [
        'Você indicou que quer trabalhar desenho numa atividade que não envolva jogos. A Comunidade conecta a expressão visual à criação de jogos e começa por atividades guiadas nesse percurso. Essa proposta é diferente da condição que você indicou para o desenho.',
      ],
    },
  ],
  'Desenho: quer conhecer a integração': [
    {
      title: '',
      paragraphs: [
        'Veja as telas do Pinta e do caminho para trazer uma arte ao Estúdio. Conversem sobre o interesse em construir também as regras da interação. O uso livre dessas ferramentas depende das etapas da Jornada.',
      ],
    },
  ],
  'Para participar da Comunidade': [
    {
      title: '',
      paragraphs: [
        'Para participar das atividades digitais, a criança precisa ler e usar mouse e teclado num computador com internet. As aulas são gravadas e o apoio acontece por mensagens, com possível espera. O uso livre das ferramentas é liberado conforme o avanço na Jornada.',
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
