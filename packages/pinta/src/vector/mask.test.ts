import { describe, expect, it } from 'bun:test'
import type { VectorShape } from './model'
import {
  applyMask,
  isMaskCapable,
  maskMembers,
  maskSourceIds,
  releaseMasks,
  resolveMaskScene,
  sanitizeMaskReferences,
} from './mask'

function rect(id: string, over: Partial<VectorShape> = {}): VectorShape {
  return {
    id,
    type: 'rect',
    x: 0,
    y: 0,
    w: 20,
    h: 20,
    rx: 0,
    fill: '#78dc52',
    stroke: null,
    opacity: 1,
    rotation: 0,
    ...over,
  } as VectorShape
}

describe('máscara vetorial — elegibilidade', () => {
  it('aceita formas fechadas e recusa linha, texto, figura e caminho aberto', () => {
    const closedPath = {
      ...rect('fechado'),
      type: 'path',
      d: 'M 0 0 L 10 0 L 10 10 Z',
    } as VectorShape
    const twoClosedPaths = {
      ...closedPath,
      id: 'dois',
      d: 'M 0 0 L 10 0 L 10 10 Z M 2 2 L 4 2 L 4 4 Z',
    } as VectorShape
    const openPath = { ...closedPath, id: 'aberto', d: 'M 0 0 L 10 0 L 10 10' } as VectorShape
    const line = {
      ...rect('linha'),
      type: 'line',
      x1: 0,
      y1: 0,
      x2: 10,
      y2: 10,
    } as VectorShape
    const text = {
      ...rect('texto'),
      type: 'text',
      x: 0,
      y: 10,
      text: 'oi',
      fontSize: 12,
    } as VectorShape

    expect(isMaskCapable(rect('retangulo'))).toBe(true)
    expect(
      isMaskCapable({ ...rect('circulo'), type: 'ellipse', cx: 10, cy: 10, rx: 10, ry: 10 }),
    ).toBe(true)
    expect(
      isMaskCapable({
        ...rect('poligono'),
        type: 'polygon',
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 5, y: 10 },
        ],
      }),
    ).toBe(true)
    expect(isMaskCapable(closedPath)).toBe(true)
    expect(isMaskCapable(twoClosedPaths)).toBe(true)
    expect(isMaskCapable(openPath)).toBe(false)
    expect(isMaskCapable(line)).toBe(false)
    expect(isMaskCapable(text)).toBe(false)
  })
})

describe('máscara vetorial — aplicar e soltar', () => {
  it('usa a forma selecionada mais à frente como fonte e preserva os grupos', () => {
    const firefly = rect('vagalume', { groupId: 'personagem' })
    const window = rect('janela', { groupId: 'nave' })
    const shine = rect('brilho')
    const applied = applyMask([firefly, window, shine], ['janela', 'vagalume'])

    expect(applied).toMatchObject({ ok: true, maskId: 'janela' })
    if (!applied.ok) throw new Error('máscara esperada')
    expect(applied.shapes[0]).toMatchObject({ id: 'vagalume', groupId: 'personagem', maskId: 'janela' })
    expect(applied.shapes[1]).toMatchObject({ id: 'janela', groupId: 'nave' })
    expect(applied.shapes[1]).not.toHaveProperty('maskId')
    expect(applied.shapes[2]).toBe(shine)
  })

  it('solta a máscara ao selecionar tanto a fonte quanto um conteúdo', () => {
    const shapes = [rect('rosto', { maskId: 'janela' }), rect('olhos', { maskId: 'janela' }), rect('janela')]
    const fromMember = releaseMasks(shapes, ['rosto'])
    expect(fromMember?.every((shape) => shape.maskId === undefined)).toBe(true)
    const fromSource = releaseMasks(shapes, ['janela'])
    expect(fromSource?.every((shape) => shape.maskId === undefined)).toBe(true)
    expect(releaseMasks(shapes, ['fora'])).toBeNull()
  })

  it('recusa seleção curta, bloqueada, já mascarada, aninhada e fonte incompatível', () => {
    expect(applyMask([rect('a')], ['a'])).toEqual({ ok: false, reason: 'needs-two' })
    expect(applyMask([rect('a', { locked: true }), rect('b')], ['a', 'b'])).toEqual({
      ok: false,
      reason: 'locked',
    })
    expect(
      applyMask([rect('a', { maskId: 'antiga' }), rect('b'), rect('antiga')], ['a', 'b']),
    ).toEqual({ ok: false, reason: 'already-masked' })
    expect(
      applyMask([rect('conteudo', { maskId: 'a' }), rect('a'), rect('b')], ['a', 'b']),
    ).toEqual({ ok: false, reason: 'nested-mask' })
    const line = {
      ...rect('linha'),
      type: 'line',
      x1: 0,
      y1: 0,
      x2: 10,
      y2: 10,
    } as VectorShape
    expect(applyMask([rect('a'), line], ['a', 'linha'])).toEqual({
      ok: false,
      reason: 'unsupported-source',
    })
  })

  it('consulta a unidade inteira a partir da fonte ou de um membro', () => {
    const shapes = [rect('a', { maskId: 'm' }), rect('b', { maskId: 'm' }), rect('m'), rect('fora')]
    expect([...maskSourceIds(shapes)]).toEqual(['m'])
    expect(maskMembers(shapes, 'm').map((shape) => shape.id)).toEqual(['a', 'b', 'm'])
    expect(maskMembers(shapes, 'a').map((shape) => shape.id)).toEqual(['a', 'b', 'm'])
    expect(maskMembers(shapes, 'fora').map((shape) => shape.id)).toEqual(['fora'])
  })
})

describe('máscara vetorial — recuperação de documento malformado', () => {
  it('remove referência ausente, própria e com fonte incompatível', () => {
    const line = {
      ...rect('linha'),
      type: 'line',
      x1: 0,
      y1: 0,
      x2: 10,
      y2: 10,
    } as VectorShape
    const out = sanitizeMaskReferences([
      rect('ausente', { maskId: 'fantasma' }),
      rect('propria', { maskId: 'propria' }),
      rect('incompativel', { maskId: 'linha' }),
      line,
    ])
    expect(out.map((shape) => shape.maskId)).toEqual([undefined, undefined, undefined, undefined])
  })

  it('solta ciclos e o conteúdo de uma fonte que já está mascarada', () => {
    const out = sanitizeMaskReferences([
      rect('a', { maskId: 'b' }),
      rect('b', { maskId: 'a' }),
      rect('interno', { maskId: 'fonte-mascarada' }),
      rect('fonte-mascarada', { maskId: 'externa' }),
      rect('externa'),
    ])
    expect(out.find((shape) => shape.id === 'a')?.maskId).toBeUndefined()
    expect(out.find((shape) => shape.id === 'b')?.maskId).toBeUndefined()
    expect(out.find((shape) => shape.id === 'interno')?.maskId).toBeUndefined()
    expect(out.find((shape) => shape.id === 'fonte-mascarada')?.maskId).toBe('externa')
  })

  it('preserva uma fonte válida compartilhada por vários conteúdos', () => {
    const shapes = [rect('a', { maskId: 'm' }), rect('b', { maskId: 'm' }), rect('m')]
    expect(sanitizeMaskReferences(shapes)).toEqual(shapes)
  })
})

describe('máscara vetorial — resolução da cena', () => {
  it('separa fontes de máscara da pintura e preserva a ordem-Z do restante', () => {
    const source = rect('janela')
    const shapes = [
      rect('fundo'),
      rect('rosto', { maskId: 'janela' }),
      source,
      rect('brilho'),
    ]
    const scene = resolveMaskScene(shapes)

    expect(scene.painted.map((shape) => shape.id)).toEqual(['fundo', 'rosto', 'brilho'])
    expect([...scene.sources]).toEqual([['janela', source]])
  })

  it('usa uma fonte escondida para conteúdo visível, mas não cria definição sem membro visível', () => {
    const source = rect('janela', { hidden: true })
    const visible = resolveMaskScene([rect('rosto', { maskId: 'janela' }), source])
    expect(visible.painted.map((shape) => shape.id)).toEqual(['rosto'])
    expect(visible.sources.get('janela')).toBe(source)

    const hidden = resolveMaskScene([
      rect('rosto', { maskId: 'janela', hidden: true }),
      rect('janela'),
    ])
    expect(hidden.painted).toEqual([])
    expect(hidden.sources.size).toBe(0)
  })
})
