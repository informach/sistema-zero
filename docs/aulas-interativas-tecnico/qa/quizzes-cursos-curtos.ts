/** Revisão do que foi construído, sem vídeo. Fonte dos dois geradores. */
import type { ManifestQuiz } from '../../../packages/core/src/learning/manifest-quiz'

type CourseReview = { title: string; intro: string; content: ManifestQuiz }

export const cadeTodoMundo = {
  title: 'Como o seu jardim funciona',
  intro:
    'Você fez os personagens aparecerem e ensinou o jogo a contar. Agora faça uma previsão em cada pergunta e clique em Ver o que acontece. Compare com a cena e a explicação. Você pode tentar de novo.',
  content: {
    kind: 'quiz',
    passingScore: 100,
    questions: [
      {
        id: 'q1',
        prompt: 'Vou tocar nas pedras. O que a regra deve fazer?',
        choices: [
          {
            id: 'a',
            label: 'Deixar só as pedras invisíveis.',
          },
          {
            id: 'b',
            label: 'Deixar todos os esconderijos invisíveis.',
          },
          {
            id: 'c',
            label: 'Deixar só o arbusto invisível.',
          },
        ],
        correctChoiceIds: ['a'],
        explanation:
          'Neste toque, escolhido são as pedras. Só elas ficam invisíveis. O arbusto e as flores continuam como estavam.',
        predictionScene: 'garden-touch',
      },
      {
        id: 'q2',
        prompt:
          'Achados está em 1. Vou tocar no jardim vazio e depois nas flores. Qual será o valor?',
        choices: [
          {
            id: 'a',
            label: '1, porque só o primeiro personagem conta.',
          },
          {
            id: 'b',
            label: '2, porque o toque vazio não soma e o novo personagem soma 1.',
          },
          {
            id: 'c',
            label: '3, porque os dois toques somam 1.',
          },
        ],
        correctChoiceIds: ['b'],
        explanation:
          'O toque vazio mantém o valor 1. Encontrar o personagem das flores executa a soma: 1 + 1 = 2.',
        predictionScene: 'garden-count',
      },
      {
        id: 'q3',
        prompt:
          'O coelho já apareceu. Vou tocar no mesmo lugar. O que acontece com Achados neste jogo?',
        choices: [
          {
            id: 'a',
            label: 'Aumenta para 2, porque qualquer toque soma.',
          },
          {
            id: 'b',
            label: 'Volta para 0, como em uma nova busca.',
          },
          {
            id: 'c',
            label: 'Continua em 1, porque o esconderijo invisível não recebe outro toque.',
          },
        ],
        correctChoiceIds: ['c'],
        explanation:
          'Neste jogo, o toque que soma pertence aos esconderijos visíveis. O arbusto invisível não recebe outro toque. A regra de somar não é executada, e o valor guardado continua em 1.',
        predictionScene: 'garden-repeat',
      },
    ],
  },
} satisfies CourseReview

export const farol = {
  title: 'As regras do seu curso',
  intro:
    'Você fez o personagem andar, pegar a chave e acender o farol. Agora vamos relembrar essas regras com quatro perguntas. Se errar alguma, leia o porquê, clique em Tentar de novo e responda outra vez.',
  content: {
    kind: 'quiz',
    passingScore: 100,
    questions: [
      {
        id: 'q1',
        prompt:
          'Seu personagem anda até a beirada da tela. Que ordem você montou para ele não sair da tela?',
        choices: [
          {
            id: 'a',
            label: 'Primeiro conferir o limite da tela e depois mover o personagem.',
          },
          {
            id: 'b',
            label: 'Primeiro mover o personagem e depois conferir o limite da tela.',
          },
          {
            id: 'c',
            label: 'Conferir o limite da tela uma vez só, quando o jogo começa.',
          },
        ],
        correctChoiceIds: ['b'],
        explanation:
          'Dentro de A cada quadro do jogo, primeiro o personagem anda e, logo depois, Manter o sprite personagem dentro da tela segura ele na borda. Se o limite viesse antes, o personagem andaria depois da conferência, e um pedacinho dele passaria da borda. E, conferido só no começo, o limite não seguraria nada depois. Por isso ele fica dentro de A cada quadro do jogo.',
      },
      {
        id: 'q-memoria-coleta',
        prompt:
          'Você pegou a chave: ela sumiu do chão e o aviso mudou. Mas, no farol, o jogo disse que falta a chave. A pergunta do farol está certa. O que você deve conferir primeiro nos blocos da coleta?',
        choices: [
          {
            id: 'a',
            label: 'Se o aviso usa exatamente as mesmas palavras do vídeo.',
          },
          {
            id: 'b',
            label: 'Se o encontro com a chave muda temChave para verdadeiro.',
          },
          {
            id: 'c',
            label: 'Se o bloco Destruir o sprite tira a chave do chão.',
          },
        ],
        correctChoiceIds: ['b'],
        explanation:
          'Destruir o sprite já funcionou: a chave sumiu do chão. Alterar aviso também: a mensagem mudou. Essas duas ações não guardam a coleta em temChave. Dentro do encontro com a chave, o bloco que altera temChave precisa guardar verdadeiro. É essa informação que o farol consulta depois.',
      },
      {
        id: 'q3',
        prompt:
          'Você chega ao farol sem recolher a chave. Com a condição que programou, o que o jogo deve fazer?',
        choices: [
          {
            id: 'a',
            label: 'Acender o farol, porque chegar à porta já é suficiente.',
          },
          {
            id: 'b',
            label: 'Não fazer nada, porque o personagem ainda não pegou a chave.',
          },
          {
            id: 'c',
            label: 'Manter o farol apagado e avisar que falta a chave.',
          },
        ],
        correctChoiceIds: ['c'],
        explanation:
          'A porta confere temChave. Se você não pegou a chave, temChave ainda é falso, e o jogo segue o senão: avisa que falta a chave. Antes de você montar o senão, era isso que acontecia: nada. O então, que acende o farol e chama o barco, só acontece quando temChave é verdadeiro.',
      },
      {
        id: 'q4',
        prompt:
          'Você pegou a chave, chegou ao farol e viu a luz acender. Qual teste ainda falta para conferir a regra da porta?',
        choices: [
          {
            id: 'a',
            label: 'Chegar outra vez ao farol, na mesma partida, ainda com a chave.',
          },
          {
            id: 'b',
            label:
              'Clicar em Atualizar para começar uma partida nova e ir ao farol sem pegar a chave.',
          },
          {
            id: 'c',
            label: 'Recolher a chave e repetir exatamente o caminho que já funcionou.',
          },
        ],
        correctChoiceIds: ['b'],
        explanation:
          'A porta tem duas respostas, a do então e a do senão. Você já conferiu o caminho com a chave. Na mesma partida, temChave continua verdadeiro, por isso o farol escolheria o então de novo. Só numa partida nova temChave volta a ser falso: clique em Atualizar e vá direto até a porta do farol. A luz deve continuar apagada, e o aviso deve dizer que falta a chave. Testar só o caminho que dá certo pode esconder uma regra montada no lugar errado.',
      },
    ],
  },
} satisfies CourseReview
