import type { PensaProjectView } from '@sistemazero/core/pensa'
import {
  Fragment,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import type { PensaTransport } from '../core/types'
import { usePensaUi } from './context'
import { useDialogFocus } from './dialogFocus'
import {
  ArchiveIcon,
  CloseIcon,
  DotsIcon,
  HistoryIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
  UsersIcon,
} from './icons'
import { ProjectCare } from './ProjectCare'

export interface CareMenuItem {
  id: string
  icon: ReactNode
  tone: 'yellow' | 'blue' | 'mint' | 'red'
  title: string
  text?: string
  danger?: boolean
  /** Só aparece no celular (no computador o botão mora no cabeçalho). */
  narrowOnly?: boolean
  onSelect(): void
}

/**
 * O botão de três pontos do topo (Canvas "Cuidar do jogo"): pausar, guardar, versões e apagar
 * saíram do fim da página. Menu de verdade: setas andam, Esc fecha e o foco volta ao botão.
 */
export function CareMenu({ items, narrow }: { items: CareMenuItem[]; narrow: boolean }) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const visible = items.filter((item) => narrow || !item.narrowOnly)
  useEffect(() => {
    if (!open) return
    menu.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
    function outside(event: PointerEvent) {
      const target = event.target as Node
      if (!menu.current?.contains(target) && !button.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  function close(focus = true) {
    setOpen(false)
    if (focus) button.current?.focus()
  }
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const entries = Array.from(
      menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
    )
    const index = entries.indexOf(document.activeElement as HTMLButtonElement)
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      entries[(index + step + entries.length) % entries.length]?.focus()
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      ;(event.key === 'Home' ? entries[0] : entries.at(-1))?.focus()
    } else if (event.key === 'Tab') close(false)
  }
  return (
    <div className="pz-menu-wrap">
      <button
        ref={button}
        type="button"
        className="pz-btn pz-btn--card pz-btn--icon"
        aria-label="Cuidar do jogo"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(!open)}
      >
        <DotsIcon size={20} />
      </button>
      {open ? (
        <div
          ref={menu}
          id={menuId}
          role="menu"
          aria-label="Cuidar do jogo"
          className="pz-menu"
          onKeyDown={onKeyDown}
        >
          {visible.map((item, index) => (
            <Fragment key={item.id}>
              {item.danger && index > 0 ? <hr className="pz-menu__sep" /> : null}
              <button
                type="button"
                role="menuitem"
                className={`pz-menu__item${item.danger ? ' is-danger' : ''}`}
                onClick={() => {
                  // O foco volta ao botão ANTES da ação: a janela que ela abre guarda quem tinha o
                  // foco e o devolve a ele (um item do menu já desmontado não recebe foco).
                  close()
                  item.onSelect()
                }}
              >
                <span className={`pz-menu__icon is-${item.tone}`} aria-hidden="true">
                  {item.icon}
                </span>
                <span className="pz-menu__text">
                  <strong>{item.title}</strong>
                  {item.text ? <span>{item.text}</span> : null}
                </span>
              </button>
            </Fragment>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/** Os itens do menu, a partir do projeto e do papel de quem olha. */
export function careMenuItems({
  view,
  owner,
  onPause,
  onArchive,
  onVersions,
  onDelete,
  onTeam,
  onOpenGame,
}: {
  view: PensaProjectView
  owner: boolean
  onPause(): void
  onArchive(): void
  onVersions(): void
  onDelete(): void
  onTeam(): void
  onOpenGame: (() => void) | null
}): CareMenuItem[] {
  const items: CareMenuItem[] = []
  if (onOpenGame)
    items.push({
      id: 'game',
      icon: <PlayIcon size={18} />,
      tone: 'blue',
      title: 'Abrir meu jogo',
      narrowOnly: true,
      onSelect: onOpenGame,
    })
  items.push({
    id: 'team',
    icon: <UsersIcon size={20} />,
    tone: 'blue',
    title: 'Equipe',
    narrowOnly: true,
    onSelect: onTeam,
  })
  if (owner) {
    items.push({
      id: 'pause',
      icon: view.project.paused ? <PlayIcon size={18} /> : <PauseIcon size={20} />,
      tone: 'yellow',
      title: view.project.paused ? 'Continuar de onde parei' : 'Pausar por enquanto',
      text: view.project.paused ? 'As missões voltam a abrir.' : 'As missões esperam você voltar.',
      onSelect: onPause,
    })
    items.push({
      id: 'archive',
      icon: <ArchiveIcon size={20} />,
      tone: 'blue',
      title: view.project.status === 'active' ? 'Mover para Guardados' : 'Trazer de volta',
      text:
        view.project.status === 'active'
          ? 'Sai de Em andamento. Dá para trazer de volta.'
          : 'Volta para Em andamento.',
      onSelect: onArchive,
    })
  }
  items.push({
    id: 'versions',
    icon: <HistoryIcon size={20} />,
    tone: 'mint',
    title: 'Versões guardadas',
    text: 'Guarde o jogo de agora ou volte a uma versão.',
    onSelect: onVersions,
  })
  if (owner)
    items.push({
      id: 'delete',
      icon: <TrashIcon size={20} />,
      tone: 'red',
      title: 'Apagar este plano',
      text: 'As criações nas oficinas continuam guardadas.',
      danger: true,
      onSelect: onDelete,
    })
  return items
}

/** O painel das versões guardadas, numa janela própria. */
export function VersionsDialog({
  view,
  transport,
  onChanged,
  onClose,
  returnFocusTo,
}: {
  view: PensaProjectView
  transport: PensaTransport
  onChanged(): Promise<void>
  onClose(): void
  returnFocusTo: RefObject<HTMLElement | null>
}) {
  const { copy, readOnly } = usePensaUi()
  const cardRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useDialogFocus({ open: true, cardRef, busy: false, onClose, returnFocusTo })
  return (
    <div className="pz-scrim">
      <div
        ref={cardRef}
        className="pz-dialog pz-dialog--versions"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <button
          type="button"
          className="pz-icon-btn is-quiet pz-dialog__close"
          aria-label="Fechar as versões"
          onClick={onClose}
        >
          <CloseIcon size={20} />
        </button>
        <ProjectCare
          view={view}
          transport={transport}
          onChanged={onChanged}
          copy={copy}
          readOnly={readOnly}
          titleId={titleId}
        />
      </div>
    </div>
  )
}
