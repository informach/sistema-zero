/**
 * Formulário do tamanho PERSONALIZADO, compartilhado pelos dois wizards
 * (Criar novo + Trazer uma foto). Campo vazio mostra a AJUDA (não erro) e um
 * valor fora da faixa vira erro no MESMO <p role="status"> — o padrão do
 * nameError do passo de nome. Sem botão próprio: quem conclui é o "Avançar"
 * do passo (que desabilita enquanto a combinação é inválida).
 */
import type { JSX } from 'react'
import { COPY } from '../../core/copy'
import {
  type CustomFieldId,
  type CustomSizeSpec,
  type CustomSizeValues,
  parseCustomInt,
} from './customSize'

const FIELD_LABELS = COPY.newAsset.customSize

export interface CustomSizeFieldsProps {
  spec: CustomSizeSpec
  values: CustomSizeValues
  onChange: (field: CustomFieldId, raw: string) => void
  /** Prefixo dos ids (help/inputs) — distinto por wizard, como os ids literais existentes. */
  idPrefix: string
}

export function CustomSizeFields({
  spec,
  values,
  onChange,
  idPrefix,
}: CustomSizeFieldsProps): JSX.Element {
  const invalidField = spec.fields.find(
    (field) =>
      values[field].trim() !== '' && parseCustomInt(values[field], spec.min, spec.max) === null,
  )
  const helpId = `${idPrefix}-help`
  return (
    <div className="flex flex-col gap-2">
      <div className={`grid gap-3 ${spec.fields.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {spec.fields.map((field, index) => {
          const id = `${idPrefix}-${field}`
          const raw = values[field]
          const invalid = raw.trim() !== '' && parseCustomInt(raw, spec.min, spec.max) === null
          return (
            <div key={field} className="flex flex-col gap-1">
              <label htmlFor={id} className="text-sm font-bold text-pin-muted">
                {FIELD_LABELS[field]}
              </label>
              <input
                id={id}
                // biome-ignore lint/a11y/noAutofocus: o formulário acabou de ser REVELADO pelo toque no card — levar o foco ao 1º campo é o gesto esperado (mesmo padrão dos inputs de nome dos wizards).
                autoFocus={index === 0}
                value={raw}
                onChange={(event) => onChange(field, event.target.value)}
                inputMode="numeric"
                autoComplete="off"
                aria-invalid={invalid || undefined}
                aria-describedby={helpId}
                className="min-h-11 rounded-xl border-2 border-pin-border bg-pin-bg px-4 text-base outline-none focus:border-pin-accent"
              />
            </div>
          )
        })}
      </div>
      {/* role=status: o leitor de tela anuncia quando a ajuda vira erro. */}
      <p id={helpId} role="status" className="text-sm text-pin-muted">
        {invalidField
          ? FIELD_LABELS.rangeError(FIELD_LABELS[invalidField], spec.min, spec.max)
          : FIELD_LABELS.help(spec.min, spec.max)}
      </p>
    </div>
  )
}
