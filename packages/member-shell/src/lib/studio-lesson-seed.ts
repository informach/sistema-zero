import type { Project } from '@sistemazero/studio'

interface StudioLessonSources {
  local: () => Promise<Project | null>
  submitted?: () => Promise<Project | null>
  carryover?: () => Promise<Project | null>
  initial: Project
}

/** Only an absent source permits moving to the next saved version. */
export async function resolveStudioLessonSeed(sources: StudioLessonSources): Promise<Project> {
  const local = await sources.local()
  if (local) return completeLibraryAssets(local, sources.initial)
  const submitted = await sources.submitted?.()
  if (submitted) return completeLibraryAssets(submitted, sources.initial)
  const carryover = await sources.carryover?.()
  return carryover ? completeLibraryAssets(carryover, sources.initial) : sources.initial
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
export function completeLibraryAssets(saved: Project, initial: Project): Project {
  const own = saved.assets ?? []
  const names = new Set(own.map((asset) => asset.name))
  const ids = new Set(own.map((asset) => asset.id))
  const missing = (initial.assets ?? []).filter(
    (asset) => asset.source === 'library' && !names.has(asset.name) && !ids.has(asset.id),
  )
  return missing.length ? { ...saved, assets: [...own, ...missing] } : saved
}
