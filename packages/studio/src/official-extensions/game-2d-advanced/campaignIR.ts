import { z } from 'zod'
import type { JSExpr, JSStatement } from '../../ir/schema'
import { type GameKitCampaignStage, validateCampaignStage } from './campaignSchema'
import {
  GAME_KIT_ACTIONS,
  GAME_KIT_CAMPAIGN_EVENT_FIELDS,
  type GameKitAction,
  type GameKitCampaignEventField,
} from './runtimeContract'

type Common = { __id?: string }

export type GameKitCampaignExpression = Common &
  (
    | {
        type: 'gk:actionDown' | 'gk:actionPressed' | 'gk:actionReleased'
        action: GameKitAction
      }
    | { type: 'gk:currentStage' }
    | { type: 'gk:campaignEventValue'; field: GameKitCampaignEventField }
  )

export type GameKitCampaignStatement = Common &
  (
    | { type: 'gk:fixedSetup'; seed: number | JSExpr }
    | { type: 'gk:onFixedUpdate'; dtName: string; tickName: string; body: JSStatement[] }
    | {
        type: 'gk:defineCampaign'
        id: string
        version: number | JSExpr
        firstStage: string
        players: number | JSExpr
        seed: number | JSExpr
        requiredGems: number | JSExpr
      }
    | { type: 'gk:onCampaignEvent'; event: string; body: JSStatement[] }
    | { type: 'gk:defineCampaignStage'; stage: GameKitCampaignStage }
    | { type: 'gk:startCampaign'; stageId: string }
    | { type: 'gk:goToStage'; stageId: string }
    | {
        type: 'gk:saveCampaign' | 'gk:loadCampaign' | 'gk:deleteCampaignSave'
        slot: number
      }
    | {
        type: 'gk:startReplayRecording' | 'gk:stopReplayRecording' | 'gk:playLastReplay'
      }
  )

type IdField = { __id: z.ZodOptional<z.ZodString> }

export const GAME_KIT_CAMPAIGN_STATEMENT_TYPES = [
  'gk:fixedSetup',
  'gk:onFixedUpdate',
  'gk:defineCampaign',
  'gk:onCampaignEvent',
  'gk:defineCampaignStage',
  'gk:startCampaign',
  'gk:goToStage',
  'gk:saveCampaign',
  'gk:loadCampaign',
  'gk:deleteCampaignSave',
  'gk:startReplayRecording',
  'gk:stopReplayRecording',
  'gk:playLastReplay',
] as const

export function gameKitCampaignExpressionSchemas(_irText: () => z.ZodString, id: IdField) {
  return [
    z.object({ type: z.literal('gk:actionDown'), action: z.enum(GAME_KIT_ACTIONS), ...id }),
    z.object({ type: z.literal('gk:actionPressed'), action: z.enum(GAME_KIT_ACTIONS), ...id }),
    z.object({ type: z.literal('gk:actionReleased'), action: z.enum(GAME_KIT_ACTIONS), ...id }),
    z.object({ type: z.literal('gk:currentStage'), ...id }),
    z.object({
      type: z.literal('gk:campaignEventValue'),
      field: z.enum(GAME_KIT_CAMPAIGN_EVENT_FIELDS),
      ...id,
    }),
  ] as const
}

export function gameKitCampaignStatementSchemas(
  expr: z.ZodType<JSExpr>,
  statement: z.ZodType<JSStatement>,
  irText: () => z.ZodString,
  id: IdField,
) {
  const numeric = z.union([expr, z.number()])
  const slot = z.number().int().min(1).max(3)
  return [
    z.object({ type: z.literal('gk:fixedSetup'), seed: numeric, ...id }),
    z.object({
      type: z.literal('gk:onFixedUpdate'),
      dtName: irText(),
      tickName: irText(),
      body: z.array(statement),
      ...id,
    }),
    z.object({
      type: z.literal('gk:defineCampaign'),
      id: irText(),
      version: numeric,
      firstStage: irText(),
      players: numeric,
      seed: numeric,
      requiredGems: numeric,
      ...id,
    }),
    z.object({
      type: z.literal('gk:onCampaignEvent'),
      event: irText(),
      body: z.array(statement),
      ...id,
    }),
    z.object({
      type: z.literal('gk:defineCampaignStage'),
      stage: z.custom<GameKitCampaignStage>((value) => validateCampaignStage(value) !== null),
      ...id,
    }),
    z.object({ type: z.literal('gk:startCampaign'), stageId: irText(), ...id }),
    z.object({ type: z.literal('gk:goToStage'), stageId: irText(), ...id }),
    z.object({ type: z.literal('gk:saveCampaign'), slot, ...id }),
    z.object({ type: z.literal('gk:loadCampaign'), slot, ...id }),
    z.object({ type: z.literal('gk:deleteCampaignSave'), slot, ...id }),
    z.object({ type: z.literal('gk:startReplayRecording'), ...id }),
    z.object({ type: z.literal('gk:stopReplayRecording'), ...id }),
    z.object({ type: z.literal('gk:playLastReplay'), ...id }),
  ] as const
}
