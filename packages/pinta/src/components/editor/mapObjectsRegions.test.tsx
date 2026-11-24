import { expect, test } from 'bun:test'
import { render } from '@testing-library/react'
import { createTilemapAsset } from '../../core/project'
import { createEditorStore } from '../../state/editorStore'
import { createSessionStore } from '../../state/sessionStore'
import { createRegionMapObject } from '../../tiles/mapObjects'
import { expandRegionMap, prepareMapRegions } from '../../tiles/regionMap'
import { ToastProvider } from '../ui/Toast'
import { PintaEditorProvider } from './editorContext'
import { MapObjectsOverlay } from './MapObjectsOverlay'

test('o SVG de leitura mantém origem assinada e objetos nas suas coordenadas reais', () => {
  const base = createTilemapAsset({ name: 'mundo', tilesetId: 'tiles', cols: 2, rows: 2 }),
    prepared = prepareMapRegions(base)
  if (!prepared.ok) throw Error(prepared.reason)
  const expanded = expandRegionMap(prepared.map, { col: -4, row: -4, cols: 8, rows: 8 })
  if (!expanded.ok) throw Error(expanded.reason)
  const object = createRegionMapObject({ name: 'casa', x: -24.25, y: -8.5, width: 16, height: 16 })
  if (!object) throw Error('Objeto inválido')
  const map = {
      ...expanded.map,
      layers: [
        ...expanded.map.layers,
        {
          id: 'objects',
          kind: 'objects' as const,
          name: 'Objetos',
          visible: true,
          objects: [object],
        },
      ],
    },
    editor = createEditorStore({ asset: base, persist: async () => {} }),
    session = createSessionStore(),
    view = render(
      <ToastProvider>
        <PintaEditorProvider value={{ editor, session }}>
          <MapObjectsOverlay
            tilemap={map}
            activeLayerId="objects"
            interactive={false}
            tool={null}
            tileSize={16}
            pad={1}
            scale={1}
            snap={false}
            selectedObjectId={null}
            onSelectObject={() => {}}
          />
        </PintaEditorProvider>
      </ToastProvider>,
    ),
    svg = view.container.querySelector('svg')!
  expect(svg.getAttribute('viewBox')).toBe('-80 -80 160 160')
  expect(svg.querySelector('[data-object-id] path')?.getAttribute('d')).toBe(
    'M -24.25 -8.5 h 16 v 16 h -16 Z',
  )
  expect(editor.getState().asset).toBe(base)
  expect(editor.getState().canUndo).toBe(false)
})
