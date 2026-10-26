'use client'

import {
  EXECUTION_COMPARES,
  EXECUTION_COMPARES_WITHOUT_VALUE,
  EXECUTION_KEYS,
  EXECUTION_LIMITS,
  type ExecutionCompare,
  type ExecutionGameField,
  type ExecutionKey,
  type ExecutionStep,
  type ExecutionTarget,
  type SectionExecutionRule,
} from '@sistemazero/core/learning'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'
import { useState } from 'react'
import {
  COMPARE_LABELS,
  formatArgs,
  formatJson,
  keyLabel,
  parseArgs,
  parseExpected,
  parseExpectedValue,
} from '@/lib/execution-rule'

type Behavior = Extract<SectionExecutionRule, { type: 'behavior' }>
type FunctionReturns = Extract<SectionExecutionRule, { type: 'functionReturns' }>
export type PythonExecutionEditorEnvironment = {
  language: 'python'
  graphics: import('@sistemazero/core/learning').PythonProjectCheckGraphics
}

/**
 * O editor dos objetivos que RODAM o jogo (etapa 3, 18/10/2026): "O jogo faz algo" (passos +
 * o que conferir no fim) e "A função responde certo" (casos de entrada e resposta).
 */
export function ExecutionRuleEditor({
  rule,
  index,
  isPro,
  isKit,
  kitFields,
  environment,
  onChange,
}: {
  rule: SectionExecutionRule
  index: number
  isPro: boolean
  /** Projeto Pro de kit (tem fase, pontos e vida para conferir). */
  isKit: boolean
  /** O que o kit mostra no estado (a vida só existe em alguns). */
  kitFields?: readonly ExecutionGameField[]
  environment?: PythonExecutionEditorEnvironment
  onChange: (rule: SectionExecutionRule) => void
}) {
  if (rule.type === 'functionReturns')
    return (
      <FunctionEditor
        rule={rule}
        index={index}
        isPro={isPro}
        environment={environment}
        onChange={onChange}
      />
    )
  if (rule.type === 'behavior')
    return (
      <BehaviorEditor
        rule={rule}
        index={index}
        isPro={isPro}
        isKit={isKit}
        kitFields={kitFields}
        environment={environment}
        onChange={onChange}
      />
    )
  return null
}

export function StepsEditor({
  steps,
  index,
  singlePress = false,
  environment,
  onChange,
}: {
  steps: ExecutionStep[]
  index: number
  /** A posição relativa compara uma única tecla, com controle idle separado. */
  singlePress?: boolean
  environment?: PythonExecutionEditorEnvironment
  onChange: (steps: ExecutionStep[], removedAt?: number) => void
}) {
  const python = environment?.language === 'python'
  const graphics = !python || environment.graphics !== 'none'
  const patch = (at: number, step: ExecutionStep) =>
    onChange(steps.map((s, i) => (i === at ? step : s)))
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">O que o teste faz no jogo (em ordem)</legend>
      {steps.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Sem passos: o teste só abre o jogo e confere.
        </p>
      )}
      {steps.map((step, at) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: passo não tem id; os campos são controlados pela regra
        <div key={`${index}-${at}`} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="w-6 text-muted-foreground">{at + 1}.</span>
          <Select
            aria-label={`Passo ${at + 1} do objetivo ${index + 1}`}
            value={
              step.action === 'clickTarget'
                ? step.target.kind
                : step.action === 'press' && step.holdMs
                  ? 'hold'
                  : step.action
            }
            onChange={(e) => {
              const action = e.target.value
              if (
                (!graphics && action !== 'wait') ||
                (python &&
                  [
                    'sprite',
                    'outsideGroup',
                    'lastPoint',
                    'approachSprite',
                    'approachObject3d',
                  ].includes(action))
              )
                return
              if (singlePress && action !== 'press' && action !== 'hold') return
              if (action === 'approachSprite' || action === 'approachObject3d') {
                patch(at, {
                  action,
                  ...(action === 'approachObject3d'
                    ? { walkable: [{ minX: -10, maxX: 10, minZ: -10, maxZ: 10 }] }
                    : {}),
                  actorPath: '',
                  targetPath: '',
                  timeoutMs: 4500,
                })
                return
              }
              if (action === 'sprite') {
                patch(at, {
                  action: 'clickTarget',
                  target: { kind: 'sprite', path: '', groupPath: '' },
                })
                return
              }
              if (action === 'outsideGroup') {
                patch(at, { action: 'clickTarget', target: { kind: 'outsideGroup', path: '' } })
                return
              }
              if (action === 'lastPoint') {
                patch(at, { action: 'clickTarget', target: { kind: 'lastPoint' } })
                return
              }
              if (!['wait', 'click', 'hold', 'press'].includes(action)) return
              patch(
                at,
                action === 'wait'
                  ? { action: 'wait', ms: 500 }
                  : action === 'click'
                    ? { action: 'click', x: 100, y: 100 }
                    : action === 'hold'
                      ? {
                          action: 'press',
                          key: step.action === 'press' ? step.key : 'ArrowRight',
                          holdMs: 500,
                        }
                      : { action: 'press', key: step.action === 'press' ? step.key : 'Space' },
              )
            }}
          >
            <option value="press" disabled={!graphics}>
              Apertar uma tecla
            </option>
            <option value="hold" disabled={!graphics}>
              Segurar uma tecla
            </option>
            <option value="wait" disabled={singlePress}>
              Esperar
            </option>
            <option value="click" disabled={singlePress || !graphics}>
              Clicar na tela
            </option>
            {!python && (
              <>
                <option value="approachObject3d" disabled={singlePress}>
                  Levar um objeto 3D até outro no chão
                </option>
                <option value="approachSprite" disabled={singlePress}>
                  Levar um personagem até outro com as teclas
                </option>
              </>
            )}
            {!python && (
              <option value="sprite" disabled={singlePress}>
                Clicar no lugar de um personagem
              </option>
            )}
            {!python && (
              <option value="lastPoint" disabled={singlePress}>
                Repetir o último lugar clicado
              </option>
            )}
            {!python && (
              <option value="outsideGroup" disabled={singlePress}>
                Clicar fora de um grupo
              </option>
            )}
          </Select>
          {step.action === 'approachObject3d' && (
            <fieldset className="space-y-3 rounded-md border p-3">
              <legend>Retângulos do chão (x/z)</legend>
              {step.walkable?.map((r, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: retângulos não têm ID e os campos são controlados pela regra
                <div key={i} className="grid grid-cols-2 gap-2">
                  {(['minX', 'maxX', 'minZ', 'maxZ'] as const).map((k) => (
                    <Input
                      key={k}
                      type="number"
                      min={-100}
                      max={100}
                      step="any"
                      aria-label={`${k} do retângulo ${i + 1}`}
                      value={r[k]}
                      onChange={(e) =>
                        patch(at, {
                          ...step,
                          walkable: step.walkable!.map((v, j) =>
                            j === i ? { ...v, [k]: Number(e.target.value) } : v,
                          ),
                        })
                      }
                    />
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() =>
                      patch(at, { ...step, walkable: step.walkable!.filter((_, j) => j !== i) })
                    }
                  >
                    Retirar retângulo
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                type="button"
                disabled={(step.walkable?.length ?? 0) >= 8}
                onClick={() =>
                  patch(at, {
                    ...step,
                    walkable: [
                      ...(step.walkable ?? []),
                      { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
                    ],
                  })
                }
              >
                Adicionar retângulo
              </Button>
            </fieldset>
          )}
          {(step.action === 'approachSprite' || step.action === 'approachObject3d') && (
            <>
              <Input
                aria-label={`Personagem que anda no passo ${at + 1}`}
                className="w-36"
                placeholder="Personagem"
                maxLength={200}
                value={step.actorPath}
                onChange={(e) => patch(at, { ...step, actorPath: e.target.value })}
              />
              <Input
                aria-label={`Destino do passo ${at + 1}`}
                className="w-36"
                placeholder="Destino"
                maxLength={200}
                value={step.targetPath}
                onChange={(e) => patch(at, { ...step, targetPath: e.target.value })}
              />
              <Input
                aria-label={`Evitar no passo ${at + 1}`}
                className="w-52"
                placeholder="Evitar: chave, obstaculo"
                maxLength={804}
                value={(step.avoidPaths ?? []).join(', ')}
                onChange={(e) => {
                  const paths = e.target.value
                    .split(',')
                    .map((p) => p.trim())
                    .filter(Boolean)
                    .slice(0, 4)
                  patch(at, { ...step, avoidPaths: paths })
                }}
              />
              <Input
                type="number"
                aria-label={`Prazo do deslocamento no passo ${at + 1}`}
                className="w-24"
                min={100}
                max={EXECUTION_LIMITS.maxApproachMs}
                value={step.timeoutMs}
                onChange={(e) =>
                  patch(at, {
                    ...step,
                    timeoutMs: Math.max(
                      100,
                      Math.min(
                        EXECUTION_LIMITS.maxApproachMs,
                        Math.round(Number(e.target.value) || 100),
                      ),
                    ),
                  })
                }
              />
              <span>ms</span>
            </>
          )}
          {step.action === 'clickTarget' && step.target.kind === 'sprite' && (
            <>
              <Input
                aria-label={`Personagem do passo ${at + 1}`}
                className="w-36"
                maxLength={200}
                placeholder="Nome do personagem"
                value={step.target.path}
                onChange={(e) => {
                  if (step.target.kind === 'sprite')
                    patch(at, { ...step, target: { ...step.target, path: e.target.value } })
                }}
              />
              <Input
                aria-label={`Grupo do passo ${at + 1}`}
                className="w-36"
                maxLength={200}
                placeholder="Nome do grupo"
                value={step.target.groupPath}
                onChange={(e) => {
                  if (step.target.kind === 'sprite')
                    patch(at, { ...step, target: { ...step.target, groupPath: e.target.value } })
                }}
              />
            </>
          )}
          {step.action === 'clickTarget' && step.target.kind === 'outsideGroup' && (
            <Input
              aria-label={`Grupo do passo ${at + 1}`}
              className="w-36"
              maxLength={200}
              placeholder="Nome do grupo"
              value={step.target.path}
              onChange={(e) =>
                patch(at, { ...step, target: { kind: 'outsideGroup', path: e.target.value } })
              }
            />
          )}
          {step.action === 'press' && (
            <Select
              aria-label={`Tecla do passo ${at + 1}`}
              value={step.key}
              onChange={(e) => patch(at, { ...step, key: e.target.value as ExecutionKey })}
            >
              {EXECUTION_KEYS.map((key) => (
                <option key={key} value={key}>
                  {keyLabel(key)}
                </option>
              ))}
            </Select>
          )}
          {(step.action === 'wait' || (step.action === 'press' && step.holdMs)) && (
            <label className="flex items-center gap-1">
              <Input
                type="number"
                className="w-24"
                aria-label={`Milissegundos do passo ${at + 1}`}
                min={step.action === 'wait' ? 0 : 1}
                max={
                  step.action === 'wait' ? EXECUTION_LIMITS.maxWaitMs : EXECUTION_LIMITS.maxHoldMs
                }
                value={step.action === 'wait' ? step.ms : step.holdMs}
                onChange={(e) => {
                  const ms = Math.max(0, Math.round(Number(e.target.value) || 0))
                  patch(
                    at,
                    step.action === 'wait' ? { ...step, ms } : { ...step, holdMs: Math.max(1, ms) },
                  )
                }}
              />
              ms
            </label>
          )}
          {step.action === 'click' &&
            (['x', 'y'] as const).map((axis) => (
              <label key={axis} className="flex items-center gap-1">
                {axis}
                <Input
                  type="number"
                  className="w-20"
                  aria-label={`${axis} do clique no passo ${at + 1}`}
                  min={0}
                  max={EXECUTION_LIMITS.maxCoordinate}
                  value={step[axis]}
                  onChange={(e) =>
                    patch(at, { ...step, [axis]: Math.max(0, Number(e.target.value) || 0) })
                  }
                />
              </label>
            ))}
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Tirar o passo ${at + 1}`}
            disabled={singlePress && steps.length === 1}
            onClick={() =>
              onChange(
                steps.filter((_, i) => i !== at),
                at,
              )
            }
          >
            Tirar
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        disabled={steps.length >= (singlePress ? 1 : EXECUTION_LIMITS.maxSteps)}
        onClick={() =>
          onChange([
            ...steps,
            graphics ? { action: 'press', key: 'Space' } : { action: 'wait', ms: 500 },
          ])
        }
      >
        Adicionar passo
      </Button>
      <p className="text-xs text-muted-foreground">
        {singlePress
          ? 'Este teste usa uma tecla. A observação sem tecla acontece antes desse passo.'
          : python
            ? 'Passos em ordem. Cliques usam pixels da janela do programa; teclado e mouse exigem uma extensão gráfica.'
            : `Até ${EXECUTION_LIMITS.maxSteps} passos e ${EXECUTION_LIMITS.maxTotalWaitMs / 1000} s de espera somada. O clique na tela usa coordenadas na prévia (1024 por 640). O deslocamento usa as teclas e a geometria atual, com prazo limitado. Os cliques em personagens e grupos usam o palco atual do Jogo 2D clássico JavaScript; repetir exige um clique anterior em personagem ou fora do grupo, e mantém aquele lugar.`}
      </p>
    </fieldset>
  )
}

type BehaviorEditorProps = {
  rule: Behavior
  index: number
  isPro: boolean
  isKit: boolean
  kitFields?: readonly ExecutionGameField[]
  environment?: PythonExecutionEditorEnvironment
  onChange: (rule: Behavior) => void
}

function BehaviorEditor(props: BehaviorEditorProps) {
  const { rule, index, environment, onChange } = props
  const checkpoints = rule.checkpoints ?? []
  const setCheckpoints = (next: NonNullable<Behavior['checkpoints']>, steps = rule.steps) => {
    const { checkpoints: _previous, ...rest } = rule
    onChange({ ...rest, steps, ...(next.length ? { checkpoints: next } : {}) })
  }
  return (
    <div className="space-y-3">
      <StepsEditor
        steps={rule.steps}
        index={index}
        singlePress={rule.expect.target.kind === 'spritePosition'}
        environment={environment}
        onChange={(steps, removedAt) => {
          // A checkpoint belongs to the observed step. Removing it also removes that observation.
          const next =
            removedAt === undefined
              ? checkpoints
              : checkpoints
                  .filter((point) => point.afterStep !== removedAt + 1)
                  .map((point) => ({
                    ...point,
                    afterStep:
                      point.afterStep > removedAt + 1 ? point.afterStep - 1 : point.afterStep,
                  }))
          setCheckpoints(next, steps)
        }}
      />
      <ExpectationEditor {...props} />
      {environment?.language !== 'python' && rule.expect.target.kind !== 'spritePosition' && (
        <fieldset className="space-y-3 rounded-lg border border-border p-3">
          <legend className="font-medium">Verificações durante o teste</legend>
          <p className="text-xs text-muted-foreground">
            Todas precisam passar. Ao tirar um passo, sua verificação também é retirada; as
            seguintes acompanham a nova numeração.
          </p>
          {checkpoints.map((point, at) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: fields are controlled by the rule
            <div key={at} className="space-y-2 border-b border-border pb-3">
              <label className="block text-sm">
                Quando conferir
                <Select
                  aria-label={`Momento da verificação ${at + 1} do objetivo ${index + 1}`}
                  value={point.afterStep}
                  onChange={(e) =>
                    setCheckpoints(
                      checkpoints.map((p, i) =>
                        i === at ? { ...p, afterStep: Number(e.target.value) } : p,
                      ),
                    )
                  }
                >
                  <option value={0}>Antes dos passos</option>
                  {rule.steps.map((_, step) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: options represent step numbers, not stateful step components
                    <option key={step + 1} value={step + 1}>
                      Após o passo {step + 1}
                    </option>
                  ))}
                </Select>
              </label>
              <ExpectationEditor
                {...props}
                checkpointIndex={at}
                rule={{ ...rule, expect: point.expect }}
                onChange={(next) =>
                  setCheckpoints(
                    checkpoints.map((p, i) => (i === at ? { ...p, expect: next.expect } : p)),
                  )
                }
              />
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Tirar verificação ${at + 1}`}
                onClick={() => setCheckpoints(checkpoints.filter((_, i) => i !== at))}
              >
                Tirar verificação
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            disabled={checkpoints.length >= 8}
            onClick={() =>
              setCheckpoints([
                ...checkpoints,
                {
                  afterStep: rule.steps.length,
                  expect: { target: { kind: 'text' }, compare: 'equals', value: '' },
                },
              ])
            }
          >
            Adicionar verificação intermediária
          </Button>
        </fieldset>
      )}
    </div>
  )
}

function ExpectationEditor({
  rule,
  checkpointIndex,
  index,
  isPro,
  isKit,
  kitFields,
  environment,
  onChange,
}: {
  rule: Behavior
  checkpointIndex?: number
  index: number
  isPro: boolean
  isKit: boolean
  kitFields?: readonly ExecutionGameField[]
  environment?: PythonExecutionEditorEnvironment
  onChange: (rule: Behavior) => void
}) {
  const position =
    checkpointIndex === undefined
      ? String(index + 1)
      : `${index + 1}, verificação ${checkpointIndex + 1}`
  const allowMotion = checkpointIndex === undefined && !rule.checkpoints?.length
  const python = environment?.language === 'python'
  const kitHas = (field: ExecutionGameField) => isKit && (!kitFields || kitFields.includes(field))
  const { target, compare } = rule.expect
  const motion = target.kind === 'spritePosition'
  const actorPositions =
    !python ||
    environment.graphics === 'turtle' ||
    environment.graphics === 'pgzero' ||
    environment.graphics === 'pygame'
  const hasOnePress = rule.steps.length === 1 && rule.steps[0]?.action === 'press'
  const relative = (value: ExecutionCompare) => value === 'increased' || value === 'decreased'
  const comparisons = EXECUTION_COMPARES.filter((value) =>
    motion
      ? relative(value)
      : checkpointIndex !== undefined
        ? !relative(value)
        : (python && target.kind === 'value') || target.kind === 'moduleValue'
          ? true
          : !relative(value),
  )
  const comparisonFits = comparisons.includes(compare)
  const withTarget = (next: ExecutionTarget) => {
    if (next.kind === 'spritePosition') {
      if (!allowMotion || !hasOnePress || (isPro && !python) || !actorPositions) return
      const { value: _value, ...expect } = rule.expect
      onChange({
        ...rule,
        observation: rule.observation ?? { type: 'idleBeforeAction', idleMs: 80 },
        expect: { ...expect, target: next, compare: relative(compare) ? compare : 'increased' },
      })
      return
    }
    const { observation: _observation, ...rest } = rule
    onChange({
      ...rest,
      expect: {
        ...rule.expect,
        target: next,
        compare:
          relative(compare) && !(python && next.kind === 'value') && next.kind !== 'moduleValue'
            ? 'changed'
            : compare,
      },
    })
  }
  const needsValue = !EXECUTION_COMPARES_WITHOUT_VALUE.includes(compare)
  return (
    <div className="space-y-3">
      <fieldset className="space-y-2 text-sm">
        <legend className="font-medium">
          {checkpointIndex === undefined
            ? 'No fim, conferir'
            : `Verificação ${checkpointIndex + 1}`}
        </legend>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label={`O que conferir no objetivo ${position}`}
            value={target.kind === 'game' ? `game:${target.field}` : target.kind}
            onChange={(e) => {
              const value = e.target.value
              if (value === 'moduleValue') {
                if (isPro && !python)
                  withTarget({ kind: 'moduleValue', module: 'src/main.ts', path: '' })
                return
              }
              if (value === 'spritePosition') {
                withTarget({ kind: 'spritePosition', path: '', axis: 'x' })
                return
              }
              withTarget(
                value === 'value'
                  ? { kind: 'value', path: '' }
                  : value === 'text' || value === 'console'
                    ? { kind: value }
                    : { kind: 'game', field: value.slice(5) as ExecutionGameField },
              )
            }}
          >
            <option value="value" disabled={isPro && !python}>
              {python ? 'Uma variável do programa' : 'Uma variável do jogo'}
            </option>
            {!python && (
              <option value="moduleValue" disabled={!isPro}>
                Um valor exportado por arquivo (Pro)
              </option>
            )}
            <option
              value="spritePosition"
              disabled={!allowMotion || (isPro && !python) || !hasOnePress || !actorPositions}
            >
              A posição de um personagem após uma tecla
            </option>
            {!python && <option value="text">O texto da página</option>}
            <option value="console">O que o jogo escreveu no console</option>
            {!python && (
              <>
                <option value="game:phase" disabled={!kitHas('phase')}>
                  A fase do kit Pro (jogando, venceu, perdeu)
                </option>
                <option value="game:score" disabled={!kitHas('score')}>
                  Os pontos do kit Pro
                </option>
                <option value="game:goal" disabled={!kitHas('goal')}>
                  A meta do kit Pro (do src/config.ts)
                </option>
                <option value="game:health" disabled={!kitHas('health')}>
                  A vida do kit Pro
                </option>
              </>
            )}
          </Select>
          {target.kind === 'text' && (
            <label className="space-y-1">
              <span className="block text-xs">Seletor do texto (vazio: página inteira)</span>
              <Input
                aria-label={`Seletor do texto do objetivo ${position}`}
                value={target.selector ?? ''}
                maxLength={200}
                onChange={(e) =>
                  withTarget(
                    e.target.value.trim()
                      ? { kind: 'text', selector: e.target.value }
                      : { kind: 'text' },
                  )
                }
              />
            </label>
          )}
          {target.kind === 'value' && (
            <Input
              aria-label={`Variável do objetivo ${position}`}
              placeholder="pontos ou heroi.x"
              className="w-40"
              maxLength={200}
              value={target.path}
              onChange={(e) => withTarget({ kind: 'value', path: e.target.value.trim() })}
            />
          )}
          {target.kind === 'moduleValue' && (
            <>
              <Input
                aria-label={`Arquivo do valor do objetivo ${position}`}
                placeholder="src/main.ts"
                value={target.module}
                maxLength={200}
                className="w-44"
                onChange={(e) => withTarget({ ...target, module: e.target.value.trim() })}
              />
              <Input
                aria-label={`Valor exportado do objetivo ${position}`}
                placeholder="jogador.position.z"
                value={target.path}
                maxLength={200}
                className="w-48"
                onChange={(e) => withTarget({ ...target, path: e.target.value.trim() })}
              />
              <span className="text-xs text-muted-foreground">
                Exporte a variável no arquivo, por exemplo: export const jogador.
              </span>
            </>
          )}
          {target.kind === 'spritePosition' && (
            <>
              <Input
                aria-label={`Personagem do objetivo ${position}`}
                placeholder="Nome do personagem"
                className="w-40"
                maxLength={200}
                value={target.path}
                onChange={(e) => withTarget({ ...target, path: e.target.value })}
              />
              <Select
                aria-label={`Eixo do objetivo ${position}`}
                value={target.axis}
                onChange={(e) => {
                  const axis = e.target.value
                  if (axis === 'x' || axis === 'y') withTarget({ ...target, axis })
                }}
              >
                <option value="x">Horizontal (x)</option>
                <option value="y">Vertical (y)</option>
              </Select>
            </>
          )}
          <Select
            aria-label={`Comparação do objetivo ${position}`}
            value={compare}
            onChange={(e) => {
              const next = comparisons.find((option) => option === e.target.value)
              if (!next) return
              const { value: _value, ...expect } = rule.expect
              onChange({
                ...rule,
                expect: EXECUTION_COMPARES_WITHOUT_VALUE.includes(next)
                  ? { ...expect, compare: next }
                  : {
                      ...expect,
                      compare: next,
                      value:
                        rule.expect.value ??
                        (next === 'contains' || next === 'notContains' ? 'texto' : 0),
                    },
              })
            }}
          >
            {!comparisonFits && (
              <option value={compare} disabled>
                Comparação incompatível: {COMPARE_LABELS[compare]}
              </option>
            )}
            {comparisons.map((option) => (
              <option key={option} value={option}>
                {COMPARE_LABELS[option]}
              </option>
            ))}
          </Select>
          {needsValue && (
            <Input
              aria-label={`Valor esperado do objetivo ${position}`}
              className="w-32"
              maxLength={EXECUTION_LIMITS.maxTextChars}
              value={formatJson(rule.expect.value ?? '')}
              onChange={(e) =>
                onChange({
                  ...rule,
                  expect: { ...rule.expect, value: parseExpectedValue(e.target.value, compare) },
                })
              }
            />
          )}
        </div>
        {!comparisonFits && (
          <p role="alert">Escolha uma comparação compatível com o que será observado.</p>
        )}
        {python && (environment.graphics === 'raylib2d' || environment.graphics === 'raylib3d') && (
          <p className="text-xs text-muted-foreground">
            No Raylib, confira as variáveis que controlam o programa ou propriedades de vetores,
            como posicao.x, posicao.y ou posicao.z.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {motion
            ? `Antes da tecla, o teste observa por ${rule.observation?.idleMs ?? 80} ms se o personagem está parado. Depois confere se a coordenada aumentou ou diminuiu, sem exigir uma velocidade exata. ${environment?.graphics === 'turtle' ? 'No Turtle, y aumenta para cima.' : python ? 'No Pygame, y aumenta para baixo.' : 'No Jogo 2D, y aumenta para baixo.'}`
            : '"Mudou" compara com o começo do jogo, antes dos passos. A variável é o nome que a criança usa nos blocos ou no código (e uma propriedade dela, como heroi.x).'}
        </p>
      </fieldset>
    </div>
  )
}

function FunctionEditor({
  rule,
  index,
  isPro,
  environment,
  onChange,
}: {
  rule: FunctionReturns
  index: number
  isPro: boolean
  environment?: PythonExecutionEditorEnvironment
  onChange: (rule: FunctionReturns) => void
}) {
  const python = environment?.language === 'python'
  // O texto digitado fica aqui enquanto não vira um valor válido (a regra só guarda o válido).
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const field = (key: string, fallback: string) => drafts[key] ?? fallback
  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap gap-2">
        <label className="space-y-1">
          <span className="block">Nome da função</span>
          <Input
            aria-label={`Função do objetivo ${index + 1}`}
            placeholder={python ? 'calcular_pontos' : 'calcularPontos'}
            maxLength={100}
            value={rule.name}
            onChange={(e) => onChange({ ...rule, name: e.target.value.trim() })}
          />
        </label>
        {(isPro || python) && (
          <label className="space-y-1">
            <span className="block">
              {python ? 'Arquivo Python (opcional)' : 'Arquivo que exporta a função'}
            </span>
            <Input
              aria-label={`Arquivo da função do objetivo ${index + 1}`}
              placeholder={python ? 'regras.py — vazio usa o programa principal' : 'src/regras.ts'}
              maxLength={200}
              value={rule.module ?? ''}
              onChange={(e) => {
                const { module: _module, ...rest } = rule
                const value = e.target.value.trim()
                onChange(value ? { ...rest, module: value } : rest)
              }}
            />
          </label>
        )}
      </div>
      <fieldset className="space-y-2">
        <legend className="font-medium">Casos (a função precisa acertar todos)</legend>
        {rule.cases.map((item, at) => {
          const argsKey = `args-${at}`
          const expectedKey = `expected-${at}`
          const argsText = field(argsKey, formatArgs(item.args))
          const expectedText = field(expectedKey, JSON.stringify(item.expected))
          const argsBad = parseArgs(argsText) === null
          const expectedBad = parseExpected(expectedText) === undefined
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: caso não tem id; tirar um caso limpa os rascunhos
            <div key={`${index}-${at}`} className="flex flex-wrap items-end gap-2">
              <label className="space-y-1">
                <span className="block text-xs">Com estes valores</span>
                <Input
                  aria-label={`Valores do caso ${at + 1}`}
                  aria-invalid={argsBad}
                  placeholder="3, 4"
                  className="w-40"
                  value={argsText}
                  onChange={(e) => {
                    setDrafts((d) => ({ ...d, [argsKey]: e.target.value }))
                    const args = parseArgs(e.target.value)
                    if (args)
                      onChange({
                        ...rule,
                        cases: rule.cases.map((c, i) => (i === at ? { ...c, args } : c)),
                      })
                  }}
                />
              </label>
              <label className="space-y-1">
                <span className="block text-xs">responde</span>
                <Input
                  aria-label={`Resposta do caso ${at + 1}`}
                  aria-invalid={expectedBad}
                  placeholder="7"
                  className="w-40"
                  value={expectedText}
                  onChange={(e) => {
                    setDrafts((d) => ({ ...d, [expectedKey]: e.target.value }))
                    const expected = parseExpected(e.target.value)
                    if (expected !== undefined)
                      onChange({
                        ...rule,
                        cases: rule.cases.map((c, i) => (i === at ? { ...c, expected } : c)),
                      })
                  }}
                />
              </label>
              <Button
                variant="ghost"
                size="sm"
                disabled={rule.cases.length <= 1}
                aria-label={`Tirar o caso ${at + 1}`}
                onClick={() => {
                  setDrafts({})
                  onChange({ ...rule, cases: rule.cases.filter((_, i) => i !== at) })
                }}
              >
                Tirar
              </Button>
              {(argsBad || expectedBad) && (
                <p role="alert" className="w-full text-xs text-destructive">
                  {python
                    ? 'Use JSON nos casos de teste: números (3), textos entre aspas ("oi"), listas ([1, 2]), true, false ou null. No programa Python, os equivalentes são True, False e None.'
                    : 'Escreva os valores como no código: números (3), textos entre aspas ("oi"), listas ([1, 2]) ou verdadeiro/falso (true, false).'}
                </p>
              )}
            </div>
          )
        })}
        <Button
          variant="outline"
          size="sm"
          disabled={rule.cases.length >= EXECUTION_LIMITS.maxCases}
          onClick={() => onChange({ ...rule, cases: [...rule.cases, { args: [], expected: 0 }] })}
        >
          Adicionar caso
        </Button>
      </fieldset>
    </div>
  )
}
