import Link from 'next/link'
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
      className="rounded-xl border p-4 text-sm space-y-3"
      aria-label="Contrato técnico adulto"
    >
      <h3 className="font-semibold">Contrato técnico adulto</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        <dt>Aluno</dt>
        <dd>A própria conta; sem perfil familiar.</dd>
        <dt>Entrega</dt>
        <dd>
          {live
            ? 'Vaga ativa na turma e permissões dos encontros.'
            : 'Matrícula do curso gravado pelo catálogo e pagamentos.'}
        </dd>
        <dt>Referência</dt>
        <dd>
          <code>{slug || 'Defina o slug do curso'}</code>
        </dd>
        <dt>Ferramentas da aula</dt>
        <dd>Autorizadas pela aula liberada. Não exigem produto livre adicional.</dd>
        <dt>Blocos conquistados</dt>
        <dd>
          {live
            ? `${blocks} blocos configurados; concedidos ao concluir a oficina, sem exigir publicação no Mural.`
            : `${blocks} blocos configurados; a conclusão preserva as ferramentas conquistadas.`}
        </dd>
      </dl>
      <p>
        Os blocos conquistados ficam registrados mesmo sem licença do Estúdio Completo. O acesso ao
        produto é verificado separadamente.
      </p>
      <p>
        Estúdio, Pinta, Molda e Pensa livres dependem das licenças adultas e das liberações da
        jornada. IA e voz exigem formação avançada; a voz depende também da preferência do aluno.
      </p>
      {live ? (
        <p className="text-amber-700">
          O fluxo atual de vagas é administrado pela equipe. A venda automática de vaga exige
          integração específica de reserva, pagamento e estorno.
        </p>
      ) : (
        <p>
          Uma oferta deve entregar este curso pelo seu slug. Acesso total adulto usa{' '}
          <code>all_courses</code>. Revise também o direito à Mostra.
        </p>
      )}
      <Link href="/admin/professor/jornada-adulta" className="text-primary underline">
        Configurar a jornada adulta
      </Link>
    </section>
  )
}
