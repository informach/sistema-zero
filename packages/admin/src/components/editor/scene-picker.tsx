'use client'

import {
  SCENE_GROUPS,
  SCENE_IDS,
  SCENE_MODELS,
  type SceneGroup,
  type SceneId,
} from '@sistemazero/core/learning/scene'
import { useId } from 'react'

const GRUPOS: Record<SceneGroup, string> = {
  stage: 'A tela e quem a lê',
  art: 'Desenho e animação',
  world: 'Mundo e desenho',
  motion: 'Movimento',
  events: 'Eventos e estados',
  population: 'Objetos no grupo',
  collision: 'Áreas e contato',
  speed: 'Sorteio e velocidade',
}

/**
 * A escolha da cena, em cartões.
 *
 * ⚠️ Antes isto era um `<select>` com 14 nomes. Tudo que decide a escolha — o que a criança
 * pode MEXER e o que precisa acontecer para a cena fechar — só aparecia DEPOIS de escolher,
 * num resumo embaixo. O professor escolhia pelo título e descobria o resto na tentativa e erro.
 */
export function ScenePicker({
  value,
  onChange,
}: {
  value: SceneId
  onChange: (scene: SceneId) => void
}) {
  const name = useId()
  return (
    <div className="space-y-5">
      {SCENE_GROUPS.map((group) => {
        const cenas = SCENE_IDS.filter((id) => SCENE_MODELS[id].group === group)
        if (!cenas.length) return null
        return (
          <fieldset key={group} className="space-y-2">
            <legend className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {GRUPOS[group]}
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {cenas.map((id) => {
                const modelo = SCENE_MODELS[id]
                const escolhida = id === value
                return (
                  <label
                    key={id}
                    className={`flex cursor-pointer flex-col gap-2 rounded-xl border-2 p-4 ${
                      escolhida
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <span className="flex items-start gap-3">
                      <input
                        type="radio"
                        name={name}
                        value={id}
                        checked={escolhida}
                        onChange={() => onChange(id)}
                        className="mt-1 accent-primary"
                      />
                      <span className="font-semibold">{modelo.title}</span>
                    </span>
                    <span className="text-sm text-muted-foreground">
                      <strong className="font-medium text-foreground">Pode mexer em:</strong>{' '}
                      {modelo.manipulates}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      <strong className="font-medium text-foreground">Fecha quando:</strong>{' '}
                      {/* A missão de fábrica: as metas só de caso (`soNoCaso`) não entram. */}
                      {modelo.goals
                        .filter((g) => !g.soNoCaso)
                        .map((g) => g.label)
                        .join('; ')}
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        )
      })}
    </div>
  )
}
