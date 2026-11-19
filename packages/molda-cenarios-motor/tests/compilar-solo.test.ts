import { expect, test } from 'bun:test'
import {
  BoxGeometry,
  DataTexture,
  Matrix4,
  MeshStandardMaterial,
  RGBAFormat,
  SRGBColorSpace,
} from 'three'
import { pixelsDaTexturaCompilada } from '../src/compilar/imagens'
import { prepararSoloCompilado } from '../src/compilar/solo'

test('solo sem camadas mantém cores autorais e descarte não altera o material original', async () => {
  const g = new BoxGeometry(),
    m = new MeshStandardMaterial({ vertexColors: true }),
    sinal = new AbortController().signal,
    r = await prepararSoloCompilado(
      { geometria: g, material: m, matriz: new Matrix4() },
      undefined,
      new Map(),
      sinal,
    )
  let geometrias = 0,
    materiais = 0
  r.geometria.addEventListener('dispose', () => geometrias++)
  r.material.addEventListener('dispose', () => materiais++)
  try {
    expect(r.geometria).not.toBe(g)
    expect(r.material).not.toBe(m)
    expect(r.material.vertexColors).toBe(true)
    expect(r.pintura).toBeUndefined()
    r.descartar()
    r.descartar()
    expect(geometrias).toBe(1)
    expect(materiais).toBe(1)
  } finally {
    r.descartar()
    g.dispose()
    m.dispose()
  }
})
test('pixels RGBA já decodificados são próprios e mantêm a orientação do sampler', () => {
  const dados = new Uint8Array([255, 80, 40, 255]),
    t = new DataTexture(dados, 1, 1, RGBAFormat),
    sinal = new AbortController().signal
  t.colorSpace = SRGBColorSpace
  t.flipY = true
  try {
    const r = pixelsDaTexturaCompilada(t, sinal)
    expect(r.flipY).toBe(true)
    expect(r.pixels).toEqual(dados)
    r.pixels[0] = 0
    expect(dados[0]).toBe(255)
    t.colorSpace = ''
    expect(() => pixelsDaTexturaCompilada(t, sinal)).toThrow(/sRGB/)
    const controle = new AbortController()
    controle.abort()
    expect(() => pixelsDaTexturaCompilada(t, controle.signal)).toThrow()
  } finally {
    t.dispose()
  }
})
