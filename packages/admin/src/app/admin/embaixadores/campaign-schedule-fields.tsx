'use client'
import { type CampaignSchedule, campaignScheduleWindows } from '@sistemazero/core/referrals'
import { Input } from '@sistemazero/ui/input'

const day = (iso: string, last = false) =>
  new Date(Date.parse(iso) - (last ? 1 : 0)).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
  })
export function CampaignScheduleFields({
  value,
  onChange,
}: {
  value: CampaignSchedule
  onChange: (value: CampaignSchedule) => void
}) {
  let dates: ReturnType<typeof campaignScheduleWindows> | null = null
  try {
    dates = campaignScheduleWindows(value)
  } catch {
    /* O submit apresenta o erro completo. */
  }
  return (
    <fieldset className="space-y-4 rounded-xl border border-primary/25 bg-primary/5 p-4">
      <legend className="px-1 text-sm font-bold">Calendário da campanha</legend>
      <p className="text-sm text-muted-foreground">
        Escolha a data do encontro. Os prazos abaixo acompanham essa data automaticamente, no
        horário de Brasília.
      </p>
      <label className="block space-y-1 text-sm font-semibold">
        Data da campanha
        <Input
          type="date"
          required
          min="2020-01-01"
          max="2099-12-31"
          value={value.eventDate}
          onChange={(e) => onChange({ ...value, eventDate: e.target.value })}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-semibold">
          Dias para resgatar o presente
          <Input
            type="number"
            required
            min={1}
            max={365}
            step={1}
            value={value.giftClaimDays || ''}
            onChange={(e) => onChange({ ...value, giftClaimDays: Number(e.target.value) })}
          />
        </label>
        <label className="space-y-1 text-sm font-semibold">
          Dias para usar o cupom, se houver
          <Input
            type="number"
            required
            min={1}
            max={365}
            step={1}
            value={value.couponClaimDays || ''}
            onChange={(e) => onChange({ ...value, couponClaimDays: Number(e.target.value) })}
          />
        </label>
      </div>
      {dates && (
        <div className="grid gap-3 text-sm sm:grid-cols-2" aria-live="polite">
          <p className="rounded-lg bg-background p-3">
            <strong className="block">Presente gratuito</strong>
            {day(dates.startsAt)} a {day(dates.giftEndsAt, true)}, até 23h59.
          </p>
          <p className="rounded-lg bg-background p-3">
            <strong className="block">Cupom de desconto</strong>
            {day(dates.startsAt)} a {day(dates.couponEndsAt, true)}, até 23h59.
          </p>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        O dia da campanha conta como o primeiro dia. Alterar a data não muda o vencimento dos
        acessos já concedidos.
      </p>
    </fieldset>
  )
}
