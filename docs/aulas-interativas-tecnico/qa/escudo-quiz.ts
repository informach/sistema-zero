import type { ManifestQuiz } from '../../../packages/core/src/learning/manifest-quiz'

/** Aula 1 (2D): três previsões com cena e a escolha dos testes. */
export const escudoQuiz2d: ManifestQuiz = {
  kind: 'quiz',
  passingScore: 100,
  questions: [
    {
      id: 'protege',
      predictionScene: 'escudo-protege',
      prompt:
        'O Escudo está em 3, e a nave tem 3 vidas. Uma pedra bate na nave. O que vai acontecer?',
      choices: [
        { id: 'a', label: 'A pedra some e a nave continua com 3 vidas.' },
        { id: 'b', label: 'A nave perde uma vida, porque a pedra bateu.' },
        { id: 'c', label: 'A pedra atravessa a nave e continua caindo.' },
      ],
      correctChoiceIds: ['a'],
      explanation:
        'Na batida, o Se pergunta se tempoDoEscudo é maior que 0. 3 é maior que 0, então vale o então: só o som do quique. A pedra já saiu do grupo antes do Se, e a vida fica.',
    },
    {
      id: 'acabou',
      predictionScene: 'escudo-acabou',
      prompt:
        'A nave pegou o item há 5 segundos, e o Escudo chegou a 0. Agora uma pedra bate. O que vai acontecer?',
      choices: [
        { id: 'a', label: 'A pedra só some, porque a nave já pegou o escudo nesta partida.' },
        { id: 'b', label: 'A nave perde uma vida: com o Escudo em 0, vale o senão.' },
        { id: 'c', label: 'O Escudo volta a 5 sozinho.' },
      ],
      correctChoiceIds: ['b'],
      explanation:
        'O Se não pergunta se a nave já pegou o item: pergunta se ainda há tempo. Com o Escudo em 0, 0 não é maior que 0, e o senão tira uma vida. O escudo só volta a 5 quando a nave pega outro item.',
    },
    {
      id: 'renova',
      predictionScene: 'escudo-renova',
      prompt:
        'O Escudo está em 2, e a nave pega outro item. Quanto o Escudo vai mostrar logo depois?',
      choices: [
        { id: 'a', label: '7, porque soma 5 aos 2 que já tinha.' },
        { id: 'b', label: '5, porque pegar o item põe 5 em tempoDoEscudo.' },
        { id: 'c', label: '2, porque o escudo ainda não tinha acabado.' },
      ],
      correctChoiceIds: ['b'],
      explanation:
        'O encontro com o item usa Alterar variável tempoDoEscudo para 5: o número antigo é trocado por 5, não somado. Com Somar 5, o escudo poderia crescer sem parar.',
    },
    {
      id: 'testes',
      prompt: 'Para ter certeza de que o escudo funciona, quais testes você deve fazer?',
      choices: [
        { id: 'a', label: 'Só deixar uma pedra bater logo depois de pegar o item.' },
        {
          id: 'b',
          label:
            'Deixar uma pedra bater com o escudo ligado, esperar o Escudo chegar a 0 e deixar outra pedra bater.',
        },
        { id: 'c', label: 'Pegar dois itens seguidos e olhar se o número subiu.' },
      ],
      correctChoiceIds: ['b'],
      explanation:
        'O escudo tem duas respostas: com tempo, a pedra só sai; sem tempo, a nave perde uma vida. Uma batida com o escudo ligado e outra com ele em 0 conferem as duas, e o número parando no 0 confere o prazo.',
    },
  ],
}

/** Aula 2 (3D): a guarda da contagem, com cena, e o lugar do dano. */
export const escudoQuiz3d: ManifestQuiz = {
  kind: 'quiz',
  passingScore: 100,
  questions: [
    {
      id: 'sem-guarda',
      predictionScene: 'escudo-sem-guarda',
      prompt:
        'Na patrulha, o relógio de 1 segundo tira 1 de tempoDoEscudo, mas sem o Se tempoDoEscudo > 0. A nave pegou o item há 8 segundos. O que o Escudo mostra?',
      choices: [
        { id: 'a', label: '0, porque o escudo acabou.' },
        { id: 'b', label: '-3: sem o Se, o número continua descendo depois do 0.' },
        { id: 'c', label: '5, porque o relógio não mexe no escudo.' },
      ],
      correctChoiceIds: ['b'],
      explanation:
        'Sem a pergunta, o relógio tira 1 a cada segundo, mesmo depois do 0: 5, 4, 3, 2, 1, 0, -1, -2, -3. Com o Se tempoDoEscudo > 0, o número para no 0.',
    },
    {
      id: 'lugar-do-dano',
      prompt:
        'No encontro da nave com os asteroides, onde deve ficar o bloco Machucar nave tirando 1 de vida para o escudo proteger?',
      choices: [
        { id: 'a', label: 'No senão do Se tempoDoEscudo > 0.' },
        { id: 'b', label: 'No então do Se tempoDoEscudo > 0.' },
        { id: 'c', label: 'Antes do Se, para tirar a vida sempre.' },
      ],
      correctChoiceIds: ['a'],
      explanation:
        'O então roda quando ainda há escudo, e aí a vida deve ficar. O senão roda com o escudo em 0: é ali que a batida tira a vida. Antes do Se, o escudo não protegeria nunca.',
    },
  ],
}
