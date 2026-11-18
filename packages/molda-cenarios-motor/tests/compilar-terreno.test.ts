import { expect, test } from 'bun:test'
import { TerrenoCompiladoSchema } from '@sistemazero/molda-cenarios-core/compilar'
import {
  AMOSTRAS_DA_PECA,
  type BaseDeTerreno,
  codificarPecaDeAlturas,
  codificarRecursoDeBuracos,
  digestDosBytes,
  lerPngDeAlturas,
  lerRecursoDeTerreno,
} from '@sistemazero/molda-cenarios-core/v2'
import { ArquivosDaCompilacao } from '../src/compilar/arquivos'
import { gravarDadosDoTerreno } from '../src/compilar/terreno'
import { TerrenoDoPalco } from '../src/Terreno'

function exemplo(comBuraco = false) {
  const digest = 'a'.repeat(64),
    h = 'b'.repeat(64),
    bits = new Uint8Array(512)
  bits[0] = 1
  const base: BaseDeTerreno = {
    tipo: 'terreno',
    cobertura: 'grade',
    origem: { x: -32, z: 16 },
    passo: 1,
    colunas: 64,
    linhas: 64,
    min: -10,
    max: 20,
    fundo: -2,
    pecas: [{ coluna: 0, linha: 0, digest }],
    ...(comBuraco ? { buracos: [{ coluna: 0, linha: 0, digest: h }] } : {}),
  }
  const recursos = new Map([
    [
      digest,
      lerRecursoDeTerreno(
        codificarPecaDeAlturas(
          Float64Array.from({ length: AMOSTRAS_DA_PECA }, (_, i) => 1 + (i % 65) / 32),
          -10,
          20,
        ),
      ),
    ],
    [h, lerRecursoDeTerreno(codificarRecursoDeBuracos(bits))],
  ])
  return new TerrenoDoPalco(base, recursos)
}
test('artefatos preservam referência espacial, fundo e alturas físicas; PNG16 é intercâmbio', async () => {
  const t = exemplo(),
    sinal = new AbortController().signal,
    arquivos = new ArquivosDaCompilacao(sinal),
    antes = t.estado.campo.alturas.slice()
  try {
    const meta = await gravarDadosDoTerreno(t, arquivos, sinal),
      bin = arquivos.arquivos.get(meta.alturas)!,
      v = new DataView(bin.buffer, bin.byteOffset, bin.byteLength),
      png = await lerPngDeAlturas(arquivos.arquivos.get(meta.pngAlturas)!)
    expect(TerrenoCompiladoSchema.parse(meta).fundo).toBe(-2)
    expect(meta.origem).toEqual({ x: -32, z: 16 })
    expect(png.largura).toBe(65)
    expect(png.altura).toBe(65)
    expect(bin.length).toBe(65 * 65 * 4)
    expect(Array.from(antes).every((n, i) => Math.abs(n - v.getFloat32(i * 4, true)) < 0.001)).toBe(
      true,
    )
    expect(Math.abs(png.valores[32]! * 30 - 10 - antes[32]!)).toBeLessThan(30 / 65535)
    expect(t.estado.campo.alturas).toEqual(antes)
    for (const ref of arquivos.descrever())
      expect(await digestDosBytes(arquivos.arquivos.get(ref.caminho)!)).toBe(ref.digest)
  } finally {
    arquivos.descartar()
    t.descartar()
  }
})
test('buracos exportam um byte por célula, sem reutilizar o bitset autoral de cada peça', async () => {
  const t = exemplo(true),
    sinal = new AbortController().signal,
    a = new ArquivosDaCompilacao(sinal)
  try {
    const meta = await gravarDadosDoTerreno(t, a, sinal),
      bytes = a.arquivos.get(meta.buracos!)!
    expect(bytes.length).toBe(64 * 64)
    expect(bytes[0]).toBe(1)
    expect(bytes[1]).toBe(0)
    bytes[0] = 0
    expect(t.estado.buracos.celulas[0]).toBe(1)
  } finally {
    a.descartar()
    t.descartar()
  }
})
test('cancelamento e altura inválida não entregam metadados de terreno', async () => {
  const t = exemplo(),
    c = new AbortController(),
    a = new ArquivosDaCompilacao(c.signal)
  try {
    c.abort()
    await expect(gravarDadosDoTerreno(t, a, c.signal)).rejects.toHaveProperty('name', 'AbortError')
    expect(a.arquivos.size).toBe(0)
    const s = new AbortController().signal,
      b = new ArquivosDaCompilacao(s)
    t.estado.campo.alturas[0] = NaN
    await expect(gravarDadosDoTerreno(t, b, s)).rejects.toThrow(/altura inválida/)
    expect(b.arquivos.size).toBe(0)
    b.descartar()
  } finally {
    a.descartar()
    t.descartar()
  }
})
test('inventário possui bytes próprios, recusa colisão de nomes e não revive após descarte', async () => {
  const s = new AbortController().signal,
    a = new ArquivosDaCompilacao(s),
    original = new Uint8Array([1, 2, 3, 4]),
    meta = { mime: 'application/octet-stream' as const, papel: 'alturas' as const }
  await a.adicionar('terreno/a.bin', original, meta)
  original[0] = 99
  expect(a.arquivos.get('terreno/a.bin')![0]).toBe(1)
  await expect(a.adicionar('TERRENO/A.bin', original, meta)).rejects.toThrow(/já está/)
  const pendente = a.adicionar('terreno/b.bin', original, meta)
  a.descartar()
  await expect(pendente).rejects.toThrow(/descartado/)
  expect(a.arquivos.size).toBe(0)
  await expect(a.adicionar('terreno/c.bin', original, meta)).rejects.toThrow(/descartado/)
})
