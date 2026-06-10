import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import type { JSX } from 'react'
import { t } from '#core'
import '@xterm/xterm/css/xterm.css'
import { useEffect, useRef } from 'react'

export function TerminalPlaceholder(): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const term = new Terminal({
      theme: { background: '#11172a', foreground: '#e6e9f5' },
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 12,
      cursorBlink: false,
      disableStdin: true,
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(ref.current)
    fit.fit()
    term.writeln('[1;36mSistema Zero Studio[0m')
    term.writeln('')
    term.writeln(t('terminal.placeholder'))
    const onResize = () => fit.fit()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      term.dispose()
    }
  }, [])

  return <div ref={ref} className="h-full w-full bg-sz-panel" />
}
