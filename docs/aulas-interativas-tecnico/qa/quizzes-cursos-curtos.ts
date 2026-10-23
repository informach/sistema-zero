/** Revisão do que foi construído, sem vídeo. Fonte dos dois geradores. */
import type { ManifestQuiz } from '../../../packages/core/src/learning/manifest-quiz'

type CourseReview = { title: string; intro: string; content: ManifestQuiz }

export const cadeTodoMundo = {
  title: 'Como o seu jardim funciona',
  intro:
    'Você fez os personagens aparecerem e ensinou o jogo a contar. Agora vamos relembrar essas regras com três perguntas. Se errar alguma, leia o porquê, clique em Tentar de novo e responda outra vez.',
  content: {
    kind: 'quiz',
    passingScore: 100,
    questions: [
      {
        id: 'q1',
        prompt:
          'Você toca em um esconderijo e consegue ver o personagem que estava atrás. Que regra do seu jogo faz isso?',
        choices: [
          {
            id: 'a',
            label: 'O jogo deixa o esconderijo tocado invisível.',
          },
          {
            id: 'b',
            label: 'O jogo deixa todos os esconderijos invisíveis.',
          },
          {
            id: 'c',
            label: 'O jogo troca o personagem de lugar.',
          },
        ],
        correctChoiceIds: ['a'],
        explanation:
          'O toque escolhe aquele esconderijo e o chama de escolhido. Dentro do bloco do toque, você colocou a ação que deixa escolhido com 0% de visibilidade. Assim, o personagem que já estava atrás aparece. Os outros esconderijos continuam como estavam.',
      },
      {
        id: 'q2',
        prompt:
          'Você encontrou um personagem e Achados mostra 1. Depois encontrou outro personagem. Com a regra de contagem que você montou, o que deve aparecer em Achados?',
        choices: [
          {
            id: 'a',
            label: '1, porque o jogo guarda apenas o primeiro personagem.',
          },
          {
            id: 'b',
            label: '2, porque cada personagem encontrado soma um à contagem.',
          },
          {
            id: 'c',
            label: '3, porque existem três personagens no jardim.',
          },
        ],
        correctChoiceIds: ['b'],
        explanation:
          'A variável achados guarda quantos personagens foram encontrados. O bloco de somar acrescenta 1 quando um novo esconderijo recebe o toque. Encontrar dois personagens faz a contagem chegar a 2. Ter três personagens no jogo não significa que os três já foram encontrados.',
      },
      {
        id: 'q3',
        prompt:
          'Você encontrou um personagem e tocou outra vez no mesmo lugar. Por que a contagem não aumenta nesse segundo toque?',
        choices: [
          {
            id: 'a',
            label: 'Porque o jogo só pode contar até um.',
          },
          {
            id: 'b',
            label: 'Porque o jogo precisa ser reiniciado para contar o próximo.',
          },
          {
            id: 'c',
            label: 'Porque o esconderijo invisível não recebe outro toque.',
          },
        ],
        correctChoiceIds: ['c'],
        explanation:
          'O esconderijo ficou invisível depois do primeiro toque. Neste jogo, ele deixa de receber o toque que dispara a contagem. Isso impede contar o mesmo personagem de novo. Para aumentar Achados, você precisa encontrar outro personagem.',
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
