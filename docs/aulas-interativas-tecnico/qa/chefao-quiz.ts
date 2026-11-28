import type { ManifestQuiz } from '../../../packages/core/src/learning/manifest-quiz'

/** Aula 1 (2D): três previsões com cena e a escolha dos testes. */
export const chefaoQuiz2d: ManifestQuiz = {
  kind: 'quiz',
  passingScore: 100,
  questions: [
    {
      id: 'um-tiro',
      predictionScene: 'chefao-um-tiro',
      prompt: 'O chefão tem 5 de vida, e um laser acaba de encostar nele. O que acontece?',
      choices: [
        { id: 'a', label: 'O chefão explode na hora.' },
        { id: 'b', label: 'O laser sai, a vida fica em 4 e o chefão continua lá.' },
        { id: 'c', label: 'Nada: o laser atravessa o chefão.' },
      ],
      correctChoiceIds: ['b'],
      explanation:
        'Cada acerto tira só 1 da variável vidaDoChefao. Com 5 de vida, um laser deixa 4, e o chefão só cai quando a vida chega a 0.',
    },
    {
      id: 'sem-retirada',
      predictionScene: 'chefao-sem-retirada',
      prompt:
        'Falta o bloco que tira o laser do grupo tiros no acerto. Um laser encosta no chefão e continua encostando por vários quadros. O que acontece com a vida?',
      choices: [
        { id: 'a', label: 'Perde 1, como sempre.' },
        { id: 'b', label: 'Não muda, porque o laser não saiu.' },
        { id: 'c', label: 'Perde 1 a cada quadro, e um laser só derruba o chefão.' },
      ],
      correctChoiceIds: ['c'],
      explanation:
        'O encontro é conferido a cada quadro. Se o laser continua no grupo, ele encosta de novo no quadro seguinte e tira mais 1. Tirar o laser do grupo faz cada laser valer um acerto só.',
    },
    {
      id: 'sem-guarda',
      predictionScene: 'chefao-sem-guarda',
      prompt:
        'O Se vidaDoChefao ≤ 0 soma 10 em pontos, sem a guarda chefaoDerrotado. A vida acabou de chegar a 0. O que acontece com o placar?',
      choices: [
        { id: 'a', label: 'Ganha 10 e para.' },
        { id: 'b', label: 'Continua subindo sem parar.' },
        { id: 'c', label: 'Volta a 0.' },
      ],
      correctChoiceIds: ['b'],
      explanation:
        'O quadro do jogo roda o Se sem parar, e a vida continua em 0: o prêmio soma de novo a cada quadro. A guarda chefaoDerrotado vira verdadeiro na primeira vez e não deixa o prêmio voltar.',
    },
    {
      id: 'testes',
      prompt: 'Para ter certeza de que o chefão funciona, o que você deve testar?',
      choices: [
        { id: 'a', label: 'Só olhar o chefão parado lá em cima.' },
        { id: 'b', label: 'Acertar o chefão uma vez e passar para outra coisa.' },
        {
          id: 'c',
          label:
            'Acertar uma vez e ver a barra descer, acertar até a vida chegar a 0 e olhar o placar depois do prêmio.',
        },
      ],
      correctChoiceIds: ['c'],
      explanation:
        'O chefão tem três regras: um laser não basta, a vida desce de um em um e o prêmio vale uma vez só. Cada teste confere uma.',
    },
  ],
}

/** Aula 2 (3D): a guarda, com cena, e o texto da vida. */
export const chefaoQuiz3d: ManifestQuiz = {
  kind: 'quiz',
  passingScore: 100,
  questions: [
    {
      id: 'guarda',
      predictionScene: 'chefao-guarda',
      prompt:
        'Na patrulha, o placar está em 15 e o prêmio fica dentro do Se chefaoDerrotado = falso. A vida do chefão acabou de chegar a 0. Como fica o placar?',
      choices: [
        { id: 'a', label: 'Em 25, e para ali.' },
        { id: 'b', label: 'Sobe sem parar.' },
        { id: 'c', label: 'Fica em 15.' },
      ],
      correctChoiceIds: ['a'],
      explanation:
        'Na primeira vez, chefaoDerrotado ainda é falso: o prêmio soma 10 e chefaoDerrotado vira verdadeiro. Nos quadros seguintes chefaoDerrotado já é verdadeiro, e o prêmio não soma mais.',
    },
    {
      id: 'texto',
      prompt:
        'O chefão cai depois de 5 lasers, mas o texto Chefão mostra 5 o tempo todo. O que falta?',
      choices: [
        { id: 'a', label: 'Trocar a vida do chefão por 10.' },
        { id: 'b', label: 'Tirar o laser do grupo tiros.' },
        { id: 'c', label: 'Escrever o texto Chefão de novo logo depois de tirar 1 da vida.' },
      ],
      correctChoiceIds: ['c'],
      explanation:
        'No Jogo 3D, o texto da tela só muda quando é escrito de novo. A vida desce, mas o texto continua com o valor da última vez que foi escrito, lá em Ao iniciar.',
    },
  ],
}
