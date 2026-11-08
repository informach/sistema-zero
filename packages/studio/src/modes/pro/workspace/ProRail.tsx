import type { JSX } from 'react'
import { IconBook, IconFolder, IconImage, type IconProps, IconSearch } from '#ui'
import { useT } from '../../../studio/i18n'
import { PRO_WORKSPACE_PANELS, type ProWorkspacePanel } from './model'

const ICON: Record<ProWorkspacePanel, (props: IconProps) => JSX.Element> = {
  files: IconFolder,
  search: IconSearch,
  materials: IconImage,
  guides: IconBook,
}
const LABEL_KEY: Record<ProWorkspacePanel, string> = {
  files: 'pro.files',
  search: 'pro.search',
  materials: 'pro.materials',
  guides: 'pro.guides',
}

/**
 * O trilho da esquerda do workspace Pro (redesenho de 11/2026): Arquivos · Procurar · Materiais ·
 * Guias, cada um um botão de 64px com ícone e rótulo. É o ÚNICO lugar dos Materiais (antes
 * havia um "Materiais" na esquerda e outro embaixo). No largo troca a vista do painel ao lado
 * (apertar o ativo fecha o painel); no tablet abre e fecha a gaveta.
 */
export function ProRail({
  view,
  open,
  panelId,
  onSelect,
}: {
  view: ProWorkspacePanel
  open: boolean
  panelId: string
  onSelect: (view: ProWorkspacePanel) => void
}): JSX.Element {
  const t = useT()
  return (
    <nav aria-label={t('pro.navigation')} className="sz-pro-rail">
      {PRO_WORKSPACE_PANELS.map((id) => {
        const Icon = ICON[id]
        return (
          <button
            key={id}
            type="button"
            className="sz-pro-rail-btn"
            aria-pressed={open && view === id}
            aria-controls={panelId}
            onClick={() => onSelect(id)}
          >
            <Icon />
            <span>{t(LABEL_KEY[id])}</span>
          </button>
        )
      })}
    </nav>
  )
}
