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
  // A célula sem peça repete a borda da vizinha mais perto (acima: 10; à direita: 30), opaca.
  expect([px(0, 2), px(1, 3)]).toEqual([10, 30])
  expect(atlas[(2 * plano.largura + 0) * 4 + 3]).toBe(10)
  expect(() => comporAtlasDoRelevo(plano, [cor(1)], 2)).toThrow('Falta a textura')
})

test('célula vazia nunca deixa a beira da peça encostar no transparente', () => {
  // Duas peças só na diagonal (grade 2x2): as duas células vazias tocam as duas peças.
  const plano = planejarAtlasDoRelevo([peca(64, 64, 4), peca(128, 128, 4)])!
  expect(plano.celulas).toEqual([
    { coluna: 0, linha: 0 },
    { coluna: 1, linha: 1 },
  ])
  const gradiente = new Uint8Array(4 * 4 * 4),
    canto = new Uint8Array(4 * 4 * 4).fill(200)
  for (let i = 0; i < 16; i++) gradiente.set([i * 10, 0, 0, 255], i * 4)
  const atlas = comporAtlasDoRelevo(plano, [gradiente, canto], 4),
    px = (x: number, y: number) => {
      const i = (y * plano.largura + x) * 4
      return [...atlas.subarray(i, i + 4)]
    }
  // À direita da primeira peça (célula 1,0): a coluna da borda direita dela, linha a linha.
  expect(px(4, 0)).toEqual(px(3, 0))
  expect(px(4, 3)).toEqual(px(3, 3))
  // Abaixo dela (célula 0,1): a linha de baixo dela.
  expect(px(2, 4)).toEqual(px(2, 3))
  // Nenhum pixel do atlas ficou transparente.
  expect(atlas.every((v, i) => i % 4 !== 3 || v > 0)).toBe(true)
})

test('célula que só encosta nas diagonais repete o canto de cada vizinha', () => {
  // Grade 3x3 com peças em (0,0) e (2,2): a célula do meio só as toca pelos cantos.
  const plano = planejarAtlasDoRelevo([peca(0, 0, 2), peca(128, 128, 2)])!
  const a = new Uint8Array(2 * 2 * 4),
    b = new Uint8Array(2 * 2 * 4)
  for (let i = 0; i < 4; i++) {
    a.set([10 + i, 0, 0, 255], i * 4)
    b.set([50 + i, 0, 0, 255], i * 4)
  }
  const atlas = comporAtlasDoRelevo(plano, [a, b], 2),
    px = (x: number, y: number) => atlas[(y * plano.largura + x) * 4]
  // O canto de baixo à direita de (0,0) é o texel 3 (13); o de cima à esquerda de (2,2), o 0 (50).
  expect([px(2, 2), px(3, 3)]).toEqual([13, 50])
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
