import 'server-only'
import type { LessonDetailView } from '@/lib/types'
import { projetoDaParte } from '~/lib/projeto-da-parte'
import { gatewayFetch, readJson } from './gateway'
import { projetoGravadoAntes } from './projetos-gravados'

interface Publicada {
  document?: { blocks?: { id: string; content?: { kind?: string; projectExamples?: unknown } }[] }
}

/**
 * A aula com cada Estúdio aberto no projeto da parte `numero`: o que a parte gravada antes
 * montou (`projetos-gravados.ts`) ou, sem ela, o dos exemplos da aula (`projetoDaParte`), que só
 * chegam pela leitura da equipe da aula publicada; sem nenhum, a aula fica como veio.
 */
export async function abrirNaParte(
  lesson: LessonDetailView,
  numero: number,
  access: string,
): Promise<LessonDetailView> {
  const gravado = (id: string) => projetoGravadoAntes(lesson.id, id, numero)
  if (lesson.blocks.every((b) => b.kind !== 'studio' || gravado(b.id)))
    return comProjetos(lesson, gravado)
  const res = await gatewayFetch(
    `/members/admin/lessons/${encodeURIComponent(lesson.id)}/draft/published`,
    { access },
  ).catch(() => null)
  if (!res?.ok) return comProjetos(lesson, gravado)
  const publicada = await readJson<Publicada>(res).catch(() => null)
  const sectionIds = (lesson.sections ?? []).map((s) => s.id)
  const exemplos = new Map(
    (publicada?.document?.blocks ?? [])
      .filter((b) => b.content?.kind === 'studio')
      .map((b) => [b.id, b.content?.projectExamples]),
  )
  return comProjetos(
    lesson,
    (id) =>
      gravado(id) ??
      (exemplos.has(id) ? projetoDaParte(exemplos.get(id), sectionIds, numero) : null),
  )
}

function comProjetos(
  lesson: LessonDetailView,
  projetoDe: (blockId: string) => unknown,
): LessonDetailView {
  return {
    ...lesson,
    blocks: lesson.blocks.map((block) => {
      const projeto = block.kind === 'studio' ? projetoDe(block.id) : null
      if (!projeto) return block
      return {
        ...block,
        content: { ...(block.content as Record<string, unknown>), initialProject: projeto },
      }
    }),
  }
}
