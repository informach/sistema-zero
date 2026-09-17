// Conteúdo do funil Desafio do Primeiro Jogo. A comunicação é dirigida a mães,
// pais e responsáveis e observa comportamentos cotidianos, sem diagnóstico.

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
  h1: 'Seu filho gosta de jogos. Descubra como uma parte desse interesse pode virar criação.',
  subtitulo:
    'Responda 7 perguntas sobre o jeito como ele joga, enfrenta desafios e usa a tecnologia. No final, você recebe um mapa rápido com uma sugestão de primeiro projeto para ele.',
  tempo: 'Gratuito. Menos de 3 minutos. Resultado na hora.',
}

export const DESAFIO_QUIZ_STEPS: QuizStep[] = [
  {
    id: 1,
    key: 'uso_digital_atual',
    lastStep: 'quiz_pergunta_1',
    eventName: 'respondeu_pergunta_1',
    tipo: 'multipla_escolha',
    titulo: 'Hoje, quando seu filho está no computador, o que acontece com mais frequência?',
    opcoes: [
      { value: 'joga_pronto', badge: '🎮', label: 'Joga experiências que já estão prontas.' },
      { value: 'assiste', badge: '📺', label: 'Assiste a vídeos sobre jogos e personagens.' },
      {
        value: 'tutoriais',
        badge: '📝',
        label: 'Acompanha tutoriais, mas nem sempre termina o que começou.',
      },
      {
        value: 'ja_cria',
        badge: '🧩',
        label: 'Já tenta modificar ou criar alguma coisa por conta própria.',
      },
    ],
  },
  {
    id: 2,
    key: 'perfil_p1',
    lastStep: 'quiz_pergunta_2',
    eventName: 'respondeu_pergunta_2',
    tipo: 'multipla_escolha',
    comImagem: true,
    imagemLayout: 'topo',
    titulo: 'Quando ele entra em um jogo novo, o que costuma chamar a atenção primeiro?',
    opcoes: [
      {
        value: 'explorador',
        badge: '🧭',
        image: '/img/desafio-primeiro-jogo/p1-explorador.webp',
        label: 'Explorar o mapa, descobrir caminhos e ver o que existe em cada canto.',
      },
      {
        value: 'investigador',
        badge: '🔎',
        image: '/img/desafio-primeiro-jogo/p1-investigador.webp',
        label: 'Entender as regras, os comandos e como tudo funciona.',
      },
      {
        value: 'especialista',
        badge: '✨',
        image: '/img/desafio-primeiro-jogo/p1-especialista.webp',
        label: 'Personagens, cenários e detalhes que ele gostaria de personalizar.',
      },
      {
        value: 'foguete',
        badge: '🏆',
        image: '/img/desafio-primeiro-jogo/p1-foguete.webp',
        label: 'As fases, as metas e o próximo desafio para superar.',
      },
    ],
  },
  {
    id: 3,
    key: 'perfil_p2',
    lastStep: 'quiz_pergunta_3',
    eventName: 'respondeu_pergunta_3',
    tipo: 'multipla_escolha',
    titulo: 'Quando alguma coisa não funciona como ele esperava, o que mais se parece com ele?',
    opcoes: [
      { value: 'explorador', badge: '🧭', label: 'Tenta outros caminhos até encontrar uma saída.' },
      { value: 'investigador', badge: '🔎', label: 'Quer descobrir a causa antes de continuar.' },
      {
        value: 'especialista',
        badge: '✨',
        label: 'Imagina uma solução diferente e muda o jeito de fazer.',
      },
      { value: 'foguete', badge: '🏆', label: 'Tenta de novo até conseguir passar daquela parte.' },
    ],
  },
  {
    id: 4,
    key: 'perfil_p3',
    lastStep: 'quiz_pergunta_4',
    eventName: 'respondeu_pergunta_4',
    tipo: 'multipla_escolha',
    titulo: 'Se pudesse mudar uma coisa no jogo favorito, o que ele escolheria?',
    opcoes: [
      { value: 'explorador', badge: '🗺️', label: 'Criar lugares novos para explorar.' },
      {
        value: 'investigador',
        badge: '⚙️',
        label: 'Mudar as regras ou o jeito como o jogo funciona.',
      },
      { value: 'especialista', badge: '🎨', label: 'Inventar personagens, poderes ou histórias.' },
      {
        value: 'foguete',
        badge: '🎯',
        label: 'Adicionar fases mais difíceis e novas recompensas.',
      },
    ],
  },
  {
    id: 5,
    key: 'perfil_p4',
    lastStep: 'quiz_pergunta_5',
    eventName: 'respondeu_pergunta_5',
    tipo: 'multipla_escolha',
    titulo: 'O que mais ajuda seu filho a continuar em uma atividade nova?',
    opcoes: [
      { value: 'explorador', badge: '🧭', label: 'Ter liberdade para testar e descobrir.' },
      {
        value: 'investigador',
        badge: '🔎',
        label: 'Entender com clareza o que acontece em cada passo.',
      },
      {
        value: 'especialista',
        badge: '✨',
        label: 'Poder colocar as ideias e o estilo dele no projeto.',
      },
      { value: 'foguete', badge: '🏆', label: 'Perceber pequenas conquistas ao longo do caminho.' },
    ],
  },
  {
    id: 6,
    key: 'resultado_desejado',
    lastStep: 'quiz_pergunta_6',
    eventName: 'respondeu_pergunta_6',
    tipo: 'multipla_escolha',
    titulo: 'O que faria você sentir que parte desse tempo digital valeu a pena?',
    opcoes: [
      {
        value: 'mostrar_criacao',
        badge: '👨‍👩‍👧',
        label: 'Ver meu filho me chamar para mostrar algo que criou.',
      },
      {
        value: 'raciocinio',
        badge: '🧠',
        label: 'Vê-lo pensar, testar e resolver problemas dentro de um projeto.',
      },
      {
        value: 'concluir_projeto',
        badge: '✅',
        label: 'Vê-lo começar e terminar um projeto próprio.',
      },
      {
        value: 'entender_tecnologia',
        badge: '💻',
        label: 'Ajudá-lo a entender melhor como a tecnologia funciona.',
      },
    ],
  },
  {
    id: 7,
    key: 'apoio_para_comecar',
    lastStep: 'quiz_pergunta_7',
    eventName: 'respondeu_pergunta_7',
    tipo: 'multipla_escolha',
    titulo: 'O que mais ajudaria sua família a dar esse primeiro passo?',
    opcoes: [
      { value: 'projeto_curto', badge: '🎯', label: 'Um projeto curto, com uma chegada clara.' },
      {
        value: 'sem_experiencia',
        badge: '🌱',
        label: 'Um começo que não exija experiência anterior.',
      },
      {
        value: 'acompanhar_sem_programar',
        badge: '🤝',
        label: 'Conseguir acompanhar sem precisar saber programar.',
      },
      {
        value: 'investimento_pequeno',
        badge: '💰',
        label: 'Um investimento pequeno antes de escolher algo maior.',
      },
    ],
  },
]

export const DESAFIO_TOTAL = DESAFIO_QUIZ_STEPS.length

export const DESAFIO_FECHO =
  'No Desafio do Primeiro Jogo, seu filho usa uma parte do tempo digital que já existe para montar, testar e publicar um jogo de nave em cinco etapas.'

export const DESAFIO_DESTAQUE =
  'O interesse já existe. Agora ele pode ganhar uma direção: criar algo que seu filho consiga abrir, jogar e mostrar.'

const RESULT_CTA = 'Ver como ele pode criar o primeiro jogo'

const SECAO_HOJE = {
  rotulo: 'O que acontece hoje',
  texto:
    'Hoje, {resposta_uso}. O interesse já existe. A oportunidade é mostrar que jogos também podem ser imaginados, construídos, testados e melhorados.',
}

const SECAO_PRIMEIRO_PASSO = {
  rotulo: 'Um primeiro passo possível',
  texto:
    'Você disse que gostaria de ver seu filho {resposta_desejo}. O começo não precisa ser um curso longo. Pode ser um jogo pequeno, guiado e possível de terminar.',
}

const SECAO_APOIO = {
  rotulo: 'O que ajuda sua família a começar',
  texto:
    'Pela sua resposta, faz diferença ter {resposta_apoio}. Essa é a ideia do Desafio: um primeiro projeto com orientação e uma chegada que a criança consegue enxergar.',
}

export const DESAFIO_RESULT_PROFILES: Record<string, ResultProfile> = {
  explorador: {
    titulo: 'Seu filho parece aprender melhor quando pode explorar',
    secoes: [
      SECAO_HOJE,
      {
        rotulo: 'O jeito dele criar',
        texto:
          'Ele tende a aprender testando caminhos e descobrindo possibilidades. Um primeiro jogo funciona melhor quando oferece pequenas etapas, liberdade para experimentar e uma conquista visível antes da próxima ideia aparecer.',
      },
      SECAO_PRIMEIRO_PASSO,
      SECAO_APOIO,
    ],
    cta: RESULT_CTA,
  },
  especialista: {
    titulo: 'Seu filho parece gostar de colocar as próprias ideias nas coisas',
    secoes: [
      SECAO_HOJE,
      {
        rotulo: 'O jeito dele criar',
        texto:
          'Ele presta atenção nos detalhes e se envolve quando pode personalizar o que está fazendo. Criar um jogo dá espaço para escolher personagens, cenas, efeitos e regras que tenham a cara dele.',
      },
      SECAO_PRIMEIRO_PASSO,
      SECAO_APOIO,
    ],
    cta: RESULT_CTA,
  },
  foguete: {
    titulo: 'Seu filho parece se motivar com metas e conquistas visíveis',
    secoes: [
      SECAO_HOJE,
      {
        rotulo: 'O jeito dele criar',
        texto:
          'Ele gosta de saber qual é o próximo desafio e perceber que avançou. Um projeto dividido em pequenas vitórias aproxima o esforço do resultado e ajuda a criança a chegar a um jogo que funciona.',
      },
      SECAO_PRIMEIRO_PASSO,
      SECAO_APOIO,
    ],
    cta: RESULT_CTA,
  },
  investigador: {
    titulo: 'Seu filho parece gostar de entender como as coisas funcionam',
    secoes: [
      SECAO_HOJE,
      {
        rotulo: 'O jeito dele criar',
        texto:
          'Ele se envolve quando consegue enxergar a lógica por trás do que acontece. Ao criar um jogo, pode relacionar comandos e efeitos, testar regras e descobrir por que uma parte funcionou ou precisa ser ajustada.',
      },
      SECAO_PRIMEIRO_PASSO,
      SECAO_APOIO,
    ],
    cta: RESULT_CTA,
  },
}

const HERO_H1 =
  'Seu filho passa horas envolvido com jogos. E se uma parte desse tempo terminasse em um jogo criado por ele?'
const HERO_BOTAO = 'Quero ver meu filho criar o primeiro jogo'

export const DESAFIO_HERO_PADRAO: HeroVariacao = {
  titulo: HERO_H1,
  abertura: '',
  botao: HERO_BOTAO,
}

export const DESAFIO_HERO_POR_PERFIL: Record<string, HeroVariacao> = Object.fromEntries(
  Object.keys(DESAFIO_RESULT_PROFILES).map((perfil) => [
    perfil,
    { titulo: HERO_H1, abertura: '', botao: HERO_BOTAO },
  ]),
)

export const DESAFIO_OBRIGADO: FunnelObrigado = {
  intro: 'Os 30 dias do Desafio começam com a aprovação do pagamento.',
  entrega: [
    'Cinco etapas guiadas para criar um jogo de nave',
    'Estúdio e blocos feitos para crianças, sem instalar nada',
    'Aulas em vídeo para avançar uma parte de cada vez',
    'Link do jogo para compartilhar com a família e os amigos',
    'Mapa dos pais, em linguagem para quem não é de tecnologia',
    'Certificado de conclusão',
    '30 dias de acesso contados da aprovação do pagamento',
  ],
  passos: [
    {
      titulo: 'Abra o e-mail de acesso e crie sua senha',
      texto:
        'Enviamos o link de primeiro acesso para o e-mail da compra. Se ele não chegar em alguns minutos, confira também o spam e a aba de promoções.',
    },
    {
      titulo: 'Cadastre o perfil do seu filho',
      texto:
        'Dentro da plataforma, faça o cadastro da criança. Leva poucos minutos e deixa o espaço dela pronto para começar.',
    },
    {
      titulo: 'Escolham o primeiro encontro e abram a etapa 1',
      texto:
        'A trilha tem cinco etapas. Vocês podem fazer uma por dia ou distribuir os encontros dentro dos 30 dias de acesso.',
    },
    {
      titulo: 'Comemorem a primeira parte funcionando',
      texto:
        'O jogo nasce aos poucos. Peça para seu filho mostrar o que já conseguiu montar antes de seguir para a próxima etapa.',
    },
  ],
}
