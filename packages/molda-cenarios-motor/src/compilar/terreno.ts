import type { CamadaDoRelevo, TerrenoCompilado } from '@sistemazero/molda-cenarios-core/compilar'
import {
  CELULAS_DA_PECA,
  codificarPngDeAlturas,
  codificarPngDePesos,
  imagemDoCampo,
} from '@sistemazero/molda-cenarios-core/v2'
import type { TerrenoDoPalco } from '../Terreno'
import type { ArquivosDaCompilacao } from './arquivos'
import type { PixelsDaTextura } from './pintura'

/**
 * O relevo em campo (plano "Mundos de 2 km", lote 3, 23/11/2026): o pacote leva os pesos das
 * camadas (um PNG por quatro camadas) e não leva lote nem colisão de terreno. `imagens` são os
 * pixels das texturas das camadas (a cor média de cada uma vai para quem não mistura texturas).
 */
export interface OpcoesDoRelevoEmCampo {
  imagens: ReadonlyMap<string, PixelsDaTextura>
}

/** As cores do chão sem pintura (as mesmas do palco, `Terreno.ts`): fundo, areia e grama. */
export const CORES_DO_CHAO_SEM_PINTURA = ['#8d947d', '#d5c995', '#a4d48c'] as const

const paraLinear = (v: number) => {
  const c = v / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const paraSrgb = (c: number) =>
  Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055))

/** A cor média de uma textura (média na luz linear, devolvida em sRGB), em hexadecimal. */
export function corMediaDaTextura(pixels: PixelsDaTextura): string {
  const soma = [0, 0, 0]
  const n = pixels.largura * pixels.altura
  if (!(n > 0)) return '#ffffff'
  for (let i = 0; i < n; i++)
    for (let k = 0; k < 3; k++) soma[k]! += paraLinear(pixels.pixels[i * 4 + k] as number)
  return `#${soma
    .map((v) =>
      Math.min(255, Math.max(0, paraSrgb(v / n)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

/** Alturas físicas em Float32 little endian; PNG16 é intercâmbio, não substituto da física. */
export async function gravarDadosDoTerreno(
  terreno: TerrenoDoPalco,
  arquivos: ArquivosDaCompilacao,
  sinal: AbortSignal,
  emCampo?: OpcoesDoRelevoEmCampo,
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
  const relevo = emCampo ? await gravarPesosDoRelevo(terreno, arquivos, sinal, emCampo) : undefined
  return {
    origem: { ...base.origem },
    passo: base.passo,
    colunas: base.colunas,
    linhas: base.linhas,
    min: base.min,
    max: base.max,
    fundo: base.fundo,
    cobertura: base.cobertura ?? 'pecas',
    // Em campo o relevo é a grade inteira: a consulta de alturas compilada lê todas as peças.
    pecas: relevo
      ? Array.from({ length: base.linhas / CELULAS_DA_PECA }, (_, linha) =>
          Array.from({ length: base.colunas / CELULAS_DA_PECA }, (_, coluna) => ({
            coluna,
            linha,
          })),
        ).flat()
      : base.pecas.map((p) => ({ coluna: p.coluna, linha: p.linha })),
    recortes: (base.recortes ?? []).map((p) => p.map((v) => ({ ...v }))),
    alturas: bin.caminho,
    pngAlturas: imagem.caminho,
    ...(buracos ? { buracos } : {}),
    ...(relevo ? { relevo } : {}),
  }
}

/**
 * Os pesos das camadas, um RGBA por vértice da grade (camadas 1 a 4 no primeiro arquivo, 5 a 8 no
 * segundo). Sem pintura, três camadas fazem o mesmo degradê do palco: o fundo abaixo de zero e,
 * acima, da areia à grama até 3 m.
 */
async function gravarPesosDoRelevo(
  terreno: TerrenoDoPalco,
  arquivos: ArquivosDaCompilacao,
  sinal: AbortSignal,
  { imagens }: OpcoesDoRelevoEmCampo,
): Promise<NonNullable<TerrenoCompilado['relevo']>> {
  const { base, estado } = terreno,
    vertices = (base.colunas + 1) * (base.linhas + 1)
  let camadas: CamadaDoRelevo[]
  let peso: (vertice: number, camada: number) => number
  if (base.solo) {
    const n = base.solo.camadas.length,
      pintura = estado.pintura.pesos
    if (pintura.length !== vertices * n)
      throw Error('A pintura do chão não corresponde à grade do terreno.')
    camadas = base.solo.camadas.map((c) => {
      const pixels = c.textura ? imagens.get(c.textura.id) : undefined
      if (c.textura && !pixels) throw Error('Falta uma textura usada pela pintura do terreno.')
      return {
        id: c.id,
        cor: c.cor.toLowerCase(),
        ...(c.textura
          ? { textura: { id: c.textura.id, repeticaoMetros: c.textura.repeticaoMetros } }
          : {}),
        corMedia: pixels ? corMediaDaTextura(pixels) : '#ffffff',
      }
    })
    peso = (v, c) => pintura[v * n + c] as number
  } else {
    const alturas = estado.campo.alturas
    camadas = CORES_DO_CHAO_SEM_PINTURA.map((cor, i) => ({
      id: ['fundo', 'areia', 'grama'][i]!,
      cor,
      corMedia: '#ffffff',
    }))
    peso = (v, c) => {
      const y = alturas[v] as number
      if (y < 0) return c === 0 ? 255 : 0
      const grama = Math.round(255 * Math.max(0, Math.min(1, y / 3)))
      return c === 2 ? grama : c === 1 ? 255 - grama : 0
    }
  }
  const pesos: string[] = []
  for (let arquivo = 0; arquivo * 4 < camadas.length; arquivo++) {
    sinal.throwIfAborted()
    const rgba = new Uint8Array(vertices * 4)
    for (let v = 0; v < vertices; v++)
      for (let k = 0; k < 4; k++) {
        const c = arquivo * 4 + k
        if (c < camadas.length) rgba[v * 4 + k] = peso(v, c)
      }
    const png = await codificarPngDePesos({
      largura: base.colunas + 1,
      altura: base.linhas + 1,
      rgba,
    })
    sinal.throwIfAborted()
    const a = await arquivos.adicionar(`terreno/pesos-${'ab'[arquivo]}.png`, png, {
      mime: 'image/png',
      papel: 'pesos',
      largura: base.colunas + 1,
      altura: base.linhas + 1,
    })
    pesos.push(a.caminho)
  }
  return { tipo: 'campo', pesos, camadas }
}
