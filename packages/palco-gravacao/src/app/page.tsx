import type { CatalogCourseView, CourseDetailView } from '@/lib/types'
import { staffAccess } from '~/server/access'
import { gatewayFetch, paths, readJson } from '~/server/gateway'

export const dynamic = 'force-dynamic'

const campo = 'h-11 rounded-xl border bg-background px-3 font-normal'

/**
 * O início do palco: escolher o curso e depois a aula, entre os cursos do Kids no staging (a
 * conta da equipe vê todos). Colar o endereço de uma aula do Kids continua valendo.
 */
export default async function InicioPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; curso?: string }>
}) {
  const [access, { erro, curso }] = await Promise.all([staffAccess(), searchParams])
  const catalogo = access
    ? await gatewayFetch(paths.catalog, { access: access.token })
        .then((res) => (res.ok ? readJson<{ courses: CatalogCourseView[] }>(res) : null))
        .then((data) => data?.courses ?? [])
    : []
  const escolhido = curso ? catalogo.find((c) => c.courseSlug === curso) : undefined
  const detalhe =
    access && escolhido
      ? await gatewayFetch(paths.course(escolhido.courseSlug), { access: access.token }).then(
          (res) => (res.ok ? readJson<CourseDetailView>(res) : null),
        )
      : null
  const aulas = detalhe?.modules.flatMap((m) => m.lessons) ?? []

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-4">
      <div className="space-y-2">
        <h1 className="font-extrabold text-2xl">Palco de gravação</h1>
        <p className="text-muted-foreground">
          Escolha o curso e a aula do Kids no staging. Ela abre aqui como a criança vê, com tudo
          liberado e sem salvar progresso, rascunho ou envio.
        </p>
      </div>
      <form method="get" action="/" className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 font-bold">
          Curso
          <select name="curso" defaultValue={escolhido?.courseSlug ?? ''} className={campo}>
            <option value="" disabled>
              Escolha um curso
            </option>
            {catalogo.map((c) => (
              <option key={c.courseSlug} value={c.courseSlug}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="sz-btn-gradient h-12 px-6">
          Ver as aulas
        </button>
      </form>
      {escolhido ? (
        <form method="get" action="/abrir" className="flex flex-col gap-3">
          <input type="hidden" name="curso" value={escolhido.courseSlug} />
          <label className="flex flex-col gap-1 font-bold">
            Aula
            <select name="aula" required defaultValue="" className={campo}>
              <option value="" disabled>
                Escolha uma aula
              </option>
              {aulas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="sz-btn-gradient h-12 px-6">
            Abrir a aula
          </button>
        </form>
      ) : null}
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">
          Ou cole o endereço de uma aula do Kids
        </summary>
        <form method="get" action="/abrir" className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1 font-bold">
            Endereço da aula
            <input
              name="endereco"
              required
              placeholder="https://…/cursos/cade-todo-mundo/aulas/…"
              className={campo}
            />
          </label>
          <button type="submit" className="h-11 rounded-xl border px-6 font-bold">
            Abrir pelo endereço
          </button>
        </form>
      </details>
      {erro ? (
        <p role="alert" className="text-(--destructive) text-sm">
          Não reconheci uma aula nesse endereço. Ele tem /cursos/…/aulas/…?
        </p>
      ) : null}
      <form method="post" action="/api/sair" className="text-muted-foreground text-sm">
        {access ? `Entrou como ${access.user.email}. ` : null}
        <button type="submit" className="underline">
          Sair
        </button>
      </form>
    </main>
  )
}
