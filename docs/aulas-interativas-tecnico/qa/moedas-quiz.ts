import type { ManifestQuiz } from '../../../packages/core/src/learning/manifest-quiz'

/** Aula 1 (2D): duas previsões com cena, um diagnóstico e a escolha dos testes. */
export const moedasQuiz2d: ManifestQuiz = {
  kind: 'quiz',
  passingScore: 100,
  questions: [
    {
      id: 'poucas',
      predictionScene: 'moedas-poucas',
      prompt:
        'O personagem pegou 4 moedas. A regra do baú abre com pelo menos 5; com menos, mostra um aviso. Quando ele encostar no baú, o que vai acontecer?',
      choices: [
        { id: 'a', label: 'O baú abre, porque 4 já é quase 5.' },
        { id: 'b', label: 'O baú fica fechado e o aviso diz que ele pede pelo menos 5 moedas.' },
        { id: 'c', label: 'O número de moedas volta para zero.' },
      ],
      correctChoiceIds: ['b'],
      explanation:
        'O baú compara o número guardado com a meta. 4 é menos que 5, então a resposta é o senão: o baú continua fechado e o aviso aparece. Encostar no baú não muda as moedas.',
    },
    {
      id: 'igual',
      predictionScene: 'moedas-igual',
      prompt:
        'Agora o personagem pegou as 6 moedas. A regra do baú está "moedas igual a 5". Quando ele encostar no baú, ele abre?',
      choices: [
        { id: 'a', label: 'Não abre: 6 não é igual a 5. Com "pelo menos 5", abriria.' },
        { id: 'b', label: 'Abre, porque 6 é mais do que 5.' },
        { id: 'c', label: 'Abre só se ele encostar duas vezes.' },
      ],
      correctChoiceIds: ['a'],
      explanation:
        '"Igual a 5" só aceita exatamente 5. Quem juntou mais moedas fica com o baú fechado. "Pelo menos 5" aceita 5 ou mais, e é o que a meta do jogo quer dizer.',
    },
    {
      id: 'vinte',
      prompt:
        'Num teste, havia 6 moedas no caminho, mas o número chegou a 20. O que faltou na regra da coleta?',
      choices: [
        { id: 'a', label: 'Mostrar o placar mais vezes.' },
        { id: 'b', label: 'Começar a variável moedas em 20.' },
        { id: 'c', label: 'Tirar a moeda do grupo quando o personagem encosta nela.' },
      ],
      correctChoiceIds: ['c'],
      explanation:
        'Se a moeda continua no grupo, cada nova encostada nela soma de novo, e 6 moedas podem virar 20. Tirar a moeda do grupo faz cada uma contar uma vez só.',
    },
    {
      id: 'testes',
      prompt: 'Para ter certeza de que a regra do baú funciona, quais partidas você deve testar?',
      choices: [
        { id: 'a', label: 'Só uma partida pegando as 6 moedas.' },
        { id: 'b', label: 'Uma partida com menos de 5 moedas e outra com 5 ou mais.' },
        { id: 'c', label: 'Duas partidas iguais, pegando 5 moedas nas duas.' },
      ],
      correctChoiceIds: ['b'],
      explanation:
        'A regra tem duas respostas: abrir e avisar. Uma partida com menos de 5 confere o aviso, e outra com 5 ou mais confere se o baú abre. Uma partida só testa um lado.',
    },
  ],
}

/** Aula 2 (3D): a transferência com cena na ilha e o lugar da animação do baú. */
export const moedasQuiz3d: ManifestQuiz = {
  kind: 'quiz',
  passingScore: 100,
  questions: [
    {
      id: 'volta',
      predictionScene: 'moedas-volta',
      prompt:
        'Na ilha, a moeda some do grupo e moedas soma 1. O personagem já pegou 3 moedas, e a moeda deste lugar foi uma delas. Quando ele voltar a este lugar, o que acontece com moedas?',
      choices: [
        { id: 'a', label: 'Vira 4, porque ele passou de novo pelo lugar.' },
        { id: 'b', label: 'Continua 3: a moeda já saiu do grupo e não há encontro novo.' },
        { id: 'c', label: 'Volta para 0, porque a moeda sumiu.' },
      ],
      correctChoiceIds: ['b'],
      explanation:
        'A moeda saiu do grupo quando foi pega. Voltar ao lugar dela não encosta em moeda nenhuma, então nada soma: moedas continua em 3. É a mesma regra do jogo 2D, em outro mundo.',
    },
    {
      id: 'abrir',
      prompt:
        'No baú da ilha, onde deve ficar o bloco "Tocar a animação abrir" para o baú abrir só com moedas suficientes?',
      choices: [
        { id: 'a', label: 'Dentro do "então" do Se moedas ≥ 5.' },
        { id: 'b', label: 'No "senão", junto do aviso.' },
        { id: 'c', label: 'Antes do Se, para tocar sempre que encostar.' },
      ],
      correctChoiceIds: ['a'],
      explanation:
        'O "então" só roda quando a comparação é verdadeira, ou seja, com 5 moedas ou mais. No senão ou antes do Se, o baú abriria sem moedas suficientes.',
    },
  ],
}
