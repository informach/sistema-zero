import type { JSX } from 'react'
import { useEffect, useState } from 'react'
import { Button, Modal } from '#ui'
import { AI_MODEL_OPTIONS, useSettingsStore } from '../../state/settingsStore'
import { useStudioConfig } from '../../studio/config'

export interface SettingsDrawerProps {
  open: boolean
  onClose: () => void
  /** Foca a seção de IA ao abrir (útil para CTA "Configurar IA"). */
  initialSection?: 'ai' | 'appearance'
}

export function SettingsDrawer({
  open,
  onClose,
  initialSection = 'ai',
}: SettingsDrawerProps): JSX.Element {
  const apiKey = useSettingsStore((s) => s.aiApiKey)
  const apiKeyStorage = useSettingsStore((s) => s.aiApiKeyStorage)
  const model = useSettingsStore((s) => s.aiModel)
  const theme = useSettingsStore((s) => s.theme)
  const setAIApiKey = useSettingsStore((s) => s.setAIApiKey)
  const setAIApiKeyStorage = useSettingsStore((s) => s.setAIApiKeyStorage)
  const clearAIApiKey = useSettingsStore((s) => s.clearAIApiKey)
  const setAIModel = useSettingsStore((s) => s.setAIModel)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const config = useStudioConfig()
  // Host injetou chave/modelo? As seções correspondentes somem (a configuração
  // é da plataforma, não do aluno).
  const hostKey = Boolean(config.aiConfig.apiKey)
  const showKeySection = config.ai && !hostKey && config.aiConfig.allowUserKey
  const showModelSection = config.ai && !config.aiConfig.model
  const showAITab = showKeySection || showModelSection

  const [draftKey, setDraftKey] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)
  const [section, setSection] = useState<'ai' | 'appearance'>(
    showAITab ? initialSection : 'appearance',
  )

  useEffect(() => {
    if (!open) return
    setDraftKey(apiKey)
    setShowKey(false)
    setSection(initialSection)
  }, [apiKey, initialSection, open])

  const handleSaveKey = async () => {
    const nextKey = draftKey.trim()
    await setAIApiKey(nextKey, { storage: apiKeyStorage })
    setDraftKey(nextKey)
  }

  const handleClearKey = async () => {
    await clearAIApiKey()
    setDraftKey('')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Configurações"
      className="w-[560px] max-w-[90vw]"
      footer={
        <Button variant="ghost" size="sm" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      <nav className="mb-3 flex gap-2 border-b border-sz-border-soft">
        {(showAITab ? (['ai', 'appearance'] as const) : (['appearance'] as const)).map((s) => {
          const label = s === 'ai' ? 'Assistente de IA' : 'Aparência'
          return (
            <button
              key={s}
              type="button"
              onClick={() => setSection(s)}
              className={[
                'border-b-2 px-2 py-1.5 text-xs font-medium transition-colors',
                section === s
                  ? 'border-sz-accent text-sz-fg'
                  : 'border-transparent text-sz-fg-soft hover:text-sz-fg',
              ].join(' ')}
            >
              {label}
            </button>
          )
        })}
      </nav>
      {section === 'ai' && showAITab && (
        <section className="space-y-3">
          <header>
            <h3 className="text-sm font-semibold text-sz-fg">Assistente de IA</h3>
            <p className="mt-1 text-xs text-sz-fg-mute">
              Use sua própria chave OpenRouter (BYOK). A chave fica salva apenas no seu navegador;
              nenhuma requisição passa por servidores do Sistema Zero. Crie uma chave em{' '}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="text-sz-accent underline"
              >
                openrouter.ai/keys
              </a>
              .
            </p>
          </header>

          {showKeySection && (
            <div className="block text-xs text-sz-fg-soft">
              <span>Chave de API</span>
              <div className="mt-1 flex gap-2">
                <input
                  name="openrouter-api-key"
                  type={showKey ? 'text' : 'password'}
                  autoComplete="off"
                  value={draftKey}
                  onChange={(e) => setDraftKey(e.target.value)}
                  placeholder="sk-or-v1-…"
                  className="flex-1 rounded border border-sz-border bg-sz-bg px-2 py-1.5 font-mono text-xs text-sz-fg"
                />
                <Button size="sm" variant="ghost" onClick={() => setShowKey((v) => !v)}>
                  {showKey ? 'Ocultar' : 'Mostrar'}
                </Button>
                <Button size="sm" variant="primary" onClick={handleSaveKey}>
                  Salvar
                </Button>
                <Button size="sm" variant="ghost" onClick={handleClearKey}>
                  Limpar
                </Button>
              </div>
              {apiKey && (
                <p className="mt-1 text-xs text-sz-success">Chave configurada. IA real ativa.</p>
              )}
              <label className="mt-2 flex items-center gap-2 text-xs text-sz-fg-soft">
                <input
                  type="checkbox"
                  checked={apiKeyStorage === 'persistent'}
                  onChange={(e) =>
                    void setAIApiKeyStorage(e.currentTarget.checked ? 'persistent' : 'session')
                  }
                />
                Salvar chave neste navegador
              </label>
              <p className="mt-1 text-xs text-sz-fg-mute">
                {apiKeyStorage === 'persistent'
                  ? 'A chave é guardada sem criptografia no navegador (IndexedDB). Evite computadores compartilhados e prefira uma chave com limite de gasto.'
                  : 'Modo sessão: a chave fica só na memória desta aba e será removida ao recarregar.'}
              </p>
            </div>
          )}

          {showModelSection && (
            <label className="block text-xs text-sz-fg-soft">
              Modelo
              <select
                name="ai-model"
                value={model}
                onChange={(e) => void setAIModel(e.target.value)}
                className="mt-1 w-full rounded border border-sz-border bg-sz-bg px-2 py-1.5 text-xs text-sz-fg"
              >
                {AI_MODEL_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-sz-fg-mute">
                OpenRouter cobra por token usado. Veja preços em openrouter.ai/models.
              </p>
            </label>
          )}
        </section>
      )}

      {section === 'appearance' && (
        <section className="space-y-3">
          <header>
            <h3 className="text-sm font-semibold text-sz-fg">Aparência</h3>
            <p className="mt-1 text-xs text-sz-fg-mute">
              Preferências visuais do Sistema Zero. Persistido no IndexedDB.
            </p>
          </header>

          <div className="block text-xs text-sz-fg-soft">
            <span>Tema</span>
            <div className="mt-1 flex rounded-md border border-sz-border bg-sz-bg p-0.5">
              {(['dark', 'light'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => void setTheme(t)}
                  className={[
                    'flex-1 rounded px-3 py-1 text-xs font-medium transition-colors',
                    theme === t ? 'bg-sz-accent text-sz-bg' : 'text-sz-fg-soft hover:text-sz-fg',
                  ].join(' ')}
                >
                  {t === 'dark' ? 'Escuro' : 'Claro'}
                </button>
              ))}
            </div>
          </div>

          {/* O ajuste de fonte da UI saiu daqui: ele mutava o font-size do <html>
              do HOST — inaceitável embarcado. O tamanho da fonte do CÓDIGO
              continua nos controles A−/A+ do editor. */}
        </section>
      )}
    </Modal>
  )
}
