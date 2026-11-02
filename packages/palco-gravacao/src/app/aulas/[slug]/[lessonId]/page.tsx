import { randomUUID } from 'node:crypto'
import { notFound, redirect } from 'next/navigation'
import type { CourseDetailView, LessonDetailView } from '@/lib/types'
import { enviada } from '~/lib/aula-enviada'
import { recordingPart } from '~/lib/recording-part'
import { staffAccess } from '~/server/access'
import { gatewayFetch, paths, readJson } from '~/server/gateway'
import { rememberLesson } from '~/server/lessons'
import { abrirNaParte } from '~/server/projeto-da-parte'
import { PalcoAula } from './palco-aula'

export const dynamic = 'force-dynamic'

/**
 * A aula publicada no ambiente, lida pela conta da equipe: tudo aberto, sem trava e sem
 * progresso (é assim que o members serve a equipe). Cada abertura é uma tomada nova
 * (`?tomada=`): o Estúdio e as atividades começam do zero, e atualizar a página dentro da
 * mesma tomada não apaga o que já foi feito. `?parte=N` abre a aula direto na parte N (cada
 * parte da aula é gravada num plano próprio do EdiAula). `&enviado=1` abre o Estúdio com o
 * projeto já enviado, como fica para quem enviou numa parte anterior (o Compartilhar da última
 * parte só libera depois do envio).
 */
export default async function AulaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; lessonId: string }>
  searchParams: Promise<{ tomada?: string; parte?: string; desde?: string; enviado?: string }>
}) {
  const [{ slug, lessonId }, { tomada, parte, desde, enviado }] = await Promise.all([
    params,
    searchParams,
  ])
  const sent = enviado === '1' ? '&enviado=1' : ''
  const here = `/aulas/${encodeURIComponent(slug)}/${encodeURIComponent(lessonId)}`
  let numero: number | null
  // A parte da tomada, que a ida para o `#section=` guarda em `desde`.
  let inicio: number | null
  try {
    numero = recordingPart(parte)
    inicio = numero ?? recordingPart(desde)
  } catch (error) {
    if (error instanceof RangeError) notFound()
    throw error
  }
  if (!tomada || !/^[a-f0-9-]{36}$/.test(tomada))
    redirect(`${here}?tomada=${randomUUID()}${numero ? `&parte=${numero}` : ''}${sent}`)
  const access = await staffAccess()
  if (!access)
    redirect(
      `/entrar?volta=${encodeURIComponent(`${here}?tomada=${tomada}${numero ? `&parte=${numero}` : ''}${sent}`)}`,
    )
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
  if (numero && !secao) notFound()
  if (secao)
    redirect(
      `${here}?tomada=${tomada}&desde=${numero}${sent}#section=${encodeURIComponent(secao.id)}`,
    )
  // O Estúdio abre com o que a criança já teria montado nas partes de antes.
  const naParte = inicio ? await abrirNaParte(lesson, inicio, access.token) : lesson
  const aula = sent ? enviada(naParte, new Date()) : naParte
  rememberLesson(aula)
  return (
    <PalcoAula course={course} lesson={aula} viewerId={`palco-${tomada}`} parte={inicio ?? 1} />
  )
}
