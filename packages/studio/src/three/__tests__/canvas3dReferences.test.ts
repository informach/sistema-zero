import { describe, expect, it } from 'bun:test'
import { SZIRSchema } from '../../ir/schema'

const n = (value: number) => ({ type: 'num' as const, value })
const color = (value: string) => ({ type: 'color' as const, value })

const project = (js: unknown[], canvas = true) => ({
  html: canvas ? [{ type: 'canvas', id: 'tela', width: 800, height: 600 }] : [],
  css: [],
  js,
  extensions: [],
})

describe('Canvas 3D — referências tipadas', () => {
  it('aceita o fluxo manual quando cada recurso foi declarado no papel certo', () => {
    expect(
      SZIRSchema.safeParse(
        project([
          { type: 'threeSceneSetup', scene: 'cena' },
          { type: 'threeRendererSetup', renderer: 'renderizador', canvas: 'tela' },
          {
            type: 'threeCameraSetup',
            camera: 'camera',
            canvas: 'tela',
            fov: n(60),
            near: n(0.1),
            far: n(1000),
          },
          {
            type: 'threeLightSetup',
            light: 'luz',
            scene: 'cena',
            kind: 'ambient',
            color: color('#ffffff'),
            intensity: n(1),
          },
          {
            type: 'rendererResponsive',
            renderer: 'renderizador',
            camera: 'camera',
            cleanup: 'pararResponsivo',
          },
        ]),
      ).success,
    ).toBe(true)
  })

  it('recusa tela ausente e recurso usado no papel errado', () => {
    const missingCanvas = SZIRSchema.safeParse(
      project([{ type: 'threeRendererSetup', renderer: 'renderizador', canvas: 'tela' }], false),
    )
    expect(missingCanvas.success).toBe(false)

    const wrongRole = SZIRSchema.safeParse(
      project([
        { type: 'threeSceneSetup', scene: 'cena' },
        { type: 'threeRendererSetup', renderer: 'renderizador', canvas: 'tela' },
        {
          type: 'threeLightSetup',
          light: 'luz',
          scene: 'renderizador',
          kind: 'ambient',
          color: color('#ffffff'),
          intensity: n(1),
        },
      ]),
    )
    expect(wrongRole.success).toBe(false)
  })

  it('recusa câmera, compositor e mundo físico que ainda não existem', () => {
    const cases = [
      { type: 'rendererResponsive', renderer: 'renderizador', camera: 'camera', cleanup: 'parar' },
      {
        type: 'bloomSetup',
        composer: 'efeitos',
        renderer: 'renderizador',
        scene: 'cena',
        camera: 'camera',
        strength: n(1),
        radius: n(0.5),
        threshold: n(0.8),
      },
      { type: 'physicsLiteStep', world: 'fisica', dt: n(1 / 60) },
    ]

    for (const statement of cases) {
      expect(SZIRSchema.safeParse(project([statement])).success, statement.type).toBe(false)
    }
  })
})
