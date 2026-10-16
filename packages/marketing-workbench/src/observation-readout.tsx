import type { EvidenceObservation } from '@sistemazero/marketing-contracts'

const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 })
const units = {
  count: 'contagem',
  ratio: 'razão',
  percent: '%',
  seconds: 'segundos',
  other: 'unidade descrita na definição',
}
export function ObservationReadout({ value }: { value: EvidenceObservation }) {
  return (
    <section
      className="space-y-2 rounded-lg border p-3 text-sm"
      aria-label="Métricas observadas na fonte"
    >
      <p className="font-medium">
        {value.sourceType === 'public' ? 'Referência pública' : 'Dados importados'} ·{' '}
        {value.network} · {value.subject}
      </p>
      <p className="text-xs text-muted-foreground">
        Janela: {new Date(value.periodStart).toLocaleString('pt-BR')} a{' '}
        {new Date(value.periodEnd).toLocaleString('pt-BR')}. Coleta:{' '}
        {new Date(value.collectedAt).toLocaleString('pt-BR')}. Amostra:{' '}
        {value.sampleSize === null ? 'não informada' : value.sampleSize}.
      </p>
      <p className="text-xs">Cobertura: {value.coverage}</p>
      <dl className="space-y-3">
        {value.metrics.map((metric) => (
          <div key={metric.key}>
            <dt className="font-medium">{metric.label}</dt>
            <dd>
              {metric.measurement.value === null
                ? 'Indisponível'
                : number.format(metric.measurement.value)}{' '}
              · {units[metric.unit]}
            </dd>
            <p className="text-xs text-muted-foreground">
              {metric.measurement.definition} Denominador:{' '}
              {metric.measurement.denominator === null
                ? 'não informado'
                : number.format(metric.measurement.denominator)}
              .{' '}
              {metric.measurement.availability === 'legacy-ambiguous'
                ? 'Valor histórico ambíguo; não tratado como zero.'
                : ''}
            </p>
          </div>
        ))}
      </dl>
    </section>
  )
}
