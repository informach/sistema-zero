import { OBJ_IMPORT_COPY as copy } from '../../../core/objImportCopy'
import { OBJ_IMPORT_ISSUE_COPY } from '../../../core/objImportIssueCopy'
import { Button } from '../../ui/Button'
import { SceneImportFiles, SceneImportSelection } from './SceneImportFiles'
import { SceneImportOriginalFiles } from './SceneImportOriginalFiles'
import { SceneImportPreview } from './SceneImportPreview'
import { SceneImportReport } from './SceneImportReport'
import { SceneImportStatus } from './SceneImportStatus'
import { SceneObjImportOptions } from './SceneObjImportOptions'
import type { SceneImportPanelProps } from './sceneImportPanelTypes'
import { importChoice as choice } from './sceneImportStyles'
import { useSceneObjImport } from './useSceneObjImport'

export function SceneObjImportPanel({
  editor,
  onClose,
  onImported,
  viewportFactory,
  canAdopt,
  blocked = false,
}: SceneImportPanelProps) {
  const task = useSceneObjImport(editor, { canAdopt }),
    { view } = task,
    { stage, bundle } = view,
    busy = stage.kind === 'busy' || stage.kind === 'reading-files'
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed">{copy.intro}</p>
      <p className="text-sm leading-relaxed text-mld-muted">{copy.filesHint}</p>
      <SceneImportFiles
        name="obj"
        accept=".obj,.mtl,.png,.jpg,.jpeg"
        canAppend={bundle !== null}
        choose={task.choose}
      />
      <SceneImportStatus stage={stage} reading={copy.reading} />
      {bundle && (
        <>
          <SceneImportSelection
            name="obj"
            bundle={bundle}
            entryPath={view.entryPath}
            placeholder={copy.principalPlaceholder}
            missing={stage.kind === 'missing' ? stage.paths : undefined}
            setEntry={task.setEntry}
          />
          <SceneObjImportOptions options={view.options} change={task.setOptions} />
          <p className="text-sm leading-relaxed text-mld-muted">{copy.original}</p>
          <SceneImportOriginalFiles bundle={bundle} name="objOriginal" />
        </>
      )}
      {stage.kind === 'ready' && (
        <>
          <p className="font-bold">
            {copy.summary(
              stage.result.report.costs.instances,
              stage.result.report.costs.materials,
              stage.result.report.costs.drawTriangles,
            )}
          </p>
          <SceneImportPreview document={stage.result.document} factory={viewportFactory} />
          <SceneImportReport
            report={stage.result.report}
            labels={OBJ_IMPORT_ISSUE_COPY}
            filename="molda-relatorio-OBJ.json"
          >
            {stage.result.report.source.unusedMaterialDeclarations > 0 && (
              <p className="text-sm">
                {copy.unusedMaterials(stage.result.report.source.unusedMaterialDeclarations)}
              </p>
            )}
          </SceneImportReport>
          <p className="rounded-xl border border-mld-border p-3 text-sm font-bold">
            {copy.replace}
          </p>
          <label className={choice}>
            <input
              name="objAccept"
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
        ) : view.entryPath ? (
          <Button variant="primary" onClick={() => void task.prepare()}>
            {copy.prepare}
          </Button>
        ) : null}
        <Button variant="ghost" onClick={onClose}>
          {copy.close}
        </Button>
      </div>
    </div>
  )
}
