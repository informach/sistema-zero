import type { SectionProgressView } from '@sistemazero/core/learning'

/** Retomar estudo e rever uma aula concluída são intenções diferentes. A parte já
 * cumprida não deve obrigar quem ainda está estudando a passar pelo mesmo caminho. */
export function resumeSectionId(input: {
  saved: string | null
  progress: SectionProgressView | undefined
  lessonCompleted: boolean
  live: boolean
  savedVideoPending: boolean
}): string | null {
  const { saved, progress, lessonCompleted, live, savedVideoPending } = input
  if (!progress) return saved
  const selected = progress.sections.find((section) => section.id === saved)
  if (
    selected &&
    selected.status !== 'locked' &&
    (selected.status !== 'completed' || lessonCompleted || live || savedVideoPending)
  )
    return selected.id
  const available = progress.sections.find((section) => section.status === 'available')
  if (available) return available.id
  // As partes estão prontas, mas falta o gesto de concluir a aula: abra o fim,
  // onde está esse botão. Uma aula já concluída segue aberta para revisão.
  return (lessonCompleted || live ? progress.sections[0] : progress.sections.at(-1))?.id ?? null
}
