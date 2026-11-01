const ERRORS: Record<string, string> = {
  vazio: 'Preencha o e-mail e a senha.',
  senha: 'E-mail ou senha não conferem.',
  equipe: 'O palco é só para contas da equipe.',
}

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; volta?: string }>
}) {
  const { erro, volta } = await searchParams
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div className="space-y-2">
        <h1 className="font-extrabold text-2xl">Palco de gravação</h1>
        <p className="text-muted-foreground">
          As aulas do Kids como a criança vê, para gravar. Nada do que acontece aqui é salvo.
        </p>
      </div>
      <form method="post" action="/api/entrar" className="flex flex-col gap-4">
        <input type="hidden" name="volta" value={volta ?? '/'} />
        <label className="flex flex-col gap-1 font-bold">
          E-mail da equipe
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            className="h-11 rounded-xl border px-3 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 font-bold">
          Senha
          <input
            name="senha"
            type="password"
            autoComplete="current-password"
            required
            className="h-11 rounded-xl border px-3 font-normal"
          />
        </label>
        {erro && ERRORS[erro] ? (
          <p role="alert" className="text-(--destructive) text-sm">
            {ERRORS[erro]}
          </p>
        ) : null}
        <button type="submit" className="sz-btn-gradient h-12 px-6">
          Entrar
        </button>
      </form>
    </main>
  )
}
