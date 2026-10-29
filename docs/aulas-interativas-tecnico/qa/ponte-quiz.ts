import type { ManifestQuiz } from '../../../packages/core/src/learning/manifest-quiz'

/** Aula 1 (2D): duas previsões com cena e dois diagnósticos do "depois de". */
export const ponteQuiz2d: ManifestQuiz = {
  kind: 'quiz',
  passingScore: 100,
  questions: [
    {
      id: 'a-tempo',
      predictionScene: 'ponte-a-tempo',
      prompt:
        'A ponte sobe 4 segundos depois de puxar a alavanca. O personagem puxou a alavanca, esperou 2 segundos e vai encostar na ponte. O que vai acontecer?',
      choices: [
        { id: 'a', label: 'A ponte já subiu e ele fica na praia.' },
        { id: 'b', label: 'Ele atravessa e o sino toca.' },
        { id: 'c', label: 'A ponte sobe na hora em que ele encosta.' },
      ],
      correctChoiceIds: ['b'],
      explanation:
        'Com 2 segundos, o relógio do "depois de" ainda não chegou a 4: ponteAberta continua verdadeiro e o Se da ponte deixa atravessar. O sino toca.',
    },
    {
      id: 'atrasado',
      predictionScene: 'ponte-atrasado',
      prompt:
        'Agora o personagem puxou a alavanca e esperou 5 segundos antes de encostar na ponte. O que acontece?',
      choices: [
        {
          id: 'a',
          label: 'A ponte já subiu: ele fica na praia e o aviso pede para puxar de novo.',
        },
        { id: 'b', label: 'Ele atravessa, porque já tinha puxado a alavanca.' },
        { id: 'c', label: 'A ponte espera por ele para subir.' },
      ],
      correctChoiceIds: ['a'],
      explanation:
        'No quarto segundo, o "depois de" rodou: a ponte subiu e ponteAberta voltou a falso. Quando ele encosta, o Se dá falso e o jogo segue o senão.',
    },
    {
      id: 'nunca-sobe',
      prompt: 'Num teste, a ponte baixou e nunca mais subiu. O que falta?',
      choices: [
        { id: 'a', label: 'Uma segunda alavanca.' },
        {
          id: 'b',
          label: 'O "depois de 4 segundos" com a subida dentro (ou ele está lá, mas vazio).',
        },
        { id: 'c', label: 'Começar ponteAberta como verdadeiro.' },
      ],
      correctChoiceIds: ['b'],
      explanation:
        'Quem sobe a ponte é o que está dentro do "depois de": tocar a subida e guardar ponteAberta = falso. Sem ele, ou com ele vazio, nada manda a ponte subir.',
    },
    {
      id: 'no-comeco',
      prompt:
        'A ponte subiu sozinha uma vez, logo no começo, e depois disso a alavanca baixa a ponte e ela não sobe mais. Onde está o erro?',
      choices: [
        { id: 'a', label: 'O tempo do "depois de" é curto demais.' },
        { id: 'b', label: 'A alavanca está longe da ponte.' },
        { id: 'c', label: 'O "depois de" está no começo do jogo, fora do evento da alavanca.' },
      ],
      correctChoiceIds: ['c'],
      explanation:
        'O relógio só começa quando o bloco roda. No começo do jogo ele roda uma vez só; dentro do evento da alavanca, roda a cada puxada.',
    },
  ],
}

/** Aula 2 (3D): a transferência com cena na ilha e o lugar da animação subir. */
export const ponteQuiz3d: ManifestQuiz = {
  kind: 'quiz',
  passingScore: 100,
  questions: [
    {
      id: 'de-novo',
      predictionScene: 'ponte-de-novo',
      prompt:
        'Na ilha, a ponte já subiu sozinha. O personagem encosta na alavanca de novo. O que acontece com a ponte?',
      choices: [
        { id: 'a', label: 'Nada: a alavanca só funciona uma vez.' },
        { id: 'b', label: 'Ela baixa outra vez, e o relógio começa a contar de novo.' },
        { id: 'c', label: 'Ela baixa e nunca mais sobe.' },
      ],
      correctChoiceIds: ['b'],
      explanation:
        'Cada encontro com a alavanca roda o evento inteiro de novo: a ponte baixa, ponteAberta vira verdadeiro e um novo "depois de 4 segundos" começa a contar.',
    },
    {
      id: 'subir',
      prompt: 'Na ponte da ilha, onde deve ficar o bloco "Tocar a animação subir"?',
      choices: [
        { id: 'a', label: 'Dentro do "depois de 4 segundos", no evento da alavanca.' },
        { id: 'b', label: 'Logo depois de "Tocar a animação baixar", fora do "depois de".' },
        { id: 'c', label: 'No "senão" do Se da ponte.' },
      ],
      correctChoiceIds: ['a'],
      explanation:
        'Dentro do "depois de", a subida espera os 4 segundos. Logo depois do baixar, a ponte subiria na mesma hora; no senão, só subiria quando alguém encostasse nela.',
    },
  ],
}
