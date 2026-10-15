import type { LiveRecordingChapter, LiveRoomView, LiveSectionControl } from '@sistemazero/core/live'

/**
 * As partes conduzidas da sala de curso ao vivo (14/10/2026), em réguas puras.
 *
 * - Encontro `live`: a criança anda só entre as partes ABERTAS (`occurrence.sections`).
 * - Recepção (`lobby`): nenhuma parte aberta ainda; a tela mostra a primeira e espera.
 * - Fora disso (gravação, prazo): `null`, a navegação é a de sempre.
 *
 * A professora não é presa: ela vê todas as partes como abertas, mas a tela dela também acompanha
 * a parte atual da turma (é ela quem a muda).
 */
export function learnerSectionControl(room: LiveRoomView | null): LiveSectionControl | null {
  const occurrence = room?.occurrence
  if (!occurrence) return null
  if (occurrence.state === 'lobby') return { openedIds: [], currentId: null }
  if (occurrence.state !== 'live') return null
  // Servidor anterior às partes conduzidas: sem a lista, a navegação fica livre (nunca presa).
  return occurrence.sections ?? null
}

export function teacherSectionControl(
  room: LiveRoomView | null,
  sectionIds: string[],
): LiveSectionControl | null {
  const occurrence = room?.occurrence
  if (occurrence?.state !== 'live' || !sectionIds.length) return null
  return { openedIds: sectionIds, currentId: occurrence.sections?.currentId ?? null }
}

/** A parte que o "Próxima parte" abre: a seguinte à atual, na ordem da aula. */
export function nextSectionId(
  sections: { id: string }[],
  control: LiveSectionControl | null | undefined,
): string | null {
  if (!sections.length) return null
  if (!control?.currentId) return sections[0]!.id
  const index = sections.findIndex((section) => section.id === control.currentId)
  if (index < 0) return sections[0]!.id
  return sections[index + 1]?.id ?? null
}

/**
 * O trecho da gravação de uma parte (`recording.chapters`, em segundos já sem as pausas). Uma
 * parte reaberta não ganha marca nova, então vale a primeira.
 */
export function chapterSeconds(
  chapters: LiveRecordingChapter[] | undefined,
  sectionId: string | null,
): number | null {
  if (!sectionId || !chapters?.length) return null
  const chapter = chapters.find((item) => item.sectionId === sectionId)
  return chapter && Number.isFinite(chapter.seconds) && chapter.seconds >= 0
    ? chapter.seconds
    : null
}

/** "Parte 2 · Título", para os cartões e os controles da professora. */
export function sectionLabel(
  sections: { id: string; title: string }[],
  sectionId: string | null | undefined,
): string | null {
  if (!sectionId) return null
  const index = sections.findIndex((section) => section.id === sectionId)
  if (index < 0) return null
  return `Parte ${index + 1} · ${sections[index]!.title}`
}
