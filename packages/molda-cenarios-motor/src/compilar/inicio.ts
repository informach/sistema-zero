import type { CenaCompilada } from '@sistemazero/molda-cenarios-core/compilar'
import { Box3, Vector3 } from 'three'
import type { MundoDoTeste } from '../teste/colisoes'

interface CenaComInicio {
  dados: {
    marcadores: CenaCompilada['marcadores']
    nos: readonly Pick<CenaCompilada['nos'][number], 'volume'>[]
    terreno?: Pick<NonNullable<CenaCompilada['terreno']>, 'origem' | 'passo' | 'colunas' | 'linhas'>
  }
  colisoes: Pick<MundoDoTeste, 'rastrear'>
}

/** Same arrival for the portable example and game adapters, in compiled world coordinates. */
export function resolverInicioDaCena(pronto: CenaComInicio) {
  const inicio =
    pronto.dados.marcadores.find(
      (m) => m.configuracao?.tipo === 'inicio' && m.configuracao.principal,
    ) ?? pronto.dados.marcadores.find((m) => m.configuracao?.tipo === 'inicio')
  if (inicio)
    return {
      posicao: new Vector3(inicio.posicao.x, inicio.posicao.y, inicio.posicao.z),
      giro: inicio.giro,
      marcador: inicio.id,
    }
  const posicao = new Vector3(),
    volume = new Box3()
  for (const n of pronto.dados.nos) {
    volume.expandByPoint(new Vector3(n.volume.min.x, n.volume.min.y, n.volume.min.z))
    volume.expandByPoint(new Vector3(n.volume.max.x, n.volume.max.y, n.volume.max.z))
  }
  if (!volume.isEmpty()) {
    volume.getCenter(posicao)
    const medir = () =>
      pronto.colisoes.rastrear(
        new Vector3(posicao.x, volume.max.y + 2, posicao.z),
        new Vector3(posicao.x, volume.min.y - 2, posicao.z),
      )
    let contato = medir()
    // A remote decorative object can put the combined center outside the land.
    // Try the actual terrain's center only when the original fallback has no support.
    if (!contato && pronto.dados.terreno) {
      const t = pronto.dados.terreno
      posicao.x = t.origem.x + (t.colunas * t.passo) / 2
      posicao.z = t.origem.z + (t.linhas * t.passo) / 2
      contato = medir()
    }
    posicao.y = contato?.ponto.y ?? posicao.y
  }
  return { posicao, giro: 0, marcador: null }
}
