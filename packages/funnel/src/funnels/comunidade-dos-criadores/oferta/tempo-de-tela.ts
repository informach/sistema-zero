import type { ComunidadePage } from './types'

// Texto integral da revisão de 01/10/2026 em docs/marketing/kids/comunidade-dos-criadores/copy/.
export const PAGE_A = {
  id: 'tempo-de-tela',
  label: 'Aprender criando',
  seoTitle: 'Comunidade dos Criadores: aprender criando jogos | Sistema Zero',
  description:
    'Uma atividade de criação de jogos para crianças de 9 a 14 anos, com aulas guiadas, ferramentas integradas e acompanhamento da família no tempo de tela permitido.',
  emphasis: 'dentro do tempo de tela que vocês já permitem',
  heroVisual: 'aula',
  heroChip: 'Aprender criando',
  hero: {
    title: 'Seu filho aprende criando jogos, dentro do tempo de tela que vocês já permitem',
    description:
      'Ele acompanha uma explicação, monta uma parte do jogo e testa o que fez. A Comunidade reúne aulas guiadas, ferramentas de criação e ajuda por mensagens para apoiar esse começo. Você conhece o aprendizado nas produções e nas escolhas que seu filho consegue explicar.',
    benefits: [
      'Um começo explicado passo a passo, em português.',
      'Aulas e ferramentas de criação reunidas na mesma plataforma.',
      'Projetos e registros para acompanhar cada criança da família.',
    ],
    requirements:
      'Para crianças de 9 a 14 anos. No navegador do computador, com internet, mouse e teclado.',
    primary: {
      label: 'Ver os planos para minha família',
      href: '#planos',
    },
    secondary: {
      label: 'Conhecer a experiência por dentro',
      href: '#experiencia',
    },
  },
  sections: [
    {
      id: 'a02',
      title: 'Uma parte do tempo no computador pode render uma conversa assim',
      eyebrow: 'Como ele aprende',
      layout: 'story',
      visuals: ['regra'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Seu filho abre um jogo e mostra o personagem andando pela tela. Depois muda uma regra, testa de novo e explica por que agora ele se move de outro jeito.',
            'Nessa cena, ele tem uma decisão para tomar e um resultado para conferir. Precisa encontrar o comando, entender sua função e observar o que aconteceu depois da mudança. Você pode conhecer essa construção e perguntar como chegou até ela.',
            'O computador já participa da rotina de muitas famílias. Dentro do tempo que vocês permitem, cabe reservar uma parte para uma atividade que envolva criar. Os combinados continuam sendo de vocês; a proposta da Comunidade está no que a criança faz durante aquele período.',
            'Para começar, a atividade precisa fazer sentido também para ela. Criar um jogo oferece um motivo para aprender uma regra: ver o personagem responder, montar um desafio e ter algo para mostrar.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'a03',
      title: 'A explicação acompanha o que seu filho está aprendendo a fazer',
      eyebrow: 'Aprender e fazer',
      layout: 'story',
      visuals: ['aula-estudio', 'integracao'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Na Comunidade dos Criadores, seu filho começa por uma tarefa guiada. A aula apresenta o passo, mostra os recursos necessários e explica o que observar. Nas atividades integradas, o vídeo e a orientação ficam junto do editor ou do experimento.',
            'Ele pode assistir a uma ação, pausar e fazê-la. Personagens e outros elementos preparados ajudam a começar, porque permitem concentrar a atenção no comando que está aprendendo. Textos, imagens, áudio, perguntas e materiais de consulta complementam a explicação conforme a atividade.',
            'Imagine uma regra que acrescenta um ponto quando o personagem alcança um objeto. Seu filho monta a instrução e testa a partida. Numa atividade que permita alterar o valor, pode comparar o efeito no placar. A mudança que fez aparece no funcionamento do jogo.',
            'Isso dá uma referência para conferir a própria tentativa. Se o resultado sair diferente do esperado, ele pode voltar à explicação e revisar a montagem. Para você, a mesma criação oferece uma conversa concreta: “Me mostra o que mudou quando você trocou esse número”.',
          ],
        },
        {
          title: 'Uma criação conecta as partes da plataforma',
          paragraphs: [
            'O Estúdio é onde seu filho monta e testa os jogos. No Pinta, cria desenhos digitais que podem participar desses projetos. Os Recados guardam as conversas de ajuda. A Jornada mostra onde continuar, e a área do responsável reúne registros da atividade de cada criança.',
            'Pense no caminho de um personagem: ele é desenhado no Pinta, entra no Estúdio e recebe uma regra para se mover. Se aparecer uma dúvida da aula, há um lugar para enviá-la. Depois, a criação pode ser guardada e apresentada à família. O valor da integração aparece nessa continuidade entre aprender, fazer, pedir ajuda e mostrar.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'a04',
      title: 'A pausa dá tempo para fazer, conferir e tentar de novo',
      eyebrow: 'No ritmo da atividade',
      layout: 'story',
      visuals: ['pausa', 'recados'],
      groups: [
        {
          title: null,
          paragraphs: [
            'A explicação pode levar alguns segundos; a criança pode precisar de mais tempo para localizar um bloco e experimentar a ação. Na aula gravada, ela pausa naquele ponto e continua quando estiver pronta para acompanhar o próximo passo.',
            'Também pode rever só o trecho em que se perdeu. O vídeo permanece disponível durante o acesso, ao lado da prática nas atividades integradas. Essa consulta ajuda quando o resultado ficou diferente e ela quer comparar o que montou com a orientação.',
            'A família escolhe o horário dentro do tempo de tela combinado. Ao voltar em outro dia, seu filho encontra o percurso registrado e pode abrir os trabalhos guardados. Antes de encerrar, vale conferir o aviso de salvamento para saber se o projeto ficou na conta.',
          ],
        },
        {
          title: 'A criança tem um começo orientado e um caminho para pedir ajuda',
          paragraphs: [
            'Ela precisa conseguir ler e usar mouse e teclado. Algumas crianças se familiarizam rapidamente; outras precisam de companhia nas primeiras atividades. Vocês podem conhecer os controles juntos e observar como ela acompanha uma tarefa antes de ampliar a independência.',
            'Se uma dúvida continuar, o botão “Preciso de ajuda” permite enviar a pergunta a partir da seção da aula. A conversa segue nos Recados, com histórico para consultar. O apoio acontece por mensagens, de forma assíncrona, e pode ser necessário aguardar o retorno. O formato não inclui encontros ao vivo.',
            'Para aprender uma ação da ferramenta, há também os tutoriais do Como fazer. Assim, a criança tem referências para consultar e um canal para explicar onde travou.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'a05',
      title: 'Você acompanha uma atividade e conhece o que ele entendeu',
      eyebrow: 'Você acompanha',
      layout: 'story',
      visuals: ['responsavel', 'aprendizagem'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Na área do responsável, cada criança tem seu painel. Você encontra cursos em andamento, atividades, entregas, temas explorados e o ponto em que ela está na Jornada. Esses registros ajudam a localizar o que aconteceu e escolher uma produção para conhecer.',
            'Se a atividade envolveu movimento, peça que seu filho mostre como o personagem anda. Se mudou uma regra, pode executar as versões e explicar a diferença. Você participa pelo que consegue ver, ouvir e experimentar, inclusive sem trabalhar com programação.',
            'Uma etapa concluída informa que certos requisitos foram cumpridos. A explicação da criança acrescenta o que entendeu e como relaciona a escolha ao resultado. Acompanhar os dois ajuda a conhecer melhor a experiência do que olhar apenas o tempo conectado.',
            'Seu papel pode ser organizar a rotina, ajudar no primeiro acesso e se interessar pelas criações. A orientação de programação fica nas aulas, e as dúvidas da atividade têm o caminho dos Recados.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'a06',
      title: 'O interesse pode começar numa regra ou num personagem',
      eyebrow: 'O que desperta curiosidade',
      layout: 'cards',
      visuals: ['estudio', 'pinta', 'codigo'],
      groups: [
        {
          title: 'Para quem quer inventar jogos',
          paragraphs: [
            'No Estúdio, os blocos representam instruções. A criança aprende a encaixá-los e testar o efeito. Pode começar com personagens e cenários preparados, concentrando-se em fazer o jogo funcionar. Quando libera o uso livre, encontra espaço para voltar ao projeto e experimentar combinações próprias.',
            'O remix, quando disponível, permite explorar e modificar uma base publicada compatível. Alterar uma parte e observar a diferença oferece outra oportunidade de investigar como uma regra funciona.',
          ],
        },
        {
          title: 'Para quem gosta de desenhar',
          paragraphs: [
            'O Pinta permite criar personagens, objetos e cenários digitais. Uma criação compatível pode entrar no Estúdio e participar de um jogo. Se o personagem ficar pequeno ou se confundir com o fundo, seu filho pode ajustar a aparência e conferir de novo.',
            'A escolha visual ganha um uso que ele consegue experimentar. Também é possível combinar desenhos próprios com elementos prontos, conforme a atividade e as ferramentas liberadas.',
          ],
        },
        {
          title: 'Para quem quer entender como a tecnologia funciona',
          paragraphs: [
            'Ao fazer uma ação depender de uma tecla ou de um encontro entre objetos, seu filho conhece relações de programação. O comando tem um efeito no projeto. Ele pode prever o que vai acontecer, testar e revisar a tentativa.',
            'Esses interesses podem se encontrar na mesma criação. Vocês podem começar pelo que desperta mais curiosidade e conhecer as outras possibilidades durante o percurso.',
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
      id: 'a07',
      title: 'A Jornada mostra o próximo passo e o que ele libera',
      eyebrow: 'Jornada do Criador',
      layout: 'journey',
      visuals: ['jornada', 'pensa', 'zappy'],
      groups: [
        {
          title: null,
          paragraphs: [
            'A Jornada do Criador organiza as etapas, os requisitos e as ferramentas. Dentro das aulas, seu filho usa os recursos previstos para aquela atividade. Depois de concluir o curso obrigatório de entrada e publicar o projeto exigido, chega ao posto Construtor e libera o uso livre do Estúdio e do Pinta.',
            'Essa passagem começa com orientação e abre espaço para explorar o que aprendeu. Nas ferramentas liberadas, pode retomar uma criação, testar outra regra ou trabalhar uma nova aparência.',
          ],
        },
        {
          title: 'Ajuda para organizar uma ideia e examinar uma dificuldade',
          paragraphs: [
            'No posto Inventor, o Pensa ajuda a transformar uma ideia em planejamento. Ele faz perguntas sobre o jogo, organiza as escolhas da criança e ajuda a dividi-las em tarefas. O Zappy, no Estúdio, oferece ajuda com inteligência artificial para entender comandos e dificuldades; ele não altera o projeto.',
            'A criança continua escolhendo, montando e testando. Usar uma sugestão pede comparar com a própria intenção e conferir o resultado. Essa é a função desses apoios na Comunidade: ajudar a avançar numa criação que ela precisa compreender. O acesso depende dos requisitos, da disponibilidade do serviço e dos créditos da família.',
            'Mais adiante, o Molda abre possibilidades de criação em três dimensões. A Comunidade está em lançamento: a assinatura inclui os cursos publicados e os que forem acrescentados durante o período contratado. Algumas liberações dependem de cursos ainda em preparação. O catálogo mostra o que está disponível para começar e continuar hoje.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'a08',
      title: 'Uma criação para mostrar à família e conversar com outros criadores',
      eyebrow: 'Criar e compartilhar',
      layout: 'story',
      visuals: ['clube+publicacao', 'espaco', 'perfis'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Quando seu filho publica um jogo, pode apresentá-lo no Mural e obter um link para compartilhar. Há também um cartão com código QR. Em casa, esse convite pode virar uma partida juntos: você joga e ele mostra uma escolha que fez.',
            'O Clube oferece conversas por publicações e respostas sobre ideias e trabalhos. Um desafio do mês, quando disponível para a etapa, propõe um tema para criar outra versão usando o que já explorou. São lugares para apresentar uma produção e conhecer outras, com combinados de convivência e um caminho para avisar a equipe sobre algo que precise de atenção.',
            'O responsável administra a visibilidade do perfil, inicialmente desligada para colegas. Um jogo publicado por link tem visibilidade pública própria. Por isso, vale combinar com a criança quais projetos mostrar e com quem compartilhar.',
          ],
        },
        {
          title: 'Um espaço para cada criança da família',
          paragraphs: [
            'Avatar, quarto virtual, missões e conquistas permitem personalizar o espaço e reconhecer a participação. O projeto continua sendo a referência para conversar sobre o que foi feito e aprendido. Os combinados da família orientam a frequência de uso.',
            'A assinatura permite até dois perfis, com projetos e progresso separados. Um filho pode preferir desenhar; outro, experimentar regras. Você acompanha cada percurso, e as liberações seguem o avanço de cada criança.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'a09',
      title: 'O valor da assinatura aparece quando essas partes trabalham juntas',
      eyebrow: 'A experiência reunida',
      layout: 'band',
      visuals: ['reunida'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Há ferramentas e tutoriais gratuitos para aprender programação. Para usá-los em casa, a família pode precisar escolher um começo, organizar uma sequência, encontrar os materiais e decidir onde buscar ajuda. Há famílias que gostam de montar esse caminho.',
            'A Comunidade já reúne aulas guiadas, ferramentas de criação, ajuda por mensagens, espaços para mostrar os projetos e registros para acompanhar. Seu filho encontra uma atividade para fazer e os recursos previstos para ela. Se surgir uma dúvida, tem um caminho de ajuda. Quando você quer conhecer o que aconteceu, tem onde consultar.',
            'É essa experiência organizada que a assinatura oferece. Mostre a demonstração ao seu filho e conversem sobre o que ele gostaria de construir. Nos planos abaixo, vocês escolhem entre cobrança mensal e acesso anual, com o mesmo percurso e até dois perfis.',
          ],
        },
      ],
      actions: [],
    },
  ],
  faqTitle: 'Mais sobre a experiência do seu filho',
  faqGroups: [
    {
      title: 'Aprender no tempo de tela combinado',
      questions: ['telas', 'aprendizagem', 'aulas-gravadas', 'pais', 'ajuda', 'interesse'],
    },
    {
      title: 'Começo e aprendizagem',
      questions: [
        'programacao',
        'desenho',
        'so-desenho',
        'papel',
        'nivel',
        'roblox',
        'apoio-especifico',
      ],
    },
    {
      title: 'Recursos e continuidade',
      questions: [
        'catalogo',
        'liberacao',
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
      questions: ['equipamento', 'internet', 'salvamento', 'exportacao', 'ferias', 'pontos'],
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
    title: 'Uma parte do tempo no computador pode virar algo que vocês conhecem juntos',
    eyebrow: 'Para começar juntos',
    layout: 'band',
    visuals: [],
    groups: [
      {
        title: null,
        paragraphs: [
          'Seu filho mostra o personagem, começa a partida e conta o que resolveu mudar. Você experimenta o jogo e conhece um pouco do caminho até ele funcionar.',
          'A Comunidade oferece um começo guiado para essa experiência, com explicações para consultar, ferramentas para construir e projetos para compartilhar. Escolham o plano que cabe na rotina e abram juntos a primeira atividade.',
        ],
      },
    ],
    actions: [
      {
        label: 'Escolher um plano para minha família',
        href: '#planos',
      },
    ],
  },
} satisfies ComunidadePage
