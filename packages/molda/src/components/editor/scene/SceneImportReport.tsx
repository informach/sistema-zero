import { type ReactNode, useMemo, useState } from 'react'
import { NATIVE_IMPORT_COPY as copy } from '../../../core/nativeImportCopy'
import { triggerDownload } from '../../../export/download'
import { Button } from '../../ui/Button'
import { importDisclosure as disclosure } from './sceneImportStyles'

export function SceneImportReport<Issue extends { detail: { code: string } }>({
  report,
  labels,
  filename,
  children,
  emptyMessage = copy.noChanges,
}: {
  report: { issues: Issue[] }
  labels: Record<Issue['detail']['code'], string>
  filename: string
  children?: ReactNode
  emptyMessage?: string
}) {
  const [failed, setFailed] = useState(false),
    groups = useMemo(() => {
      const counts = new Map<Issue['detail']['code'], number>()
      for (const issue of report.issues)
        counts.set(issue.detail.code, (counts.get(issue.detail.code) ?? 0) + 1)
      return [...counts]
    }, [report.issues]),
    details = useMemo(() => {
      const rows = new Map<string, number>()
      for (const issue of report.issues.slice(0, 50)) {
        const text = JSON.stringify(issue)
        rows.set(text, (rows.get(text) ?? 0) + 1)
      }
      return [...rows]
    }, [report.issues])
  return (
    <section
      aria-label={copy.changes}
      className="space-y-3 rounded-xl border border-mld-border bg-mld-bg p-3"
    >
      <h3 className="font-bold">{copy.changes}</h3>
      {children}
      {groups.length ? (
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
          {groups.map(([code, count]) => (
            <li key={code}>
              {labels[code]} <span className="text-mld-muted">({count})</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm">{emptyMessage}</p>
      )}
      <details>
        <summary className={disclosure}>{copy.details}</summary>
        <p className="py-2 text-sm text-mld-muted">
          {copy.visibleDetails(Math.min(50, report.issues.length), report.issues.length)}
        </p>
        <ol className="max-h-52 space-y-2 overflow-y-auto text-xs">
          {details.map(([text, count]) => (
            <li key={text} className="break-all rounded border border-mld-border p-2">
              {text}
              {count > 1 ? ` (${count})` : ''}
            </li>
          ))}
        </ol>
      </details>
      <Button
        className="text-sm"
        onClick={() => {
          try {
            setFailed(
              !triggerDownload(JSON.stringify(report, null, 2), filename, 'application/json'),
            )
          } catch {
            setFailed(true)
          }
        }}
      >
        {copy.downloadReport}
      </Button>
      {failed && (
        <p role="alert" className="text-sm text-mld-danger">
          {copy.downloadFailed}
        </p>
      )}
    </section>
  )
}
