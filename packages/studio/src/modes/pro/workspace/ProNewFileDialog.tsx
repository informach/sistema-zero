import { type JSX, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ProjectTree } from '#core'
import { cn, IconFile, IconFolder, Modal } from '#ui'
import { useT } from '../../../studio/i18n'

type NewKind = 'js' | 'ts' | 'py' | 'css' | 'html' | 'text' | 'dir'

const EXTENSION: Record<Exclude<NewKind, 'dir'>, string> = {
  js: 'js',
  ts: 'ts',
  py: 'py',
  css: 'css',
  html: 'html',
  text: 'txt',
}
const TILE: Record<NewKind, { tone: string; short: string }> = {
  js: { tone: 'js', short: 'JS' },
  ts: { tone: 'js', short: 'TS' },
  py: { tone: 'py', short: 'Py' },
  css: { tone: 'css', short: '' },
  html: { tone: 'html', short: '' },
  text: { tone: 'text', short: '' },
  dir: { tone: 'dir', short: '' },
}

/** O nome como a criança digitou, sem acento e sem espaço (a sugestão explícita de sempre). */
export function suggestProName(name: string): string {
  return name.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-')
}

/** O caminho final: pasta + nome + a terminação do tipo, quando o nome ainda não tem uma. */
export function newProPath(base: string, name: string, kind: NewKind): string {
  const clean = name.trim()
  const withExtension =
    kind === 'dir' || !clean || /\.[A-Za-z0-9]+$/.test(clean)
      ? clean
      : `${clean}.${EXTENSION[kind]}`
  return base ? `${base}/${withExtension}` : withExtension
}

/**
 * A janela "Criar um arquivo" do Pro (redesenho de 11/2026): cartões do QUE criar (JavaScript ou
 * TypeScript · Estilo CSS · Página HTML · Pasta; no Python, Código Python · Texto · Pasta), o
 * nome (a terminação entra sozinha), ONDE guardar (a pasta escolhida no ⋯, ou `src/`) e a prévia
 * do caminho. A validação e a criação são as de sempre (`addProFile`/`addProDir` devolvem o
 * recado do problema), e a sugestão sem acento continua uma escolha explícita da criança.
 */
export function ProNewFileDialog({
  open,
  tree,
  python,
  initialBase,
  onClose,
  create,
}: {
  open: boolean
  tree: ProjectTree
  python: boolean
  initialBase?: string
  onClose: () => void
  /** Cria e devolve o recado do problema (ou `null` quando deu certo). */
  create: (path: string, kind: 'file' | 'dir') => string | null
}): JSX.Element | null {
  const t = useT()
  const id = useId()
  const typescript = useMemo(
    () => Object.keys(tree).some((path) => /^src\/.+\.tsx?$/.test(path)),
    [tree],
  )
  const kinds: NewKind[] = python
    ? ['py', 'text', 'dir']
    : [typescript ? 'ts' : 'js', 'css', 'html', 'dir']
  const folders = useMemo(
    () =>
      Object.keys(tree)
        .filter((path) => tree[path]?.kind === 'dir' && !path.startsWith('node_modules'))
        .sort(),
    [tree],
  )
  const fallbackBase = folders.includes('src') ? 'src' : ''
  const [kind, setKind] = useState<NewKind>(kinds[0] ?? 'js')
  const [name, setName] = useState('')
  const [base, setBase] = useState(initialBase ?? fallbackBase)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  // Cada abertura começa limpa, na pasta pedida.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reabrir é o gatilho; os outros valores são lidos na hora.
  useEffect(() => {
    if (!open) return
    setKind(kinds[0] ?? 'js')
    setName('')
    setError(null)
    setBase(initialBase ?? fallbackBase)
    queueMicrotask(() => input.current?.focus())
  }, [open, initialBase])
  if (!open) return null
  const suggestion = suggestProName(name)
  const path = newProPath(base, name, kind)
  const submit = () => {
    if (!name.trim()) return
    const issue = create(path, kind === 'dir' ? 'dir' : 'file')
    if (issue) {
      setError(issue)
      return
    }
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={t('pro.files.newTitle')}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="sz-pro-btn" onClick={onClose}>
            {t('pro.cancel')}
          </button>
          <button
            type="submit"
            form={`${id}-form`}
            className="sz-pro-btn sz-pro-btn--primary"
            disabled={!name.trim()}
          >
            {t('pro.newFile.create')}
          </button>
        </div>
      }
    >
      <form
        id={`${id}-form`}
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 text-sm font-bold">{t('pro.newFile.what')}</legend>
          <div className="grid grid-cols-2 gap-2">
            {kinds.map((option) => {
              const tile = TILE[option]
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={kind === option}
                  className={cn(
                    'sz-pro-row min-h-14 border-sz-border',
                    kind === option && 'border-sz-accent',
                  )}
                  onClick={() => setKind(option)}
                >
                  <span
                    aria-hidden="true"
                    className={cn('sz-pro-tile', `sz-pro-tile--${tile.tone}`)}
                  >
                    {tile.short || (option === 'dir' ? <IconFolder /> : <IconFile />)}
                  </span>
                  <span className="sz-pro-row__name">{t(`pro.newFile.kind.${option}`)}</span>
                </button>
              )
            })}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1 text-sm font-bold">
          {t('pro.newFile.name')}
          <input
            ref={input}
            name="new-pro-node"
            aria-label="Nome do novo item"
            autoComplete="off"
            value={name}
            maxLength={120}
            onChange={(event) => {
              setName(event.target.value)
              setError(null)
            }}
            placeholder={kind === 'dir' ? 'pasta' : `arquivo.${EXTENSION[kind]}`}
            className="min-h-11 rounded-xl border-2 border-sz-border bg-sz-bg px-3 font-mono font-normal text-sz-fg placeholder:text-sz-fg-mute"
          />
        </label>
        {suggestion !== name ? (
          <button
            type="button"
            className="self-start text-sm font-bold text-sz-accent underline"
            onClick={() => setName(suggestion)}
          >
            {t('pro.newFile.suggest', { name: suggestion })}
          </button>
        ) : null}
        <label className="flex flex-col gap-1 text-sm font-bold">
          {t('pro.newFile.where')}
          <select
            value={base}
            onChange={(event) => setBase(event.target.value)}
            className="min-h-11 rounded-xl border-2 border-sz-border bg-sz-bg px-3 font-normal text-sz-fg"
          >
            <option value="">{t('pro.newFile.root')}</option>
            {folders.map((folder) => (
              <option key={folder} value={folder}>
                {folder}/
              </option>
            ))}
          </select>
        </label>
        <p className="m-0 text-sm text-sz-fg-soft">
          {t('pro.newFile.preview', { path: path || '…' })}
        </p>
        <p className="m-0 text-xs text-sz-fg-mute">{t('pro.newFile.hint')}</p>
        {error ? (
          <p role="alert" className="m-0 text-sm text-sz-error">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  )
}
