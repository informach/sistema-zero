import { precedingPublishedLessonIds } from '../certificate/certificate'

/**
 * Trava sequencial estilo Duolingo: uma aula só fica LIBERADA quando TODAS as
 * aulas publicadas anteriores (ordem do curso: módulo.sortOrder → aula.sortOrder,
 * já achatada em `orderedPublishedLessonIds`) estão concluídas. A 1ª aula publicada
 * nunca trava (não há anterior — `precedingPublishedLessonIds` devolve vazio →
 * `every` de vazio é `true`). Sem piso de "≥1 anterior" (≠ do certificado).
 *
 * Reusa o MESMO `precedingPublishedLessonIds` do certificado → a ordem do gate de
 * trava, do progresso e da elegibilidade do certificado é garantidamente a mesma.
 * Puro/testável.
 */
export function isLessonLocked(
  orderedPublishedLessonIds: string[],
  lessonId: string,
  completedLessonIds: Iterable<string>,
): boolean {
  const completed =
    completedLessonIds instanceof Set ? completedLessonIds : new Set(completedLessonIds)
  // Aula JÁ concluída NUNCA trava (espelha "aula concluída nunca regride"): mesmo
  // que uma anterior seja despublicada/reaberta, quem já passou não fica preso.
  if (completed.has(lessonId)) return false
  const preceding = precedingPublishedLessonIds(orderedPublishedLessonIds, lessonId)
  return !preceding.every((id) => completed.has(id))
}

/**
 * Versão em LOTE (p/ o outline do curso): devolve o conjunto de aulas TRAVADAS numa
 * única varredura O(n) da lista ordenada (em vez de O(n²) chamando `isLessonLocked`
 * por aula). Mesma semântica: uma aula é travada se NÃO está concluída E alguma aula
 * publicada anterior também não está. Aula concluída nunca entra no conjunto.
 */
export function lockedLessonIds(
  orderedPublishedLessonIds: string[],
  completedLessonIds: Iterable<string>,
): Set<string> {
  const completed =
    completedLessonIds instanceof Set ? completedLessonIds : new Set(completedLessonIds)
  const locked = new Set<string>()
  let allPriorComplete = true
  for (const id of orderedPublishedLessonIds) {
    const done = completed.has(id)
    if (!allPriorComplete && !done) locked.add(id)
    if (!done) allPriorComplete = false
  }
  return locked
}
