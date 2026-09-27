import { useMemo } from 'react'
import { COPY } from '../../../core/copy'
import { sceneRasterPreview } from '../../../scene/imageImport'
import { type SceneStampSettings, sceneStampSize } from '../../../scene/imageStamp'
import { Button } from '../../ui/Button'
import { SceneImagePreview } from './SceneImagePreview'
import { SceneRasterFileInput } from './SceneRasterFileInput'
import { SCENE_APPEARANCE_FIELD as field } from './sceneAppearanceForm'
import type { useScenePaint } from './useScenePaint'

export function ScenePaintStampTools({ paint }: { paint: ReturnType<typeof useScenePaint> }) {
  const { stampFile: file, stampSettings: settings } = paint
  const preview = useMemo(
    () => (file.data ? sceneRasterPreview(file.data.raster, file.data.name) : null),
    [file.data],
  )
  const size = preview ? sceneStampSize(preview, settings) : null
  const rotated = preview ? sceneStampSize(preview, { ...settings, scale: 1 }) : null
  const copy = COPY.scene
  return (
    <div className="space-y-2">
      <p className="text-xs text-mld-muted">{copy.paintStampHint}</p>
      <SceneRasterFileInput
        name="paintStampFile"
        disabled={paint.busy}
        onChoose={(selected) => {
          void file.choose(selected)
        }}
      />
      <Button
        className="w-full text-sm"
        disabled={!paint.scope || paint.data?.image.encoding !== 'rgba'}
        onClick={paint.captureStamp}
      >
        {copy.paintStampCapture}
      </Button>
      <p className="text-xs text-mld-muted">{copy.paintStampCaptureHint}</p>
      {file.error && (
        <p role="alert" className="text-sm text-mld-danger">
          {copy.imageImportErrors[file.error]}
        </p>
      )}
      {preview && size && rotated && (
        <>
          <p className="break-words text-sm">
            {preview.name} · {size.width} × {size.height}
          </p>
          <div
            role="img"
            aria-label={copy.paintStampPreview}
            className="relative w-full overflow-hidden"
            style={{
              aspectRatio: `${rotated.width} / ${rotated.height}`,
              maxWidth: (256 * rotated.width) / rotated.height,
            }}
          >
            <div
              className="absolute left-1/2 top-1/2"
              style={{
                width: `${(preview.width / rotated.width) * 100}%`,
                height: `${(preview.height / rotated.height) * 100}%`,
                transform: `translate(-50%, -50%) scale(${settings.flipX ? -1 : 1}, ${settings.flipY ? -1 : 1}) rotate(${settings.turns * 90}deg)`,
              }}
            >
              <SceneImagePreview
                image={preview}
                palette={[]}
                base={[0, 0, 0, 0]}
                maxHeight={(256 * preview.height) / rotated.height}
              />
            </div>
          </div>
          <label className="block space-y-1 text-sm">
            <span>{copy.paintStampScale}</span>
            <select
              name="paintStampScale"
              value={settings.scale}
              className={field}
              onChange={(event) =>
                paint.setStampSettings({ ...settings, scale: Number(event.target.value) })
              }
            >
              {[1, 2, 3, 4].map((scale) => (
                <option key={scale} value={scale}>
                  {scale}×
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span>{copy.paintStampRotation}</span>
            <select
              name="paintStampRotation"
              value={settings.turns}
              className={field}
              onChange={(event) =>
                paint.setStampSettings({
                  ...settings,
                  turns: Number(event.target.value) as SceneStampSettings['turns'],
                })
              }
            >
              {[0, 1, 2, 3].map((turn) => (
                <option key={turn} value={turn}>
                  {turn * 90}°
                </option>
              ))}
            </select>
          </label>
          {(['flipX', 'flipY'] as const).map((axis) => (
            <label key={axis} className="flex min-h-11 items-center gap-2 text-sm">
              <input
                name={`paintStamp-${axis}`}
                type="checkbox"
                checked={settings[axis]}
                className="size-5 accent-mld-accent"
                onChange={(event) =>
                  paint.setStampSettings({ ...settings, [axis]: event.target.checked })
                }
              />
              {copy.paintStampFlips[axis]}
            </label>
          ))}
          <Button className="w-full text-sm" onClick={file.clear}>
            {copy.paintStampClear}
          </Button>
        </>
      )}
    </div>
  )
}
