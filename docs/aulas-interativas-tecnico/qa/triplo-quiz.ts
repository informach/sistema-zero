import type { ManifestQuiz } from '../../../packages/core/src/learning/manifest-quiz'

/** Aula 1 (2D): três previsões com cena e a escolha dos testes. */
export const triploQuiz2d: ManifestQuiz = {
  kind: 'quiz',
  passingScore: 100,
  questions: [
    {
      id: 'juntos',
      predictionScene: 'triplo-juntos',
      prompt:
        'O tiro triplo está ligado, mas os três lasers têm vx 0. Há três pedras no alto, uma à esquerda, uma no meio e uma à direita. A nave dispara uma vez. Quantas pedras ela acerta?',
      choices: [
        { id: 'a', label: 'Três, porque saem três lasers.' },
        { id: 'b', label: 'Uma só: os três lasers sobem juntos, no mesmo caminho.' },
        { id: 'c', label: 'Nenhuma, porque o vx 0 para os lasers.' },
      ],
      correctChoiceIds: ['b'],
      explanation:
        'Com o mesmo vx, os três lasers seguem o mesmo caminho e parecem um só. O vx 0 não para o laser: quem faz ele subir é o vy. Para abrir o leque, cada laser precisa de um vx diferente.',
    },
    {
      id: 'leque',
      predictionScene: 'triplo-leque',
      prompt:
        'Agora os três lasers têm vx −2, 0 e 2. A nave dispara uma vez, com as mesmas três pedras no alto. O que acontece?',
      choices: [
        { id: 'a', label: 'Cada laser segue o seu caminho, e as três pedras são acertadas.' },
        { id: 'b', label: 'Os três lasers vão para a direita.' },
        { id: 'c', label: 'Só o laser do meio sobe; os outros ficam parados.' },
      ],
      correctChoiceIds: ['a'],
      explanation:
        'O vx −2 leva um laser para a esquerda, o 0 sobe reto e o 2 vai para a direita. Os três sobem com o mesmo vy, e cada um chega a uma pedra.',
    },
    {
      id: 'um',
      predictionScene: 'triplo-um',
      prompt: 'O Triplo chegou a 0. A nave aperta Espaço. Quantos lasers saem?',
      choices: [
        { id: 'a', label: 'Três, porque a nave já pegou o item nesta partida.' },
        { id: 'b', label: 'Nenhum, porque o tiro triplo acabou.' },
        { id: 'c', label: 'Um: com o Triplo em 0, vale o senão, o laser de sempre.' },
      ],
      correctChoiceIds: ['c'],
      explanation:
        'O Se do Espaço pergunta se tempoTriplo é maior que 0. Com 0, a resposta é não, e o senão cria o laser de sempre. O tiro não some: ele só volta a ser simples.',
    },
    {
      id: 'testes',
      prompt: 'Para ter certeza de que o tiro triplo funciona, quais testes você deve fazer?',
      choices: [
        {
          id: 'a',
          label:
            'Disparar antes do item, disparar com o Triplo ligado e disparar depois que ele chega a 0.',
        },
        { id: 'b', label: 'Só disparar logo depois de pegar o item.' },
        { id: 'c', label: 'Pegar dois itens seguidos e contar o Triplo.' },
      ],
      correctChoiceIds: ['a'],
      explanation:
        'O Espaço tem duas respostas: três lasers com o Triplo ligado e um laser sem ele. Disparar antes, durante e depois confere as duas e o prazo.',
    },
  ],
}

/** Aula 2 (3D): os grupos, com cena, e o lugar do tiro simples. */
export const triploQuiz3d: ManifestQuiz = {
  kind: 'quiz',
  passingScore: 100,
  questions: [
    {
      id: 'grupos',
      predictionScene: 'triplo-grupos',
      prompt:
        'Na patrulha, o Espaço com o Triplo ligado cria três cópias do laser, mas as três no grupo tiros. Como os lasers vão sair?',
      choices: [
        { id: 'a', label: 'Em leque, porque são três cópias.' },
        {
          id: 'b',
          label:
            'Juntos e retos: as cópias pegam a velocidade do grupo, e o grupo tiros segue reto para a frente.',
        },
        { id: 'c', label: 'Cada um para um lado sorteado.' },
      ],
      correctChoiceIds: ['b'],
      explanation:
        'No Jogo 3D, a cópia não tem velocidade própria: quem dá a velocidade é o grupo. No mesmo grupo, as três sobem juntas. Em tirosEsquerda e tirosDireita, elas abrem o leque.',
    },
    {
      id: 'senao',
      prompt:
        'No Espaço da patrulha, onde deve ficar a cópia de sempre, a de um laser só, para ela valer só sem o tiro triplo?',
      choices: [
        { id: 'a', label: 'No então do Se tempoTriplo > 0.' },
        { id: 'b', label: 'Antes do Se, para sair sempre.' },
        { id: 'c', label: 'No senão do Se tempoTriplo > 0.' },
      ],
      correctChoiceIds: ['c'],
      explanation:
        'O senão roda quando o Triplo está em 0: é ali que sai o laser de sempre. Antes do Se, ele sairia junto com os três, e o leque teria quatro lasers.',
    },
  ],
}
