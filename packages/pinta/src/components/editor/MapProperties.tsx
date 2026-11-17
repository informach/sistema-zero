import type { JSX } from 'react'
import { COPY } from '../../core/copy'
import { sanitizeObjectProperties, type TilemapObjectPropertyValue } from '../../core/project'
import { Button } from '../ui/Button'
import { PropertyRow } from './MapObjectPanel'

export function MapProperties({
  value = {},
  onChange,
}: {
  value?: Record<string, TilemapObjectPropertyValue>
  onChange: (v: Record<string, TilemapObjectPropertyValue>) => void
}): JSX.Element {
  return (
    <details>
      <summary className="cursor-pointer text-xs font-bold text-pin-muted">
        {COPY.scene.propriedades}
      </summary>
      <div className="mt-2 flex flex-col gap-1">
        {Object.entries(value).map(([key, v]) => (
          <PropertyRow
            key={key}
            propertyKey={key}
            value={v}
            onRename={(name) => {
              if (name !== key && name in value) return
              const next = { ...value }
              delete next[key]
              next[name] = v
              onChange(sanitizeObjectProperties(next))
            }}
            onChange={(next) => onChange(sanitizeObjectProperties({ ...value, [key]: next }))}
            onRemove={() => {
              const next = { ...value }
              delete next[key]
              onChange(next)
            }}
          />
        ))}
        <Button
          variant="barOutline"
          disabled={Object.keys(value).length >= 16}
          onClick={() => {
            let n = 1
            while (`propriedade${n}` in value) n++
            onChange({ ...value, [`propriedade${n}`]: '' })
          }}
        >
          {COPY.scene.adicionarPropriedade}
        </Button>
      </div>
    </details>
  )
}
