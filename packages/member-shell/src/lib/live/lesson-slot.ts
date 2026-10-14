import type { LiveActivityReport, LiveSectionControl } from '@sistemazero/core/live'
import type { ReactNode } from 'react'

/**
 * O Estúdio da sala (cursos ao vivo, 14/10/2026): o bloco Estúdio de uma aula de curso ao vivo
 * abre o PROJETO AO VIVO da criança para aquele bloco (`GET /members/live/workspaces?sessionId=
 * &blockId=`), com lease, revisões e a ajuda da professora, em vez do rascunho local + envio.
 * Quem liga é o `LessonPlayerContextValue.liveWorkspace`; sem ele o bloco é o de sempre.
 */
export interface LiveLessonWorkspace {
  sessionId: string
  /** Quem está na tela: a dona do projeto ou a professora acompanhando. */
  role: 'learner' | 'teacher'
  actorId: string
  deviceId: string
  /** Professora: a criança cujo projeto ela acompanha (`''` = nenhuma escolhida). */
  learnerId?: string
  /** A criança da sala que a professora pode escolher para acompanhar. */
  learners?: { id: string; name: string }[]
  /** "Compartilhar" no Mural pelo projeto ao vivo: só o Kids liga (o adulto não tem o Mural). */
  publishToMural?: boolean
  onSelectLearner?(learnerId: string): void
  onError?(message: string): void
  onSaveStateChange?(state: LiveActivityReport['saveState']): void
  /** A professora pediu para ajudar: no celular a sala leva a criança ao "Criar". */
  onNeedsAttention?(): void
}

/** O que a criança relata da aula para os cartões da professora. */
export interface LiveSectionReport {
  sectionId: string | null
  completedSectionIds: string[]
}

/** O mapa da aula que o player conhece e a sala não: as partes e os anexos. */
export interface LiveLessonOutline {
  sections: { id: string; title: string }[]
  attachments?: { id: string; label: string; fileType: string | null }[]
}

/**
 * O slot da aula na sala (`LiveClassroom.renderLesson`). Kids e comunidade adulta passam o player
 * de aula de verdade (rotas de aula de sempre); o Admin passa a prévia do documento publicado.
 *
 * Os quatro primeiros campos e o `onSectionReport` são o contrato combinado entre as frentes; os
 * demais são acréscimos da sala (opcionais para quem implementa).
 */
export interface LiveLessonSlotProps {
  lesson: { courseId: string; courseSlug: string; lessonId: string }
  /** A transmissão (ou a gravação), fixa no alto da coluna da esquerda. */
  stage: ReactNode
  /** Partes conduzidas pela professora; `null` = navegação livre (gravação, prazo). */
  sectionControl: LiveSectionControl | null
  teacher: boolean
  /** Anotações da professora por parte (só na sala dela). */
  teacherNotes?: Record<string, string>
  onSectionReport(info: LiveSectionReport): void
  /** O projeto ao vivo do bloco Estúdio (vai para o `LessonPlayerContextValue.liveWorkspace`). */
  liveWorkspace?: LiveLessonWorkspace
  /** As partes e os anexos que o player leu, para os controles e os materiais da sala. */
  onOutline?(outline: LiveLessonOutline): void
  /** Plataforma do curso (a cópia da aula e a prévia do Admin). */
  audience?: 'adult' | 'kids'
}
