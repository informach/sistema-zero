import type { ManifestQuiz } from '../../../packages/core/src/learning/manifest-quiz'

/** Aula 1 (2D): três previsões com cena e a escolha dos testes. */
export const armaQuiz2d: ManifestQuiz = {
  kind: 'quiz',
  passingScore: 100,
  questions: [
    {
      id: 'trancada',
      predictionScene: 'arma-trancada',
      prompt:
        'A nave ainda não pegou o item de plasma, e a arma é laser. A tecla E é apertada. Qual é a arma agora?',
      choices: [
        { id: 'a', label: 'Plasma: a tecla E sempre troca.' },
        { id: 'b', label: 'Laser: sem o item, plasmaLiberado é falso e a troca não acontece.' },
        { id: 'c', label: 'Nenhuma: a nave para de atirar.' },
      ],
      correctChoiceIds: ['b'],
      explanation:
        'A tecla E pergunta primeiro se plasmaLiberado é verdadeiro. Antes do item ele é falso, então nada muda e a arma continua laser.',
    },
    {
      id: 'plasma',
      predictionScene: 'arma-plasma',
      prompt:
        'O plasma foi liberado, a tecla E trocou e a arma é plasma. O Espaço é apertado. Que tiro sai?',
      choices: [
        { id: 'a', label: 'O laser fino de sempre.' },
        { id: 'b', label: 'O laser e o plasma juntos.' },
        { id: 'c', label: 'O plasma, grande e lento, no grupo tirosPlasma.' },
      ],
      correctChoiceIds: ['c'],
      explanation:
        'O Espaço pergunta a arma: com arma igual a plasma, vale o então, que cria o plasma. O laser fica no senão e só sai quando a arma é laser.',
    },
    {
      id: 'reinicio',
      predictionScene: 'arma-reinicio',
      prompt: 'A arma é plasma, e a partida termina. Na partida nova, qual é a arma?',
      choices: [
        { id: 'a', label: 'Laser: as variáveis nascem de novo em Ao iniciar.' },
        { id: 'b', label: 'Plasma, porque foi a última escolhida.' },
        { id: 'c', label: 'Nenhuma, até pegar o item de novo.' },
      ],
      correctChoiceIds: ['a'],
      explanation:
        'Recomeçar roda o Ao iniciar de novo: arma nasce como laser e plasmaLiberado como falso. Para trocar outra vez, é preciso pegar um item novo.',
    },
    {
      id: 'testes',
      prompt: 'Para ter certeza de que a troca de arma funciona, o que você deve testar?',
      choices: [
        { id: 'a', label: 'Só pegar o item.' },
        {
          id: 'b',
          label:
            'Apertar E antes do item, pegar o item e trocar, disparar com as duas armas e começar uma partida nova.',
        },
        { id: 'c', label: 'Disparar várias vezes com o laser.' },
      ],
      correctChoiceIds: ['b'],
      explanation:
        'A troca tem quatro regras: o item libera, a tecla E troca, o Espaço segue a arma e a partida nova volta ao laser. Cada teste confere uma.',
    },
  ],
}

/** Aula 2 (3D): o texto da arma, com cena, e um diagnóstico. */
export const armaQuiz3d: ManifestQuiz = {
  kind: 'quiz',
  passingScore: 100,
  questions: [
    {
      id: 'placar',
      predictionScene: 'arma-placar',
      prompt:
        'Na patrulha, o texto Arma só é escrito em Ao iniciar. A nave pega o item, e a tecla E troca para o plasma. O que o texto mostra?',
      choices: [
        { id: 'a', label: 'Arma: plasma.' },
        { id: 'b', label: 'Arma: laser, porque o texto não foi escrito de novo.' },
        { id: 'c', label: 'O texto some.' },
      ],
      correctChoiceIds: ['b'],
      explanation:
        'No Jogo 3D, o texto da tela só muda quando é escrito de novo. A arma mudou, mas o texto continua com o que foi escrito em Ao iniciar. Por isso ele também vai logo depois da troca.',
    },
    {
      id: 'diagnostico',
      prompt: 'O texto mostra Arma: plasma, mas o Espaço continua soltando o laser. O que falta?',
      choices: [
        { id: 'a', label: 'Pegar mais um item.' },
        { id: 'b', label: 'Escrever o texto de novo.' },
        {
          id: 'c',
          label: 'No Espaço, um Se arma = plasma que cria o plasma, com o laser no senão.',
        },
      ],
      correctChoiceIds: ['c'],
      explanation:
        'A arma já mudou, e o texto mostra isso. Quem decide o tiro é o Espaço: sem a pergunta pela arma, ele cria sempre o laser.',
    },
  ],
}
