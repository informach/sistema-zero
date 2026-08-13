import type * as Blockly from 'blockly/core'
import type { JSExpr, JSStatement } from '#ir'
import { campaignStageOf } from '../../blockly/blocks/campaignStageMutator'
import {
  type GameKitAction,
  type GameKitCampaignEventField,
  isGameKitAction,
  isGameKitCampaignEventField,
} from './runtimeContract'
import { gameKitUiFontBlockToIR } from './uiFontCodec'

export const CAMPAIGN_BLOCK_UNHANDLED = Symbol('campaign-block-unhandled')

export interface CampaignBlockCodecContext {
  field(block: Blockly.Block, name: string): string
  expression(block: Blockly.Block, name: string, fallback: JSExpr): JSExpr
  statements(block: Blockly.Block, name: string): JSStatement[]
}

function campaignAction(value: string): GameKitAction {
  return isGameKitAction(value) ? value : 'pular'
}

function campaignEventField(value: string): GameKitCampaignEventField {
  return isGameKitCampaignEventField(value) ? value : 'id'
}

export function campaignExpressionBlockToIR(
  block: Blockly.Block,
  context: Pick<CampaignBlockCodecContext, 'field'>,
): JSExpr | typeof CAMPAIGN_BLOCK_UNHANDLED {
  const action = () => campaignAction(context.field(block, 'ACTION'))
  switch (block.type) {
    case 'sz_gk_action_down':
      return { type: 'gk:actionDown', action: action() }
    case 'sz_gk_action_pressed':
      return { type: 'gk:actionPressed', action: action() }
    case 'sz_gk_action_released':
      return { type: 'gk:actionReleased', action: action() }
    case 'sz_gk_current_stage':
      return { type: 'gk:currentStage' }
    case 'sz_gk_campaign_event_value':
      return {
        type: 'gk:campaignEventValue',
        field: campaignEventField(context.field(block, 'FIELD')),
      }
    default:
      return CAMPAIGN_BLOCK_UNHANDLED
  }
}

export function campaignStatementBlockToIR(
  block: Blockly.Block,
  context: CampaignBlockCodecContext,
): JSStatement | typeof CAMPAIGN_BLOCK_UNHANDLED {
  // Este é o único despachante da gk que o `buildIR` chama, e aquela fachada está
  // no teto de linhas — então os codecs novos da extensão entram por aqui.
  const font = gameKitUiFontBlockToIR(block, context.field)
  if (font) return font
  const f = (name: string) => context.field(block, name)
  const number = (name: string, fallback: number) =>
    context.expression(block, name, { type: 'num', value: fallback })
  switch (block.type) {
    case 'sz_gk_fixed_setup':
      return { type: 'gk:fixedSetup', seed: number('SEED', 2026) }
    case 'sz_gk_on_fixed_update':
      return {
        type: 'gk:onFixedUpdate',
        dtName: f('DT') || 'dt',
        tickName: f('TICK') || 'passo',
        body: context.statements(block, 'BODY'),
      }
    case 'sz_gk_define_campaign':
      return {
        type: 'gk:defineCampaign',
        id: f('ID') || 'minha-aventura',
        version: number('VERSION', 1),
        firstStage: f('FIRST') || '1-1',
        players: number('PLAYERS', 1),
        seed: number('SEED', 2026),
        requiredGems: number('REQUIRED_GEMS', 0),
      }
    case 'sz_gk_on_campaign_event':
      return {
        type: 'gk:onCampaignEvent',
        event: f('EVENT') || 'aviso',
        body: context.statements(block, 'BODY'),
      }
    case 'sz_gk_define_campaign_stage':
      return { type: 'gk:defineCampaignStage', stage: campaignStageOf(block) }
    case 'sz_gk_start_campaign':
      return { type: 'gk:startCampaign', stageId: f('STAGE') }
    case 'sz_gk_go_stage':
      return { type: 'gk:goToStage', stageId: f('STAGE') }
    case 'sz_gk_save_campaign':
    case 'sz_gk_load_campaign':
    case 'sz_gk_delete_campaign_save': {
      const slot = Math.max(1, Math.min(3, Number.parseInt(f('SLOT'), 10) || 1))
      if (block.type === 'sz_gk_save_campaign') return { type: 'gk:saveCampaign', slot }
      if (block.type === 'sz_gk_load_campaign') return { type: 'gk:loadCampaign', slot }
      return { type: 'gk:deleteCampaignSave', slot }
    }
    case 'sz_gk_start_replay':
      return { type: 'gk:startReplayRecording' }
    case 'sz_gk_stop_replay':
      return { type: 'gk:stopReplayRecording' }
    case 'sz_gk_play_last_replay':
      return { type: 'gk:playLastReplay' }
    default:
      return CAMPAIGN_BLOCK_UNHANDLED
  }
}
