// Tráfego frio, v4: docs/marketing/kids/comunidade-dos-criadores/copy/quiz-comunidade.md
import type { SelecaoStep } from '../../../content/quiz-config'

export const COMMUNITY_QUESTIONS: SelecaoStep[] = [
  {
    id: 1,
    key: 'q1',
    lastStep: 'comunidade_q1',
    eventName: 'respondeu_comunidade_q1',
    tipo: 'selecao',
    etapa: 'filho',
    titulo: 'Qual é a idade do filho em quem você está pensando?',
    opcoes: [
      {
        value: 'ate_8',
        label: 'Até 8 anos',
      },
      {
        value: '9_a_11',
        label: 'De 9 a 11 anos',
      },
      {
        value: '12_a_14',
        label: 'De 12 a 14 anos',
      },
      {
        value: '15_mais',
        label: '15 anos ou mais',
      },
    ],
  },
  {
    id: 2,
    key: 'q2',
    lastStep: 'comunidade_q2',
    eventName: 'respondeu_comunidade_q2',
    tipo: 'selecao',
    etapa: 'filho',
    titulo:
      'No último mês, qual destas atividades ele procurou com mais frequência por vontade própria?',
    opcoes: [
      {
        value: 'jogar',
        label: 'Jogar',
      },
      {
        value: 'desenhar',
        label: 'Desenhar',
      },
      {
        value: 'criar_jogo',
        label: 'Tentar criar ou modificar um jogo',
      },
      {
        value: 'investigar_programas',
        label: 'Procurar entender como um programa funciona',
      },
      {
        value: 'videos',
        label: 'Assistir a vídeos',
      },
      {
        value: 'outra',
        label: 'Outra atividade',
      },
      {
        value: 'variado',
        label: 'Variou bastante; não percebi uma atividade mais frequente',
      },
      {
        value: 'nao_sei',
        label: 'Não sei dizer',
      },
    ],
    subtitulo:
      'Considere o último mês e escolha o que mais observou. Pode ser no computador, no celular ou fora das telas.',
    shuffle: true,
    fixedLast: ['outra', 'variado', 'nao_sei'],
  },
  {
    id: 3,
    key: 'q3',
    lastStep: 'comunidade_q3',
    eventName: 'respondeu_comunidade_q3',
    tipo: 'selecao',
    etapa: 'filho',
    titulo: 'Seu filho já falou que gostaria de fazer alguma destas coisas?',
    opcoes: [
      {
        value: 'jogo',
        label: 'Fazer um jogo próprio',
      },
      {
        value: 'visual',
        label: 'Criar desenhos ou personagens',
      },
      {
        value: 'programacao',
        label: 'Entender como se programa',
      },
      {
        value: 'outro',
        label: 'Fazer outro tipo de criação',
      },
      {
        value: 'nao_expressou',
        label: 'Ele ainda não falou em criar algo assim',
      },
      {
        value: 'nao_sei',
        label: 'Ainda não sei dizer o que ele gostaria de criar',
      },
    ],
    subtitulo:
      'Pode marcar mais de uma vontade. Se ele ainda não falou sobre isso ou você não souber dizer, escolha a opção correspondente.',
    multiple: true,
    maxSelections: 4,
    exclusive: ['nao_expressou', 'nao_sei'],
    shuffle: true,
    fixedLast: ['outro', 'nao_expressou', 'nao_sei'],
  },
  {
    id: 7,
    key: 'q6',
    lastStep: 'comunidade_q6',
    eventName: 'respondeu_comunidade_q6',
    tipo: 'selecao',
    etapa: 'filho',
    titulo:
      'Quando encontra uma dificuldade ao aprender algo no computador, o que ele costuma fazer primeiro?',
    opcoes: [
      {
        value: 'rever',
        label: 'Volta a uma explicação ou a um exemplo',
      },
      {
        value: 'pessoa',
        label: 'Pede ajuda a uma pessoa',
      },
      {
        value: 'experimentar',
        label: 'Faz algumas tentativas para ver o que acontece',
      },
      {
        value: 'varia',
        label: 'Varia bastante conforme a atividade',
      },
      {
        value: 'nao_observou',
        label: 'Ainda não observei uma situação assim',
      },
    ],
    shuffle: true,
    fixedLast: ['varia', 'nao_observou'],
    subtitulo:
      'Pense numa situação que você já viu acontecer. Se ainda não observou, pode indicar isso.',
  },
  {
    id: 6,
    key: 'q5',
    lastStep: 'comunidade_q5',
    eventName: 'respondeu_comunidade_q5',
    tipo: 'selecao',
    etapa: 'objetivos',
    titulo: 'O que você gostaria de entender melhor antes de escolher uma atividade para ele?',
    opcoes: [
      {
        value: 'interesse',
        label: 'Se ela vai despertar o interesse do meu filho',
      },
      {
        value: 'comeco',
        label: 'Como ele vai dar os primeiros passos',
      },
      {
        value: 'ajuda',
        label: 'Que ajuda terá quando surgir uma dúvida',
      },
      {
        value: 'aprendizagem',
        label: 'Como eu vou acompanhar o que ele está aprendendo',
      },
      {
        value: 'rotina',
        label: 'Como encaixar a atividade na rotina',
      },
      {
        value: 'investimento',
        label: 'Se o investimento cabe no nosso planejamento',
      },
      {
        value: 'sem_duvida',
        label: 'Ainda não tenho uma dúvida principal',
      },
    ],
    shuffle: true,
    fixedLast: ['sem_duvida'],
    subtitulo: 'Escolha o ponto que mais pesa para você agora.',
  },
  {
    id: 4,
    key: 'q4',
    lastStep: 'comunidade_q4',
    eventName: 'respondeu_comunidade_q4',
    tipo: 'selecao',
    etapa: 'objetivos',
    titulo: 'Pensando numa atividade nova, o que você mais gostaria de ver seu filho fazendo?',
    opcoes: [
      {
        value: 'A',
        label: 'Usando parte do tempo de tela que já tem para criar algo e mostrar o que aprendeu',
      },
      {
        value: 'B',
        label: 'Tirando uma ideia de jogo do papel e testando como ela funciona',
      },
      {
        value: 'C',
        label: 'Criando desenhos e personagens e encontrando novos usos para essas ideias',
      },
      {
        value: 'D',
        label: 'Aprendendo programação passo a passo e entendendo como os comandos funcionam',
      },
      {
        value: 'outro',
        label: 'O que procuro não aparece nessas opções',
      },
      {
        value: 'explorar',
        label: 'Preciso conhecer atividades antes de escolher',
      },
    ],
    subtitulo:
      'Imagine uma atividade que valesse a pena para vocês. Escolha até duas possibilidades; se ainda estiver conhecendo os caminhos, pode dizer isso.',
    multiple: true,
    maxSelections: 2,
    exclusive: ['outro', 'explorar'],
    shuffle: true,
    fixedLast: ['outro', 'explorar'],
  },
  {
    id: 5,
    key: 'qt',
    lastStep: 'comunidade_qt',
    eventName: 'respondeu_comunidade_qt',
    tipo: 'selecao',
    etapa: 'objetivos',
    titulo: 'Você marcou dois objetivos. Qual deles gostaria de explorar primeiro?',
    opcoes: [
      {
        value: 'A',
        label: 'Aprendizagem no tempo de tela combinado',
      },
      {
        value: 'B',
        label: 'Criação dos próprios jogos',
      },
      {
        value: 'C',
        label: 'Desenho em novas criações',
      },
      {
        value: 'D',
        label: 'Uma sequência de iniciação em programação',
      },
      {
        value: 'iguais',
        label: 'Os dois têm o mesmo peso para mim',
      },
    ],
  },
  {
    id: 10,
    key: 'qb',
    lastStep: 'comunidade_qb',
    eventName: 'respondeu_comunidade_qb',
    tipo: 'selecao',
    etapa: 'comeco',
    titulo: 'Para criar jogos, ele precisa usar uma ferramenta específica?',
    opcoes: [
      {
        value: 'roblox',
        label: 'Precisa ser Roblox',
      },
      {
        value: 'minecraft',
        label: 'Precisa ser Minecraft',
      },
      {
        value: 'outra_especifica',
        label: 'Precisa ser outra ferramenta específica',
      },
      {
        value: 'flexivel',
        label: 'Podemos conhecer outra ferramenta de criação de jogos',
      },
      {
        value: 'conversar',
        label: 'Ainda preciso conversar sobre isso com meu filho',
      },
    ],
    shuffle: true,
    fixedLast: ['conversar'],
    subtitulo:
      'Pense no que ele espera criar. Se ainda não conversaram sobre a ferramenta, pode indicar isso.',
  },
  {
    id: 11,
    key: 'qc',
    lastStep: 'comunidade_qc',
    eventName: 'respondeu_comunidade_qc',
    tipo: 'selecao',
    etapa: 'comeco',
    titulo: 'Como vocês gostariam de aproveitar o interesse pelo desenho?',
    opcoes: [
      {
        value: 'interativo',
        label: 'Criar personagens e imagens que possam entrar em jogos',
      },
      {
        value: 'sem_jogos',
        label: 'Quero uma atividade de desenho que não envolva jogos',
      },
      {
        value: 'ver_exemplo',
        label: 'Ainda não conheço essas possibilidades; gostaria de ver um exemplo',
      },
      {
        value: 'nao_condiciona',
        label: 'O desenho é um interesse dele, mas não é uma condição para a nossa escolha',
      },
    ],
    subtitulo: 'Escolha a possibilidade que combina mais com o que vocês procuram.',
  },
  {
    id: 8,
    key: 'q7',
    lastStep: 'comunidade_q7',
    eventName: 'respondeu_comunidade_q7',
    tipo: 'selecao',
    etapa: 'comeco',
    titulo: 'Que tipo de acompanhamento você consideraria para seu filho aprender em casa?',
    opcoes: [
      {
        value: 'pode_funcionar',
        label: 'Considero aulas gravadas com ajuda por mensagens',
      },
      {
        value: 'prefere_ao_vivo',
        label: 'Prefiro aulas ao vivo, mas posso conhecer outras formas de acompanhamento',
      },
      {
        value: 'conhecer',
        label: 'Ainda não sei qual formato funcionaria melhor para nós',
      },
      {
        value: 'exige_ao_vivo',
        label: 'Ter um professor ao vivo durante a atividade é indispensável',
      },
    ],
    subtitulo: 'Pense no que faria sentido para ele e para a rotina de vocês.',
  },
  {
    id: 9,
    key: 'q8',
    lastStep: 'comunidade_q8',
    eventName: 'respondeu_comunidade_q8',
    tipo: 'selecao',
    etapa: 'comeco',
    titulo: 'Como seu filho teria acesso a um computador para fazer uma atividade em casa?',
    opcoes: [
      {
        value: 'disponivel',
        label: 'Ele poderá usar um computador',
      },
      {
        value: 'organizar',
        label: 'Temos computador, mas preciso organizar os horários de uso',
      },
      {
        value: 'celular_tablet',
        label: 'Por enquanto, só temos celular ou tablet disponíveis para ele',
      },
      {
        value: 'verificar',
        label: 'Ainda preciso verificar',
      },
    ],
    subtitulo:
      'Pode ser um computador compartilhado. Considere o acesso à internet, ao mouse e ao teclado.',
  },
]

export const OBJECTIVE_LABELS: Record<string, string> = {
  A: 'Aprendizagem no tempo de tela combinado',
  B: 'Criação dos próprios jogos',
  C: 'Desenho em novas criações',
  D: 'Uma sequência de iniciação em programação',
}
