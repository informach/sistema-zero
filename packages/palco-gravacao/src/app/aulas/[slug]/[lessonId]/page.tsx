import { randomUUID } from 'node:crypto'
import { notFound, redirect } from 'next/navigation'
import type { CourseDetailView, LessonDetailView } from '@/lib/types'
import { staffAccess } from '~/server/access'
import { gatewayFetch, paths, readJson } from '~/server/gateway'
import { rememberLesson } from '~/server/lessons'
import { PalcoAula } from './palco-aula'

export const dynamic = 'force-dynamic'

/**
 * A aula publicada no ambiente, lida pela conta da equipe: tudo aberto, sem trava e sem
 * progresso (é assim que o members serve a equipe). Cada abertura é uma tomada nova
 * (`?tomada=`): o Estúdio e as atividades começam do zero, e atualizar a página dentro da
 * mesma tomada não apaga o que já foi feito. `?parte=N` abre a aula direto na parte N (cada
 * parte da aula é gravada num plano próprio do EdiAula).
 */
export default async function AulaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; lessonId: string }>
  searchParams: Promise<{ tomada?: string; parte?: string }>
}) {
  const [{ slug, lessonId }, { tomada, parte }] = await Promise.all([params, searchParams])
  const here = `/aulas/${encodeURIComponent(slug)}/${encodeURIComponent(lessonId)}`
  const numero = parte && /^\d{1,2}$/.test(parte) ? Number(parte) : null
  if (!tomada || !/^[a-f0-9-]{36}$/.test(tomada))
    redirect(`${here}?tomada=${randomUUID()}${numero ? `&parte=${numero}` : ''}`)
  const access = await staffAccess()
  if (!access) redirect(`/entrar?volta=${encodeURIComponent(here)}`)
  const [courseRes, lessonRes] = await Promise.all([
    gatewayFetch(paths.course(slug), { access: access.token }),
    gatewayFetch(paths.lesson(slug, lessonId), { access: access.token }),
  ])
  if (courseRes.status === 404 || lessonRes.status === 404) notFound()
  const course = courseRes.ok ? await readJson<CourseDetailView>(courseRes) : null
  const lesson = lessonRes.ok ? await readJson<LessonDetailView>(lessonRes) : null
  if (!course || !lesson)
    throw new Error(`Não consegui ler a aula (${courseRes.status}, ${lessonRes.status}).`)
  // A parte pedida vira o `#section=` que o player do Kids já entende, na mesma tomada.
  const secao = numero ? lesson.sections?.[numero - 1] : undefined
  if (secao) redirect(`${here}?tomada=${tomada}#section=${encodeURIComponent(secao.id)}`)
  rememberLesson(lesson)
  return <PalcoAula course={course} lesson={lesson} viewerId={`palco-${tomada}`} />
}
