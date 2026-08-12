import * as Blockly from 'blockly/core'
import {
  campaignStageSummary,
  cloneCampaignStage,
  createCampaignStage,
  type GameKitCampaignStage,
  normalizeCampaignStage,
  validateCampaignStage,
} from '../../official-extensions/game-2d-advanced/campaignSchema'

const SUMMARY_FIELD = 'STAGE_SUMMARY'

export interface CampaignStageBlock extends Blockly.Block {
  campaignStage_: GameKitCampaignStage
  setCampaignStage_(stage: GameKitCampaignStage): void
  updateCampaignStageSummary_(): void
}

function updateCampaignStageSummary(this: CampaignStageBlock): void {
  this.getField(SUMMARY_FIELD)?.setValue(campaignStageSummary(this.campaignStage_))
}

const CAMPAIGN_STAGE_MUTATOR_MIXIN = {
  campaignStage_: createCampaignStage(),

  saveExtraState(this: CampaignStageBlock): { stage: GameKitCampaignStage } {
    return { stage: cloneCampaignStage(this.campaignStage_) }
  },

  loadExtraState(this: CampaignStageBlock, state: { stage?: unknown } | null): void {
    const stage = normalizeCampaignStage(state?.stage)
    this.campaignStage_ = stage ?? createCampaignStage()
    this.updateCampaignStageSummary_()
  },

  setCampaignStage_(this: CampaignStageBlock, stage: GameKitCampaignStage): void {
    const valid = validateCampaignStage(stage)
    if (!valid) return
    this.campaignStage_ = valid
    this.updateCampaignStageSummary_()
  },

  updateCampaignStageSummary_: updateCampaignStageSummary,
}

function campaignStageMutatorHelper(this: CampaignStageBlock): void {
  const valid = validateCampaignStage(this.campaignStage_)
  this.campaignStage_ = valid ?? createCampaignStage()
  this.updateCampaignStageSummary_()
}

function isCampaignStageBlock(block: Blockly.Block): block is CampaignStageBlock {
  return typeof Reflect.get(block, 'setCampaignStage_') === 'function'
}

function asCampaignStageBlock(block: Blockly.Block | null): CampaignStageBlock | null {
  return block && isCampaignStageBlock(block) ? block : null
}

export function campaignStageOf(block: Blockly.Block): GameKitCampaignStage {
  const campaignBlock = asCampaignStageBlock(block)
  const valid = validateCampaignStage(campaignBlock?.campaignStage_)
  return valid ?? createCampaignStage()
}

export function setCampaignStageOnBlock(
  block: Blockly.Block,
  stage: GameKitCampaignStage,
): boolean {
  const campaignBlock = asCampaignStageBlock(block)
  if (!campaignBlock) return false
  campaignBlock.setCampaignStage_(stage)
  return true
}

let registered = false

export function registerCampaignStageMutator(): void {
  if (registered) return
  Blockly.Extensions.registerMutator(
    'sz_gk_campaign_stage_mutator',
    CAMPAIGN_STAGE_MUTATOR_MIXIN,
    campaignStageMutatorHelper,
  )
  registered = true
}
