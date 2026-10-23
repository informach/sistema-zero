import { Eye } from 'lucide-react'

/**
 * A faixa de só leitura (a sala da equipe, 23/10/2026): quem é da equipe vê a tela inteira e
 * entende por que os botões estão apagados, em vez de ver botões sumirem sem explicação. Quem
 * decide é o gateway, que reautoriza cada escrita; a faixa só conta a regra.
 */
export function ReadOnlyNotice({
  who = 'Admin',
  children,
}: {
  /** Quem muda aqui (o padrão é Admin, que também cobre Superadmin). */
  who?: string
  /** Uma frase a mais, quando a tela tem um caminho para a equipe (avisar no grupo, por exemplo). */
  children?: React.ReactNode
}) {
  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-2xl bg-warning-tint px-4 py-3 text-[15px] text-warning"
    >
      <Eye className="mt-0.5 size-[18px] shrink-0" aria-hidden />
      <p>
        <b>Só leitura.</b> Você pode ver esta tela. Quem muda aqui é {who}.
        {children ? <> {children}</> : null}
      </p>
    </div>
  )
}
