import 'server-only'
import type { LessonDetailView } from '@/lib/types'
import { escolherProjeto, projetoDaAula } from '~/lib/projeto-da-parte'
import { gatewayFetch, readJson } from './gateway'
import { tomadaGravadaAntes } from './projetos-gravados'

interface Publicada {
  document?: { blocks?: { id: string; content?: { kind?: string; projectExamples?: unknown } }[] }
}

/**
 * A aula com cada Estúdio aberto no projeto da parte `numero`: o que a parte gravada antes
 * montou (`projetos-gravados.ts`) ou o dos exemplos da aula (`projetoDaAula`), que só chegam
 * pela leitura da equipe da aula publicada, o que for de um estado mais novo (`escolherProjeto`:
 * a tomada antiga de uma parte regravada depois de o palco reiniciar não passa na frente do
 * projeto de entrada de uma parte bem adiante). Sem a aula publicada, vale a tomada; sem
 * nenhum, a aula fica como veio.
 */
export async function abrirNaParte(
  lesson: LessonDetailView,
  numero: number,
  access: string,
): Promise<LessonDetailView> {
  const gravado = (id: string) => tomadaGravadaAntes(lesson.id, id, numero)
  if (!lesson.blocks.some((b) => b.kind === 'studio')) return lesson
  const res = await gatewayFetch(
    `/members/admin/lessons/${encodeURIComponent(lesson.id)}/draft/published`,
    { access },
  ).catch(() => null)
  const publicada = res?.ok ? await readJson<Publicada>(res).catch(() => null) : null
  const sectionIds = (lesson.sections ?? []).map((s) => s.id)
  const exemplos = new Map(
    (publicada?.document?.blocks ?? [])
      .filter((b) => b.content?.kind === 'studio')
      .map((b) => [b.id, b.content?.projectExamples]),
  )
  return comProjetos(lesson, (id) =>
    escolherProjeto(
      gravado(id),
      exemplos.has(id) ? projetoDaAula(exemplos.get(id), sectionIds, numero) : null,
    ),
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
