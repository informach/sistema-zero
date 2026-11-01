import { NextResponse } from 'next/server'
import { lessonPathOf } from '~/lib/lesson-address'

/**
 * A aula escolhida no início (`curso` e `aula`) ou o endereço de uma aula do Kids (de qualquer
 * ambiente) vira a mesma aula no palco.
 */
export function GET(req: Request): Response {
  const query = new URL(req.url).searchParams
  const curso = query.get('curso')
  const aula = query.get('aula')
  const path =
    curso && aula
      ? `/aulas/${encodeURIComponent(curso)}/${encodeURIComponent(aula)}`
      : lessonPathOf(query.get('endereco') ?? '')
  return NextResponse.redirect(new URL(path ?? '/?erro=endereco', req.url), 303)
}
