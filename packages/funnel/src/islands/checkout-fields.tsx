import type { ReactNode } from 'react'

// Bits de formulário compartilhados pelas ilhas de boleto e cartão. NÃO é uma
// ilha hidratada por si — é importado pelas ilhas (que carregam o client:).

export const inputClass =
  'w-full rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-lime'

export function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: o controle é passado via children (associação implícita do <label> em runtime)
    <label className="block">
      <span className="mb-1 block text-sm text-muted">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  )
}

export interface AddressValue {
  street: string
  number: string
  neighborhood: string
  zipcode: string
  city: string
  state: string
  complement: string
}

export const emptyAddress: AddressValue = {
  street: '',
  number: '',
  neighborhood: '',
  zipcode: '',
  city: '',
  state: '',
  complement: '',
}

/** Grupo de campos de endereço controlado. `errors` chaveado por `address.<campo>`. */
export function AddressFields({
  value,
  errors,
  onChange,
}: {
  value: AddressValue
  errors: Record<string, string>
  onChange: (key: keyof AddressValue, v: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <Field label="Endereço (rua/av.)" error={errors['address.street']}>
          <input
            className={inputClass}
            autoComplete="address-line1"
            value={value.street}
            onChange={(e) => onChange('street', e.target.value)}
          />
        </Field>
      </div>
      <Field label="Número" error={errors['address.number']}>
        <input
          className={inputClass}
          inputMode="numeric"
          value={value.number}
          onChange={(e) => onChange('number', e.target.value)}
        />
      </Field>
      <Field label="Bairro" error={errors['address.neighborhood']}>
        <input
          className={inputClass}
          value={value.neighborhood}
          onChange={(e) => onChange('neighborhood', e.target.value)}
        />
      </Field>
      <Field label="CEP" error={errors['address.zipcode']}>
        <input
          className={inputClass}
          inputMode="numeric"
          autoComplete="postal-code"
          value={value.zipcode}
          onChange={(e) => onChange('zipcode', e.target.value)}
        />
      </Field>
      <Field label="Cidade" error={errors['address.city']}>
        <input
          className={inputClass}
          autoComplete="address-level2"
          value={value.city}
          onChange={(e) => onChange('city', e.target.value)}
        />
      </Field>
      <Field label="UF" error={errors['address.state']}>
        <input
          className={inputClass}
          maxLength={2}
          autoComplete="address-level1"
          value={value.state}
          onChange={(e) => onChange('state', e.target.value.toUpperCase())}
        />
      </Field>
      <Field label="Complemento (opcional)" error={errors['address.complement']}>
        <input
          className={inputClass}
          value={value.complement}
          onChange={(e) => onChange('complement', e.target.value)}
        />
      </Field>
    </div>
  )
}
