import type { InstanciaDeCenario, ModeloDeCatalogo } from '@sistemazero/molda-cenarios-core'
import { useEffect, useMemo } from 'react'
import { Box3, Box3Helper, Vector3 } from 'three'
import { matrizDaInstancia } from './apoio'

export function CaixasDaSelecao({
  objetos,
  catalogo,
}: {
  objetos: readonly InstanciaDeCenario[]
  catalogo: ReadonlyMap<string, ModeloDeCatalogo>
}) {
  const caixas = useMemo(
    () =>
      objetos.map((p) => {
        const m = catalogo.get(p.modelo)!,
          box = new Box3(new Vector3(...m.min), new Vector3(...m.max)).applyMatrix4(
            matrizDaInstancia(p),
          ),
          helper = new Box3Helper(box, '#efb23d')
        helper.renderOrder = 1000
        for (const m of Array.isArray(helper.material) ? helper.material : [helper.material])
          m.depthTest = false
        return helper
      }),
    [objetos, catalogo],
  )
  useEffect(
    () => () => {
      for (const h of caixas) {
        h.geometry.dispose()
        for (const m of Array.isArray(h.material) ? h.material : [h.material]) m.dispose()
      }
    },
    [caixas],
  )
  return caixas.map((c) => <primitive key={c.uuid} object={c} dispose={null} />)
}
