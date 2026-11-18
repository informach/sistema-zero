import {
  dividirMalhaParaExportacao,
  LIMITES_DA_EXPORTACAO,
} from '@sistemazero/molda-cenarios-core/compilar'
import { type BaseDeTerreno, CELULAS_DA_PECA } from '@sistemazero/molda-cenarios-core/v2'
import { BufferAttribute, BufferGeometry, Matrix4, Vector3 } from 'three'
import { lerParteEstatica } from '../curvas/parte-estatica'
import { transformarGeometriaEstatica } from '../geometria-instanciada'
import type { ParteDoModelo } from '../modelos'
import { conferirGeometriaEstatica } from './geometria'

export interface ParteDeSetorCompilado {
  coluna: number
  linha: number
  geometria: BufferGeometry
  matriz: Matrix4
}

/** Particiona os triângulos já desenhados, incluindo o piso simplificado.
 * Não gera relevo ou LOD. Os buffers ficam locais ao setor para conservar precisão. */
export function particionarTerrenoCompilado(
  parte: Pick<ParteDoModelo, 'geometria' | 'matriz'>,
  base: Pick<BaseDeTerreno, 'origem' | 'passo' | 'colunas' | 'linhas'>,
  orcamentoBytes: number = LIMITES_DA_EXPORTACAO.malha.bytesDaSaida,
): ParteDeSetorCompilado[] {
  conferirGeometriaEstatica(parte.geometria)
  if (
    ![base.origem.x, base.origem.z, base.passo].every(Number.isFinite) ||
    base.passo < 0.25 ||
    base.passo > 32 ||
    [base.colunas, base.linhas].some((n) => !Number.isInteger(n) || n < 64 || n > 4096 || n % 64)
  )
    throw Error('A grade dos setores compilados é inválida.')
  const leitura = lerParteEstatica(
      { geometria: parte.geometria, matriz: new Matrix4() },
      new Matrix4(),
    ),
    saida: ParteDeSetorCompilado[] = []
  try {
    const malha = leitura.malha,
      pos = malha.atributos.position!.valores,
      indices = malha.indices!,
      n = indices.length / 3,
      tamanho = CELULAS_DA_PECA * base.passo,
      colunas = base.colunas / CELULAS_DA_PECA,
      linhas = base.linhas / CELULAS_DA_PECA,
      regioes = new Uint16Array(n),
      pontos = [new Vector3(), new Vector3(), new Vector3()]
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < 3; j++) {
        const id = indices[i * 3 + j]!
        pontos[j]!.set(pos[id * 3]!, pos[id * 3 + 1]!, pos[id * 3 + 2]!).applyMatrix4(parte.matriz)
      }
      const x = pontos.reduce((s, p) => s + p.x, 0) / 3,
        z = pontos.reduce((s, p) => s + p.z, 0) / 3,
        coluna = Math.floor((x - base.origem.x) / tamanho),
        linha = Math.floor((z - base.origem.z) / tamanho),
        ox = base.origem.x + coluna * tamanho,
        oz = base.origem.z + linha * tamanho
      if (
        !Number.isInteger(coluna) ||
        !Number.isInteger(linha) ||
        coluna < 0 ||
        linha < 0 ||
        coluna >= colunas ||
        linha >= linhas
      )
        throw Error('Um triângulo do terreno está fora da grade compilada.')
      if (
        pontos.some(
          (p) =>
            p.x < ox - 1e-5 ||
            p.x > ox + tamanho + 1e-5 ||
            p.z < oz - 1e-5 ||
            p.z > oz + tamanho + 1e-5,
        )
      )
        throw Error(
          'Um triângulo do terreno atravessa setores; preserve as peças do gerador original.',
        )
      regioes[i] = linha * colunas + coluna
    }
    const ordem = Uint32Array.from({ length: n }, (_, i) => i).sort(
        (a, b) => regioes[a]! - regioes[b]! || a - b,
      ),
      ordenados = new Uint32Array(indices.length),
      setores = new Uint16Array(n)
    for (let i = 0; i < n; i++) {
      setores[i] = regioes[ordem[i]!]!
      for (let j = 0; j < 3; j++) ordenados[i * 3 + j] = indices[ordem[i]! * 3 + j]!
    }
    for (const dados of dividirMalhaParaExportacao(
      { ...malha, indices: ordenados },
      65000,
      orcamentoBytes,
      setores,
    )) {
      const coluna = dados.regiao! % colunas,
        linha = Math.floor(dados.regiao! / colunas),
        matriz = new Matrix4().makeTranslation(
          base.origem.x + coluna * tamanho,
          0,
          base.origem.z + linha * tamanho,
        ),
        relativa = matriz.clone().invert().multiply(parte.matriz),
        g = new BufferGeometry()
      try {
        for (const [nome, a] of Object.entries(dados.atributos))
          g.setAttribute(nome, new BufferAttribute(a.valores, a.itemSize))
        g.setIndex(new BufferAttribute(dados.indices, 1))
        saida.push({ coluna, linha, matriz, geometria: transformarGeometriaEstatica(g, relativa) })
      } finally {
        g.dispose()
      }
    }
    return saida
  } catch (erro) {
    for (const p of saida) p.geometria.dispose()
    throw erro
  } finally {
    leitura.descartar()
  }
}
