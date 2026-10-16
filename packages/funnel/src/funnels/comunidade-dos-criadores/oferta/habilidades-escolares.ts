import { FAQ_ESCOLA, FAQ_ESCOLA_VISUALS } from './habilidades-escolares-faq'
import type { ComunidadePage } from './types'

/** Página F: habilidades escolares. Copy e revisão em docs/marketing/kids/comunidade-dos-criadores/copy/. */
export const PAGE_F = {
  id: 'habilidades-escolares',
  label: 'Habilidades da escola',
  seoTitle:
    'Criar jogos e praticar habilidades escolares | Comunidade dos Criadores | Sistema Zero',
  description:
    'Leitura, matemática, investigação e resolução de problemas nos jogos que seu filho cria. Conheça a Comunidade dos Criadores para crianças de 9 a 14 anos.',
  emphasis: 'ao que seu filho aprende na escola',
  heroVisual: 'aula-estudio',
  heroChip: 'Habilidades da escola',
  hero: {
    title: 'Criar jogos dá um uso concreto ao que seu filho aprende na escola',
    description:
      'Para montar uma regra, ele precisa entender a instrução, usar números e conferir o resultado. Com projetos guiados, o interesse por jogos abre espaço para praticar essas habilidades e mostrar a você o que conseguiu compreender.',
    benefits: [
      'Leitura, matemática e resolução de problemas nas decisões do projeto.',
      'Aulas guiadas, com explicações para pausar e rever durante a prática.',
      'Criações e registros para você acompanhar o que ele está fazendo.',
    ],
    requirements:
      'Para crianças de 9 a 14 anos. No navegador do computador, com internet, mouse e teclado. Uma atividade de criação complementar à escola.',
    primary: {
      label: 'Ver os planos para meu filho',
      href: '#planos',
    },
    secondary: {
      label: 'Ver como isso aparece na prática',
      href: '#experiencia',
    },
  },
  tourAfterSection: 'f01',
  sections: [
    {
      id: 'f01',
      title: 'Ele acompanha o exemplo, mas trava quando a pergunta muda',
      eyebrow: 'Entender a dificuldade',
      layout: 'story',
      visuals: ['aula'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Talvez você reconheça essa cena: seu filho olha a conta resolvida no caderno e consegue fazer outra parecida. Quando a pergunta muda um pouco, ele já não sabe por onde começar. Você volta à explicação, faz mais um exemplo e tenta descobrir onde ele se perdeu.',
            'Ele pode ter aprendido a repetir os passos e ainda não ter entendido o que aqueles números representam. Quando o ensino fica concentrado em explicar uma regra, copiar um exemplo e repetir exercícios, pode faltar a ligação com uma situação que a criança consiga enxergar e compreender.',
            'O jeito de ensinar também precisa entrar nessa conversa. Uma resposta errada, sozinha, não mostra que seu filho é incapaz ou que não quer aprender. Vale olhar para as oportunidades que ele teve de experimentar, entender o resultado e tirar a dúvida que ficou.',
            'Imagine agora um jogo em que um comando faz o personagem andar cinco passos. Seu filho muda o valor para dez e compara o movimento. O número corresponde a uma distância que ele consegue ver. Ao voltar ao valor anterior, tem duas situações para comparar e explicar.',
            'A aula ajuda a ligar o que ele observou ao significado do comando e do número. A conta ganha uma aplicação; a explicação passa a ter uma referência concreta. Esse é um caminho para trabalhar a compreensão enquanto ele constrói algo que tem interesse em fazer.',
            'Na Comunidade dos Criadores, as atividades integradas colocam a orientação junto do editor ou do experimento. Seu filho acompanha uma parte, faz a ação e confere o resultado. Você pode conhecer o que ele entendeu pelo que mostra e consegue explicar.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'f02',
      title: 'Um jogo de encontrar personagens já reúne várias formas de pensar',
      eyebrow: 'Um projeto por dentro',
      layout: 'story',
      visuals: ['contador'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Um dos exemplos mostrados aqui é um jogo de encontrar personagens escondidos num jardim. A cada descoberta, um contador aumenta. Para construir essa regra, seu filho precisa relacionar o toque no esconderijo, o personagem que aparece e o número que muda.',
            'A leitura ajuda a entender o pedido. A lógica organiza a sequência das ações. O contador guarda a quantidade de achados, e o teste permite conferir quando esse valor muda. Uma mesma tarefa reúne informações que precisam funcionar juntas.',
            'O primeiro passo pode ser acompanhar a montagem. Para conhecer o que entendeu, peça que mostre o que faz o número mudar e o que acontece quando toca num espaço vazio. Ele tem uma regra para explicar e um resultado para usar nessa explicação.',
            'O mesmo projeto permite uma conversa simples sobre contar e outra sobre guardar um valor, atualizá-lo e relacionar uma condição a um resultado. A profundidade depende da atividade e do que a criança já compreende. Na escola, entender um pedido, relacionar informações e conferir uma resposta também participam do trabalho de aprender.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'f03',
      title: 'Conhecimentos da escola encontram uma tarefa dentro da criação',
      eyebrow: 'A escola nas decisões do projeto',
      layout: 'cards',
      visuals: [],
      groups: [
        {
          title: 'Leitura: entender o que a tarefa pede',
          paragraphs: [
            'Uma instrução pede que o personagem apareça depois de um toque. Seu filho identifica a ação, o momento em que deve acontecer e como conferir se funcionou.',
            'Nos enunciados escolares, também precisa descobrir o que está sendo pedido. O projeto oferece uma situação para praticar essa leitura e voltar ao trecho que deixou dúvida.',
          ],
        },
        {
          title: 'Matemática: relacionar números e regras',
          paragraphs: [
            'O placar acumula pontos, as vidas diminuem e a posição de um objeto muda. Seu filho relaciona os valores ao que acontece na partida.',
            'Nas atividades que permitem mudar uma regra, pode prever o efeito de aumentar a pontuação e depois conferir. Operações, comparação de quantidades e valores que variam ganham uma aplicação que ele consegue observar.',
          ],
        },
        {
          title: 'Ciências: observar, comparar e investigar',
          paragraphs: [
            'No experimento do jardim, seu filho compara o que acontece ao tocar no esconderijo com a reação desligada e ligada. A mudança permite relacionar uma condição ao resultado observado.',
            'Observar, comparar e explicar o efeito de uma alteração são práticas que também participam da investigação em ciências. No projeto, a criança tem uma situação para examinar e testar novamente.',
          ],
        },
        {
          title: 'Resolução de problemas: escolher por onde começar',
          paragraphs: [
            'Uma ideia tem personagem, obstáculos e pontuação. Seu filho começa por uma parte, como fazer o personagem andar, e testa antes de acrescentar outra.',
            'Dividir o trabalho, ordenar os passos e conferir o que já fez são práticas úteis em tarefas escolares com várias etapas. No jogo, cada parte tem um resultado para examinar.',
          ],
        },
        {
          title: 'Arte e geometria: dar forma a uma ideia',
          paragraphs: [
            'Ao criar um personagem, seu filho combina formas, escolhe cores e ocupa um espaço. Quando leva o desenho ao jogo, confere tamanho, posição e contraste com o cenário.',
            'Escolher como combinar os elementos envolve composição visual. Ajustar largura, altura e distância permite explorar relações espaciais. Ele faz uma escolha e compara as versões.',
          ],
        },
        {
          title: 'Comunicação: explicar e ouvir uma ideia',
          paragraphs: [
            'Para apresentar o jogo, seu filho explica as regras. Para pedir ajuda por mensagem, descreve onde travou. Ao conversar sobre uma criação, escuta sugestões e explica suas escolhas.',
            'Fala, escrita, argumentação e escuta têm uma finalidade nessas situações. São práticas que também aparecem em apresentações, perguntas ao professor e trabalhos com colegas.',
          ],
        },
      ],
      actions: [
        {
          label: 'Ver os planos para meu filho',
          href: '#planos',
        },
      ],
    },
    {
      id: 'f04',
      title: 'A explicação acompanha o que ele está tentando fazer',
      eyebrow: 'Explicação e prática juntas',
      layout: 'story',
      visuals: ['pausa'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Uma explicação pode levar alguns segundos; seu filho pode precisar de mais tempo para localizar um comando e entender sua função. Nas atividades integradas, o vídeo e a orientação ficam junto do editor ou do experimento. Ele assiste, pausa para fazer e continua quando estiver pronto para acompanhar o próximo passo.',
            'Personagens e outros materiais preparados permitem começar pela regra. No Estúdio, os blocos representam instruções que ele monta e testa. Se o resultado ficou diferente, pode rever o trecho e comparar com a própria montagem. Textos, perguntas e materiais de consulta complementam a explicação conforme a aula.',
            'Algumas crianças precisam de companhia no começo para conhecer os controles e acompanhar a orientação. A programação é explicada nas aulas. Você participa ajudando com o acesso, os combinados da rotina e o interesse pelo que seu filho está construindo.',
            'A família escolhe o horário dentro do tempo de tela permitido. Ao voltar, o percurso registrado ajuda a encontrar onde continuar. Antes de encerrar, seu filho confere se a criação ficou guardada na conta.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'f05',
      title: 'Aprender também envolve descobrir como continuar depois de uma dificuldade',
      eyebrow: 'Um caminho para continuar',
      layout: 'story',
      visuals: ['regra', 'recados'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Seu filho montou uma regra, mas o personagem continua parado. A dificuldade pode ser descrita: ele esperava um movimento e precisa descobrir o que impediu aquela ação.',
            'Ele pode localizar o comando, comparar com a explicação e mudar uma parte por vez. Ao testar de novo, tem como observar o efeito daquela tentativa. Se continuar travado, já tem informações para formular uma pergunta: o que queria fazer, o que aconteceu e o que tentou.',
            'Quando a dúvida continua, o botão “Preciso de ajuda” permite enviar uma pergunta a partir da seção da aula. A conversa segue nos Recados, com histórico para consultar. O apoio acontece por mensagens, de forma assíncrona, e pode ser necessário aguardar o retorno. A assinatura não inclui encontros ao vivo.',
            'Na escola, também há momentos de reler o pedido, conferir uma etapa e pedir uma explicação. A criação oferece situações para praticar essas ações. Você pode observar como seu filho identifica uma dúvida e quais caminhos usa para continuar.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'f06',
      title: 'Você pode conhecer o raciocínio por trás da criação',
      eyebrow: 'Você acompanha',
      layout: 'band',
      visuals: ['responsavel', 'aprendizagem'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Seu filho abre o jogo e mostra o placar funcionando. Você pode pedir: “Me mostra quando esse número muda”. Depois: “O que você precisou fazer para isso acontecer?”.',
            'A conversa pode seguir por uma escolha de cor, uma regra ou uma tentativa que precisou revisar. Você conhece o que ele percebeu e como chegou àquela versão. Há algo concreto para experimentar juntos e uma conquista para ele apresentar.',
            'Na área do responsável, cada criança tem registros de cursos, atividades, entregas, temas explorados e etapa da Jornada. Esses registros ajudam a escolher uma produção para conhecer. A explicação do seu filho acrescenta o que ele entendeu sobre o próprio trabalho.',
            'Uma conversa pode aproximar os dois contextos. Se a escola está trabalhando multiplicação e o projeto permite mudar a pontuação, vocês podem relacionar os pontos de cada acerto ao total esperado. Se a dificuldade é começar uma tarefa, vale retomar como ele escolheu a primeira parte do jogo. A ligação fica no conceito e no caminho usado para resolver.',
            'Essas conversas podem acontecer durante uma partida juntos. A orientação das atividades fica nas aulas; seu interesse ajuda a criança a mostrar o que compreendeu e perceber onde mais aquela ideia aparece.',
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
      id: 'f07',
      title: 'Uma criação dá assunto para continuar aprendendo',
      eyebrow: 'Jornada do Criador',
      layout: 'story',
      visuals: ['jornada'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Seu filho pode voltar a uma criação para mudar o personagem ou experimentar outra regra. A Jornada do Criador organiza as etapas, os requisitos e as ferramentas disponíveis para seguir.',
            'Dentro das aulas, ele usa os recursos previstos para a atividade. Ao concluir o curso obrigatório de entrada e publicar o projeto exigido, chega ao posto Construtor e libera o uso livre do Estúdio e do Pinta. Assim, pode retomar uma criação e trabalhar novas escolhas.',
            'No posto Inventor, o Pensa ajuda a organizar ideias em tarefas, e o Zappy oferece orientação no Estúdio. São apoios com inteligência artificial: uma sugestão precisa ser compreendida e testada pela criança. O acesso depende dos requisitos da Jornada, da disponibilidade do serviço e dos créditos da família.',
            'No Clube, as conversas acontecem por publicações e respostas sobre projetos. A criança pode apresentar uma escolha e considerar uma sugestão. O responsável administra a visibilidade do perfil; jogos publicados por link têm visibilidade pública própria. Os combinados de compartilhamento continuam sendo da família.',
            'A assinatura inclui os cursos publicados e os que forem acrescentados durante o período contratado. O catálogo mostra o que está disponível hoje; algumas etapas dependem de cursos ainda em preparação.',
          ],
        },
      ],
      actions: [],
    },
  ],
  faqTitle: 'Mais sobre a experiência do seu filho',
  faqGroups: [
    {
      title: 'Aprendizagem e escola',
      questions: ['escola', 'notas', 'interesse', 'aprendizagem', 'serie'],
    },
    {
      title: 'Começo e apoio',
      questions: [
        'matematica',
        'leitura',
        'programacao',
        'pais',
        'aulas-gravadas',
        'ajuda',
        'nivel',
        'apoio-especifico',
        'desenho',
        'so-desenho',
        'papel',
        'roblox',
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
        'custos',
        'certificado',
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
    title: 'Uma criação para mostrar e um raciocínio para explicar',
    eyebrow: 'Para começar juntos',
    layout: 'band',
    visuals: [],
    groups: [
      {
        title: null,
        paragraphs: [
          'Seu filho chama você para jogar, mostra uma regra e conta como resolveu uma dificuldade. Você conhece a conta que usou, a ideia que mudou e o que ele consegue explicar sobre a própria criação.',
          'A Comunidade oferece aulas guiadas, ferramentas e um caminho de ajuda para começar essa experiência. Escolham o plano que cabe na rotina da família e conheçam juntos a primeira atividade.',
        ],
      },
    ],
    actions: [
      {
        label: 'Escolher um plano para meu filho',
        href: '#planos',
      },
    ],
  },
  faq: FAQ_ESCOLA,
  faqVisuals: FAQ_ESCOLA_VISUALS,
} satisfies ComunidadePage
