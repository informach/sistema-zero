import { createHash } from 'node:crypto'
import type { LearningImportSnapshot } from '../ports/learning-import-repository.port'
import { stableJson } from '../shared/stable-json'

export function learningImportFingerprint(snapshot: LearningImportSnapshot): string {
  return createHash('sha256')
    .update(stableJson({ lesson: snapshot.lesson, structure: snapshot.structure }))
    .digest('hex')
}
/** Stable per target lesson. Import retries and updated drafts reuse the same entity IDs. */
export function importedLearningId(lessonId: string, kind: 'block' | 'section', key: string) {
  const hash = createHash('sha256')
    .update(`sz-learning-v1:${lessonId}:${kind}:${key}`)
    .digest('hex')
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`
}
