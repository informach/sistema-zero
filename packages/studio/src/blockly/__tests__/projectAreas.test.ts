import { describe, expect, it } from 'bun:test'
import {
  BLOCK_CATALOG_AREAS,
  PROJECT_AREA_LAYOUT_ROWS,
  PROJECT_AREAS,
} from '../../core/behaviorAreas'
import { SERVER_BLOCK_CATALOG } from '../blockCatalog'
import { FRAME_BLOCKS } from '../blocks/frames'
import {
  PROJECT_AREA_BY_FRAME,
  PROJECT_AREA_DEFINITIONS,
  PROJECT_AREA_FRAME_TYPES,
  PROJECT_AREA_FRAMES,
} from '../projectAreas'

describe('registro central das áreas do projeto', () => {
  it('mantém lista, layout e frames completos, únicos e na mesma ordem', () => {
    expect(PROJECT_AREA_DEFINITIONS.map(({ kind }) => kind)).toEqual([...PROJECT_AREAS])
    expect(PROJECT_AREA_LAYOUT_ROWS.flat()).toEqual([...PROJECT_AREAS])

    const frames = PROJECT_AREA_DEFINITIONS.map(({ frame }) => frame)
    expect(new Set(frames).size).toBe(PROJECT_AREAS.length)
    expect([...PROJECT_AREA_FRAME_TYPES]).toEqual(frames)

    for (const area of PROJECT_AREAS) {
      const frame = PROJECT_AREA_FRAMES[area]
      expect(PROJECT_AREA_BY_FRAME.get(frame), frame).toBe(area)
    }
  })

  it('cobre exatamente os frames visíveis e a classificação do catálogo', () => {
    const visibleFrames = FRAME_BLOCKS.filter((definition) => !definition.hidden).map(
      ({ type }) => type,
    )
    expect([...visibleFrames].sort()).toEqual([...PROJECT_AREA_FRAME_TYPES].sort())

    const catalogByType = new Map(SERVER_BLOCK_CATALOG.map((entry) => [entry.type, entry]))
    for (const { kind, frame } of PROJECT_AREA_DEFINITIONS) {
      expect(catalogByType.get(frame)?.area, frame).toBe(kind)
    }
    for (const entry of SERVER_BLOCK_CATALOG) {
      expect(BLOCK_CATALOG_AREAS).toContain(entry.area)
    }
  })
})
