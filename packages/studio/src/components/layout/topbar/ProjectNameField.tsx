import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'
import { IconPencil } from '#ui'
import { useT } from '../../../studio/i18n'

/**
 * O nome do projeto na pílula da tela-modelo, com o lápis (11/09/2026). Clicar troca a pílula
 * pelo campo "Nome do projeto": Enter ou sair do campo grava, Esc desiste.
 *
 * O FOCO acompanha a troca: o botão some quando o campo aparece, e sem levar o foco junto quem
 * usa o teclado ficava sem nada focado (e quem usa o mouse precisava clicar de novo para
 * digitar). Pelo teclado (Enter/Esc) o foco volta à pílula; saindo com o mouse, fica onde a
 * criança clicou.
 */
export function ProjectNameField({
  name,
  onRename,
  showPencil,
}: {
  name: string
  onRename: (name: string) => void
  showPencil: boolean
}): JSX.Element {
  const t = useT()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const inputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  // Esc desiste: um `blur` que chegue depois (a remoção do campo) não pode gravar o rascunho.
  const cancelledRef = useRef(false)
  const returnFocusRef = useRef(false)

  useEffect(() => {
    if (!editing) setDraft(name)
  }, [editing, name])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    } else if (returnFocusRef.current) {
      returnFocusRef.current = false
      buttonRef.current?.focus()
    }
  }, [editing])

  if (editing) {
    return (
      <input
        ref={inputRef}
        name="project-name"
        aria-label="Nome do projeto"
        autoComplete="off"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (!cancelledRef.current) onRename(draft.trim() || 'Sem título')
          setEditing(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            returnFocusRef.current = true
            e.currentTarget.blur()
          }
          if (e.key === 'Escape') {
            cancelledRef.current = true
            returnFocusRef.current = true
            setDraft(name)
            setEditing(false)
          }
        }}
        className="sz-bar-name sz-bar-name--editing"
      />
    )
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => {
        cancelledRef.current = false
        setDraft(name)
        setEditing(true)
      }}
      className="sz-bar-name"
      title={t('topbar.rename')}
    >
      <span className="sz-bar-name__text">{name}</span>
      {showPencil ? <IconPencil /> : null}
    </button>
  )
}
