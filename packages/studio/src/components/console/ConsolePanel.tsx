import type { JSX } from 'react'
import { memo } from 'react'
import { t } from '#core'
import { Button } from '#ui'
import { type LogEntry, useLogsStore } from '../../state/logsStore'

const COLORS: Record<LogEntry['kind'], string> = {
  log: 'text-sz-fg',
  info: 'text-sz-accent',
  warn: 'text-sz-warn',
  error: 'text-sz-error',
  runtimeError: 'text-sz-error',
  unhandledRejection: 'text-sz-error',
}

const KIND_LABEL: Record<LogEntry['kind'], string> = {
  log: 'log',
  info: 'info',
  warn: 'warn',
  error: 'error',
  runtimeError: 'erro de execução',
  unhandledRejection: 'promessa rejeitada',
}

export function ConsolePanel(): JSX.Element {
  const entries = useLogsStore((s) => s.entries)
  const clear = useLogsStore((s) => s.clear)
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-sz-border-soft px-3 py-1.5">
        <span className="text-xs text-sz-fg-mute">{entries.length} mensagens</span>
        <Button variant="ghost" size="sm" onClick={clear}>
          {t('console.clear')}
        </Button>
      </div>
      <div className="flex-1 overflow-auto px-3 py-2 font-mono text-xs">
        {entries.length === 0 ? (
          <p className="text-sz-fg-mute">{t('console.empty')}</p>
        ) : (
          entries.map((e) => <LogEntryItem key={e.id} entry={e} />)
        )}
      </div>
    </div>
  )
}

// Memoizado: a cada novo log o array `entries` muda de identidade, mas cada item
// é estável — só o item recém-adicionado precisa renderizar (evita re-render dos
// até 500 itens a cada console.log).
const LogEntryItem = memo(function LogEntryItem({ entry }: { entry: LogEntry }) {
  return (
    <div className={`flex gap-2 ${COLORS[entry.kind]}`}>
      <span className="shrink-0 text-sz-fg-mute">{formatTime(entry.timestamp)}</span>
      <span className="shrink-0 uppercase text-xs text-sz-fg-mute">{KIND_LABEL[entry.kind]}</span>
      <span className="whitespace-pre-wrap break-all">{entry.text}</span>
    </div>
  )
})

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}
