/**
 * O que a página do curso FECHADO diz de cada curso para pais (Canvas "pais-curso-fechado",
 * 25/11/2026). A promessa, o que muda e quem conduz são do conteúdo de cada curso, por isso
 * moram aqui por slug; o preço, o prazo e a garantia vêm sempre da oferta do catálogo. Curso
 * novo sem entrada aqui mostra a capa, o subtítulo e a compra, sem as seções do conteúdo.
 */
export interface ParentCoursePage {
  /** A frase abaixo do título; o `destaque` sai em negrito. */
  promessa: { antes: string; destaque: string; depois: string }
  /** Os selos do topo, depois do "N aulas curtas em vídeo". */
  chips: readonly string[]
  /** Os selos do cartão de venda da lateral do Início, depois do "N aulas". */
  cardChips: readonly string[]
  /** As linhas do que vem com a compra, antes da garantia (que vem da oferta). */
  inclui: readonly string[]
  oQueMuda: {
    titulo: string
    itens: readonly { titulo: string; icone: 'conversa' | 'recomecar' | 'trofeu' }[]
    nota: string
  }
  quemConduz: { titulo: string; quem: string; foto: string; alt: string }
}

export const PARENT_COURSE_PAGES: Readonly<Record<string, ParentCoursePage>> = {
  'transformando-o-vilao-em-aliado': {
    promessa: {
      antes: 'A tela que hoje vira briga em casa pode ser ',
      destaque: 'sua aliada',
      depois: ' no desenvolvimento do seu filho.',
    },
    chips: ['Apostila e certificado', 'Para pais de filhos de 5 a 17 anos'],
    cardChips: ['Apostila e certificado', 'Com a Helena'],
    inclui: [
      'Assista quando der, aqui na área dos pais',
      'Apostila para consultar e certificado no final',
    ],
    oQueMuda: {
      titulo: 'O que muda na sua casa quando você coloca o curso em prática',
      itens: [
        { titulo: 'Desligar deixa de ser o único assunto', icone: 'conversa' },
        { titulo: 'O erro pesa menos', icone: 'recomecar' },
        { titulo: 'Ele percebe que é capaz', icone: 'trofeu' },
      ],
      nota: 'A mudança vem aos poucos, conforme a família leva para o dia a dia o que viu nas aulas.',
    },
    quemConduz: {
      titulo: 'Eu sou a Helena, e essa briga também acontecia aqui em casa.',
      quem: 'Mãe e profissional de tecnologia.',
      foto: '/pais/helena-julio-perfil.webp',
      alt: 'Helena e Júlio',
    },
  },
  'como-ajudar-seu-filho-autista-nas-frustracoes': {
    promessa: {
      antes: 'Na hora da crise, o seu filho está ',
      destaque: 'pedindo ajuda',
      depois: ' do jeito que consegue.',
    },
    chips: ['Apostila e certificado', 'Para pais de crianças autistas'],
    cardChips: ['Apostila e certificado', 'Com a Vivianne'],
    inclui: [
      'Assista quando der, aqui na área dos pais',
      'Apostila para consultar e certificado no final',
    ],
    oQueMuda: {
      titulo: 'O que muda na sua casa quando você coloca o curso em prática',
      itens: [
        { titulo: 'Você entende o que ficou difícil', icone: 'conversa' },
        { titulo: 'A mudança chega com aviso', icone: 'recomecar' },
        { titulo: 'Depois da crise, vocês aprendem juntos', icone: 'trofeu' },
      ],
      nota: 'A mudança vem aos poucos, e cada criança tem o seu jeito. A equipe que acompanha o seu filho pode ajudar você a adaptar o que viu nas aulas.',
    },
    quemConduz: {
      titulo: 'Quem conversa com você é a Vivi, a psicóloga Vivianne Lima.',
      quem: 'Psicóloga da Laopa.',
      foto: '/pais/vivianne.webp',
      alt: 'Ilustração da psicóloga Vivianne Lima',
    },
  },
}

/** "7 aulas curtas em vídeo" (no cartão da lista, "7 aulas"). */
export function lessonsChip(count: number | undefined, long = false): string | null {
  if (!count) return null
  const aulas = count === 1 ? '1 aula' : `${count} aulas`
  return long ? `${aulas} ${count === 1 ? 'curta' : 'curtas'} em vídeo` : aulas
}

/** O fundo da capa de cada curso na lista, um tom por posição (lilás, amarelo, menta). */
export const COURSE_BANDS = [
  'bg-(--band-lilas)',
  'bg-(--band-amarelo)',
  'bg-(--band-menta)',
] as const
