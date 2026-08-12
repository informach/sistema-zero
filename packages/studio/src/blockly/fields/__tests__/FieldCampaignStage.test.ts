import { describe, expect, it } from 'bun:test'
import { createCampaignStage } from '../../../official-extensions/game-2d-advanced/campaignSchema'
import {
  campaignStageEditorIssue,
  drawCampaignStageCell,
  paintCampaignStageCell,
} from '../FieldCampaignStage'

describe('editor visual de fase', () => {
  it('pinta somente a célula alterada durante o arraste', () => {
    const stage = createCampaignStage()
    const calls: number[][] = []
    const context = {
      fillStyle: '',
      strokeStyle: '',
      fillRect: (...args: number[]) => calls.push(args),
      strokeRect: (...args: number[]) => calls.push(args),
    }

    expect(paintCampaignStageCell(stage, 2, 3, '?')).toBe(true)
    drawCampaignStageCell(context, 2, 3, '?', 12)

    expect(stage.tiles[2]?.[3]).toBe('?')
    expect(calls).toEqual([
      [36, 24, 12, 12],
      [36.5, 24.5, 11, 11],
    ])
    expect(paintCampaignStageCell(stage, 2, 3, '?')).toBe(false)
  })

  it('indica a linha e o campo exatos de uma entidade inválida', () => {
    const stage = createCampaignStage()
    stage.entities[1] = { kind: 'boss', id: 'inicio', x: 8, y: 8, props: { health: 1 } }

    expect(campaignStageEditorIssue(stage)).toMatchObject({
      selector: '[data-campaign-entity="1"][data-campaign-field="id"]',
      message: 'O identificador “inicio” já é usado pelo objeto 1.',
    })

    stage.entities[1].id = 'chefe'
    expect(campaignStageEditorIssue(stage)).toMatchObject({
      selector: '[data-campaign-entity="1"][data-campaign-field="health"]',
      message: 'No objeto 2, Vida deve ser no mínimo 3.',
    })
  })
})
