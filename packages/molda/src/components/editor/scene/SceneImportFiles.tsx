import { NATIVE_IMPORT_COPY as copy } from '../../../core/nativeImportCopy'
import type { LocalImportBundle, LocalImportChosenFile } from '../../../import/localImportBundle'
import { importField, importFileLabel } from './sceneImportStyles'

/** Browser file inputs are reset after capture so the same selection can be tried again. */
export function SceneImportFiles({
  name,
  accept,
  canAppend,
  choose,
}: {
  name: string
  accept: string
  canAppend: boolean
  choose(files: readonly LocalImportChosenFile[], append?: boolean): Promise<void>
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <label className={importFileLabel}>
        {copy.choose}
        <input
          name={`${name}Files`}
          type="file"
          multiple
          accept={accept}
          className="sr-only"
          aria-label={copy.choose}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? [])
            event.target.value = ''
            void choose(files)
          }}
        />
      </label>
      <label className={importFileLabel}>
        {copy.folder}
        <input
          name={`${name}Folder`}
          type="file"
          multiple
          className="sr-only"
          aria-label={copy.folder}
          ref={(input) => {
            input?.setAttribute('webkitdirectory', '')
          }}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? [])
            event.target.value = ''
            void choose(files)
          }}
        />
      </label>
      {canAppend && (
        <label className={importFileLabel}>
          {copy.companions}
          <input
            name={`${name}Companions`}
            type="file"
            multiple
            className="sr-only"
            aria-label={copy.companions}
            onChange={(event) => {
              const files = Array.from(event.target.files ?? [])
              event.target.value = ''
              void choose(files, true)
            }}
          />
        </label>
      )}
    </div>
  )
}
export function SceneImportSelection({
  name,
  bundle,
  entryPath,
  placeholder,
  missing,
  setEntry,
}: {
  name: string
  bundle: LocalImportBundle
  entryPath: string | null
  placeholder: string
  missing?: string[]
  setEntry(path: string): void
}) {
  return (
    <>
      {!!bundle.entries.length && (
        <label className="block text-sm font-bold">
          {copy.principal}
          <select
            name={`${name}Entry`}
            className={importField}
            value={entryPath ?? ''}
            onChange={(event) => setEntry(event.target.value)}
          >
            <option value="" disabled>
              {placeholder}
            </option>
            {bundle.entries.map((path) => (
              <option key={path} value={path}>
                {path}
              </option>
            ))}
          </select>
        </label>
      )}
      {missing && (
        <section aria-label={copy.missing} className="rounded-xl border border-mld-border p-3">
          <h3 className="font-bold">{copy.missing}</h3>
          <ul className="mt-2 max-h-52 list-disc overflow-y-auto pl-5 text-sm">
            {missing.map((path) => (
              <li key={path} className="break-all">
                {path}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
