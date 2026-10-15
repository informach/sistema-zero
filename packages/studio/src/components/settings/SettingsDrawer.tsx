import type { JSX } from 'react'
import { useEffect } from 'react'
import { MAX_BLOCK_LEVEL } from '#core'
import { Button, Modal } from '#ui'
import { useSettingsStore } from '../../state/settingsStore'
import { useStudioConfig } from '../../studio/config'
import { useStudioTutor } from '../../studio/tutor'

export interface SettingsDrawerProps {
  open: boolean
  onClose: () => void
  /** @deprecated 'ai' opens the host-authorized Zappy; credentials are managed by the host. */
  initialSection?: 'ai' | 'appearance'
}

export function SettingsDrawer({
  open,
  onClose,
  initialSection = 'appearance',
}: SettingsDrawerProps): JSX.Element {
  const theme = useSettingsStore((state) => state.theme)
  const setTheme = useSettingsStore((state) => state.setTheme)
  const revealAdvanced = useSettingsStore((state) => state.revealAdvanced)
  const setRevealAdvanced = useSettingsStore((state) => state.setRevealAdvanced)
  const config = useStudioConfig()
  const tutor = useStudioTutor()
  const showRevealToggle =
    config.learning.allowLevelReveal && config.learning.level !== MAX_BLOCK_LEVEL
  useEffect(() => {
    if (!open || initialSection !== 'ai' || !tutor.config) return
    onClose()
    tutor.setOpen(true)
  }, [open, initialSection, tutor.config, tutor.setOpen, onClose])
  return (
    <Modal
      open={open && !(initialSection === 'ai' && tutor.config)}
      onClose={onClose}
      title="Configurações"
      className="w-[560px] max-w-[90vw]"
      footer={
        <Button variant="ghost" size="sm" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      {initialSection === 'ai' && !tutor.config && (
        <p role="status" className="mb-3 text-sm text-sz-fg-soft">
          O Zappy não está disponível neste espaço.
        </p>
      )}
      <section aria-label="Aparência" className="space-y-3">
        <header>
          <h3 className="text-sm font-semibold text-sz-fg">Aparência</h3>
          <p className="mt-1 text-xs text-sz-fg-mute">Preferências visuais do Sistema Zero.</p>
        </header>
        <div className="block text-xs text-sz-fg-soft">
          <span>Tema</span>
          <div className="mt-1 flex rounded-md border border-sz-border bg-sz-bg p-0.5">
            {(['dark', 'light'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={theme === value}
                onClick={() => void setTheme(value)}
                className={[
                  'sz-touch-target flex-1 rounded px-3 py-1 text-xs font-medium transition-colors',
                  theme === value ? 'bg-sz-accent text-sz-bg' : 'text-sz-fg-soft hover:text-sz-fg',
                ].join(' ')}
              >
                {value === 'dark' ? 'Escuro' : 'Claro'}
              </button>
            ))}
          </div>
        </div>
        {showRevealToggle && (
          <div className="block text-xs text-sz-fg-soft">
            <span>Blocos avançados</span>
            <label className="sz-touch-target mt-1 flex items-center gap-2 text-xs text-sz-fg-soft">
              <input
                type="checkbox"
                name="reveal-advanced-blocks"
                checked={revealAdvanced}
                onChange={(event) => void setRevealAdvanced(event.currentTarget.checked)}
              />
              Mostrar blocos avançados na paleta
            </label>
            <p className="mt-1 text-xs text-sz-fg-mute">
              Sua turma começa com os blocos essenciais. Ative para explorar recursos mais avançados
              quando se sentir pronto.
            </p>
          </div>
        )}
      </section>
    </Modal>
  )
}
