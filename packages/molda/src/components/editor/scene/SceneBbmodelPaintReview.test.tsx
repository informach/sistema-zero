import { expect, test } from 'bun:test'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { BBMODEL_IMPORT_COPY as copy } from '../../../core/bbmodelImportCopy'
import { directBbmodelImport } from '../../../testing/bbmodelImportFixture'
import {
  bbmodelPaintImportFixture,
  bbmodelPaintSource,
} from '../../../testing/bbmodelPaintImportFixture'
import { SceneBbmodelPaintReview } from './SceneBbmodelPaintReview'

test('bbmodel paint review pages through every image, keeps names inert and clamps its page when the report shrinks', () => {
  const source = bbmodelPaintSource(),
    piece = source.elements[0]!,
    texture = source.textures[0]!,
    model = {
      ...source,
      elements: Array.from({ length: 6 }, (_, i) => ({
        ...piece,
        uuid: `piece${i}`,
        faces: { face: { ...piece.faces.face, texture: i } },
      })),
      outliner: Array.from({ length: 6 }, (_, i) => `piece${i}`),
      textures: Array.from({ length: 6 }, (_, i) => ({
        ...texture,
        uuid: `texture${i}`,
        name: `Pintura ${i}`,
        layers: [{ ...texture.layers[0], name: '<script>never_execute()</script>' }],
      })),
    },
    result = directBbmodelImport(bbmodelPaintImportFixture(model)),
    before = structuredClone(result),
    view = render(<SceneBbmodelPaintReview report={result.report} document={result.document} />)
  try {
    const region = screen.getByRole('region', { name: copy.paintReview })
    expect(within(region).getByText(copy.paintSummary(6, 6))).toBeDefined()
    expect(region.querySelectorAll('details')).toHaveLength(5)
    fireEvent.click(within(region).getAllByText(/Pintura \d · 1 camada/)[0]!)
    expect(within(region).getAllByText('<script>never_execute()</script>')).toHaveLength(5)
    expect(region.querySelector('script')).toBeNull()
    expect(
      within(region).getByRole('button', { name: copy.paintPrevious }).hasAttribute('disabled'),
    ).toBe(true)
    fireEvent.click(within(region).getByRole('button', { name: copy.paintNext }))
    expect(region.querySelectorAll('details')).toHaveLength(1)
    expect(within(region).getByText('Pintura 5 · 1 camada')).toBeDefined()
    expect(within(region).getByRole('status').textContent).toBe(copy.paintPage(2, 2))
    expect(
      within(region).getByRole('button', { name: copy.paintNext }).hasAttribute('disabled'),
    ).toBe(true)
    const smaller = directBbmodelImport(bbmodelPaintImportFixture())
    view.rerender(<SceneBbmodelPaintReview report={smaller.report} document={smaller.document} />)
    expect(screen.getByText('Minha pintura · 3 camadas')).toBeDefined()
    expect(screen.queryByRole('button', { name: copy.paintPrevious })).toBeNull()
    expect(result).toEqual(before)
    view.rerender(
      <SceneBbmodelPaintReview
        report={{ ...result.report, issues: [] }}
        document={result.document}
      />,
    )
    expect(screen.queryByRole('region')).toBeNull()
  } finally {
    view.unmount()
  }
})
