import {
  type AiCreditsView,
  diaCivilPorExtenso,
  resolveAiCredits,
} from '@sistemazero/core/ai-credits'
import { Meter } from './meter'

const pedidos = (n: number) => (n === 1 ? 'pedido' : 'pedidos')

/**
 * "Quanto resta" da ajuda da IA (direção de arte de 18/10/2026): o mesmo dado do cartão "Ajuda da
 * IA neste mês" da área dos pais no Kids, só que para o dono da conta. Ler não consome crédito.
 * Sem dado (members fora), um recado; nunca "0 restantes".
 */
export function AiCreditsPanel({ credits }: { credits: AiCreditsView | null }) {
  const meter = resolveAiCredits(credits, { audience: 'adult' })
  return (
    <div className="flex flex-col gap-3.5">
      <h3 className="sz-h4">Quanto resta</h3>
      {!credits || meter.state === 'unknown' ? (
        <p role="status" className="sz-soft px-5 py-4 text-muted-foreground">
          Não foi possível ver quanto resta agora. Tente atualizar a página.
        </p>
      ) : credits.unlimited ? (
        <div className="sz-soft flex flex-col gap-1 px-5 py-4">
          <strong className="sz-h3">Sem limite</strong>
          <span className="text-[0.9rem] text-muted-foreground">
            A sua conta pode pedir ajuda à IA sem um teto por dia ou por mês.
          </span>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <CreditsTile
              label="Hoje"
              remaining={credits.dayRemaining}
              limit={credits.dayLimit}
              scopeLabel="hoje"
              renews="Amanhã de manhã começa de novo."
            />
            <CreditsTile
              label="Neste mês"
              remaining={credits.monthRemaining}
              limit={credits.monthLimit}
              scopeLabel="neste mês"
              renews={`Renova em ${diaCivilPorExtenso(credits.monthRenewsOn)}.`}
            />
          </div>
          {meter.state === 'exhausted' ? (
            <p
              role="status"
              className="sz-chip sz-chip-aviso h-auto self-start whitespace-normal py-1.5"
            >
              {meter.exhausted}
            </p>
          ) : null}
        </>
      )}
      <p className="text-[0.9rem] text-muted-foreground">
        Cada pergunta ao tutor ou pedido ao Pensa conta um. Quando acabam, as ferramentas continuam
        abertas, só sem a ajuda da IA até renovar.
      </p>
    </div>
  )
}

function CreditsTile({
  label,
  remaining,
  limit,
  scopeLabel,
  renews,
}: {
  label: string
  remaining: number
  limit: number
  scopeLabel: string
  renews: string
}) {
  const left = Math.max(0, Math.min(remaining, limit))
  return (
    <div className="sz-soft flex flex-col gap-2.5 px-5 py-5">
      <span className="text-[0.9rem] text-muted-foreground">{label}</span>
      <span>
        <strong className="sz-display text-[1.6rem]">{left}</strong>{' '}
        <span className="text-muted-foreground">
          de {limit} {pedidos(limit)}
        </span>
      </span>
      <Meter
        value={left}
        max={limit}
        label={`${left} de ${limit} ${pedidos(limit)} restantes ${scopeLabel}`}
      />
      <span className="text-[0.9rem] text-muted-foreground">{renews}</span>
    </div>
  )
}
