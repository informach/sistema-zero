// Conteúdo do funil "Desafio do Primeiro Jogo" (kids, /kids). Copy VERBATIM do
// briefing da usuária (quiz-desafio-primeiro-jogo.md): 10 perguntas SPIN, tela de
// resultado por perfil (nomeado pela P1), landing e /obrigado. A comunicação é
// SEMPRE dirigida aos pais (CONANDA/ECA). A página de vendas NÃO vive aqui (tem
// layout próprio em DesafioOfertaBody.astro) — só o intro por perfil, via `hero`.

import type { HeroVariacao } from '../../content/hero-perfil'
import type { QuizStep } from '../../content/quiz-config'
import type { ResultProfile } from '../../content/result-profiles'
import type { FunnelCopy, FunnelLanding, FunnelObrigado } from '../registry'

export const DESAFIO_PRODUTO: FunnelCopy = {
  nome: 'Desafio do Primeiro Jogo',
  precoLabel: 'R$ 37',
}

export const DESAFIO_LANDING: FunnelLanding = {
  h1: 'Seu filho mergulha de cabeça no que gosta?',
  subtitulo:
    'Responda em 2 minutos e descubra qual caminho pode ajudar esse interesse intenso a virar criação, aprendizado e um primeiro jogo feito por ele.',
  tempo: 'Leva apenas 2 minutos para responder.',
}

// As 10 perguntas, na ordem SPIN (Situação → Problema → Implicação → Necessidade →
// Diagnóstico). O perfil (P1) é o `value` direto — o NOME do tipo só aparece no
// resultado, nunca nas opções. Emojis no `badge`; a P1 usa fotos ilustrativas (uma
// por perfil, para o pai se identificar) com `imagemLayout: 'topo'` (foto no topo
// do card + texto embaixo). As demais perguntas seguem com cards/emoji.
export const DESAFIO_QUIZ_STEPS: QuizStep[] = [
  {
    id: 1,
    key: 'perfil_p1',
    lastStep: 'quiz_pergunta_1',
    eventName: 'respondeu_pergunta_1',
    tipo: 'multipla_escolha',
    comImagem: true,
    imagemLayout: 'topo',
    titulo: 'Quando seu filho se interessa muito por alguma coisa, o que mais parece acontecer aí?',
    opcoes: [
      {
        value: 'explorador',
        badge: '🧭',
        image: '/img/desafio-primeiro-jogo/p1-explorador.webp',
        label:
          'Ele quer explorar tudo na hora: testa, pergunta, clica, mexe e já quer descobrir a próxima novidade',
      },
      {
        value: 'especialista',
        badge: '📚',
        image: '/img/desafio-primeiro-jogo/p1-especialista.webp',
        label:
          'Ele entra fundo em um tema e sabe detalhes que muita gente nem imagina, seja sobre jogos, dinossauros, espaço, personagens, tecnologia ou outro assunto',
      },
      {
        value: 'foguete',
        badge: '🔥',
        image: '/img/desafio-primeiro-jogo/p1-foguete.webp',
        label:
          'Ele começa com uma energia enorme, mas se demora para ver resultado, o foco esfria antes de terminar',
      },
      {
        value: 'investigador',
        badge: '🧩',
        image: '/img/desafio-primeiro-jogo/p1-investigador.webp',
        label:
          'Ele quer entender como as coisas funcionam por dentro: regras, peças, comandos, fases, mecanismos e por que isso acontece',
      },
    ],
  },
  {
    id: 2,
    key: 'horas_tela_passiva_dia',
    lastStep: 'quiz_pergunta_2',
    eventName: 'respondeu_pergunta_2',
    tipo: 'input_numero',
    titulo:
      'Pensando nos momentos em que esse interesse vai para as telas, em média quantas horas por dia seu filho passa jogando, assistindo vídeos, vendo tutoriais ou pesquisando, sem transformar isso em uma criação feita por ele? Não precisa ser exato, só uma estimativa.',
    label: 'Horas por dia em tela só consumindo',
    unidade: 'horas',
    min: 0,
    max: 24,
  },
  {
    id: 3,
    key: 'foco_onde',
    lastStep: 'quiz_pergunta_3',
    eventName: 'respondeu_pergunta_3',
    tipo: 'multipla_escolha',
    titulo: 'Onde esse interesse intenso aparece mais hoje?',
    opcoes: [
      {
        value: 'jogos',
        badge: '🎮',
        label: 'Em jogos: ele joga, observa fases, personagens, regras e estratégias',
      },
      {
        value: 'tecnologia',
        badge: '🤖',
        label:
          'Em tecnologia: ele gosta de mexer, configurar, testar, desmontar ou entender como funciona',
      },
      {
        value: 'temas_especificos',
        badge: '🦖',
        label:
          'Em temas específicos: dinossauros, espaço, animais, personagens, histórias, mapas ou coleções',
      },
      {
        value: 'videos_tutoriais',
        badge: '📺',
        label:
          'Em vídeos e tutoriais: ele assiste muito sobre o mesmo assunto, mas quase nunca transforma isso em algo próprio',
      },
    ],
  },
  {
    id: 4,
    key: 'ja_largou',
    lastStep: 'quiz_pergunta_4',
    eventName: 'respondeu_pergunta_4',
    tipo: 'sim_nao',
    titulo: 'Já aconteceu de o seu filho começar uma atividade animado e largar antes de terminar?',
    opcaoSim: 'Sim, isso é comum aqui',
    opcaoNao: 'Não, ele costuma terminar o que começa',
  },
  {
    id: 5,
    key: 'maior_incomodo',
    lastStep: 'quiz_pergunta_5',
    eventName: 'respondeu_pergunta_5',
    tipo: 'multipla_escolha',
    titulo: 'Pensando nesse interesse intenso do seu filho, o que mais te incomoda hoje?',
    opcoes: [
      {
        value: 'consome_nao_cria',
        badge: '🧩',
        label: 'Ele consome muito sobre o que ama, mas quase nada disso vira algo criado por ele',
      },
      {
        value: 'copia_e_trava',
        badge: '📝',
        label: 'Ele copia coisas de tutorial, mas trava quando precisa mudar algo',
      },
      {
        value: 'tela_e_tensao',
        badge: '⏳',
        label: 'Esse interesse às vezes vira só mais tempo de tela e tensão em casa',
      },
      {
        value: 'interesse_sem_resultado',
        badge: '🎮',
        label:
          'Ele tem um interesse forte por jogos, tecnologia ou algum tema específico, mas isso ainda não virou uma habilidade concreta',
      },
    ],
  },
  {
    id: 6,
    key: 'horas_ano_calculadas',
    lastStep: 'quiz_pergunta_6',
    eventName: 'respondeu_pergunta_6',
    tipo: 'calculadora_prefilled',
    titulo:
      'Vamos colocar na ponta do lápis. Quantas horas de tela só consumindo o seu filho acumula ao longo de um ano?',
    campo1: {
      key: 'horas_tela_passiva_dia',
      label: 'Horas por dia em tela só consumindo',
      unidade: 'horas',
      sourceKey: 'horas_tela_passiva_dia',
    },
    campo2: {
      key: 'dias_por_semana',
      label: 'Dias por semana que isso se repete',
      unidade: 'dias',
    },
    resultadoKey: 'horas_ano_calculadas',
    multiplicador: 52,
    textoResultado:
      'São cerca de {resultado} horas por ano em que esse foco aparece na tela, em jogos, vídeos, tutoriais ou pesquisas. A ideia não é cortar esse tempo. É direcionar uma pequena parte dele para o seu filho criar algo próprio.',
  },
  {
    id: 7,
    key: 'incomodo_tempo_tela',
    lastStep: 'quiz_pergunta_7',
    eventName: 'respondeu_pergunta_7',
    tipo: 'slider',
    titulo:
      'Vendo esse número, o quanto você sente vontade de transformar uma pequena parte desse tempo em algo mais criativo para o seu filho?',
    min: 1,
    max: 10,
    minLabel: 'Por enquanto não é prioridade',
    maxLabel: 'Quero começar a mudar isso logo',
  },
  {
    id: 8,
    key: 'visualizacao',
    lastStep: 'quiz_pergunta_8',
    eventName: 'respondeu_pergunta_8',
    tipo: 'multipla_escolha',
    titulo:
      'Imagine que daqui a 3 dias o seu filho já criou o primeiro joguinho dele, funcionando na tela. O que você mais gostaria de ver acontecer primeiro?',
    opcoes: [
      {
        value: 'mostrar_familia',
        badge: '👨‍👩‍👧',
        label: 'Ele chamando a família para mostrar o jogo que ele mesmo montou',
      },
      {
        value: 'escola_colegas',
        badge: '🏫',
        label: 'Ele levando o jogo para a escola e os colegas pedindo para jogar',
      },
      {
        value: 'abrir_para_criar',
        badge: '😊',
        label: 'Ele abrindo o computador com vontade de criar, não só de jogar',
      },
      {
        value: 'terminar_e_continuar',
        badge: '🔁',
        label: 'Ele terminando algo do começo ao fim e pedindo para fazer o próximo',
      },
    ],
  },
  {
    id: 9,
    key: 'o_que_pesa',
    lastStep: 'quiz_pergunta_9',
    eventName: 'respondeu_pergunta_9',
    tipo: 'multipla_escolha',
    titulo: 'Para você dar esse passo com tranquilidade hoje, o que mais pesa na sua decisão?',
    opcoes: [
      {
        value: 'terminar',
        badge: '🎯',
        label: 'Quero sentir que a trilha ajuda meu filho a chegar até o fim',
      },
      {
        value: 'baixo_custo',
        badge: '💰',
        label: 'Quero testar com baixo custo antes de investir em algo maior',
      },
      {
        value: 'autonomia',
        badge: '🧭',
        label: 'Quero conseguir acompanhar o meu filho sendo leigo em programação',
      },
      {
        value: 'rapido_divertido',
        badge: '⚡',
        label: 'Quero algo rápido, divertido e com resultado visível nos primeiros dias',
      },
    ],
  },
  {
    id: 10,
    key: 'o_que_quer',
    lastStep: 'quiz_pergunta_10',
    eventName: 'respondeu_pergunta_10',
    tipo: 'multipla_escolha',
    titulo:
      'Pensando no que esse interesse intenso pode virar, o que você mais quer para o seu filho?',
    opcoes: [
      {
        value: 'criar_proprio',
        badge: '🚀',
        label: 'Que ele crie algo próprio, não só consuma o que os outros fazem',
      },
      {
        value: 'desenvolver_habilidade',
        badge: '🙂',
        label: 'Que ele desenvolva uma habilidade no assunto que ama',
      },
      {
        value: 'terminar_e_mostrar',
        badge: '🤔',
        label: 'Que ele termine um projeto e mostre com orgulho',
      },
      {
        value: 'virar_aprendizado',
        badge: '🧐',
        label: 'Que esse foco vire aprendizado de verdade, e não só passatempo',
      },
    ],
  },
]

export const DESAFIO_TOTAL = DESAFIO_QUIZ_STEPS.length

// Tela de resultado. O perfil = a resposta da P1; o NOME do tipo aparece aqui. O
// `corpo` traz os marcadores {resposta_p3}/{resposta_p5}/{resultado}, resolvidos
// por `desafioRenderCorpo`. As linhas "O que isso mostra" e "O caminho" são
// distintas por perfil; as demais seguem o mesmo formato nos 4. (Verbatim do doc.)
export const DESAFIO_FECHO =
  'O foco intenso do seu filho é uma força. Falta dar a ele um caminho para esse interesse virar criação, aprendizado e visão de futuro.'

const RESULT_CTA = 'Ver a trilha de 3 dias'

export const DESAFIO_RESULT_PROFILES: Record<string, ResultProfile> = {
  explorador: {
    titulo: 'Seu filho tem o perfil de O Explorador',
    corpo:
      'O que isso mostra: ele testa de tudo um pouco e abre muitas frentes, mas raramente fecha alguma antes de partir para a próxima. O ponto de atenção: {resposta_p5}. A oportunidade: São cerca de {resultado} horas por ano em que esse foco aparece na tela. Como esse interesse aparece mais em {resposta_p3}, dá para começar criando algo nesse universo. O caminho: dar a ele uma frente única e curta para fechar, em que cada dia entrega uma vitória visível antes que a curiosidade migre para outra coisa.',
    cta: RESULT_CTA,
  },
  especialista: {
    titulo: 'Seu filho tem o perfil de O Especialista',
    corpo:
      'O que isso mostra: ele acumula conhecimento profundo sobre o que ama, mas esse repertório fica guardado, sem virar algo que ele construa. O ponto de atenção: {resposta_p5}. A oportunidade: São cerca de {resultado} horas por ano em que esse foco aparece na tela. Como esse interesse aparece mais em {resposta_p3}, dá para começar criando algo nesse universo. O caminho: usar o tema que ele domina como matéria-prima de uma criação, transformando o que ele sabe em algo feito pelas mãos dele.',
    cta: RESULT_CTA,
  },
  foguete: {
    titulo: 'Seu filho tem o perfil de O Foguete',
    corpo:
      'O que isso mostra: ele dispara com energia total no começo, mas perde tração quando o resultado fica longe e a empolgação esfria antes do fim. O ponto de atenção: {resposta_p5}. A oportunidade: São cerca de {resultado} horas por ano em que esse foco aparece na tela. Como esse interesse aparece mais em {resposta_p3}, dá para começar criando algo nesse universo. O caminho: encurtar a distância entre começar e ver algo funcionando, com etapas tão rápidas que o resultado chega antes da energia cair.',
    cta: RESULT_CTA,
  },
  investigador: {
    titulo: 'Seu filho tem o perfil de O Investigador',
    corpo:
      'O que isso mostra: ele quer abrir, desmontar e entender o mecanismo por dentro, mas para nas regras prontas dos outros sem montar as próprias. O ponto de atenção: {resposta_p5}. A oportunidade: São cerca de {resultado} horas por ano em que esse foco aparece na tela. Como esse interesse aparece mais em {resposta_p3}, dá para começar criando algo nesse universo. O caminho: entregar uma base pronta o bastante para começar e aberta o bastante para ele mexer por dentro, virando quem define as regras em vez de só segui-las.',
    cta: RESULT_CTA,
  },
}

// Hero da /oferta por perfil. O DesafioOfertaBody só usa a `abertura` (linha de
// intro acima do H1, que retoma a segmentação do quiz). `titulo`/`botao` existem
// por causa do tipo; o body bespoke não os lê. Sem perfil → `padrao` (sem intro).
const HERO_H1 =
  'Use o interesse intenso do seu filho a favor dele: em 3 dias, ele monta o primeiro jogo'
const HERO_BOTAO = 'Quero o primeiro jogo do meu filho em 3 dias'

export const DESAFIO_HERO_PADRAO: HeroVariacao = {
  titulo: HERO_H1,
  abertura: '',
  botao: HERO_BOTAO,
}

export const DESAFIO_HERO_POR_PERFIL: Record<string, HeroVariacao> = {
  explorador: {
    titulo: HERO_H1,
    abertura:
      'Para o foco de O Explorador, o caminho é uma frente única e curta para fechar, com uma vitória visível por dia; é o que estes 3 dias fazem.',
    botao: HERO_BOTAO,
  },
  especialista: {
    titulo: HERO_H1,
    abertura:
      'Para o foco de O Especialista, o caminho é transformar o tema que ele domina em algo feito pelas mãos dele; é o que estes 3 dias fazem.',
    botao: HERO_BOTAO,
  },
  foguete: {
    titulo: HERO_H1,
    abertura:
      'Para o foco de O Foguete, o caminho é encurtar a distância entre começar e ver algo funcionando; é o que estes 3 dias fazem.',
    botao: HERO_BOTAO,
  },
  investigador: {
    titulo: HERO_H1,
    abertura:
      'Para o foco de O Investigador, o caminho é uma base aberta para ele mexer por dentro e definir as próprias regras; é o que estes 3 dias fazem.',
    botao: HERO_BOTAO,
  },
}

// Conteúdo da /obrigado (entrega + primeiros passos), em linguagem para os pais.
export const DESAFIO_OBRIGADO: FunnelObrigado = {
  entrega: [
    'Trilha guiada de 3 dias (uma vitória por dia)',
    'Estúdio e blocos feitos pra criança, sem instalar nada',
    'Link do jogo pra compartilhar com a família e os amigos',
    'Passo a passo em vídeo (aula guiada)',
    'Mapa dos pais, em linguagem para quem não é de tecnologia',
    'Certificado simples de conclusão',
  ],
  passos: [
    {
      titulo: 'Abra seu e-mail',
      texto:
        'Enviamos o acesso ao Desafio do Primeiro Jogo para o e-mail usado na compra. Se não encontrar em alguns minutos, confira a caixa de spam ou promoções.',
    },
    {
      titulo: 'Crie sua senha',
      texto:
        'Primeiro acesso? O link do e-mail leva direto para definir a sua senha. Já tem conta? É só entrar normalmente.',
    },
    {
      titulo: 'Comece o Dia 1 com seu filho',
      texto:
        'A trilha de 3 dias e os materiais já estão na área de membros. É só abrir o computador com seu filho e começar pela primeira vitória.',
    },
  ],
}
