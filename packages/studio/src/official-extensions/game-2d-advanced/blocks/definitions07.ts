import type { BlockDefinition } from '../../../blockly/blocks/types'
import {
  GAME_KIT_ACTIONS,
  GAME_KIT_CAMPAIGN_EVENT_FIELDS,
  type GameKitCampaignEventField,
} from '../runtimeContract'
import { GAME_KIT_COLOUR as C } from './shared'

const ACTIONS = GAME_KIT_ACTIONS.map((action) => [action, action])

const SLOTS = [
  ['1', '1'],
  ['2', '2'],
  ['3', '3'],
]

const CAMPAIGN_EVENT_FIELD_LABELS: Record<GameKitCampaignEventField, string> = {
  event: 'nome do acontecimento',
  id: 'identificador',
  kind: 'tipo',
  stageId: 'fase',
  reason: 'motivo',
  target: 'alvo',
  value: 'valor',
  complete: 'completou?',
  journey: 'jornada',
  column: 'coluna',
  row: 'linha',
}

const CAMPAIGN_EVENT_FIELDS = GAME_KIT_CAMPAIGN_EVENT_FIELDS.map((field) => [
  CAMPAIGN_EVENT_FIELD_LABELS[field],
  field,
])

export const gameKitBlockDefinitions07: BlockDefinition[] = [
  {
    type: 'sz_gk_fixed_setup',
    placement: 'start-only-command',
    message0: 'Preparar jogo suave com semente %1',
    args0: [{ type: 'input_value', name: 'SEED', check: 'JSValue' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Liga o relógio fixo de 60 passos por segundo. O jogo se comporta igual em telas rápidas e lentas; a semente repete a mesma sorte.',
  },
  {
    type: 'sz_gk_on_fixed_update',
    placement: 'loop-update',
    bodyExecution: 'sync-callback',
    bodyContext: 'loop-body',
    message0: 'A cada passo do jogo: tempo em %1 número em %2',
    args0: [
      { type: 'field_name_picker', name: 'DT', text: 'dt', kind: 'variable' },
      { type: 'field_name_picker', name: 'TICK', text: 'passo', kind: 'variable' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda exatamente 60 vezes por segundo. Use para regras, física e decisões que precisam ser reproduzidas sem diferença.',
  },
  {
    type: 'sz_gk_define_campaign',
    placement: 'start-declaration',
    message0:
      'Criar aventura %1 versão %2 começando em %3 para %4 jogador(es), semente %5 e %6 gema(s) obrigatória(s)',
    args0: [
      { type: 'field_input', name: 'ID', text: 'minha-aventura' },
      { type: 'input_value', name: 'VERSION', check: 'JSValue' },
      { type: 'field_input', name: 'FIRST', text: '1-1' },
      { type: 'input_value', name: 'PLAYERS', check: 'JSValue' },
      { type: 'input_value', name: 'SEED', check: 'JSValue' },
      { type: 'input_value', name: 'REQUIRED_GEMS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Abre uma aventura com fases ligadas, até dois jogadores, slots e sorte repetível. A quantidade de gemas define a conclusão; use 0 para não exigir gemas.',
  },
  {
    type: 'sz_gk_on_campaign_event',
    placement: 'event',
    message0: 'Quando acontecer %1 na aventura',
    args0: [{ type: 'field_name_picker', name: 'EVENT', text: 'aviso', kind: 'event' }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda quando uma região ou o sistema emitir fase, coleta, checkpoint, bloco, guardião, saída bloqueada ou fim. Use o repórter dentro deste bloco para ler os dados.',
  },
  {
    type: 'sz_gk_campaign_event_value',
    message0: 'o %1 do acontecimento da aventura',
    args0: [{ type: 'field_dropdown', name: 'FIELD', options: CAMPAIGN_EVENT_FIELDS }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Lê um dado somente enquanto o acontecimento da aventura está sendo tratado.',
  },
  {
    type: 'sz_gk_define_campaign_stage',
    placement: 'start-declaration',
    message0: 'Definir fase %1',
    args0: [
      {
        type: 'field_campaign_stage',
        name: 'STAGE_SUMMARY',
        text: 'Abrir editor da fase',
      },
    ],
    mutator: 'sz_gk_campaign_stage_mutator',
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Abre o editor visual do mapa. Cada objeto precisa de identificador único; tipo, posição e propriedades específicas são validados antes de salvar.',
  },
  {
    type: 'sz_gk_start_campaign',
    placement: 'start-only-command',
    message0: 'Começar aventura na fase %1',
    args0: [{ type: 'field_input', name: 'STAGE', text: '1-1' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Começa a aventura na fase escolhida. Deixe o nome vazio para continuar do progresso atual.',
  },
  {
    type: 'sz_gk_go_stage',
    placement: 'command',
    message0: 'Ir para a fase %1',
    args0: [{ type: 'field_input', name: 'STAGE', text: '1-2' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Troca para outra fase já definida na aventura.',
  },
  {
    type: 'sz_gk_save_campaign',
    placement: 'command',
    message0: 'Guardar aventura no espaço %1',
    args0: [{ type: 'field_dropdown', name: 'SLOT', options: SLOTS }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Guarda fase, checkpoint, vidas, pontos, gemas por fase, segredos e configurações neste navegador.',
  },
  {
    type: 'sz_gk_load_campaign',
    placement: 'command',
    message0: 'Continuar aventura do espaço %1',
    args0: [{ type: 'field_dropdown', name: 'SLOT', options: SLOTS }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Carrega somente um progresso íntegro e compatível com a versão atual da aventura.',
  },
  {
    type: 'sz_gk_delete_campaign_save',
    placement: 'command',
    message0: 'Apagar aventura do espaço %1',
    args0: [{ type: 'field_dropdown', name: 'SLOT', options: SLOTS }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Apaga apenas o espaço escolhido; os outros dois continuam intactos.',
  },
  {
    type: 'sz_gk_start_replay',
    placement: 'command',
    message0: 'Começar a gravar a partida',
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Grava as ações da partida de forma compacta, passo a passo.',
  },
  {
    type: 'sz_gk_stop_replay',
    placement: 'command',
    message0: 'Terminar a gravação da partida',
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Fecha a gravação e guarda a última repetição na memória do jogo.',
  },
  {
    type: 'sz_gk_play_last_replay',
    placement: 'command',
    message0: 'Repetir a última partida',
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Reproduz a última gravação compatível usando o mesmo relógio e a mesma semente.',
  },
  {
    type: 'sz_gk_action_down',
    message0: 'ação %1 está sendo feita?',
    args0: [{ type: 'field_dropdown', name: 'ACTION', options: ACTIONS }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Verdadeiro enquanto a ação estiver ativa no teclado, toque ou controle.',
  },
  {
    type: 'sz_gk_action_pressed',
    message0: 'ação %1 começou agora?',
    args0: [{ type: 'field_dropdown', name: 'ACTION', options: ACTIONS }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Verdadeiro somente no primeiro passo em que a ação começa.',
  },
  {
    type: 'sz_gk_action_released',
    message0: 'ação %1 terminou agora?',
    args0: [{ type: 'field_dropdown', name: 'ACTION', options: ACTIONS }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Verdadeiro somente no passo em que a ação termina.',
  },
  {
    type: 'sz_gk_current_stage',
    message0: 'a fase atual da aventura',
    output: 'JSValue',
    colour: C,
    tooltip: 'O nome da fase que está rodando agora.',
  },
]
