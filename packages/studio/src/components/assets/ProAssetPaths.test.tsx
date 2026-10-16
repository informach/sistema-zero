import { expect, it } from 'bun:test'
import { fireEvent, render } from '@testing-library/react'
import type { ProjectAsset } from '../../core/project'
import { ProAssetPaths } from './ProAssetPaths'

it('filters canonical materials, opens only requested previews and sends literal usage queries', async () => {
  const assets: ProjectAsset[] = [
    {
      id: 'star',
      name: 'estrela',
      kind: 'image',
      source: 'upload',
      dataUrl:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZwoAAAAASUVORK5CYII=',
    },
  ]
  const queries: string[] = []
  const view = render(
    <ProAssetPaths assets={assets} expanded onFindUses={(query) => queries.push(query)} />,
  )
  await view.findByText('estrela')
  expect(view.queryByRole('img')).toBeNull()
  expect(view.queryByRole('button', { name: 'Copiar exemplo' })).toBeNull()
  fireEvent.click(view.getByRole('button', { name: 'Prévia de estrela' }))
  expect(view.getByRole('img').getAttribute('src')).toBe(assets[0]!.dataUrl)
  fireEvent.click(view.getByRole('button', { name: 'Buscar caminho no código' }))
  fireEvent.click(view.getByRole('button', { name: 'Buscar ID no código' }))
  expect(queries[0]).toMatch(/^studio-assets\/[a-f0-9]+\.png$/)
  expect(queries[1]).toBe('star')
  fireEvent.change(view.getByRole('searchbox'), { target: { value: 'missing' } })
  expect(view.queryByRole('img')).toBeNull()
  expect(view.getByText('Nenhum material encontrado.')).toBeDefined()
})
