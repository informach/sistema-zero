import { NextResponse } from 'next/server'
import { lessonPathOf } from '~/lib/lesson-address'

/** O endereço de uma aula do Kids (de qualquer ambiente) vira a mesma aula no palco. */
export function GET(req: Request): Response {
  const endereco = new URL(req.url).searchParams.get('endereco') ?? ''
  const path = lessonPathOf(endereco)
  return NextResponse.redirect(new URL(path ?? '/?erro=endereco', req.url), 303)
}
