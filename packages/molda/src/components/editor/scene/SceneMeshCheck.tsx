import { useLayoutEffect, useRef } from 'react'
import { COPY } from '../../../core/copy'
import { isMeshFixKind } from '../../../scene/meshDiagnosis'
import { Button } from '../../ui/Button'
import type { useSceneComponents } from './useSceneComponents'

export function SceneMeshCheck({
  check,
}: {
  check: ReturnType<typeof useSceneComponents>['check']
}) {
  const copy = COPY.scene
  const start = useRef<HTMLButtonElement>(null)
  const confirm = useRef<HTMLButtonElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const active = useRef(false)
  useLayoutEffect(() => {
    if (check.busy) cancel.current?.focus()
    else if (check.preview) confirm.current?.focus()
    else if (active.current) start.current?.focus()
    active.current = check.busy || !!check.preview
  }, [check.busy, check.preview])
  return (
    <details
      className="rounded-lg border border-mld-border p-2"
      onToggle={(event) => {
        if (!event.currentTarget.open && (check.busy || check.preview)) check.cancel()
      }}
    >
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-bold">{copy.meshCheck}</summary>
      <div className="space-y-3">
        <p className="text-xs text-mld-muted">{copy.meshCheckHint}</p>
        {check.error && (
          <p role="alert" className="text-sm text-mld-danger">
            {check.error}
          </p>
        )}
        {check.busy ? (
          <p role="status" className="text-sm">
            {copy.meshCheckBusy}
          </p>
        ) : null}
        {check.preview ? (
          <>
            <p className="text-sm">{copy.meshCheckPreview(check.preview.count)}</p>
            <Button
              ref={confirm}
              className="w-full text-sm"
              disabled={check.busy}
              onClick={check.confirm}
            >
              {copy.previewConfirm}
            </Button>
          </>
        ) : (
          !check.busy && (
            <>
              <Button
                ref={start}
                className="w-full text-sm"
                disabled={check.disabled}
                onClick={() => void check.inspect()}
              >
                {copy.meshCheckRun}
              </Button>
              {check.issues?.length === 0 && (
                <p role="status" className="text-sm">
                  {copy.meshCheckClear}
                </p>
              )}
              {check.issues?.map((issue) => (
                <div key={issue.kind} className="space-y-2 border-t border-mld-border pt-3">
                  <h4 className="text-sm font-bold">
                    {copy.meshCheckKinds[issue.kind]}: {issue.count}
                  </h4>
                  <p className="text-xs text-mld-muted">{copy.meshCheckHints[issue.kind]}</p>
                  <Button
                    className="w-full text-sm"
                    disabled={check.disabled}
                    onClick={() => check.select(issue.kind)}
                  >
                    {copy.meshCheckSelect(copy.meshCheckKinds[issue.kind])}
                  </Button>
                  {isMeshFixKind(issue.kind) && (
                    <Button
                      className="w-full text-sm"
                      disabled={check.disabled}
                      onClick={() => {
                        if (isMeshFixKind(issue.kind)) void check.repair(issue.kind)
                      }}
                    >
                      {copy.meshCheckFixes[issue.kind]}
                    </Button>
                  )}
                </div>
              ))}
            </>
          )
        )}
        {(check.busy || check.preview) && (
          <Button ref={cancel} className="w-full text-sm" onClick={check.cancel}>
            {copy.previewCancel}
          </Button>
        )}
      </div>
    </details>
  )
}
