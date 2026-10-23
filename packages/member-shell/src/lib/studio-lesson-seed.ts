import {
  type StudioProjectContinuityIssue,
  studioProjectContinuityIssue,
} from '@sistemazero/core/studio/project-continuity'
import type { EditableStudioProject } from '@sistemazero/studio'

interface StudioLessonSources {
  local: () => Promise<EditableStudioProject | null>
  submitted?: () => Promise<EditableStudioProject | null>
  carryover?: () => Promise<EditableStudioProject | null>
  initial: EditableStudioProject
}

export class StudioLessonSeedCompatibilityError extends Error {
  constructor(
    readonly source: 'local' | 'submitted' | 'carryover' | 'cloud',
    readonly issue: StudioProjectContinuityIssue,
    /** Retained only for explicit recovery; never interpreted as an authoring/access grant. */
    readonly savedProject?: unknown,
  ) {
    super(
      'O projeto salvo usa um ambiente diferente do projeto inicial. Seu projeto foi preservado; peça à equipe para conferir a configuração do projeto inicial.',
    )
    this.name = 'StudioLessonSeedCompatibilityError'
  }
}

export function assertStudioLessonSeedCompatibility(
  saved: unknown,
  initial: unknown,
  source: StudioLessonSeedCompatibilityError['source'],
): void {
  const issue = studioProjectContinuityIssue(saved, initial)
  if (issue) throw new StudioLessonSeedCompatibilityError(source, issue, saved)
}

export class StudioLessonMaterialError extends Error {
  constructor(cause: unknown) {
    super(
      'Não foi possível acrescentar os novos materiais ao projeto salvo. Seu projeto foi preservado; peça à equipe para conferir os novos arquivos.',
      { cause },
    )
    this.name = 'StudioLessonMaterialError'
  }
}

/** Only an absent source permits moving to the next saved version. */
export async function resolveStudioLessonSeed(
  sources: StudioLessonSources,
): Promise<EditableStudioProject> {
  function saved(project: EditableStudioProject, source: 'local' | 'submitted' | 'carryover') {
    assertStudioLessonSeedCompatibility(project, sources.initial, source)
    return completeLibraryAssets(project, sources.initial)
  }
  const local = await sources.local()
  if (local) return saved(local, 'local')
  const submitted = await sources.submitted?.()
  if (submitted) return saved(submitted, 'submitted')
  const carryover = await sources.carryover?.()
  return carryover ? saved(carryover, 'carryover') : sources.initial
}

/**
 * Imagens da biblioteca do curso que o projeto inicial da aula ganhou DEPOIS que o trabalho foi
 * salvo (ex.: os personagens novos do Farol e os bichos novos do Cadê, 05/10/2026). Sem isso, quem
 * começou o curso antes não encontra na lista as imagens que o vídeo manda escolher.
 *
 * Só ACRESCENTA, pelo nome que falta: nunca troca nem apaga uma imagem que a criança já tem, e
 * só traz imagens da biblioteca (`source: 'library'`), nunca envios de outra pessoa. Sem falta, o
 * MESMO objeto volta, para não marcar o projeto como alterado.
 */
export async function completeLibraryAssets<Project extends EditableStudioProject>(
  saved: Project,
  initial: EditableStudioProject,
): Promise<Project> {
  const own = saved.assets ?? []
  const names = new Set(own.map((asset) => asset.name))
  const ids = new Set(own.map((asset) => asset.id))
  const missing = (initial.assets ?? []).filter(
    (asset) => asset.source === 'library' && !names.has(asset.name) && !ids.has(asset.id),
  )
  if (!missing.length) return saved
  const assets = [...own, ...missing]
  if (saved.programmingLanguage === 'python') {
    try {
      // Same filesystem/material boundary as execution and export. IDs and names alone do
      // not detect explicit paths, case aliases, implicit folders or the aggregate quota.
      const { buildPythonAssetBundle } = await import('@sistemazero/studio/python-assets')
      const entries = Object.entries(saved.tree ?? {})
      await buildPythonAssetBundle(assets, {
        files:
          saved.kind === 'pro'
            ? entries.filter(([, node]) => node.kind === 'file').map(([path]) => path)
            : Object.keys(saved.files),
        directories: entries.filter(([, node]) => node.kind === 'dir').map(([path]) => path),
      })
    } catch (cause) {
      throw new StudioLessonMaterialError(cause)
    }
  }
  return { ...saved, assets }
}
