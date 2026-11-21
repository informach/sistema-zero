import type * as Blockly from 'blockly/core'
import type { JSX } from 'react'
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { useProjectStore } from '../../state/projectStore'
import { Tabs } from '../layout/TabStrip'
import { BlocklyPanel } from './BlocklyPanel'

/**
 * O editor de mundo 3D só existe no projeto com o Mundo 3D e traz o three.js inteiro (~840 KB):
 * importado direto, ele ia no pacote de abertura do modo Blocos de TODO projeto (medido em
 * 20/11/2026). Baixado sob demanda, chega quando o projeto com o Mundo 3D monta a aba.
 */
const WorldComposerPanel = lazy(() =>
  import('./WorldComposerPanel').then((module) => ({ default: module.WorldComposerPanel })),
)

export function BlocksWorkspaceEditor(): JSX.Element {
  const hasWorld3D = useProjectStore((state) =>
    (state.project?.installedExtensions ?? []).some((extension) => extension.id === 'world-3d'),
  )
  const [active, setActive] = useState<'blocks' | 'world'>('blocks')
  const [workspace, setWorkspace] = useState<Blockly.WorkspaceSvg | null>(null)
  const onWorkspaceReady = useCallback((next: Blockly.WorkspaceSvg | null) => {
    setWorkspace(next)
  }, [])

  useEffect(() => {
    if (!hasWorld3D && active === 'world') setActive('blocks')
  }, [active, hasWorld3D])

  const items = hasWorld3D
    ? [
        { id: 'blocks', label: 'Blocos' },
        { id: 'world', label: 'Editor de mundo 3D' },
      ]
    : [{ id: 'blocks', label: 'Blocos' }]
  const effectiveActive = hasWorld3D ? active : 'blocks'

  return (
    <Tabs
      items={items}
      active={effectiveActive}
      onSelect={(id) => setActive(id === 'world' ? 'world' : 'blocks')}
      ariaLabel="Editores do projeto"
      size="md"
      hideTablistWhenSingle
      renderPanel={(id) =>
        id === 'blocks' ? (
          <BlocklyPanel onWorkspaceReady={onWorkspaceReady} />
        ) : (
          <Suspense fallback={null}>
            <WorldComposerPanel workspace={workspace} />
          </Suspense>
        )
      }
    />
  )
}
