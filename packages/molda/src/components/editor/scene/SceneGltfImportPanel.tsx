import { GLTF_IMPORT_COPY as copy } from '../../../core/gltfImportCopy'
import { GLTF_IMPORT_ISSUE_COPY } from '../../../core/gltfImportIssueCopy'
import type { GltfConversionReport } from '../../../import/gltfConversionReport'
import type { GltfNativeOptions } from '../../../import/gltfNativeDocument'
import { Button } from '../../ui/Button'
import { SceneImportOriginalFiles } from './SceneImportOriginalFiles'
import { SceneImportPreview } from './SceneImportPreview'
import { SceneImportReport } from './SceneImportReport'
import type { SceneImportPanelProps } from './sceneImportPanelTypes'
import {
  importChoice as choice,
  importDisclosure as disclosure,
  importField as field,
  importFileLabel as fileLabel,
} from './sceneImportStyles'
import { useSceneGltfImport } from './useSceneGltfImport'

function CompatibilityOptions({
  options,
  change,
}: {
  options: GltfNativeOptions
  change(options: GltfNativeOptions): void
}) {
  const animations = options.animations ?? {},
    checks = [
      {
        fieldName: 'gltfCubic',
        name: copy.cubic,
        checked: animations.cubic === 'bake',
        apply: (checked: boolean) => ({
          ...animations,
          cubic: checked ? ('bake' as const) : ('reject' as const),
        }),
      },
      {
        fieldName: 'gltfRotations',
        name: copy.rotations,
        checked: animations.rotations === 'normalize',
        apply: (checked: boolean) => ({
          ...animations,
          rotations: checked ? ('normalize' as const) : ('preserve' as const),
        }),
      },
      {
        fieldName: 'gltfMorphs',
        name: copy.morphs,
        checked: animations.morphs === 'omit',
        apply: (checked: boolean) => ({
          ...animations,
          morphs: checked ? ('omit' as const) : ('reject' as const),
        }),
      },
      {
        fieldName: 'gltfUnresolved',
        name: copy.unresolved,
        checked: animations.unresolved === 'omit',
        apply: (checked: boolean) => ({
          ...animations,
          unresolved: checked ? ('omit' as const) : ('reject' as const),
        }),
      },
      {
        fieldName: 'gltfLoop',
        name: copy.loop,
        checked: animations.loop ?? false,
        apply: (checked: boolean) => ({ ...animations, loop: checked }),
      },
    ]
  return (
    <details className="rounded-xl border border-mld-border bg-mld-bg p-3">
      <summary className={disclosure}>{copy.options}</summary>
      <p className="py-2 text-sm text-mld-muted">{copy.optionsHint}</p>
      {checks.map((check) => (
        <label key={check.name} className={choice}>
          <input
            name={check.fieldName}
            type="checkbox"
            className="mt-0.5 size-5 shrink-0 accent-mld-accent"
            checked={check.checked}
            onChange={(event) =>
              change({ ...options, animations: check.apply(event.target.checked) })
            }
          />
          {check.name}
        </label>
      ))}
      <p className="py-2 text-sm text-mld-muted">{copy.cubicHint}</p>
      <label className="block text-sm font-bold">
        {copy.fps}
        <select
          name="gltfCurveFps"
          className={field}
          value={animations.fps ?? 30}
          onChange={(event) =>
            change({ ...options, animations: { ...animations, fps: Number(event.target.value) } })
          }
        >
          {[12, 24, 30, 60, 120].map((fps) => (
            <option key={fps} value={fps}>
              {fps}
            </option>
          ))}
        </select>
      </label>
      <label className={choice}>
        <input
          name="gltfSkinWeights"
          type="checkbox"
          className="mt-0.5 size-5 shrink-0 accent-mld-accent"
          checked={options.skinWeights === 'normalize'}
          onChange={(event) =>
            change({ ...options, skinWeights: event.target.checked ? 'normalize' : 'preserve' })
          }
        />
        {copy.weights}
      </label>
    </details>
  )
}

function ImportReport({ report }: { report: GltfConversionReport }) {
  const scope = report.source
  return (
    <SceneImportReport
      report={report}
      labels={GLTF_IMPORT_ISSUE_COPY}
      filename="molda-relatorio-glTF.json"
    >
      {scope.omittedNodes > 0 || scope.omittedScenes > 0 ? (
        <p className="text-sm">{copy.scope(scope.omittedScenes, scope.omittedNodes)}</p>
      ) : null}
      {!!scope.unhandledExtensions.length && (
        <p className="text-sm">{copy.extensions(scope.unhandledExtensions.length)}</p>
      )}
      {!!scope.unknownChunkTypes.length && (
        <p className="text-sm">{copy.chunks(scope.unknownChunkTypes.length)}</p>
      )}
    </SceneImportReport>
  )
}

/** Lazy modal content: reading, conversion and review never replace the live editor's asset. */
export function SceneGltfImportPanel({
  editor,
  onClose,
  onImported,
  viewportFactory,
  canAdopt,
  blocked = false,
}: SceneImportPanelProps) {
  const task = useSceneGltfImport(editor, { canAdopt }),
    { view } = task,
    { stage, bundle, inspection } = view,
    busy = stage.kind === 'busy' || stage.kind === 'reading-files'
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed">{copy.intro}</p>
      <p className="text-sm leading-relaxed text-mld-muted">{copy.filesHint}</p>
      <div className="flex flex-wrap gap-2">
        <label className={fileLabel}>
          {copy.choose}
          <input
            name="gltfFiles"
            type="file"
            multiple
            accept=".glb,.gltf,.bin,.png,.jpg,.jpeg"
            className="sr-only"
            aria-label={copy.choose}
            onChange={(event) => {
              const files = Array.from(event.target.files ?? [])
              event.target.value = ''
              void task.choose(files)
            }}
          />
        </label>
        <label className={fileLabel}>
          {copy.folder}
          <input
            name="gltfFolder"
            type="file"
            multiple
            ref={(input) => {
              input?.setAttribute('webkitdirectory', '')
            }}
            className="sr-only"
            aria-label={copy.folder}
            onChange={(event) => {
              const files = Array.from(event.target.files ?? [])
              event.target.value = ''
              void task.choose(files)
            }}
          />
        </label>
        {bundle && (
          <label className={fileLabel}>
            {copy.companions}
            <input
              name="gltfCompanions"
              type="file"
              multiple
              className="sr-only"
              aria-label={copy.companions}
              onChange={(event) => {
                const files = Array.from(event.target.files ?? [])
                event.target.value = ''
                void task.choose(files, true)
              }}
            />
          </label>
        )}
      </div>
      <p role="status" aria-atomic="true" className="font-bold">
        {stage.kind === 'reading-files'
          ? copy.readingFiles
          : stage.kind === 'busy'
            ? copy[stage.progress]
            : stage.kind === 'ready'
              ? copy.ready
              : stage.kind === 'imported'
                ? copy.imported
                : stage.kind === 'choose'
                  ? stage.message
                  : null}
      </p>
      {stage.kind === 'error' && (
        <div role="alert" className="text-sm text-mld-danger">
          <p>{stage.message}</p>
          {stage.path && (
            <details>
              <summary className={disclosure}>{copy.details}</summary>
              <p className="break-all">{stage.path}</p>
            </details>
          )}
        </div>
      )}
      {bundle && (
        <>
          {!!bundle.entries.length && (
            <label className="block text-sm font-bold">
              {copy.principal}
              <select
                name="gltfEntry"
                className={field}
                value={view.entryPath ?? ''}
                onChange={(event) => void task.inspect(event.target.value)}
              >
                <option value="" disabled>
                  {copy.principalPlaceholder}
                </option>
                {bundle.entries.map((path) => (
                  <option key={path} value={path}>
                    {path}
                  </option>
                ))}
              </select>
            </label>
          )}
          {stage.kind === 'missing' && (
            <section aria-label={copy.missing} className="rounded-xl border border-mld-border p-3">
              <h3 className="font-bold">{copy.missing}</h3>
              <ul className="mt-2 max-h-52 list-disc overflow-y-auto pl-5 text-sm">
                {stage.paths.map((path) => (
                  <li key={path} className="break-all">
                    {path}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {inspection &&
            (inspection.scenes.length ? (
              <label className="block text-sm font-bold">
                {copy.scene}
                <select
                  name="gltfScene"
                  className={field}
                  value={view.sceneIndex === 'unselected' ? '' : (view.sceneIndex ?? '')}
                  onChange={(event) => {
                    if (event.target.value !== '') task.setScene(Number(event.target.value))
                  }}
                >
                  <option value="" disabled>
                    {copy.scenePlaceholder}
                  </option>
                  {inspection.scenes.map((scene) => (
                    <option key={scene.index} value={scene.index}>
                      {scene.name || copy.sceneName(scene.index)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="text-sm">{copy.noScenes}</p>
            ))}
          <CompatibilityOptions options={view.options} change={task.setOptions} />
          <p className="text-sm leading-relaxed text-mld-muted">{copy.original}</p>
          <SceneImportOriginalFiles bundle={bundle} name="gltfOriginal" />
        </>
      )}
      {stage.kind === 'ready' && (
        <>
          <p className="font-bold">
            {copy.summary(
              stage.result.report.costs.instances,
              stage.result.report.costs.clips,
              stage.result.report.costs.drawTriangles,
            )}
          </p>
          <SceneImportPreview document={stage.result.document} factory={viewportFactory} />
          <ImportReport report={stage.result.report} />
          <p className="rounded-xl border border-mld-border p-3 text-sm font-bold">
            {copy.replace}
          </p>
          <label className={choice}>
            <input
              name="gltfAccept"
              type="checkbox"
              className="mt-0.5 size-5 shrink-0 accent-mld-accent"
              checked={stage.accepted}
              onChange={(event) => task.accept(event.target.checked)}
            />
            {copy.accept}
          </label>
          {(stage.error || blocked) && (
            <p role="alert" className="text-sm text-mld-danger">
              {stage.error ?? copy.pendingPose}
            </p>
          )}
        </>
      )}
      <div className="flex flex-wrap gap-2">
        {busy ? (
          <Button onClick={task.cancel}>{copy.cancel}</Button>
        ) : stage.kind === 'ready' ? (
          <Button
            variant="primary"
            disabled={!stage.accepted || blocked}
            onClick={() => {
              if (task.confirm()) onImported()
            }}
          >
            {copy.confirm}
          </Button>
        ) : inspection ? (
          <Button
            variant="primary"
            disabled={view.sceneIndex === 'unselected'}
            onClick={() => void task.prepare()}
          >
            {copy.prepare}
          </Button>
        ) : view.entryPath ? (
          <Button variant="primary" onClick={() => void task.inspect()}>
            {copy.inspect}
          </Button>
        ) : null}
        <Button variant="ghost" onClick={onClose}>
          {copy.close}
        </Button>
      </div>
    </div>
  )
}
