/**
 * **Os anexos das aulas que já existem viram um bloco de materiais.**
 *
 * O card "Materiais da aula", pregado no pé de toda página de aula, deixou de existir: hoje um
 * arquivo só chega ao aluno DENTRO de um bloco de materiais, no ponto em que a autora o colocar.
 * Sem esta passada, todo anexo já cadastrado sumiria da tela no dia do deploy — o arquivo
 * continuaria no R2, indexado e íntegro, mas invisível.
 *
 * O que ela faz, por aula PUBLICADA que tenha anexo e ainda não tenha bloco de materiais: cria UM
 * bloco `materials` chamado "Materiais da aula", com um item de arquivo por anexo, na ordem que
 * eles já tinham, e o põe no FIM da última seção. A autora move dali para onde quiser.
 *
 * ⚠️ Roda DEPOIS da migration 0090 (é ela que ensina o enum a aceitar `materials`) e depois do
 * deploy do código novo.
 *
 * ⚠️ Mexe só no PUBLICADO (`lesson_blocks` + `lesson_structures`). O rascunho se reconstrói do
 * publicado quando não há um aberto; rascunho em edição é trabalho da autora e não se mexe nele
 * por script — ela verá o bloco novo ao publicar ou ao restaurar do publicado.
 *
 * Uso:
 *   bun run materials:backfill              # dry-run (padrão)
 *   bun run materials:backfill -- --apply
 */

import type { LessonSection } from '@sistemazero/core/learning'
import { createLogger } from '@sistemazero/core/logging'
import { and, eq, isNull } from 'drizzle-orm'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import {
  lessonAttachments,
  lessonBlocks,
  lessonStructures,
  lessons,
} from '../src/infrastructure/persistence/drizzle/schema'

const apply = process.argv.includes('--apply')
if (apply && process.argv.includes('--dry-run'))
  throw new Error('Use somente um modo: --apply ou --dry-run')

const databaseUrl = process.env.DATABASE_URL?.trim()
if (!databaseUrl) throw new Error('DATABASE_URL é obrigatória')

const logger = createLogger({ pretty: process.env.NODE_ENV !== 'production' })
const connection = createDbConnection(databaseUrl, {
  max: 1,
  ssl: ['true', '1'].includes(process.env.DATABASE_SSL?.toLowerCase() ?? ''),
})
const { db } = connection

try {
  const aulas = await db
    .select({ id: lessons.id, title: lessons.title })
    .from(lessons)
    .where(eq(lessons.isPublished, true))

  let criados = 0
  let semSecao = 0
  let jaTem = 0
  let semAnexo = 0

  for (const aula of aulas) {
    const anexos = await db
      .select()
      .from(lessonAttachments)
      .where(eq(lessonAttachments.lessonId, aula.id))
      .orderBy(lessonAttachments.sortOrder)
    if (anexos.length === 0) {
      semAnexo++
      continue
    }

    const blocos = await db
      .select({ id: lessonBlocks.id, kind: lessonBlocks.kind, sortOrder: lessonBlocks.sortOrder })
      .from(lessonBlocks)
      .where(and(eq(lessonBlocks.lessonId, aula.id), isNull(lessonBlocks.archivedAt)))
    if (blocos.some((b) => b.kind === 'materials')) {
      jaTem++
      continue
    }

    const [estrutura] = await db
      .select()
      .from(lessonStructures)
      .where(eq(lessonStructures.lessonId, aula.id))
    const secoes = (estrutura?.sections ?? []) as LessonSection[]
    // ⚠️ Sem seção não há onde pousar o bloco, e inventar uma mudaria o percurso da aula. A aula
    // fica como está e o script NOMEIA o caso — é a autora que decide.
    if (secoes.length === 0) {
      semSecao++
      logger.warn('materials_backfill.sem_secao', { lessonId: aula.id, title: aula.title })
      continue
    }

    const blockId = crypto.randomUUID()
    const content = {
      kind: 'materials' as const,
      title: 'Materiais da aula',
      items: anexos.map((a) => ({
        id: crypto.randomUUID(),
        kind: 'file' as const,
        attachmentId: a.id,
      })),
    }
    logger.info('materials_backfill.aula', {
      lessonId: aula.id,
      title: aula.title,
      anexos: anexos.length,
      secao: secoes.at(-1)?.title,
    })
    criados++
    if (!apply) continue

    await db.transaction(async (tx) => {
      await tx.insert(lessonBlocks).values({
        id: blockId,
        lessonId: aula.id,
        kind: 'materials',
        content,
        sortOrder: Math.max(-1, ...blocos.map((b) => b.sortOrder)) + 1,
        contentRevision: crypto.randomUUID().replaceAll('-', '').slice(0, 32),
      })
      const proximas = secoes.map((s, i) =>
        i === secoes.length - 1 ? { ...s, blockIds: [...s.blockIds, blockId] } : s,
      )
      await tx
        .insert(lessonStructures)
        .values({ lessonId: aula.id, sections: proximas, revision: crypto.randomUUID() })
        .onConflictDoUpdate({
          target: lessonStructures.lessonId,
          set: { sections: proximas, revision: crypto.randomUUID() },
        })
    })
  }

  logger.info('materials_backfill.summary', {
    mode: apply ? 'apply' : 'dry-run',
    aulas: aulas.length,
    criados,
    jaTem,
    semAnexo,
    semSecao,
  })
  if (semSecao > 0) process.exitCode = 1
} finally {
  await connection.close()
}
