import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Button, Modal } from '#ui'
import type { PythonProjectCreationEnvironment } from '../../core/freeProjectOptions'
import { useT } from '../../studio/i18n'
import type { ProTemplate } from '../code/pro-templates'

const friendlyNames: Partial<Record<ProTemplate['id'], string>> = {
  'vanilla-js': 'Página interativa · JavaScript',
  'vanilla-vite': 'Página interativa · TypeScript',
  'react-ts': 'Aplicativo com telas e botões',
  'three-js': 'Cena 3D para inventar · JavaScript',
  'three-ts': 'Cena 3D para inventar · TypeScript',
}

export type NewProjectCreateOptions =
  | {
      kind: 'pro'
      templateId: string
    }
  | {
      programmingLanguage: 'python'
      kind: 'classic' | 'pro'
      environmentKey: string
    }

export interface NewProjectModalProps {
  open: boolean
  defaultName: string
  onClose: () => void
  onCreate: (name: string, opts?: NewProjectCreateOptions) => void | Promise<void>
  /** Quando true, mostra a opção de criar um projeto profissional. */
  professionalAvailable?: boolean
  /** Templates profissionais oferecidos (quando `professionalAvailable`). */
  templates?: ProTemplate[]
  /** Verified host discovery; Python is optional and never changes the JS default. */
  pythonEnvironments?: readonly PythonProjectCreationEnvironment[]
  pythonDiscovery?: {
    loading: boolean
    unavailable: boolean
    error?: string
    retry(): void
  }
  /** Nomes já usados — duplicado mostra aviso e desabilita o Criar. */
  existingNames?: string[]
}

export function NewProjectModal({
  open,
  defaultName,
  onClose,
  onCreate,
  professionalAvailable = false,
  templates = [],
  pythonEnvironments = [],
  pythonDiscovery,
  existingNames,
}: NewProjectModalProps): JSX.Element | null {
  const t = useT()
  const [name, setName] = useState(defaultName)
  const [kind, setKind] = useState<'basic' | 'pro'>('basic')
  const [language, setLanguage] = useState<'javascript' | 'python'>('javascript')
  const [pythonEnvironmentKey, setPythonEnvironmentKey] = useState('')
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [creationError, setCreationError] = useState<string | null>(null)
  const [category, setCategory] = useState<'all' | '2d' | '3d' | 'web'>('all')
  const creating = useRef(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Reseta os campos SÓ na transição fechado→aberto. `defaultName`/`templates`
  // mudam de REFERÊNCIA a cada render do pai (default `[]`, lista recarregada);
  // com eles nas deps, o efeito re-disparava a cada tecla e engolia a digitação.
  const openedRef = useRef(false)
  useEffect(() => {
    if (open && !openedRef.current) {
      setName(defaultName)
      setKind('basic')
      setLanguage('javascript')
      setPythonEnvironmentKey('')
      setTemplateId(templates[0]?.id ?? '')
      setCreationError(null)
      setCategory('all')
    }
    openedRef.current = open
  })

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [open])

  if (!open) return null

  const submit = async () => {
    // Guard também aqui: o Enter no input chama submit() sem passar pelo botão.
    if (creating.current || !canSubmit) return
    creating.current = true
    setSubmitting(true)
    setCreationError(null)
    try {
      const opts: NewProjectCreateOptions | undefined =
        language === 'python'
          ? {
              programmingLanguage: 'python',
              kind: kind === 'pro' ? 'pro' : 'classic',
              environmentKey: pythonEnvironmentKey,
            }
          : kind === 'pro' && templateId
            ? { kind: 'pro', templateId }
            : undefined
      await onCreate(name.trim() || defaultName, opts)
    } catch {
      setCreationError('Não foi possível criar o projeto. Confira a conexão e tente novamente.')
    } finally {
      creating.current = false
      setSubmitting(false)
    }
  }

  const trimmed = name.trim()
  const duplicate = Boolean(trimmed) && (existingNames?.includes(trimmed) ?? false)
  const selectedAvailable =
    language === 'python'
      ? (kind !== 'pro' || professionalAvailable) &&
        pythonEnvironments.some(
          (environment) =>
            environment.key === pythonEnvironmentKey &&
            environment.kind === (kind === 'pro' ? 'pro' : 'classic'),
        )
      : professionalAvailable && templates.some((template) => template.id === templateId)
  const pythonChoices = pythonEnvironments.filter(
    (environment) => environment.kind === (kind === 'pro' ? 'pro' : 'classic'),
  )
  const categoryOf = (template: ProTemplate) =>
    template.engine === 'three'
      ? '3d'
      : template.engine === 'canvas' || template.engine === 'phaser'
        ? '2d'
        : 'web'
  const visibleTemplates = templates.filter(
    (template) => category === 'all' || categoryOf(template) === category,
  )
  const friendlyName = (template: ProTemplate) => friendlyNames[template.id] ?? template.name
  const selectedTemplate = templates.find((template) => template.id === templateId)
  const canSubmit =
    trimmed &&
    !duplicate &&
    (language === 'python'
      ? selectedAvailable
      : kind === 'basic' ||
        (selectedAvailable && visibleTemplates.some((template) => template.id === templateId)))

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!creating.current) onClose()
      }}
      title={t('projects.newModal.title')}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            {t('projects.newModal.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void submit()}
            disabled={submitting || !canSubmit}
          >
            {submitting ? 'Criando…' : t('projects.newModal.create')}
          </Button>
        </>
      }
    >
      <label className="block text-sm text-sz-fg-soft">
        {t('projects.newModal.nameLabel')}
        <input
          ref={inputRef}
          name="new-project-name"
          disabled={submitting}
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit()
          }}
          placeholder={t('projects.newModal.placeholder')}
          aria-invalid={duplicate || undefined}
          className="mt-2 w-full rounded border border-sz-border bg-sz-bg px-3 py-2 text-sm text-sz-fg outline-none focus:border-sz-accent focus-visible:ring-2 focus-visible:ring-sz-accent/60"
        />
      </label>
      {duplicate && (
        <p role="status" className="mt-2 text-xs text-sz-error">
          {t('projects.newModal.duplicate')}
        </p>
      )}
      {creationError && (
        <p role="alert" className="mt-2 text-sm text-sz-error">
          {creationError}
        </p>
      )}
      {pythonDiscovery &&
        (pythonDiscovery.loading || pythonDiscovery.error || pythonDiscovery.unavailable) && (
          <div
            role={pythonDiscovery.error ? 'alert' : 'status'}
            className="mt-3 text-sm text-sz-fg-soft"
          >
            <p>
              {pythonDiscovery.error ??
                (pythonDiscovery.loading
                  ? 'Consultando ambientes Python…'
                  : 'Python ainda não está disponível para novos projetos.')}
            </p>
            {pythonDiscovery.error && (
              <Button
                variant="ghost"
                size="sm"
                disabled={submitting}
                onClick={pythonDiscovery.retry}
              >
                Tentar novamente
              </Button>
            )}
          </div>
        )}
      {(language === 'python' || kind === 'pro') && !selectedAvailable && (
        <p role="status" className="mt-2 text-sm text-sz-fg-soft">
          Este ambiente deixou de estar disponível para novos projetos. Seu nome foi preservado;
          escolha outro modelo ou reabra esta janela.
        </p>
      )}

      {(pythonEnvironments.length > 0 || language === 'python') && (
        <fieldset className="mt-4 space-y-2" disabled={submitting}>
          <legend className="text-xs font-semibold uppercase text-sz-fg-mute">
            Linguagem do projeto
          </legend>
          <label className="flex items-center gap-2 text-sm text-sz-fg-soft">
            <input
              type="radio"
              name="project-language"
              checked={language === 'javascript'}
              onChange={() => setLanguage('javascript')}
            />
            JavaScript (padrão)
          </label>
          <label className="flex items-center gap-2 text-sm text-sz-fg-soft">
            <input
              type="radio"
              name="project-language"
              checked={language === 'python'}
              onChange={() => {
                setLanguage('python')
                setPythonEnvironmentKey(pythonChoices[0]?.key ?? '')
              }}
            />
            Python
          </label>
          {language === 'python' && (
            <>
              <p className="text-xs text-sz-fg-mute">
                Comece com Programação. Você pode adicionar Turtle nas extensões para desenhar e
                criar jogos.
              </p>
              {pythonChoices.length > 1 && (
                <label className="block text-sm text-sz-fg-soft">
                  Ambiente Python
                  <select
                    value={pythonEnvironmentKey}
                    onChange={(event) => setPythonEnvironmentKey(event.target.value)}
                    className="mt-1 w-full rounded border border-sz-border bg-sz-bg px-3 py-2"
                  >
                    {!selectedAvailable && (
                      <option value={pythonEnvironmentKey} disabled>
                        Ambiente indisponível
                      </option>
                    )}
                    {pythonChoices.map((environment, index) => (
                      <option key={environment.key} value={environment.key}>
                        {environment.label} {index + 1}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </>
          )}
        </fieldset>
      )}

      {professionalAvailable && (
        <fieldset className="mt-4 space-y-2" disabled={submitting}>
          <legend className="text-xs font-semibold uppercase text-sz-fg-mute">
            Tipo de projeto
          </legend>
          <label className="flex items-start gap-2 text-sm text-sz-fg-soft">
            <input
              type="radio"
              name="project-kind"
              checked={kind === 'basic'}
              onChange={() => {
                setKind('basic')
                if (language === 'python')
                  setPythonEnvironmentKey(
                    pythonEnvironments.find(({ kind }) => kind === 'classic')?.key ?? '',
                  )
              }}
              className="mt-1"
            />
            <span>
              <span className="font-medium text-sz-fg">Clássico (blocos)</span>
              <span className="block text-xs text-sz-fg-mute">
                Crie com blocos, vendo o resultado na hora. Perfeito para começar.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-sz-fg-soft">
            <input
              type="radio"
              name="project-kind"
              checked={kind === 'pro'}
              onChange={() => {
                setKind('pro')
                if (language === 'python')
                  setPythonEnvironmentKey(
                    pythonEnvironments.find(({ kind }) => kind === 'pro')?.key ?? '',
                  )
              }}
              className="mt-1"
            />
            <span>
              <span className="font-medium text-sz-fg">Pro (código)</span>
              <span className="block text-xs text-sz-fg-mute">
                Crie jogos 2D, mundos 3D e aplicativos com código, materiais e ajuda do Zappy Pro.
              </span>
            </span>
          </label>

          {language === 'javascript' && kind === 'pro' && templates.length > 0 && (
            <div className="mt-3 space-y-3">
              <p className="font-medium text-sm">O que você quer criar?</p>
              <div className="flex flex-wrap gap-2">
                {(['all', '2d', '3d', 'web'] as const).map((choice) => (
                  <button
                    type="button"
                    key={choice}
                    aria-pressed={category === choice}
                    className="min-h-10 rounded-lg border border-sz-border px-3 text-sm aria-pressed:bg-sz-accent/15"
                    onClick={() => {
                      setCategory(choice)
                      const first = templates.find(
                        (template) => choice === 'all' || categoryOf(template) === choice,
                      )
                      if (
                        first &&
                        (!selectedTemplate ||
                          (choice !== 'all' && categoryOf(selectedTemplate) !== choice))
                      )
                        setTemplateId(first.id)
                    }}
                  >
                    {choice === 'all'
                      ? 'Todos'
                      : choice === '2d'
                        ? 'Jogos 2D'
                        : choice === '3d'
                          ? 'Mundos 3D'
                          : 'Páginas e aplicativos'}
                  </button>
                ))}
              </div>
              <label className="block text-sm text-sz-fg-soft">
                Escolha um ponto de partida
                <select
                  name="project-template"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="mt-1 w-full rounded border border-sz-border bg-sz-bg px-3 py-2 text-sm text-sz-fg outline-none focus:border-sz-accent"
                >
                  {!selectedAvailable && (
                    <option value={templateId} disabled>
                      Modelo indisponível
                    </option>
                  )}
                  {visibleTemplates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {friendlyName(tpl)}
                    </option>
                  ))}
                </select>
                {templates.find((tpl) => tpl.id === templateId)?.description && (
                  <span className="mt-1 block text-xs text-sz-fg-mute">
                    {templates.find((tpl) => tpl.id === templateId)?.description}
                  </span>
                )}
              </label>
              {selectedTemplate && (
                <details className="text-xs text-sz-fg-mute">
                  <summary className="cursor-pointer py-1">Ferramentas deste projeto</summary>
                  <p>
                    {selectedTemplate.name} · {selectedTemplate.engine}
                  </p>
                </details>
              )}
              {!visibleTemplates.length && (
                <p role="status" className="text-sm">
                  Não há modelos dessa categoria disponíveis aqui.
                </p>
              )}
            </div>
          )}
        </fieldset>
      )}
    </Modal>
  )
}
