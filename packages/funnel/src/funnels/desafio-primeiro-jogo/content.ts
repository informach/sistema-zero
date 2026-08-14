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
  h1: 'Ele vive em jogo, computador e tecnologia. Descubra o perfil criador do seu filho',
  subtitulo:
    'Cada criança mergulha nisso do seu jeito. Responda algumas perguntas rápidas e descubra qual é o perfil do seu filho, e o que esse interesse pode virar.',
  tempo: 'Menos de 3 minutos, e no final o perfil que é só dele.',
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
      'Em média, quantas horas por dia seu filho passa em tela só consumindo (jogando, vendo vídeos, tutoriais ou pesquisando)? Não precisa ser exato, é só uma estimativa.',
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
    titulo:
      'Já aconteceu de ele começar algo muito animado e a empolgação esfriar no meio do caminho?',
    opcaoSim: 'Sim, isso acontece por aqui',
    opcaoNao: 'Não, ele costuma terminar o que começa',
  },
  {
    id: 5,
    key: 'maior_incomodo',
    lastStep: 'quiz_pergunta_5',
    eventName: 'respondeu_pergunta_5',
    tipo: 'multipla_escolha',
    titulo: 'Pensando nesse interesse do seu filho, o que mais te incomoda hoje?',
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
      'São cerca de {resultado} horas por ano em que esse interesse aparece na tela, em jogos, vídeos, tutoriais ou pesquisas. É muito tempo do seu filho parado no mesmo lugar, só recebendo o que já vem pronto, ano após ano.',
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
      'Agora imagine esse mesmo interesse virando algo que o seu filho cria com as próprias mãos. O que você mais gostaria de ver primeiro?',
    opcoes: [
      {
        value: 'mostrar_familia',
        badge: '👨‍👩‍👧',
        label: 'Ele chamando a família para mostrar o que ele mesmo criou',
      },
      {
        value: 'escola_colegas',
        badge: '🏫',
        label: 'Ele levando para a escola e os colegas querendo ver de perto',
      },
      {
        value: 'abrir_para_criar',
        badge: '😊',
        label: 'Ele abrindo o computador com vontade de criar, não só de consumir',
      },
      {
        value: 'terminar_e_continuar',
        badge: '🔁',
        label: 'Ele terminando algo do começo ao fim e já querendo fazer o próximo',
      },
    ],
  },
  {
    id: 9,
    key: 'o_que_pesa',
    lastStep: 'quiz_pergunta_9',
    eventName: 'respondeu_pergunta_9',
    tipo: 'multipla_escolha',
    titulo:
      'Na hora de escolher um caminho para esse interesse do seu filho, o que mais pesaria para você?',
    opcoes: [
      {
        value: 'terminar',
        badge: '🎯',
        label: 'Ter certeza de que ele vai até o fim, sem desistir no meio do caminho',
      },
      {
        value: 'baixo_custo',
        badge: '💰',
        label: 'Poder começar pequeno e sem gastar muito, antes de qualquer passo maior',
      },
      {
        value: 'autonomia',
        badge: '🧭',
        label: 'Conseguir acompanhar de perto, mesmo sem entender nada de tecnologia',
      },
      {
        value: 'rapido_divertido',
        badge: '⚡',
        label: 'Algo rápido e divertido, com resultado que ele veja logo nos primeiros dias',
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
      'Pensando lá na frente, o que você mais sonha que esse interesse do seu filho venha a se tornar?',
    opcoes: [
      {
        value: 'criar_proprio',
        badge: '🚀',
        label: 'Que ele vire alguém que cria as próprias coisas, e não só consome as dos outros',
      },
      {
        value: 'desenvolver_habilidade',
        badge: '🙂',
        label: 'Que ele desenvolva um talento de verdade no assunto que ama',
      },
      {
        value: 'terminar_e_mostrar',
        badge: '🤔',
        label: 'Que ele se orgulhe do que faz e queira mostrar pra todo mundo',
      },
      {
        value: 'virar_aprendizado',
        badge: '🧐',
        label: 'Que essa paixão vire aprendizado para a vida, e não só um passatempo',
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
  'Esse interesse pela tela é o combustível. Em 5 dias, ele pode virar o primeiro jogo criado pelo seu filho, do começo ao fim.'

// Bloco em realce acima do fecho: espelha o que o pai declarou na P8 (o que sonha ver)
// e na P10 (o que sonha que ele se torne). Resolvido por `desafioRenderCorpo`.
export const DESAFIO_DESTAQUE =
  'Você disse que sonha ver {resposta_p8}. E que, mais pra frente, quer ver {resposta_p10}.'

const RESULT_CTA = 'Ver como ele cria o primeiro jogo'

// Blocos iguais nos 4 perfis (ponto de atenção puxa a P5; oportunidade puxa horas + P3).
const SECAO_PONTO = { rotulo: 'O ponto de atenção', texto: 'Hoje, {resposta_p5}.' }
const SECAO_OPORTUNIDADE = {
  rotulo: 'A oportunidade',
  texto:
    'As mesmas horas por ano que você calculou podem começar a virar algo dele. Como esse interesse aparece mais em {resposta_p3}, dá pra começar criando algo nesse universo.',
}

export const DESAFIO_RESULT_PROFILES: Record<string, ResultProfile> = {
  explorador: {
    titulo: 'Seu filho é O Explorador',
    secoes: [
      {
        rotulo: 'O que isso mostra',
        texto:
          'Ele testa de tudo um pouco e abre muitas frentes, mas raramente fecha alguma antes de partir pra próxima.',
      },
      SECAO_PONTO,
      SECAO_OPORTUNIDADE,
      {
        rotulo: 'O caminho',
        texto:
          'Uma frente única e curta pra fechar, em que cada dia entrega uma vitória visível antes que a curiosidade migre pra outra coisa.',
      },
    ],
    cta: RESULT_CTA,
  },
  especialista: {
    titulo: 'Seu filho é O Especialista',
    secoes: [
      {
        rotulo: 'O que isso mostra',
        texto:
          'Ele acumula um conhecimento profundo sobre o que ama, mas esse repertório fica guardado, sem virar algo que ele construa.',
      },
      SECAO_PONTO,
      SECAO_OPORTUNIDADE,
      {
        rotulo: 'O caminho',
        texto:
          'Usar o tema que ele domina como matéria-prima de uma criação, transformando o que ele já sabe em algo feito pelas mãos dele.',
      },
    ],
    cta: RESULT_CTA,
  },
  foguete: {
    titulo: 'Seu filho é O Foguete',
    secoes: [
      {
        rotulo: 'O que isso mostra',
        texto:
          'Ele dispara com energia total no começo, mas perde tração quando o resultado fica longe, e a empolgação esfria antes do fim.',
      },
      SECAO_PONTO,
      SECAO_OPORTUNIDADE,
      {
        rotulo: 'O caminho',
        texto:
          'Encurtar a distância entre começar e ver algo funcionando, com etapas tão rápidas que o resultado chega antes de a energia cair.',
      },
    ],
    cta: RESULT_CTA,
  },
  investigador: {
    titulo: 'Seu filho é O Investigador',
    secoes: [
      {
        rotulo: 'O que isso mostra',
        texto:
          'Ele quer abrir, desmontar e entender o mecanismo por dentro, mas para nas regras prontas dos outros, sem montar as próprias.',
      },
      SECAO_PONTO,
      SECAO_OPORTUNIDADE,
      {
        rotulo: 'O caminho',
        texto:
          'Uma base pronta o bastante pra começar e aberta o bastante pra ele mexer por dentro, virando quem define as regras em vez de só seguir as dos outros.',
      },
    ],
    cta: RESULT_CTA,
  },
}

// Hero da /oferta por perfil. O DesafioOfertaBody só usa a `abertura` (linha de
// intro acima do H1, que retoma a segmentação do quiz). `titulo`/`botao` existem
// por causa do tipo; o body bespoke não os lê. Sem perfil → `padrao` (sem intro).
const HERO_H1 = 'Use o interesse do seu filho a favor dele: em 5 dias, ele monta o primeiro jogo'
const HERO_BOTAO = 'Quero o primeiro jogo do meu filho em 5 dias'

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
  intro: 'Obrigado por investir no potencial do seu filho.',
  entrega: [
    'Trilha guiada de 5 dias (uma vitória por dia)',
    'Estúdio e blocos feitos pra criança, sem instalar nada',
    'Link do jogo pra compartilhar com a família e os amigos',
    'Passo a passo em vídeo (aula guiada)',
    'Mapa dos pais, em linguagem para quem não é de tecnologia',
    'Certificado de conclusão',
  ],
  passos: [
    {
      titulo: 'Confirme seu acesso no e-mail',
      texto:
        'Enviamos o link de primeiro acesso para o e-mail da compra. É com ele que você cria a sua senha. Se não chegar em alguns minutos, dê uma olhada no spam ou nas promoções.',
    },
    {
      titulo: 'Faça o cadastro do seu filho',
      texto:
        'Já dentro da plataforma, faça o cadastro do seu filho. É rapidinho, e pronto: o espaço de aprender já fica liberado para ele.',
    },
    {
      titulo: 'Cada um tem o seu acesso',
      texto:
        'Tem a área do aluno, onde seu filho entra pelo perfil dele, e a área dos pais, que você acessa com a senha que criou no passo 1.',
    },
    {
      titulo: 'É só começar',
      texto:
        'Abra o curso junto com o seu filho. A primeira aula traz as orientações para os pais, e dali em diante ele já começa a criar o primeiro jogo.',
    },
  ],
}
