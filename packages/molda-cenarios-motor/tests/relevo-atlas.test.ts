import { expect, test } from 'bun:test'
import { BufferAttribute, Matrix4, PlaneGeometry } from 'three'
import {
  comporAtlasDoRelevo,
  levarUvAoAtlas,
  planejarAtlasDoRelevo,
  uvSegueOChao,
} from '../src/compilar/relevo-atlas'

const peca = (minX: number, minZ: number, lado = 4) => ({
  minX,
  minZ,
  largura: 64,
  profundidade: 64,
  lado,
})

test('quatro peças vizinhas viram uma grade 2x2 com os ladrilhos na posição do chão', () => {
  const plano = planejarAtlasDoRelevo([peca(64, 0), peca(0, 0), peca(0, 64), peca(64, 64)])!
  expect(plano).toMatchObject({ colunas: 2, linhas: 2, ladrilho: 4, largura: 8, altura: 8 })
  expect(plano.celulas).toEqual([
    { coluna: 1, linha: 0 },
    { coluna: 0, linha: 0 },
    { coluna: 0, linha: 1 },
    { coluna: 1, linha: 1 },
  ])
})

test('fora da grade não há atlas: tamanhos, texturas ou posições que não encaixam', () => {
  expect(planejarAtlasDoRelevo([peca(0, 0)])).toBeNull()
  expect(planejarAtlasDoRelevo([peca(0, 0), { ...peca(64, 0), largura: 32 }])).toBeNull()
  expect(planejarAtlasDoRelevo([peca(0, 0), peca(64, 0, 8)])).toBeNull()
  expect(planejarAtlasDoRelevo([peca(0, 0), peca(32, 0)])).toBeNull()
  expect(planejarAtlasDoRelevo([peca(0, 0), peca(0, 0)])).toBeNull()
})

test('uma peça faltando deixa a célula vazia, sem mudar a posição das outras', () => {
  const plano = planejarAtlasDoRelevo([peca(0, 0), peca(64, 64)])!
  expect(plano).toMatchObject({ colunas: 2, linhas: 2 })
  expect(plano.celulas).toEqual([
    { coluna: 0, linha: 0 },
    { coluna: 1, linha: 1 },
  ])
})

test('acima do lado máximo os ladrilhos caem pela metade; ímpar não reduz', () => {
  const quatro = [peca(0, 0, 512), peca(64, 0, 512), peca(128, 0, 512), peca(192, 0, 512)]
  expect(planejarAtlasDoRelevo(quatro, 2048)).toMatchObject({ ladrilho: 512, reducoes: 0 })
  expect(planejarAtlasDoRelevo(quatro, 1024)).toMatchObject({
    ladrilho: 256,
    reducoes: 1,
    largura: 1024,
  })
  expect(planejarAtlasDoRelevo([peca(0, 0, 3), peca(64, 0, 3)], 4)).toBeNull()
})

test('o atlas copia cada textura para o seu ladrilho, linha a linha', () => {
  const plano = planejarAtlasDoRelevo([peca(0, 0, 2), peca(64, 0, 2), peca(64, 64, 2)])!
  const cor = (v: number) => new Uint8Array(2 * 2 * 4).fill(v)
  const atlas = comporAtlasDoRelevo(plano, [cor(10), cor(20), cor(30)], 2)
  const px = (x: number, y: number) => atlas[(y * plano.largura + x) * 4]
  expect([px(0, 0), px(1, 1), px(2, 0), px(3, 1), px(2, 2), px(3, 3)]).toEqual([
    10, 10, 20, 20, 30, 30,
  ])
  // A célula sem peça fica vazia (transparente), nunca com a textura de outra.
  expect(px(0, 2)).toBe(0)
  expect(() => comporAtlasDoRelevo(plano, [cor(1)], 2)).toThrow('Falta a textura')
})

test('a redução faz a média de cada quadrado 2x2', () => {
  const plano = planejarAtlasDoRelevo([peca(0, 0, 2), peca(64, 0, 2)], 2)!
  expect(plano).toMatchObject({ ladrilho: 1, reducoes: 1, largura: 2 })
  const fonte = new Uint8Array([0, 0, 0, 255, 100, 0, 0, 255, 0, 0, 0, 255, 100, 0, 0, 255])
  const atlas = comporAtlasDoRelevo(plano, [fonte, fonte], 2)
  expect([...atlas.subarray(0, 4)]).toEqual([50, 0, 0, 255])
})

/** Peça de chão como a compilação faz: plano deitado, u com x e v com z. */
function chao(x0: number, z0: number, lado = 64) {
  const g = new PlaneGeometry(lado, lado, 4, 4)
  g.rotateX(Math.PI / 2)
  g.translate(x0 + lado / 2, 0, z0 + lado / 2)
  const pos = g.getAttribute('position'),
    uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) - x0) / lado
    uv[i * 2 + 1] = (pos.getZ(i) - z0) / lado
  }
  g.setAttribute('uv', new BufferAttribute(uv, 2))
  return g
}

test('o UV precisa seguir o chão para entrar no atlas', () => {
  expect(uvSegueOChao(chao(-64, 0))).toEqual({
    minX: -64,
    minZ: 0,
    largura: 64,
    profundidade: 64,
  })
  // UV girado (u com z) ou repetido não encaixa num ladrilho.
  const girado = chao(0, 0),
    uv = girado.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i))
  expect(uvSegueOChao(girado)).toBeNull()
  const repetido = chao(0, 0),
    uv2 = repetido.getAttribute('uv')
  for (let i = 0; i < uv2.count; i++) uv2.setXY(i, uv2.getX(i) * 4, uv2.getY(i) * 4)
  expect(uvSegueOChao(repetido)).toBeNull()
})

test('o UV vai para o ladrilho da peça; os cantos caem nas bordas dele', () => {
  const g = chao(64, 0)
  levarUvAoAtlas(g, { coluna: 1, linha: 0 }, { colunas: 2, linhas: 2 })
  const uv = g.getAttribute('uv'),
    us = Array.from({ length: uv.count }, (_, i) => uv.getX(i)),
    vs = Array.from({ length: uv.count }, (_, i) => uv.getY(i))
  expect(Math.min(...us)).toBeCloseTo(0.5)
  expect(Math.max(...us)).toBeCloseTo(1)
  expect(Math.min(...vs)).toBeCloseTo(0)
  expect(Math.max(...vs)).toBeCloseTo(0.5)
})

test('a conferência do UV usa a matriz da peça sem alterar a geometria', () => {
  const g = chao(0, 0),
    antes = Array.from(g.getAttribute('position').array as Float32Array)
  const deslocada = uvSegueOChao(g, new Matrix4().makeTranslation(-64, 3, 128))
  expect(deslocada).toEqual({ minX: -64, minZ: 128, largura: 64, profundidade: 64 })
  expect(Array.from(g.getAttribute('position').array as Float32Array)).toEqual(antes)
  // Uma matriz que gira a peça troca o sentido do chão: não encaixa.
  expect(uvSegueOChao(g, new Matrix4().makeRotationY(Math.PI / 2))).toBeNull()
})
