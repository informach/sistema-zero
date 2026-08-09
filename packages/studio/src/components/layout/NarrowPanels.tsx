import type { JSX, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { cn, IconFolder } from '#ui'
import { type BottomTab, useUIStore } from '../../state/uiStore'
import { useT } from '../../studio/i18n'
import { renderBottomPanel, useVisibleBottomTabs } from './bottomTabs'
import { type TabItem, Tabs } from './TabStrip'

// O preview segue VIVO mesmo quando não é a aba ativa (ver `keepLiveIds` no
// TabStrip): sem isso, o loop de jogo (rAF) do iframe pausa em `display:none` e um
// erro de runtime dentro do loop só apareceria no Console depois de abrir a aba
// Pré-visualização. Mantendo-o vivo, os erros chegam ao Console em tempo real.
const KEEP_LIVE_PANEL_IDS: ReadonlySet<string> = new Set(['preview'])

export interface NarrowEditorPane {
  id: string
  label: ReactNode
  /** Conteúdo do editor. Fica MONTADO mesmo quando a aba não está ativa. */
  content: ReactNode
}

export interface NarrowPanelsProps {
  /**
   * Editores do modo, na ordem em que viram as PRIMEIRAS abas (ex.: Blocos +
   * Código na Ponte; só Código no modo Código). Pelo menos um.
   */
  editorPanes: NarrowEditorPane[]
  /** Pré-visualização; quando presente, vira a aba "Pré-visualização". */
  preview?: ReactNode
  /**
   * Árvore/explorador de arquivos. Quando presente, mostra um botão "Arquivos"
   * que abre uma gaveta sobreposta. Recebe `close` para fechar a gaveta (e focar
   * o editor) assim que o aluno escolhe um arquivo.
   */
  filesDrawer?: (close: () => void) => ReactNode
}

/**
 * Layout NARROW: em vez dos painéis lado a lado (que não cabem abaixo de
 * `STUDIO_NARROW_MAX_PX`), tudo vira UMA tira de abas — um painel por vez. As
 * abas são: editores do modo → Pré-visualização → Console/Terminal/IA (as que o
 * contexto e as preferências liberam, via `useVisibleBottomTabs`). O explorador
 * de arquivos (modos Código) vira uma GAVETA sobreposta, acionada pelo botão
 * "Arquivos".
 *
 * Todas as abas ficam MONTADAS (o `Tabs` só alterna `hidden`) — preserva o jsh do
 * Terminal, o buffer do xterm, o Monaco e o iframe do preview ao trocar de aba,
 * exatamente como o layout wide. ⚠️ Cruzar o limiar wide↔narrow troca a árvore de
 * DOM (PanelGroup ↔ Tabs) e REMONTA esses painéis — aceito como custo raro de
 * mudança de orientação/tamanho, não algo que aconteça no uso ativo.
 */
export function NarrowPanels({
  editorPanes,
  preview,
  filesDrawer,
}: NarrowPanelsProps): JSX.Element {
  const t = useT()
  const setBottomTab = useUIStore((s) => s.setBottomTab)
  const bottomTabs = useVisibleBottomTabs()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const firstEditorId = editorPanes[0]?.id ?? ''
  const editorIds = new Set(editorPanes.map((p) => p.id))

  const items: TabItem[] = [
    ...editorPanes.map((p) => ({ id: p.id, label: p.label })),
    ...(preview ? [{ id: 'preview', label: t('tab.preview') }] : []),
    ...bottomTabs,
  ]

  const [active, setActive] = useState(firstEditorId)
  // Aba EFETIVA: se a `active` escolhida some (o aluno escondeu aquele painel ou
  // mudou o contexto), cai para a primeira aba — derivado no render, sem efeito
  // nem estado intermediário. Reexibir o painel devolve o foco a ele (mostrar um
  // painel é uma ação explícita de focá-lo).
  const effectiveActive = items.some((i) => i.id === active) ? active : (items[0]?.id ?? '')

  const handleSelect = (id: string) => {
    setActive(id)
    // Mantém o `bottomTab` global em sincronia: se o aluno alargar a janela (volta
    // ao wide), o BottomPanel reabre na mesma aba inferior.
    if (id === 'console' || id === 'terminal' || id === 'ai') setBottomTab(id as BottomTab)
  }

  const closeDrawer = () => setDrawerOpen(false)
  const closeDrawerToEditor = () => {
    setDrawerOpen(false)
    if (firstEditorId) setActive(firstEditorId)
  }

  // Fecha a gaveta no Escape.
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const renderPanel = (id: string): ReactNode => {
    if (id === 'preview') return preview
    if (editorIds.has(id)) return editorPanes.find((p) => p.id === id)?.content
    return renderBottomPanel(id as BottomTab)
  }

  return (
    <div className="relative h-full min-h-0 w-full">
      <Tabs
        items={items}
        active={effectiveActive}
        onSelect={handleSelect}
        renderPanel={renderPanel}
        keepLiveIds={preview ? KEEP_LIVE_PANEL_IDS : undefined}
        ariaLabel="Painéis do editor"
        size="md"
        className="bg-sz-bg"
        rightSlot={
          filesDrawer ? (
            <button
              type="button"
              onClick={() => setDrawerOpen((v) => !v)}
              aria-haspopup="dialog"
              aria-expanded={drawerOpen}
              title={t('tab.files')}
              aria-label={t('tab.files')}
              style={{ touchAction: 'manipulation' }}
              className={cn(
                'inline-flex h-full items-center gap-1.5 border-l border-sz-border px-3 text-xs font-medium text-sz-fg-soft transition-colors hover:bg-sz-bg hover:text-sz-fg',
                drawerOpen && 'bg-sz-accent/15 text-sz-accent',
              )}
            >
              <IconFolder size={16} />
              {t('tab.files')}
            </button>
          ) : undefined
        }
      />
      {filesDrawer && drawerOpen && (
        <div className="absolute inset-0 z-40 flex">
          {/* Fundo clicável que fecha a gaveta. */}
          <button
            type="button"
            aria-label="Fechar arquivos"
            onClick={closeDrawer}
            className="absolute inset-0 bg-black/40"
          />
          <div
            role="dialog"
            aria-label={t('tab.files')}
            className="relative z-10 flex h-full w-72 max-w-[85%] min-w-0 flex-col bg-sz-panel shadow-xl"
          >
            <div className="min-h-0 flex-1 overflow-hidden">{filesDrawer(closeDrawerToEditor)}</div>
          </div>
        </div>
      )}
    </div>
  )
}
