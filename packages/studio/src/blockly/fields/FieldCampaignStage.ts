import * as Blockly from 'blockly/core'
import {
  CAMPAIGN_ENTITY_CATALOG,
  CAMPAIGN_ENTITY_KINDS,
  type CampaignEntityKind,
  type CampaignEntityProperty,
  campaignEntityDefinition,
  campaignEntityPropsIssue,
  isCampaignEntityKind,
} from '../../official-extensions/game-2d-advanced/campaignEntityCatalog'
import {
  CAMPAIGN_MAX_ENTITIES,
  CAMPAIGN_MAX_HEIGHT,
  CAMPAIGN_MAX_TRIGGERS,
  CAMPAIGN_MAX_WIDTH,
  CAMPAIGN_THEMES,
  CAMPAIGN_TILE_CHARS,
  campaignStageSummary,
  cloneCampaignStage,
  type GameKitCampaignStage,
  validateCampaignStage,
} from '../../official-extensions/game-2d-advanced/campaignSchema'
import { campaignStageOf, setCampaignStageOnBlock } from '../blocks/campaignStageMutator'
import { withMutation } from '../blocks/mutatorEvents'

type FieldOptions = Blockly.FieldTextInputFromJsonConfig

const TILE_LABELS: Record<string, string> = {
  '.': 'Vazio',
  '#': 'Chão',
  '=': 'Plataforma',
  B: 'Quebrável',
  '?': 'Surpresa',
  '^': 'Perigo',
  '~': 'Água',
  H: 'Escada',
}

const TILE_COLORS: Record<string, string> = {
  '.': '#152033',
  '#': '#72503a',
  '=': '#c7925b',
  B: '#a85d3c',
  '?': '#f4c84a',
  '^': '#ee5b61',
  '~': '#35b5dc',
  H: '#d8a15d',
}

function applyThemeScope(field: Blockly.Field, content: HTMLElement): void {
  const workspace = field.getSourceBlock()?.workspace as { getInjectionDiv?(): unknown } | undefined
  const injectionDiv = workspace?.getInjectionDiv?.()
  const scope = injectionDiv instanceof HTMLElement ? injectionDiv.closest('[data-sz-theme]') : null
  const theme = scope?.getAttribute('data-sz-theme')
  if (theme) content.setAttribute('data-sz-theme', theme)
}

function input(type: string, value: string, min?: number, max?: number): HTMLInputElement {
  const control = document.createElement('input')
  control.type = type
  control.value = value
  if (min !== undefined) control.min = String(min)
  if (max !== undefined) control.max = String(max)
  control.style.cssText =
    'min-width:0;width:100%;height:30px;padding:4px 7px;border:1px solid var(--color-sz-border);border-radius:6px;background:var(--color-sz-bg);color:var(--color-sz-fg);font:12px Inter,system-ui,sans-serif;'
  return control
}

function select(
  options: ReadonlyArray<string | { value: string; label: string }>,
  value: string,
): HTMLSelectElement {
  const control = document.createElement('select')
  control.style.cssText =
    'min-width:0;width:100%;height:30px;padding:4px;border:1px solid var(--color-sz-border);border-radius:6px;background:var(--color-sz-bg);color:var(--color-sz-fg);font:12px Inter,system-ui,sans-serif;'
  for (const item of options) {
    const optionValue = typeof item === 'string' ? item : item.value
    const option = document.createElement('option')
    option.value = optionValue
    option.textContent = typeof item === 'string' ? item : item.label
    control.appendChild(option)
  }
  control.value = value
  return control
}

function labelled(label: string, control: HTMLElement): HTMLLabelElement {
  const wrapper = document.createElement('label')
  wrapper.style.cssText =
    'display:grid;gap:3px;color:var(--color-sz-fg-soft);font:600 10px Inter,system-ui,sans-serif;'
  const text = document.createElement('span')
  text.textContent = label
  wrapper.append(text, control)
  return wrapper
}

function identifyControl(
  control: HTMLElement,
  field: string,
  entity?: number,
  trigger?: number,
): void {
  control.dataset.campaignField = field
  if (entity !== undefined) control.dataset.campaignEntity = String(entity)
  if (trigger !== undefined) control.dataset.campaignTrigger = String(trigger)
}

function button(label: string, title = label): HTMLButtonElement {
  const control = document.createElement('button')
  control.type = 'button'
  control.title = title
  control.textContent = label
  control.style.cssText =
    'height:30px;padding:4px 9px;border:1px solid var(--color-sz-border);border-radius:6px;background:var(--color-sz-bg);color:var(--color-sz-fg);font:600 11px Inter,system-ui,sans-serif;cursor:pointer;'
  return control
}

function integerValue(
  control: HTMLInputElement,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number.parseInt(control.value, 10)
  return Number.isInteger(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback
}

function numberValue(control: HTMLInputElement, fallback: number): number {
  const parsed = Number.parseFloat(control.value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function scalarValue(value: string): string | number | boolean | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (trimmed === 'verdadeiro') return true
  if (trimmed === 'falso') return false
  const number = Number(trimmed)
  return Number.isFinite(number) ? number : trimmed.slice(0, 200)
}

function resizeTiles(stage: GameKitCampaignStage, width: number, height: number): void {
  stage.tiles = Array.from({ length: height }, (_, row) => {
    const source = stage.tiles[row] ?? ''
    return source.slice(0, width).padEnd(width, row === height - 1 ? '#' : '.')
  })
  stage.width = width
  stage.height = height
}

export interface CampaignStageDrawContext {
  fillStyle: string | CanvasGradient | CanvasPattern
  strokeStyle: string | CanvasGradient | CanvasPattern
  fillRect: (x: number, y: number, width: number, height: number) => void
  strokeRect: (x: number, y: number, width: number, height: number) => void
}

export function drawCampaignStageCell(
  context: CampaignStageDrawContext,
  row: number,
  column: number,
  tile: string,
  cellSize: number,
): void {
  context.fillStyle = TILE_COLORS[tile] ?? TILE_COLORS['.'] ?? '#152033'
  context.fillRect(column * cellSize, row * cellSize, cellSize, cellSize)
  if (cellSize < 8) return
  context.strokeStyle = 'rgba(255,255,255,.09)'
  context.strokeRect(column * cellSize + 0.5, row * cellSize + 0.5, cellSize - 1, cellSize - 1)
}

export function paintCampaignStageCell(
  stage: GameKitCampaignStage,
  row: number,
  column: number,
  tile: string,
): boolean {
  const line = stage.tiles[row]
  if (
    line === undefined ||
    row < 0 ||
    row >= stage.height ||
    column < 0 ||
    column >= stage.width ||
    !CAMPAIGN_TILE_CHARS.includes(tile as (typeof CAMPAIGN_TILE_CHARS)[number]) ||
    line[column] === tile
  ) {
    return false
  }
  stage.tiles[row] = `${line.slice(0, column)}${tile}${line.slice(column + 1)}`
  return true
}

export interface CampaignStageEditorIssue {
  message: string
  selector: string
}

const SAFE_CAMPAIGN_ID = /^[A-Za-z0-9_-]+$/

function safeCampaignId(value: string): boolean {
  return value.length >= 1 && value.length <= 64 && SAFE_CAMPAIGN_ID.test(value)
}

export function campaignStageEditorIssue(
  stage: GameKitCampaignStage,
): CampaignStageEditorIssue | null {
  if (!safeCampaignId(stage.id)) {
    return {
      selector: '[data-campaign-field="stage-id"]',
      message: 'O nome da fase deve usar apenas letras, números, “_” ou “-”.',
    }
  }
  if (stage.nextStage && !safeCampaignId(stage.nextStage)) {
    return {
      selector: '[data-campaign-field="next-stage"]',
      message: 'A próxima fase tem um identificador inválido.',
    }
  }
  if (stage.secretStage && !safeCampaignId(stage.secretStage)) {
    return {
      selector: '[data-campaign-field="secret-stage"]',
      message: 'A saída secreta tem um identificador inválido.',
    }
  }
  const entityIds = new Map<string, number>()
  for (let index = 0; index < stage.entities.length; index += 1) {
    const entity = stage.entities[index]
    if (!entity) continue
    if (!safeCampaignId(entity.id)) {
      return {
        selector: `[data-campaign-entity="${index}"][data-campaign-field="id"]`,
        message: `No objeto ${index + 1}, informe um identificador com letras, números, “_” ou “-”.`,
      }
    }
    const previous = entityIds.get(entity.id)
    if (previous !== undefined) {
      return {
        selector: `[data-campaign-entity="${index}"][data-campaign-field="id"]`,
        message: `O identificador “${entity.id}” já é usado pelo objeto ${previous + 1}.`,
      }
    }
    entityIds.set(entity.id, index)
    if (!isCampaignEntityKind(entity.kind)) {
      return {
        selector: `[data-campaign-entity="${index}"][data-campaign-field="kind"]`,
        message: `O tipo do objeto ${index + 1} não existe.`,
      }
    }
    const propsIssue = campaignEntityPropsIssue(entity.kind, entity.props ?? {})
    if (propsIssue) {
      return {
        selector: `[data-campaign-entity="${index}"][data-campaign-field="${propsIssue.key}"]`,
        message: `No objeto ${index + 1}, ${propsIssue.message}`,
      }
    }
  }
  for (let index = 0; index < stage.triggers.length; index += 1) {
    const trigger = stage.triggers[index]
    if (!trigger) continue
    if (!safeCampaignId(trigger.kind)) {
      return {
        selector: `[data-campaign-trigger="${index}"][data-campaign-field="kind"]`,
        message: `No acontecimento ${index + 1}, informe um nome válido.`,
      }
    }
    if (trigger.target && !safeCampaignId(trigger.target)) {
      return {
        selector: `[data-campaign-trigger="${index}"][data-campaign-field="target"]`,
        message: `No acontecimento ${index + 1}, o destino tem caracteres inválidos.`,
      }
    }
  }
  return null
}

const knownEntityPropertyKeys = new Set<string>(
  Object.values(CAMPAIGN_ENTITY_CATALOG).flatMap((definition) =>
    definition.properties.map((property) => property.key),
  ),
)

function resetEntityPropsForKind(entity: GameKitCampaignStage['entities'][number]): void {
  const legacyProps = Object.fromEntries(
    Object.entries(entity.props ?? {}).filter(([key]) => !knownEntityPropertyKeys.has(key)),
  )
  entity.props = Object.keys(legacyProps).length > 0 ? legacyProps : undefined
}

function section(title: string): { root: HTMLDivElement; body: HTMLDivElement } {
  const root = document.createElement('div')
  root.style.cssText =
    'display:grid;gap:7px;padding:9px;border:1px solid var(--color-sz-border);border-radius:9px;background:color-mix(in srgb,var(--color-sz-bg) 75%,transparent);'
  const heading = document.createElement('strong')
  heading.textContent = title
  heading.style.cssText = 'font:700 12px Inter,system-ui,sans-serif;color:var(--color-sz-fg);'
  const body = document.createElement('div')
  body.style.cssText = 'display:grid;gap:6px;'
  root.append(heading, body)
  return { root, body }
}

export class FieldCampaignStage extends Blockly.FieldTextInput {
  override SERIALIZABLE = false

  override isSerializable(): boolean {
    return false
  }

  static override fromJson(options: FieldOptions): FieldCampaignStage {
    return new FieldCampaignStage(`${options.text ?? 'Abrir editor da fase'}`)
  }

  protected override showEditor_(): void {
    const sourceBlock = this.getSourceBlock()
    if (!sourceBlock) return
    const stage = cloneCampaignStage(campaignStageOf(sourceBlock))
    const content = Blockly.DropDownDiv.getContentDiv()
    content.textContent = ''
    applyThemeScope(this, content)

    const wrap = document.createElement('div')
    wrap.style.cssText =
      'box-sizing:border-box;width:min(920px,calc(100vw - 24px));max-height:min(720px,calc(100vh - 32px));overflow:auto;padding:12px;display:grid;gap:10px;background:var(--color-sz-panel);font-family:Inter,system-ui,sans-serif;'
    const title = document.createElement('div')
    title.style.cssText = 'color:var(--color-sz-fg);line-height:1.35;'
    const titleStrong = document.createElement('strong')
    titleStrong.textContent = 'Editor da fase'
    const titleHelp = document.createElement('small')
    titleHelp.textContent = 'Pinte o caminho e organize personagens, saídas e acontecimentos.'
    title.append(titleStrong, document.createElement('br'), titleHelp)
    wrap.appendChild(title)

    const details = section('1. Identidade e caminho')
    const detailsGrid = document.createElement('div')
    detailsGrid.style.cssText =
      'display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:6px;'
    const id = input('text', stage.id)
    id.maxLength = 64
    const world = input('number', String(stage.world), 1, 128)
    const order = input('number', String(stage.order), 1, 128)
    const theme = select(CAMPAIGN_THEMES, stage.theme)
    const nextStage = input('text', stage.nextStage ?? '')
    nextStage.maxLength = 64
    const secretStage = input('text', stage.secretStage ?? '')
    secretStage.maxLength = 64
    const timeLimit = input('number', String(stage.timeLimit ?? 300), 0, 3600)
    identifyControl(id, 'stage-id')
    identifyControl(world, 'world')
    identifyControl(order, 'order')
    identifyControl(theme, 'theme')
    identifyControl(nextStage, 'next-stage')
    identifyControl(secretStage, 'secret-stage')
    identifyControl(timeLimit, 'time-limit')
    detailsGrid.append(
      labelled('Nome da fase', id),
      labelled('Mundo', world),
      labelled('Ordem', order),
      labelled('Tema', theme),
      labelled('Próxima fase', nextStage),
      labelled('Saída secreta', secretStage),
      labelled('Tempo (s)', timeLimit),
    )
    details.body.appendChild(detailsGrid)
    wrap.appendChild(details.root)

    const map = section('2. Mapa pintável')
    const tools = document.createElement('div')
    tools.style.cssText = 'display:flex;align-items:end;gap:6px;flex-wrap:wrap;'
    const width = input('number', String(stage.width), 1, CAMPAIGN_MAX_WIDTH)
    width.style.width = '78px'
    const height = input('number', String(stage.height), 1, CAMPAIGN_MAX_HEIGHT)
    height.style.width = '78px'
    const resize = button('Redimensionar')
    tools.append(labelled('Largura', width), labelled('Altura', height), resize)
    const palette = document.createElement('div')
    palette.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;margin-left:auto;'
    let selectedTile = '#'
    const paletteButtons: HTMLButtonElement[] = []
    for (const char of CAMPAIGN_TILE_CHARS) {
      const tileButton = button(`${char} ${TILE_LABELS[char] ?? char}`)
      tileButton.dataset.tile = char
      tileButton.style.background = TILE_COLORS[char] ?? '#64748b'
      tileButton.style.color = char === '?' ? '#392d12' : '#fff'
      tileButton.addEventListener('click', () => {
        selectedTile = char
        for (const item of paletteButtons)
          item.style.outline = item === tileButton ? '2px solid var(--color-sz-accent)' : 'none'
      })
      paletteButtons.push(tileButton)
      palette.appendChild(tileButton)
    }
    paletteButtons[1]?.click()
    tools.appendChild(palette)
    map.body.appendChild(tools)

    const canvasBox = document.createElement('div')
    canvasBox.style.cssText =
      'max-width:100%;max-height:360px;overflow:auto;border:1px solid var(--color-sz-border);border-radius:7px;background:#101827;touch-action:none;'
    const canvas = document.createElement('canvas')
    canvas.setAttribute('role', 'grid')
    canvas.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown ArrowLeft ArrowRight Space Enter')
    canvas.tabIndex = 0
    canvas.style.cssText =
      'display:block;image-rendering:pixelated;cursor:crosshair;outline-offset:3px;'
    canvasBox.appendChild(canvas)
    map.body.appendChild(canvasBox)
    wrap.appendChild(map.root)

    let cellSize = 12
    let painting = false
    let keyboardRow = 0
    let keyboardColumn = 0
    const updateCanvasLabel = () => {
      const tile = stage.tiles[keyboardRow]?.[keyboardColumn] ?? '.'
      canvas.setAttribute(
        'aria-label',
        `Mapa pintável da fase. Célula ${keyboardColumn + 1}, ${keyboardRow + 1}: ${TILE_LABELS[tile] ?? tile}. Use as setas para navegar e Espaço para pintar.`,
      )
    }
    const drawKeyboardCursor = () => {
      if (document.activeElement !== canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.strokeStyle = '#ffffff'
      ctx.strokeRect(
        keyboardColumn * cellSize + 1.5,
        keyboardRow * cellSize + 1.5,
        cellSize - 3,
        cellSize - 3,
      )
    }
    const drawGrid = () => {
      cellSize = stage.width <= 64 && stage.height <= 32 ? 12 : stage.width <= 128 ? 8 : 4
      canvas.width = stage.width * cellSize
      canvas.height = stage.height * cellSize
      canvas.style.width = `${canvas.width}px`
      canvas.style.height = `${canvas.height}px`
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      for (let row = 0; row < stage.height; row += 1) {
        const line = stage.tiles[row] ?? '.'.repeat(stage.width)
        for (let col = 0; col < stage.width; col += 1) {
          const char = line[col] ?? '.'
          drawCampaignStageCell(ctx, row, col, char, cellSize)
        }
      }
      updateCanvasLabel()
      drawKeyboardCursor()
    }
    const paintAt = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const col = Math.floor(((event.clientX - rect.left) / rect.width) * stage.width)
      const row = Math.floor(((event.clientY - rect.top) / rect.height) * stage.height)
      if (!paintCampaignStageCell(stage, row, col, selectedTile)) return
      const ctx = canvas.getContext('2d')
      if (ctx) drawCampaignStageCell(ctx, row, col, selectedTile, cellSize)
    }
    canvas.addEventListener('pointerdown', (event) => {
      event.preventDefault()
      painting = true
      try {
        canvas.setPointerCapture(event.pointerId)
      } catch {}
      paintAt(event)
    })
    canvas.addEventListener('pointermove', (event) => {
      if (painting) paintAt(event)
    })
    const stopPainting = () => {
      painting = false
    }
    canvas.addEventListener('pointerup', stopPainting)
    canvas.addEventListener('pointercancel', stopPainting)
    canvas.addEventListener('lostpointercapture', stopPainting)
    canvas.addEventListener('focus', () => {
      updateCanvasLabel()
      drawKeyboardCursor()
    })
    canvas.addEventListener('blur', () => {
      const tile = stage.tiles[keyboardRow]?.[keyboardColumn] ?? '.'
      const ctx = canvas.getContext('2d')
      if (ctx) drawCampaignStageCell(ctx, keyboardRow, keyboardColumn, tile, cellSize)
    })
    canvas.addEventListener('keydown', (event) => {
      const previousRow = keyboardRow
      const previousColumn = keyboardColumn
      if (event.key === 'ArrowLeft') keyboardColumn = Math.max(0, keyboardColumn - 1)
      else if (event.key === 'ArrowRight')
        keyboardColumn = Math.min(stage.width - 1, keyboardColumn + 1)
      else if (event.key === 'ArrowUp') keyboardRow = Math.max(0, keyboardRow - 1)
      else if (event.key === 'ArrowDown') keyboardRow = Math.min(stage.height - 1, keyboardRow + 1)
      else if (event.key === ' ' || event.key === 'Enter') {
        if (paintCampaignStageCell(stage, keyboardRow, keyboardColumn, selectedTile)) {
          const ctx = canvas.getContext('2d')
          if (ctx) drawCampaignStageCell(ctx, keyboardRow, keyboardColumn, selectedTile, cellSize)
        }
      } else return
      event.preventDefault()
      if (previousRow !== keyboardRow || previousColumn !== keyboardColumn) {
        const previousTile = stage.tiles[previousRow]?.[previousColumn] ?? '.'
        const ctx = canvas.getContext('2d')
        if (ctx) drawCampaignStageCell(ctx, previousRow, previousColumn, previousTile, cellSize)
      }
      updateCanvasLabel()
      drawKeyboardCursor()
    })
    resize.addEventListener('click', () => {
      resizeTiles(
        stage,
        integerValue(width, stage.width, 1, CAMPAIGN_MAX_WIDTH),
        integerValue(height, stage.height, 1, CAMPAIGN_MAX_HEIGHT),
      )
      width.value = String(stage.width)
      height.value = String(stage.height)
      drawGrid()
    })
    drawGrid()

    const entitySection = section('3. Personagens e objetos')
    const entityList = document.createElement('div')
    const renderEntities = () => {
      entityList.textContent = ''
      entityList.style.cssText = 'display:grid;gap:8px;'
      stage.entities.forEach((entity, index) => {
        const row = document.createElement('div')
        row.style.cssText =
          'display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));align-items:end;gap:6px;padding:8px;border:1px solid var(--color-sz-border);border-radius:7px;'
        row.setAttribute('role', 'group')
        row.setAttribute('aria-label', `Objeto ${index + 1}`)
        const rowHeading = document.createElement('strong')
        rowHeading.textContent = `Objeto ${index + 1}`
        rowHeading.style.cssText =
          'grid-column:1/-1;color:var(--color-sz-fg);font:700 11px Inter,system-ui,sans-serif;'
        const entityKind: CampaignEntityKind = isCampaignEntityKind(entity.kind)
          ? entity.kind
          : 'coin'
        const kind = select(
          CAMPAIGN_ENTITY_KINDS.map((value) => ({
            value,
            label: campaignEntityDefinition(value).label,
          })),
          entityKind,
        )
        const entityId = input('text', entity.id)
        entityId.maxLength = 64
        const x = input('number', String(entity.x))
        const y = input('number', String(entity.y))
        const variant = input('text', entity.variant ?? '')
        variant.maxLength = 80
        const remove = button('×', 'Remover objeto')
        remove.setAttribute('aria-label', `Remover objeto ${index + 1}`)
        identifyControl(kind, 'kind', index)
        identifyControl(entityId, 'id', index)
        identifyControl(x, 'x', index)
        identifyControl(y, 'y', index)
        identifyControl(variant, 'variant', index)
        const properties = document.createElement('div')
        properties.style.cssText =
          'grid-column:1/-1;display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px;'
        const setProperty = (
          property: CampaignEntityProperty,
          value: string | number | boolean,
        ) => {
          entity.props ??= {}
          if (property.key === 'requiresBoss' && typeof value === 'boolean') {
            entity.props.requiresBoss = value
          } else if (property.key === 'direction' && (value === -1 || value === 1)) {
            entity.props.direction = value
          } else if (typeof value === 'number') {
            if (property.key === 'speed') entity.props.speed = value
            else if (property.key === 'range') entity.props.range = value
            else if (property.key === 'health') entity.props.health = value
          }
        }
        const renderProperties = () => {
          properties.textContent = ''
          if (!isCampaignEntityKind(entity.kind)) return
          const definition = campaignEntityDefinition(entity.kind)
          if (definition.properties.length === 0) {
            const empty = document.createElement('small')
            empty.textContent = 'Este tipo não precisa de ajustes extras.'
            empty.style.color = 'var(--color-sz-fg-soft)'
            properties.appendChild(empty)
            return
          }
          for (const property of definition.properties) {
            const current = entity.props?.[property.key] ?? property.defaultValue
            if (property.type === 'boolean') {
              const control = input('checkbox', '')
              control.checked = current === true
              control.style.width = '30px'
              identifyControl(control, property.key, index)
              control.addEventListener('change', () => setProperty(property, control.checked))
              properties.appendChild(labelled(property.label, control))
              continue
            }
            if (property.type === 'select') {
              const control = select(
                property.options.map((option) => ({
                  value: String(option.value),
                  label: option.label,
                })),
                String(current),
              )
              identifyControl(control, property.key, index)
              control.addEventListener('change', () => {
                const option = property.options.find(
                  (candidate) => String(candidate.value) === control.value,
                )
                if (option) setProperty(property, option.value)
              })
              properties.appendChild(labelled(property.label, control))
              continue
            }
            const control = input('number', String(current), property.min, property.max)
            control.step = String(property.step)
            identifyControl(control, property.key, index)
            control.addEventListener('input', () =>
              setProperty(property, numberValue(control, property.defaultValue)),
            )
            properties.appendChild(labelled(property.label, control))
          }
        }
        kind.addEventListener('change', () => {
          if (!isCampaignEntityKind(kind.value)) return
          entity.kind = kind.value
          resetEntityPropsForKind(entity)
          renderProperties()
        })
        entityId.addEventListener('input', () => {
          entity.id = entityId.value
        })
        x.addEventListener('input', () => {
          entity.x = numberValue(x, entity.x)
        })
        y.addEventListener('input', () => {
          entity.y = numberValue(y, entity.y)
        })
        variant.addEventListener('input', () => {
          entity.variant = variant.value || undefined
        })
        remove.addEventListener('click', () => {
          stage.entities.splice(index, 1)
          renderEntities()
        })
        row.append(
          rowHeading,
          labelled('Tipo', kind),
          labelled('Identificador', entityId),
          labelled('Coluna', x),
          labelled('Linha', y),
          labelled('Variação', variant),
          labelled('Remover', remove),
          properties,
        )
        renderProperties()
        entityList.appendChild(row)
      })
    }
    const addEntity = button('+ Adicionar objeto')
    addEntity.addEventListener('click', () => {
      if (stage.entities.length >= CAMPAIGN_MAX_ENTITIES) return
      stage.entities.push({ kind: 'coin', id: `objeto-${stage.entities.length + 1}`, x: 1, y: 1 })
      renderEntities()
    })
    entitySection.body.append(entityList, addEntity)
    renderEntities()
    wrap.appendChild(entitySection.root)

    const triggerSection = section('4. Acontecimentos por região')
    const triggerList = document.createElement('div')
    const renderTriggers = () => {
      triggerList.textContent = ''
      triggerList.style.cssText = 'display:grid;gap:8px;'
      stage.triggers.forEach((trigger, index) => {
        const row = document.createElement('div')
        row.style.cssText =
          'display:grid;grid-template-columns:repeat(auto-fit,minmax(104px,1fr));align-items:end;gap:6px;padding:8px;border:1px solid var(--color-sz-border);border-radius:7px;'
        row.setAttribute('role', 'group')
        row.setAttribute('aria-label', `Acontecimento ${index + 1}`)
        const rowHeading = document.createElement('strong')
        rowHeading.textContent = `Acontecimento ${index + 1}`
        rowHeading.style.cssText =
          'grid-column:1/-1;color:var(--color-sz-fg);font:700 11px Inter,system-ui,sans-serif;'
        const kind = input('text', trigger.kind)
        kind.maxLength = 64
        const x = input('number', String(trigger.x))
        const y = input('number', String(trigger.y))
        const w = input('number', String(trigger.w), 0)
        const h = input('number', String(trigger.h), 0)
        const target = input('text', trigger.target ?? '')
        target.maxLength = 64
        const value = input('text', trigger.value === undefined ? '' : String(trigger.value))
        value.maxLength = 200
        const remove = button('×', 'Remover acontecimento')
        remove.setAttribute('aria-label', `Remover acontecimento ${index + 1}`)
        identifyControl(kind, 'kind', undefined, index)
        identifyControl(x, 'x', undefined, index)
        identifyControl(y, 'y', undefined, index)
        identifyControl(w, 'w', undefined, index)
        identifyControl(h, 'h', undefined, index)
        identifyControl(target, 'target', undefined, index)
        identifyControl(value, 'value', undefined, index)
        kind.addEventListener('input', () => {
          trigger.kind = kind.value
        })
        x.addEventListener('input', () => {
          trigger.x = numberValue(x, trigger.x)
        })
        y.addEventListener('input', () => {
          trigger.y = numberValue(y, trigger.y)
        })
        w.addEventListener('input', () => {
          trigger.w = Math.max(0, numberValue(w, trigger.w))
        })
        h.addEventListener('input', () => {
          trigger.h = Math.max(0, numberValue(h, trigger.h))
        })
        target.addEventListener('input', () => {
          trigger.target = target.value || undefined
        })
        value.addEventListener('input', () => {
          trigger.value = scalarValue(value.value)
        })
        remove.addEventListener('click', () => {
          stage.triggers.splice(index, 1)
          renderTriggers()
        })
        row.append(
          rowHeading,
          labelled('Nome', kind),
          labelled('Coluna', x),
          labelled('Linha', y),
          labelled('Largura', w),
          labelled('Altura', h),
          labelled('Destino', target),
          labelled('Valor', value),
          labelled('Remover', remove),
        )
        triggerList.appendChild(row)
      })
    }
    const addTrigger = button('+ Adicionar acontecimento')
    addTrigger.addEventListener('click', () => {
      if (stage.triggers.length >= CAMPAIGN_MAX_TRIGGERS) return
      stage.triggers.push({ kind: 'aviso', x: 1, y: 1, w: 1, h: 1 })
      renderTriggers()
    })
    triggerSection.body.append(triggerList, addTrigger)
    renderTriggers()
    wrap.appendChild(triggerSection.root)

    const footer = document.createElement('div')
    footer.style.cssText =
      'position:sticky;bottom:-12px;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:7px;padding:9px 0 1px;background:var(--color-sz-panel);'
    const cancel = button('Cancelar')
    const apply = button('Usar esta fase')
    const validationMessage = document.createElement('span')
    validationMessage.setAttribute('role', 'alert')
    validationMessage.setAttribute('aria-live', 'assertive')
    validationMessage.style.cssText =
      'margin-right:auto;align-self:center;color:var(--color-sz-danger,#ef4444);font:600 11px Inter,system-ui,sans-serif;'
    apply.style.background = 'var(--color-sz-accent)'
    apply.style.color = '#fff'
    cancel.addEventListener('click', () => Blockly.DropDownDiv.hideIfOwner(this))
    apply.addEventListener('click', () => {
      resizeTiles(
        stage,
        integerValue(width, stage.width, 1, CAMPAIGN_MAX_WIDTH),
        integerValue(height, stage.height, 1, CAMPAIGN_MAX_HEIGHT),
      )
      stage.id = id.value.trim() || 'fase-1'
      stage.world = integerValue(world, stage.world, 1, 128)
      stage.order = integerValue(order, stage.order, 1, 128)
      stage.theme = theme.value
      stage.nextStage = nextStage.value.trim() || undefined
      stage.secretStage = secretStage.value.trim() || undefined
      stage.timeLimit = integerValue(timeLimit, stage.timeLimit ?? 300, 0, 3600)
      const editorIssue = campaignStageEditorIssue(stage)
      if (editorIssue) {
        validationMessage.textContent = editorIssue.message
        const invalidControl = wrap.querySelector<HTMLElement>(editorIssue.selector)
        invalidControl?.focus()
        invalidControl?.scrollIntoView?.({ block: 'nearest' })
        return
      }
      const validatedStage = validateCampaignStage(stage)
      if (!validatedStage) {
        validationMessage.textContent =
          'Revise os nomes, as posições e os dados da fase antes de continuar.'
        return
      }
      withMutation(sourceBlock, () => setCampaignStageOnBlock(sourceBlock, validatedStage))
      this.setValue(campaignStageSummary(validatedStage))
      Blockly.DropDownDiv.hideIfOwner(this)
    })
    footer.append(validationMessage, cancel, apply)
    wrap.appendChild(footer)
    content.appendChild(wrap)
    Blockly.DropDownDiv.showPositionedByField(this, () => {})
  }
}

let registered = false

export function registerFieldCampaignStage(): void {
  if (registered) return
  Blockly.fieldRegistry.register('field_campaign_stage', FieldCampaignStage)
  registered = true
}
