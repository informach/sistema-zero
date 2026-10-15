/**
 * A EQUIPE no Pensa v2 (14/10/2026), do lado da TELA. As regras (papéis efetivos, quem pode
 * fazer cada missão, a próxima missão de cada pessoa) moram em `@sistemazero/core/pensa`; aqui
 * só a tradução das tarefas da etapa para o formato do core e os nomes que a tela escreve.
 */
import {
  type PensaTeamMissionProgress,
  type PensaTeamRoles,
  pensaMissionWorkers,
} from '@sistemazero/core/pensa'
import type { PensaTaskView } from './types'

/**
 * As tarefas da etapa no formato do `nextPensaMissionFor`. `evidenceCurrent` segue a régua que a
 * jornada já usa (`currentPensaTask` do member-shell): concluída vale, e quem confere a criação
 * guardada é o servidor.
 */
export function teamMissionProgress(tasks: readonly PensaTaskView[]): PensaTeamMissionProgress[] {
  return tasks.map((task) => ({
    id: task.id,
    dependencies: task.dependencies,
    status: task.progress.status,
    evidenceCurrent: true,
    destination: task.destination,
    assigneeProfileId: task.assigneeProfileId ?? null,
  }))
}

/**
 * Quem faz (ou fez) esta missão: quem concluiu; senão quem começou; senão quem tem a função
 * (`pensaMissionWorkers`). É o "você" / 1º nome do "Meu caminho".
 */
export function missionPeople(task: PensaTaskView, roles: PensaTeamRoles): string[] {
  if (task.progress.status === 'completed' && task.completedByProfileId)
    return [task.completedByProfileId]
  if (task.progress.status !== 'planned' && task.assigneeProfileId) return [task.assigneeProfileId]
  return pensaMissionWorkers(task.destination, roles)
}

/**
 * As artes que a JANELA mostra marcadas. O papel efetivo sem ninguém nas artes é `[quem
 * programa]`; marcar quem programa ou não marcar ninguém dá no mesmo, e a janela mostra o
 * segundo: assim, trocar quem programa não transforma a pessoa anterior em artista sem querer.
 */
export function editableArt(roles: PensaTeamRoles): string[] {
  return roles.art.length === 1 && roles.art[0] === roles.code ? [] : [...roles.art]
}

/** "Bia", "Bia e Leo", "Bia, Ana e Leo". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} e ${names.at(-1)}`
}
