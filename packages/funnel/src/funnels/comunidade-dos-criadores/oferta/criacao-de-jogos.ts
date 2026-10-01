import type { ComunidadePage } from './types'

// Texto integral da revisão de 01/10/2026 em docs/marketing/kids/comunidade-dos-criadores/copy/.
export const PAGE_B = {
  id: 'criacao-de-jogos',
  label: 'Criar os próprios jogos',
  seoTitle: 'Criar jogos para crianças | Comunidade dos Criadores | Sistema Zero',
  description:
    'Um caminho guiado para seu filho começar a criar jogos, testar regras e explorar ideias próprias, com ferramentas, projetos e ajuda na mesma plataforma.',
  emphasis: 'dar a eles o seu jeito',
  heroVisual: 'estudio',
  heroChip: 'Criar e testar',
  hero: {
    title: 'Seu filho aprende a criar jogos e dar a eles o seu jeito',
    description:
      'Com projetos guiados, explicações que pode rever e um lugar para testar cada construção, ele encontra por onde começar. Conforme avança, pode experimentar ideias próprias e convidar a família para jogar uma criação que leva as escolhas dele.',
    benefits: [
      'A montagem começa com ações explicadas passo a passo.',
      'Personagens prontos ajudam a concentrar a atenção nas regras.',
      'A Jornada organiza o avanço e a liberação das ferramentas.',
    ],
    requirements:
      'Para crianças de 9 a 14 anos. No navegador do computador, com internet, mouse e teclado.',
    primary: {
      label: 'Ver os planos para meu filho',
      href: '#planos',
    },
    secondary: {
      label: 'Conhecer o caminho da primeira construção',
      href: '#experiencia',
    },
  },
  sections: [
    {
      id: 'b02',
      title: 'Entre imaginar um jogo e fazê-lo funcionar, existe um primeiro passo',
      eyebrow: 'Da ideia à primeira tentativa',
      layout: 'story',
      visuals: ['aula'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Seu filho pode ter contado como seria a fase, o poder do personagem ou o desafio que colocaria no caminho. A ideia já tem graça para ele. Para construir, aparecem decisões que ainda precisa aprender a resolver: qual comando usar, onde encaixá-lo e como conferir se deu certo.',
            'Um começo orientado transforma parte dessa vontade em uma tarefa. Montar o movimento de um personagem, por exemplo. Primeiro ele conhece o comando; depois executa o jogo e observa o efeito. Já tem uma parte para testar enquanto aprende o que precisa para continuar.',
            'Se tentou um tutorial e travou, pode ter faltado uma explicação, um recurso ou uma sequência adequada ao que sabia. Na Comunidade, a orientação, as ferramentas da atividade e o caminho de ajuda fazem parte da mesma experiência.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'b03',
      title: 'A primeira versão tem orientação para sair do lugar',
      eyebrow: 'Um começo guiado',
      layout: 'story',
      visuals: ['aula-estudio', 'preparados'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Seu filho começa por um projeto guiado. A aula apresenta uma parte da montagem, mostra o comando e explica o que observar quando o jogo roda. Nas atividades integradas, a explicação fica junto do lugar de fazer.',
            'No Estúdio, ele usa blocos para construir as regras. Pode assistir a um passo, pausar o vídeo e executar aquela ação antes de continuar. Isso permite conferir a montagem enquanto a orientação ainda está à mão.',
            'Personagens, sons e outros elementos preparados ajudam a começar. Ao usar uma nave pronta, por exemplo, a criança pode se concentrar nas instruções que está aprendendo: mover, responder a uma ação ou interagir com outro objeto. A aparência é o ponto de partida; o trabalho envolve montar e testar o funcionamento.',
            'Conforme a aula, experimentos, perguntas e materiais de consulta ajudam a examinar o conceito. Nas atividades que permitem alterações, a criança pode observar o efeito de mudar um valor. A criação livre ganha espaço depois de cumprir os requisitos para liberar o Estúdio.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'b04',
      title: 'Uma mudança pequena dá uma decisão para ele explicar',
      eyebrow: 'Construir e compreender',
      layout: 'story',
      visuals: ['regra'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Imagine uma partida em que alcançar um objeto acrescenta um ponto ao placar. Ao mudar o valor daquela regra, o mesmo objeto passa a produzir outro resultado. Seu filho pode prever a diferença, jogar e comparar as versões.',
            'Para fazer a alteração com intenção, precisa relacionar o comando ao comportamento. A montagem guiada oferece uma referência; a mudança permite investigar uma escolha. Por isso, vale conhecer o que ele consegue explicar sobre o projeto, além de ver o jogo funcionando.',
            'Você pode pedir que mostre a regra e jogar as duas versões. Talvez ele prefira a primeira; talvez queira ajustar de novo. O teste ajuda a decidir com base no que aconteceu.',
            'Um resultado diferente do esperado também tem lugar nessa construção. A criança pode rever o trecho da aula, conferir os comandos e fazer outra tentativa. A ajuda por mensagens entra quando a dúvida continua, para que ela tenha um caminho além de adivinhar o próximo passo.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'b05',
      title: 'Aula, desenho, teste e ajuda acompanham a mesma criação',
      eyebrow: 'Tudo se conecta',
      layout: 'band',
      visuals: ['integracao'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Seu filho aprende uma regra na aula e testa no Estúdio. Quando quer uma aparência própria e tem acesso ao recurso, pode criar um personagem no Pinta e levá-lo ao jogo. Se ele ficar difícil de enxergar no cenário, volta à arte, ajusta a cor e confere a nova versão.',
            'Quando a dificuldade está numa atividade, o pedido de ajuda parte da seção correspondente. A conversa fica nos Recados. O projeto pode ser guardado na conta e, quando publicado, apresentado no Mural. A Jornada mostra o avanço, enquanto o responsável encontra registros e produções na área da família.',
            'Essa integração acompanha o trabalho real de criar: aprender uma parte, experimentar, corrigir e apresentar. A arte tem um destino no jogo; a explicação ajuda numa ação; a dúvida tem um lugar para ser enviada. É assim que os recursos se encontram em torno do projeto do seu filho.',
          ],
        },
      ],
      actions: [
        {
          label: 'Ver os planos para começar',
          href: '#planos',
        },
      ],
    },
    {
      id: 'b06',
      title: 'Ele pode tentar de novo no tempo de que precisa',
      eyebrow: 'No ritmo da criação',
      layout: 'story',
      visuals: ['pausa', 'recados'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Uma criança pode querer ver a demonstração inteira antes de tentar. Outra prefere parar em cada ação. As aulas gravadas permitem acompanhar desse jeito: pausar, fazer, voltar ao trecho e testar mais uma vez.',
            'A família escolhe o horário dentro do tempo de tela já permitido. Ao retornar em outro dia, o percurso registrado ajuda a localizar a atividade. As criações guardadas podem ser abertas para continuar durante o acesso; antes de sair, a criança confere o aviso de salvamento.',
            'Na seção da aula, “Preciso de ajuda” permite explicar onde travou. A conversa segue nos Recados, com histórico para rever a orientação. O apoio é assíncrono, por mensagens, e pode ser necessário aguardar uma resposta. A assinatura não inclui aulas ao vivo.',
            'Para dúvidas de uso, o Como fazer reúne tutoriais das ferramentas. Seu filho pode consultar uma ação e voltar à montagem. A criança precisa ler e usar mouse e teclado, e algumas precisam de companhia no começo para aprender a acompanhar a aula e usar esses apoios.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'b07',
      title: 'O visual do jogo também pode acompanhar as ideias dele',
      eyebrow: 'O visual também é dele',
      layout: 'story',
      visuals: ['pinta'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Seu filho pode começar com um personagem pronto e depois querer criar uma criatura que imaginou. No Pinta, encontra ferramentas para desenhar personagens, objetos e cenários digitais. Criações compatíveis podem entrar no Estúdio.',
            'A aparência passa pelo teste do jogo. Um personagem pequeno demais pode ser ajustado; uma cor que se confunde com o fundo pode mudar. As escolhas visuais participam da experiência de quem vai jogar.',
            'Também é possível combinar uma criação própria com elementos preparados. Saber desenhar é uma habilidade diferente de aprender a programar, e o jogo pode ser construído usando a arte disponível. O uso livre de Estúdio e Pinta chega no posto Construtor, após concluir o curso obrigatório de entrada e publicar o projeto exigido. Dentro das aulas, valem os recursos da atividade.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'b08',
      title: 'Depois da primeira versão, há ideias para continuar trabalhando',
      eyebrow: 'Jornada do Criador',
      layout: 'journey',
      visuals: ['jornada', 'pensa', 'zappy'],
      groups: [
        {
          title: null,
          paragraphs: [
            'A Jornada apresenta os requisitos de avanço e o próximo curso disponível. Nas ferramentas liberadas, seu filho pode voltar à própria criação: modificar uma regra, ajustar um personagem e testar outra versão.',
            'O remix, quando disponível, permite explorar e alterar uma base publicada compatível. Um desafio do mês para a etapa pode oferecer um tema para aplicar o que aprendeu. Esses caminhos dão novos usos aos recursos que já conhece.',
          ],
        },
        {
          title: 'A inteligência artificial ajuda a planejar e investigar',
          paragraphs: [
            'No posto Inventor, o Pensa ajuda a organizar uma ideia. Se seu filho quer fazer um jogo de um gato que recolhe estrelas, precisa decidir como o gato se move, o que o jogador deve conseguir e quando vence. A conversa ajuda a esclarecer essas escolhas e transformá-las em tarefas para construir.',
            'O Zappy oferece ajuda dentro do Estúdio. Ele pode considerar os comandos e o erro apresentado para explicar uma dificuldade e indicar o que conferir. Não altera o projeto: seu filho faz o ajuste e testa.',
            'Receber uma sugestão ainda exige uma decisão. Ela combina com a ideia? O resultado funcionou como esperado? A criança continua responsável pela criação e pela conferência. Pensa e Zappy dependem dos requisitos, da disponibilidade do serviço e dos créditos de uso da família.',
            'Mais adiante, o Molda abre possibilidades de criar elementos em três dimensões. A Comunidade está em lançamento, com cursos publicados e outras etapas em preparação. A assinatura inclui o que está publicado e o que for acrescentado durante o período contratado. Consultar o catálogo mostra o que já pode ser explorado hoje.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'b09',
      title: 'O jogo pode virar um convite para alguém jogar',
      eyebrow: 'Uma criação para mostrar',
      layout: 'story',
      visuals: ['mural', 'clube', 'publicacao'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Publicar uma criação permite apresentá-la no Mural e obter um link para compartilhar. Há também um cartão com código QR. Seu filho pode convidar alguém da família para jogar e mostrar como montou uma parte.',
            'Essa partida pode render uma conversa: uma regra ficou clara, uma fase pareceu difícil, uma ideia despertou curiosidade. A criança tem a oportunidade de explicar o que fez e considerar o que gostaria de mudar.',
            'No Clube, as conversas acontecem por publicações e respostas sobre projetos e ideias. Há combinados de convivência e um caminho para avisar a equipe quando algo precisa de atenção. Avatar, quarto e conquistas permitem personalizar o espaço e reconhecer a participação.',
            'O responsável administra a visibilidade do perfil, inicialmente desligada para colegas. Um jogo publicado por link é público e tem visibilidade própria. Esses dois controles precisam entrar nos combinados de compartilhamento da família.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'b10',
      title: 'Você conhece o aprendizado nas escolhas que ele mostra',
      eyebrow: 'Você acompanha',
      layout: 'story',
      visuals: ['responsavel', 'aprendizagem', 'perfis'],
      groups: [
        {
          title: null,
          paragraphs: [
            'O interesse por jogos dá um motivo para seu filho querer construir. Durante as atividades, ele encontra conceitos de programação ligados ao projeto: uma ação que responde a um evento, uma regra que depende de uma condição, uma instrução que se repete.',
            'No painel do responsável, você consulta cursos, atividades, temas explorados, entregas e a etapa da Jornada. Esses registros ajudam a escolher uma criação para conhecer. Ao pedir que ele explique uma regra e mostre o efeito, você tem outra referência sobre o que compreendeu.',
            'A orientação de programação fica nas aulas. Você pode participar da rotina, do começo e das conversas sobre os projetos. A assinatura permite até dois perfis, com progresso e trabalhos separados, para acompanhar irmãos com interesses e ritmos diferentes.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'b11',
      title: 'Uma experiência organizada para construir em casa',
      eyebrow: 'O valor do conjunto',
      layout: 'band',
      visuals: ['reunida'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Ferramentas gratuitas e tutoriais também oferecem caminhos para aprender. Ao comparar, vale olhar o que cada experiência reúne: atividade inicial, sequência, ferramentas, ajuda quando surge uma dificuldade e formas de acompanhar o trabalho.',
            'A Comunidade oferece seus próprios ambientes de criação, projetos guiados, Recados para pedir apoio e registros para a família. O conjunto dá continuidade à montagem: a criança encontra o que fazer, onde fazer e como consultar uma orientação para aquela experiência.',
            'Se o objetivo do seu filho é desenvolver especificamente no Roblox Studio, considere que as primeiras construções aqui acontecem no Estúdio da Comunidade, com blocos. Mostre a demonstração a ele: ver os comandos e o projeto ajuda vocês a reconhecer se é esse começo que ele quer experimentar.',
          ],
        },
      ],
      actions: [],
    },
  ],
  faqTitle: 'Mais sobre a experiência do seu filho',
  faqGroups: [
    {
      title: 'O começo da criação de jogos',
      questions: ['programacao', 'nivel', 'roblox', 'ajuda', 'desenho', 'liberacao'],
    },
    {
      title: 'Começo e aprendizagem',
      questions: [
        'aulas-gravadas',
        'pais',
        'aprendizagem',
        'interesse',
        'so-desenho',
        'papel',
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
    title: 'A próxima conversa sobre jogos pode incluir uma criação dele',
    eyebrow: 'Para começar juntos',
    layout: 'band',
    visuals: [],
    groups: [
      {
        title: null,
        paragraphs: [
          'Seu filho abre a partida e conta qual regra resolveu mudar. Você experimenta, faz uma pergunta e conhece uma escolha que antes existia só na ideia.',
          'A Comunidade oferece orientação, ferramentas e um percurso para ele começar a construir. Escolham o plano e conheçam juntos a primeira atividade. Se já começou pelo Desafio, ele pode continuar do ponto em que está.',
        ],
      },
    ],
    actions: [
      {
        label: 'Escolher um plano para meu filho criar',
        href: '#planos',
      },
    ],
  },
} satisfies ComunidadePage
