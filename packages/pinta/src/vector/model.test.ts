import { describe, expect, it } from 'bun:test'
import {
  DEFAULT_VECTOR_FONT_FAMILY,
  fontFamilyOf,
  isVectorGradient,
  MAX_IMAGE_SRC_CHARS,
  MAX_TEXT_CHARS,
  MAX_TEXT_LINES,
  normalizeTextContent,
  sanitizeVectorShape,
  textAlignOf,
  VECTOR_FONT_FAMILIES,
  visibleShapes,
} from './model'

const base = { id: 's1', stroke: null, opacity: 1, rotation: 0 }

describe('sanitizeVectorShape — preenchimento degradê', () => {
  it('aceita e normaliza um degradê linear válido', () => {
    const shape = sanitizeVectorShape({
      ...base,
      type: 'rect',
      x: 0,
      y: 0,
      w: 10,
      h: 10,
      rx: 0,
      fill: { type: 'linear', from: '#ff2121', to: '#003fad', angle: 450 },
    })
    expect(shape).not.toBeNull()
    if (!shape || !isVectorGradient(shape.fill)) throw new Error('degradê esperado')
    expect(shape.fill.from).toBe('#ff2121')
    expect(shape.fill.to).toBe('#003fad')
    expect(shape.fill.angle).toBe(90) // 450 % 360
  })

  it('cor sólida hex continua aceita', () => {
    const shape = sanitizeVectorShape({
      ...base,
      type: 'ellipse',
      cx: 5,
      cy: 5,
      rx: 3,
      ry: 3,
      fill: '#78dc52',
    })
    expect(shape?.fill).toBe('#78dc52')
  })

  it('descarta degradê com cor inválida (from não-hex)', () => {
    const shape = sanitizeVectorShape({
      ...base,
      type: 'rect',
      x: 0,
      y: 0,
      w: 10,
      h: 10,
      rx: 0,
      fill: { type: 'linear', from: 'vermelho', to: '#003fad', angle: 0 },
    })
    expect(shape).toBeNull()
  })
})

describe('sanitizeVectorShape — grupo', () => {
  const rectRaw = { ...base, type: 'rect', x: 0, y: 0, w: 10, h: 10, rx: 0, fill: '#78dc52' }

  it('preserva um groupId string válido', () => {
    const shape = sanitizeVectorShape({ ...rectRaw, groupId: 'grupo-1' })
    expect(shape?.groupId).toBe('grupo-1')
  })

  it('groupId ausente/ inválido fica undefined', () => {
    expect(sanitizeVectorShape(rectRaw)?.groupId).toBeUndefined()
    expect(sanitizeVectorShape({ ...rectRaw, groupId: 42 })?.groupId).toBeUndefined()
  })

  it('rejeita ids capazes de quebrar atributos SVG', () => {
    expect(sanitizeVectorShape({ ...rectRaw, id: 'x"><script>alert(1)</script>' })).toBeNull()
    expect(
      sanitizeVectorShape({ ...rectRaw, groupId: 'grupo com espaço' })?.groupId,
    ).toBeUndefined()
  })
})

describe('sanitizeVectorShape — campo hidden (olhinho das Camadas)', () => {
  const rect = { ...base, type: 'rect', x: 0, y: 0, w: 10, h: 10, rx: 0, fill: '#78dc52' }

  it('hidden: true sobrevive ao round-trip', () => {
    const shape = sanitizeVectorShape({ ...rect, hidden: true })
    expect(shape?.hidden).toBe(true)
  })

  it('hidden: false (ou ausente) OMITE a chave — payload antigo byte-idêntico', () => {
    const withFalse = sanitizeVectorShape({ ...rect, hidden: false })
    expect(withFalse).not.toBeNull()
    expect(withFalse && 'hidden' in withFalse).toBe(false)
    const absent = sanitizeVectorShape(rect)
    expect(absent && 'hidden' in absent).toBe(false)
  })

  it('hidden não-booleano é descartado sem derrubar o shape', () => {
    const shape = sanitizeVectorShape({ ...rect, hidden: 'sim' })
    expect(shape).not.toBeNull()
    expect(shape && 'hidden' in shape).toBe(false)
  })

  it('locked segue a MESMA convenção: true sobrevive, o resto omite a chave', () => {
    expect(sanitizeVectorShape({ ...rect, locked: true })?.locked).toBe(true)
    const withFalse = sanitizeVectorShape({ ...rect, locked: false })
    expect(withFalse && 'locked' in withFalse).toBe(false)
    const junk = sanitizeVectorShape({ ...rect, locked: 'sim' })
    expect(junk).not.toBeNull()
    expect(junk && 'locked' in junk).toBe(false)
  })

  it('visibleShapes filtra só as escondidas', () => {
    const a = sanitizeVectorShape({ ...rect, id: 'a' })
    const b = sanitizeVectorShape({ ...rect, id: 'b', hidden: true })
    if (!a || !b) throw new Error('shapes esperados')
    expect(visibleShapes([a, b]).map((s) => s.id)).toEqual(['a'])
  })

  it('forma TRANCADA e visível segue no funil de render/export (lock ≠ hidden)', () => {
    const locked = sanitizeVectorShape({ ...rect, id: 'trancada', locked: true })
    if (!locked) throw new Error('shape esperado')
    expect(visibleShapes([locked]).map((s) => s.id)).toEqual(['trancada'])
  })
})

describe('texto: várias linhas e alinhamento', () => {
  const raw = (over: Record<string, unknown> = {}) => ({
    id: 't1',
    type: 'text',
    fill: '#000000',
    stroke: null,
    opacity: 1,
    rotation: 0,
    x: 10,
    y: 20,
    text: 'oi',
    fontSize: 24,
    ...over,
  })

  it('normalizeTextContent troca CRLF por LF e é IDEMPOTENTE', () => {
    expect(normalizeTextContent('a\r\nb\rc')).toBe('a\nb\nc')
    const once = normalizeTextContent('a\r\nb')
    expect(normalizeTextContent(once)).toBe(once)
  })

  it('normalizeTextContent capa caracteres e LINHAS', () => {
    expect(normalizeTextContent('x'.repeat(MAX_TEXT_CHARS + 50)).length).toBe(MAX_TEXT_CHARS)
    const muitas = Array.from({ length: MAX_TEXT_LINES + 5 }, (_, i) => `l${i}`).join('\n')
    expect(normalizeTextContent(muitas).split('\n').length).toBe(MAX_TEXT_LINES)
  })

  it('guarda as quebras de linha e o alinhamento', () => {
    const shape = sanitizeVectorShape(raw({ text: 'um\r\ndois', align: 'center' }))
    expect(shape?.type === 'text' && shape.text).toBe('um\ndois')
    expect(shape?.type === 'text' && shape.align).toBe('center')
  })

  it("'left' e alinhamento inválido OMITEM a chave (desenho antigo intacto)", () => {
    for (const align of ['left', 'meio', 42, null, undefined]) {
      const shape = sanitizeVectorShape(raw({ align }))
      expect(shape).not.toBeNull()
      expect(shape && 'align' in shape).toBe(false)
    }
  })

  it('texto só com quebras de linha não é texto nenhum', () => {
    expect(sanitizeVectorShape(raw({ text: '\n\n\n' }))).toBeNull()
    expect(sanitizeVectorShape(raw({ text: '   ' }))).toBeNull()
  })

  it('sanitizar duas vezes dá o MESMO objeto (round-trip)', () => {
    const once = sanitizeVectorShape(raw({ text: 'um\ndois', align: 'right' }))
    expect(sanitizeVectorShape(once)).toEqual(once)
  })

  it('textAlignOf lê o padrão de quem não tem a chave', () => {
    const shape = sanitizeVectorShape(raw())
    expect(shape && textAlignOf(shape)).toBe('left')
    const right = sanitizeVectorShape(raw({ align: 'right' }))
    expect(right && textAlignOf(right)).toBe('right')
  })

  it('aceita as cinco fontes e preserva cada família no round-trip', () => {
    expect(VECTOR_FONT_FAMILIES).toEqual([
      'baloo-2',
      'nunito',
      'press-start-2p',
      'bungee',
      'fredoka',
    ])
    for (const fontFamily of VECTOR_FONT_FAMILIES) {
      const shape = sanitizeVectorShape(raw({ fontFamily }))
      expect(shape && fontFamilyOf(shape)).toBe(fontFamily)
      expect(sanitizeVectorShape(shape)).toEqual(shape)
    }
  })

  it('documento antigo e valor inválido usam Nunito sem persistir lixo', () => {
    for (const fontFamily of [undefined, 'comic-sans', 42]) {
      const shape = sanitizeVectorShape(raw({ fontFamily }))
      expect(shape && fontFamilyOf(shape)).toBe(DEFAULT_VECTOR_FONT_FAMILY)
      expect(shape && 'fontFamily' in shape).toBe(false)
    }
  })
})

describe('a FIGURA (desenho de pixel trazido para o vetor)', () => {
  const src = `data:image/png;base64,${'A'.repeat(40)}`
  const raw = (over: Record<string, unknown> = {}) => ({
    id: 'f1',
    type: 'image',
    fill: 'none',
    stroke: null,
    opacity: 1,
    rotation: 0,
    x: 10,
    y: 20,
    w: 64,
    h: 32,
    src,
    ...over,
  })

  it('aceita um PNG data URL e guarda a geometria', () => {
    const shape = sanitizeVectorShape(raw())
    expect(shape?.type).toBe('image')
    expect(shape?.type === 'image' && shape.src).toBe(src)
    expect(shape?.type === 'image' && shape.w).toBe(64)
  })

  it('RECUSA qualquer coisa que não seja PNG data URL', () => {
    for (const mau of [
      'https://exemplo.com/a.png',
      'data:image/svg+xml;base64,AAA',
      'javascript:alert(1)',
      'data:text/html;base64,AAA',
      42,
      null,
    ]) {
      expect(sanitizeVectorShape(raw({ src: mau }))).toBeNull()
    }
  })

  it('recusa acima do teto e com tamanho degenerado', () => {
    const gigante = `data:image/png;base64,${'A'.repeat(MAX_IMAGE_SRC_CHARS)}`
    expect(sanitizeVectorShape(raw({ src: gigante }))).toBeNull()
    expect(sanitizeVectorShape(raw({ w: 0 }))).toBeNull()
    expect(sanitizeVectorShape(raw({ h: -5 }))).toBeNull()
    expect(sanitizeVectorShape(raw({ w: Number.NaN }))).toBeNull()
  })

  it('pixelated só existe quando é true (round-trip byte a byte)', () => {
    expect('pixelated' in (sanitizeVectorShape(raw()) as object)).toBe(false)
    expect('pixelated' in (sanitizeVectorShape(raw({ pixelated: false })) as object)).toBe(false)
    const pix = sanitizeVectorShape(raw({ pixelated: true }))
    expect(pix?.type === 'image' && pix.pixelated).toBe(true)
    expect(sanitizeVectorShape(pix)).toEqual(pix)
  })
})
