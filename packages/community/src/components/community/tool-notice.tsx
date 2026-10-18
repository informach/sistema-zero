'use client'

import Link from 'next/link'

export function ToolNotice({
  name,
  unavailable = false,
  readOnly = false,
}: {
  name: string
  unavailable?: boolean
  readOnly?: boolean
}) {
  return (
    <section className="m-auto max-w-lg space-y-4 p-8 text-center">
      <h1 className="sz-display text-2xl">{name}</h1>
      <p>
        {unavailable
          ? 'Não foi possível conferir seu acesso agora. Atualize a página para tentar novamente.'
          : readOnly
            ? 'A sessão de suporte está em modo de consulta. A edição livre está disponível na sessão do aluno.'
            : 'Esta ferramenta ainda não está liberada para sua conta. Consulte seus cursos ou fale com a equipe.'}
      </p>
      {unavailable ? (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="sz-btn-gradient inline-flex"
        >
          Tentar novamente
        </button>
      ) : null}
      <div className="flex justify-center gap-5">
        <Link href="/criar" prefetch={false}>
          Voltar para Criar
        </Link>
        <Link href="/cursos" prefetch={false}>
          Ver cursos
        </Link>
      </div>
    </section>
  )
}
