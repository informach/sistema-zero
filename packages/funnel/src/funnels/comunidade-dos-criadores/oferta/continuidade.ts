import { CONTINUIDADE_FAQ } from './continuidade-faq'
import type { ComunidadePage } from './types'
import { FAQ_VISUALS } from './visuals'

// Copy aprovada: docs/marketing/kids/comunidade-dos-criadores/copy/pagina-e-continuidade.md
export const PAGE_E: ComunidadePage = {
  id: 'continuar',
  label: 'Continuidade',
  seoTitle: 'Continue criando jogos na Comunidade dos Criadores',
  description:
    'Já conhece o Sistema Zero Kids? Veja como continuar na mesma conta, o que a assinatura inclui e os próximos passos da Jornada para seu filho.',
  emphasis: 'continuar criando jogos',
  heroVisual: 'estudio',
  heroChip: 'Continuar no mesmo perfil',
  hero: {
    title: 'Seu filho pode continuar criando jogos e experimentando as próprias ideias',
    description:
      'Na Comunidade dos Criadores, ele encontra aulas guiadas, ferramentas para construir e ajuda por mensagens quando surge uma dúvida. Vocês continuam na mesma conta, com projetos que ele pode testar, melhorar e mostrar à família.',
    benefits: [
      'Uma explicação para consultar enquanto coloca uma ideia em prática.',
      'Desenho, programação e teste conectados na mesma plataforma.',
      'Até dois perfis de criança, com projetos e progresso separados.',
    ],
    requirements:
      'Para crianças de 9 a 14 anos. No navegador do computador, com internet, mouse e teclado. O uso livre das ferramentas acompanha o avanço na Jornada do Criador.',
    primary: {
      label: 'Escolher um plano para continuar',
      href: '#planos',
    },
    secondary: {
      label: 'Ver o próximo passo e uma criação por dentro',
      href: '#proximo-passo',
    },
  },
  sections: [
    {
      id: 'e02',
      title: 'Uma regra do jogo pode abrir espaço para outra ideia',
      eyebrow: 'Uma ideia para continuar',
      layout: 'story',
      visuals: ['regra'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Vocês conheceram uma parte da plataforma pelo Cadê Todo Mundo, pelo Desafio ou por outra atividade. Esse contato já oferece um assunto para a próxima conversa: o que seu filho gostaria de fazer com aquilo que começou a conhecer?',
            'Talvez queira mudar o personagem. Talvez queira fazer uma regra funcionar de outro jeito. Ou precise terminar a parte em que parou para conseguir testar o jogo inteiro.',
            'Uma escolha pequena já dá uma tarefa à aprendizagem. Para fazer um personagem andar ao apertar uma tecla, a criança precisa encontrar a instrução, montar a regra e observar o resultado. Quando muda essa regra, tem algo para comparar e explicar.',
            'A Comunidade reúne orientação e ferramentas para desenvolver essas escolhas. Você pode conhecer uma criação, jogar junto e pedir que seu filho mostre o que resolveu mudar.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'proximo-passo',
      title: 'O próximo passo pode ser terminar, publicar ou criar uma nova versão',
      eyebrow: 'A partir de onde seu filho está',
      layout: 'cases',
      visuals: ['aula-estudio', 'contador', 'jornada'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Cada criança continua a partir do que já fez. A assinatura inclui o acesso aos recursos da Comunidade, e a Jornada mostra as etapas necessárias para usá-los. Veja como essa continuidade funciona em situações diferentes.',
          ],
        },
        {
          title: 'Se ainda está construindo o primeiro projeto',
          paragraphs: [
            'Seu filho volta à atividade em andamento, consulta o trecho da explicação e continua a montagem. O trabalho registrado no mesmo perfil ajuda a retomar o ponto em que parou. Se o curso já está acessível dentro do prazo recebido, vocês podem continuar usando esse acesso; a assinatura é uma escolha para conhecer e utilizar o conjunto da Comunidade.',
          ],
        },
        {
          title: 'Se conheceu a plataforma pelo Cadê Todo Mundo',
          paragraphs: [
            'Nesse curso, a criança trabalha num jogo de procurar personagens escondidos, com regras de interação e contagem. A conclusão fica registrada como uma experiência extra. O próximo passo para chegar ao uso livre das ferramentas é cumprir o curso obrigatório de entrada indicado na Jornada e publicar o projeto exigido.',
            'O que ela fez continua no perfil. Na entrada obrigatória, a orientação acompanha a montagem do projeto e a preparação para mostrá-lo. Esse é o começo do percurso que leva ao uso livre do Estúdio e do Pinta.',
          ],
        },
        {
          title: 'Se concluiu a entrada obrigatória e publicou o projeto exigido',
          paragraphs: [
            'Quem já cumpriu esses requisitos alcança o posto Construtor. Com a assinatura, pode usar livremente o Estúdio e o Pinta nos recursos dessa etapa.',
            'Uma atividade possível é fazer uma versão com outra aparência: desenhar um personagem no Pinta, levá-lo ao Estúdio e construir uma regra para movimentá-lo. Depois, testar uma mudança no movimento e comparar as duas tentativas. Ele pode guardar o projeto e voltar para trabalhar outra parte.',
            'Essa possibilidade vai além de assistir a outra aula: a criança usa o que está aprendendo para tomar uma decisão e conferir seu efeito. Na seção abaixo, você conhece como desenho e programação se encontram nessa criação.',
            'Se falta publicar o projeto de entrada, essa é a etapa a realizar antes do uso livre. A Jornada distingue a conclusão das atividades da publicação exigida.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'e04',
      title: 'O que a Comunidade acrescenta ao acesso que sua família já tem',
      eyebrow: 'O que entra na assinatura',
      layout: 'story',
      visuals: ['catalogo'],
      groups: [
        {
          title: null,
          paragraphs: [
            'No curso de entrada, seu filho conhece as aulas e os recursos preparados para aquela experiência. Algumas partes da plataforma, como a orientação junto da atividade, já podem ser familiares. A assinatura amplia o acesso para o conjunto da Comunidade durante o período contratado.',
            'Cadê Todo Mundo e Desafio do Primeiro Jogo são formas de conhecer esse começo. Os demais cursos fazem parte da Comunidade, e você não precisa comprar cada um separadamente. Os novos cursos publicados durante o seu plano também entram no acesso, seguindo a sequência e os requisitos da Jornada.',
          ],
          comparison: {
            headers: ['O que vocês já receberam', 'O que a assinatura acrescenta'],
            rows: [
              [
                'Aulas e atividades do curso incluído no convite ou na compra.',
                'Acesso aos cursos Kids publicados e aos que forem acrescentados durante o plano, respeitando a sequência de cada etapa.',
              ],
              [
                'Recursos de criação previstos para aquelas aulas.',
                'Estúdio e Pinta para criação livre no posto Construtor, além das ferramentas de etapas posteriores quando seus requisitos estiverem disponíveis e cumpridos.',
              ],
              [
                'A experiência e os direitos daquela oferta.',
                'Clube, recursos de criação e uma área para a família acompanhar as atividades, com até dois perfis de criança.',
              ],
            ],
          },
        },
        {
          title: null,
          paragraphs: [
            'A conta e o progresso já registrado permanecem ligados à família. Se o convite recebido inclui visita permanente ao Mural, essa visita conserva suas próprias condições e não depende de contratar a Comunidade.',
            'O valor da assinatura aparece no uso dessas possibilidades ao longo do tempo. Seu filho consulta uma orientação, faz uma tentativa, guarda o projeto e volta para experimentar outra escolha. Você encontra as produções e pode acompanhar o que ele construiu.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'experiencia',
      title: 'Do desenho ao jogo, uma criação continua ligada à outra',
      eyebrow: 'Ferramentas que se encontram',
      layout: 'story',
      visuals: ['integracao+pinta-vetor', 'mural'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Imagine um personagem que recolhe estrelas. No Pinta, seu filho trabalha a aparência: escolhe cores, ajusta o tamanho e experimenta detalhes. No Estúdio, a opção de trazer uma arte do Pinta permite usar essa criação no projeto.',
            'A aparência agora precisa participar de uma ação. Seu filho monta a regra que faz o personagem se mover e testa o resultado. Uma mudança no comando altera o comportamento. Uma mudança na arte altera o que aparece no jogo.',
            'Se o personagem se confundir com o fundo, ele pode voltar ao desenho e experimentar outra cor. Se o movimento sair diferente do que imaginou, consulta a orientação e examina a montagem. A criação dá um motivo concreto para aprender cada parte.',
            'Esse exemplo usa o Estúdio e o Pinta livres, disponíveis a partir do posto Construtor. Nas primeiras atividades, personagens e cenários preparados permitem começar pelas regras, com a orientação da aula. Saber desenhar não é uma exigência para participar.',
          ],
        },
        {
          title: 'A família conhece a escolha pelo que pode ver e experimentar',
          paragraphs: [
            'Ao mostrar o jogo, seu filho pode explicar onde colocou uma regra e o que aconteceu depois. Você abre a criação, testa o movimento e pergunta por que resolveu mudá-lo. É uma conversa sobre algo que vocês conseguem observar juntos.',
            'A integração ajuda a manter esse trabalho reunido: orientação para consultar, ferramentas para construir, projetos guardados e registros para localizar a atividade. A família acompanha uma produção que tem história, escolhas e tentativas para conhecer.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'e06',
      title: 'A mesma conta reúne o que já foi feito e o que vem depois',
      eyebrow: 'O percurso de cada criança',
      layout: 'journey',
      visuals: ['molda'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Se sua família já tem uma conta, use o mesmo e-mail do responsável ao contratar e continue no perfil que a criança utiliza. O progresso registrado permanece ligado a ele. Se seu filho já concluiu uma atividade do Desafio, não precisa refazê-la só porque passou a assinar a Comunidade.',
            'A assinatura e o avanço têm funções diferentes. A contratação dá acesso ao conjunto incluído. As atividades e publicações exigidas na Jornada determinam quando cada ferramenta fica disponível para uso livre.',
            'Esse caminho começa com os recursos preparados para a aula. Ao concluir a entrada obrigatória e publicar o projeto exigido, a criança chega ao Construtor e abre o Estúdio e o Pinta livres. Mais adiante, o Inventor permite usar Pensa e Zappy; o Explorador de Mundos dá acesso ao Molda.',
            'A Comunidade recebe novos cursos ao longo do tempo. Os que forem publicados durante o período contratado também fazem parte do acesso, sem uma compra separada por curso. Parte do percurso ainda está em preparação: recursos de etapas posteriores dependem da publicação dos cursos necessários e do avanço da criança. Eles não ficam abertos apenas por escolher um plano.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'e07',
      title: 'A pausa dá tempo para fazer, conferir e tentar de novo',
      eyebrow: 'Aprender no próprio ritmo',
      layout: 'story',
      visuals: ['pausa', 'recados'],
      groups: [
        {
          title: null,
          paragraphs: [
            'A explicação pode levar alguns segundos. Seu filho pode precisar de mais tempo para encontrar um comando e montar a mesma parte. Na aula gravada, ele pausa naquele ponto e continua quando estiver pronto para acompanhar o próximo passo.',
            'Se esqueceu onde colocou um bloco, volta ao trecho e compara com o que está fazendo. Nas atividades integradas, a orientação fica junto do editor ou do experimento. A consulta acontece durante a tentativa, no momento em que ela faz falta.',
            'Vocês escolhem o horário dentro do tempo de computador que já permitem. Antes de encerrar, a criança confere se o projeto ficou guardado na conta. Em outra sessão, pode abrir o trabalho e seguir com a próxima parte durante o acesso.',
          ],
        },
        {
          title: 'Quando a explicação não resolve, ele pode contar onde travou',
          paragraphs: [
            'Na seção da aula, “Preciso de ajuda” permite enviar uma pergunta sobre a atividade. A conversa continua nos Recados, com histórico para consultar. Contar o que tentou fazer e o que aconteceu ajuda a situar a dúvida.',
            'A equipe responde por mensagens, e seu filho pode precisar aguardar o retorno. O formato não inclui encontros ao vivo. Para ações das ferramentas, o Como fazer também reúne tutoriais que podem ser consultados durante a criação.',
            'Algumas crianças precisam de companhia nas primeiras atividades para conhecer os controles e aprender a usar esses apoios. Vocês podem observar quando ela já consegue acompanhar a orientação e onde ainda precisa de ajuda. A independência se desenvolve no uso, no ritmo de cada criança.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'e08',
      title: 'Você encontra uma produção para conhecer o que ele entendeu',
      eyebrow: 'Uma criação para conhecer',
      layout: 'story',
      visuals: ['aprendizagem', 'responsavel'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Na área do responsável, cada criança tem seu painel, com cursos, atividades, entregas, temas explorados e registros da Jornada. Esses dados ajudam a localizar uma criação para conhecer com seu filho.',
            'Se a tarefa envolveu pontuação, ele pode mostrar o valor no comando e jogar para conferir o placar. Se mudou um movimento, pode executar as tentativas e explicar a diferença. A marca de conclusão registra uma etapa cumprida; a explicação da criança acrescenta o que entendeu da escolha que fez.',
            'Você participa organizando a rotina, ajudando no primeiro acesso e demonstrando interesse pelas criações. A orientação de programação fica nas aulas. A conversa em família começa pelo que seu filho consegue mostrar.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'e09',
      title: 'O interesse pode começar pelo jogo, pelo desenho ou por uma descoberta',
      eyebrow: 'Interesses que podem se combinar',
      layout: 'story',
      visuals: ['animacao', 'codigo'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Para quem quer inventar jogos, fazer uma regra funcionar dá um objetivo à aprendizagem. A criança usa uma instrução para provocar um efeito, confere a tentativa e pensa no que quer mudar depois.',
            'Para quem gosta de desenhar, levar um personagem ao Estúdio abre outra possibilidade: decidir como ele participa do jogo. A aparência criada no Pinta ganha uma função na interação. Elementos preparados e desenhos próprios podem se combinar na mesma produção.',
            'Para quem quer entender a tecnologia, montar e testar os comandos oferece uma iniciação em programação por projetos. O funcionamento do jogo permite examinar a relação entre uma decisão e seu resultado.',
            'Esses interesses podem aparecer juntos. A família continua definindo os dias e a duração do uso. A proposta da Comunidade é reservar parte do tempo de tela já permitido para uma atividade de construção que a criança possa querer fazer e que vocês consigam acompanhar.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'e10',
      title: 'A inteligência artificial ajuda a pensar sobre a criação',
      eyebrow: 'Ajuda para pensar e construir',
      layout: 'story',
      visuals: ['pensa', 'zappy'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Planejar uma ideia e examinar uma dificuldade são trabalhos diferentes. A Comunidade tem apoios para os dois no posto Inventor, quando o percurso necessário estiver disponível e cumprido.',
          ],
        },
        {
          title: 'O Pensa ajuda a organizar uma ideia em partes',
          paragraphs: [
            'O Pensa conversa sobre o jogo que seu filho quer criar. Pode perguntar qual é o objetivo, como o jogador participa e o que encerra a partida. Explica perguntas, oferece alternativas e organiza as escolhas em um plano com tarefas.',
            'A criança continua escolhendo. Pode comparar uma sugestão com o que imaginou e decidir por qual parte começar. O plano dá uma referência para seguir às ferramentas e conferir o que falta construir.',
          ],
        },
        {
          title: 'O Zappy ajuda a examinar uma dúvida no Estúdio',
          paragraphs: [
            'O Zappy pode considerar os blocos e o contexto do projeto para explicar uma dificuldade. Se o personagem não se move como a criança esperava, pode sugerir o que observar nos comandos. Ele não altera os blocos nem executa a correção no projeto.',
            'Seu filho faz o ajuste e testa. Essa participação importa: aceitar uma solução pronta sem entender deixaria de fora a escolha e a investigação que fazem parte de aprender. A inteligência artificial também pode errar; suas sugestões precisam ser conferidas durante a criação.',
            'O Pensa e o Zappy são recursos de apoio. Seu uso depende da disponibilidade do serviço e dos créditos compartilhados pelos perfis da família, consultáveis na área do responsável.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'e11',
      title: 'Uma criação pode virar um convite para jogar junto',
      eyebrow: 'Criar e compartilhar',
      layout: 'story',
      visuals: ['clube+publicacao', 'espaco+perfis'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Seu filho publica um jogo e convida você para testar. Pode mostrar uma escolha, explicar o desafio e observar como outra pessoa interage com o que construiu. O Mural permite apresentar projetos, e o compartilhamento oferece um link e um cartão com código QR para abrir a criação.',
            'O Clube reúne publicações e respostas sobre ideias e trabalhos. Há combinados de convivência e um caminho para avisar a equipe sobre algo que precise de atenção. Quando disponível para a etapa, o desafio do mês propõe um tema para explorar numa criação.',
            'O responsável administra a visibilidade do perfil, inicialmente desligada para colegas. Os jogos publicados por link têm visibilidade pública própria. Vale combinar quais criações mostrar e com quem compartilhar.',
          ],
        },
        {
          title: 'Cada criança tem suas próprias descobertas',
          paragraphs: [
            'Os dois perfis incluídos na assinatura guardam projetos e progresso separadamente. Um irmão pode preferir desenhar personagens; outro, experimentar regras. Você encontra os dois percursos na área do responsável, e as ferramentas acompanham o avanço de cada criança.',
            'Avatar, quarto virtual, missões e conquistas oferecem formas de personalizar o espaço e reconhecer a participação. A criação continua sendo a referência para conversar sobre o que foi feito e aprendido. Os créditos de inteligência artificial são compartilhados pela família.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'e12',
      title: 'A próxima tentativa encontra orientação, ferramentas e um lugar para continuar',
      eyebrow: 'Um lugar para continuar',
      layout: 'band',
      visuals: ['reunida', 'salvamento'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Uma criação raramente termina na primeira escolha. Seu filho testa, percebe uma diferença e decide o que fazer com ela. Ter a explicação por perto ajuda a consultar um passo; guardar o projeto permite retomá-lo; poder enviar uma dúvida oferece um caminho quando ele não consegue seguir.',
            'É essa continuidade que a Comunidade reúne. Durante o plano, a criança pode usar os recursos acessíveis para desenvolver suas produções, e a família tem registros para acompanhar. O valor aparece no trabalho que essas partes permitem fazer juntas.',
            'O acesso de entrada continua seguindo as condições recebidas. Quando a família quiser ampliar essa experiência, os planos abaixo dão acesso ao conjunto da Comunidade e permitem continuar no mesmo perfil.',
          ],
        },
      ],
      actions: [],
    },
  ],
  faqTitle: 'Sobre os próximos passos do seu filho',
  faqGroups: [
    {
      title: 'Para escolher o próximo passo',
      questions: [
        'continuidade',
        'proximo-passo',
        'conta-existente',
        'liberacao',
        'ajuda',
        'aprendizagem',
        'interesse',
      ],
    },
    {
      title: 'Sobre o acesso que vocês já receberam',
      questions: [
        'cade-todo-mundo',
        'desafio',
        'acesso-vencido',
        'curso-em-andamento',
        'visita-mural',
        'idade-continuidade',
      ],
    },
    {
      title: 'Aprendizagem, interesses e apoio',
      questions: [
        'aulas-gravadas',
        'pais',
        'programacao',
        'desenho',
        'so-desenho',
        'papel',
        'nivel',
        'roblox',
        'apoio-especifico',
        'telas',
      ],
    },
    {
      title: 'Cursos e ferramentas de criação',
      questions: [
        'catalogo',
        'custos',
        'ia',
        'pensa',
        'zappy',
        'creditos',
        'planejamento',
        '3d',
        'codigo',
        'certificado',
      ],
    },
    {
      title: 'A criação no dia a dia',
      questions: ['equipamento', 'internet', 'salvamento', 'exportacao', 'ferias', 'pontos'],
    },
    {
      title: 'Participação e família',
      questions: ['irmaos', 'perfil', 'jogos-publicos', 'convivencia', 'indicacao'],
    },
    {
      title: 'Conta, período e pagamento',
      questions: [
        'inicio-assinatura',
        'valor-anterior',
        'atendimento',
        'senha',
        'cancelamento',
        'reembolso',
      ],
    },
  ],
  faqLinks: [
    {
      label: 'Planos',
      href: '#planos',
    },
    {
      label: 'Garantia',
      href: '#garantia',
    },
    {
      label: 'Cancelar a próxima renovação',
      href: '#duvida-cancelamento',
    },
    {
      label: 'Solicitar reembolso',
      href: '#duvida-reembolso',
    },
  ],
  offer: {
    title: 'Escolha como sua família quer continuar',
    paragraphs: [
      'Os dois planos incluem os cursos Kids publicados, as ferramentas de criação conforme as etapas da Jornada, os espaços da comunidade e o acompanhamento da família. Permitem até dois perfis e incluem os cursos que forem acrescentados à assinatura durante o período contratado.',
      'As aulas são gravadas, com prática nas atividades e apoio por mensagens. O percurso e as condições de liberação são os mesmos nos dois planos. A diferença está no período e na forma de cobrança.',
    ],
    monthly: {
      title: 'Plano mensal',
      paragraphs: [
        'Cobrança mensal com renovação automática no cartão. Você pode cancelar a próxima renovação pela área do responsável. O acesso continua até o fim do período pago.',
      ],
      cta: 'Escolher o plano mensal',
    },
    annual: {
      title: 'Plano anual',
      paragraphs: [
        'O valor equivale a {{equivalente_mensal_anual}} por mês, considerando o total anual. O pagamento é anual: Pix à vista ou cobrança anual recorrente no cartão.',
        'No Pix, uma nova contratação é necessária ao fim dos 12 meses. No cartão, a renovação é automática e você pode cancelar a próxima cobrança pela área do responsável.',
      ],
      cta: 'Escolher o plano anual',
    },
    period: {
      title: 'O período começa com a aprovação do pagamento',
      paragraphs: [
        'A assinatura começa com a aprovação do pagamento, inclusive quando ainda restam dias do acesso ao curso de entrada. Esses dias não são acrescentados automaticamente ao plano. Você pode usar o curso até o fim do prazo recebido antes de decidir pela assinatura.',
      ],
    },
    guarantee: {
      title: 'Sete dias para avaliar a contratação inicial',
      paragraphs: [
        'Na primeira contratação da Comunidade, você pode solicitar o reembolso integral em até sete dias corridos a partir da compra. Envie o pedido para [contato@sistemazero.com.br](mailto:contato@sistemazero.com.br), informando o e-mail usado na compra.',
        'Esse prazo também vale para cada nova contratação anual por Pix. As renovações automáticas no cartão seguem as condições dos [termos da assinatura](/kids/termos).',
        'Nesse período, vocês podem conhecer as atividades acessíveis e observar como o formato cabe na rotina. Os requisitos das ferramentas continuam valendo. Depois da garantia, cancelar a próxima renovação impede as próximas cobranças e mantém o acesso até o fim do período já pago. O pedido de reembolso é uma ação separada.',
      ],
    },
    checkout:
      'Ao escolher um plano, você confere o valor, o período e a renovação antes de concluir o pagamento. Se sua família já tem conta, use o mesmo e-mail do responsável para manter o acesso ligado ao perfil que a criança utiliza. Se ainda não tem conta, informe os dados do responsável e siga as orientações de acesso da contratação.',
  },
  showFounder: false,
  closing: {
    id: 'convite',
    title: 'A próxima criação pode começar com uma escolha pequena',
    eyebrow: 'Para continuar juntos',
    layout: 'band',
    visuals: [],
    groups: [
      {
        title: null,
        paragraphs: [
          'Uma cor que seu filho quer mudar. Um personagem que quer colocar no jogo. Uma regra que quer testar para ver o que acontece.',
          'A Comunidade reúne orientação, ferramentas e apoio para trabalhar essas escolhas. Ele pode construir, conferir o resultado e guardar o projeto para continuar. Você tem uma criação para conhecer e uma conversa para começar: “Me mostra o que você mudou”.',
          'Escolham o plano que combina com a rotina da família e continuem a partir da etapa em que seu filho está.',
        ],
      },
    ],
    actions: [
      {
        label: 'Escolher um plano para continuar',
        href: '#planos',
      },
    ],
  },
  faq: CONTINUIDADE_FAQ,
  faqVisuals: {
    ...FAQ_VISUALS,
    ...{
      continuidade: ['catalogo', 'integracao'],
      'proximo-passo': ['jornada', 'integracao'],
      'conta-existente': ['conta'],
      'cade-todo-mundo': ['contador', 'jornada'],
      'acesso-vencido': ['conta'],
      'curso-em-andamento': ['aula'],
      'visita-mural': ['mural'],
      'idade-continuidade': ['aula'],
      'inicio-assinatura': ['compras'],
      'valor-anterior': [],
    },
  },
}
