// Conteúdo do funil "Desafio do Primeiro Jogo" (kids, /kids): 10 perguntas SPIN,
// tela de resultado por perfil (nomeado pela P1), landing e /obrigado. Copy na
// decisão de 2026-08-14: o filtro fala de COMPORTAMENTO observável (vive em jogo,
// computador e tecnologia); o termo clínico e as variações de intensidade só
// existem na história do André, nos bodies de oferta (guarda:
// tests/unit/copy-vocabulario.test.ts). A comunicação é SEMPRE dirigida aos pais
// (CONANDA/ECA). A página de vendas NÃO vive aqui (DesafioOfertaBody.astro).

import type { HeroVariacao } from '../../content/hero-perfil'
import type { QuizStep } from '../../content/quiz-config'
import type { ResultProfile } from '../../content/result-profiles'
import type { FunnelCopy, FunnelLanding, FunnelObrigado } from '../registry'

export const DESAFIO_PRODUTO: FunnelCopy = {
  nome: 'Desafio do Primeiro Jogo',
  precoLabel: 'R$ 67',
}

export const DESAFIO_LANDING: FunnelLanding = {
  badge: 'Quiz rápido para mães, pais e responsáveis',
  h1: 'Seu filho já vive entre jogos e telas. Descubra como transformar uma parte desse tempo em criação.',
  subtitulo:
    'Responda 10 perguntas sobre o jeito como ele explora jogos e tecnologia. Em menos de 3 minutos, você recebe um perfil com um primeiro caminho possível — sem diagnóstico e sem promessas mágicas.',
  tempo: 'Gratuito · menos de 3 minutos · resultado na hora',
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
    titulo: 'Quando seu filho se interessa muito por alguma coisa, o que mais parece acontecer?',
    opcoes: [
      {
        value: 'explorador',
        badge: '🧭',
        image: '/img/desafio-primeiro-jogo/p1-explorador.webp',
        label: 'Quer explorar tudo: testa, pergunta, clica e logo procura outra novidade.',
      },
      {
        value: 'especialista',
        badge: '📚',
        image: '/img/desafio-primeiro-jogo/p1-especialista.webp',
        label: 'Mergulha em um tema e aprende detalhes que pouca gente percebe.',
      },
      {
        value: 'foguete',
        badge: '🔥',
        image: '/img/desafio-primeiro-jogo/p1-foguete.webp',
        label: 'Começa com muita energia, mas pode perder o interesse se o resultado demora.',
      },
      {
        value: 'investigador',
        badge: '🧩',
        image: '/img/desafio-primeiro-jogo/p1-investigador.webp',
        label: 'Quer entender regras, peças, comandos e como tudo funciona por dentro.',
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
      'Em média, quantas horas por dia ele passa em telas só consumindo — jogando, assistindo ou pesquisando?',
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
    titulo: 'Onde esse interesse aparece mais hoje?',
    opcoes: [
      {
        value: 'jogos',
        badge: '🎮',
        label: 'Jogos e suas fases, personagens, regras e estratégias.',
      },
      {
        value: 'tecnologia',
        badge: '🤖',
        label: 'Tecnologia: testar, configurar, montar ou entender como funciona.',
      },
      {
        value: 'temas_especificos',
        badge: '🦖',
        label: 'Temas específicos, como espaço, animais, dinossauros, mapas ou histórias.',
      },
      {
        value: 'videos_tutoriais',
        badge: '📺',
        label: 'Vídeos e tutoriais que raramente viram algo criado por ele.',
      },
    ],
  },
  {
    id: 4,
    key: 'ja_largou',
    lastStep: 'quiz_pergunta_4',
    eventName: 'respondeu_pergunta_4',
    tipo: 'sim_nao',
    titulo: 'Já aconteceu de ele começar algo animado e perder o interesse antes de terminar?',
    opcaoSim: 'Sim, isso acontece por aqui',
    opcaoNao: 'Não, ele costuma terminar o que começa',
  },
  {
    id: 5,
    key: 'maior_incomodo',
    lastStep: 'quiz_pergunta_5',
    eventName: 'respondeu_pergunta_5',
    tipo: 'multipla_escolha',
    titulo: 'O que mais incomoda você nessa relação com jogos e tecnologia?',
    opcoes: [
      {
        value: 'consome_nao_cria',
        badge: '🧩',
        label: 'Ele consome muito, mas quase nada vira uma criação própria.',
      },
      {
        value: 'copia_e_trava',
        badge: '📝',
        label: 'Ele acompanha tutoriais, mas trava quando precisa mudar alguma coisa.',
      },
      {
        value: 'tela_e_tensao',
        badge: '⏳',
        label: 'O assunto às vezes vira só mais tempo de tela e tensão em casa.',
      },
      {
        value: 'interesse_sem_resultado',
        badge: '🎮',
        label: 'Existe muito interesse, mas ainda falta um projeto concreto para canalizá-lo.',
      },
    ],
  },
  {
    id: 6,
    key: 'horas_ano_calculadas',
    lastStep: 'quiz_pergunta_6',
    eventName: 'respondeu_pergunta_6',
    tipo: 'calculadora_prefilled',
    titulo: 'Vamos colocar na ponta do lápis: quanto tempo de consumo isso representa em um ano?',
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
      'São cerca de {resultado} horas por ano. A meta não é transformar tudo. É começar com uma pequena parte.',
  },
  {
    id: 7,
    key: 'incomodo_tempo_tela',
    lastStep: 'quiz_pergunta_7',
    eventName: 'respondeu_pergunta_7',
    tipo: 'slider',
    titulo:
      'O quanto você gostaria de direcionar uma pequena parte desse tempo para uma criação própria?',
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
    titulo: 'O que você mais gostaria de ver primeiro?',
    opcoes: [
      {
        value: 'mostrar_familia',
        badge: '👨‍👩‍👧',
        label: 'Ele chamando a família para mostrar algo que criou.',
      },
      {
        value: 'escola_colegas',
        badge: '🏫',
        label: 'Ele compartilhando um projeto com colegas.',
      },
      {
        value: 'abrir_para_criar',
        badge: '😊',
        label: 'Ele abrindo o computador também para criar, não só para consumir.',
      },
      {
        value: 'terminar_e_continuar',
        badge: '🔁',
        label: 'Ele concluindo um projeto curto e querendo experimentar o próximo.',
      },
    ],
  },
  {
    id: 9,
    key: 'o_que_pesa',
    lastStep: 'quiz_pergunta_9',
    eventName: 'respondeu_pergunta_9',
    tipo: 'multipla_escolha',
    titulo: 'O que mais pesa ao escolher uma atividade assim?',
    opcoes: [
      {
        value: 'terminar',
        badge: '🎯',
        label: 'Um caminho curto, com começo, meio e fim visíveis.',
      },
      {
        value: 'baixo_custo',
        badge: '💰',
        label: 'Um investimento pequeno antes de um compromisso maior.',
      },
      {
        value: 'autonomia',
        badge: '🧭',
        label: 'Conseguir acompanhar mesmo sem entender de tecnologia.',
      },
      {
        value: 'rapido_divertido',
        badge: '⚡',
        label: 'Ver um resultado funcionando logo nos primeiros dias.',
      },
    ],
  },
  {
    id: 10,
    key: 'o_que_quer',
    lastStep: 'quiz_pergunta_10',
    eventName: 'respondeu_pergunta_10',
    tipo: 'multipla_escolha',
    titulo: 'O que você gostaria que esse interesse pudesse se tornar com o tempo?',
    opcoes: [
      {
        value: 'criar_proprio',
        badge: '🚀',
        label: 'Autoria: criar coisas próprias, além de consumir as dos outros.',
      },
      {
        value: 'desenvolver_habilidade',
        badge: '🙂',
        label: 'Uma habilidade que ele tenha prazer em desenvolver.',
      },
      {
        value: 'terminar_e_mostrar',
        badge: '🤔',
        label: 'Orgulho de terminar e compartilhar o que fez.',
      },
      {
        value: 'virar_aprendizado',
        badge: '🧐',
        label: 'Aprendizado que continue para além de um passatempo.',
      },
    ],
  },
]

export const DESAFIO_TOTAL = DESAFIO_QUIZ_STEPS.length

// Tela de resultado. O perfil = a resposta da P1; o NOME do tipo vira o título. O
// diagnóstico é QUEBRADO em blocos (`secoes`) — layout escaneável, renderizado pela
// tela compartilhada. "O que isso mostra" e "O caminho" mudam por perfil; "O ponto de
// atenção" e "A oportunidade" são iguais nos 4. Os marcadores
// {resposta_p3}/{resposta_p5}/{resposta_p8}/{resposta_p10}/{resultado} são resolvidos
// por `desafioRenderCorpo`.
export const DESAFIO_FECHO =
  'No Desafio do Primeiro Jogo, seu filho usa esse interesse para criar, em cinco dias, um jogo com começo, desafio, pontos, vidas, vitória e derrota.'

// Bloco em realce acima do fecho: espelha o que o pai declarou na P8 (o que sonha ver)
// e na P10 (o que sonha que ele se torne). Resolvido por `desafioRenderCorpo`.
export const DESAFIO_DESTAQUE =
  'Você disse que gostaria de ver {resposta_p8}. E que, com o tempo, quer ver {resposta_p10}.'

const RESULT_CTA = 'Ver como funciona o Desafio'

// Blocos iguais nos 4 perfis: espelham a resposta sem transformar o quiz em diagnóstico.
const SECAO_PRIMEIRO_PASSO = {
  rotulo: 'O primeiro passo possível',
  texto:
    'Hoje, {resposta_p5}. Pelas suas respostas, o melhor primeiro passo não é uma jornada longa. É um projeto curto, guiado e com resultado visível.',
}
const SECAO_DIRECAO = {
  rotulo: 'Uma nova direção',
  texto: 'Não é mais tela. É outra direção para uma parte dela.',
}

export const DESAFIO_RESULT_PROFILES: Record<string, ResultProfile> = {
  explorador: {
    titulo: 'Seu filho tem perfil Explorador',
    secoes: [
      {
        rotulo: 'O que isso mostra',
        texto:
          'Ele aprende testando, abre caminhos rápido e se anima com novidade. Para transformar curiosidade em autoria, o primeiro projeto precisa ser curto e mostrar uma vitória por etapa antes que outra ideia chame a atenção.',
      },
      SECAO_PRIMEIRO_PASSO,
      SECAO_DIRECAO,
    ],
    cta: RESULT_CTA,
  },
  especialista: {
    titulo: 'Seu filho tem perfil Especialista',
    secoes: [
      {
        rotulo: 'O que isso mostra',
        texto:
          'Ele mergulha nos assuntos que ama e constrói um repertório rico. O próximo passo é usar esse conhecimento como matéria-prima para algo que tenha as escolhas dele.',
      },
      SECAO_PRIMEIRO_PASSO,
      SECAO_DIRECAO,
    ],
    cta: RESULT_CTA,
  },
  foguete: {
    titulo: 'Seu filho tem perfil Foguete',
    secoes: [
      {
        rotulo: 'O que isso mostra',
        texto:
          'Ele começa com energia e quer ver a ideia ganhar vida. Um caminho com resultados rápidos ajuda a manter a conexão entre esforço e conquista até o final.',
      },
      SECAO_PRIMEIRO_PASSO,
      SECAO_DIRECAO,
    ],
    cta: RESULT_CTA,
  },
  investigador: {
    titulo: 'Seu filho tem perfil Investigador',
    secoes: [
      {
        rotulo: 'O que isso mostra',
        texto:
          'Ele quer entender o mecanismo por trás das coisas. Uma base guiada, mas aberta para testar regras e comandos, permite que ele deixe de apenas seguir o jogo e passe a decidir como o jogo funciona.',
      },
      SECAO_PRIMEIRO_PASSO,
      SECAO_DIRECAO,
    ],
    cta: RESULT_CTA,
  },
}

// Hero da /oferta por perfil. HOJE o DesafioOfertaBody NÃO lê `content.hero`
// (nem a `abertura`) — quem consome hero é o NoComandoOfertaBody. O bloco fica
// pelo tipo FunnelContent e como reserva; é copy morta na página do Desafio.
const HERO_H1 =
  'Seu filho não precisa de mais tempo de tela. Precisa descobrir o que consegue criar com uma parte dele.'
const HERO_BOTAO = 'Quero transformar parte desse tempo em criação'

export const DESAFIO_HERO_PADRAO: HeroVariacao = {
  titulo: HERO_H1,
  abertura: '',
  botao: HERO_BOTAO,
}

export const DESAFIO_HERO_POR_PERFIL: Record<string, HeroVariacao> = {
  explorador: {
    titulo: HERO_H1,
    abertura:
      'Para O Explorador, o caminho é uma frente única e curta para fechar, com uma vitória visível por dia; é o que estes 5 dias fazem.',
    botao: HERO_BOTAO,
  },
  especialista: {
    titulo: HERO_H1,
    abertura:
      'Para O Especialista, o caminho é transformar o tema que ele domina em algo feito pelas mãos dele; é o que estes 5 dias fazem.',
    botao: HERO_BOTAO,
  },
  foguete: {
    titulo: HERO_H1,
    abertura:
      'Para O Foguete, o caminho é encurtar a distância entre começar e ver algo funcionando; é o que estes 5 dias fazem.',
    botao: HERO_BOTAO,
  },
  investigador: {
    titulo: HERO_H1,
    abertura:
      'Para O Investigador, o caminho é uma base aberta para ele mexer por dentro e definir as próprias regras; é o que estes 5 dias fazem.',
    botao: HERO_BOTAO,
  },
}

// Conteúdo da /obrigado (entrega + primeiros passos), em linguagem para os pais.
export const DESAFIO_OBRIGADO: FunnelObrigado = {
  intro: 'Os 30 dias do Desafio começam com a aprovação do pagamento.',
  entrega: [
    'Trilha guiada de 5 dias (uma vitória por dia)',
    'Estúdio e blocos feitos pra criança, sem instalar nada',
    'Link do jogo pra compartilhar com a família e os amigos',
    'Passo a passo em vídeo (aula guiada)',
    'Mapa dos pais, em linguagem para quem não é de tecnologia',
    'Certificado de conclusão',
    '30 dias de acesso contados da aprovação do pagamento',
  ],
  passos: [
    {
      titulo: 'Abra o e-mail de acesso e crie sua senha',
      texto:
        'Enviamos o link de primeiro acesso para o e-mail da compra. É com ele que você cria a sua senha. Se não chegar em alguns minutos, dê uma olhada no spam ou nas promoções.',
    },
    {
      titulo: 'Cadastre o perfil do seu filho',
      texto:
        'Já dentro da plataforma, faça o cadastro do seu filho. É rapidinho, e pronto: o espaço de aprender já fica liberado para ele.',
    },
    {
      titulo: 'Separe o primeiro encontro e abra o Dia 1',
      texto: 'A trilha recomenda cinco encontros, mas vocês podem organizá-los dentro dos 30 dias.',
    },
    {
      titulo: 'Anote a data final do acesso',
      texto: 'Ela aparece nesta página e na área de membros para vocês planejarem a conclusão.',
    },
  ],
}
