import Link from 'next/link'

/** Como um curso da Comunidade Sistema Zero chega ao aluno: quem recebe, por onde e o que libera. */
export function AdultCourseAccessContract({
  slug,
  live,
  blocks,
}: {
  slug: string
  live: boolean
  blocks: number
}) {
  return (
    <section
      className="space-y-3 rounded-2xl border p-4 text-sm"
      aria-label="Como este curso chega ao aluno"
    >
      <h3 className="font-semibold">Como este curso chega ao aluno</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        <dt>Aluno</dt>
        <dd>A própria conta, sem perfil de família.</dd>
        <dt>Como libera</dt>
        <dd>
          {live
            ? 'Uma vaga na turma, que dá entrada nos encontros.'
            : 'A matrícula no curso gravado, pela compra no catálogo.'}
        </dd>
        <dt>Endereço</dt>
        <dd>
          <code>{slug || 'Escolha o endereço do curso'}</code>
        </dd>
        <dt>Ferramentas da aula</dt>
        <dd>Liberadas pela própria aula. Não precisam de outro produto.</dd>
        <dt>Blocos conquistados</dt>
        <dd>
          {live
            ? `${blocks} blocos configurados. O aluno ganha ao concluir a oficina, sem precisar publicar no Mural.`
            : `${blocks} blocos configurados. Concluir o curso mantém as ferramentas conquistadas.`}
        </dd>
      </dl>
      <p>
        Os blocos conquistados ficam guardados mesmo sem a licença do Estúdio Completo. O acesso ao
        produto é conferido à parte.
      </p>
      <p>
        Estúdio, Pinta, Molda e Pensa livres dependem das licenças da Comunidade Sistema Zero e das
        liberações da jornada. Os assistentes e a voz pedem a formação avançada, e a voz depende
        também da escolha do aluno.
      </p>
      {live ? (
        <p className="text-warning">
          Hoje a equipe cuida das vagas à mão. Vender vaga sozinho precisa de uma integração própria
          de reserva, pagamento e estorno.
        </p>
      ) : (
        <p>
          Uma oferta precisa entregar este curso pelo endereço dele. Para liberar todos os cursos da
          comunidade, a oferta usa "Todos os cursos". Confira também o direito à Mostra.
        </p>
      )}
      <Link href="/admin/professor/jornada-adulta" className="text-primary underline">
        Configurar a jornada adulta
      </Link>
    </section>
  )
}
