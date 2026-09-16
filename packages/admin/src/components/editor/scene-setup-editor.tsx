'use client'

import {
  isSceneSetup,
  type SceneAction,
  type SceneActivity,
  type SceneSetup,
  SETUP_LIMITS,
  sceneDefaultGoalIds,
  sceneModel,
} from '@sistemazero/core/learning/scene'
import { useId } from 'react'
import { saltoParadoNoCaso } from '../../lib/scene-authoring-rules'
import { SceneActionEditor } from './scene-action-editor'

/**
 * O CASO desta atividade: de onde a cena parte e o que ela cobra.
 *
 * ⚠️⚠️ É o campo que faz uma cena render mais de um uso. Sem ele, cada modelo tinha uma missão
 * só — as metas eram as do catálogo, iguais para todo mundo — e a biblioteca inteira rendia um
 * uso por cena. O elenco trocou QUEM está no palco; isto troca DE ONDE ele parte e O QUE conta
 * como descoberta, que é como uma mesma mecânica serve dezenas de exercícios no Brilliant.
 *
 * ⚠️ As ações do caso são as MESMAS do motor, pela mesma régua (`isSceneAction`) e pelo mesmo
 * editor do roteiro. Não há um segundo vocabulário de "condição inicial" para manter em dia.
 */
export function SceneSetupEditor({
  activity,
  onChange,
}: {
  activity: SceneActivity
  onChange: (activity: SceneActivity) => void
}) {
  const id = useId()
  const modelo = sceneModel(activity.scene)
  const setup = activity.setup
  const alvo = activity.type === 'experimentation' ? (setup?.goals ?? []) : []

  /** Grava o caso, e o REMOVE quando ele fica vazio — caso vazio não é caso. */
  function aplicar(proximo: SceneSetup) {
    const limpo: SceneSetup = {
      ...(proximo.actions?.length ? { actions: proximo.actions } : {}),
      ...(proximo.goals?.length ? { goals: proximo.goals } : {}),
    }
    const { setup: _, ...resto } = activity
    if (!limpo.actions && !limpo.goals) {
      onChange(resto as SceneActivity)
      return
    }
    onChange({ ...activity, setup: limpo } as SceneActivity)
  }

  const invalido =
    setup !== undefined &&
    !isSceneSetup(setup, activity.scene, { goals: activity.type === 'experimentation' })

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Por onde a cena começa</p>
        <p className="text-xs text-muted-foreground">
          As ações acontecem antes de a criança entrar. Ela chega com o mundo já assim, e sem
          nenhuma descoberta feita.
        </p>
        <SceneActionEditor
          scene={activity.scene}
          value={setup?.actions ?? []}
          stepNumber={0}
          // ⚠️ A régua do CASO, não a do roteiro: pode ficar vazio (e aí o caso some), o teto é
          // o do `SETUP_LIMITS`, e `Restaurar a cena` não entra na lista.
          minimo={0}
          maximo={SETUP_LIMITS.actions}
          semReset
          onChange={(actions: SceneAction[]) => aplicar({ ...setup, actions })}
        />
        {saltoParadoNoCaso(activity.scene, setup?.actions) && (
          <p className="text-xs text-amber-700" role="status">
            Um salto no caso só aparece com o relógio depois dele. Acrescente Avançar o relógio, ou
            tire o salto.
          </p>
        )}
      </div>

      {activity.type === 'experimentation' && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">O que esta atividade cobra</legend>
          <p className="text-xs text-muted-foreground">
            Sem nenhuma marcada, a atividade cobra as {sceneDefaultGoalIds(activity.scene).length}{' '}
            descobertas do modelo. Marcando, ela fecha só com as escolhidas — é assim que a mesma
            cena vira duas missões.
          </p>
          {modelo.goals.map((meta) => (
            <label
              key={meta.id}
              htmlFor={`${id}-${meta.id}`}
              className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"
            >
              <input
                id={`${id}-${meta.id}`}
                type="checkbox"
                checked={alvo.includes(meta.id)}
                onChange={(event) =>
                  aplicar({
                    ...setup,
                    goals: event.target.checked
                      ? [...alvo, meta.id]
                      : alvo.filter((g) => g !== meta.id),
                  })
                }
              />
              {meta.label}
              {meta.soNoCaso && (
                <span className="text-xs text-muted-foreground">
                  (só vale marcada: fica fora da missão sem caso)
                </span>
              )}
            </label>
          ))}
        </fieldset>
      )}

      {invalido && (
        <p className="text-sm text-destructive">
          Este caso não vale para a cena escolhida. Refaça as ações ou desmarque as descobertas.
        </p>
      )}
    </div>
  )
}
