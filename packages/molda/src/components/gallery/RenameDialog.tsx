import type { FormEvent, JSX } from 'react'
import { useEffect, useState } from 'react'
import { COPY } from '../../core/copy'
import type { MoldaAsset } from '../../core/model'
import { normalizeAssetName } from '../../core/names'
import { useGallery, useMoldaApp } from '../appContext'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { useToast } from '../ui/Toast'

export function RenameDialog({
  asset,
  onClose,
}: {
  asset: MoldaAsset | null
  onClose: () => void
}): JSX.Element | null {
  const { gallery } = useMoldaApp()
  const names = useGallery((state) => state.assets)
  const { showToast } = useToast()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setValue(asset?.name ?? '')
    setError(null)
  }, [asset])

  const normalized = normalizeAssetName(value)
  const taken =
    normalized !== null &&
    normalized !== asset?.name &&
    names.some((item) => item.name === normalized)

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!asset || busy) return
    if (!normalized) {
      setError(COPY.newAsset.nameInvalid)
      return
    }
    if (taken) {
      setError(COPY.newAsset.nameTaken)
      return
    }
    setBusy(true)
    const result = await gallery.getState().rename(asset.id, normalized)
    setBusy(false)
    switch (result) {
      case 'ok':
        showToast(COPY.toast.renamed)
        onClose()
        return
      case 'taken':
        setError(COPY.newAsset.nameTaken)
        return
      case 'open':
        setError(COPY.rename.open)
        return
      case 'missing':
        onClose()
        return
      default:
        setError(COPY.newAsset.nameInvalid)
    }
  }

  return (
    <Dialog open={asset !== null} onClose={onClose} title={COPY.rename.title}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold text-mld-text">{COPY.rename.label}</span>
          <input
            autoFocus
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              setError(null)
            }}
            maxLength={48}
            className="min-h-11 rounded-xl border-2 border-mld-border bg-mld-bg px-3 text-base text-mld-text focus-visible:border-mld-accent focus-visible:outline-none"
            aria-invalid={error !== null}
          />
          <span className="text-xs text-mld-muted">{COPY.newAsset.nameHint}</span>
          {error ? (
            <span role="alert" className="text-sm font-bold text-mld-danger">
              {error}
            </span>
          ) : null}
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {COPY.rename.cancel}
          </Button>
          <Button variant="primary" type="submit" disabled={busy || !normalized || taken}>
            {COPY.rename.save}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
