import d1 from './cade-todo-mundo-aula-1.antes.json'
import d2 from './cade-todo-mundo-aula-2.antes.json'
export const items = [
  {
    id: 'touch',
    key: 'experiencia-toque',
    day: 'Aula 1',
    short: 'Ação e reação',
    title: 'O toque faz o jogo responder',
    concept: 'Um toque pode executar uma reação no esconderijo escolhido.',
    change:
      'Dois esconderijos desde o início. Ligue, desligue e repita os testes na ordem que quiser.',
    invite: 'Compare o que acontece com e sem a reação ao toque. Qual esconderijo muda? ',
  },
  {
    id: 'count',
    key: 'experiencia-contagem',
    day: 'Aula 2',
    short: 'Contagem',
    title: 'Um número acompanha a busca',
    concept: 'Um novo personagem soma 1. Vazio e repetição não somam.',
    change:
      'A busca permanece livre. Zappy considera o último teste e sugere as comparações que ainda faltam.',
    invite:
      'Encontre personagens, toque de novo e experimente o espaço vazio. Observe quando o valor muda e quando permanece igual.',
  },
] as const
export type Part = (typeof items)[number]['id']
export const source = (part: Part) =>
  (part === 'touch' ? d1 : d2).blocks.find(
    (b) =>
      b.content?.kind === 'interactive' &&
      (b.content as any).activity?.scene ===
        (part === 'touch' ? 'touch-response' : 'found-counter'),
  )!.content as any
