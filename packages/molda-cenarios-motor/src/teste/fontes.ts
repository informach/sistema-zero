import type { DocumentoDeCenario } from '@sistemazero/molda-cenarios-core/v2'
import {
  type Box3,
  BoxGeometry,
  type BufferGeometry,
  CapsuleGeometry,
  type Matrix4,
  Vector3,
} from 'three'
import type { FonteDeColisao } from './colisoes'

export interface CorpoDoObjeto {
  caixa: Box3
  matriz: Matrix4
}

/** Uma representação por volume/tipo; nenhuma caixa pendente vira colisão real. */
export function prepararColisoesDoTeste(
  documento: DocumentoDeCenario,
  superficies: readonly (FonteDeColisao & { objeto: string; pendente?: boolean })[],
  corpos: ReadonlyMap<string, CorpoDoObjeto>,
  chao: readonly FonteDeColisao[],
) {
  const fontes: FonteDeColisao[] = [...chao],
    geometrias = new Map<string, BufferGeometry>()
  const porId = new Map(documento.instancias.map((o) => [o.id, o]))
  const representados = new Set<string>()
  for (const s of superficies) {
    if (s.pendente) continue
    const o = porId.get(s.objeto)
    if (!o || o.colisao === 'nenhuma') continue
    if (o.colisao === 'malha') {
      fontes.push(s)
      continue
    }
    if (representados.has(o.id)) continue
    representados.add(o.id)
    const corpo = corpos.get(o.id)
    if (!corpo || corpo.caixa.isEmpty()) continue
    const { min, max } = corpo.caixa
    const chave = JSON.stringify([o.colisao, ...min, ...max])
    let geometria = geometrias.get(chave)
    if (!geometria) {
      const tamanho = corpo.caixa.getSize(new Vector3()),
        centro = corpo.caixa.getCenter(new Vector3())
      if (o.colisao === 'caixa') geometria = new BoxGeometry(tamanho.x, tamanho.y, tamanho.z)
      else {
        const raio = Math.min(tamanho.y / 2, Math.max(tamanho.x, tamanho.z) / 2)
        if (raio <= 0) continue
        geometria = new CapsuleGeometry(raio, Math.max(0, tamanho.y - 2 * raio), 6, 16)
      }
      geometria.translate(centro.x, centro.y, centro.z)
      geometrias.set(chave, geometria)
    }
    fontes.push({ geometria, matriz: corpo.matriz })
  }
  return {
    fontes,
    descartar() {
      for (const g of geometrias.values()) g.dispose()
      geometrias.clear()
    },
  }
}
