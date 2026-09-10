import { importField } from './sceneImportStyles'

/** Shared controlled native choice: values only come from the declared catalog. */
export function SceneImportSelect<Value extends string>({
  label,
  name,
  value,
  choices,
  change,
}: {
  label: string
  name: string
  value: Value
  choices: ReadonlyArray<readonly [Value, string]>
  change(value: Value): void
}) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <select
        name={name}
        className={importField}
        value={value}
        onChange={(event) => {
          const selected = choices.find(([key]) => key === event.target.value)
          if (selected) change(selected[0])
        }}
      >
        {choices.map(([key, title]) => (
          <option key={key} value={key}>
            {title}
          </option>
        ))}
      </select>
    </label>
  )
}
