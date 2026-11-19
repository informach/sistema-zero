import { expect, test } from 'bun:test'
import { ArquivosDaCompilacao } from '../src/compilar/arquivos'
import { exemplo, glb } from './fixtures/glb-compilacao'

test('conteúdo idêntico reaproveita caminho/metadados e o retorno não permite alterar o inventário', async () => {
  const { j, bin } = exemplo(),
    bytes = glb(j, bin),
    a = new ArquivosDaCompilacao(new AbortController().signal),
    meta = {
      mime: 'model/gltf-binary' as const,
      papel: 'modelo' as const,
      malhas: 2,
      triangulos: 2,
      verticesMaximos: 3,
    }
  try {
    const primeira = await a.adicionarDeduplicado('modelos/a.glb', bytes, meta),
      segunda = await a.adicionarDeduplicado('modelos/b.glb', bytes, meta)
    expect(segunda.caminho).toBe(primeira.caminho)
    expect(a.arquivos.size).toBe(1)
    primeira.caminho = 'mutado.glb'
    expect(a.descrever()[0]!.caminho).toBe('modelos/a.glb')
    await expect(
      a.adicionarDeduplicado('modelos/c.glb', bytes, { ...meta, malhas: 1 }),
    ).rejects.toThrow(/metadados diferem/)
    const outro = bytes.slice()
    outro[20]! ^= 1
    await expect(a.adicionarDeduplicado('modelos/a.glb', outro, meta)).rejects.toThrow(/já está/)
  } finally {
    a.descartar()
  }
})
