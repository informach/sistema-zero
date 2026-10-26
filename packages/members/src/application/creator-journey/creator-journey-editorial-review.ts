import type { Course } from '../../domain/course/course'

/** Existing remote lesson UUIDs/revisions are not known from a course catalog.
 * Report exact source keys for a human-reviewed draft patch; never replace its tree by slug.
 */
export function creatorJourneyEditorialReviews(
  courses: readonly Pick<Course, 'id' | 'slug' | 'version'>[],
) {
  return courses.flatMap((course) => {
    const slug = course.slug.replace(/-adulto$/, '')
    if (slug !== 'desafio-primeiro-jogo' && slug !== 'cade-todo-mundo') return []
    const farol = slug === 'desafio-primeiro-jogo'
    return [
      {
        courseId: course.id,
        courseSlug: course.slug,
        expectedCourseVersion: course.version,
        kind: 'optional-public-sharing' as const,
        action: 'review-existing-lesson-draft' as const,
        source: farol
          ? 'docs/aulas-interativas/desafio-primeiro-jogo/desafio-dia-3.manifesto.json'
          : 'docs/aulas-interativas/cade-todo-mundo/cade-todo-mundo-aula-2.manifesto.json',
        sourceFields: [
          `blocks[key=${farol ? 'ponte-d3-publicar' : 'ponte-a2-publicar'}].content.text`,
          `sections[key=${farol ? 'fecho' : 'conclusao'}].title`,
          `sections[key=${farol ? 'fecho' : 'conclusao'}].objective`,
        ],
        instruction:
          'Conferir esses campos no rascunho remoto atual e informar que publicar no Mural é opcional. Usar a revisão/CAS da aula; preservar vídeos, critérios, IDs, submissões e toda a árvore restante. Se já estiver correto, não alterar.',
        reason:
          'O catálogo não contém a revisão da aula; o seed não pode afirmar que o texto remoto é igual ao manifesto local.',
      },
    ]
  })
}
