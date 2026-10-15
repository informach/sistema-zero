import { TeacherLiveRoom } from './teacher-live-room'

/**
 * A sala da professora (cursos ao vivo, 14/10/2026). ⚠️ Abre-se SÓ por navegação completa
 * (`<a href>`): o `frame-src` com o R2 é desta rota (ver o CLAUDE.md do admin).
 */
export default async function TeacherLiveLessonPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return <TeacherLiveRoom sessionId={(await params).id} />
}
