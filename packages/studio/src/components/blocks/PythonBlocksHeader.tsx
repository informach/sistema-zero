import { type JSX, useEffect, useId, useRef, useState } from 'react'
import { cn, IconChevronDown } from '#ui'
import { useMeasuredWidth } from '../../hooks/useMeasuredWidth'
import type { PythonProgramNavigationState } from '../../python/blocks/programNavigation'
import { useT } from '../../studio/i18n'

/** Abaixo desta largura do PRÓPRIO cabeçalho, os botões ficam só no ícone/número. */
const HEADER_COMPACT_MAX_PX = 560

/**
 * O cabeçalho do editor de blocos do Python (redesenho do clássico, 11/2026), no molde do
 * cabeçalho do palco: as três linhas de antes (Arquivo; Programa / De cima para baixo / Buscar
 * função / Programa completo / Recolher funções / Rascunhos / "Peças fora do Programa não
 * executam."; Buscar blocos) viram UMA: [Py arquivo ▾] · Ir para [Programa inteiro ▾] · Fechar
 * as funções · Rascunhos N. A frase dos rascunhos foi para a dica; a busca de blocos foi para a
 * paleta ("Procurar um bloco"). Os comandos são os mesmos de antes (`navigate`, `scratch`).
 */
export function PythonBlocksHeader({
  path,
  files,
  onChangeFile,
  program,
  activeDefinition,
  locked,
  onNavigate,
  onScratch,
}: {
  path: string
  /** Os .py do projeto; com mais de um, o nome vira um seletor. */
  files: readonly string[]
  onChangeFile?: (path: string) => void
  program: PythonProgramNavigationState
  /** A função ou classe aberta agora ('' = o Programa inteiro). */
  activeDefinition: string
  locked: boolean
  onNavigate: (id?: string) => void
  onScratch: () => void
}): JSX.Element {
  const t = useT()
  const head = useRef<HTMLFieldSetElement>(null)
  const width = useMeasuredWidth(head)
  const compact = width > 0 && width < HEADER_COMPACT_MAX_PX
  const active = program.entries.find((entry) => entry.id === activeDefinition)
  const draftsHint = t('pyblocks.drafts.hint')
  return (
    <fieldset ref={head} className="sz-pro-stage__head sz-py-head">
      <legend className="sr-only">{t('pyblocks.header')}</legend>
      <span aria-hidden="true" className="sz-pro-tile sz-pro-tile--sm sz-pro-tile--py">
        Py
      </span>
      {files.length > 1 && onChangeFile ? (
        <select
          aria-label={t('pyblocks.file')}
          value={path}
          disabled={locked}
          onChange={(event) => onChangeFile(event.target.value)}
          className="sz-py-head__file sz-py-head__select"
        >
          {files.map((file) => (
            <option key={file} value={file}>
              {file}
            </option>
          ))}
        </select>
      ) : (
        <span className="sz-py-head__file" title={path}>
          {path}
        </span>
      )}
      {program.entries.length > 0 ? (
        <ProgramJump
          program={program}
          activeId={activeDefinition}
          activeLabel={active?.label ?? null}
          locked={locked}
          compact={compact}
          onNavigate={onNavigate}
        />
      ) : null}
      {activeDefinition ? (
        <button
          type="button"
          className="sz-pro-btn sz-pro-btn--sm"
          disabled={locked}
          onClick={() => onNavigate()}
        >
          {t('pyblocks.closeFunctions')}
        </button>
      ) : null}
      <span className="flex-1" />
      <button
        type="button"
        className={cn('sz-pro-btn sz-pro-btn--sm', program.scratch > 0 && 'sz-py-head__drafts')}
        disabled={locked || !program.scratch}
        title={draftsHint}
        aria-label={`${t('pyblocks.drafts')} ${program.scratch}. ${draftsHint}`}
        onClick={onScratch}
      >
        {compact ? null : <span aria-hidden="true">{t('pyblocks.drafts')}</span>}
        <span aria-hidden="true" className="sz-pro-badge sz-pro-badge--quiet">
          {program.scratch}
        </span>
      </button>
    </fieldset>
  )
}

/**
 * "Ir para": o Programa inteiro ou uma função/classe, com a busca DENTRO da lista (antes eram um
 * campo e um seletor soltos). Um botão que abre uma lista curta; Esc ou clicar fora fecha.
 */
function ProgramJump({
  program,
  activeId,
  activeLabel,
  locked,
  compact,
  onNavigate,
}: {
  program: PythonProgramNavigationState
  activeId: string
  activeLabel: string | null
  locked: boolean
  compact: boolean
  onNavigate: (id?: string) => void
}): JSX.Element {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const listId = useId()
  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])
  const normalized = query.trim().toLocaleLowerCase()
  const entries = program.entries.filter(
    (entry) => !normalized || entry.label.toLocaleLowerCase().includes(normalized),
  )
  const go = (id?: string) => {
    setOpen(false)
    setQuery('')
    onNavigate(id)
  }
  const current = activeLabel ?? t('pyblocks.wholeProgram')
  return (
    <div ref={box} className="sz-py-jump">
      <button
        type="button"
        className="sz-pro-btn sz-pro-btn--sm"
        disabled={locked}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`${t('pyblocks.goTo')}: ${current}`}
        onClick={() => setOpen(!open)}
      >
        {compact ? null : <span className="text-sz-fg-soft">{t('pyblocks.goTo')}</span>}
        <span className="sz-py-jump__current">{current}</span>
        <IconChevronDown />
      </button>
      {open ? (
        <div
          id={listId}
          className="sz-py-jump__panel"
          role="dialog"
          aria-label={t('pyblocks.goTo')}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation()
              setOpen(false)
            }
          }}
        >
          <input
            type="search"
            // biome-ignore lint/a11y/noAutofocus: a lista abre por um clique e o campo é a primeira coisa a usar.
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('pyblocks.findFunction')}
            aria-label={t('pyblocks.findFunction')}
            className="sz-py-jump__search"
          />
          <ul className="sz-py-jump__list">
            <li>
              <button
                type="button"
                aria-current={activeId === '' ? 'true' : undefined}
                onClick={() => go()}
              >
                {t('pyblocks.wholeProgram')}
              </button>
            </li>
            {entries.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  aria-current={entry.id === activeId ? 'true' : undefined}
                  style={{ paddingInlineStart: `${0.75 + entry.depth * 0.875}rem` }}
                  onClick={() => go(entry.id)}
                >
                  {entry.label}
                </button>
              </li>
            ))}
            {entries.length === 0 ? (
              <li className="sz-py-jump__empty">{t('pyblocks.noFunction')}</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
