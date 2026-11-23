import type { Platform } from '@/lib/platform'
import type { TeacherThreadContext } from '@/lib/types'

export type ThreadWorkflowStatus = 'waiting_teacher' | 'waiting_student' | 'resolved'

/** A situação de um recado, como a equipe lê: quem a conversa espera agora. */
export function workflowLabel(status: ThreadWorkflowStatus, audience: Platform): string {
  if (status === 'waiting_teacher') return 'Esperando a equipe'
  if (status === 'waiting_student')
    return audience === 'kids' ? 'Esperando a criança' : 'Esperando o aluno'
  return 'Resolvido'
}

export const WORKFLOW_STATUSES: readonly ThreadWorkflowStatus[] = [
  'waiting_teacher',
  'waiting_student',
  'resolved',
]

/** O assunto do recado, pelo lugar de onde ele nasceu. */
export const CONTEXT_LABELS: Record<TeacherThreadContext, string> = {
  lesson_section: 'Dúvida na aula',
  studio_submission: 'Projeto',
  mural_publication: 'Mural',
  general: 'Recado geral',
  pinta_recovery: 'Ajuda do Pinta',
}

export const CONTEXTS: readonly TeacherThreadContext[] = [
  'lesson_section',
  'studio_submission',
  'mural_publication',
  'general',
  'pinta_recovery',
]

/** A frase do contexto no alto do recado aberto. */
export const CONTEXT_DETAIL: Record<TeacherThreadContext, string> = {
  studio_submission: 'Sobre um projeto enviado',
  lesson_section: 'Dúvida numa parte da aula',
  mural_publication: 'Sobre uma publicação no Mural',
  general: 'Recado geral da equipe',
  // Sem aula: a criança pediu ajuda no aviso de recuperação da galeria do Pinta. O recado traz o
  // perfil no aparelho, as edições guardadas e os desenhos de cada uma.
  pinta_recovery: 'Ajuda do Pinta: recuperação de desenhos',
}
