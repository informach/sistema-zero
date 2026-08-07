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
  /** Nomes de TODOS os projetos da lista — renomear para um já usado é recusado. */
  takenNames?: ReadonlySet<string>
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

// ⚠️ Acompanham o CSS do menu (w-48 + 4 itens de 44px + borda 2px): se os
// itens mudarem, o posicionamento com flip perto da borda erra junto.
const MENU_WIDTH = 192
const MENU_HEIGHT = 180
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

export function ProjectCard({
  summary,
  onChanged,
  onOpen,
  takenNames,
}: ProjectCardProps): JSX.Element {
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

  // Duplicado = nome de OUTRO projeto (o próprio nome atual segue permitido).
  const duplicateDraft =
    editing && draft.trim() !== summary.name && (takenNames?.has(draft.trim()) ?? false)

  const commitRename = async () => {
    setEditing(false)
    const next = draft.trim()
    if (!next || next === summary.name) {
      setDraft(summary.name)
      return
    }
    if (takenNames?.has(next)) {
      // Colisão no blur: recusa e volta ao nome atual (o aviso já orientou).
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
      {/* Painel no padrão do Pinta (borda 2 + sombra dura + pop no hover);
          h-48 acomoda o "Abrir" com alvo de 44px no rodapé. */}
      <article
        onPointerEnter={prefetch}
        className="sz-home-panel sz-home-pop group relative z-0 flex h-48 flex-col p-4 text-left"
      >
        <button
          type="button"
          className="absolute inset-0 z-0 cursor-pointer rounded-2xl"
          aria-label={`Abrir projeto ${summary.name}`}
          onPointerDown={prefetch}
          onClick={openProject}
        />
        <div className="relative z-10 flex items-start justify-between gap-2">
          {editing ? (
            <div className="w-full">
              <input
                ref={renameInputRef}
                name="project-card-name"
                aria-label={`Renomear ${summary.name}`}
                autoComplete="off"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => void commitRename()}
                onKeyDown={(e) => {
                  // Enter com duplicado mantém a edição (o aviso explica o porquê).
                  if (e.key === 'Enter' && !duplicateDraft) (e.target as HTMLInputElement).blur()
                  if (e.key === 'Escape') {
                    setDraft(summary.name)
                    setEditing(false)
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                aria-invalid={duplicateDraft || undefined}
                className="w-full rounded-xl border-2 border-sz-border bg-sz-bg px-2.5 py-1.5 text-sm text-sz-fg outline-none focus:border-sz-accent"
              />
              {duplicateDraft && (
                <p role="status" className="mt-1 text-xs text-sz-error">
                  {t('projects.newModal.duplicate')}
                </p>
              )}
            </div>
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
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-sz-fg-soft hover:bg-sz-border/40 hover:text-sz-fg"
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
                    className="fixed z-50 w-48 overflow-hidden rounded-xl border-2 border-sz-border bg-sz-panel shadow-2xl"
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

        {!editing && (
          // Capa capturada ao sair do editor. `pointer-events-none` deixa o clique
          // atravessar até o botão invisível de abrir (absolute inset-0 abaixo).
          //
          // ⚠️ SEM capa o bloco inteiro sumia, e o card ficava só com nome e data —
          // a ausência lia como "a feature quebrou" em vez de "ainda não tem foto".
          // Com o espaço reservado, todos os cards têm a MESMA altura e a capa que
          // chega depois (a captura é assíncrona) não empurra o grid.
          <div className="pointer-events-none mt-2 min-h-0 flex-1 overflow-hidden rounded-md border border-sz-border-soft">
            {summary.thumbDataUrl ? (
              <img src={summary.thumbDataUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              // ⚠️ Frase CURTA: a faixa tem ~60px de altura e o card fica
              // estreito no grid de 4 colunas — o texto longo transbordava e era
              // cortado pelo `overflow-hidden`. A explicação vai no `title`.
              <div
                title="A foto do jogo aparece quando você sai do editor"
                className="grid h-full w-full place-items-center bg-sz-bg px-2 text-center text-[0.6875rem] text-sz-fg-mute"
              >
                Sem foto ainda
              </div>
            )}
          </div>
        )}

        <div className="relative z-10 mt-auto flex items-end justify-between pt-2 text-xs text-sz-fg-soft">
          <span>Atualizado em {formatDate(summary.updatedAt)}</span>
          <Button
            variant="primary"
            size="sm"
            className="sz-home-btn3d"
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
        // 44px por item — MENU_HEIGHT acompanha (4 × 44 + borda 2×2 = 180).
        'flex min-h-11 w-full items-center px-4 text-left text-base transition-colors',
        danger
          ? 'text-sz-error hover:bg-sz-error/10'
          : 'text-sz-fg hover:bg-sz-bg hover:text-sz-fg',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
