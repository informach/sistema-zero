import type { SectionProjectCheck } from '@sistemazero/core/learning'

/**
 * Modelos de objetivo (etapa 4 dos objetivos do Estúdio, 18/10/2026): pontos de partida que a
 * professora escolhe numa lista e AJUSTA. Nenhum modelo vale sozinho: o nome da variável, o texto
 * esperado e os números dependem do projeto, e quem prova que o modelo serve é o "Testar agora"
 * contra o gabarito.
 *
 * `where` diz em que projeto o modelo faz sentido: `blocks` (modo Blocos), `bridge` (Ponte ou
 * código clássico), `pro` (qualquer projeto Pro) e `kit` (os kits Pro, que têm fase, pontos, meta
 * e vida para conferir).
 */
export type TemplatePlace = 'blocks' | 'bridge' | 'pro' | 'kit'

export interface ObjectiveTemplate {
  id: string
  title: string
  /** O que a professora precisa ajustar depois de escolher. */
  adjust: string
  where: readonly TemplatePlace[]
  check: Omit<SectionProjectCheck, 'id'>
}

const CLASSIC: readonly TemplatePlace[] = ['blocks', 'bridge']

export const OBJECTIVE_TEMPLATES: readonly ObjectiveTemplate[] = [
  {
    id: 'usa-repeticao',
    title: 'Usar uma repetição',
    adjust: 'Nada a ajustar. Só conta a repetição que a criança acrescentar.',
    where: ['blocks', 'bridge', 'pro'],
    check: {
      label: 'Use uma repetição no seu jogo',
      hint: 'Procure os blocos de repetir, como "repetir N vezes".',
      rule: { type: 'usesLoop' },
    },
  },
  {
    id: 'cria-pontos',
    title: 'Criar a variável dos pontos',
    adjust: 'Troque "pontos" pelo nome que a aula usa.',
    where: ['blocks', 'bridge', 'pro'],
    check: {
      label: 'Crie uma variável para guardar os pontos',
      hint: 'Dê o nome pontos para a variável.',
      rule: { type: 'declaresVariable', name: 'pontos' },
    },
  },
  {
    id: 'anda-direita',
    title: 'O herói anda com a seta',
    adjust: 'Troque "heroi" pelo nome do sprite e confira o tempo que a seta fica apertada.',
    where: CLASSIC,
    check: {
      label: 'Faça o herói andar com a seta para a direita',
      hint: 'Use um bloco que move o sprite com as setas.',
      rule: {
        type: 'behavior',
        steps: [{ action: 'press', key: 'ArrowRight', holdMs: 600 }],
        expect: { target: { kind: 'value', path: 'heroi.x' }, compare: 'changed' },
      },
    },
  },
  {
    id: 'pula',
    title: 'O herói pula com o espaço',
    adjust: 'Troque "heroi" pelo nome do sprite.',
    where: CLASSIC,
    check: {
      label: 'Faça o herói pular quando apertar espaço',
      hint: 'Use o bloco "quando apertar a tecla" com a tecla espaço.',
      rule: {
        type: 'behavior',
        steps: [{ action: 'press', key: 'Space', holdMs: 120 }],
        expect: { target: { kind: 'value', path: 'heroi.y' }, compare: 'changed' },
      },
    },
  },
  {
    id: 'pontos-sobem',
    title: 'A pontuação sobe',
    adjust: 'Troque "pontos" pelo nome da variável e os passos pelo jeito de marcar ponto no jogo.',
    where: CLASSIC,
    check: {
      label: 'Faça a pontuação subir',
      hint: 'Some 1 nos pontos quando o herói pegar uma moeda.',
      rule: {
        type: 'behavior',
        steps: [{ action: 'press', key: 'ArrowRight', holdMs: 2000 }],
        expect: { target: { kind: 'value', path: 'pontos' }, compare: 'greaterThan', value: 0 },
      },
    },
  },
  {
    id: 'mensagem',
    title: 'Uma mensagem aparece na tela',
    adjust: 'Troque o texto pela frase que a aula pede.',
    where: ['blocks', 'bridge', 'pro'],
    check: {
      label: 'Mostre a mensagem "Você venceu" na tela',
      hint: 'Use um bloco que escreve texto na página.',
      rule: {
        type: 'behavior',
        steps: [{ action: 'wait', ms: 500 }],
        expect: { target: { kind: 'text' }, compare: 'contains', value: 'Você venceu' },
      },
    },
  },
  {
    id: 'console',
    title: 'O jogo escreve no console',
    adjust: 'Troque o texto pelo que a criança deve escrever.',
    where: ['bridge', 'pro'],
    check: {
      label: 'Escreva "Olá" no console',
      hint: 'Use console.log com o texto entre aspas.',
      rule: {
        type: 'behavior',
        steps: [],
        expect: { target: { kind: 'console' }, compare: 'contains', value: 'Olá' },
      },
    },
  },
  {
    id: 'funcao-dobro',
    title: 'Uma função que calcula',
    adjust: 'Troque o nome da função e os casos. No Pro, diga em que arquivo ela está exportada.',
    where: ['bridge', 'pro'],
    check: {
      label: 'Crie a função dobro, que devolve o número vezes 2',
      hint: 'A função recebe um número e usa return.',
      rule: {
        type: 'functionReturns',
        name: 'dobro',
        cases: [
          { args: [2], expected: 4 },
          { args: [5], expected: 10 },
        ],
      },
    },
  },
  {
    id: 'regra-js',
    title: 'Regra em JavaScript (livre)',
    adjust:
      'Escreva a regra que você precisa. No clássico, jogo.nome lê uma variável; no kit Pro, jogo.score lê os pontos.',
    where: ['bridge', 'pro'],
    check: {
      label: 'Guarde a chave na lista de itens',
      hint: 'Use o bloco de acrescentar na lista quando o herói pegar a chave.',
      rule: {
        type: 'script',
        steps: [{ action: 'press', key: 'ArrowRight', holdMs: 1000 }],
        code: "return Array.isArray(jogo.itens) && jogo.itens.includes('chave')",
      },
    },
  },
]

/** Onde fica a meta de cada kit Pro: é o que a dica do objetivo de mudar a meta aponta. */
const KIT_GOAL: Record<string, string> = {
  'canvas-puzzle': 'goalLines (as linhas para vencer)',
  'canvas-survival': 'defeatGoal (os inimigos para vencer)',
  'phaser-arcade': 'waves (as ondas)',
  'phaser-platformer': 'a lista seeds (cada semente conta)',
  'three-exploration': 'goal (os cristais)',
  'three-action': 'goal (as luzes)',
  'canvas-grid-arena': 'targetCount (os faróis)',
  'phaser-tactics': 'a lista units (cada rival conta)',
  'three-tactics': 'a lista units (cada rival conta)',
}

/** Kits que mostram a vida do jogador no estado (os outros não têm vida para conferir). */
const KIT_HEALTH: Record<string, string> = {
  'canvas-survival': 'playerHealth',
}

/**
 * As sugestões de um kit Pro: objetivos que usam o estado do kit (`window.__studioGame`). A meta
 * é a mais firme, porque mora no `src/config.ts` e não depende de jogar bem.
 */
export function kitSuggestions(templateId: string): ObjectiveTemplate[] {
  const goal = KIT_GOAL[templateId]
  if (!goal) return []
  const suggestions: ObjectiveTemplate[] = [
    {
      id: `${templateId}-meta`,
      title: 'Mudar a meta do jogo',
      adjust: 'Escolha o número da meta que a aula pede e confira no gabarito.',
      where: ['kit'],
      check: {
        label: 'Mude a meta do jogo para 12',
        hint: `A meta fica em src/config.ts: procure ${goal}.`,
        rule: {
          type: 'behavior',
          steps: [],
          expect: { target: { kind: 'game', field: 'goal' }, compare: 'equals', value: 12 },
        },
      },
    },
    {
      id: `${templateId}-comeca`,
      title: 'O jogo continua começando',
      adjust:
        'Serve como extra: confere que as mudanças não quebraram o jogo. O projeto inicial também passa.',
      where: ['kit'],
      check: {
        label: 'O jogo continua começando depois das suas mudanças',
        hint: 'Se o jogo não começa, olhe o console: algum erro de escrita no código.',
        optional: true,
        rule: {
          type: 'behavior',
          steps: [{ action: 'wait', ms: 500 }],
          expect: { target: { kind: 'game', field: 'phase' }, compare: 'equals', value: 'playing' },
        },
      },
    },
  ]
  const health = KIT_HEALTH[templateId]
  if (health)
    suggestions.push({
      id: `${templateId}-vida`,
      title: 'Começar com mais vida',
      adjust: 'Escolha o mínimo de vida e confira no gabarito.',
      where: ['kit'],
      check: {
        label: 'Faça o jogador começar com pelo menos 5 de vida',
        hint: `A vida fica em src/config.ts: procure ${health}.`,
        rule: {
          type: 'behavior',
          steps: [],
          expect: { target: { kind: 'game', field: 'health' }, compare: 'atLeast', value: 5 },
        },
      },
    })
  return suggestions
}

/** Os modelos que servem ao projeto do bloco, na ordem da lista. */
export function templatesFor(place: {
  pro: boolean
  kit: boolean
  bridge: boolean
}): ObjectiveTemplate[] {
  const fits = (template: ObjectiveTemplate) =>
    place.pro
      ? template.where.includes('pro') || (place.kit && template.where.includes('kit'))
      : template.where.includes('blocks') || (place.bridge && template.where.includes('bridge'))
  return OBJECTIVE_TEMPLATES.filter(fits)
}
