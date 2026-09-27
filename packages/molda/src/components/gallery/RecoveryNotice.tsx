import { useId, useState } from 'react'
import { COPY } from '../../core/copy'
import type { MoldaReadIssue } from '../../core/documentReader'
import { triggerDownload } from '../../export/download'
import { recoveryJson } from '../../export/recoveryJson'
import type { MoldaPersistence } from '../../state/persistence'
import { Button } from '../ui/Button'
import { Download } from '../ui/icons'
import { useToast } from '../ui/Toast'

function RecoveryItem({
  issue,
  persistence,
}: {
  issue: MoldaReadIssue
  persistence: MoldaPersistence
}) {
  const [pending, setPending] = useState(false)
  const { showToast } = useToast()
  async function download() {
    if (pending) return
    setPending(true)
    try {
      const read = await persistence.read?.(issue.id)
      if (!read || read.status === 'valid') throw new Error('Arquivo mudou; releia a galeria.')
      const text = recoveryJson(read.raw)
      // File names never use unchecked document metadata as a path.
      const id = issue.id.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64) || 'criacao'
      if (!triggerDownload(text, `${id}.molda.json`, 'application/json'))
        throw new Error('Download indisponível')
      showToast(COPY.gallery.downloadReady)
    } catch {
      showToast(COPY.gallery.recoveryFailed)
    } finally {
      setPending(false)
    }
  }
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="break-words font-bold text-mld-text">{issue.name}</p>
        <p className="text-sm text-mld-text-soft">
          {issue.status === 'unsupported'
            ? COPY.gallery.recoveryNewer
            : COPY.gallery.recoveryInvalid}
        </p>
      </div>
      <Button
        variant="outline"
        disabled={pending || !persistence.read}
        onClick={() => void download()}
        aria-label={COPY.gallery.recoveryDownloadAria(issue.name)}
      >
        <Download aria-hidden="true" className="size-4" />
        {pending ? COPY.gallery.recoveryDownloading : COPY.gallery.recoveryDownload}
      </Button>
    </li>
  )
}

export function RecoveryNotice({
  issues,
  persistence,
}: {
  issues: readonly MoldaReadIssue[]
  persistence: MoldaPersistence
}) {
  const heading = useId()
  if (!issues.length) return null
  return (
    <section
      aria-labelledby={heading}
      className="mb-4 rounded-2xl border border-mld-border bg-mld-surface p-4"
    >
      <h2 id={heading} className="font-bold text-mld-text">
        {COPY.gallery.recoveryTitle}
      </h2>
      <p className="mt-1 text-sm text-mld-text-soft">{COPY.gallery.recoveryHint}</p>
      <ul className="mt-2 divide-y divide-mld-border">
        {issues.map((issue) => (
          <RecoveryItem key={issue.id} issue={issue} persistence={persistence} />
        ))}
      </ul>
    </section>
  )
}
