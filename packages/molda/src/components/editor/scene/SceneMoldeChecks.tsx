import { useMemo } from 'react'
import { COPY } from '../../../core/copy'
import { sceneBounds } from '../../../scene/bounds'
import type { MoldaSceneDocument } from '../../../scene/document'
import { indexSceneDocument } from '../../../scene/documentIndex'
import { Check, TriangleAlert } from '../../ui/icons'
import { conferirMolde } from './moldeChecks'
import { useMoldeDaOficina } from './moldeContext'

/**
 * O cartão do molde no painel da oficina (28/10/2026, o Arquipélago): cabe no molde, a frente na
 * marca rosa e "leve para a ilha". Só aparece quando a criação foi aberta pelo molde do host.
 */
export function SceneMoldeChecks({ document }: { document: MoldaSceneDocument }) {
  const molde = useMoldeDaOficina()
  const conferencias = useMemo(() => {
    if (!molde) return null
    try {
      const index = indexSceneDocument(document)
      return conferirMolde(sceneBounds(index, { includeHidden: false }), index.triangleCount, molde)
    } catch {
      return null
    }
  }, [document, molde])
  if (!molde || !conferencias) return null
  const copy = COPY.scene.molde
  const itens = [
    {
      ok: conferencias.cabe,
      texto: conferencias.vazio ? copy.vazio : conferencias.cabe ? copy.cabe : copy.naoCabe,
    },
    { ok: conferencias.frente, texto: conferencias.frente ? copy.frente : copy.semFrente },
    {
      ok: conferencias.leve,
      texto: (conferencias.leve ? copy.leve : copy.pesado)(
        conferencias.triangulos,
        molde.maxTriangles,
      ),
    },
  ]
  return (
    <section aria-label={copy.titulo(molde.name)} className="mld-molde-checks">
      <h3 className="mld-molde-checks-title">{copy.titulo(molde.name)}</h3>
      <ul>
        {itens.map((item) => (
          <li key={item.texto} data-ok={item.ok}>
            {item.ok ? (
              <Check aria-hidden="true" className="size-4 shrink-0" />
            ) : (
              <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
            )}
            <span>{item.texto}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
