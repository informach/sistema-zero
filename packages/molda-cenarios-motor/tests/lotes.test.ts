import { expect, test } from 'bun:test'
import { BoxGeometry, Group, Matrix4, MeshStandardMaterial } from 'three'
import { LoteDoModelo } from '../src/lotes'

function preparar(quantidade = 20_000) {
  const geometria = new BoxGeometry(1, 1, 1),
    material = new MeshStandardMaterial(),
    grupo = new Group()
  const lote = new LoteDoModelo(grupo, [{ geometria, material, matriz: new Matrix4() }])
  const itens = Array.from({ length: quantidade }, (_, i) => ({
    id: `p${i}`,
    matriz: new Matrix4().makeTranslation(i * 2, 0, 0),
  }))
  lote.preencher(itens)
  return {
    lote,
    itens,
    grupo,
    geometria,
    material,
    encerrar() {
      lote.descartar()
      geometria.dispose()
      material.dispose()
    },
  }
}

test('mover uma entre 20 mil instâncias transfere só sua matriz e mantém volumes corretos', () => {
  const f = preparar(),
    malha = f.lote.malhas[0]!
  try {
    malha.instanceMatrix.clearUpdateRanges()
    const versao = malha.instanceMatrix.version,
      matriz = new Matrix4().makeTranslation(-10, 3, 4)
    f.lote.atualizar(17000, matriz)
    expect(malha.instanceMatrix.updateRanges).toEqual([{ start: 17000 * 16, count: 16 }])
    expect(malha.instanceMatrix.version).toBe(versao + 1)
    const lida = new Matrix4()
    malha.getMatrixAt(17000, lida)
    expect(lida.elements).toEqual(matriz.elements)
    expect(malha.boundingBox!.min.x).toBeCloseTo(-10.5)
    expect(malha.boundingBox!.max.x).toBeCloseTo(39998.5)
    expect(malha.boundingSphere!.containsPoint(malha.boundingBox!.min)).toBe(true)
    expect(malha.geometry).toBe(f.geometria)
  } finally {
    f.encerrar()
  }
})
test('reconstrução inalterada não envia buffers; alteração de índice, cor e ordem gera faixas corretas', () => {
  const f = preparar(30),
    malha = f.lote.malhas[0]!
  try {
    malha.instanceMatrix.clearUpdateRanges()
    const versao = malha.instanceMatrix.version
    f.lote.preencher(f.itens)
    expect(malha.instanceMatrix.version).toBe(versao)
    expect(malha.instanceMatrix.updateRanges).toEqual([])
    f.itens[10]!.matriz.makeTranslation(8, 2, 4)
    f.lote.preencher(f.itens)
    expect(malha.instanceMatrix.updateRanges).toEqual([{ start: 160, count: 16 }])
    malha.instanceMatrix.onUploadCallback()
    expect(malha.instanceMatrix.updateRanges).toEqual([])
    f.lote.preencher(f.itens.map((i, n) => ({ ...i, cor: n === 12 ? '#ff0000' : '#ffffff' })))
    malha.instanceColor!.onUploadCallback()
    f.lote.preencher(f.itens)
    expect(malha.instanceColor!.updateRanges).toEqual([{ start: 36, count: 3 }])
    const anteriores = f.lote.ids.slice()
    f.lote.preencher([f.itens[1]!, f.itens[0]!, ...f.itens.slice(2)])
    expect(f.lote.ids.slice(0, 2)).toEqual([anteriores[1]!, anteriores[0]!])
    expect(malha.instanceMatrix.updateRanges).toEqual([{ start: 0, count: 32 }])
    f.lote.preencher([])
    expect(malha.count).toBe(0)
    expect(malha.visible).toBe(false)
  } finally {
    f.encerrar()
  }
})
