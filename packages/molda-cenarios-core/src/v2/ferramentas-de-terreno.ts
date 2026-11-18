import { z } from 'zod'
import type { RegiaoDoCampo } from './campo-de-alturas'
import type { EstadoDoTerreno, PapelDaPeca } from './edicao-de-terreno'
import {
  abaixarTerreno,
  aplainarTerreno,
  carimbarCratera,
  carimbarMorro,
  elevarTerreno,
  erodirTerreno,
  fazerPlato,
  fazerRampa,
  ruidoNoTerreno,
  suavizarTerreno,
} from './pinceis-de-terreno'
import { furarTerreno, pintarChao } from './pintura-de-chao'
import { TerrenoInvalido } from './terreno'

export const FERRAMENTAS_DE_TERRENO = [
  'elevar',
  'abaixar',
  'aplainar',
  'suavizar',
  'nivelar',
  'plato',
  'rampa',
  'ruido',
  'erosao',
  'morro',
  'cratera',
  'pintar',
  'furar',
  'fechar',
] as const
export const ParametrosDeTerrenoSchema = z
  .object({
    ferramenta: z.enum(FERRAMENTAS_DE_TERRENO),
    raio: z.number().finite().min(0.25).max(4096).default(8),
    forca: z.number().finite().min(0).max(1).default(0.5),
    dureza: z.number().finite().min(0).max(1).default(0.5),
    metros: z.number().finite().min(0).max(1000).default(1),
    altura: z.number().finite().min(-10000).max(10000).default(0),
    largura: z.number().finite().min(0.25).max(512).default(4),
    escalaRuido: z.number().finite().min(0.25).max(8192).default(24),
    semente: z.number().int().min(0).max(0x7fffffff).default(1),
    oitavas: z.number().int().min(1).max(8).default(4),
    passadas: z.number().int().min(1).max(64).default(4),
    talude: z.number().finite().min(0).max(10).default(0.6),
    camada: z.number().int().min(0).max(7).default(0),
    bordaCratera: z.number().finite().min(0).max(1000).default(0.25),
  })
  .strict()
export type ParametrosDeTerreno = z.infer<typeof ParametrosDeTerrenoSchema>
export type RegioesDeTerreno = Partial<Record<PapelDaPeca, RegiaoDoCampo | null>>
export interface PontoDaEscultura {
  x: number
  y: number
  z: number
}

/** Uma amostra já espaçada do gesto. Ponto/de trazem a altura original, não a própria prévia. */
export function aplicarFerramentaDeTerreno(
  estado: EstadoDoTerreno,
  parametros: ParametrosDeTerreno,
  ponto: PontoDaEscultura,
  de: PontoDaEscultura = ponto,
): RegioesDeTerreno {
  const p = {
      x: ponto.x,
      z: ponto.z,
      raio: parametros.raio,
      forca: parametros.forca,
      dureza: parametros.dureza,
    },
    c = estado.campo
  let alturas: RegiaoDoCampo | null
  switch (parametros.ferramenta) {
    case 'pintar':
      return { pintura: pintarChao(c, estado.pintura, p, parametros.camada) }
    case 'furar':
    case 'fechar':
      return { buracos: furarTerreno(c, estado.buracos, p, parametros.ferramenta === 'furar') }
    case 'elevar':
      alturas = elevarTerreno(c, p, parametros.metros)
      break
    case 'abaixar':
      alturas = abaixarTerreno(c, p, parametros.metros)
      break
    case 'aplainar':
      alturas = aplainarTerreno(c, p, de.y)
      break
    case 'nivelar':
      alturas = aplainarTerreno(c, p, parametros.altura ?? de.y)
      break
    case 'suavizar':
      alturas = suavizarTerreno(c, p)
      break
    case 'plato':
      alturas = fazerPlato(c, p, parametros.altura ?? de.y)
      break
    case 'ruido':
      alturas = ruidoNoTerreno(c, p, {
        amplitude: parametros.metros,
        escala: parametros.escalaRuido,
        semente: parametros.semente,
        oitavas: parametros.oitavas,
      })
      break
    case 'erosao':
      alturas = erodirTerreno(c, p, { passadas: parametros.passadas, talude: parametros.talude })
      break
    case 'morro':
      alturas = carimbarMorro(c, p, parametros.metros * parametros.forca)
      break
    case 'cratera':
      alturas = carimbarCratera(c, p, {
        profundidade: parametros.metros * parametros.forca,
        borda: parametros.bordaCratera * parametros.forca,
      })
      break
    case 'rampa':
      if (Math.hypot(ponto.x - de.x, ponto.z - de.z) < 0.001) return {}
      if (![ponto.y, de.y].every(Number.isFinite))
        throw new TerrenoInvalido('A altura da rampa é inválida')
      alturas = fazerRampa(c, { de, ate: ponto, largura: parametros.largura }, () => {
        throw new TerrenoInvalido('Informe as alturas originais da rampa')
      })
      break
  }
  return { alturas }
}
