import 'server-only'
import { createHash } from 'node:crypto'
import type { LessonDetailView } from '@/lib/types'

/**
 * As aulas abertas no palco, lembradas pelo id: as rotas da aula recebem só o id da aula, e o
 * contexto do Estúdio precisa do bloco dela. O serviço tem uma réplica só (como os apps do
 * Kids), então a memória do processo basta; uma aula esquecida pede para reabrir a página.
 * Fica no `globalThis`: no build de produção a página e as rotas da aula são pacotes separados,
 * cada um com a sua cópia deste módulo, e um `Map` do módulo não seria visto pela rota do
 * Estúdio.
 */
const shared = globalThis as { __palcoAulas?: Map<string, LessonDetailView> }
shared.__palcoAulas ??= new Map()
const opened = shared.__palcoAulas
const LIMIT = 50

export function rememberLesson(lesson: LessonDetailView): void {
  opened.delete(lesson.id)
  opened.set(lesson.id, lesson)
  if (opened.size > LIMIT) {
    const oldest = opened.keys().next().value
    if (oldest !== undefined) opened.delete(oldest)
  }
}

/**
 * O contexto do Estúdio de um bloco, como o members o daria, já vinculado: no palco o projeto
 * começa sempre do inicial e nada é confirmado na conta.
 */
export function studioContextOf(lessonId: string, blockId: string): unknown | null {
  const block = opened.get(lessonId)?.blocks.find((b) => b.id === blockId)
  const content = block?.content as Record<string, unknown> | undefined
  if (content?.kind !== 'studio' || !content.initialProject) return null
  const pick = (key: string) => (content[key] === undefined ? {} : { [key]: content[key] })
  return {
    id: createHash('sha256').update(`palco:${lessonId}:${blockId}`).digest('hex'),
    blockId,
    lessonId,
    bound: true,
    configuration: {
      initialProject: content.initialProject,
      ...pick('level'),
      ...pick('pythonLevel'),
      ...pick('allowBlocks'),
      ...pick('allowCategories'),
      ...pick('allowedModes'),
      ...pick('allowLevelReveal'),
      ...pick('chain'),
    },
  }
}
