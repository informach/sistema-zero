import { describe, expect, test } from 'bun:test'
import { makeModel, paintedSkin } from '../testing/fixtures'
import { addExtraColor, removeExtraColor, setTexelsPerUnit } from './partOps'
import { faceSkinSize } from './shapes'

describe('resolução e cores extras', () => {
  test('setTexelsPerUnit re-amostra toda pele para o tamanho novo', () => {
    const model = makeModel()
    const body = model.parts[0]
    if (!body?.faces.py) throw new Error('fixture')
    const doubled = setTexelsPerUnit(model, 8)
    const part = doubled.parts[0]
    if (!part?.faces.py) throw new Error('part')
    const expected = faceSkinSize(part, 'py', 8)
    expect(part.faces.py.width).toBe(expected?.width ?? -1)
    expect(part.faces.py.height).toBe(expected?.height ?? -1)
    // Vizinho mais próximo: o canto continua com a mesma cor.
    expect(part.faces.py.data[0]).toBe(body.faces.py.data[0])
    expect(setTexelsPerUnit(model, 4)).toBe(model)
  })

  test('removeExtraColor remapeia peles e cores de peça', () => {
    const model = makeModel()
    const withA = addExtraColor(model, '#111111')
    const withB = withA ? addExtraColor(withA.model, '#222222') : null
    if (!withA || !withB) throw new Error('extras')
    let painted = withB.model
    const body = painted.parts[0]
    if (!body) throw new Error('body')
    const size = faceSkinSize(body, 'px', painted.texelsPerUnit)
    if (!size) throw new Error('size')
    painted = {
      ...painted,
      parts: painted.parts.map((part) =>
        part.id === 'body'
          ? {
              ...part,
              color: withB.index,
              faces: {
                ...part.faces,
                px: paintedSkin(size.width, size.height, (x) =>
                  x % 3 === 0 ? withA.index : x % 3 === 1 ? withB.index : 2,
                ),
              },
            }
          : part,
      ),
    }
    const removed = removeExtraColor(painted, withA.index)
    if (!removed) throw new Error('remove')
    expect(removed.extraColors).toEqual(['#222222'])
    const px = removed.parts[0]?.faces.px
    if (!px) throw new Error('px')
    for (let x = 0; x < px.width; x += 1) {
      const value = px.data[x]
      if (x % 3 === 0) expect(value).toBe(0)
      else if (x % 3 === 1) expect(value).toBe(withA.index)
      else expect(value).toBe(2)
    }
    // A peça que era da cor B (agora índice 16) continua apontando para o #222222.
    expect(removed.parts[0]?.color).toBe(16)
    // Apagar a última extra remove a chave; cor de peça que era ela cai na primeira pintável.
    const last = removeExtraColor(removed, 16)
    expect(last && 'extraColors' in last).toBe(false)
    expect(last?.parts[0]?.color).toBe(1)
    expect(removeExtraColor(model, 2)).toBeNull()
    expect(removeExtraColor(model, 16)).toBeNull()
  })

  test('removeExtraColor remove a pele quando todos os texels voltam para a cor base', () => {
    const withExtra = addExtraColor(makeModel(), '#123456')
    if (!withExtra) throw new Error('extra')
    const model = {
      ...withExtra.model,
      parts: withExtra.model.parts.map((part, index) =>
        index === 0
          ? {
              ...part,
              faces: {
                px: paintedSkin(4, 4, () => withExtra.index),
              },
            }
          : part,
      ),
    }

    const removed = removeExtraColor(model, withExtra.index)

    expect(removed?.parts[0]?.faces.px).toBeUndefined()
  })
})
