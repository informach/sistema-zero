import type { TerrenoCompilado } from '@sistemazero/molda-cenarios-core/compilar'
import { codificarPngDeAlturas, imagemDoCampo } from '@sistemazero/molda-cenarios-core/v2'
import type { TerrenoDoPalco } from '../Terreno'
import type { ArquivosDaCompilacao } from './arquivos'

/** Alturas físicas em Float32 little endian; PNG16 é intercâmbio, não substituto da física. */
export async function gravarDadosDoTerreno(
  terreno: TerrenoDoPalco,
  arquivos: ArquivosDaCompilacao,
  sinal: AbortSignal,
): Promise<TerrenoCompilado> {
  sinal.throwIfAborted()
  const { base, estado } = terreno,
    { campo } = estado,
    alturas = new Uint8Array(campo.alturas.length * 4),
    vista = new DataView(alturas.buffer)
  for (let i = 0; i < campo.alturas.length; i++) {
    const v = campo.alturas[i]!
    if (!Number.isFinite(v) || v < base.min || v > base.max)
      throw Error('O campo do terreno contém uma altura inválida.')
    vista.setFloat32(i * 4, v, true)
  }
  const bin = await arquivos.adicionar('terreno/alturas.bin', alturas, {
      mime: 'application/octet-stream',
      papel: 'alturas',
    }),
    png = await codificarPngDeAlturas(imagemDoCampo(campo))
  sinal.throwIfAborted()
  const imagem = await arquivos.adicionar('terreno/alturas.png', png, {
    mime: 'image/png',
    papel: 'alturas',
    largura: base.colunas + 1,
    altura: base.linhas + 1,
  })
  const buracos = estado.buracos.celulas.some((v) => v !== 0)
    ? (
        await arquivos.adicionar('terreno/buracos.bin', estado.buracos.celulas, {
          mime: 'application/octet-stream',
          papel: 'buracos',
        })
      ).caminho
    : undefined
  return {
    origem: { ...base.origem },
    passo: base.passo,
    colunas: base.colunas,
    linhas: base.linhas,
    min: base.min,
    max: base.max,
    fundo: base.fundo,
    cobertura: base.cobertura ?? 'pecas',
    pecas: base.pecas.map((p) => ({ coluna: p.coluna, linha: p.linha })),
    recortes: (base.recortes ?? []).map((p) => p.map((v) => ({ ...v }))),
    alturas: bin.caminho,
    pngAlturas: imagem.caminho,
    ...(buracos ? { buracos } : {}),
  }
}
