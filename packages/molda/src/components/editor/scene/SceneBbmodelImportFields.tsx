import type { BbmodelNativeOptions } from '../../../import/bbmodelNativeOptions'
import type { BbmodelImportField, BbmodelImportOptions } from './bbmodelImportFields'
import { SceneImportSelect } from './SceneImportSelect'

export interface BbmodelImportOptionsProps {
  options: BbmodelImportOptions
  change(value: BbmodelNativeOptions): void
}

export function SceneBbmodelImportFields({
  fields,
  options,
  change,
}: BbmodelImportOptionsProps & { fields: BbmodelImportField[] }) {
  return fields.map((field) => (
    <SceneImportSelect
      key={field.name}
      name={field.name}
      label={field.label}
      choices={field.choices}
      value={field.value(options)}
      change={(value) => change(field.change(options, value))}
    />
  ))
}
