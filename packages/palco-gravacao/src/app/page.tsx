import { staffAccess } from '~/server/access'

export const dynamic = 'force-dynamic'

export default async function InicioPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>
}) {
  const [access, { erro }] = await Promise.all([staffAccess(), searchParams])
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-4">
      <div className="space-y-2">
        <h1 className="font-extrabold text-2xl">Palco de gravação</h1>
        <p className="text-muted-foreground">
          Cole o endereço de uma aula do Kids no staging. Ela abre aqui como a criança vê, com tudo
          liberado e sem salvar progresso, rascunho ou envio.
        </p>
      </div>
      <form method="get" action="/abrir" className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 font-bold">
          Endereço da aula
          <input
            name="endereco"
            required
            placeholder="https://…/cursos/cade-todo-mundo/aulas/…"
            className="h-11 rounded-xl border px-3 font-normal"
          />
        </label>
        {erro ? (
          <p role="alert" className="text-(--destructive) text-sm">
            Não reconheci uma aula nesse endereço. Ele tem /cursos/…/aulas/…?
          </p>
        ) : null}
        <button type="submit" className="sz-btn-gradient h-12 px-6">
          Abrir a aula
        </button>
      </form>
      <form method="post" action="/api/sair" className="text-muted-foreground text-sm">
        {access ? `Entrou como ${access.user.email}. ` : null}
        <button type="submit" className="underline">
          Sair
        </button>
      </form>
    </main>
  )
}
