import type { SelecaoStep } from '../../../content/quiz-config'

export interface DesafioQuestion extends SelecaoStep {
  stage: 'familia' | 'comeco' | 'procura' | 'orientacao'
}

export const DESAFIO_QUESTIONS: DesafioQuestion[] = [
  {
    key: 'idade',
    stage: 'familia',
    titulo: 'Quantos anos tem a criança ou adolescente em quem você está pensando?',
    tipo: 'selecao',
    etapa: 'filho',
    lastStep: 'desafio_idade',
    eventName: 'desafio_resposta_idade',
    opcoes: [
      {
        value: 'menos_9',
        label: 'Menos de 9 anos.',
      },
      {
        value: '9_11',
        label: 'De 9 a 11 anos.',
      },
      {
        value: '12_14',
        label: 'De 12 a 14 anos.',
      },
      {
        value: '15_mais',
        label: '15 anos ou mais.',
      },
    ],
    id: 1,
  },
  {
    key: 'equipamento',
    stage: 'familia',
    titulo: 'Para fazer uma atividade no computador, qual é a situação de vocês hoje?',
    tipo: 'selecao',
    etapa: 'filho',
    lastStep: 'desafio_equipamento',
    eventName: 'desafio_resposta_equipamento',
    opcoes: [
      {
        value: 'disponivel',
        label: 'Temos computador ou notebook com internet disponível para isso.',
      },
      {
        value: 'compartilhado',
        label: 'Temos, mas precisamos combinar os horários de uso.',
      },
      {
        value: 'sem_computador',
        label: 'Hoje só temos celular ou tablet para essa atividade.',
      },
      {
        value: 'a_conferir',
        label: 'Preciso conferir o equipamento e a conexão.',
      },
    ],
    id: 2,
  },
  {
    key: 'interesses',
    stage: 'comeco',
    titulo: 'Quais destas situações você já observou?',
    tipo: 'selecao',
    etapa: 'filho',
    lastStep: 'desafio_interesses',
    eventName: 'desafio_resposta_interesses',
    opcoes: [
      {
        value: 'joga',
        label: 'Ele gosta de jogar.',
      },
      {
        value: 'desenha',
        label: 'Ele gosta de desenhar.',
      },
      {
        value: 'inventa_historias',
        label: 'Ele inventa personagens ou histórias.',
      },
      {
        value: 'quer_criar',
        label: 'Ele já falou que gostaria de criar ou mudar um jogo.',
      },
      {
        value: 'nao_observei',
        label: 'Não observei essas situações; quero apresentar algo novo.',
      },
      {
        value: 'nao_sei',
        label: 'Não sei dizer.',
      },
    ],
    multiple: true,
    maxSelections: 4,
    exclusive: ['nao_observei', 'nao_sei'],
    subtitulo: 'Marque as situações que já observou. Elas podem acontecer juntas.',
    id: 3,
  },
  {
    key: 'experiencia',
    stage: 'comeco',
    titulo: 'Até onde seu filho já chegou ao tentar programar um jogo?',
    tipo: 'selecao',
    etapa: 'filho',
    lastStep: 'desafio_experiencia',
    eventName: 'desafio_resposta_experiencia',
    opcoes: [
      {
        value: 'primeira_vez',
        label: 'Ainda não tentou.',
      },
      {
        value: 'interrompida',
        label: 'Começou, mas ainda não conseguiu fazer uma versão funcionar.',
      },
      {
        value: 'guiada',
        label: 'Já fez uma versão funcionar seguindo uma atividade guiada.',
      },
      {
        value: 'independente',
        label: 'Já consegue montar jogos por conta própria.',
      },
      {
        value: 'nao_sei',
        label: 'Não sei dizer.',
      },
    ],
    id: 4,
  },
  {
    key: 'motivos',
    stage: 'procura',
    titulo: 'O que mais pesa para você ao procurar uma atividade como essa?',
    tipo: 'selecao',
    etapa: 'filho',
    lastStep: 'desafio_motivos',
    eventName: 'desafio_resposta_motivos',
    opcoes: [
      {
        value: 'A',
        label: 'Encontrar algo para ele construir dentro do tempo de tela que já combinamos.',
      },
      {
        value: 'B',
        label: 'Ver um primeiro jogo funcionando, construído por ele com orientação.',
      },
      {
        value: 'C',
        label: 'Dar espaço ao interesse dele por desenhos, personagens e histórias.',
      },
      {
        value: 'D',
        label: 'Conhecer uma iniciação em programação e entender o que ele aprende.',
      },
      {
        value: 'exploracao',
        label: 'Ainda estou procurando uma ideia para apresentar a ele.',
      },
      {
        value: 'outra_procura',
        label: 'O que procuro não aparece nessas opções.',
      },
    ],
    multiple: true,
    maxSelections: 2,
    exclusive: ['exploracao', 'outra_procura'],
    subtitulo: 'Escolha até duas opções.',
    id: 5,
  },
  {
    key: 'prioridade',
    stage: 'procura',
    titulo: 'Qual desses dois você gostaria de explorar primeiro?',
    tipo: 'selecao',
    etapa: 'filho',
    lastStep: 'desafio_prioridade',
    eventName: 'desafio_resposta_prioridade',
    opcoes: [
      {
        value: 'A',
        label: 'Encontrar algo para ele construir dentro do tempo de tela que já combinamos.',
      },
      {
        value: 'B',
        label: 'Ver um primeiro jogo funcionando, construído por ele com orientação.',
      },
      {
        value: 'C',
        label: 'Dar espaço ao interesse dele por desenhos, personagens e histórias.',
      },
      {
        value: 'D',
        label: 'Conhecer uma iniciação em programação e entender o que ele aprende.',
      },
      {
        value: 'iguais',
        label: 'Os dois têm o mesmo peso para mim.',
      },
    ],
    id: 6,
  },
  {
    key: 'duvida',
    stage: 'procura',
    titulo: 'O que você mais gostaria de esclarecer antes de escolher?',
    tipo: 'selecao',
    etapa: 'filho',
    lastStep: 'desafio_duvida',
    eventName: 'desafio_resposta_duvida',
    opcoes: [
      {
        value: 'interesse',
        label: 'Se ele vai querer participar da atividade.',
      },
      {
        value: 'companhia',
        label: 'Se vai precisar de mim ao lado o tempo todo.',
      },
      {
        value: 'ajuda',
        label: 'Como recebe ajuda quando uma parte não funciona.',
      },
      {
        value: 'rotina',
        label: 'Como encaixar as atividades na nossa rotina.',
      },
      {
        value: 'valor',
        label: 'O que recebemos pelo valor pago.',
      },
      {
        value: 'sem_duvida',
        label: 'Ainda não tenho uma dúvida específica.',
      },
    ],
    id: 7,
  },
  {
    key: 'formato',
    stage: 'orientacao',
    titulo: 'Que acompanhamento vocês procuram para esse começo?',
    tipo: 'selecao',
    etapa: 'filho',
    lastStep: 'desafio_formato',
    eventName: 'desafio_resposta_formato',
    opcoes: [
      {
        value: 'gravado',
        label: 'Podemos considerar aulas gravadas.',
      },
      {
        value: 'prefere_ao_vivo',
        label: 'Prefiro ao vivo, mas gostaria de conhecer como funciona uma atividade gravada.',
      },
      {
        value: 'exige_ao_vivo',
        label: 'Preciso de um professor ao vivo acompanhando a atividade.',
      },
      {
        value: 'a_conferir',
        label: 'Ainda preciso entender a diferença para escolher.',
      },
    ],
    id: 8,
  },
  {
    key: 'interesse_no_projeto',
    stage: 'orientacao',
    titulo: 'Você gostaria de apresentar esse primeiro projeto guiado ao seu filho?',
    tipo: 'selecao',
    etapa: 'filho',
    lastStep: 'desafio_interesse_no_projeto',
    eventName: 'desafio_resposta_interesse_no_projeto',
    opcoes: [
      {
        value: 'conhecer',
        label: 'Sim, gostaria de conhecer como ele faria.',
      },
      {
        value: 'conversar',
        label: 'Quero conversar com ele antes de escolher.',
      },
      {
        value: 'outra_atividade',
        label: 'Esse projeto não corresponde ao que estamos procurando.',
      },
    ],
    id: 9,
  },
  {
    key: 'desencontro',
    stage: 'orientacao',
    titulo: 'O que vocês gostariam de encontrar no lugar desse projeto?',
    tipo: 'selecao',
    etapa: 'filho',
    lastStep: 'desafio_desencontro',
    eventName: 'desafio_resposta_desencontro',
    opcoes: [
      {
        value: 'desenho',
        label: 'Uma atividade centrada em desenhar.',
      },
      {
        value: 'ferramenta_especifica',
        label: 'Um curso feito no Roblox ou Minecraft.',
      },
      {
        value: 'avancado',
        label: 'Um projeto mais avançado de programação.',
      },
      {
        value: 'outro',
        label: 'Outro tipo de atividade.',
      },
    ],
    id: 10,
  },
]
