import type { StudioTutorIntent } from '@sistemazero/core/studio/pro-tutor'
import { useId, useState } from 'react'
import { compatibleProGuides } from '../../core/proLearningGuides'
import type { ProjectTree } from '../../core/proProject'

export interface ProLearningRecipesProps {
  templateId?: string
  tree?: ProjectTree
  /** Fill a draft; the host owns sending, context capture and account/project epochs. */
  onAsk(question: string, intent: StudioTutorIntent): void
  /** Fill a builder draft; this component never creates or starts a job. */
  onBuild?(objective: string): void
}

const button =
  'rounded-lg border border-sz-border px-3 py-2 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-sz-accent'

/** Curated recipes are the same task guides used by tutor/builder; no generation or writes here. */
export function ProLearningRecipes({ templateId, tree, onAsk, onBuild }: ProLearningRecipesProps) {
  const [search, setSearch] = useState('')
  const searchId = useId()
  const available = compatibleProGuides(templateId, tree, search)
  return (
    <details className="rounded-xl border border-sz-border p-3 text-sm">
      <summary className="cursor-pointer font-semibold">Aprender com os recursos do kit</summary>
      <p className="my-2 text-xs text-sz-fg-mute">
        Você escolhe: entender, fazer à mão ou preparar uma alteração. As referências vêm do kit
        original; confira como estão no seu código.
      </p>
      <label className="mb-1 block text-xs" htmlFor={searchId}>
        Encontrar um recurso
      </label>
      <input
        id={searchId}
        type="search"
        value={search}
        maxLength={120}
        placeholder="Som, personagem, câmera…"
        onChange={(event) => setSearch(event.target.value)}
        className="w-full rounded-lg border border-sz-border bg-sz-bg p-2 text-sm"
      />
      {available.length === 0 && (
        <p role="status" className="mt-3 text-xs">
          Não encontrei uma receita compatível com esses arquivos e essa busca. Você pode selecionar
          seu código e pedir uma explicação normalmente.
        </p>
      )}
      <div className="mt-3 space-y-3">
        {available.map((guide) => {
          const recipe = guide.recipe
          if (!recipe) return null
          const locations = recipe.references
            .map((reference) => `${reference.path} (${reference.exportName})`)
            .join(', ')
          return (
            <article key={guide.id} aria-label={recipe.label} className="rounded-lg bg-sz-bg p-3">
              <h3 className="font-semibold">{recipe.label}</h3>
              <p className="mt-1 break-words text-xs text-sz-fg-mute">
                {recipe.references.map((reference) => reference.path).join(' · ')}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={button}
                  onClick={() =>
                    onAsk(
                      `Explique como ${recipe.label.toLowerCase()} funciona no meu código atual. Confira ${locations}. Separe o que já existe do que ainda precisaria ser implementado.`,
                      'explain',
                    )
                  }
                >
                  Entender
                </button>
                {onBuild && (
                  <button
                    type="button"
                    className={button}
                    onClick={() =>
                      onBuild(
                        `Quero ajustar ${recipe.label.toLowerCase()} neste projeto. Confira ${locations} e proponha uma mudança limitada a esse recurso, preservando minhas outras escolhas. Critérios: ${recipe.checks.join(' ')}`,
                      )
                    }
                  >
                    Preparar alteração
                  </button>
                )}
              </div>
              <details className="mt-3 text-xs">
                <summary className="cursor-pointer font-medium">Passo a passo manual</summary>
                <p className="mt-2">{recipe.preconditions.join(' ')}</p>
                <ol className="my-2 list-decimal space-y-1 pl-5">
                  {recipe.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <p>
                  <strong>Ao pausar e encerrar:</strong> {recipe.lifecycle}
                </p>
                <p className="mt-2">
                  <strong>Limites:</strong> {recipe.limits}
                </p>
                <p className="mt-2 font-medium">Confira no seu jogo</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {recipe.checks.map((check) => (
                    <li key={check}>{check}</li>
                  ))}
                </ul>
              </details>
            </article>
          )
        })}
      </div>
    </details>
  )
}
