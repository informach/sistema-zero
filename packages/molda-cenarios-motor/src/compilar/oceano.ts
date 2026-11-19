import { LIMITES_DA_EXPORTACAO } from '@sistemazero/molda-cenarios-core/compilar'
import { recortarAtributos } from '@sistemazero/molda-cenarios-core/geometria'
import type { BaseDeCenario } from '@sistemazero/molda-cenarios-core/v2'
import { Box3, BufferAttribute, BufferGeometry, Matrix4, Vector3 } from 'three'
import { lerParteEstatica } from '../curvas/parte-estatica'
import type { ParteDoModelo } from '../modelos'
import { conferirGeometriaEstatica } from './geometria'

export interface RetanguloDaAgua {
  x0: number
  x1: number
  z0: number
  z1: number
  uniforme: boolean
}
export interface ParteDeOceanoCompilado {
  geometria: BufferGeometry
  matriz: Matrix4
  uniforme: boolean
}

/** Recorta a lâmina existente: perto de alturas próprias usa setores de até 64 m;
 * fundo omitido e mar exterior usam faixas uniformes, sem PNGs gigantes/repetidos. */
export function particionarOceanoCompilado(
  fonte: Pick<ParteDoModelo, 'geometria' | 'matriz'>,
  base: BaseDeCenario,
): ParteDeOceanoCompilado[] {
  conferirGeometriaEstatica(fonte.geometria)
  if (base.tipo === 'perfil') throw Error('Converta o relevo antes de compilar o oceano.')
  const pos = fonte.geometria.getAttribute('position'),
    ponto = new Vector3(),
    caixa = new Box3()
  for (let i = 0; i < pos.count; i++)
    caixa.expandByPoint(ponto.fromBufferAttribute(pos, i).applyMatrix4(fonte.matriz))
  if (
    caixa.isEmpty() ||
    ![...caixa.min, ...caixa.max].every(Number.isFinite) ||
    caixa.max.y - caixa.min.y > 1e-5
  )
    throw Error('O oceano precisa de uma lâmina horizontal válida.')
  if (base.tipo === 'plano' || !base.pecas.length)
    return [{ geometria: fonte.geometria.clone(), matriz: fonte.matriz.clone(), uniforme: true }]
  const retangulos: RetanguloDaAgua[] = [],
    tamanho = 64 * base.passo,
    colunas = base.colunas / 64,
    linhas = base.linhas / 64,
    usados = new Set(base.pecas.map((p) => p.linha * colunas + p.coluna)),
    x0 = base.origem.x,
    x1 = x0 + base.colunas * base.passo,
    z0 = base.origem.z,
    z1 = z0 + base.linhas * base.passo,
    adicionar = (r: RetanguloDaAgua) => {
      const dentro = {
        ...r,
        x0: Math.max(r.x0, caixa.min.x),
        x1: Math.min(r.x1, caixa.max.x),
        z0: Math.max(r.z0, caixa.min.z),
        z1: Math.min(r.z1, caixa.max.z),
      }
      if (dentro.x1 <= dentro.x0 || dentro.z1 <= dentro.z0) return
      if (retangulos.length >= LIMITES_DA_EXPORTACAO.malha.partes)
        throw Error('O oceano exige setores demais para o pacote. Divida a região de exportação.')
      retangulos.push(dentro)
      return dentro
    }
  adicionar({ x0: caixa.min.x, x1: caixa.max.x, z0: caixa.min.z, z1: z0, uniforme: true })
  adicionar({ x0: caixa.min.x, x1: caixa.max.x, z0: z1, z1: caixa.max.z, uniforme: true })
  adicionar({ x0: caixa.min.x, x1: x0, z0, z1, uniforme: true })
  adicionar({ x0: x1, x1: caixa.max.x, z0, z1, uniforme: true })
  let anteriores = new Map<string, RetanguloDaAgua>()
  for (let linha = 0; linha < linhas; linha++) {
    const atuais = new Map<string, RetanguloDaAgua>()
    for (let coluna = 0; coluna < colunas; ) {
      if (usados.has(linha * colunas + coluna)) {
        const deX = x0 + coluna * tamanho,
          deZ = z0 + linha * tamanho
        for (let z = deZ; z < deZ + tamanho; z += 64)
          for (let x = deX; x < deX + tamanho; x += 64)
            adicionar({
              x0: x,
              x1: Math.min(deX + tamanho, x + 64),
              z0: z,
              z1: Math.min(deZ + tamanho, z + 64),
              uniforme: false,
            })
        coluna++
        continue
      }
      const inicio = coluna
      while (coluna < colunas && !usados.has(linha * colunas + coluna)) coluna++
      const chave = `${inicio}/${coluna}`,
        anterior = anteriores.get(chave)
      if (anterior) {
        anterior.z1 = Math.min(caixa.max.z, z0 + (linha + 1) * tamanho)
        atuais.set(chave, anterior)
      } else {
        const r = {
          x0: x0 + inicio * tamanho,
          x1: x0 + coluna * tamanho,
          z0: z0 + linha * tamanho,
          z1: z0 + (linha + 1) * tamanho,
          uniforme: true,
        }
        const criada = adicionar(r)
        if (criada) atuais.set(chave, criada)
      }
    }
    anteriores = atuais
  }
  return recortarRetangulosDaAgua(fonte, retangulos, caixa.min.y)
}

/** A mesma partição por recorte serve a lagos e rios extensos; não recria a água. */
export function particionarAguaHorizontalCompilada(
  fonte: Pick<ParteDoModelo, 'geometria' | 'matriz'>,
): ParteDeOceanoCompilado[] {
  conferirGeometriaEstatica(fonte.geometria)
  const p = fonte.geometria.getAttribute('position'),
    caixa = new Box3(),
    v = new Vector3()
  for (let i = 0; i < p.count; i++)
    caixa.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(fonte.matriz))
  if (caixa.isEmpty() || ![...caixa.min, ...caixa.max].every(Number.isFinite))
    throw Error('A superfície de água não possui limites válidos.')
  const nx = Math.max(1, Math.ceil((caixa.max.x - caixa.min.x) / 64)),
    nz = Math.max(1, Math.ceil((caixa.max.z - caixa.min.z) / 64))
  if (nx * nz > LIMITES_DA_EXPORTACAO.malha.partes)
    throw Error('A água exige setores demais. Divida a região de exportação.')
  const retangulos: RetanguloDaAgua[] = []
  for (let z = 0; z < nz; z++)
    for (let x = 0; x < nx; x++)
      retangulos.push({
        x0: caixa.min.x + x * 64,
        x1: Math.min(caixa.max.x, caixa.min.x + (x + 1) * 64),
        z0: caixa.min.z + z * 64,
        z1: Math.min(caixa.max.z, caixa.min.z + (z + 1) * 64),
        uniforme: false,
      })
  return recortarRetangulosDaAgua(fonte, retangulos, caixa.min.y)
}

function recortarRetangulosDaAgua(
  fonte: Pick<ParteDoModelo, 'geometria' | 'matriz'>,
  retangulos: readonly RetanguloDaAgua[],
  origemY: number,
): ParteDeOceanoCompilado[] {
  const pos = fonte.geometria.getAttribute('position'),
    saida: ParteDeOceanoCompilado[] = []
  if (retangulos.length * (pos.count + (fonte.geometria.index?.count ?? pos.count)) > 2_000_000)
    throw Error(
      'A fonte do oceano exige trabalho demais para a partição. Use a lâmina nativa ou divida a região.',
    )
  let bytes = 0
  try {
    for (const r of retangulos) {
      const cx = (r.x0 + r.x1) / 2,
        cz = (r.z0 + r.z1) / 2,
        matriz = new Matrix4().makeTranslation(cx, origemY, cz),
        leitura = lerParteEstatica(fonte, matriz.clone().invert())
      try {
        const dados = recortarAtributos(leitura.malha, [
            { x: -1, z: 0, limite: cx - r.x0 },
            { x: 1, z: 0, limite: r.x1 - cx },
            { x: 0, z: -1, limite: cz - r.z0 },
            { x: 0, z: 1, limite: r.z1 - cz },
          ]),
          n = dados.position!.valores.length / 3
        if (!n) continue
        bytes += Object.values(dados).reduce((s, a) => s + a.valores.byteLength, 0)
        if (bytes > LIMITES_DA_EXPORTACAO.malha.bytesDaSaida)
          throw Error('A partição do oceano excede o orçamento de geometria.')
        const g = new BufferGeometry()
        saida.push({ geometria: g, matriz, uniforme: r.uniforme })
        for (const [nome, a] of Object.entries(dados))
          g.setAttribute(nome, new BufferAttribute(a.valores, a.itemSize))
        g.computeBoundingBox()
        g.computeBoundingSphere()
      } finally {
        leitura.descartar()
      }
    }
    return saida
  } catch (erro) {
    for (const p of saida) p.geometria.dispose()
    throw erro
  }
}
