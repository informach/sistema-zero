import type { JSX } from 'react'
import { memo, useLayoutEffect, useRef } from 'react'
import { Button } from '#ui'
import { useCrossHighlight } from '../../hooks/useCrossHighlight'
import { glossErrorMessage } from '../../state/errorGloss'
import { useHighlightStore } from '../../state/highlightStore'
import { ERROR_LOG_KINDS, type LogEntry, useLogsStore } from '../../state/logsStore'
import { useT } from '../../studio/i18n'

// Tipos de log que representam ERRO — só neles tentamos a dica em português.
// A régua vive no store: o Zappy usa a MESMA para diagnosticar.
const ERROR_KINDS = ERROR_LOG_KINDS

// Margem (px) para considerar o scroll "no fim": pequenas folgas de
// arredondamento/subpixel não devem desligar o auto-scroll.
const STICK_THRESHOLD_PX = 24

const COLORS: Record<LogEntry['kind'], string> = {
  log: 'text-sz-fg',
  info: 'text-sz-accent',
  warn: 'text-sz-warn',
  error: 'text-sz-error',
  runtimeError: 'text-sz-error',
  unhandledRejection: 'text-sz-error',
  loopStopped: 'text-sz-warn',
  // Heartbeat nunca chega ao console (o PreviewIframe filtra); chave só p/ o tipo.
  heartbeat: 'text-sz-fg-mute',
}

const KIND_LABEL: Record<LogEntry['kind'], string> = {
  log: 'log',
  info: 'info',
  warn: 'warn',
  error: 'error',
  runtimeError: 'erro de execução',
  unhandledRejection: 'promessa rejeitada',
  loopStopped: 'laço interrompido',
  heartbeat: 'heartbeat',
}

export function ConsolePanel(): JSX.Element {
  const t = useT()
  const entries = useLogsStore((s) => s.entries)
  const clear = useLogsStore((s) => s.clear)
  const scrollRef = useRef<HTMLDivElement>(null)
  // Cola no rodapé por padrão; só desgruda quando o aluno rola para cima para
  // ler o histórico (assim novas mensagens não puxam a viewport de volta).
  const stickRef = useRef(true)

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight <= STICK_THRESHOLD_PX
  }

  // Layout effect (antes da pintura) keyed no id da ÚLTIMA entrada: cada novo log
  // que entra com o scroll colado mantém a última linha visível. Rolou para cima
  // = não mexe. NÃO usar entries.length: ele satura em MAX_LOG_ENTRIES (ring
  // buffer de 500) e a partir da 501ª mensagem o efeito nunca mais rodaria. O id
  // é monotônico por push, então cada novo log muda a dependência.
  const lastId = entries.at(-1)?.id ?? 0
  // biome-ignore lint/correctness/useExhaustiveDependencies: `lastId` é só o GATILHO (o corpo lê apenas refs)
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || !stickRef.current) return
    el.scrollTop = el.scrollHeight
  }, [lastId])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-sz-border-soft px-3 py-1.5">
        <span className="text-xs text-sz-fg-mute">
          {t(entries.length === 1 ? 'console.message' : 'console.messages', {
            count: entries.length,
          })}
        </span>
        <Button variant="ghost" size="sm" onClick={clear}>
          {t('console.clear')}
        </Button>
      </div>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-auto px-3 py-2 font-mono text-xs"
      >
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
  const t = useT()
  // Dica em português SÓ para entradas de erro (a linha original em inglês fica
  // intacta logo acima — a criança aprende a mensagem real e pode colá-la numa
  // IA/busca). `null` quando o padrão não é reconhecido (mostra só o original).
  const gloss = ERROR_KINDS.has(entry.kind) ? glossErrorMessage(entry.text) : null
  // Erro de execução com linha no script.js do ALUNO: resolve o bloco que gerou
  // aquela linha (source map canônico) e oferece o chip "Ver o bloco". Clicar
  // publica o cursor no highlightStore — o BlocklyPanel seleciona/centraliza o
  // bloco (mesmo caminho do destaque código→bloco da Ponte). Best-effort: sem
  // match, sem chip. (memo não bloqueia: hooks de store re-renderizam sozinhos.)
  const cross = useCrossHighlight()
  const setCursor = useHighlightStore((s) => s.setCursor)
  const culpritBlockId =
    entry.kind === 'runtimeError' && entry.errorLine != null
      ? cross.lookupLine('script.js', entry.errorLine, entry.errorCol ?? undefined)
      : null
  return (
    <div>
      <div className={`flex gap-2 ${COLORS[entry.kind]}`}>
        <span className="shrink-0 text-sz-fg-mute">{formatTime(entry.timestamp)}</span>
        <span className="shrink-0 uppercase text-xs text-sz-fg-mute">{KIND_LABEL[entry.kind]}</span>
        <span className="whitespace-pre-wrap break-all">{entry.text}</span>
      </div>
      {gloss && (
        <p className="ml-2 mt-0.5 whitespace-pre-wrap break-words border-l-2 border-sz-accent pl-2 text-sz-fg-soft">
          {gloss}
        </p>
      )}
      {culpritBlockId && entry.errorLine != null && (
        <button
          type="button"
          onClick={() => setCursor('script.js', entry.errorLine ?? 1, entry.errorCol ?? undefined)}
          className="ml-2 mt-1 rounded border border-sz-border px-2 py-0.5 text-[11px] text-sz-fg-soft hover:border-sz-accent hover:text-sz-fg"
        >
          <span aria-hidden>🧩</span> {t('console.showBlock')}
        </button>
      )}
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
