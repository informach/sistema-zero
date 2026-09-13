'use client'

import {
  type ExplorationAction,
  type ExplorationMission,
  isExplorationAction,
} from '@sistemazero/core/learning'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'

const ports = {
  draw: 'Desenho',
  gravity: 'Gravidade',
  sound: 'Som do salto',
  timer: 'Intervalo de criação',
  cleanup: 'Limpeza dos cactos',
  condition: 'Condição do jogo',
  touch: 'Controle por toque',
  restart: 'Recomeço',
  limit: 'Limite de velocidade',
} as const
const actions: { label: string; value: ExplorationAction }[] = [
  { label: 'Criar o Dino', value: { type: 'create' } },
  ...Object.entries(ports).flatMap(([port, label]) =>
    [true, false].map((enabled) => ({
      label: `${enabled ? 'Ligar' : 'Desligar'} ${label}`,
      value: { type: 'connect' as const, port: port as keyof typeof ports, enabled },
    })),
  ),
  { label: 'Dino na frente', value: { type: 'layer', front: true } },
  { label: 'Floresta na frente', value: { type: 'layer', front: false } },
  { label: 'Pular por toque', value: { type: 'jump', input: 'tap' } },
  { label: 'Pular por tecla', value: { type: 'jump', input: 'key' } },
  { label: 'Mudar impulso', value: { type: 'impulse', force: 9 } },
  { label: 'Observar a cena', value: { type: 'advance', seconds: 1 } },
  { label: 'Mover o obstáculo', value: { type: 'move', distance: 60 } },
  { label: 'Mudar área de colisão', value: { type: 'resize', width: 60 } },
  { label: 'Iniciar por toque', value: { type: 'start', input: 'tap' } },
  { label: 'Iniciar por tecla', value: { type: 'start', input: 'key' } },
  { label: 'Provocar colisão', value: { type: 'collide' } },
  { label: 'Voltar à tela inicial', value: { type: 'home' } },
  { label: 'Recomeçar o jogo', value: { type: 'restart' } },
  { label: 'Avançar o relógio', value: { type: 'clock' } },
  { label: 'Restaurar a cena', value: { type: 'reset' } },
  { label: 'Mudar intervalo', value: { type: 'interval', seconds: 1 } },
  {
    label: 'Sortear posição',
    value: { type: 'sample', kind: 'position', unit: 0.5, guided: false },
  },
  {
    label: 'Sortear velocidade',
    value: { type: 'sample', kind: 'velocity', unit: 0.5, guided: false },
  },
]
const identity = (a: ExplorationAction) =>
  a.type === 'connect'
    ? `${a.type}:${a.port}:${a.enabled}`
    : a.type === 'layer'
      ? `${a.type}:${a.front}`
      : a.type === 'jump' || a.type === 'start'
        ? `${a.type}:${a.input}`
        : a.type === 'sample'
          ? `${a.type}:${a.kind}`
          : a.type
export function demonstrationActionChoices(mission: ExplorationMission) {
  return actions.filter((a) => isExplorationAction(a.value, mission))
}

export function ExperienceActionEditor({
  mission,
  value,
  onChange,
  stepNumber,
}: {
  mission: ExplorationMission
  value: ExplorationAction[]
  onChange: (actions: ExplorationAction[]) => void
  stepNumber: number
}) {
  const choices = demonstrationActionChoices(mission)
  const replace = (index: number, action: ExplorationAction) =>
    onChange(value.map((a, i) => (i === index ? action : a)))
  return (
    <div className="space-y-3">
      {value.map((action, index) => {
        const number =
          action.type === 'advance' || action.type === 'interval'
            ? {
                label: 'Tempo em segundos',
                field: 'seconds',
                min: action.type === 'advance' ? 0.001 : 0.5,
                max: action.type === 'advance' ? 10 : 2,
                value: action.seconds,
              }
            : action.type === 'impulse'
              ? { label: 'Força do impulso', field: 'force', min: 5, max: 14, value: action.force }
              : action.type === 'move'
                ? {
                    label: 'Distância',
                    field: 'distance',
                    min: 20,
                    max: 260,
                    value: action.distance,
                  }
                : action.type === 'resize'
                  ? {
                      label: 'Largura da área',
                      field: 'width',
                      min: 24,
                      max: 120,
                      value: action.width,
                    }
                  : action.type === 'sample'
                    ? {
                        label: 'Posição no sorteio (0 a 1)',
                        field: 'unit',
                        min: 0,
                        max: 1,
                        value: action.unit,
                      }
                    : null
        return (
          // Actions have positional identity in the wire contract; every input is controlled.
          // biome-ignore lint/suspicious/noArrayIndexKey: No action IDs exist in the shared script contract.
          <div key={index} className="space-y-2 rounded-lg bg-muted/40 p-3">
            <Select
              aria-label={`Ação ${index + 1} da etapa ${stepNumber}`}
              value={identity(action)}
              onChange={(e) => {
                const next = choices.find((c) => identity(c.value) === e.target.value)
                if (next) replace(index, { ...next.value })
              }}
            >
              {choices.map((choice) => (
                <option key={identity(choice.value)} value={identity(choice.value)}>
                  {choice.label}
                </option>
              ))}
              {!choices.some((c) => identity(c.value) === identity(action)) && (
                <option value={identity(action)}>Ação incompatível · revisar</option>
              )}
            </Select>
            {number && (
              <label className="block space-y-1 text-xs">
                {number.label}
                <Input
                  type="number"
                  min={number.min}
                  max={number.max}
                  step="any"
                  value={number.value}
                  onChange={(e) =>
                    replace(index, {
                      ...action,
                      [number.field]: Number(e.target.value),
                    } as ExplorationAction)
                  }
                />
              </label>
            )}
            {action.type === 'sample' && (
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={action.guided}
                  onChange={(e) => replace(index, { ...action, guided: e.target.checked })}
                />
                Sorteio guiado
              </label>
            )}
            <div className="flex flex-wrap gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={index === 0}
                onClick={() => {
                  const next = [...value]
                  ;[next[index - 1], next[index]] = [next[index]!, next[index - 1]!]
                  onChange(next)
                }}
              >
                Subir ação
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={index === value.length - 1}
                onClick={() => {
                  const next = [...value]
                  ;[next[index], next[index + 1]] = [next[index + 1]!, next[index]!]
                  onChange(next)
                }}
              >
                Descer ação
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={value.length <= 1}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                Remover ação
              </Button>
            </div>
          </div>
        )
      })}
      <Button
        variant="outline"
        size="sm"
        disabled={value.length >= 16}
        onClick={() => {
          if (choices[0]) onChange([...value, { ...choices[0].value }])
        }}
      >
        Adicionar ação
      </Button>
    </div>
  )
}
