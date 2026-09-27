import { clsx } from 'clsx'
import { COPY } from '../../../core/copy'

export function SceneRasterFileInput({
  name,
  disabled,
  onChoose,
}: {
  name: string
  disabled: boolean
  onChoose(file: File): void
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span>{COPY.scene.imageImportChoose}</span>
      <input
        name={name}
        type="file"
        accept="image/png,image/jpeg,.png,.jpg,.jpeg"
        disabled={disabled}
        className={clsx(
          'min-h-11 w-full min-w-0 text-sm',
          'file:mr-2 file:min-h-11 file:rounded-lg file:border file:border-mld-border',
          'file:bg-mld-surface file:px-2 file:text-mld-text',
          'focus-visible:outline-2 focus-visible:outline-mld-accent',
        )}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ''
          if (file) onChoose(file)
        }}
      />
    </label>
  )
}
