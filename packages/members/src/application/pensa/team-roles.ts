import type { PensaTeamRoles } from '@sistemazero/core/pensa'
import type { PensaProject, PensaTask } from '../../domain/pensa/pensa'
import { pensaMissionBlock, pensaTeamRoles } from '../../domain/pensa/team'
import type { PensaRepository } from '../../domain/ports/pensa-repository.port'

/** Os papéis EFETIVOS do plano (dona + quem entrou + as linhas de `pensa_project_roles`). */
export async function loadPensaTeamRoles(
  repo: PensaRepository,
  project: Pick<PensaProject, 'id' | 'userId'>,
): Promise<PensaTeamRoles> {
  const [members, rows] = await Promise.all([
    repo.listMembers(project.id),
    repo.listRoles(project.id),
  ])
  return pensaTeamRoles(
    project.userId,
    members.map((member) => member.profileId),
    rows,
  )
}

/**
 * Por que o perfil não pode trabalhar nesta missão (só na jornada v2; o plano clássico não tem
 * funções). `null` = pode. É a leitura de UX do handoff e da rota de progresso; quem decide de
 * verdade é o repositório, sob a trava do projeto.
 */
export async function pensaTaskTeamBlock(
  repo: PensaRepository,
  found: { task: PensaTask; project: Pick<PensaProject, 'id' | 'userId'>; journey: boolean },
  profileId: string,
): Promise<{ kind: 'role' | 'taken'; reason: string } | null> {
  if (!found.journey) return null
  const roles = await loadPensaTeamRoles(repo, found.project)
  return pensaMissionBlock(
    {
      destination: found.task.destination,
      status: found.task.progress.status,
      assigneeProfileId: found.task.assigneeProfileId,
    },
    profileId,
    roles,
  )
}
