import type { JSX, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Button, cn, Modal } from '#ui'
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

/** Nomes para o "Sortear um nome" (a criança troca depois, se quiser). */
const NAME_IDEAS = [
  'Aventura da Raposa',
  'Corrida Espacial',
  'Caça ao Tesouro',
  'Dino Saltitante',
  'Ilha Misteriosa',
  'Robô Coletor',
  'Nave Veloz',
  'Floresta Encantada',
  'Pinguim no Gelo',
  'Castelo das Moedas',
]

export type NewProjectCreateOptions =
  | {
      kind: 'pro'
      templateId: string
    }
  | {
      /** JavaScript com blocos: o ponto de partida só instala extensões (nunca áreas). */
      kind: 'classic'
      extensionIds: readonly string[]
    }
  | {
      programmingLanguage: 'python'
      kind: 'classic' | 'pro'
      environmentKey: string
      /** Turtle ou Pygame Zero: o editor do Python instala ao abrir o projeto novo. */
      startingExtensionId?: string
    }

export interface NewProjectModalProps {
  open: boolean
  defaultName: string
  onClose: () => void
  onCreate: (name: string, opts?: NewProjectCreateOptions) => void | Promise<void>
  /** Quando true, mostra a opção de criar com código (projeto profissional). */
  professionalAvailable?: boolean
  /** Host-resolved language eligibility; other authoring contexts keep JavaScript enabled. */
  javascriptAvailable?: boolean
  /** Templates profissionais oferecidos (quando `professionalAvailable`). */
  templates?: ProTemplate[]
  /** Verified host discovery. */
  pythonEnvironments?: readonly PythonProjectCreationEnvironment[]
  pythonDiscovery?: {
    loading: boolean
    unavailable: boolean
    error?: string
    retry(): void
  }
  /** Nomes já usados — duplicado mostra aviso e desabilita o Criar. */
  existingNames?: string[]
  /**
   * As extensões de jogo que o nível da criança libera no JavaScript ("game-2d", "game-3d"): cada
   * uma vira um ponto de partida além do "Em branco" (D5).
   */
  javascriptStartingExtensions?: readonly string[]
  /** O ponto de partida já marcado ao abrir (o host costumava instalar estas extensões). */
  defaultStartingExtensions?: readonly string[]
}

type Language = 'javascript' | 'python'
type Way = 'blocks' | 'code'

interface StartingPoint {
  id: string
  title: string
  hint: string
  emoji: string
  extensionIds: readonly string[]
}

const JS_STARTING_POINTS: Readonly<Record<string, Omit<StartingPoint, 'extensionIds'>>> = {
  'game-2d': {
    id: 'game-2d',
    title: 'Jogo 2D',
    hint: 'Já vem com os blocos de sprites, movimento e colisões.',
    emoji: '🎮',
  },
  'game-3d': {
    id: 'game-3d',
    title: 'Jogo 3D',
    hint: 'Já vem com os blocos de mundos e objetos em 3D.',
    emoji: '🧊',
  },
}

const BLANK: StartingPoint = {
  id: 'blank',
  title: 'Em branco',
  hint: 'Nada pronto: você escolhe as áreas e os blocos.',
  emoji: '📄',
  extensionIds: [],
}

const PYTHON_STARTING_POINTS: readonly StartingPoint[] = [
  BLANK,
  {
    id: 'python-turtle',
    title: 'Desenho com a tartaruga',
    hint: 'Já vem com os blocos da tartaruga (Turtle).',
    emoji: '🐢',
    extensionIds: ['python-turtle'],
  },
  {
    id: 'python-pgzero',
    title: 'Jogo com Pygame Zero',
    hint: 'Já vem com os blocos de atores, teclado e sons.',
    emoji: '🎮',
    extensionIds: ['python-pgzero'],
  },
]

/**
 * "Criar um jogo novo" em três estados (redesenho do clássico, 11/2026): (1) a linguagem ainda
 * não escolhida — dois cartões grandes e "Criar e abrir" desligado (os recados da descoberta do
 * Python são o estado do cartão dele); (2) JavaScript; (3) Python. Em cada um: com blocos ou com
 * código (código só com o Pro liberado) e o ponto de partida (D5). ⚠️ "Em branco" é em branco
 * mesmo: nenhuma área e nenhuma extensão; os outros pontos de partida só instalam a extensão.
 * Com uma linguagem só liberada, a janela já abre nela.
 */
export function NewProjectModal({
  open,
  defaultName,
  onClose,
  onCreate,
  professionalAvailable = false,
  javascriptAvailable = true,
  templates = [],
  pythonEnvironments = [],
  pythonDiscovery,
  existingNames,
  javascriptStartingExtensions = [],
  defaultStartingExtensions = [],
}: NewProjectModalProps): JSX.Element | null {
  const t = useT()
  const [name, setName] = useState(defaultName)
  const [language, setLanguage] = useState<Language | null>(null)
  const [way, setWay] = useState<Way>('blocks')
  const [start, setStart] = useState('blank')
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [creationError, setCreationError] = useState<string | null>(null)
  const [category, setCategory] = useState<'all' | '2d' | '3d' | 'web'>('all')
  const creating = useRef(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const pythonOffered = pythonEnvironments.length > 0 || Boolean(pythonDiscovery)

  // Reseta os campos SÓ na transição fechado→aberto. `defaultName`/`templates`
  // mudam de REFERÊNCIA a cada render do pai (default `[]`, lista recarregada);
  // com eles nas deps, o efeito re-disparava a cada tecla e engolia a digitação.
  const openedRef = useRef(false)
  const jsPreset = () =>
    Object.keys(JS_STARTING_POINTS).find(
      (id) => defaultStartingExtensions.includes(id) && javascriptStartingExtensions.includes(id),
    ) ?? 'blank'
  useEffect(() => {
    if (open && !openedRef.current) {
      setName(defaultName)
      // Com uma linguagem só, a janela já abre nela; com as duas, a criança escolhe (estado 1).
      const only: Language | null =
        javascriptAvailable && !pythonOffered
          ? 'javascript'
          : !javascriptAvailable && pythonOffered
            ? 'python'
            : null
      setLanguage(only)
      const pythonClassic = pythonEnvironments.some(({ kind }) => kind === 'classic')
      setWay(only === 'python' && !pythonClassic && professionalAvailable ? 'code' : 'blocks')
      setStart(only === 'javascript' ? jsPreset() : 'blank')
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

  const jsPoints: StartingPoint[] = [
    BLANK,
    ...javascriptStartingExtensions.flatMap((id) => {
      const point = JS_STARTING_POINTS[id]
      return point ? [{ ...point, extensionIds: [id] }] : []
    }),
  ]
  const pythonKind = way === 'code' ? 'pro' : 'classic'
  const pythonEnvironment = pythonEnvironments.find(({ kind }) => kind === pythonKind)
  // Turtle e Pygame Zero só aparecem com a extensão liberada no nível (as concessões vêm com o
  // ambiente); sem ela o pedido cairia em silêncio e o projeto nasceria em branco.
  const pythonGrants = pythonEnvironment?.context.grantedExtensionIds
  const pythonPoints =
    pythonKind === 'classic'
      ? PYTHON_STARTING_POINTS.filter(
          (item) =>
            !item.extensionIds[0] || !pythonGrants || pythonGrants.includes(item.extensionIds[0]),
        )
      : [BLANK]
  const points = language === 'python' ? pythonPoints : jsPoints
  const point = points.find((item) => item.id === start) ?? BLANK
  const codeOffered =
    professionalAvailable &&
    (language === 'python'
      ? pythonEnvironments.some(({ kind }) => kind === 'pro')
      : javascriptAvailable && templates.length > 0)

  const submit = async () => {
    // Guard também aqui: o Enter no input chama submit() sem passar pelo botão.
    if (creating.current || !canSubmit) return
    creating.current = true
    setSubmitting(true)
    setCreationError(null)
    try {
      const opts: NewProjectCreateOptions =
        language === 'python'
          ? {
              programmingLanguage: 'python',
              kind: pythonKind,
              environmentKey: pythonEnvironment?.key ?? '',
              ...(point.extensionIds[0] ? { startingExtensionId: point.extensionIds[0] } : {}),
            }
          : way === 'code'
            ? { kind: 'pro', templateId }
            : { kind: 'classic', extensionIds: point.extensionIds }
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
  const selectedAvailable =
    language === 'python'
      ? (pythonKind !== 'pro' || professionalAvailable) && Boolean(pythonEnvironment)
      : language === 'javascript' &&
        javascriptAvailable &&
        (way === 'blocks' ||
          (professionalAvailable &&
            templates.some((template) => template.id === templateId) &&
            visibleTemplates.some((template) => template.id === templateId)))
  const canSubmit = Boolean(trimmed) && !duplicate && selectedAvailable
  const pythonStatus = pythonDiscovery?.error
    ? pythonDiscovery.error
    : pythonDiscovery?.loading
      ? 'Consultando ambientes Python…'
      : pythonDiscovery?.unavailable || (pythonOffered && !pythonEnvironments.length)
        ? 'Python ainda não está disponível para novos projetos.'
        : null
  const pythonReady = pythonEnvironments.length > 0
  const shuffleName = () => {
    const free = NAME_IDEAS.filter((idea) => idea !== trimmed && !existingNames?.includes(idea))
    const next = free[Math.floor(Math.random() * free.length)]
    if (next) setName(next)
  }
  const chooseLanguage = (next: Language) => {
    setLanguage(next)
    // O padrão do host (ex.: Jogo 2D) vale também quando a criança escolhe o JavaScript.
    setStart(next === 'javascript' ? jsPreset() : 'blank')
    setWay(
      next === 'python' &&
        !pythonEnvironments.some(({ kind }) => kind === 'classic') &&
        professionalAvailable
        ? 'code'
        : 'blocks',
    )
  }

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
      <label className="block text-sm text-sz-fg-soft" htmlFor="sz-new-project-name">
        {t('projects.newModal.nameLabel')}
      </label>
      <div className="mt-2 flex items-center gap-2">
        <input
          id="sz-new-project-name"
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
          className="min-w-0 flex-1 rounded border border-sz-border bg-sz-bg px-3 py-2 text-sm text-sz-fg outline-none focus:border-sz-accent focus-visible:ring-2 focus-visible:ring-sz-accent/60"
        />
        <Button variant="ghost" size="sm" disabled={submitting} onClick={shuffleName}>
          <span aria-hidden="true">🎲</span> {t('projects.newModal.shuffle')}
        </Button>
      </div>
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
      {language !== null && !selectedAvailable && (way === 'code' || language === 'python') && (
        <p role="status" className="mt-2 text-sm text-sz-fg-soft">
          Este ambiente deixou de estar disponível para novos projetos. Seu nome foi preservado;
          escolha outro modelo ou reabra esta janela.
        </p>
      )}

      {javascriptAvailable && pythonOffered && (
        <ChoiceGroup legend={t('projects.newModal.language')} disabled={submitting}>
          <ChoiceCard
            name="project-language"
            checked={language === 'javascript'}
            onChange={() => chooseLanguage('javascript')}
            emoji="🟨"
            title="JavaScript"
            hint={t('projects.newModal.language.js')}
          />
          <ChoiceCard
            name="project-language"
            checked={language === 'python'}
            disabled={!pythonReady}
            onChange={() => chooseLanguage('python')}
            emoji="🐍"
            title="Python"
            hint={t('projects.newModal.language.python')}
          >
            {pythonStatus ? (
              <span
                role={pythonDiscovery?.error ? 'alert' : 'status'}
                className="mt-1 block text-xs text-sz-fg-soft"
              >
                {pythonStatus}
              </span>
            ) : null}
          </ChoiceCard>
          {pythonDiscovery?.error ? (
            <Button variant="ghost" size="sm" disabled={submitting} onClick={pythonDiscovery.retry}>
              Tentar novamente
            </Button>
          ) : null}
        </ChoiceGroup>
      )}
      {!javascriptAvailable && pythonStatus ? (
        <div role={pythonDiscovery?.error ? 'alert' : 'status'} className="mt-3 text-sm">
          <p>{pythonStatus}</p>
          {pythonDiscovery?.error ? (
            <Button variant="ghost" size="sm" disabled={submitting} onClick={pythonDiscovery.retry}>
              Tentar novamente
            </Button>
          ) : null}
        </div>
      ) : null}

      {language !== null && codeOffered ? (
        <ChoiceGroup legend={t('projects.newModal.way')} disabled={submitting} row>
          <ChoiceCard
            name="project-way"
            checked={way === 'blocks'}
            disabled={
              language === 'python' && !pythonEnvironments.some((e) => e.kind === 'classic')
            }
            onChange={() => {
              setWay('blocks')
              setStart('blank')
            }}
            emoji="🧩"
            title={t('projects.newModal.way.blocks')}
            hint={t('projects.newModal.way.blocks.hint')}
          />
          <ChoiceCard
            name="project-way"
            checked={way === 'code'}
            onChange={() => {
              setWay('code')
              setStart('blank')
            }}
            emoji="⌨️"
            title={t('projects.newModal.way.code')}
            hint={t('projects.newModal.way.code.hint')}
          />
        </ChoiceGroup>
      ) : null}

      {language !== null && (way === 'blocks' || language === 'python') && points.length > 1 ? (
        <ChoiceGroup legend={t('projects.newModal.start')} disabled={submitting}>
          {points.map((item) => (
            <ChoiceCard
              key={item.id}
              name="project-start"
              checked={point.id === item.id}
              onChange={() => setStart(item.id)}
              emoji={item.emoji}
              title={item.title}
              hint={item.hint}
            />
          ))}
        </ChoiceGroup>
      ) : null}

      {language === 'javascript' && way === 'code' && templates.length > 0 ? (
        <div className="mt-4 space-y-3">
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
              {!templates.some((template) => template.id === templateId) && (
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
            {selectedTemplate?.description && (
              <span className="mt-1 block text-xs text-sz-fg-mute">
                {selectedTemplate.description}
              </span>
            )}
          </label>
          {!visibleTemplates.length && (
            <p role="status" className="text-sm">
              Não há modelos dessa categoria disponíveis aqui.
            </p>
          )}
        </div>
      ) : null}
    </Modal>
  )
}

function ChoiceGroup({
  legend,
  disabled,
  row = false,
  children,
}: {
  legend: string
  disabled: boolean
  row?: boolean
  children: ReactNode
}): JSX.Element {
  return (
    <fieldset className="mt-4 min-w-0 border-0 p-0" disabled={disabled}>
      <legend className="mb-2 text-xs font-bold uppercase text-sz-fg-mute">{legend}</legend>
      <div className={cn('grid gap-2', row ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2')}>
        {children}
      </div>
    </fieldset>
  )
}

/** Um cartão escolhível (rádio de verdade por dentro, para teclado e leitor de tela). */
function ChoiceCard({
  name,
  checked,
  disabled = false,
  onChange,
  emoji,
  title,
  hint,
  children,
}: {
  name: string
  checked: boolean
  disabled?: boolean
  onChange: () => void
  emoji: string
  title: string
  hint: string
  children?: ReactNode
}): JSX.Element {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-sz-accent/60',
        checked
          ? 'border-sz-accent bg-sz-accent/10'
          : 'border-sz-border bg-sz-panel hover:border-sz-accent/60',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="sr-only"
      />
      <span aria-hidden="true" className="text-2xl leading-none">
        {emoji}
      </span>
      <span className="min-w-0">
        <span className="block font-bold text-sz-fg">{title}</span>
        <span className="block text-xs text-sz-fg-soft">{hint}</span>
        {children}
      </span>
    </label>
  )
}
