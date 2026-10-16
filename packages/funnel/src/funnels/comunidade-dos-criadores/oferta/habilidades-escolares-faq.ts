import { FAQ } from './shared'
import type { ComunidadeFaqEntry } from './types'
import { FAQ_VISUALS } from './visuals'

/** Respostas escolares e ajustes específicos desta variante; demais condições compartilhadas. */
export const FAQ_ESCOLA: Record<string, ComunidadeFaqEntry> = {
  ...FAQ,
  escola: {
    question: 'Isso pode ajudar meu filho na escola?',
    paragraphs: [
      'Ao construir um jogo, seu filho encontra tarefas de leitura, uso de números, planejamento e revisão. Pode explicar uma regra, mostrar como conferiu uma conta e reconhecer onde usou uma ideia que também aparece na escola.',
      'Levar o que aprendeu no projeto para outras situações envolve reconhecer essas relações e praticá-las. As atividades realizadas, os conhecimentos anteriores e a orientação recebida participam desse processo. A Comunidade oferece uma formação complementar por projetos.',
    ],
  },
  notas: {
    question: 'A Comunidade promete melhorar as notas?',
    paragraphs: [
      'Não há promessa de aumento de notas ou de recuperação em uma matéria. O que vocês podem conhecer diretamente são as atividades, as criações e o que seu filho consegue explicar e realizar. Resultados escolares precisam ser acompanhados no contexto da escola.',
    ],
  },
  interesse: {
    question: 'E se ele gosta de jogar, mas ainda não mostrou interesse em criar?',
    paragraphs: [
      'Mostre as cenas da página e conversem sobre uma coisa que ele gostaria de mudar num jogo: o personagem, uma regra ou a aparência de uma fase. Isso ajuda a conhecer se há curiosidade pela construção.',
      'Depois da contratação, a primeira atividade guiada permite observar como ele se envolve com esse tipo de tarefa. As condições da garantia estão junto dos planos. O interesse pode variar, e essa experiência dá à família uma referência para decidir sobre a continuidade.',
    ],
  },
  matematica: {
    question: 'Meu filho tem dificuldade em matemática. Ele consegue começar?',
    paragraphs: [
      'O começo é guiado e apresenta as ações do projeto em partes. Vocês podem observar como ele acompanha uma orientação e lida com as quantidades que aparecem na atividade. Algumas crianças precisam de companhia inicial e de mais tempo para rever a explicação.',
      'A proposta é oferecer usos concretos para os conceitos trabalhados nos projetos. Ela não inclui um plano individual de reforço ou recuperação de conteúdos escolares.',
    ],
  },
  leitura: {
    question: 'E se ele não gosta de ler ou ainda precisa de ajuda para entender textos?',
    paragraphs: [
      'As aulas combinam vídeo, texto e outros recursos conforme a atividade. A orientação pode ser pausada e revista, e algumas instruções também têm áudio. Ler comandos e compreender pedidos continua fazendo parte da experiência.',
      'A criança precisa conseguir ler e usar mouse e teclado. Se precisa de bastante apoio para interpretar uma instrução, vale acompanhar as primeiras tarefas para conhecer o nível de ajuda necessário. A Comunidade não oferece alfabetização.',
    ],
  },
  programacao: {
    question: 'Meu filho precisa saber programar?',
    paragraphs: [
      'O começo apresenta as ações e os comandos passo a passo. Seu filho monta as regras com blocos e testa o que acontece. Personagens e materiais preparados permitem começar pelo funcionamento do jogo.',
    ],
  },
  pais: {
    question: 'Eu preciso saber programação para acompanhar?',
    paragraphs: [
      'A orientação de programação fica nas aulas. Você pode ajudar no acesso e na rotina, jogar uma criação e pedir que seu filho mostre uma escolha. Quando ele tiver uma dúvida da atividade, o pedido de ajuda segue pelos Recados.',
    ],
  },
  aprendizagem: {
    question: 'Como sei se ele entendeu ou apenas acompanhou os passos?',
    paragraphs: [
      'Peça que mostre o que uma regra faz e explique uma escolha. Numa atividade que permita alterações, ele pode fazer uma mudança e conferir o efeito. Esses exemplos acrescentam informações aos registros de conclusão e ajudam a conhecer o que ele compreendeu.',
    ],
  },
  serie: {
    question: 'Os cursos seguem a série escolar do meu filho?',
    paragraphs: [
      'A Jornada é organizada por projetos, requisitos e etapas de criação. O catálogo informa os cursos disponíveis. As relações com leitura, matemática, ciências e arte aparecem nas tarefas de cada projeto, e não como uma sequência de reforço correspondente a cada série.',
    ],
  },
}

export const FAQ_ESCOLA_VISUALS: Record<string, readonly string[]> = {
  ...FAQ_VISUALS,
  escola: ['contador'],
  notas: [],
  matematica: ['aula-estudio'],
  leitura: ['como-fazer'],
  serie: ['catalogo'],
}
