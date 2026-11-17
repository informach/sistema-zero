import type { DocumentoDeCenario } from '@sistemazero/molda-cenarios-core/v2'
import { Box3, Euler, Matrix4, Quaternion, Vector3 } from 'three'
import type { LoteDoModelo } from './lotes'

export interface LocalDoObjeto {
  lote: LoteDoModelo
  indice: number
  caixa: Box3
  matriz: Matrix4
}
export interface AlvoDeEdicao {
  pecas: readonly string[]
  caixa: Box3
  matriz: Matrix4
  uniforme: boolean
  atualizar(): void
}

/** Alças operam nas unidades autorais; a geometria continua nos lotes compartilhados. */
export function criarAlvosDeEdicao(
  autoral: DocumentoDeCenario,
  locais: ReadonlyMap<string, LocalDoObjeto>,
  origens: ReadonlyMap<string, string>,
): Map<string, AlvoDeEdicao> {
  const alvos = new Map<string, AlvoDeEdicao>(),
    partes = new Map<string, { id: string; local: LocalDoObjeto }[]>()
  for (const [id, local] of locais) {
    const raiz = origens.get(id)
    if (raiz) {
      const lista = partes.get(raiz) ?? []
      lista.push({ id, local })
      partes.set(raiz, lista)
    } else
      alvos.set(id, {
        pecas: [id],
        caixa: local.caixa,
        matriz: local.matriz,
        uniforme: false,
        atualizar: () => local.lote.atualizar(local.indice, local.matriz),
      })
  }
  for (const m of autoral.montagens ?? []) {
    const filhos = partes.get(m.id)
    if (!filhos?.length) continue
    const t = m.transformacao
    const matriz = new Matrix4().compose(
      new Vector3(t.posicao.x, t.posicao.y, t.posicao.z),
      new Quaternion().setFromEuler(new Euler(t.rotacao.x, t.rotacao.y, t.rotacao.z, 'XYZ')),
      new Vector3(t.escala.x, t.escala.y, t.escala.z),
    )
    const inversa = matriz.clone().invert(),
      caixa = new Box3()
    const relativos = filhos.map(({ local }) => {
      const relativa = new Matrix4().multiplyMatrices(inversa, local.matriz)
      caixa.union(local.caixa.clone().applyMatrix4(relativa))
      return { local, relativa }
    })
    alvos.set(m.id, {
      pecas: filhos.map((p) => p.id),
      matriz,
      caixa,
      uniforme: true,
      atualizar: () => {
        for (const { local, relativa } of relativos) {
          local.matriz.multiplyMatrices(matriz, relativa)
          local.lote.atualizar(local.indice, local.matriz)
        }
      },
    })
  }
  return alvos
}
