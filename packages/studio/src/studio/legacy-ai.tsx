import { useEffect, useRef } from 'react'
import { Button } from '#ui'
import { useUIStore } from '../state/uiStore'
import { useStudioTutor } from './tutor'

/** Compatibility commands target the one host-authorized tutor, never a local provider. */
export function LegacyAIEntryPoints() {
  const tab = useUIStore((state) => state.bottomTab)
  const showAI = useUIStore((state) => state.showAI)
  const setTab = useUIStore((state) => state.setBottomTab)
  const previousVisible = useRef(showAI)
  const { config, setOpen } = useStudioTutor()
  useEffect(() => {
    const requested = tab === 'ai' || (!previousVisible.current && showAI)
    previousVisible.current = showAI
    if (!requested) return
    if (tab === 'ai') setTab('console')
    if (config) setOpen(true)
  }, [tab, showAI, setTab, config, setOpen])
  return null
}

/** Retained for direct callers of renderBottomPanel('ai'); it cannot mount another assistant. */
export function LegacyAIPanelRedirect() {
  const { config, setOpen } = useStudioTutor()
  useEffect(() => {
    if (config) setOpen(true)
  }, [config, setOpen])
  return (
    <div className="p-4 text-sm text-sz-fg-soft">
      {config ? (
        <Button onClick={() => setOpen(true)}>Abrir Zappy</Button>
      ) : (
        <p>O Zappy não está disponível neste espaço.</p>
      )}
    </div>
  )
}
