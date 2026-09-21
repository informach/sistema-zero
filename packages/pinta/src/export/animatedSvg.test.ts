import { describe, expect, it } from 'bun:test'
import {
  createVectorSpriteAsset,
  type PintaVectorAnimation,
  type VectorSpriteAsset,
} from '../core/project'
import type { VectorShape } from '../vector/model'
import { sceneDefsMarkup, shapesToMarkup } from '../vector/svg'
import {
  type AnimatedVectorSvgSuccess,
  buildAnimatedVectorSvg,
  MODULE_ANIMATED_SVG_MAX_BYTES,
} from './animatedSvg'

const base = { fill: '#78dc52', stroke: null, opacity: 1, rotation: 0 }

function rect(
  id: string,
  motionId: string | undefined,
  x: number,
  overrides: Partial<VectorShape> = {},
): VectorShape {
  return {
    ...base,
    id,
    ...(motionId ? { motionId } : {}),
    type: 'rect',
    x,
    y: 2,
    w: 10,
    h: 12,
    rx: 1,
    ...overrides,
  } as VectorShape
}

function ellipse(id: string, motionId: string | undefined, cx: number): VectorShape {
  return {
    ...base,
    id,
    ...(motionId ? { motionId } : {}),
    type: 'ellipse',
    cx,
    cy: 18,
    rx: 8,
    ry: 7,
  }
}

function setup(
  frames: VectorShape[][],
  overrides: Partial<PintaVectorAnimation> = {},
): { asset: VectorSpriteAsset; animation: PintaVectorAnimation } {
  const original = createVectorSpriteAsset({ name: 'heroi', frameSize: 64 })
  const current = original.animations[0]
  if (!current) throw new Error('animação esperada')
  const animation: PintaVectorAnimation = {
    ...current,
    fps: 4,
    loop: true,
    frames,
    ...overrides,
  }
  return { asset: { ...original, animations: [animation] }, animation }
}

function success(
  frames: VectorShape[][],
  overrides: Partial<PintaVectorAnimation> = {},
  smooth = true,
): AnimatedVectorSvgSuccess {
  const { asset, animation } = setup(frames, overrides)
  const result = buildAnimatedVectorSvg(asset, animation, { smooth })
  if (!result.ok) throw new Error(`export deveria funcionar: ${result.reason}`)
  return result
}

describe('buildAnimatedVectorSvg — animação e suavização', () => {
  it('interpola geometria, opacidade e rotação de uma forma ligada por motionId', () => {
    const result = success([
      [rect('a', 'corpo', 0)],
      [rect('b', 'corpo', 20, { opacity: 0.5, rotation: 45 })],
    ])

    expect(result.smoothedTracks).toBe(1)
    expect(result.discreteTracks).toBe(0)
    expect(result.svg).toContain(
      '<animate attributeName="x" values="0;20;0" keyTimes="0;0.5;1" dur="500ms" calcMode="linear" repeatCount="indefinite"/>',
    )
    expect(result.svg).toContain('attributeName="opacity" values="1;0.5;1"')
    expect(result.svg).toContain('<animateTransform attributeName="transform" type="rotate"')
  })

  it('usa a âncora personalizada nos valores da rotação suave', () => {
    const result = success([
      [rect('a', 'corpo', 0, { rotationPivot: { x: -12, y: 30 } })],
      [
        rect('b', 'corpo', 20, {
          rotation: 45,
          rotationPivot: { x: 48, y: -6 },
        }),
      ],
    ])

    expect(result.smoothedTracks).toBe(1)
    expect(result.svg).toContain('values="0 -12 30;45 48 -6;0 -12 30"')
  })

  it('exporta cada pose mascarada como uma cena discreta completa e sem colisão de ids', () => {
    const first = [
      { ...rect('rosto-a', 'rosto', 2), maskId: 'janela-a' },
      ellipse('janela-a', 'janela', 14),
    ]
    const second = [
      { ...rect('rosto-b', 'rosto', 20), maskId: 'janela-b' },
      ellipse('janela-b', 'janela', 30),
    ]
    const result = success([first, second])

    expect(result.staticTracks).toBe(0)
    expect(result.smoothedTracks).toBe(0)
    expect(result.discreteTracks).toBe(1)
    expect(result.svg).toContain('id="pin-p0-pin-mask-janela-a"')
    expect(result.svg).toContain('clip-path="url(#pin-p0-pin-mask-janela-a)"')
    expect(result.svg).toContain('id="pin-p1-pin-mask-janela-b"')
    expect(result.svg).toContain('clip-path="url(#pin-p1-pin-mask-janela-b)"')
    expect(result.svg.match(/attributeName="visibility"/g)).toHaveLength(2)

    const reducedPrefix = 'pin-reduced-'
    const exactReduced = `${sceneDefsMarkup(first, reducedPrefix)}\n${shapesToMarkup(
      first,
      '',
      reducedPrefix,
    )}`
    expect(result.svg).toContain(exactReduced)
  })

  it('compacta poses mascaradas visualmente iguais mesmo quando os ids foram remapeados', () => {
    const first = [
      { ...rect('rosto-a', 'rosto', 2), maskId: 'janela-a' },
      ellipse('janela-a', 'janela', 14),
    ]
    const second = [
      { ...rect('rosto-b', 'rosto', 2), maskId: 'janela-b' },
      ellipse('janela-b', 'janela', 14),
    ]
    const result = success([first, second])

    expect(result.poseCount).toBe(1)
    expect(result.svg.match(/attributeName="visibility"/g)).toHaveLength(1)
  })

  it('mantém a ordem z e extrai uma forma estática uma única vez', () => {
    const background = rect('fundo-a', undefined, 0, { fill: '#003fad', w: 64, h: 64 })
    const result = success([
      [background, rect('a', 'corpo', 2)],
      [{ ...background, id: 'fundo-b' }, rect('b', 'corpo', 10)],
    ])

    expect(result.staticTracks).toBe(1)
    expect(result.smoothedTracks).toBe(1)
    const motionLayer = result.svg.slice(
      result.svg.indexOf('<g class="pin-motion">'),
      result.svg.indexOf('<g class="pin-reduced"'),
    )
    expect(motionLayer.match(/fill="#003fad"/g)).toHaveLength(1)
    expect(motionLayer.indexOf('fill="#003fad"')).toBeLessThan(
      motionLayer.indexOf('values="2;10;2"'),
    )
  })

  it('usa troca discreta quando falta identidade, o tipo não é interpolável ou o estilo muda', () => {
    const polygon = (id: string, offset: number): VectorShape => ({
      ...base,
      id,
      motionId: 'estrela',
      type: 'polygon',
      points: [
        { x: offset, y: 0 },
        { x: offset + 10, y: 0 },
        { x: offset + 5, y: 10 },
      ],
    })
    const result = success([
      [rect('sem-a', undefined, 0), polygon('p-a', 0), rect('estilo-a', 'roupa', 0)],
      [
        rect('sem-b', undefined, 10),
        polygon('p-b', 4),
        rect('estilo-b', 'roupa', 10, { fill: '#ff2121' }),
      ],
    ])

    expect(result.smoothedTracks).toBe(0)
    expect(result.discreteTracks).toBe(3)
    expect(result.svg).toContain('attributeName="visibility"')
    expect(result.svg).not.toContain('calcMode="linear"')
  })

  it('não suaviza motionId duplicado nem uma forma que troca de posição-Z', () => {
    const duplicate = success([
      [rect('a1', 'repetido', 0), rect('a2', 'repetido', 20)],
      [rect('b1', 'repetido', 5), rect('b2', 'repetido', 25)],
    ])
    expect(duplicate.smoothedTracks).toBe(0)
    expect(duplicate.discreteTracks).toBe(2)

    const reordered = success([
      [rect('corpo-a', 'corpo', 0), rect('olho-a', 'olho', 20)],
      [rect('olho-b', 'olho', 24), rect('corpo-b', 'corpo', 4)],
    ])
    expect(reordered.smoothedTracks).toBe(0)
    expect(reordered.discreteTracks).toBe(2)
  })

  it('a opção desligada conserva os quadros, sem interpolar o movimento', () => {
    const result = success([[rect('a', 'corpo', 0)], [rect('b', 'corpo', 20)]], {}, false)
    expect(result.smoothedTracks).toBe(0)
    expect(result.discreteTracks).toBe(1)
    expect(result.svg).toContain('calcMode="discrete"')
  })

  it('compacta poses consecutivas iguais e soma o tempo delas', () => {
    const result = success(
      [[rect('a', 'corpo', 0)], [rect('b', 'corpo', 0)], [rect('c', 'corpo', 10)]],
      { fps: 2 },
    )
    expect(result.sourceFrameCount).toBe(3)
    expect(result.poseCount).toBe(2)
    expect(result.svg).toContain('keyTimes="0;0.666667;1"')
    expect(result.svg).toContain('dur="1500ms"')
  })

  it('preserva os limites de tempo da prévia com easing', () => {
    const result = success(
      [
        [rect('a', 'corpo', 0)],
        [rect('b', 'corpo', 10)],
        [rect('c', 'corpo', 20)],
        [rect('d', 'corpo', 30)],
      ],
      { easing: 'ease', fps: 4 },
    )
    expect(result.svg).toContain('keyTimes="0;0.353553;0.5;0.646447;1"')
    expect(result.svg).toContain('dur="1000ms"')
  })

  it('uma animação sem loop termina e congela na última pose', () => {
    const result = success([[rect('a', 'corpo', 0)], [rect('b', 'corpo', 20)]], { loop: false })
    expect(result.svg).toContain('values="0;20;20"')
    expect(result.svg).toContain('repeatCount="1" fill="freeze"')
  })

  it('inclui um primeiro quadro estático para prefers-reduced-motion', () => {
    const result = success([[rect('a', 'corpo', 0)], [rect('b', 'corpo', 20)]])
    expect(result.svg).toContain('@media(prefers-reduced-motion:reduce)')
    expect(result.svg).toContain('<g class="pin-reduced" aria-label="Primeiro quadro estático">')
  })
})

describe('buildAnimatedVectorSvg — segurança e limites', () => {
  it('recusa animação vazia, texto visível e figura embutida', () => {
    const empty = setup([])
    expect(buildAnimatedVectorSvg(empty.asset, empty.animation)).toEqual({
      ok: false,
      reason: 'empty',
    })

    const text: VectorShape = {
      ...base,
      id: 'texto',
      type: 'text',
      x: 0,
      y: 10,
      text: 'Oi',
      fontSize: 12,
    }
    const withText = setup([[text]])
    expect(buildAnimatedVectorSvg(withText.asset, withText.animation)).toEqual({
      ok: false,
      reason: 'text',
    })

    const image: VectorShape = {
      ...base,
      id: 'figura',
      type: 'image',
      x: 0,
      y: 0,
      w: 10,
      h: 10,
      src: 'data:image/png;base64,AAAA',
    }
    const withImage = setup([[image]])
    expect(buildAnimatedVectorSvg(withImage.asset, withImage.animation)).toEqual({
      ok: false,
      reason: 'image',
    })
  })

  it('ignora texto/figura escondidos e não deixa seus bytes vazarem', () => {
    const hiddenText: VectorShape = {
      ...base,
      id: 'segredo',
      type: 'text',
      x: 0,
      y: 10,
      text: 'não exportar',
      fontSize: 12,
      hidden: true,
    }
    const result = success([[hiddenText, rect('a', 'corpo', 0)]])
    expect(result.svg).not.toContain('não exportar')
  })

  it('barra o arquivo acima de 2 MiB', () => {
    // Caso possível pelos limites reais: 24 quadros, 5 paths por quadro e
    // cada `d` abaixo de MAX_PATH_CHARS (20 mil caracteres).
    const frames = Array.from({ length: 24 }, (_, frame): VectorShape[] =>
      Array.from({ length: 5 }, (_, slot) => ({
        ...base,
        id: `p-${frame}-${slot}`,
        motionId: `pincel-${slot}`,
        type: 'path',
        d: `M${frame} ${slot}${'L1 1'.repeat(4_800)}`,
      })),
    )
    const { asset, animation } = setup(frames)
    const result = buildAnimatedVectorSvg(asset, animation)
    expect(result.ok).toBe(false)
    if (result.ok || result.reason !== 'too-large') throw new Error('limite esperado')
    expect(result.bytes).toBeGreaterThan(MODULE_ANIMATED_SVG_MAX_BYTES)
  })
})
