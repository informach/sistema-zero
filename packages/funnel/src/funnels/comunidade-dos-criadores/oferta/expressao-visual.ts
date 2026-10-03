import type { ComunidadePage } from './types'

// Texto integral da revisão de 01/10/2026 em docs/marketing/kids/comunidade-dos-criadores/copy/.
export const PAGE_C = {
  id: 'expressao-visual',
  label: 'Desenhar e criar personagens',
  seoTitle: 'Personagens e jogos | Comunidade dos Criadores | Sistema Zero',
  description:
    'Conheça o caminho entre desenho digital e criação de jogos para crianças de 9 a 14 anos, com ferramentas conectadas e orientação para construir interações.',
  emphasis: 'movimento e interação',
  heroVisual: 'pinta',
  heroChip: 'Desenhar e criar',
  hero: {
    title:
      'Os personagens que seu filho cria podem ganhar movimento e interação nos próprios jogos',
    description:
      'No Pinta, ele cria a aparência do personagem. No Estúdio, aprende as regras que fazem esse personagem participar de um jogo. As aulas orientam o começo, e a Jornada libera o uso livre das ferramentas conforme ele avança.',
    benefits: [
      'Cores, formas e personagens para experimentar na criação digital.',
      'Uma ligação entre o desenho e o que acontece no jogo.',
      'Explicações para pausar e rever enquanto aprende a construir.',
    ],
    requirements:
      'Para crianças de 9 a 14 anos. No navegador do computador, com internet, mouse e teclado. A experiência inclui aprender a construir regras de jogos.',
    primary: {
      label: 'Ver os planos para meu filho',
      href: '#planos',
    },
    secondary: {
      label: 'Conhecer o caminho do personagem ao jogo',
      href: '#experiencia',
    },
  },
  sections: [
    {
      id: 'c02',
      title: 'Você já conhece o cuidado que ele coloca num personagem',
      eyebrow: 'O interesse que ele já tem',
      layout: 'story',
      visuals: ['pinta-vetor'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Pode ser a escolha de uma cor, o formato dos olhos ou um detalhe que ele refaz até ficar do jeito que imaginou. Quando seu filho mostra um desenho, mostra também decisões que tomou para criá-lo.',
            'Em um projeto interativo, aparecem outras escolhas: como esse personagem vai se mover, o que acontece quando encontra um objeto e qual cenário combina com o jogo que ele quer construir.',
            'O interesse visual encontra uma possibilidade de uso. Seu filho pode experimentar a aparência durante a partida e voltar ao desenho para ajustar o que percebeu. Para quem gosta de inventar personagens e tem curiosidade sobre o que eles fazem, essa passagem oferece um motivo para aprender as regras que produzem a interação.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'c03',
      title: 'Do desenho à interação, cada parte tem um lugar',
      eyebrow: 'Da arte ao jogo',
      layout: 'story',
      visuals: ['integracao', 'aula'],
      groups: [
        {
          title: null,
          paragraphs: [
            'O Pinta reúne ferramentas de desenho digital. No Estúdio, a criança constrói e testa as regras do jogo. Uma arte compatível criada no Pinta pode ser levada ao Estúdio para participar do projeto.',
            'Imagine um personagem azul sobre um cenário também azul. Na partida, ele fica difícil de enxergar. Seu filho pode voltar ao desenho, experimentar outra cor e conferir como ficou no jogo. A escolha visual ganha um efeito que ele consegue observar.',
            'Para o personagem responder a uma tecla, entra outra parte da criação: a programação. A aula orienta a montagem com blocos, explica o comando e mostra o comportamento que deve ser observado. A criança pode pausar, realizar a ação e testar antes de seguir.',
            'Conforme a atividade, textos, imagens, áudio e materiais de consulta complementam a explicação. O apoio fica ligado à tarefa, para ajudar a localizar e compreender o passo que está sendo feito.',
          ],
        },
        {
          title: 'O começo também ensina a construir as interações',
          paragraphs: [
            'As primeiras aulas apresentam os comandos e os recursos da atividade. Depois de concluir o curso obrigatório de entrada e publicar o projeto exigido, seu filho chega ao posto Construtor e libera o uso livre de Estúdio e Pinta.',
            'A experiência combina criação visual e programação de jogos. Conhecer esse começo com a criança ajuda a perceber se ela tem vontade de explorar as duas partes. A Jornada mostra os requisitos e as ferramentas disponíveis em cada momento.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'c04',
      title: 'Há espaço para escolher a aparência e voltar a ela',
      eyebrow: 'Escolhas visuais',
      layout: 'story',
      visuals: ['animacao'],
      groups: [
        {
          title: null,
          paragraphs: [
            'No Pinta, seu filho encontra cores, formas, camadas e recursos para criar personagens, fundos e peças de cenário. Pode começar por uma forma simples e trabalhar detalhes conforme se familiariza com as ferramentas. Nas aulas, usa a seleção preparada para a atividade.',
            'As camadas permitem organizar partes da composição. As cores e formas podem ser ajustadas e comparadas. Quando o desenho participa do jogo, o teste oferece outra referência: o personagem aparece bem, tem o tamanho que a criança queria e combina com o cenário?',
            'Uma criação também pode ganhar quadros de animação. Mudar a posição de um braço entre imagens, por exemplo, permite experimentar o movimento visual. Fazer o personagem responder ao jogador exige construir as regras no Estúdio. A aparência e a interação se encontram no projeto, cada uma com seu trabalho.',
          ],
        },
        {
          title: 'O desenho do caderno pode ser o começo de uma ideia',
          paragraphs: [
            'Seu filho pode usar o que desenhou no papel como referência para uma versão digital. Fotografar o desenho, por si só, não monta um jogo. A criação envolve preparar a arte e programar o que ela vai fazer.',
            'Também é possível combinar elementos próprios com os preparados. Não é necessário chegar sabendo desenhar para participar da criação de jogos. Para quem já gosta de desenhar, o Pinta oferece um lugar para explorar esse interesse dentro dos projetos.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'c05',
      title: 'A programação pode ter um motivo que ele consegue enxergar',
      eyebrow: 'Uma ideia em movimento',
      layout: 'story',
      visuals: ['regra'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Seu filho quer que o personagem ande quando alguém aperta uma tecla. Para fazer isso, precisa conhecer o comando que responde àquela ação e definir o movimento. A regra tem uma função na ideia que ele está tentando realizar.',
            'A orientação inicial mostra como montar. O teste permite observar o efeito. Numa atividade que permita mudar a velocidade, ele pode comparar as versões e decidir qual combina com o jogo. A escolha visual passa a conviver com uma escolha de funcionamento.',
            'Você pode pedir que ele mostre as duas partes: o personagem que criou e a regra que faz alguma coisa acontecer. Essa conversa reconhece o cuidado com o desenho e dá espaço para conhecer o que aprendeu ao construir a interação.',
            'É importante que a criança tenha curiosidade de experimentar essa passagem. Se procura apenas desenhar, vale considerar que a Comunidade inclui programação no percurso desde o começo.',
          ],
        },
      ],
      actions: [
        {
          label: 'Ver os planos da Comunidade',
          href: '#planos',
        },
      ],
    },
    {
      id: 'c06',
      title: 'Desenhar, construir, guardar e mostrar fazem parte da mesma experiência',
      eyebrow: 'Tudo se conecta',
      layout: 'band',
      visuals: ['salvamento', 'reunida'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Uma criação pode passar pela aula, pelo Pinta e pelo Estúdio. O desenho tem um destino no projeto, e o teste pode levar de volta à arte para um ajuste. Seu filho trabalha em ferramentas conectadas por essa finalidade.',
            'Os trabalhos podem ser guardados na conta e encontrados nas galerias das ferramentas. Se surgir uma dúvida da atividade, o pedido de ajuda parte da seção correspondente e a conversa continua nos Recados. Quando publica o jogo, pode apresentá-lo no Mural e obter um link para compartilhar.',
            'Esse caminho dá continuidade ao esforço da criança. O personagem que levou tempo para desenhar pode participar de uma criação que alguém joga. A família encontra registros e produções para conhecer como o trabalho foi feito.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'c07',
      title: 'Experimentar uma cor ou uma regra pode levar mais de uma tentativa',
      eyebrow: 'Tempo para experimentar',
      layout: 'story',
      visuals: ['pausa', 'recados'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Ao desenhar, seu filho talvez queira testar duas cores antes de escolher. Ao montar uma regra, pode precisar rever onde um bloco foi colocado. A aula gravada permite pausar para executar a ação e voltar ao trecho necessário durante a construção.',
            'A família escolhe o horário dentro do tempo de tela combinado. A atividade pode continuar em outra sessão durante o acesso. Antes de fechar, a criança confere o aviso de salvamento para saber se o projeto ficou guardado na conta.',
            'O começo exige leitura e uso de mouse e teclado. Algumas crianças precisam de companhia para conhecer a dinâmica. Vocês podem acompanhar uma tarefa juntos e observar como ela usa a explicação antes de deixá-la seguir com mais independência.',
            'Se a dúvida permanecer, “Preciso de ajuda” dá acesso ao pedido ligado à aula. A conversa fica nos Recados, por mensagens assíncronas; pode ser necessário aguardar o retorno. O formato não inclui encontros ao vivo. Para dúvidas de uso das ferramentas, os tutoriais do Como fazer oferecem outra referência para consultar.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'c08',
      title: 'A família pode conhecer mais do que a imagem pronta',
      eyebrow: 'Você acompanha',
      layout: 'story',
      visuals: ['responsavel', 'aprendizagem', 'perfis'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Ao mostrar um personagem dentro do jogo, seu filho pode contar por que escolheu aquela cor, o que ajustou no tamanho e como montou um movimento. O resultado abre espaço para conhecer decisões que uma imagem isolada não mostra.',
            'No painel do responsável, você encontra atividades, temas explorados, entregas e a etapa da Jornada. Esses registros ajudam a localizar uma produção. Pedir que seu filho mostre uma alteração e explique o efeito acrescenta uma referência sobre o que compreendeu.',
            'A assinatura permite até dois perfis, com progresso e projetos separados. Um irmão pode se interessar mais pela criação visual; outro, pelas regras. As liberações seguem o percurso de cada criança, e você acompanha os dois na área da família.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'c09',
      title: 'Uma criação pode virar um convite para jogar',
      eyebrow: 'Uma criação para mostrar',
      layout: 'story',
      visuals: ['mural', 'clube', 'publicacao'],
      groups: [
        {
          title: null,
          paragraphs: [
            'O Mural reúne projetos publicados. Um jogo pode ganhar um link e um cartão com código QR para compartilhar. Seu filho tem uma forma de apresentar o personagem participando da partida, junto das escolhas que fez para ele.',
            'Ao jogar, alguém da família pode perceber um detalhe e perguntar como foi construído. A criança tem a oportunidade de explicar a arte e a interação. Essa conversa pode até trazer uma ideia para a próxima versão, que ela avalia e decide se quer experimentar.',
            'O Clube oferece publicações e respostas sobre criações, com combinados de convivência e um caminho para avisar a equipe quando algo precisa de atenção. O desafio do mês, quando disponível, propõe um tema; o remix liberado permite explorar uma base publicada compatível. Avatar, quarto e conquistas também dão espaço para personalização.',
            'O perfil começa com a visibilidade para colegas desligada, administrada pelo responsável. Jogos publicados por link têm visibilidade pública própria. Vocês podem combinar quais criações mostrar e para quem enviá-las.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'c10',
      title: 'O desenho abre espaço para planejar uma criação maior',
      eyebrow: 'Jornada do Criador',
      layout: 'journey',
      visuals: ['pensa', 'zappy', 'jornada'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Uma ideia visual pode trazer outras perguntas: o que esse personagem precisa conseguir, como o jogador vai controlá-lo e o que acontece ao terminar a fase? Responder ajuda a organizar a construção em partes que a criança consegue trabalhar.',
            'No posto Inventor, o Pensa oferece esse apoio. A conversa esclarece a ideia, organiza as escolhas e ajuda a transformá-las em tarefas para as ferramentas de criação. As decisões continuam com seu filho, inclusive quando ele escolhe entre sugestões.',
            'O Zappy, no Estúdio, ajuda a examinar dúvidas sobre comandos e dificuldades do projeto. Ele não altera os blocos. A criança faz o ajuste e testa o resultado, conferindo se a sugestão atende ao que queria construir. É assim que a inteligência artificial participa como ajuda durante o trabalho. Esses recursos dependem dos requisitos, da disponibilidade do serviço e dos créditos da família.',
            'Mais adiante, o Molda oferece possibilidades em três dimensões. A Comunidade está em lançamento, com etapas ainda em preparação. A assinatura inclui os cursos publicados e os acrescentados durante o período contratado. O catálogo disponível mostra o que pode ser explorado hoje; as próximas liberações dependem dos cursos e requisitos correspondentes.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'c11',
      title: 'A ligação entre arte e jogo dá um uso para cada ferramenta',
      eyebrow: 'Arte e criação de jogos',
      layout: 'band',
      visuals: ['estudio'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Há ferramentas gratuitas de desenho e de criação de jogos. Há também atividades dedicadas exclusivamente à formação artística. Vale comparar o que seu filho quer experimentar e qual orientação acompanha essa experiência.',
            'A Comunidade reúne desenho digital, aulas de criação de jogos, ferramentas para testar, ajuda por mensagens e acompanhamento familiar. Uma escolha feita na arte pode ser conferida no jogo e revista no desenho. A integração permite seguir esse caminho dentro da plataforma.',
            'Para a família, o benefício fica concreto quando conhece o personagem e depois joga a criação em que ele participa. Os planos abaixo oferecem a mesma experiência, com cobrança mensal ou acesso anual, respeitando o percurso de liberação das ferramentas.',
          ],
        },
      ],
      actions: [],
    },
  ],
  faqTitle: 'Mais sobre a experiência do seu filho',
  faqGroups: [
    {
      title: 'Do desenho à criação de jogos',
      questions: ['so-desenho', 'desenho', 'papel', 'programacao', 'liberacao', 'ajuda'],
    },
    {
      title: 'Começo e aprendizagem',
      questions: [
        'aulas-gravadas',
        'pais',
        'aprendizagem',
        'interesse',
        'nivel',
        'roblox',
        'apoio-especifico',
      ],
    },
    {
      title: 'Recursos e continuidade',
      questions: [
        'catalogo',
        'ia',
        'pensa',
        'zappy',
        'creditos',
        'planejamento',
        '3d',
        'codigo',
        'desafio',
        'certificado',
        'custos',
      ],
    },
    {
      title: 'Uso no dia a dia',
      questions: [
        'telas',
        'equipamento',
        'internet',
        'salvamento',
        'exportacao',
        'ferias',
        'pontos',
      ],
    },
    {
      title: 'Participação e família',
      questions: ['irmaos', 'perfil', 'jogos-publicos', 'convivencia', 'indicacao'],
    },
    {
      title: 'Conta e assinatura',
      questions: ['atendimento', 'senha', 'cancelamento', 'reembolso'],
    },
  ],
  closing: {
    id: 'convite',
    title: 'Aquele personagem pode ter uma história de criação para seu filho contar',
    eyebrow: 'Para começar juntos',
    layout: 'band',
    visuals: [],
    groups: [
      {
        title: null,
        paragraphs: [
          'Ele mostra o desenho, abre o jogo e explica o que acontece quando o personagem se move. Você reconhece uma escolha de cor, um detalhe da aparência ou uma ideia que ele já tinha comentado.',
          'A Comunidade reúne ferramentas e orientação para explorar esse encontro entre desenho e interatividade. Escolham o plano e conheçam juntos o começo do percurso.',
        ],
      },
    ],
    actions: [
      {
        label: 'Escolher um plano para explorar essas criações',
        href: '#planos',
      },
    ],
  },
} satisfies ComunidadePage
