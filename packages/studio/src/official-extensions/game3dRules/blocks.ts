import type { BlockDefinition } from '../../blockly/blocks/types'
import {
  GAME_RULES_CORNERS,
  GAME_RULES_RESULTS,
  GAME_RULES_SCREENS,
  type GameRulesPrefix,
} from './ir'

/**
 * Os blocos das REGRAS DE JOGO 3D, com a MESMA cara nas três extensões 3D: o que muda entre
 * elas é só o tipo (`sz_<prefixo>_…`) e de onde vêm os nomes de objeto e de grupo (cada
 * extensão tem o seu seletor). Texto, campos, sombras e dicas são idênticos.
 *
 * O codec (`codec.ts`) lê e escreve exatamente estes nomes de campo; mudar um aqui sem mudar lá
 * quebra o round-trip, e a auditoria de blocos de cada extensão é a rede.
 */

export interface GameRulesBlockOptions {
  /** `kind` do `field_name_picker` de objeto (ex.: `'g3d-object'`). */
  objectPicker: string
  /** `kind` do `field_name_picker` de grupo (ex.: `'group3d'`). */
  groupPicker: string
  /** Opções do "Quando apertar a tecla" (o mesmo dropdown de teclas da extensão). */
  keys: readonly (readonly [string, string])[]
  /** Nome padrão do herói nos seletores. */
  hero?: string
  /**
   * A vida é SEMPRE de um jogador só (o Mundo 3D): os blocos de vida perdem o seletor de objeto
   * e falam "do jogador" (o codec casa com `GAME_RULES_IMPLICIT_HERO_PREFIXES`).
   */
  implicitHero?: boolean
  /** Só estes sufixos (a extensão não oferece os outros). Ausente = todos. */
  only?: readonly GameRulesBlockSuffix[]
  /** Dica própria do "Recomeçar o jogo" (o que volta e o que fica muda por extensão). */
  restartTooltip?: string
}

type Shadows = Record<string, Record<string, unknown>>
/** Todo argumento destes blocos tem tipo e nome (os testes das extensões leem os dois). */
type RulesArg = { type: string; name: string; [key: string]: unknown }
export type GameRulesBlockDefinition = BlockDefinition & { args0: RulesArg[] }

/**
 * O corpo dos "Quando…" que o motor dispara de dentro do laço (vida, contagem, encostar): o jogo
 * está rodando, mas o corpo roda UMA vez. A IR já os trata como evento (`ir/lifecycle.ts`), e
 * `game3dRules/__tests__/blocklyIrMatrix.test.ts` prova que Blockly e IR concordam.
 */
const GAME_EVENT_BODY = 'game-event-body' as const

/**
 * O lugar do "Dar … de vida": o MESMO do `resource-creator` (início, evento, função; nunca
 * laço), mas declarado aqui porque o nó da IR (`life`) é o mesmo do machucar e do curar, que
 * CABEM no laço. A lista de recursos persistentes (`persistentResourceContract.ts`) é por
 * TIPO de nó; a trava da IR deste bloco é pelo `op` (`isGameRulesSetLife`).
 */
const SET_LIFE_PLACEMENT = {
  root: ['start'],
  nested: [
    'statement',
    'event-body',
    'function-body',
    'async-function-body',
    'derived-constructor-body',
    'derived-method-body',
  ],
  forbiddenNested: ['loop-body'],
  role: 'command',
} as const

/** O espelho na IR é `GAME_RULES_NESTABLE_ROOT_TYPES` (`game3dRules/ir.ts`). */
const AFTER_SECONDS_PLACEMENT = {
  root: ['loops'],
  nested: [
    'event-body',
    'user-gesture-body',
    'game-event-body',
    'function-body',
    'async-function-body',
    'derived-method-body',
  ],
  forbiddenNested: ['loop-body', 'syntactic-loop-body'],
  role: 'command',
} as const

const numShadow = (value: number) => ({ shadow: { type: 'sz_val_number', fields: { NUM: value } } })
const txtShadow = (text: string) => ({ shadow: { type: 'sz_val_text', fields: { TEXT: text } } })

/** O sufixo de cada bloco (o tipo é `sz_<prefixo>_<sufixo>`). */
export const GAME_RULES_BLOCK_SUFFIXES = [
  'hud_text',
  'add_score',
  'score',
  'set_life',
  'hurt',
  'heal',
  'life_of',
  'on_life_over',
  'set_screen_text',
  'end_game',
  'restart',
  'after_seconds',
  'start_timer',
  'time_left',
  'on_timer_end',
  'stop_timer',
  'random_between',
  'random_chance',
  'camera_shake',
  'blink',
  'on_key',
  'on_click_object',
  'on_canvas_click',
  'on_touch_group',
] as const
export type GameRulesBlockSuffix = (typeof GAME_RULES_BLOCK_SUFFIXES)[number]

export function gameRulesBlockType(prefix: GameRulesPrefix, suffix: GameRulesBlockSuffix): string {
  return `sz_${prefix}_${suffix}`
}

export function gameRulesBlocks(prefix: GameRulesPrefix, options: GameRulesBlockOptions) {
  const t = (suffix: GameRulesBlockSuffix) => gameRulesBlockType(prefix, suffix)
  const hero = options.hero ?? 'heroi'
  const obj = (name = 'OBJ', text = hero) => ({
    type: 'field_name_picker',
    name,
    text,
    kind: options.objectPicker,
  })
  const stmt = { previousStatement: 'JSStmt', nextStatement: 'JSStmt' } as const
  const body = { message1: 'fazer %1', args1: [{ type: 'input_statement', name: 'BODY' }] }

  const blocks: GameRulesBlockDefinition[] = [
    // ---- 🏆 Placar, vida e telas ----
    {
      type: t('hud_text'),
      placement: 'command',
      message0: 'Escrever no canto %1 da tela: %2',
      args0: [
        { type: 'field_dropdown', name: 'CORNER', options: GAME_RULES_CORNERS },
        { type: 'input_value', name: 'TEXT', check: 'JSValue' },
      ],
      inputsInline: true,
      ...stmt,
      tooltip:
        'Mostra um texto num canto da tela, por cima do jogo. Use no "A cada quadro" para atualizar (ex.: o tempo). Texto vazio apaga.',
    },
    {
      type: t('add_score'),
      placement: 'command',
      message0: 'Somar %1 aos pontos',
      args0: [{ type: 'input_value', name: 'VALUE', check: 'JSValue' }],
      inputsInline: true,
      ...stmt,
      tooltip:
        'Soma aos pontos do jogo (use um número negativo para tirar). Os pontos aparecem sozinhos no canto de cima, à direita.',
    },
    {
      type: t('score'),
      message0: 'os pontos',
      args0: [],
      output: 'JSValue',
      tooltip: 'Quantos pontos o jogo tem agora. Use num "se" (ex.: chegou a 10, você ganhou).',
    },
    {
      type: t('on_life_over'),
      placement: 'event',
      // O aviso sai de DENTRO do laço do jogo (quem machuca é um quadro), mas UMA vez: o corpo
      // pode tocar som E começar a música de derrota (`game-event-body`, não `loop-body`).
      bodyContext: GAME_EVENT_BODY,
      message0: 'Quando a vida de %1 acabar',
      args0: [obj()],
      ...body,
      ...stmt,
      tooltip:
        'Roda o "fazer" uma vez quando a vida do objeto chega a zero. Bom para o fim de jogo.',
    },
    {
      type: t('set_life'),
      // Preparação: num laço a vida (e a invencibilidade) voltaria ao começo a cada quadro.
      // Espelho na IR: `isGameRulesSetLife` (`ir/lifecycle.ts`), pelo `op` do nó `life`.
      placement: SET_LIFE_PLACEMENT,
      message0: 'Dar %1 de vida a %2',
      args0: [{ type: 'input_value', name: 'VALUE', check: 'JSValue' }, obj()],
      inputsInline: true,
      ...stmt,
      tooltip:
        'Dá vida a um objeto: use no começo (ou num "Quando…"), não no "A cada quadro". O primeiro que ganha vida é o herói: os corações dele aparecem no canto de cima, à esquerda.',
    },
    {
      type: t('hurt'),
      placement: 'command',
      message0: 'Machucar %1 tirando %2 de vida',
      args0: [obj(), { type: 'input_value', name: 'VALUE', check: 'JSValue' }],
      inputsInline: true,
      ...stmt,
      tooltip:
        'Tira vida do objeto. Depois de machucado ele pisca e fica 1 segundo sem se machucar de novo.',
    },
    {
      type: t('heal'),
      placement: 'command',
      message0: 'Curar %1 somando %2 de vida',
      args0: [obj(), { type: 'input_value', name: 'VALUE', check: 'JSValue' }],
      inputsInline: true,
      ...stmt,
      tooltip: 'Devolve vida ao objeto (ex.: pegou um coração).',
    },
    {
      type: t('life_of'),
      message0: 'a vida de %1',
      args0: [obj()],
      output: 'JSValue',
      tooltip: 'Quanta vida o objeto tem agora (0 se nunca ganhou vida).',
    },
    {
      type: t('set_screen_text'),
      placement: 'start-only-command',
      message0: 'Na tela de %1: título %2 texto %3 botão %4',
      args0: [
        { type: 'field_dropdown', name: 'SCREEN', options: GAME_RULES_SCREENS },
        { type: 'field_input', name: 'TITLE', text: 'Meu jogo 3D' },
        { type: 'field_input', name: 'TEXT', text: 'Pegue as estrelas!' },
        { type: 'field_input', name: 'BUTTON', text: 'Jogar' },
      ],
      ...stmt,
      tooltip:
        'Escreve uma tela do jogo. Com a tela de início, o jogo espera o botão para começar. As de fim e vitória aparecem no "Fim de jogo".',
    },
    {
      type: t('end_game'),
      placement: 'runtime-command',
      message0: 'Fim de jogo: %1',
      args0: [{ type: 'field_dropdown', name: 'RESULT', options: GAME_RULES_RESULTS }],
      ...stmt,
      tooltip:
        'Para o jogo e mostra a tela de fim (perdeu) ou de vitória (ganhou), com o botão de jogar de novo.',
    },
    {
      type: t('restart'),
      placement: 'runtime-command',
      message0: 'Recomeçar o jogo',
      args0: [],
      ...stmt,
      tooltip:
        'Começa a partida de novo do zero: pontos, vidas, objetos e contagem voltam ao início.',
    },

    // ---- ⏱️ Tempo e sorteio ----
    {
      type: t('after_seconds'),
      // Mora em 🔁 (raiz), mas também cabe num "Quando…" ou numa função: cada vez agenda UM
      // aviso ("quando encostar no portal, depois de 2 s troca a fase"). Num laço agendaria um
      // por quadro, então `loop-body` fica proibido. O corpo roda uma vez, com o jogo rodando.
      placement: AFTER_SECONDS_PLACEMENT,
      bodyExecution: 'deferred-callback',
      bodyContext: GAME_EVENT_BODY,
      message0: 'Depois de %1 segundos',
      args0: [{ type: 'input_value', name: 'SECS', check: 'JSValue' }],
      ...body,
      inputsInline: true,
      ...stmt,
      tooltip:
        'Roda o "fazer" uma vez só, quando passar esse tempo de jogo. Pode ficar sozinho ou dentro de um "Quando…" (no "A cada quadro" não: agendaria um a cada quadro).',
    },
    {
      type: t('on_timer_end'),
      placement: 'event',
      bodyContext: GAME_EVENT_BODY,
      message0: 'Quando a contagem acabar',
      args0: [],
      ...body,
      ...stmt,
      tooltip: 'Roda o "fazer" quando a contagem chega a zero (ex.: acabou o tempo, fim de jogo).',
    },
    {
      type: t('start_timer'),
      placement: 'command',
      message0: 'Começar a contagem de %1 segundos',
      args0: [{ type: 'input_value', name: 'SECS', check: 'JSValue' }],
      inputsInline: true,
      ...stmt,
      tooltip:
        'Começa uma contagem regressiva que aparece em cima, no meio da tela. Quando chega a zero, roda o "Quando a contagem acabar".',
    },
    {
      type: t('time_left'),
      message0: 'o tempo que falta',
      args0: [],
      output: 'JSValue',
      tooltip: 'Quantos segundos faltam na contagem.',
    },
    {
      type: t('stop_timer'),
      placement: 'command',
      message0: 'Parar a contagem',
      args0: [],
      ...stmt,
      tooltip: 'Para a contagem onde ela está (o tempo que falta continua o mesmo).',
    },
    {
      type: t('random_between'),
      message0: 'um número de %1 a %2',
      args0: [
        { type: 'input_value', name: 'A', check: 'JSValue' },
        { type: 'input_value', name: 'B', check: 'JSValue' },
      ],
      inputsInline: true,
      output: 'JSValue',
      tooltip: 'Sorteia um número inteiro entre os dois, contando os dois (como um dado de 1 a 6).',
    },
    {
      type: t('random_chance'),
      message0: 'tem chance de %1 %?',
      args0: [{ type: 'input_value', name: 'A', check: 'JSValue' }],
      inputsInline: true,
      output: 'JSValue',
      tooltip: 'Verdadeiro de vez em quando: com 30, acontece mais ou menos 30 vezes em cada 100.',
    },

    // ---- 🎬 Câmera ----
    {
      type: t('camera_shake'),
      placement: 'command',
      message0: 'Tremer a câmera com força %1 por %2 s',
      args0: [
        { type: 'input_value', name: 'STRENGTH', check: 'JSValue' },
        { type: 'input_value', name: 'SECS', check: 'JSValue' },
      ],
      inputsInline: true,
      ...stmt,
      tooltip: 'Faz a tela tremer um pouquinho, como numa batida ou explosão.',
    },

    // ---- 🧊 Objetos › Aparência ----
    {
      type: t('blink'),
      placement: 'command',
      message0: 'Fazer %1 piscar por %2 s',
      args0: [obj(), { type: 'input_value', name: 'SECS', check: 'JSValue' }],
      inputsInline: true,
      ...stmt,
      tooltip: 'O objeto pisca (some e aparece) durante esse tempo e depois volta ao normal.',
    },

    // ---- 🎮 Controles ----
    {
      type: t('on_key'),
      placement: 'event',
      userGesture: true,
      message0: 'Quando apertar a tecla %1',
      args0: [{ type: 'field_dropdown', name: 'KEY', options: options.keys }],
      ...body,
      ...stmt,
      tooltip: 'Roda o "fazer" uma vez cada vez que a tecla é apertada (segurar não repete).',
    },
    {
      type: t('on_click_object'),
      placement: 'event',
      userGesture: true,
      message0: 'Quando clicar ou tocar em %1',
      args0: [obj('OBJ', 'botao')],
      ...body,
      ...stmt,
      tooltip: 'Roda o "fazer" quando o mouse clica ou o dedo toca no objeto.',
    },

    {
      type: t('on_canvas_click'),
      placement: 'event',
      userGesture: true,
      message0: 'Quando clicar ou tocar no jogo',
      args0: [],
      ...body,
      ...stmt,
      tooltip:
        'Roda o "fazer" ao clicar ou tocar na cena, mesmo sem acertar um objeto. Não dispara nos botões do placar.',
    },

    // ---- 💥 Encostar ----
    {
      type: t('on_touch_group'),
      placement: 'event',
      bodyContext: GAME_EVENT_BODY,
      message0: 'Quando %1 encostar em algum do grupo %2, chamando de %3',
      args0: [
        obj(),
        { type: 'field_name_picker', name: 'GROUP', text: 'estrelas', kind: options.groupPicker },
        { type: 'field_input', name: 'ITEM', text: 'item' },
      ],
      ...body,
      ...stmt,
      tooltip:
        'Roda o "fazer" uma vez quando o objeto começa a encostar em alguém do grupo. Quem foi encostado ganha o nome escolhido (ex.: tirar do grupo).',
    },
  ]

  if (options.implicitHero) {
    for (const block of blocks) {
      const suffix = block.type.slice(`sz_${prefix}_`.length) as GameRulesBlockSuffix
      const implicit = IMPLICIT_HERO_FACES[suffix]
      if (!implicit) continue
      const args: RulesArg[] = block.args0.filter((arg: RulesArg) => arg.name !== 'OBJ')
      block.message0 = implicit.message0
      block.args0 = args
      block.tooltip = implicit.tooltip
    }
  }
  if (options.restartTooltip) {
    const restart = blocks.find((block) => block.type === t('restart'))
    if (restart) restart.tooltip = options.restartTooltip
  }
  const offered = options.only ? new Set(options.only.map(t)) : null
  const shadows: Shadows = {
    [t('hud_text')]: { TEXT: txtShadow('Pegue as estrelas!') },
    [t('add_score')]: { VALUE: numShadow(1) },
    [t('set_life')]: { VALUE: numShadow(3) },
    [t('hurt')]: { VALUE: numShadow(1) },
    [t('heal')]: { VALUE: numShadow(1) },
    [t('after_seconds')]: { SECS: numShadow(3) },
    [t('start_timer')]: { SECS: numShadow(30) },
    [t('random_between')]: { A: numShadow(1), B: numShadow(6) },
    [t('random_chance')]: { A: numShadow(30) },
    [t('camera_shake')]: { STRENGTH: numShadow(0.3), SECS: numShadow(0.3) },
    [t('blink')]: { SECS: numShadow(1) },
  }

  if (!offered) return { blocks, shadows }
  return {
    blocks: blocks.filter((block) => offered.has(block.type)),
    shadows: Object.fromEntries(Object.entries(shadows).filter(([type]) => offered.has(type))),
  }
}

/** A cara dos blocos de vida quando o jogador é implícito (sem o seletor de objeto). */
const IMPLICIT_HERO_FACES: Partial<
  Record<GameRulesBlockSuffix, { message0: string; tooltip: string }>
> = {
  set_life: {
    message0: 'Dar %1 de vida ao jogador',
    tooltip:
      'Dá vida ao jogador: use no começo (ou num "Quando…"), não no "A cada quadro". Os corações dele aparecem no canto de cima, à esquerda.',
  },
  hurt: {
    message0: 'Machucar o jogador tirando %1 de vida',
    tooltip:
      'Tira vida do jogador. Depois de machucado ele pisca e fica 1 segundo sem se machucar de novo.',
  },
  heal: {
    message0: 'Curar o jogador somando %1 de vida',
    tooltip: 'Devolve vida ao jogador (ex.: pegou um coração).',
  },
  life_of: {
    message0: 'a vida do jogador',
    tooltip: 'Quanta vida o jogador tem agora (0 se nunca ganhou vida).',
  },
  on_life_over: {
    message0: 'Quando a vida do jogador acabar',
    tooltip:
      'Roda o "fazer" uma vez quando a vida do jogador chega a zero. Bom para o fim de jogo.',
  },
}
