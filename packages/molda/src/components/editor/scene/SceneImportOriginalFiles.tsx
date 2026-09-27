import { useState } from 'react'
import { NATIVE_IMPORT_COPY as copy } from '../../../core/nativeImportCopy'
import { triggerDownload } from '../../../export/download'
import type { LocalImportBundle } from '../../../import/localImportBundle'
import { Button } from '../../ui/Button'
import { importDisclosure as disclosure, importField as field } from './sceneImportStyles'

export function SceneImportOriginalFiles({
  bundle,
  name,
}: {
  bundle: LocalImportBundle
  name: string
}) {
  const [chosen, setChosen] = useState(''),
    [failed, setFailed] = useState(false),
    selected = bundle.files.find((file) => file.path === chosen) ?? bundle.files[0]
  return (
    <details className="rounded-xl border border-mld-border p-3">
      <summary className={disclosure}>{copy.originals}</summary>
      <label className="block text-sm">
        {copy.originals}
        <select
          name={name}
          className={field}
          value={selected?.path ?? ''}
          onChange={(event) => {
            setChosen(event.target.value)
            setFailed(false)
          }}
        >
          {bundle.files.map((file) => (
            <option key={file.path} value={file.path}>
              {file.path}
            </option>
          ))}
        </select>
      </label>
      {selected && (
        <Button
          className="mt-2 max-w-full break-all text-sm"
          onClick={() => {
            try {
              setFailed(
                !triggerDownload(
                  new Blob([new Uint8Array(selected.bytes)]),
                  selected.path.split('/').at(-1)!,
                ),
              )
            } catch {
              setFailed(true)
            }
          }}
        >
          {copy.downloadOriginal(selected.path)}
        </Button>
      )}
      {failed && (
        <p role="alert" className="text-sm text-mld-danger">
          {copy.downloadFailed}
        </p>
      )}
    </details>
  )
}
