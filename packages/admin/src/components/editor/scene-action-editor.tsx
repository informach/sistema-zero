'use client'

import {
  isSceneAction,
  SCENE_LIMITS,
  SCENE_PORTS,
  type SceneAction,
  type SceneId,
  type ScenePort,
} from '@sistemazero/core/learning/scene'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'

/** O nome de cada fio da bancada, na língua do professor. */
const PORTAS: Record<ScenePort, string> = {
  draw: 'Desenho',
  gravity: 'Gravidade',
  sound: 'Som do salto',
  timer: 'Intervalo de criação',
  cleanup: 'Limpeza dos cactos',
  condition: 'Condição do jogo',
  touch: 'Controle por toque',
  restart: 'Recomeço',
  limit: 'Limite de velocidade',
}

const TODAS: { label: string; value: SceneAction }[] = [
  { label: 'Criar o Dino', value: { type: 'create' } },
  ...SCENE_PORTS.flatMap((port) =>
    [true, false].map((enabled) => ({
      label: `${enabled ? 'Ligar' : 'Desligar'} ${PORTAS[port]}`,
      value: { type: 'connect' as const, port, enabled },
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

/** A identidade da ação no `<select>`: o tipo mais o que o distingue dos irmãos. */
const identidade = (a: SceneAction) =>
  a.type === 'connect'
    ? `${a.type}:${a.port}:${a.enabled}`
    : a.type === 'layer'
      ? `${a.type}:${a.front}`
      : a.type === 'jump' || a.type === 'start'
        ? `${a.type}:${a.input}`
        : a.type === 'sample'
          ? `${a.type}:${a.kind}`
          : a.type

/** As ações que ESTA cena aceita. A legalidade é do domínio, não de uma lista daqui. */
export function sceneActionChoices(scene: SceneId) {
  return TODAS.filter((a) => isSceneAction(a.value, scene))
}

/**
 * O número que acompanha algumas ações, com a faixa vinda do domínio.
 *
 * ⚠️ Os limites NÃO são reescritos aqui. Já houve três cópias desta regra (motor, editor e
 * DTO) e elas divergiram: o `interval` do servidor não tinha teto e o do editor ia de 0,5 a 2.
 * Um campo que aceita o que o servidor recusa é uma aula que não salva, sem dizer por quê.
 */
function campoNumerico(action: SceneAction) {
  const L = SCENE_LIMITS
  if (action.type === 'advance')
    return {
      label: 'Tempo em segundos',
      field: 'seconds' as const,
      ...L.scriptAdvance,
      value: action.seconds,
    }
  if (action.type === 'interval')
    return {
      label: 'Tempo em segundos',
      field: 'seconds' as const,
      ...L.interval,
      value: action.seconds,
    }
  if (action.type === 'impulse')
    return { label: 'Força do impulso', field: 'force' as const, ...L.impulse, value: action.force }
  if (action.type === 'move')
    return { label: 'Distância', field: 'distance' as const, ...L.move, value: action.distance }
  if (action.type === 'resize')
    return { label: 'Largura da área', field: 'width' as const, ...L.resize, value: action.width }
  if (action.type === 'sample')
    return {
      label: 'Posição no sorteio (0 a 1)',
      field: 'unit' as const,
      ...L.sample,
      value: action.unit,
    }
  return null
}

export function SceneActionEditor({
  scene,
  value,
  onChange,
  stepNumber,
}: {
  scene: SceneId
  value: readonly SceneAction[]
  onChange: (actions: SceneAction[]) => void
  stepNumber: number
}) {
  const choices = sceneActionChoices(scene)
  const replace = (index: number, action: SceneAction) =>
    onChange(value.map((a, i) => (i === index ? action : a)))
  return (
    <div className="space-y-3">
      {value.map((action, index) => {
        const numero = campoNumerico(action)
        return (
          // As ações têm identidade POSICIONAL no contrato do roteiro; todo campo é controlado.
          // biome-ignore lint/suspicious/noArrayIndexKey: o roteiro compartilhado não tem id de ação.
          <div key={index} className="space-y-2 rounded-lg bg-muted/40 p-3">
            <Select
              aria-label={`Ação ${index + 1} da etapa ${stepNumber}`}
              value={identidade(action)}
              onChange={(e) => {
                const next = choices.find((c) => identidade(c.value) === e.target.value)
                if (next) replace(index, { ...next.value })
              }}
            >
              {choices.map((choice) => (
                <option key={identidade(choice.value)} value={identidade(choice.value)}>
                  {choice.label}
                </option>
              ))}
              {!choices.some((c) => identidade(c.value) === identidade(action)) && (
                <option value={identidade(action)}>Ação incompatível · revisar</option>
              )}
            </Select>
            {numero && (
              <label className="block space-y-1 text-xs">
                {numero.label}
                <Input
                  type="number"
                  min={numero.min}
                  max={numero.max}
                  step="any"
                  value={numero.value}
                  onChange={(e) =>
                    replace(index, {
                      ...action,
                      [numero.field]: Number(e.target.value),
                    } as SceneAction)
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
