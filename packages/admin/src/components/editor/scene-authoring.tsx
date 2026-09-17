'use client'

import {
  type DemonstrationActivity,
  isSceneScript,
  SCENE_MODELS,
  SCRIPT_LIMITS,
  type SceneStep,
  sceneScript,
  sceneShowsComparison,
} from '@sistemazero/core/learning/scene'
import { Button } from '@sistemazero/ui/button'
import { Select } from '@sistemazero/ui/select'
import { Textarea } from '@sistemazero/ui/textarea'
import { useId } from 'react'
import { SceneActionEditor, sceneActionChoices } from './scene-action-editor'

/**
 * O roteiro da demonstração: o que a cena faz sozinha, passo a passo, enquanto a criança olha.
 *
 * ⚠️ Não há mais caixa de JSON. Editar o roteiro à mão num `<textarea>` era o único jeito de
 * mexer em algumas coisas, e pedia do professor uma forma que ele não tem como conhecer — o
 * erro voltava como "JSON inválido", que não diz o que consertar.
 */
export function SceneAuthoring({
  activity,
  onChange,
}: {
  activity: DemonstrationActivity
  onChange: (activity: DemonstrationActivity) => void
}) {
  const id = useId()
  const script = sceneScript(activity)
  const modelo = SCENE_MODELS[activity.scene]
  // ⚠️⚠️ A lista ÚNICA do core, a mesma do player (full review de 16/09/2026): a daqui oferecia
  // "Comparação" em quatro cenas e o player só desenha na `hitbox`.
  const compara = sceneShowsComparison(activity.scene)
  const autoral = activity.script !== undefined
  const escrever = (steps: readonly SceneStep[]) => onChange({ ...activity, script: [...steps] })
  const trocar = (index: number, mudanca: Partial<SceneStep>) =>
    escrever(script.map((s, i) => (i === index ? { ...s, ...mudanca } : s)))

  return (
    <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">
          Roteiro da demonstração · {script.length} de {SCRIPT_LIMITS.steps} etapas
        </p>
        <p className="text-xs text-muted-foreground">
          {autoral ? 'Roteiro seu.' : 'Roteiro que vem com a cena. Editar cria o seu.'}
        </p>
      </div>

      {script.map((step, index) => (
        <div key={step.id} className="space-y-2 rounded-xl border border-border bg-background p-3">
          <label className="block text-xs font-medium" htmlFor={`${id}-step-${index}`}>
            Fala da etapa {index + 1}
          </label>
          <Textarea
            id={`${id}-step-${index}`}
            rows={2}
            maxLength={SCRIPT_LIMITS.caption}
            value={step.caption}
            onChange={(e) => trocar(index, { caption: e.target.value })}
          />
          <Select
            aria-label={`Destaque da etapa ${index + 1}`}
            value={step.highlight ?? 'scene'}
            onChange={(e) =>
              trocar(index, {
                highlight:
                  e.target.value === 'tools'
                    ? 'tools'
                    : e.target.value === 'compare'
                      ? 'compare'
                      : 'scene',
              })
            }
          >
            <option value="scene">Palco</option>
            <option value="tools">Controles</option>
            {(compara || step.highlight === 'compare') && (
              <option value="compare" disabled={!compara}>
                Comparação
              </option>
            )}
          </Select>
          {!compara && step.highlight === 'compare' && (
            <p role="alert" className="text-xs text-destructive">
              Esta cena não mostra comparação lado a lado. Escolha Palco ou Controles.
            </p>
          )}
          <details className="rounded-lg border border-border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              O que a cena faz nesta etapa · {step.actions.length}
            </summary>
            <div className="mt-3 space-y-3">
              <SceneActionEditor
                scene={activity.scene}
                value={step.actions}
                stepNumber={index + 1}
                onChange={(actions) => trocar(index, { actions })}
              />
              <label className="block space-y-1 text-xs">
                Descoberta a acompanhar antes de avançar
                <Select
                  value={step.waitFor ?? ''}
                  onChange={(e) => trocar(index, { waitFor: e.target.value || undefined })}
                >
                  <option value="">Concluir as ações desta etapa</option>
                  {modelo.goals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.label}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
          </details>
          <div className="flex flex-wrap gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={index === 0}
              onClick={() => {
                const next = [...script]
                ;[next[index - 1], next[index]] = [next[index]!, next[index - 1]!]
                escrever(next)
              }}
            >
              Subir etapa
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={index === script.length - 1}
              onClick={() => {
                const next = [...script]
                ;[next[index], next[index + 1]] = [next[index + 1]!, next[index]!]
                escrever(next)
              }}
            >
              Descer etapa
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={script.length <= 1}
              onClick={() => escrever(script.filter((_, i) => i !== index))}
            >
              Remover etapa
            </Button>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={script.length >= SCRIPT_LIMITS.steps}
          onClick={() => {
            const action = sceneActionChoices(activity.scene)[0]?.value
            if (!action) return
            escrever([
              ...script,
              {
                id: crypto.randomUUID(),
                caption: 'Observe o que acontece.',
                highlight: 'scene',
                actions: [{ ...action }],
              },
            ])
          }}
        >
          Adicionar etapa
        </Button>
        {autoral && (
          <Button variant="ghost" onClick={() => onChange({ ...activity, script: undefined })}>
            Voltar ao roteiro da cena
          </Button>
        )}
      </div>

      {/* ⚠️ COM o caso: o domínio valida o roteiro a partir de `openScene(setup)`, e um roteiro
          que só vale no mundo de fábrica deixaria o bloco inválido sem nada em vermelho aqui. */}
      {!isSceneScript(script, activity.scene, activity.setup) && (
        <p role="alert" className="text-sm text-destructive">
          Revise o roteiro: cada etapa precisa de fala e de ações que existam nesta cena. Uma
          descoberta exigida precisa acontecer até a última observação da etapa.
        </p>
      )}
    </div>
  )
}
