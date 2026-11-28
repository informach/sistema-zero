import type { ManifestQuiz } from '../../../packages/core/src/learning/manifest-quiz'

/** Aula 1 (2D): três previsões com cena e a escolha dos testes. */
export const inimigoQuiz2d: ManifestQuiz = {
  kind: 'quiz',
  passingScore: 100,
  questions: [
    {
      id: 'meio',
      predictionScene: 'inimigo-meio',
      prompt:
        'O tiro da inimiga nasce em x 395, um número fixo. A inimiga está na ponta esquerda da tela. De onde sai o próximo tiro?',
      choices: [
        { id: 'a', label: 'Da ponta esquerda, de baixo da inimiga.' },
        { id: 'b', label: 'Do meio da tela: o x 395 não muda com a inimiga.' },
        { id: 'c', label: 'De um lugar sorteado.' },
      ],
      correctChoiceIds: ['b'],
      explanation:
        'Um número fixo no x faz todo tiro nascer no mesmo lugar, longe da inimiga. Para o tiro acompanhar a inimiga, o x precisa ler a posição dela: o centro x do sprite inimiga.',
    },
    {
      id: 'segue',
      predictionScene: 'inimigo-segue',
      prompt:
        'Agora o x do tiro é o centro x da inimiga menos 5. A inimiga está na ponta direita. De onde sai o próximo tiro?',
      choices: [
        { id: 'a', label: 'Do meio da tela.' },
        { id: 'b', label: 'Da ponta esquerda.' },
        { id: 'c', label: 'De baixo da inimiga, na ponta direita.' },
      ],
      correctChoiceIds: ['c'],
      explanation:
        'O centro x da inimiga é lido na hora em que o tiro nasce. Com a inimiga na ponta direita, o tiro nasce ali, embaixo dela.',
    },
    {
      id: 'acerta',
      predictionScene: 'inimigo-acerta',
      prompt: 'A nave tem 3 vidas, e um tiro da inimiga chega até ela. O que acontece?',
      choices: [
        { id: 'a', label: 'O tiro sai do grupo e a nave fica com 2 vidas.' },
        { id: 'b', label: 'O tiro atravessa a nave, que continua com 3 vidas.' },
        { id: 'c', label: 'A partida termina na hora.' },
      ],
      correctChoiceIds: ['a'],
      explanation:
        'No encontro da nave com o grupo tirosInimigos, o tiro sai do grupo e a nave perde uma vida. Sem tirar o tiro do grupo, ele continuaria encostando e tiraria mais vidas.',
    },
    {
      id: 'testes',
      prompt: 'Para ter certeza de que a inimiga funciona, o que você deve testar?',
      choices: [
        { id: 'a', label: 'Só olhar a inimiga andando.' },
        {
          id: 'b',
          label:
            'Ver de onde saem dois tiros com a inimiga em lugares diferentes, deixar um tiro acertar a nave e recomeçar a partida.',
        },
        { id: 'c', label: 'Ganhar a partida sem ser atingido.' },
      ],
      correctChoiceIds: ['b'],
      explanation:
        'A inimiga tem três regras: o tiro sai de onde ela está, o tiro machuca e uma partida nova começa sem tiros. Cada teste confere uma.',
    },
  ],
}

/** Aula 2 (3D): a limpeza, com cena, e o lugar do dano. */
export const inimigoQuiz3d: ManifestQuiz = {
  kind: 'quiz',
  passingScore: 100,
  questions: [
    {
      id: 'limpeza',
      predictionScene: 'inimigo-limpeza',
      prompt:
        'Na patrulha, a inimiga atira a cada 1,5 segundo, mas falta o bloco que tira do grupo os tiros que passam da nave. Depois de 9 segundos, quantos tiros há no grupo tirosInimigos?',
      choices: [
        { id: 'a', label: 'Um ou dois, porque os outros já passaram.' },
        { id: 'b', label: 'Seis: os tiros que passaram continuam no grupo, atrás da câmera.' },
        { id: 'c', label: 'Nenhum, porque a câmera não vê os tiros.' },
      ],
      correctChoiceIds: ['b'],
      explanation:
        'Sair da tela não tira ninguém do grupo. Sem o bloco que tira quem saiu, os tiros se acumulam, e o jogo continua movendo todos. Com ele, só ficam os que ainda estão vindo.',
    },
    {
      id: 'guarda',
      prompt:
        'No encontro da nave com os tiros inimigos, por que o Machucar fica dentro do Se estado = jogando?',
      choices: [
        {
          id: 'a',
          label: 'Para a nave só perder vida durante a partida, e não na tela de início ou no fim.',
        },
        { id: 'b', label: 'Para o tiro andar mais rápido.' },
        { id: 'c', label: 'Para a inimiga atirar mais.' },
      ],
      correctChoiceIds: ['a'],
      explanation:
        'A guarda da partida faz o encontro valer só enquanto o estado é jogando. Fora dela, um tiro que encostasse na tela de início já tiraria vida.',
    },
  ],
}
