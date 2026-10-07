import { createHash } from 'node:crypto'
/** Stable per target lesson. Import retries and updated drafts reuse the same entity IDs. */
export function importedLearningId(lessonId: string, kind: 'block' | 'section', key: string) {
  const hash = createHash('sha256')
    .update(`sz-learning-v1:${lessonId}:${kind}:${key}`)
    .digest('hex')
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`
}

const IMPORTED_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/

/**
 * O bloco nasceu de um manifesto (desta importação ou de uma anterior)? O id gerado por
 * `importedLearningId` tem a versão `5` e a variante `a` cravadas; o que a autora cria no Admin
 * (`crypto.randomUUID()`) e o que o CRUD antigo gravou (`gen_random_uuid()`) são versão 4, então
 * nunca casam. É o que deixa a reimportação tirar do rascunho o que o manifesto deixou de ter sem
 * encostar no que foi feito à mão.
 */
export function isImportedLearningId(id: string): boolean {
  return IMPORTED_ID.test(id)
}
