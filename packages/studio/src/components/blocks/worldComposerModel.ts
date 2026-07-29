import * as Blockly from 'blockly/core'
import { FRAME_EVENTS, FRAME_LOOPS, FRAME_START } from '#blockly'
import { getBlockContract } from '../../blockly/blockContracts'

export interface WorldComposerItem {
  id: string
  type: string
  label: string
  x: number
  z: number
  color: string
  movable: boolean
}

interface PlacementDefinition {
  label: string
  x: string
  z: string
  x2?: string
  z2?: string
  color?: string
}

const PLACEMENTS: Record<string, PlacementDefinition> = {
  sz_w3d_city: { label: 'Cidade', x: 'X', z: 'Z' },
  sz_w3d_district: { label: 'Distrito', x: 'X', z: 'Z' },
  sz_w3d_road_grid: { label: 'Ruas', x: 'X', z: 'Z' },
  sz_w3d_house_row: { label: 'Casas', x: 'X1', z: 'Z1', x2: 'X2', z2: 'Z2' },
  sz_w3d_lighthouse: { label: 'Farol', x: 'X', z: 'Z' },
  sz_w3d_npc: { label: 'Amigo', x: 'X', z: 'Z', color: 'COLOR' },
  sz_w3d_marker: { label: 'Marcador', x: 'X', z: 'Z' },
  sz_w3d_point: { label: 'Ponto', x: 'X', z: 'Z' },
  sz_w3d_zone: { label: 'Área', x: 'X', z: 'Z' },
  sz_w3d_totem_text: { label: 'Totem', x: 'X', z: 'Z' },
  sz_w3d_totem_image: { label: 'Quadro', x: 'X', z: 'Z' },
  sz_w3d_waterfall: { label: 'Cachoeira', x: 'X', z: 'Z' },
  sz_w3d_lamp: { label: 'Poste', x: 'X', z: 'Z' },
  sz_w3d_campfire: { label: 'Fogueira', x: 'X', z: 'Z' },
  sz_w3d_barn: { label: 'Celeiro', x: 'X', z: 'Z' },
  sz_w3d_windmill: { label: 'Moinho', x: 'X', z: 'Z' },
  sz_w3d_crater: { label: 'Cratera', x: 'X', z: 'Z' },
  sz_w3d_flag: { label: 'Bandeira', x: 'X', z: 'Z', color: 'COLOR' },
  sz_w3d_rocket: { label: 'Foguete', x: 'X', z: 'Z' },
  sz_w3d_door: { label: 'Porta', x: 'X', z: 'Z' },
  sz_w3d_place_thing: { label: 'Objeto', x: 'X', z: 'Z' },
  sz_w3d_place_model: { label: 'Modelo', x: 'X', z: 'Z' },
}

function numberInput(block: Blockly.Block, inputName: string): number | null {
  const valueBlock = block.getInputTargetBlock(inputName)
  if (valueBlock?.type !== 'sz_val_number') return null
  const value = Number(valueBlock.getFieldValue('NUM'))
  return Number.isFinite(value) ? value : null
}

function placementColor(block: Blockly.Block, fieldName?: string): string {
  if (!fieldName) return '#34d399'
  const value = block.getFieldValue(fieldName)
  return typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value : '#34d399'
}

export function collectWorldComposerItems(workspace: Blockly.Workspace): WorldComposerItem[] {
  const items: WorldComposerItem[] = []
  for (const block of workspace.getAllBlocks(false)) {
    const placement = PLACEMENTS[block.type]
    if (!placement) continue
    const firstX = numberInput(block, placement.x)
    const firstZ = numberInput(block, placement.z)
    const secondX = placement.x2 ? numberInput(block, placement.x2) : firstX
    const secondZ = placement.z2 ? numberInput(block, placement.z2) : firstZ
    const movable = firstX !== null && firstZ !== null && secondX !== null && secondZ !== null
    items.push({
      id: block.id,
      type: block.type,
      label: placement.label,
      x: movable ? (firstX + secondX) * 0.5 : 0,
      z: movable ? (firstZ + secondZ) * 0.5 : 0,
      color: placementColor(block, placement.color),
      movable,
    })
  }
  return items
}

function setNumberInput(block: Blockly.Block, inputName: string, value: number): boolean {
  const valueBlock = block.getInputTargetBlock(inputName)
  if (valueBlock?.type !== 'sz_val_number') return false
  valueBlock.setFieldValue(String(Math.round(value * 10) / 10), 'NUM')
  return true
}

export function moveWorldComposerItem(
  workspace: Blockly.Workspace,
  id: string,
  x: number,
  z: number,
): boolean {
  const block = workspace.getBlockById(id)
  if (!block) return false
  const placement = PLACEMENTS[block.type]
  if (!placement) return false
  const firstX = numberInput(block, placement.x)
  const firstZ = numberInput(block, placement.z)
  const secondX = placement.x2 ? numberInput(block, placement.x2) : firstX
  const secondZ = placement.z2 ? numberInput(block, placement.z2) : firstZ
  if (firstX === null || firstZ === null || secondX === null || secondZ === null) {
    return false
  }
  const deltaX = x - (firstX + secondX) * 0.5
  const deltaZ = z - (firstZ + secondZ) * 0.5
  Blockly.Events.setGroup(true)
  try {
    const firstMoved =
      setNumberInput(block, placement.x, firstX + deltaX) &&
      setNumberInput(block, placement.z, firstZ + deltaZ)
    const secondMoved =
      (!placement.x2 || setNumberInput(block, placement.x2, secondX + deltaX)) &&
      (!placement.z2 || setNumberInput(block, placement.z2, secondZ + deltaZ))
    return firstMoved && secondMoved
  } finally {
    Blockly.Events.setGroup(false)
  }
}

function connectNumberShadow(
  workspace: Blockly.Workspace,
  block: Blockly.Block,
  inputName: string,
  value: number,
): void {
  const connection = block.getInput(inputName)?.connection
  if (!connection) return
  const numberBlock = workspace.newBlock('sz_val_number')
  numberBlock.setFieldValue(String(value), 'NUM')
  numberBlock.setShadow(true)
  const renderedNumber = numberBlock as unknown as Partial<Blockly.BlockSvg>
  renderedNumber.initSvg?.()
  renderedNumber.render?.()
  if (numberBlock.outputConnection) connection.connect(numberBlock.outputConnection)
}

type ComposerBlockType = 'sz_w3d_district' | 'sz_w3d_road_grid' | 'sz_w3d_house_row'

const NEW_BLOCK_DEFAULTS: Record<ComposerBlockType, Record<string, number>> = {
  sz_w3d_district: { X: 0, Z: 0, SIZE: 48 },
  sz_w3d_road_grid: { X: 0, Z: 0, SIZE: 80, WIDTH: 6 },
  sz_w3d_house_row: { N: 8, X1: -30, Z1: 15, X2: 30, Z2: 15 },
}

export function appendWorldComposerBlock(
  workspace: Blockly.Workspace,
  type: ComposerBlockType,
): string | null {
  const area = getBlockContract(type)?.placement?.root[0]
  const frameType = area === 'start' ? FRAME_START : area === 'events' ? FRAME_EVENTS : FRAME_LOOPS
  const frame = area ? workspace.getBlocksByType(frameType, false)[0] : undefined
  const frameConnection = frame?.getInput('CHILDREN')?.connection
  if (!frameConnection) return null

  Blockly.Events.setGroup(true)
  try {
    const block = workspace.newBlock(type)
    const renderedBlock = block as unknown as Partial<Blockly.BlockSvg>
    renderedBlock.initSvg?.()
    for (const [inputName, value] of Object.entries(NEW_BLOCK_DEFAULTS[type])) {
      connectNumberShadow(workspace, block, inputName, value)
    }
    renderedBlock.render?.()

    const first = frame.getInputTargetBlock('CHILDREN')
    if (!first) {
      if (block.previousConnection) frameConnection.connect(block.previousConnection)
    } else {
      let last = first
      while (last.getNextBlock()) last = last.getNextBlock() ?? last
      if (last.nextConnection && block.previousConnection) {
        last.nextConnection.connect(block.previousConnection)
      }
    }
    renderedBlock.select?.()
    ;(workspace as unknown as Partial<Blockly.WorkspaceSvg>).centerOnBlock?.(block.id, false)
    return block.id
  } finally {
    Blockly.Events.setGroup(false)
  }
}
