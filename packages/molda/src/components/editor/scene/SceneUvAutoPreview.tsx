import { useEffect, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { SceneMeshGeometry } from '../../../scene/document'
import { Button } from '../../ui/Button'
import { SceneUvCanvas } from './SceneUvCanvas'
import { SceneUvCutPicker } from './SceneUvCutPicker'
import { SCENE_APPEARANCE_FIELD as field } from './sceneAppearanceForm'
import { useSceneUvPreview } from './useSceneUvPreview'

export function SceneUvAutoPreview({
  mesh,
  sourceKey,
  ids,
  onApply,
  disabled,
}: {
  mesh: SceneMeshGeometry
  sourceKey: string
  ids: readonly string[]
  onApply(mesh: SceneMeshGeometry): void
  disabled: boolean
}) {
  const preview = useSceneUvPreview(mesh, sourceKey, ids, onApply, disabled)
  const [padding, setPadding] = useState('0.01')
  const [method, setMethod] = useState<'faces' | 'connected'>('faces')
  const [preserveCuts, setPreserveCuts] = useState(false)
  const [cutPanel, setCutPanel] = useState(false)
  const [cutSession, setCutSession] = useState<{
    mesh: SceneMeshGeometry
    sourceKey: string
    selectionKey: string
    cuts: readonly string[]
  } | null>(null)
  const selectionKey = JSON.stringify(ids)
  const customCuts =
    cutSession?.mesh === mesh &&
    cutSession.sourceKey === sourceKey &&
    cutSession.selectionKey === selectionKey
      ? cutSession.cuts
      : []
  useEffect(() => {
    setCutSession((owner) =>
      owner &&
      (owner.mesh !== mesh || owner.sourceKey !== sourceKey || owner.selectionKey !== selectionKey)
        ? null
        : owner,
    )
  }, [mesh, sourceKey, selectionKey])
  const value = Number(padding)
  const valid = padding.trim() !== '' && Number.isFinite(value) && value >= 0 && value <= 0.25
  const copy = COPY.scene
  return (
    <section
      className="space-y-2 rounded-lg border border-mld-border p-3"
      aria-label={copy.uvAutoTitle}
    >
      <h4 className="text-sm font-bold">{copy.uvAutoTitle}</h4>
      <label className="block space-y-1 text-sm">
        <span>{copy.uvAutoMethod}</span>
        <select
          name="uvAutoMethod"
          value={method}
          className={field}
          onChange={(event) => {
            const value = event.target.value
            if (value !== 'faces' && value !== 'connected') return
            preview.cancel()
            setMethod(value)
          }}
        >
          <option value="faces">{copy.uvAutoFaces}</option>
          <option value="connected">{copy.uvAutoConnected}</option>
        </select>
      </label>
      <p className="text-xs text-mld-muted">
        {method === 'faces' ? copy.uvAutoHint : copy.uvUnfoldHint}
      </p>
      {method === 'connected' && (
        <>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              name="uvPreserveCuts"
              type="checkbox"
              checked={preserveCuts}
              className="size-5 accent-mld-accent"
              onChange={(event) => {
                preview.cancel()
                setPreserveCuts(event.target.checked)
              }}
            />
            {copy.uvPreserveCuts}
          </label>
          <p className="text-xs text-mld-muted">{copy.uvPreserveCutsHint}</p>
          <p role="status" className="text-xs text-mld-muted">
            {copy.uvCutCount(customCuts.length)}
          </p>
          <details open={cutPanel} onToggle={(event) => setCutPanel(event.currentTarget.open)}>
            <summary className="min-h-11 cursor-pointer py-3 text-sm">{copy.uvCutTitle}</summary>
            {cutPanel && (
              <SceneUvCutPicker
                key={`${sourceKey}:${selectionKey}`}
                mesh={mesh}
                ids={ids}
                cuts={customCuts}
                onChange={(cuts) => {
                  preview.cancel()
                  setCutSession({ mesh, sourceKey, selectionKey, cuts })
                }}
              />
            )}
          </details>
        </>
      )}
      <label className="block space-y-1 text-sm">
        <span>{copy.uvAutoMargin}</span>
        <input
          name="uvAutoPadding"
          type="number"
          min={0}
          max={0.25}
          step="any"
          className={field}
          value={padding}
          aria-invalid={!valid}
          onChange={(event) => {
            preview.cancel()
            setPadding(event.target.value)
          }}
        />
      </label>
      {preview.error && (
        <p role="alert" className="text-sm text-mld-danger">
          {preview.error}
        </p>
      )}
      {preview.busy ? (
        <p role="status" className="text-sm text-mld-muted">
          {copy.uvAutoBusy}
        </p>
      ) : (
        <Button
          className="w-full text-sm"
          disabled={disabled || !ids.length || !valid}
          onClick={() =>
            void preview.prepare(
              value,
              method === 'connected' ? { cuts: customCuts, preserveCuts } : undefined,
            )
          }
        >
          {copy.uvAutoPrepare}
        </Button>
      )}
      {preview.result && (
        <>
          <SceneUvCanvas mesh={preview.result} ids={ids} label={copy.uvAutoPreview} />
          <p className="text-xs text-mld-muted">{copy.uvAutoConfirmHint(ids.length)}</p>
          <Button className="w-full text-sm" onClick={preview.confirm}>
            {copy.uvAutoConfirm}
          </Button>
        </>
      )}
      {(preview.busy || preview.result) && (
        <Button className="w-full text-sm" onClick={preview.cancel}>
          {copy.uvAutoCancel}
        </Button>
      )}
    </section>
  )
}
