export type CampaignEntityPropertyKey = 'speed' | 'direction' | 'range' | 'health' | 'requiresBoss'

interface CampaignEntityPropertyBase {
  key: CampaignEntityPropertyKey
  label: string
}

export interface CampaignEntityNumberProperty extends CampaignEntityPropertyBase {
  type: 'number'
  defaultValue: number
  min: number
  max: number
  step: number
}

export interface CampaignEntityBooleanProperty extends CampaignEntityPropertyBase {
  type: 'boolean'
  defaultValue: boolean
}

export interface CampaignEntitySelectProperty extends CampaignEntityPropertyBase {
  type: 'select'
  defaultValue: string | number
  options: ReadonlyArray<{ value: string | number; label: string }>
}

export type CampaignEntityProperty =
  | CampaignEntityNumberProperty
  | CampaignEntityBooleanProperty
  | CampaignEntitySelectProperty

export const CAMPAIGN_ENTITY_KINDS = GAME_KIT_CAMPAIGN_ENTITY_KINDS

export type CampaignEntityKind = GameKitCampaignEntityKind

export interface CampaignEntityDefinition {
  label: string
  properties: readonly CampaignEntityProperty[]
}

const direction: CampaignEntitySelectProperty = {
  key: 'direction',
  label: 'Direção inicial',
  type: 'select',
  defaultValue: -1,
  options: [
    { value: -1, label: 'Esquerda' },
    { value: 1, label: 'Direita' },
  ],
}

function speed(defaultValue: number, min: number): CampaignEntityNumberProperty {
  return {
    key: 'speed',
    label: 'Velocidade',
    type: 'number',
    defaultValue,
    min,
    max: 1000,
    step: min < 1 ? 0.1 : 1,
  }
}

function range(defaultValue: number): CampaignEntityNumberProperty {
  return {
    key: 'range',
    label: 'Alcance',
    type: 'number',
    defaultValue,
    min: 16,
    max: 8192,
    step: 1,
  }
}

export const CAMPAIGN_ENTITY_CATALOG: Readonly<
  Record<CampaignEntityKind, CampaignEntityDefinition>
> = {
  hero: { label: 'Herói', properties: [] },
  coin: { label: 'Moeda', properties: [] },
  gem: { label: 'Gema', properties: [] },
  walker: { label: 'Inimigo terrestre', properties: [speed(30, 18), direction] },
  flyer: { label: 'Inimigo voador', properties: [speed(2, 1), range(48)] },
  spiky: { label: 'Inimigo com espinhos', properties: [speed(30, 18), direction] },
  shell: { label: 'Casco', properties: [speed(30, 18), direction] },
  movingPlatform: { label: 'Plataforma móvel', properties: [speed(1, 0.2), range(64)] },
  checkpoint: { label: 'Ponto de retorno', properties: [] },
  exit: {
    label: 'Saída',
    properties: [
      {
        key: 'requiresBoss',
        label: 'Exigir guardião derrotado',
        type: 'boolean',
        defaultValue: false,
      },
    ],
  },
  secretExit: { label: 'Saída secreta', properties: [] },
  boss: {
    label: 'Guardião',
    properties: [
      { key: 'health', label: 'Vida', type: 'number', defaultValue: 6, min: 3, max: 999, step: 1 },
      speed(1, 0.2),
      range(30),
    ],
  },
  powerup: { label: 'Poder', properties: [] },
  portal: { label: 'Portal', properties: [] },
  sign: { label: 'Placa', properties: [] },
}

const entityKindSet = new Set<string>(CAMPAIGN_ENTITY_KINDS)

export function isCampaignEntityKind(value: unknown): value is CampaignEntityKind {
  return typeof value === 'string' && entityKindSet.has(value)
}

export function campaignEntityDefinition(kind: CampaignEntityKind): CampaignEntityDefinition {
  return CAMPAIGN_ENTITY_CATALOG[kind]
}

export interface CampaignEntityPropsIssue {
  key: CampaignEntityPropertyKey
  message: string
}

export function campaignEntityPropsIssue(
  kind: CampaignEntityKind,
  props: Readonly<object>,
): CampaignEntityPropsIssue | null {
  const values = props as Readonly<Record<string, unknown>>
  for (const property of campaignEntityDefinition(kind).properties) {
    const value = values[property.key]
    if (value === undefined) continue
    if (property.type === 'boolean') {
      if (typeof value !== 'boolean') {
        return { key: property.key, message: `${property.label} deve ser verdadeiro ou falso.` }
      }
      continue
    }
    if (property.type === 'select') {
      if (!property.options.some((option) => Object.is(option.value, value))) {
        return { key: property.key, message: `${property.label} tem uma opção inválida.` }
      }
      continue
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return { key: property.key, message: `${property.label} deve ser um número.` }
    }
    if (value < property.min) {
      return {
        key: property.key,
        message: `${property.label} deve ser no mínimo ${property.min}.`,
      }
    }
    if (value > property.max) {
      return {
        key: property.key,
        message: `${property.label} deve ser no máximo ${property.max}.`,
      }
    }
  }
  return null
}

/** Catálogo serializado que mantém a validação do runtime alinhada ao editor e ao schema. */
export const CAMPAIGN_ENTITY_RUNTIME_CATALOG_JSON = JSON.stringify(CAMPAIGN_ENTITY_CATALOG)

import { GAME_KIT_CAMPAIGN_ENTITY_KINDS, type GameKitCampaignEntityKind } from './runtimeContract'
