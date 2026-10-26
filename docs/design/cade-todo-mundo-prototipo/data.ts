// Local behavior examples for the approval prototype; no project or account is changed.
export const ProposalQuestions = [
  {
    id: 'p-1',
    prompt: 'Vou tocar nas pedras. O que a regra deve fazer?',
    choices: [
      {
        id: 'c0',
        label: 'Deixar só as pedras invisíveis.',
      },
      {
        id: 'c1',
        label: 'Deixar todos os esconderijos invisíveis.',
      },
      {
        id: 'c2',
        label: 'Deixar só o arbusto invisível.',
      },
    ],
    correctChoiceIds: ['c0'],
    explanation:
      'Neste toque, escolhido são as pedras. Só elas ficam invisíveis. O arbusto e as flores continuam como estavam.',
  },
  {
    id: 'p-2',
    prompt: 'Achados está em 1. Vou tocar no jardim vazio e depois nas flores. Qual será o valor?',
    choices: [
      {
        id: 'c0',
        label: '1, porque só o primeiro personagem conta.',
      },
      {
        id: 'c1',
        label: '2, porque o toque vazio não soma e o novo personagem soma 1.',
      },
      {
        id: 'c2',
        label: '3, porque os dois toques somam 1.',
      },
    ],
    correctChoiceIds: ['c1'],
    explanation:
      'O toque vazio mantém o valor 1. Encontrar o personagem das flores executa a soma: 1 + 1 = 2.',
  },
  {
    id: 'p-3',
    prompt:
      'O coelho já apareceu. Vou tocar no mesmo lugar. O que acontece com Achados neste jogo?',
    choices: [
      {
        id: 'c0',
        label: 'Aumenta para 2, porque qualquer toque soma.',
      },
      {
        id: 'c1',
        label: 'Volta para 0, como em uma nova busca.',
      },
      {
        id: 'c2',
        label: 'Continua em 1, porque o esconderijo invisível não recebe outro toque.',
      },
    ],
    correctChoiceIds: ['c2'],
    explanation:
      'Neste jogo, o toque que soma pertence aos esconderijos visíveis. O arbusto invisível não recebe outro toque. A regra de somar não é executada, e o valor guardado continua em 1.',
  },
]
export const CONFIGS = {
  correct: {
    label: 'Projeto com as regras corretas',
    reveal: 'chosen',
    count: 'new',
    threshold: 3,
  },
  none: { label: 'Sem reação ao toque', reveal: 'none', count: 'off', threshold: 3 },
  fixed: { label: 'Sempre esconde o arbusto', reveal: 'first', count: 'off', threshold: 3 },
  all: { label: 'Um toque esconde todos', reveal: 'all', count: 'off', threshold: 3 },
  noCount: { label: 'Revela, mas não soma', reveal: 'chosen', count: 'off', threshold: 3 },
  everyTap: {
    label: 'Soma até no vazio e no toque repetido',
    reveal: 'chosen',
    count: 'every',
    threshold: 3,
  },
  setOne: { label: 'Coloca 1 em vez de somar 1', reveal: 'chosen', count: 'one', threshold: 3 },
  early: {
    label: 'Mostra a mensagem com dois achados',
    reveal: 'chosen',
    count: 'new',
    threshold: 2,
  },
}
export function newGame() {
  return { found: [], points: 0 }
}
export function gameStep(previous, target, config) {
  const state = { found: [...previous.found], points: previous.points }
  const event = target !== null && !state.found.includes(target)
  if (event) {
    if (config.reveal === 'chosen') state.found.push(target)
    if (config.reveal === 'first' && !state.found.includes(0)) state.found.push(0)
    if (config.reveal === 'all') state.found = [0, 1, 2]
  }
  if (config.count === 'every') state.points++
  else if (event && config.count === 'new') state.points++
  else if (event && config.count === 'one') state.points = 1
  return state
}
function gameRun(config, targets) {
  return targets.reduce((state, target) => gameStep(state, target, config), newGame())
}
export const OBJECTIVES = {
  1: [
    {
      label: 'O toque revela só o personagem daquele esconderijo.',
      test: (c) => {
        const s = gameRun(c, [1])
        return s.found.length === 1 && s.found[0] === 1
      },
      feedback:
        'No teste das pedras, só as pedras devem ficar invisíveis. Confira qual esconderijo a reação está alterando.',
    },
    {
      label: 'Outros esconderijos também respondem aos próprios toques.',
      test: (c) =>
        [0, 1, 2].every((id) => {
          const s = gameRun(c, [id])
          return s.found.length === 1 && s.found[0] === id
        }),
      feedback:
        'Teste outro esconderijo: ele precisa revelar o próprio personagem, sem depender do arbusto.',
    },
  ],
  2: [
    {
      label: 'O toque continua revelando só o personagem escolhido.',
      carry: true,
      test: (c) => OBJECTIVES[1].every((o) => o.test(c)),
      feedback: 'A reação da Aula 1 precisa continuar funcionando em cada esconderijo.',
    },
    {
      label: 'Cada novo personagem acrescenta 1 a Achados.',
      test: (c) =>
        [0, 1, 2].every((_, i) => gameRun(c, [0, 1, 2].slice(0, i + 1)).points === i + 1),
      feedback:
        'Encontre personagens diferentes: Achados deve passar por 1, 2 e 3. Somar 1 é diferente de colocar 1.',
    },
    {
      label: 'Toques no vazio ou no mesmo lugar mantêm a contagem.',
      test: (c) => {
        const first = gameRun(c, [0])
        return (
          gameStep(first, null, c).points === first.points &&
          gameStep(first, 0, c).points === first.points
        )
      },
      feedback:
        'Depois de achar alguém, teste o vazio e o mesmo lugar. Nenhum desses toques deve executar outra soma.',
    },
    {
      label: 'A mensagem aparece depois dos três achados.',
      test: (c) =>
        gameRun(c, [0, 1]).points < c.threshold && gameRun(c, [0, 1, 2]).points >= c.threshold,
      feedback:
        'Com dois personagens, a mensagem ainda não deve aparecer. Ela aparece quando os três foram encontrados.',
    },
  ],
}
