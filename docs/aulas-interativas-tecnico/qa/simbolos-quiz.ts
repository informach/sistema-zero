import type { ManifestQuiz } from '../../../packages/core/src/learning/manifest-quiz'

/** Aula 1 (2D): duas previsões com cena e dois diagnósticos das perguntas do Se. */
export const simbolosQuiz2d: ManifestQuiz = {
  kind: 'quiz',
  passingScore: 100,
  questions: [
    {
      id: 'vez-da-estrela',
      predictionScene: 'simbolos-ordem',
      prompt:
        'O personagem tocou o sol e a lua: passo é 2. Agora ele vai encostar na estrela. O que vai acontecer?',
      choices: [
        { id: 'a', label: 'A tentativa recomeça, porque a estrela é a última.' },
        { id: 'b', label: 'Nada: a estrela precisa ser tocada duas vezes.' },
        { id: 'c', label: 'A estrela acende e o baú abre.' },
      ],
      correctChoiceIds: ['c'],
      explanation:
        'A estrela pergunta se passo é igual a 2. Com o sol e a lua tocados, passo é 2: o Se escolhe o então, a estrela acende e o baú abre.',
    },
    {
      id: 'fora-da-vez',
      predictionScene: 'simbolos-fora',
      prompt:
        'Agora o personagem tocou só o sol, pulou a lua e vai encostar na estrela. O que acontece?',
      choices: [
        {
          id: 'a',
          label: 'A tentativa recomeça: passo volta a 0, o sol apaga e o baú fica fechado.',
        },
        { id: 'b', label: 'O baú abre, porque o sol já estava aceso.' },
        { id: 'c', label: 'A estrela acende e espera a lua.' },
      ],
      correctChoiceIds: ['a'],
      explanation:
        'Com só o sol, passo é 1. A estrela pergunta passo = 2, a resposta é falso e o jogo segue o senão: passo volta a 0 e os acesos apagam.',
    },
    {
      id: 'so-estrela',
      prompt: 'Num teste, o baú abriu só tocando a estrela, sem o sol e sem a lua. O que falta?',
      choices: [
        { id: 'a', label: 'Uma placa com a ordem mais perto das pedras.' },
        {
          id: 'b',
          label: 'O Se passo = 2 no encontro com a estrela (ou o baú ficou fora do então).',
        },
        { id: 'c', label: 'Começar passo com 2.' },
      ],
      correctChoiceIds: ['b'],
      explanation:
        'Quem impede a estrela de abrir antes da hora é a pergunta passo = 2. Sem ela, ou com a abertura do baú fora do então, a estrela abre o baú em qualquer momento.',
    },
    {
      id: 'sem-sol',
      prompt:
        'Depois de errar a ordem, tocar a lua e a estrela abriu o baú, sem o sol. Onde está o erro?',
      choices: [
        { id: 'a', label: 'O senão não volta passo para 0.' },
        { id: 'b', label: 'A estrela está longe demais da lua.' },
        { id: 'c', label: 'O aviso de erro está escrito errado.' },
      ],
      correctChoiceIds: ['a'],
      explanation:
        'Se o senão não volta passo para 0, o jogo continua lembrando o passo de antes do erro. Aí a lua e a estrela acham que ainda é a vez delas.',
    },
  ],
}

/** Aula 2 (3D): a transferência com cena na ilha e o lugar da animação abrir. */
export const simbolosQuiz3d: ManifestQuiz = {
  kind: 'quiz',
  passingScore: 100,
  questions: [
    {
      id: 'recomeca',
      predictionScene: 'simbolos-recomeca',
      prompt:
        'Na ilha, o personagem começou pela lua: não era a vez dela e nada acendeu. Agora ele toca o sol, a lua e a estrela, nessa ordem. O que acontece?',
      choices: [
        { id: 'a', label: 'O baú continua fechado: depois de errar, é preciso apertar R.' },
        { id: 'b', label: 'O baú abre: recomeçar pelo sol vale.' },
        { id: 'c', label: 'Só a lua acende, porque ela foi tocada duas vezes.' },
      ],
      correctChoiceIds: ['b'],
      explanation:
        'O erro só voltou passo para 0. Tocar o sol muda passo para 1, a lua para 2, e a estrela encontra passo = 2: o baú abre.',
    },
    {
      id: 'abrir',
      prompt: 'Na ilha, onde deve ficar o bloco "Tocar a animação abrir" do baú?',
      choices: [
        { id: 'a', label: 'No encontro com o sol, para o baú abrir logo.' },
        { id: 'b', label: 'No senão do Se da estrela.' },
        { id: 'c', label: 'No então do Se passo = 2, no encontro com a estrela.' },
      ],
      correctChoiceIds: ['c'],
      explanation:
        'O baú só pode abrir quando a estrela é tocada na vez dela. Por isso a animação abrir fica no então do Se passo = 2; no senão, ele abriria justo quando a ordem está errada.',
    },
  ],
}
