import { NATIVE_IMPORT_COPY as copy } from '../../../core/nativeImportCopy'
import { importDisclosure } from './sceneImportStyles'
import type { SceneImportStage } from './useSceneImportConfirmation'

export function SceneImportStatus({
  stage,
  reading,
}: {
  stage: SceneImportStage<unknown>
  reading: string
}) {
  return (
    <>
      <p role="status" aria-atomic="true" className="font-bold">
        {stage.kind === 'reading-files'
          ? copy.readingFiles
          : stage.kind === 'busy'
            ? stage.progress === 'reading'
              ? reading
              : copy[stage.progress]
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
              <summary className={importDisclosure}>{copy.details}</summary>
              <p className="break-all">{stage.path}</p>
            </details>
          )}
        </div>
      )}
    </>
  )
}
