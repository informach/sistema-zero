import type { ComunidadePage } from './types'

// Texto integral da revisão de 01/10/2026 em docs/marketing/kids/comunidade-dos-criadores/copy/.
export const PAGE_D = {
  id: 'formacao-tecnologica',
  label: 'Aprender programação',
  seoTitle: 'Programação por projetos | Comunidade dos Criadores | Sistema Zero',
  description:
    'Iniciação em programação por projetos de jogos, com explicação, prática, progressão e registros para a família acompanhar a experiência de crianças de 9 a 14 anos.',
  emphasis: 'nos jogos que seu filho constrói',
  heroVisual: 'aprendizagem',
  heroChip: 'Aprender na prática',
  hero: {
    title: 'Uma base de programação que aparece nos jogos que seu filho constrói',
    description:
      'Projetos guiados ligam os conceitos a ações que ele pode testar e explicar. Com orientação, ferramentas integradas e um percurso de atividades, você acompanha a formação nas criações e nas decisões que seu filho aprende a tomar.',
    benefits: [
      'Conceitos ligados ao funcionamento de um projeto.',
      'Explicações para pausar e consultar durante a prática.',
      'Etapas e registros para acompanhar o que foi realizado.',
    ],
    requirements:
      'Para crianças de 9 a 14 anos. No navegador do computador, com internet, mouse e teclado. Uma iniciação criativa em tecnologia, complementar à escola.',
    primary: {
      label: 'Ver os planos de acesso',
      href: '#planos',
    },
    secondary: {
      label: 'Conhecer como a aprendizagem acontece',
      href: '#experiencia',
    },
  },
  sections: [
    {
      id: 'd02',
      title: 'Um conceito ganha sentido quando a criança consegue usá-lo',
      eyebrow: 'Aprender a usar um conceito',
      layout: 'story',
      visuals: ['contador'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Ao escolher uma atividade de tecnologia, você quer entender o que seu filho vai aprender e o que fará com esse conhecimento. Ver uma regra funcionando num projeto ajuda a tornar essa avaliação concreta.',
            'Em um jogo, uma instrução pode mudar a pontuação quando o personagem alcança um objeto. Outra responde a uma tecla. Uma ação pode se repetir. A criança encontra os conceitos no comportamento daquilo que constrói.',
            'Isso dá referências para conversar: qual instrução usou, o que esperava que acontecesse e como conferiu o resultado. A iniciação em programação começa por essas relações, em uma atividade que ela pode ter interesse em realizar e mostrar.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'd03',
      title: 'A aula explica uma parte e oferece uma tarefa para praticar',
      eyebrow: 'Explicação e prática',
      layout: 'story',
      visuals: ['aula-estudio', 'regra', 'preparados'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Na Comunidade dos Criadores, as aulas apresentam projetos guiados. O começo mostra o comando, orienta a montagem e explica o efeito que a criança deve observar. Nas atividades integradas, a explicação fica junto do editor ou do experimento.',
            'Seu filho realiza a ação e confere o resultado. Cenas interativas permitem explorar relações como movimento, posição, eventos e repetição, conforme o conteúdo da aula. No Estúdio, ele usa blocos para construir e testar as regras do projeto.',
            'Vídeo, texto, áudio, perguntas e materiais de consulta complementam a orientação conforme a atividade. Os requisitos de conclusão indicam o que falta realizar. Assim, ele tem referências tanto para fazer a tarefa quanto para voltar a uma parte da explicação.',
          ],
        },
        {
          title: 'Uma condição pode ser observada no jogo',
          paragraphs: [
            'Pense em uma instrução que acrescenta um ponto quando o personagem alcança um objeto. A regra liga um acontecimento a um resultado. Ao construir e testar, seu filho pode observar quando o placar muda e relacionar isso ao comando.',
            'Numa atividade que permita alterar o valor, ele pode prever a diferença e comparar o efeito. Essa variação oferece uma oportunidade de mostrar compreensão. Você pode pedir que explique a regra e execute o jogo para conferir.',
          ],
        },
        {
          title: 'A orientação inicial dá uma referência para investigar',
          paragraphs: [
            'Personagens e outros elementos preparados ajudam a concentrar a atenção no conceito da aula. A criança aprende onde colocar as instruções e o que observar. Conforme avança e libera as ferramentas, amplia as oportunidades de alterar e criar.',
            'Seguir uma montagem pode ser parte do começo. Para conhecer o que foi compreendido, vale observar também as escolhas que seu filho explica e as mudanças que consegue realizar. O projeto oferece um lugar para essa investigação.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'd04',
      title: 'A Jornada mostra os requisitos para continuar',
      eyebrow: 'Jornada do Criador',
      layout: 'journey',
      visuals: ['jornada', 'catalogo'],
      groups: [
        {
          title: null,
          paragraphs: [
            'A Jornada do Criador reúne cursos, etapas e liberações. Seu filho encontra onde está e os próximos passos disponíveis. O avanço considera requisitos de conclusão e publicação de projetos. Pontos de participação registram outra parte da experiência e, sozinhos, não comprovam aprendizagem.',
            'Dentro das aulas, a criança usa os recursos preparados para cada atividade. Após concluir o curso obrigatório de entrada e publicar o projeto exigido, alcança o posto Construtor e libera o uso livre do Estúdio e do Pinta.',
            'O Inventor dá acesso ao Pensa e à ajuda do Zappy no Estúdio, conforme as condições dos serviços. O Explorador de Mundos abre o Molda. Recursos que aproximam blocos e código aparecem em etapas posteriores, com requisitos próprios.',
            'A Comunidade está em lançamento. A assinatura inclui os cursos publicados e os que forem acrescentados durante o período contratado. Algumas etapas dependem de cursos em preparação. No catálogo, vocês conferem o que pode ser estudado agora; na Jornada, o caminho previsto para continuar.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'd05',
      title: 'As ferramentas se encontram nas decisões do projeto',
      eyebrow: 'Ferramentas com uma função',
      layout: 'tools',
      visuals: ['estudio', 'pinta', 'pensa', 'zappy', 'molda'],
      groups: [
        {
          title: 'Estúdio: construir uma regra e conferir seu efeito',
          paragraphs: [
            'Seu filho encaixa comandos, executa o jogo e observa o resultado. Se quer que uma ação se repita, precisa montar a instrução e verificar o comportamento. O teste ajuda a comparar a intenção com o que de fato aconteceu e decidir o que revisar.',
          ],
        },
        {
          title: 'Pinta: fazer escolhas visuais e conhecer seu uso',
          paragraphs: [
            'Um personagem criado no Pinta pode participar do projeto no Estúdio. Ao vê-lo no cenário, a criança pode querer mudar o tamanho ou a cor. A criação visual também passa por escolha, teste e ajuste, em torno de algo que ela está construindo.',
          ],
        },
        {
          title: 'Pensa: transformar a ideia em decisões e tarefas',
          paragraphs: [
            'No posto Inventor, o Pensa ajuda a esclarecer o jogo que seu filho quer fazer. A conversa trata de escolhas como o objetivo do jogador, os controles e as condições de vitória. Pode oferecer exemplos, organizar as respostas e ajudar a dividir o trabalho em tarefas.',
            'A criança participa dessas decisões e continua construindo nas ferramentas. Receber um plano não demonstra, sozinho, que aprendeu a realizar cada parte. Ela precisa executar, testar e conferir o que foi proposto.',
          ],
        },
        {
          title: 'Zappy: ajuda para examinar uma dificuldade',
          paragraphs: [
            'O Zappy oferece apoio com inteligência artificial no Estúdio. Pode considerar os blocos e o erro apresentado para explicar uma dúvida e apontar o que consultar. Não altera o projeto: o ajuste e o teste continuam com a criança.',
            'A proposta é aprender a usar essa ajuda com critério. Uma sugestão precisa combinar com a intenção do projeto e ser verificada no funcionamento. A inteligência artificial pode errar. Pensa e Zappy dependem dos requisitos da Jornada, da disponibilidade do serviço e dos créditos compartilhados pela família.',
          ],
        },
        {
          title: 'Molda e código: possibilidades para etapas posteriores',
          paragraphs: [
            'O Molda permite explorar elementos em três dimensões quando os requisitos liberam esse acesso. A relação entre blocos e código aparece em etapas avançadas. Consulte os cursos publicados para saber quais desses marcos seu filho já pode alcançar.',
            'As ferramentas têm funções diferentes dentro da mesma construção. A regra define o comportamento, a arte participa do jogo e o planejamento organiza o que precisa ser feito. Seu filho tem decisões para realizar e mostrar em cada parte.',
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
      id: 'd06',
      title: 'Rever a explicação faz parte de praticar',
      eyebrow: 'Tempo para compreender',
      layout: 'story',
      visuals: ['pausa', 'recados'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Seu filho pode precisar de mais de uma tentativa para relacionar um comando ao resultado. A aula gravada permite voltar ao trecho, conferir a montagem e testar de novo. Ele pode demorar numa ação e continuar depois de realizá-la.',
            'A família escolhe o horário dentro do tempo de tela já permitido. O percurso registrado ajuda a encontrar onde retomar, e as criações guardadas podem ser abertas durante o acesso. Conferir o aviso de salvamento antes de sair ajuda a preservar aquela versão do trabalho.',
            'Quando a dúvida continua, o pedido de ajuda parte da seção da aula e a conversa segue nos Recados. O retorno acontece por mensagens, de forma assíncrona; pode ser necessário aguardar. A assinatura não inclui encontros ao vivo. Os tutoriais do Como fazer também oferecem orientações de uso das ferramentas.',
          ],
        },
        {
          title: 'O começo mostra de quanto apoio a criança precisa',
          paragraphs: [
            'Leitura e uso de mouse e teclado são requisitos. Algumas crianças precisam de companhia inicial para conhecer os controles e aprender a acompanhar a orientação. Observar uma tarefa ajuda a avaliar esse apoio.',
            'A programação é explicada nas aulas. O responsável pode ajudar com acesso, rotina e conversa sobre o que foi construído. Aos poucos, vocês observam como a criança usa a revisão e os caminhos de ajuda para continuar.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'd07',
      title: 'Os registros orientam o acompanhamento; o projeto abre a conversa',
      eyebrow: 'Você acompanha',
      layout: 'story',
      visuals: ['responsavel', 'aprendizagem', 'certificado'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Na área do responsável, você encontra cursos, atividades, entregas, temas explorados e marcos da Jornada. Esses registros ajudam a localizar uma produção e conhecer o que foi realizado.',
            'Se apareceu uma atividade sobre condições, por exemplo, você pode pedir que seu filho mostre quando uma ação acontece no jogo. Ele explica a regra, executa e confere. Você participa pelo exemplo, inclusive sem conhecer os termos de programação.',
            'Conclusões e certificados, quando previstos no curso, registram requisitos cumpridos. O que a criança consegue explicar, alterar e testar oferece outras referências sobre compreensão. Essa combinação ajuda a acompanhar o aprendizado de maneira mais próxima da prática.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'd08',
      title: 'O interesse do seu filho também participa da formação',
      eyebrow: 'Um motivo para aprender',
      layout: 'cards',
      visuals: ['pinta-vetor', 'perfis', 'espaco'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Uma atividade precisa encontrar alguma curiosidade da criança. Ela pode querer inventar jogos, desenhar personagens, construir cenários ou descobrir como uma regra funciona. Esse interesse dá um motivo para se envolver com a tarefa.',
            'Elementos prontos permitem começar pelas regras. O Pinta abre espaço para a criação visual. A mesma assinatura atende até dois perfis, com projetos e progresso separados, para acompanhar irmãos que se interessam por partes diferentes do percurso.',
            'Avatar, quarto virtual, missões e conquistas permitem personalizar o espaço e reconhecer a participação. Os combinados da família continuam orientando o tempo de uso. O conteúdo aprendido é observado nos projetos, nas tentativas e nas explicações da criança.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'd09',
      title: 'Mostrar uma criação oferece uma oportunidade de explicar',
      eyebrow: 'Conhecer e compartilhar',
      layout: 'story',
      visuals: ['clube', 'mural', 'publicacao'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Um jogo publicado pode aparecer no Mural e ganhar um link e um cartão com código QR para compartilhar. Ao apresentar a criação, seu filho pode mostrar uma regra, explicar como funciona e ouvir a impressão de quem jogou.',
            'O Clube reúne publicações e respostas sobre ideias e projetos. Há combinados de convivência e um caminho para avisar a equipe sobre algo que precise de atenção. Um desafio do mês disponível para a etapa oferece um tema para aplicar o que foi explorado. O remix, quando liberado, permite investigar e modificar uma base publicada compatível.',
            'Essas situações dão outros destinos ao trabalho realizado. A criança pode revisitar uma regra para explicar a alguém ou experimentar uma variação. A aprendizagem continua ligada ao que ela faz e consegue compreender.',
            'O responsável administra a visibilidade do perfil, inicialmente desligada para colegas. Jogos publicados por link têm visibilidade pública própria. Essa diferença precisa entrar nos combinados sobre o que compartilhar.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'd10',
      title: 'Compare a orientação, a prática e o apoio que seu filho vai encontrar',
      eyebrow: 'Uma formação complementar',
      layout: 'band',
      visuals: ['integracao'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Ferramentas gratuitas, tutoriais, aulas ao vivo e experiências por projetos podem atender necessidades diferentes. Conhecer uma atividade real ajuda a avaliar o ponto de partida, as instruções, a prática oferecida e o caminho de ajuda.',
            'A Comunidade reúne aulas guiadas, ferramentas conectadas, projetos, Recados e acompanhamento familiar. O formato permite consultar a explicação durante a construção e organizar a atividade no horário da casa.',
            'Se a necessidade é intervenção imediata de um professor em encontros marcados, esse critério deve pesar na escolha. Aqui, a orientação gravada e o apoio assíncrono sustentam uma iniciação por projetos, com espaço para rever e tentar.',
            'Ao conhecer o primeiro projeto e o catálogo publicado, vocês conseguem comparar esse começo com o que seu filho já sabe e com o que deseja aprender. A proposta é uma formação complementar que a família pode acompanhar nas produções.',
          ],
        },
      ],
      actions: [],
    },
  ],
  faqTitle: 'Mais sobre a experiência do seu filho',
  faqGroups: [
    {
      title: 'A aprendizagem na prática',
      questions: [
        'catalogo',
        'aprendizagem',
        'programacao',
        'nivel',
        'aulas-gravadas',
        'certificado',
      ],
    },
    {
      title: 'Começo e aprendizagem',
      questions: [
        'desenho',
        'ajuda',
        'pais',
        'interesse',
        'so-desenho',
        'papel',
        'roblox',
        'apoio-especifico',
      ],
    },
    {
      title: 'Recursos e continuidade',
      questions: [
        'liberacao',
        'ia',
        'pensa',
        'zappy',
        'creditos',
        'planejamento',
        '3d',
        'codigo',
        'desafio',
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
    title: 'Uma formação que vocês podem conhecer nas decisões do projeto',
    eyebrow: 'Para começar juntos',
    layout: 'band',
    visuals: [],
    groups: [
      {
        title: null,
        paragraphs: [
          'Seu filho mostra uma regra, explica o que esperava dela e executa o jogo para conferir. Você acompanha uma parte do que ele aprendeu e conhece a próxima atividade disponível.',
          'A Comunidade reúne o caminho para começar essa prática em casa, com orientação, ferramentas e registros do percurso. Escolham o plano e abram juntos a atividade de entrada.',
        ],
      },
    ],
    actions: [
      {
        label: 'Escolher um plano para essa aprendizagem',
        href: '#planos',
      },
    ],
  },
} satisfies ComunidadePage
