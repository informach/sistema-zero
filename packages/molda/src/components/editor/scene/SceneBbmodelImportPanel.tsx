import { BBMODEL_ANIMATION_IMPORT_COPY as movement } from '../../../core/bbmodelAnimationImportCopy'
import { BBMODEL_IMPORT_COPY as copy } from '../../../core/bbmodelImportCopy'
import { BBMODEL_IMPORT_ISSUE_COPY } from '../../../core/bbmodelImportIssueCopy'
import { Button } from '../../ui/Button'
import { SceneBbmodelAnimationReview } from './SceneBbmodelAnimationReview'
import { SceneBbmodelImportOptions } from './SceneBbmodelImportOptions'
import { SceneBbmodelPaintReview } from './SceneBbmodelPaintReview'
import { SceneImportFiles, SceneImportSelection } from './SceneImportFiles'
import { SceneImportOriginalFiles } from './SceneImportOriginalFiles'
import { SceneImportPreview } from './SceneImportPreview'
import { SceneImportReport } from './SceneImportReport'
import { SceneImportStatus } from './SceneImportStatus'
import type { SceneImportPanelProps } from './sceneImportPanelTypes'
import { importChoice } from './sceneImportStyles'
import { useSceneBbmodelImport } from './useSceneBbmodelImport'

export function SceneBbmodelImportPanel({
  editor,
  onClose,
  onImported,
  viewportFactory,
  canAdopt,
  blocked = false,
}: SceneImportPanelProps) {
  const task = useSceneBbmodelImport(editor, { canAdopt }),
    { view } = task,
    { stage, bundle } = view,
    busy = stage.kind === 'busy' || stage.kind === 'reading-files'
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed">{copy.intro}</p>
      <p className="text-sm leading-relaxed text-mld-muted">{copy.filesHint}</p>
      <p className="rounded-xl border border-mld-border p-3 text-sm leading-relaxed">
        {copy.limitsHint}
      </p>
      <SceneImportFiles
        name="bbmodel"
        accept=".bbmodel,.png,.jpg,.jpeg"
        canAppend={bundle !== null}
        choose={task.choose}
      />
      <SceneImportStatus stage={stage} reading={copy.reading} />
      {bundle && (
        <>
          <SceneImportSelection
            name="bbmodel"
            bundle={bundle}
            entryPath={view.entryPath}
            placeholder={copy.principalPlaceholder}
            missing={stage.kind === 'missing' ? stage.paths : undefined}
            setEntry={task.setEntry}
          />
          <SceneBbmodelImportOptions options={view.options} change={task.setOptions} />
          <p className="text-sm leading-relaxed text-mld-muted">{copy.original}</p>
          <SceneImportOriginalFiles bundle={bundle} name="bbmodelOriginal" />
        </>
      )}
      {stage.kind === 'ready' && (
        <>
          <p className="font-bold">
            {copy.summary(
              stage.result.report.costs.instances,
              stage.result.report.costs.images,
              stage.result.report.costs.drawTriangles,
            )}
          </p>
          <SceneImportPreview document={stage.result.document} factory={viewportFactory} />
          <SceneImportReport
            report={stage.result.report}
            labels={BBMODEL_IMPORT_ISSUE_COPY}
            filename="molda-relatorio-Blockbench.json"
            emptyMessage={
              stage.result.report.animations?.source.length ? movement.noOtherChanges : undefined
            }
          >
            <SceneBbmodelPaintReview
              report={stage.result.report}
              document={stage.result.document}
            />
            {stage.result.report.animations && (
              <SceneBbmodelAnimationReview
                report={stage.result.report.animations}
                document={stage.result.document}
              />
            )}
            <p className="text-sm">
              {copy.sourceSummary(
                stage.result.report.source.version,
                stage.result.report.source.omittedNodes,
                stage.result.report.source.unusedTextures,
              )}
            </p>
          </SceneImportReport>
          <p className="rounded-xl border border-mld-border p-3 text-sm font-bold">
            {copy.replace}
          </p>
          <label className={importChoice}>
            <input
              name="bbmodelAccept"
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
