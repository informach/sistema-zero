import type { PensaProject } from '../../domain/pensa/pensa'
import { PensaNotFoundError } from '../../domain/pensa/pensa.errors'
import type { PensaRepository } from '../../domain/ports/pensa-repository.port'
import { type PensaProjectDetailView, toPensaProjectDetailView } from '../mappers/pensa-views'

/**
 * Monta a `PensaProjectDetailView` (cycles ASC + currentCycle + artifactsIndex
 * do ciclo corrente) — compartilhado por create/get/update-project e create-cycle.
 * O ownership do `project` JÁ foi resolvido pelo chamador.
 */
export async function loadPensaProjectDetail(
  repo: PensaRepository,
  project: PensaProject,
): Promise<PensaProjectDetailView> {
  const cycles = await repo.listCycles(project.id)
  const currentCycle = cycles[cycles.length - 1]
  // Invariante: todo projeto nasce com o ciclo 1 (criação atômica). Sem ciclo =
  // dado corrompido — falha fechado como não-encontrado (nunca 500 com view rota).
  if (!currentCycle) throw new PensaNotFoundError()
  const latestArtifacts = await repo.listLatestArtifacts(currentCycle.id)
  return toPensaProjectDetailView(project, cycles, currentCycle, latestArtifacts)
}
