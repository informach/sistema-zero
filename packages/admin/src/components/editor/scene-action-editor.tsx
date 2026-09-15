'use client'

import {
  isSceneAction,
  SCENE_LIMITS,
  SCENE_PORTS,
  SCRIPT_LIMITS,
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
  life: 'Vida na batida',
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
  // As duas cenas de 14/09/2026. O endereço vai com os números da Aula 1 (x 110, y 150) e a
  // frase da descrição é a canônica do roteiro — o professor edita as duas no próprio passo.
  { label: 'Levar o Dino a um endereço', value: { type: 'place', x: 110, y: 150 } },
  {
    label: 'Escrever a descrição',
    value: {
      type: 'describe',
      text: 'Corra com o dino e pule os cactos apertando espaço',
    },
  },
  { label: 'Ouvir a tela', value: { type: 'listen' } },
  { label: 'Mudar o tamanho da tela', value: { type: 'stage', width: 480, height: 270 } },
  { label: 'Mostrar a borda', value: { type: 'border', visible: true } },
  { label: 'Esconder a borda', value: { type: 'border', visible: false } },
  { label: 'Desenhar a cada quadro', value: { type: 'loop', on: true } },
  { label: 'Parar de desenhar', value: { type: 'loop', on: false } },
  { label: 'Ligar a limpeza', value: { type: 'erase', on: true } },
  { label: 'Desligar a limpeza', value: { type: 'erase', on: false } },
  { label: 'Mudar intervalo', value: { type: 'interval', seconds: 1 } },
  {
    label: 'Sortear posição',
    value: { type: 'sample', kind: 'position', unit: 0.5, guided: false },
  },
  {
    label: 'Sortear velocidade',
    value: { type: 'sample', kind: 'velocity', unit: 0.5, guided: false },
  },
  // As seis cenas do lote 4. Os valores de fábrica são os do roteiro de cada uma: o passo
  // grande do fantasma, a lupa que revela a borda, o pedaço 1 da folha.
  { label: 'Mostrar o quadro 1', value: { type: 'frame', index: 1 } },
  { label: 'Mostrar o quadro 2', value: { type: 'frame', index: 2 } },
  { label: 'Ligar a troca de quadros', value: { type: 'play', on: true } },
  { label: 'Parar a troca de quadros', value: { type: 'play', on: false } },
  { label: 'Mudar as trocas por segundo', value: { type: 'rate', perSecond: 4 } },
  { label: 'Ligar o fantasma', value: { type: 'onion', on: true } },
  { label: 'Desligar o fantasma', value: { type: 'onion', on: false } },
  { label: 'Mudar o passo do quadro 2', value: { type: 'shift', offset: 20 } },
  { label: 'Pintar uma coluna', value: { type: 'paint', column: 4 } },
  { label: 'Ligar o espelho', value: { type: 'mirror', on: true, line: 6 } },
  { label: 'Desligar o espelho', value: { type: 'mirror', on: false, line: 6 } },
  { label: 'Olhar a pedra de pixel', value: { type: 'inspect', kind: 'pixel', zoom: 6 } },
  { label: 'Olhar a pedra de vetor', value: { type: 'inspect', kind: 'vector', zoom: 6 } },
  { label: 'Recortar um pedaço da folha', value: { type: 'cut', cell: 1 } },
  { label: 'Mudar o tamanho no jogo', value: { type: 'sprite', size: 48 } },
]

/** A identidade da ação no `<select>`: o tipo mais o que o distingue dos irmãos. */
const identidade = (a: SceneAction) =>
  a.type === 'connect'
    ? `${a.type}:${a.port}:${a.enabled}`
    : a.type === 'border'
      ? `${a.type}:${a.visible}`
      : a.type === 'loop' || a.type === 'erase'
        ? `${a.type}:${a.on}`
        : a.type === 'layer'
          ? `${a.type}:${a.front}`
          : a.type === 'jump' || a.type === 'start'
            ? `${a.type}:${a.input}`
            : a.type === 'sample' || a.type === 'inspect'
              ? `${a.type}:${a.kind}`
              : a.type === 'play' || a.type === 'onion'
                ? `${a.type}:${a.on}`
                : a.type === 'frame'
                  ? `${a.type}:${a.index}`
                  : a.type === 'mirror'
                    ? `${a.type}:${a.on}`
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
  if (action.type === 'rate')
    return {
      label: 'Trocas por segundo',
      field: 'perSecond' as const,
      ...L.rate,
      value: action.perSecond,
    }
  if (action.type === 'shift')
    return {
      label: 'Passo do quadro 2',
      field: 'offset' as const,
      ...L.shift,
      value: action.offset,
    }
  if (action.type === 'paint')
    return { label: 'Coluna do traço', field: 'column' as const, ...L.column, value: action.column }
  if (action.type === 'cut')
    return { label: 'Pedaço da folha', field: 'cell' as const, ...L.cell, value: action.cell }
  if (action.type === 'sprite')
    return { label: 'Tamanho no jogo', field: 'size' as const, ...L.sprite, value: action.size }
  // ⚠️ O `place` tem DOIS números, e não é mais o único: `mirror` (interruptor + eixo) e
  // `inspect` (qual pedra + lupa) também misturam um número com outro campo. Quem monta o campo
  // numérico devolve um só, então esses três são tratados à parte no editor.
  return null
}

/** Os pares de números: o endereço do sprite e o tamanho da tela. */
function camposDoEndereco(action: SceneAction) {
  if (action.type === 'place')
    return [
      { label: 'x', field: 'x' as const, ...SCENE_LIMITS.placeX, value: action.x },
      { label: 'y', field: 'y' as const, ...SCENE_LIMITS.placeY, value: action.y },
    ]
  // ⚠️ O eixo do espelho e a lupa entram AQUI, e não no campo numérico solto, porque cada um
  // viaja junto de um interruptor (`on`, `kind`): separá-los deixaria a ação meio escolhida.
  if (action.type === 'mirror')
    return [
      {
        label: 'linha do eixo',
        field: 'line' as const,
        ...SCENE_LIMITS.mirrorLine,
        value: action.line,
      },
    ]
  if (action.type === 'inspect')
    return [{ label: 'lupa', field: 'zoom' as const, ...SCENE_LIMITS.zoom, value: action.zoom }]
  if (action.type === 'stage')
    return [
      {
        label: 'largura',
        field: 'width' as const,
        ...SCENE_LIMITS.stageWidth,
        value: action.width,
      },
      {
        label: 'altura',
        field: 'height' as const,
        ...SCENE_LIMITS.stageHeight,
        value: action.height,
      },
    ]
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
        const endereco = camposDoEndereco(action)
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
            {endereco && (
              <div className="grid grid-cols-2 gap-2">
                {endereco.map((campo) => (
                  <label key={campo.field} className="block space-y-1 text-xs">
                    {campo.label}
                    <Input
                      type="number"
                      min={campo.min}
                      max={campo.max}
                      step={1}
                      value={campo.value}
                      onChange={(e) =>
                        replace(index, {
                          ...action,
                          [campo.field]: Math.round(Number(e.target.value)),
                        } as SceneAction)
                      }
                    />
                  </label>
                ))}
              </div>
            )}
            {action.type === 'describe' && (
              <label className="block space-y-1 text-xs">
                Descrição que a etapa escreve
                <Input
                  maxLength={SCENE_LIMITS.describe.max}
                  value={action.text}
                  onChange={(e) => replace(index, { ...action, text: e.target.value })}
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
        disabled={value.length >= SCRIPT_LIMITS.actions}
        onClick={() => {
          if (choices[0]) onChange([...value, { ...choices[0].value }])
        }}
      >
        Adicionar ação
      </Button>
    </div>
  )
}
