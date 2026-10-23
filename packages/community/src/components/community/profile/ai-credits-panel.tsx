import {
  type AiCreditsScope,
  type AiCreditsView,
  diaCivilPorExtenso,
  resolveAiCredits,
} from '@sistemazero/core/ai-credits'
import { Meter } from './meter'

/**
 * O aviso de transparência: o ÚNICO lugar da comunidade adulta que diz "inteligência artificial"
 * (o guarda `tests/copy-sem-ia.test.ts` só aceita este trecho). Diz o que o Zappy e o Pensa são.
 */
export const AI_DISCLOSURE =
  'O Zappy e o Pensa são assistentes virtuais, feitos com inteligência artificial. Quem responde não é uma pessoa da equipe.'

/**
 * O que gasta crédito, inteiro e verdadeiro: além das perguntas e pedidos, a descrição automática
 * do Mural (`server/openrouter.ts`) e o "Construir" do Pro (`server/studio-builder.ts`) reservam do
 * mesmo total no member-shell.
 */
export const CREDIT_USES =
  'Cada pergunta ao Zappy ou pedido ao Pensa usa um crédito. A descrição automática ao publicar no Mural também usa, assim como construir com o Zappy no modo Pro.'

const creditos = (n: number) => (n === 1 ? 'crédito' : 'créditos')

/**
 * O aviso de créditos esgotados mora AQUI, não no `meter.exhausted` do core: a frase de lá ainda
 * fala em "ajuda da IA", e a comunidade adulta nomeia o recurso (pedido dela, 20/10/2026).
 */
function exhaustedText(scope: AiCreditsScope | undefined): string {
  const titulo =
    scope === 'month' ? 'Os créditos deste mês acabaram' : 'Os créditos de hoje acabaram'
  return `${titulo}. As ferramentas continuam abertas, só sem o Zappy e o Pensa até renovar.`
}

/**
 * "Quanto resta" dos créditos do Zappy e do Pensa (direção de arte de 18/10/2026): o mesmo dado do
 * cartão de créditos da área dos pais no Kids, só que para o dono da conta. Ler não consome crédito.
 * O vocabulário (créditos, o Zappy, o Pensa; "IA" só no aviso de transparência) está no CLAUDE.md.
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
            A sua conta usa o Zappy e o Pensa sem um teto de créditos por dia ou por mês.
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
              {exhaustedText(meter.scope)}
            </p>
          ) : null}
        </>
      )}
      <p className="text-[0.9rem] text-muted-foreground">
        {CREDIT_USES}
        {/* Esgotado, o aviso acima já diz o que acontece até renovar: a frase sai daqui. */}
        {meter.state === 'exhausted'
          ? null
          : ` Quando os créditos acabam, as ferramentas continuam abertas, só sem o Zappy e o Pensa até renovar.`}
      </p>
      <p className="text-[0.9rem] text-muted-foreground">{AI_DISCLOSURE}</p>
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
          de {limit} {creditos(limit)}
        </span>
      </span>
      <Meter
        value={left}
        max={limit}
        label={`${left} de ${limit} ${creditos(limit)} restantes ${scopeLabel}`}
      />
      <span className="text-[0.9rem] text-muted-foreground">{renews}</span>
    </div>
  )
}
