/**
 * O assunto de uma conversa com o aluno, com o CURSO na frente: "Curso · Aula · Seção".
 *
 * O título da conversa só traz aula e seção (é o que o aluno vê, e ele sabe em que curso
 * está). O professor atende vários cursos ao mesmo tempo e precisa do nome do curso para
 * entender a dúvida. O `courseTitle` é o título ATUAL do curso, devolvido pelo members;
 * vem ausente de um members antigo e `null` quando o curso foi apagado.
 */
export function threadSubject(thread: {
  courseTitle?: string | null
  title: string | null
}): string | null {
  const course = thread.courseTitle?.trim() || null
  const title = thread.title?.trim() || null
  if (!course) return title
  if (!title) return course
  // Conversa cujo título já começa pelo curso não repete o nome.
  if (title === course || title.startsWith(`${course} · `)) return title
  return `${course} · ${title}`
}
