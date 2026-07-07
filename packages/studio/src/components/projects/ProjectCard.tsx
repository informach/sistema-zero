import type { JSX, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { t } from '#core'
import { Button, ConfirmDialog } from '#ui'
import { downloadProjectAsJSON } from '../../export/download'
import { prefetchMode } from '../../modes/lazyModes'
import type { ProjectSummary } from '../../state/persistence'
import { loadSanitizedProjectById, useProjectStore } from '../../state/projectStore'
import { StudioThemeScope } from '../../studio/theme'
import { Spinner } from '../layout/LoadingViews'

export interface ProjectCardProps {
  summary: ProjectSummary
  onChanged: () => void
  /** Abre o projeto no editor (navegação é do host/página, não do card). */
  onOpen: () => void
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const MENU_WIDTH = 176
const MENU_HEIGHT = 146
const VIEWPORT_MARGIN = 8

interface MenuPosition {
  left: number
  top: number
}

function positionMenu(trigger: DOMRect): MenuPosition {
  const left = Math.min(
    window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN,
    Math.max(VIEWPORT_MARGIN, trigger.right - MENU_WIDTH),
  )
  const below = trigger.bottom + 4
  const above = trigger.top - MENU_HEIGHT - 4
  const top =
    below + MENU_HEIGHT <= window.innerHeight - VIEWPORT_MARGIN
      ? below
      : Math.max(VIEWPORT_MARGIN, above)
  return { left, top }
}

export function ProjectCard({ summary, onChanged, onOpen }: ProjectCardProps): JSX.Element {
  const renameProject = useProjectStore((s) => s.renameProject)
  const duplicateProject = useProjectStore((s) => s.duplicateProject)
  const deleteProject = useProjectStore((s) => s.deleteProject)

  const [editing, setEditing] = useState(false)
  const [opening, setOpening] = useState(false)
  const [draft, setDraft] = useState(summary.name)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const renameInputRef = useRef<HTMLInputElement | null>(null)

  // Fecha o menu E devolve o foco ao gatilho (kebab), para teclado/leitor de
  // tela não ficarem presos no <body> após Escape/seleção/clique fora.
  const closeMenu = () => {
    setMenuOpen(false)
    triggerRef.current?.focus()
  }

  // Itens de menu visíveis (role=menuitem) para a navegação por setas.
  const menuItems = (): HTMLButtonElement[] =>
    menuRef.current
      ? Array.from(menuRef.current.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'))
      : []

  // Foco itinerante (roving) no menu: setas movem entre itens, Home/End vão às
  // pontas. Escape é tratado no listener de documento (closeMenu restaura foco).
  const onMenuKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = menuItems()
    if (items.length === 0) return
    const current = items.indexOf(document.activeElement as HTMLButtonElement)
    let next = -1
    if (e.key === 'ArrowDown') next = current < 0 ? 0 : (current + 1) % items.length
    else if (e.key === 'ArrowUp') next = current <= 0 ? items.length - 1 : current - 1
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = items.length - 1
    else return
    e.preventDefault()
    items[next]?.focus()
  }

  useEffect(() => {
    setDraft(summary.name)
  }, [summary.name])

  useEffect(() => {
    if (!editing) return
    renameInputRef.current?.focus()
    renameInputRef.current?.select()
  }, [editing])

  useLayoutEffect(() => {
    if (!menuOpen) {
      setMenuPosition(null)
      return
    }
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      setMenuPosition(positionMenu(rect))
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [menuOpen])

  // biome-ignore lint/correctness/useExhaustiveDependencies: subscreve o keydown só ao ABRIR/fechar; closeMenu é estável o suficiente
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  // Ao abrir, leva o foco para o primeiro item (foco-in) — sem isso o teclado/SR
  // ficava no <body> e os itens portalados eram inalcançáveis. Roda após o
  // posicionamento (menuPosition definido = menu já no DOM).
  // biome-ignore lint/correctness/useExhaustiveDependencies: menuItems() consulta o DOM na hora; rodar só ao abrir/posicionar é intencional
  useEffect(() => {
    if (!menuOpen || !menuPosition) return
    menuItems()[0]?.focus()
  }, [menuOpen, menuPosition])

  const commitRename = async () => {
    setEditing(false)
    const next = draft.trim()
    if (!next || next === summary.name) {
      setDraft(summary.name)
      return
    }
    await renameProject(summary.id, next)
    onChanged()
  }

  const handleDuplicate = async () => {
    closeMenu()
    await duplicateProject(summary.id)
    onChanged()
  }

  const handleDelete = async () => {
    if (deleting) return
    setDeleting(true)
    try {
      await deleteProject(summary.id)
      setDeleteOpen(false)
      onChanged()
    } finally {
      setDeleting(false)
    }
  }

  const handleExport = async () => {
    closeMenu()
    const full = await loadSanitizedProjectById(summary.id)
    if (!full) return
    downloadProjectAsJSON(full)
  }

  // Começa a baixar/avaliar o chunk do modo salvo ANTES do clique (hover e
  // pointerdown), para que a navegação não espere o download. Idempotente.
  const prefetch = () => prefetchMode(summary.mode)

  // Abre o projeto dando feedback imediato no card ("Abrindo…") no mesmo gesto —
  // assim o aluno vê que o clique pegou enquanto o editor carrega.
  const openProject = () => {
    setOpening(true)
    onOpen()
  }

  return (
    <>
      <article
        onPointerEnter={prefetch}
        className="group relative z-0 flex h-44 flex-col rounded-lg border border-sz-border bg-sz-panel p-4 text-left transition-colors hover:border-sz-accent/60 hover:bg-sz-panel-soft"
      >
        <button
          type="button"
          className="absolute inset-0 z-0 cursor-pointer rounded-lg"
          aria-label={`Abrir projeto ${summary.name}`}
          onPointerDown={prefetch}
          onClick={openProject}
        />
        <div className="relative z-10 flex items-start justify-between gap-2">
          {editing ? (
            <input
              ref={renameInputRef}
              name="project-card-name"
              aria-label={`Renomear ${summary.name}`}
              autoComplete="off"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => void commitRename()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                if (e.key === 'Escape') {
                  setDraft(summary.name)
                  setEditing(false)
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded border border-sz-border bg-sz-bg px-2.5 py-1.5 text-sm text-sz-fg"
            />
          ) : (
            <button
              type="button"
              title="Duplo clique para renomear"
              onDoubleClick={(e) => {
                e.stopPropagation()
                setEditing(true)
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 truncate text-left text-base font-semibold text-sz-fg"
            >
              {summary.name}
            </button>
          )}
          <div className="relative">
            <button
              ref={triggerRef}
              type="button"
              aria-label="Mais ações"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              style={{ touchAction: 'manipulation' }}
              className="rounded p-1.5 text-sz-fg-soft hover:bg-sz-bg hover:text-sz-fg"
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen((v) => !v)
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>
            {menuOpen &&
              menuPosition &&
              createPortal(
                <StudioThemeScope>
                  <button
                    type="button"
                    aria-label="Fechar menu de ações"
                    tabIndex={-1}
                    className="fixed inset-0 z-40 cursor-default bg-transparent"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      closeMenu()
                    }}
                  />
                  <div
                    ref={menuRef}
                    role="menu"
                    aria-label="Ações do projeto"
                    onKeyDown={onMenuKeyDown}
                    className="fixed z-50 w-44 overflow-hidden rounded-md border border-sz-border bg-sz-panel shadow-2xl"
                    style={{ left: menuPosition.left, top: menuPosition.top }}
                  >
                    <MenuItem
                      onClick={() => {
                        setMenuOpen(false)
                        setEditing(true)
                      }}
                    >
                      {t('projects.rename')}
                    </MenuItem>
                    <MenuItem onClick={() => void handleDuplicate()}>
                      {t('projects.duplicate')}
                    </MenuItem>
                    <MenuItem onClick={() => void handleExport()}>{t('projects.export')}</MenuItem>
                    <MenuItem
                      danger
                      onClick={() => {
                        // closeMenu() devolve o foco ao kebab ANTES de o menu
                        // desmontar; assim o Modal do ConfirmDialog captura o
                        // gatilho como activeElement e o restaura ao fechar
                        // (sem isso o foco caía no <body> e se perdia).
                        closeMenu()
                        setDeleteOpen(true)
                      }}
                    >
                      {t('projects.delete')}
                    </MenuItem>
                  </div>
                </StudioThemeScope>,
                document.body,
              )}
          </div>
        </div>

        <div className="relative z-10 mt-auto flex items-end justify-between text-xs text-sz-fg-soft">
          <span>Atualizado em {formatDate(summary.updatedAt)}</span>
          <Button
            variant="primary"
            size="sm"
            disabled={opening}
            onPointerDown={prefetch}
            onClick={(e) => {
              e.stopPropagation()
              openProject()
            }}
          >
            {opening ? (
              <span className="flex items-center gap-1.5">
                <Spinner className="h-3.5 w-3.5" />
                Abrindo…
              </span>
            ) : (
              'Abrir'
            )}
          </Button>
        </div>
      </article>
      <ConfirmDialog
        open={deleteOpen}
        title={t('projects.delete')}
        confirmLabel={t('projects.delete')}
        cancelLabel={t('projects.newModal.cancel')}
        danger
        busy={deleting}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
      >
        {t('projects.confirmDelete', { name: summary.name })}
      </ConfirmDialog>
    </>
  )
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: ReactNode
  onClick: () => void
  danger?: boolean
}): JSX.Element {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={[
        'block w-full px-3 py-2 text-left text-sm transition-colors',
        danger
          ? 'text-sz-error hover:bg-sz-error/10'
          : 'text-sz-fg hover:bg-sz-bg hover:text-sz-fg',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
