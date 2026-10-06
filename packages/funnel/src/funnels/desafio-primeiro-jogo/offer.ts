import { DESAFIO_SECTIONS } from './offer-copy'

export type DesafioOfferId = 'primeiro-jogo' | 'tempo-de-tela' | 'iniciacao-tecnologica'
export const isDesafioOffer = (value: unknown): value is DesafioOfferId =>
  value === 'primeiro-jogo' || value === 'tempo-de-tela' || value === 'iniciacao-tecnologica'

export const DESAFIO_OFFERS = {
  'primeiro-jogo': {
    seoTitle: 'Desafio do Primeiro Jogo | Sistema Zero',
    title: 'Seu filho pode programar o primeiro jogo e ',
    emphasis: 'chamar você para jogar',
    lead: 'Na aventura A Chave do Farol, ele aprende a fazer o personagem andar, recolher uma chave e decidir quando a porta pode abrir. As explicações acompanham a montagem dentro da aula, e cada parte pode ser testada antes de seguir.',
    detail:
      'Esse primeiro jogo é uma forma de conhecer por dentro a plataforma da Comunidade dos Criadores. Vocês acompanham como ele aprende e usa a ajuda disponível antes de decidir se querem continuar com outros projetos.',
    sections: ['aventura', 'experiencia', 'construcoes', 'ajuda', 'familia', 'mural'],
    faqFirst: ['duvida-1', 'duvida-3', 'duvida-5', 'duvida-9'],
  },
  'tempo-de-tela': {
    seoTitle: 'Um primeiro jogo no tempo de tela combinado | Sistema Zero',
    title: 'Uma parte do tempo de tela combinado pode virar ',
    emphasis: 'o primeiro jogo do seu filho',
    lead: 'O Desafio oferece uma atividade para ele montar e testar, dentro do tempo que vocês já permitem. A criança aprende as regras de A Chave do Farol e você pode acompanhar a construção pelo que ela mostra no jogo.',
    detail:
      'É uma primeira experiência na plataforma da Comunidade dos Criadores. Vocês podem observar como essa atividade cabe na rotina e como seu filho participa, antes de escolher se querem continuar aprendendo por aqui.',
    sections: ['familia', 'aventura', 'experiencia', 'ajuda', 'construcoes', 'mural'],
    faqFirst: ['duvida-6', 'duvida-7', 'duvida-4', 'duvida-5'],
  },
  'iniciacao-tecnologica': {
    seoTitle: 'Iniciação em programação com A Chave do Farol | Sistema Zero',
    title: 'Conheça uma primeira experiência de programação ',
    emphasis: 'pelo jogo que seu filho constrói',
    lead: 'No Farol, movimento, memória e decisão aparecem em tarefas concretas: fazer andar, guardar que a chave foi encontrada e conferir se a porta pode abrir. Seu filho acompanha a explicação, monta os blocos e testa o resultado.',
    detail:
      'Com esse projeto guiado, vocês conhecem o jeito de aprender da Comunidade dos Criadores por dentro. Você pode pedir que ele mostre uma regra e explique o que faz, e usar essa primeira experiência para decidir sobre a continuidade.',
    sections: ['construcoes', 'aventura', 'experiencia', 'ajuda', 'familia', 'mural'],
    faqFirst: ['duvida-3', 'duvida-10', 'duvida-11', 'duvida-1'],
  },
} as const

export const SECTION_ART = {
  aventura: { icon: 'explore', label: 'Conhecer jogando', visual: 'farol', color: 'azul' },
  experiencia: {
    icon: 'play_circle',
    label: 'Ver, montar e testar',
    visual: 'aula',
    color: 'verde',
  },
  construcoes: { icon: 'extension', label: 'O que ele aprende', visual: 'regra', color: 'rosa' },
  ajuda: { icon: 'forum', label: 'Um caminho para retomar', visual: 'ajuda', color: 'roxo' },
  familia: {
    icon: 'family_star',
    label: 'Na rotina de vocês',
    visual: 'caderno',
    color: 'laranja',
  },
  mural: {
    icon: 'sports_esports',
    label: 'Uma criação para mostrar',
    visual: 'mural',
    color: 'verde',
  },
} as const

export function desafioSection(id: keyof typeof SECTION_ART, profile: DesafioOfferId) {
  const base = DESAFIO_SECTIONS[id]
  if (id === 'familia' && profile === 'tempo-de-tela')
    return {
      ...base,
      title: 'O tempo já combinado pode ganhar uma construção para vocês conhecerem',
      paragraphs: [
        'Na rotina da família, a tela já costuma ter um lugar. A escolha pode começar pelo que seu filho faz nesse tempo: em uma parte do horário que vocês já permitem, conhecer um jogo, montar uma regra e experimentar o que mudou.',
        'Para convidá-lo, mostre a aventura do Farol. Ele gosta de jogar, mas talvez nunca tenha pensado em programar. Vale ouvir o que achou da ideia antes de transformar a atividade em mais uma obrigação. Se o computador é compartilhado, combinem quando ele estará disponível para essa primeira tentativa.',
        ...base.paragraphs,
      ],
    }
  if (id === 'construcoes' && profile === 'iniciacao-tecnologica')
    return {
      ...base,
      title: 'Movimento, memória e decisão aparecem no que o jogo faz',
      paragraphs: [
        'Para avaliar uma iniciação em programação, ajuda enxergar o conteúdo funcionando. Quando seu filho guarda que a chave foi recolhida e usa essa informação na porta, ele está relacionando dois acontecimentos por meio de uma regra que montou. Você consegue conhecer essa ideia jogando as duas situações com ele.',
        ...base.paragraphs,
        'A arte, o cenário e o movimento do barco já vêm preparados pela equipe. A montagem das regras é guiada. Esse recorte permite trabalhar uma sequência inicial de programação; ele não representa uma formação completa nem demonstra, sozinho, que a criança já cria qualquer jogo por conta própria.',
      ],
    }
  return base
}

export const INCLUDED = [
  'A Chave do Farol: três etapas de construção e certificado.',
  'Explicações gravadas e Estúdio integrado às atividades do curso.',
  'Experimento da porta: comparar o jogo com e sem a chave.',
  'Caderno do Aluno, tutoriais do Como Fazer e ajuda por mensagens.',
  'Verificação das etapas, envio do projeto e orientação de publicação.',
  '30 dias de curso e Mural completo. Depois, Mural visitante para ver e jogar.',
]
