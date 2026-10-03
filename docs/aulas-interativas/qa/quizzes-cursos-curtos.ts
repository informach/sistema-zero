/** Revisão do que foi construído, sem vídeo. Fonte dos dois geradores. */
import type { ManifestQuiz } from '../../../packages/core/src/learning/manifest-quiz'

type CourseReview = { title: string; intro: string; content: ManifestQuiz }

export const cadeTodoMundo = {
  title: 'Como o seu jardim funciona',
  intro:
    'Você fez os personagens aparecerem e ensinou o jogo a contar. Agora responda três perguntas sobre essas regras. Depois de conferir as explicações, você pode corrigir o que precisar.',
  content: {
    kind: 'quiz',
    passingScore: 100,
    questions: [
      {
        id: 'q1',
        prompt:
          'Você toca em um esconderijo e consegue ver o personagem que estava atrás. Qual regra que você montou faz isso acontecer?',
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
          'O toque escolhe aquele esconderijo. Dentro dessa reação, você colocou a regra que deixa o esconderijo com 0% de visibilidade. Assim, o personagem que já estava atrás aparece. Os outros esconderijos continuam como estavam.',
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
          'Você encontrou um personagem e tocou outra vez no mesmo lugar. Por que a contagem não deve aumentar nesse segundo toque?',
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
          'O esconderijo ficou invisível depois do primeiro toque. Neste jogo, ele deixa de receber o toque que dispara a contagem. Isso impede contar o mesmo personagem de novo. Para aumentar Achados, você precisa encontrar outro personagem. Essa é uma regra deste jogo, não uma afirmação sobre todo objeto invisível em qualquer programa.',
      },
    ],
  },
} satisfies CourseReview

export const farol = {
  title: 'As regras da sua aventura',
  intro:
    'Seu personagem anda, recolhe a chave e faz o farol responder. Responda quatro perguntas sobre o que você programou. As explicações ajudam a conferir seu raciocínio e corrigir o que precisar.',
  content: {
    kind: 'quiz',
    passingScore: 100,
    questions: [
      {
        id: 'q1',
        prompt:
          'Seu personagem anda até a beirada da tela. Qual ordem você montou para ele continuar visível enquanto se move?',
        choices: [
          {
            id: 'a',
            label: 'Conferir a borda e depois mover o personagem para qualquer posição.',
          },
          {
            id: 'b',
            label: 'Mover o personagem e depois conferir o limite da tela.',
          },
          {
            id: 'c',
            label: 'Conferir a borda só quando o jogo começa.',
          },
        ],
        correctChoiceIds: ['b'],
        explanation:
          'Dentro de A cada quadro, primeiro o jogo move o personagem. Logo depois, a regra da borda mantém ele dentro da tela. O jogo repete essa sequência enquanto funciona; conferir a posição somente no começo não cuidaria dos movimentos seguintes.',
      },
      {
        id: 'q2',
        prompt:
          'A chave saiu do chão e o personagem já se afastou dela. O que permite ao jogo continuar sabendo que ela foi recolhida?',
        choices: [
          {
            id: 'a',
            label: 'A variável temChave, que passou a guardar verdadeiro.',
          },
          {
            id: 'b',
            label: 'A mensagem de coleta que apareceu na tela.',
          },
          {
            id: 'c',
            label: 'A distância entre o personagem e o lugar da chave.',
          },
        ],
        correctChoiceIds: ['a'],
        explanation:
          'No encontro com a chave, você mudou temChave de falso para verdadeiro. Essa informação fica guardada durante a partida, mesmo quando a chave desaparece e o personagem vai embora. A mensagem conta o que aconteceu para quem joga, mas é temChave que a porta consulta.',
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
            label: 'Retirar a chave do chão, mesmo sem o personagem encostar nela.',
          },
          {
            id: 'c',
            label: 'Manter o farol apagado e avisar que falta a chave.',
          },
        ],
        correctChoiceIds: ['c'],
        explanation:
          'A porta confere temChave. Sem a coleta, o valor ainda é falso, e o jogo segue a resposta senão: avisa que falta a chave. A resposta então, que acende o farol e aciona o barco, acontece quando a informação é verdadeira.',
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
            label: 'Reiniciar a partida e ir ao farol sem pegar a chave.',
          },
          {
            id: 'c',
            label: 'Recolher a chave e repetir exatamente o caminho que já funcionou.',
          },
        ],
        correctChoiceIds: ['b'],
        explanation:
          'A porta tem duas respostas. Você já conferiu o caminho com a chave. Reiniciar e ir direto ao farol permite conferir o caminho sem ela. Nesse teste, a luz deve continuar apagada e a mensagem deve explicar que falta a chave. Testar só o caminho que dá certo pode esconder uma regra montada no lugar errado.',
      },
    ],
  },
} satisfies CourseReview
