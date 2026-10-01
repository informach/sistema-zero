// Copy aprovada: docs/marketing/kids/comunidade-dos-criadores/copy/quiz-comunidade.md
import type { SelecaoStep } from '../../../content/quiz-config'

export const COMMUNITY_QUESTIONS: SelecaoStep[] = [
  {
    id: 1,
    key: 'q1',
    lastStep: 'comunidade_q1',
    eventName: 'respondeu_comunidade_q1',
    tipo: 'selecao',
    etapa: 'filho',
    titulo: 'Qual é a faixa de idade do filho em quem você está pensando?',
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
        label: 'Investigar como programas funcionam',
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
    subtitulo: 'Pense no que você observou. Outras atividades também podem fazer parte da rotina.',
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
    titulo: 'Quais destas vontades ele já expressou?',
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
        label: 'Ainda não expressou vontade de criar algo assim',
      },
      {
        value: 'nao_sei',
        label: 'Ainda não sei dizer o que ele gostaria de criar',
      },
    ],
    subtitulo:
      'Pode marcar mais de uma. As opções “ainda não expressou” e “ainda não sei” devem ser usadas sozinhas.',
    multiple: true,
    maxSelections: 4,
    exclusive: ['nao_expressou', 'nao_sei'],
    shuffle: true,
    fixedLast: ['outro', 'nao_expressou', 'nao_sei'],
  },
  {
    id: 4,
    key: 'q4',
    lastStep: 'comunidade_q4',
    eventName: 'respondeu_comunidade_q4',
    tipo: 'selecao',
    etapa: 'objetivos',
    titulo: 'O que você mais gostaria de encontrar numa atividade para ele agora?',
    opcoes: [
      {
        value: 'A',
        label: 'Incluir aprendizagem no tempo de tela que a família já permite',
      },
      {
        value: 'B',
        label: 'Encontrar um começo para ele criar os próprios jogos',
      },
      {
        value: 'C',
        label: 'Dar espaço ao desenho em novas criações',
      },
      {
        value: 'D',
        label: 'Oferecer uma iniciação em programação com uma sequência para seguir',
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
      'Escolha até dois objetivos que tenham mais importância neste momento. Se sua procura for outra ou ainda estiver aberta, pode indicar isso.',
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
    id: 6,
    key: 'q5',
    lastStep: 'comunidade_q5',
    eventName: 'respondeu_comunidade_q5',
    tipo: 'selecao',
    etapa: 'objetivos',
    titulo: 'O que você mais precisa esclarecer antes de escolher uma atividade?',
    opcoes: [
      {
        value: 'interesse',
        label: 'Se ela vai despertar o interesse do meu filho',
      },
      {
        value: 'comeco',
        label: 'Como ele vai conseguir começar',
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
  },
  {
    id: 7,
    key: 'q6',
    lastStep: 'comunidade_q6',
    eventName: 'respondeu_comunidade_q6',
    tipo: 'selecao',
    etapa: 'comeco',
    titulo:
      'Quando tenta aprender algo novo no computador, que apoio ele costuma procurar primeiro?',
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
  },
  {
    id: 8,
    key: 'q7',
    lastStep: 'comunidade_q7',
    eventName: 'respondeu_comunidade_q7',
    tipo: 'selecao',
    etapa: 'comeco',
    titulo: 'Como esse formato se encaixa no que vocês procuram?',
    opcoes: [
      {
        value: 'pode_funcionar',
        label: 'Esse formato pode funcionar para a nossa família',
      },
      {
        value: 'prefere_ao_vivo',
        label: 'Costumo preferir aulas ao vivo, mas quero conhecer essa alternativa',
      },
      {
        value: 'conhecer',
        label: 'Ainda preciso entender melhor como funcionaria',
      },
      {
        value: 'exige_ao_vivo',
        label: 'Ter um professor ao vivo durante a atividade é indispensável',
      },
    ],
    subtitulo:
      'Na Comunidade, as aulas são gravadas: a criança pode pausar, rever um trecho e fazer a atividade no horário combinado pela família. Quando tem uma dúvida, pode pedir ajuda por mensagens. Esse apoio pode exigir espera; não há professor ao vivo durante a atividade.',
  },
  {
    id: 9,
    key: 'q8',
    lastStep: 'comunidade_q8',
    eventName: 'respondeu_comunidade_q8',
    tipo: 'selecao',
    etapa: 'comeco',
    titulo: 'Seu filho terá acesso a um computador com internet para fazer as atividades?',
    opcoes: [
      {
        value: 'disponivel',
        label: 'Sim, ele poderá usar um computador',
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
    subtitulo: 'As ferramentas da Comunidade são usadas pelo navegador, com mouse e teclado.',
  },
  {
    id: 10,
    key: 'qb',
    lastStep: 'comunidade_qb',
    eventName: 'respondeu_comunidade_qb',
    tipo: 'selecao',
    etapa: 'comeco',
    titulo:
      'Para a criação de jogos que vocês têm em mente, é indispensável usar alguma destas ferramentas?',
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
  },
  {
    id: 11,
    key: 'qc',
    lastStep: 'comunidade_qc',
    eventName: 'respondeu_comunidade_qc',
    tipo: 'selecao',
    etapa: 'comeco',
    titulo: 'Como você gostaria que o desenho participasse da atividade?',
    opcoes: [
      {
        value: 'interativo',
        label: 'Criando personagens e imagens para usar em jogos',
      },
      {
        value: 'sem_jogos',
        label: 'Quero uma atividade de desenho que não envolva jogos',
      },
      {
        value: 'ver_exemplo',
        label: 'Quero conhecer um exemplo dessa integração antes de decidir',
      },
      {
        value: 'nao_condiciona',
        label: 'O desenho é um interesse dele, mas não é uma condição para a nossa escolha',
      },
    ],
  },
]

export const OBJECTIVE_LABELS: Record<string, string> = {
  A: 'Aprendizagem no tempo de tela combinado',
  B: 'Criação dos próprios jogos',
  C: 'Desenho em novas criações',
  D: 'Uma sequência de iniciação em programação',
}
