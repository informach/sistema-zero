import type { ManifestQuiz } from '../../../packages/core/src/learning/manifest-quiz'

/** Aula 1 (2D): duas previsões com cena, um diagnóstico e a escolha dos testes. */
export const cabanaQuiz2d: ManifestQuiz = {
  kind: 'quiz',
  passingScore: 100,
  questions: [
    {
      id: 'so-chave',
      predictionScene: 'cabana-so-chave',
      prompt:
        'A pergunta da cabana é "temChave e temEmblema". O personagem pegou só a chave. Quando ele encostar na cabana, o que vai acontecer?',
      choices: [
        { id: 'a', label: 'A cabana abre, porque ele tem a chave.' },
        {
          id: 'b',
          label: 'A cabana continua fechada e o aviso diz que ela pede a chave e o emblema.',
        },
        { id: 'c', label: 'A chave volta para o chão.' },
      ],
      correctChoiceIds: ['b'],
      explanation:
        'Com "e", as duas respostas precisam ser verdadeiras. temChave é verdadeiro, mas temEmblema ainda é falso, então a pergunta inteira dá falso e o jogo segue o senão: a cabana fica fechada e o aviso aparece.',
    },
    {
      id: 'ou',
      predictionScene: 'cabana-ou',
      prompt:
        'Agora a pergunta da cabana foi montada com "ou": "temChave ou temEmblema". O personagem pegou só o emblema. Quando ele encostar na cabana, o que acontece?',
      choices: [
        { id: 'a', label: 'Continua fechada, porque falta a chave.' },
        { id: 'b', label: 'Abre só se ele encostar duas vezes.' },
        { id: 'c', label: 'Abre: com "ou", basta uma das duas ser verdadeira.' },
      ],
      correctChoiceIds: ['c'],
      explanation:
        'Com "ou", uma resposta verdadeira já basta: temEmblema é verdadeiro, então a cabana abre com uma peça só. Por isso a cabana usa "e", que só abre com as duas.',
    },
    {
      id: 'diagnostico',
      prompt:
        'Num teste, a cabana abriu logo depois de pegar a chave, sem o emblema. O que está errado na regra da cabana?',
      choices: [
        { id: 'a', label: 'A pergunta usa "ou", ou pergunta só temChave.' },
        { id: 'b', label: 'O emblema está longe demais da cabana.' },
        { id: 'c', label: 'A variável temEmblema começa falsa.' },
      ],
      correctChoiceIds: ['a'],
      explanation:
        'Se uma peça só já abre, a pergunta não está exigindo as duas: ela usa "ou" no lugar de "e", ou esqueceu temEmblema. Começar falsa está certo: o emblema ainda não foi pego.',
    },
    {
      id: 'testes',
      prompt: 'Para ter certeza de que a cabana funciona, quais partidas você deve testar?',
      choices: [
        { id: 'a', label: 'Só uma partida pegando as duas peças.' },
        { id: 'b', label: 'Duas partidas iguais, pegando primeiro a chave.' },
        {
          id: 'c',
          label:
            'Uma só com a chave, uma só com o emblema e uma com as duas (e tentar sem nenhuma).',
        },
      ],
      correctChoiceIds: ['c'],
      explanation:
        'A regra tem que abrir com as duas e ficar fechada com uma só, qualquer que seja. Testando só com as duas, uma regra com "ou" passaria sem você perceber.',
    },
  ],
}

/** Aula 2 (3D): a transferência com cena na ilha e o lugar da animação da cabana. */
export const cabanaQuiz3d: ManifestQuiz = {
  kind: 'quiz',
  passingScore: 100,
  questions: [
    {
      id: 'ordem',
      predictionScene: 'cabana-ordem',
      prompt:
        'Na ilha, o personagem pegou primeiro o emblema e depois a chave. A pergunta da cabana é "temChave e temEmblema". Quando ele encostar na cabana, o que acontece?',
      choices: [
        { id: 'a', label: 'Fica fechada, porque a chave tinha que vir primeiro.' },
        { id: 'b', label: 'A cabana abre: as duas são verdadeiras, e a ordem não importa.' },
        { id: 'c', label: 'Abre e fecha de novo.' },
      ],
      correctChoiceIds: ['b'],
      explanation:
        'A pergunta olha o que está guardado agora, não a ordem em que as peças foram pegas. Com temChave e temEmblema verdadeiros, a cabana abre. É a mesma regra do jogo 2D, em outro mundo.',
    },
    {
      id: 'abrir',
      prompt:
        'Na cabana da ilha, onde deve ficar o bloco "Tocar a animação abrir" para ela abrir só com as duas peças?',
      choices: [
        { id: 'a', label: 'No "senão", junto do aviso.' },
        { id: 'b', label: 'Antes do Se, para tocar sempre que encostar.' },
        { id: 'c', label: 'Dentro do "então" do Se temChave e temEmblema.' },
      ],
      correctChoiceIds: ['c'],
      explanation:
        'O "então" só roda quando a pergunta é verdadeira, ou seja, com as duas peças. No senão ou antes do Se, a cabana abriria sem elas.',
    },
  ],
}
