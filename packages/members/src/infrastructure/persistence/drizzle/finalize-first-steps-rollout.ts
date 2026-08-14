import type { PgClient } from './db'

export interface FirstStepsRolloutResult {
  courseId: string
  updatedEvents: number
  affectedProfiles: number
}

type CourseRow = {
  id: string
  audience: string
  level: string
  track: string
  career_slot: number | null
}

/**
 * Finaliza, em UMA transação, o passo de dados que não pode viver na migration `0063`.
 *
 * O PostgreSQL só permite escrever `primeiros-passos` depois do COMMIT que adicionou o
 * valor ao enum. Por isso o deploy entra em manutenção, aplica `0063` e então chama esta
 * operação: o curso muda de etapa e os marcos antigos são recongelados juntos. Se qualquer
 * pré-condição estiver diferente do estado conhecido, tudo aborta sem alteração parcial.
 */
export async function finalizeFirstStepsRollout(
  sql: PgClient,
  courseSlug: string,
): Promise<FirstStepsRolloutResult> {
  const slug = courseSlug.trim()
  if (!slug) throw new Error('O slug do curso-base é obrigatório')

  return sql.begin(async (tx) => {
    const [course] = (await tx`
      select id, audience, level::text as level, track::text as track, career_slot
        from members.courses
       where slug = ${slug}
       for update`) as CourseRow[]

    if (!course) throw new Error(`Curso-base '${slug}' não encontrado`)
    const validSource =
      course.audience === 'kids' &&
      course.track === '2d' &&
      course.career_slot === 1 &&
      (course.level === 'iniciante' || course.level === 'primeiros-passos')
    if (!validSource) {
      throw new Error(
        `Curso-base '${slug}' fora do estado esperado: ${course.audience}/${course.level}/${course.track}/slot-${course.career_slot ?? 'bonus'}`,
      )
    }

    // ⚠️ A checagem é CAMPO A CAMPO, e não por trio completo, porque os três campos do retrato
    // nasceram em migrations DIFERENTES: `source_level` na `0030`, `source_track` na `0044` (que
    // deliberadamente NÃO fez backfill) e `source_career_slot` na `0047`. Um marco premiado entre
    // elas é legitimamente PARCIAL — em staging os do curso-base são `('iniciante', null, null)`.
    // Exigir o trio inteiro reprovava esse formato legado e abortava o rollout justamente nos
    // marcos que ele existe para consertar.
    //
    // O que precisa ser verdade é só isto: nenhum campo PREENCHIDO pode apontar para outro degrau.
    // Campo nulo já segue o curso ao vivo (o `coalesce` da contagem), então é compatível por
    // construção; e o UPDATE abaixo grava os três de qualquer jeito. Um retrato de verdade
    // divergente (outro nível, outra trilha, outra posição) continua barrando para revisão manual.
    const [unexpected] = await tx`
      select count(*)::integer as count
        from members.xp_events
       where source_id = ${course.id}
         and source_type in ('course_complete', 'course_showcased')
         and not (
           (source_level is null or source_level::text in ('iniciante', 'primeiros-passos'))
           and (source_track is null or source_track::text = '2d')
           and (source_career_slot is null or source_career_slot = 1)
         )`
    if (Number(unexpected?.count ?? 0) > 0) {
      throw new Error(
        `Curso-base '${slug}' possui marcos com snapshot inesperado; rollout cancelado para revisão manual`,
      )
    }

    await tx`
      update members.courses
         set level = 'primeiros-passos',
             track = '2d',
             career_slot = 1,
             version = version + 1,
             updated_at = now()
       where id = ${course.id}
         and (
           level::text is distinct from 'primeiros-passos'
           or track::text is distinct from '2d'
           or career_slot is distinct from 1
         )`

    const [stats] = await tx`
      with updated as (
        update members.xp_events
           set source_level = 'primeiros-passos',
               source_track = '2d',
               source_career_slot = 1
         where source_id = ${course.id}
           and source_type in ('course_complete', 'course_showcased')
           and (
             source_level::text is distinct from 'primeiros-passos'
             or source_track::text is distinct from '2d'
             or source_career_slot is distinct from 1
           )
        returning user_id
      )
      select count(*)::integer as updated_events,
             count(distinct user_id)::integer as affected_profiles
        from updated`

    const [remaining] = await tx`
      select count(*)::integer as count
        from members.xp_events
       where source_id = ${course.id}
         and source_type in ('course_complete', 'course_showcased')
         and not (
           source_level::text = 'primeiros-passos'
           and source_track::text = '2d'
           and source_career_slot = 1
         )`
    if (Number(remaining?.count ?? 0) > 0) {
      throw new Error(`Nem todos os marcos de '${slug}' foram recongelados; transação cancelada`)
    }

    return {
      courseId: course.id,
      updatedEvents: Number(stats?.updated_events ?? 0),
      affectedProfiles: Number(stats?.affected_profiles ?? 0),
    }
  })
}
