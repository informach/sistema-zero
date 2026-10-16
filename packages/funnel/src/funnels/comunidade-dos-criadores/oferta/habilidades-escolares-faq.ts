import type { ComunidadeFaqEntry } from './types'

/**
 * Respostas próprias da página F (proposta aprovada em 16/10/2026). Somam-se às comuns de `FAQ`
 * na página; `interesse` substitui a comum por uma versão para quem ainda não quis criar.
 * Sem promessa de nota, sem série, sem reforço e sem alfabetização.
 */
export const FAQ_ESCOLA: Record<string, ComunidadeFaqEntry> = {
  escola: {
    question: 'Isso ajuda meu filho na escola?',
    paragraphs: [
      'Dá uso a coisas que ele vê na escola. No jogo, ler a instrução, usar um número e seguir uma lógica têm um efeito que ele testa: quando explica por que o placar subiu três pontos, está usando a conta para justificar uma escolha.',
      'Reconhecer a mesma ideia numa prova é outro passo, e as conversas em casa ajudam a fazer essa ponte. A Comunidade é uma atividade complementar à escola.',
    ],
  },
  notas: {
    question: 'A Comunidade promete melhorar as notas?',
    paragraphs: [
      'Não. A nota depende da escola, do conteúdo da série e de muita coisa que acontece fora daqui. O que vocês conseguem ver diretamente é o jogo que ele fez e o que ele consegue explicar sobre ele.',
    ],
  },
  serie: {
    question: 'Os cursos seguem a série escolar do meu filho?',
    paragraphs: [
      'Não. A Jornada segue projetos de jogo, do mais simples ao mais elaborado, sem acompanhar o conteúdo de cada série. Leitura, números e lógica aparecem dentro das tarefas de cada projeto. Por isso ela não substitui o reforço quando há matéria atrasada.',
    ],
  },
  aprendizagem: {
    question: 'Como sei se ele entendeu ou só seguiu os passos?',
    paragraphs: [
      'Peça que ele preveja antes de testar: “se eu trocar cinco por dez, o que acontece?”. Prever o efeito pede que ele saiba o que o número faz, e copiar os passos não dá isso.',
      'A marca de conclusão diz que ele cumpriu a aula; a previsão, o teste e a explicação dizem o que ele entendeu.',
    ],
  },
  interesse: {
    question: 'E se ele gosta de jogar, mas nunca quis criar?',
    paragraphs: [
      'Mostre a ele as telas desta página e pergunte o que mudaria num jogo de que gosta: o personagem, uma regra, a dificuldade de uma fase. A primeira aula começa com ele jogando, antes de montar.',
      'Se nos sete dias ele não se envolver, vocês pedem o reembolso.',
    ],
  },
  matematica: {
    question: 'Meu filho tem dificuldade em matemática. Ele consegue começar?',
    paragraphs: [
      'O começo foi feito para isso: cada passo aparece no vídeo ao lado do editor, e os números entram como coisas que ele vê, como passos, pontos e vidas. Nas primeiras aulas, vale sentar junto e observar como ele lida com as quantidades.',
      'A Comunidade não tem um plano individual de reforço de matemática.',
    ],
  },
  leitura: {
    question: 'E se ele não gosta de ler ou ainda precisa de ajuda com textos?',
    paragraphs: [
      'Ler faz parte: a criança precisa ler as instruções e os blocos com alguma autonomia. A aula ajuda com o vídeo, e as falas do Zappy têm o botão Ouvir, que lê em voz alta.',
      'Se ele ainda precisa de bastante ajuda para entender uma instrução, acompanhe as primeiras tarefas para ver quanto apoio é necessário. A Comunidade não alfabetiza.',
    ],
  },
}

/** A tela de cada resposta própria (`notas` não tem demonstração). */
export const FAQ_ESCOLA_VISUALS: Record<string, readonly string[]> = {
  escola: ['contador'],
  notas: [],
  serie: ['catalogo'],
  aprendizagem: ['aprendizagem'],
  interesse: ['jogo-pronto'],
  matematica: ['aula-estudio'],
  leitura: ['aula'],
}
