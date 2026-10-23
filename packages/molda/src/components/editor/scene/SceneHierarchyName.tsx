import {
  type ButtonHTMLAttributes,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type { SceneHierarchyOrganization } from './useSceneHierarchyOrganization'

/** One inline edit; external names and access changes revoke its draft. */
export function SceneHierarchyName({
  id,
  name,
  organization,
  children,
  ...button
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  id: string
  name: string
  organization?: SceneHierarchyOrganization
  children: ReactNode
}) {
  const [editing, setEditing] = useState(false)
  const draft = useRef<HTMLInputElement>(null)
  const live = useRef(false)
  const sourceName = useRef(name)
  const returnFocus = useRef(false)
  const editable = organization?.canRename(id) ?? false
  useLayoutEffect(() => {
    if (live.current && (sourceName.current !== name || !editable)) {
      live.current = false
      setEditing(false)
    }
  }, [name, editable])
  const inputRef = useCallback((input: HTMLInputElement | null) => {
    draft.current = input
    input?.focus()
    input?.select()
  }, [])
  const buttonRef = useCallback((element: HTMLButtonElement | null) => {
    if (element && returnFocus.current) {
      returnFocus.current = false
      element.focus()
    }
  }, [])
  function begin() {
    if (!editable) return
    live.current = true
    sourceName.current = name
    setEditing(true)
  }
  function finish(save: boolean, focus: boolean) {
    if (!live.current) return
    const value = draft.current?.value.trim()
    if (save && value && value !== name && !organization?.rename(id, value)) return
    live.current = false
    setEditing(false)
    // The input disappears in this event; the ref callback restores the keyboard target.
    if (focus) returnFocus.current = true
  }
  if (editing && editable)
    return (
      <input
        ref={inputRef}
        name="scene-hierarchy-name"
        aria-label={`Renomear ${name} na árvore`}
        className="mld-hierarchy-name"
        defaultValue={name}
        maxLength={48}
        onBlur={() => finish(true, false)}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === 'Enter' || event.key === 'Escape') {
            event.preventDefault()
            finish(event.key === 'Enter', true)
          }
        }}
      />
    )
  return (
    <button
      {...button}
      ref={buttonRef}
      type="button"
      aria-keyshortcuts={editable ? 'F2' : undefined}
      onDoubleClick={begin}
      onKeyDown={(event) => {
        if (event.key === 'F2' && editable) {
          event.preventDefault()
          event.stopPropagation()
          begin()
        }
      }}
    >
      {children}
    </button>
  )
}
