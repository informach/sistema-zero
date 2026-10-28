import type { ManifestQuiz } from '../../../packages/core/src/learning/manifest-quiz'
export const ilhaQuiz: ManifestQuiz = {
  kind: 'quiz',
  passingScore: 100,
  questions: [
    {
      id: 'ponto-de-vista',
      predictionScene: 'island-view',
      prompt: 'A chave apareceu quando olhamos de lado. O que mudou?',
      choices: [
        { id: 'a', label: 'A chave saiu de trás da pedra.' },
        { id: 'b', label: 'O lugar de onde olhamos.' },
        { id: 'c', label: 'A pedra ficou invisível.' },
      ],
      correctChoiceIds: ['b'],
      explanation:
        'A câmera mudou de lugar. A chave e a pedra continuaram nas mesmas posições. Um objeto pode esconder outro dependendo de onde você olha.',
    },
    {
      id: 'chao-altura',
      predictionScene: 'island-position',
      prompt: 'Vamos mudar só x da chave. O que acontece com a altura dela?',
      choices: [
        { id: 'a', label: 'Continua igual, porque a altura é y.' },
        { id: 'b', label: 'Aumenta junto com x.' },
        { id: 'c', label: 'Vira zero.' },
      ],
      correctChoiceIds: ['a'],
      explanation:
        'X e z indicam as duas direções do chão neste jogo. Y indica a altura. Mudar só x desloca a chave sem levantá-la.',
    },
    {
      id: 'contato-altura',
      predictionScene: 'island-height',
      prompt: 'De cima, a chave parece estar sobre o personagem. Isso garante que eles encostam?',
      choices: [
        { id: 'a', label: 'Sim, porque as imagens estão juntas.' },
        { id: 'b', label: 'Sim, porque a chave está visível.' },
        { id: 'c', label: 'Não. Precisamos conferir também a altura.' },
      ],
      correctChoiceIds: ['c'],
      explanation:
        'A vista de cima esconde a distância na altura. De lado, vemos que a chave está alta demais. As áreas de contato não se encontram.',
    },
    {
      id: 'novo-percurso',
      predictionScene: 'island-retest',
      prompt:
        'Você mudou o lugar da chave no seu jogo. Que teste ajuda a conferir se ainda dá para pegá-la?',
      choices: [
        { id: 'b', label: 'Levar o personagem até ela e conferir se a coleta acontece.' },
        { id: 'a', label: 'Olhar se ela tem uma cor bonita.' },
        { id: 'c', label: 'Só trocar a vista da câmera.' },
      ],
      correctChoiceIds: ['b'],
      explanation:
        'Ver a chave não garante que o personagem consiga alcançá-la. Jogue até o novo lugar, confira a coleta e depois leve a chave ao farol.',
    },
  ],
}
