'use client'

import {
  BLOCK_LEVEL_OPTIONS,
  CORE_CATEGORY_OPTIONS,
  normalizeBlockLevel,
} from '@sistemazero/studio'
import { Button } from '@sistemazero/ui/button'
import { useId } from 'react'
import { StudioBlocksPicker } from '@/components/studio/studio-blocks-picker'
import { StudioConfigClipboard } from '@/components/studio/studio-config-clipboard'
import {
  clipboardToCuration,
  curationToClipboard,
  defaultLiveStudio,
  LIVE_STUDIO_MODES,
  type LiveStudioCuration,
  toggleStudioMode,
} from '@/lib/live-studio-curation'

/**
 * A curadoria do Estúdio de UM encontro (`plan.studio`): a mesma configuração do bloco Estúdio
 * das aulas gravadas (nível, modos, revelar o avançado, categorias e lista de blocos), com a
 * mesma área de transferência. Sem curadoria (`null`), a sala abre o Estúdio completo.
 */
export function LiveStudioEditor({
  value,
  onChange,
}: {
  value: LiveStudioCuration | null | undefined
  onChange(next: LiveStudioCuration): void
}) {
  const id = useId()
  if (!value)
    return (
      <div className="space-y-2 rounded-lg border border-dashed p-4">
        <p className="text-sm font-medium">Estúdio deste encontro</p>
        <p className="text-sm text-muted-foreground">
          Este encontro abre o Estúdio sem curadoria: todos os modos e blocos. Configure para a
          criança ver só o que a oficina usa.
        </p>
        <Button type="button" variant="outline" onClick={() => onChange(defaultLiveStudio())}>
          Configurar o Estúdio
        </Button>
      </div>
    )
  const modes = value.allowedModes?.length ? value.allowedModes : ['blocks' as const]
  const categories = value.allowCategories ?? []
  const set = (patch: Partial<LiveStudioCuration>) => onChange({ ...value, ...patch })
  return (
    <fieldset className="space-y-4 rounded-lg border p-4">
      <legend className="px-2 text-sm font-medium">Estúdio deste encontro</legend>
      <StudioConfigClipboard
        current={{
          ...curationToClipboard(value),
          level: normalizeBlockLevel(value.level) ?? 'iniciante-2d',
        }}
        onPaste={(snapshot) => onChange(clipboardToCuration(snapshot))}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-level`} className="text-sm font-medium">
            Nível
          </label>
          <select
            id={`${id}-level`}
            className="min-h-10 rounded-lg border bg-background p-2 text-sm"
            value={value.level ?? ''}
            onChange={(event) => set({ level: event.target.value || undefined })}
          >
            <option value="">Sem limite de nível</option>
            {BLOCK_LEVEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
            Cura a paleta por dificuldade quando a lista de blocos está vazia.
          </span>
        </div>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm font-medium">Modos da criança</legend>
          <div className="flex flex-wrap gap-3 pt-1">
            {LIVE_STUDIO_MODES.map((mode) => {
              const checked = modes.includes(mode.value)
              return (
                <label key={mode.value} className="flex min-h-10 items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={checked}
                    disabled={checked && modes.length === 1}
                    onChange={(event) =>
                      set({
                        allowedModes: toggleStudioMode(modes, mode.value, event.target.checked),
                      })
                    }
                  />
                  {mode.label}
                </label>
              )
            })}
          </div>
          <span className="text-xs text-muted-foreground">
            Pelo menos um modo fica ligado. Ponte e Código mostram o código do projeto.
          </span>
        </fieldset>
      </div>
      <label className="flex min-h-10 items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={value.allowLevelReveal === true}
          onChange={(event) => set({ allowLevelReveal: event.target.checked })}
        />
        Aluno pode revelar blocos avançados
      </label>
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">Bloquinhos sempre visíveis (opcional)</legend>
        <div className="flex flex-wrap gap-3">
          {CORE_CATEGORY_OPTIONS.map((category) => (
            <label key={category.value} className="flex min-h-10 items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={categories.includes(category.value)}
                onChange={(event) =>
                  set({
                    allowCategories: event.target.checked
                      ? [...categories, category.value]
                      : categories.filter((item) => item !== category.value),
                  })
                }
              />
              {category.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Blocos visíveis para a criança</p>
        <p className="text-xs text-muted-foreground">
          Vazio, vale a paleta do nível. Preenchido, a criança vê só estes blocos.
        </p>
        <StudioBlocksPicker
          value={value.allowBlocks ?? []}
          onChange={(allowBlocks) => set({ allowBlocks })}
        />
      </div>
    </fieldset>
  )
}
