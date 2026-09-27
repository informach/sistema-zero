/**
 * "Ferramentas que vêm por aí": uma linha no fim da caixa de ferramentas de cada aba, que conta o
 * que abre depois e quando. Descoberta sem poluir: um `<summary>` sem controle nenhum dentro, sem
 * toast, sem selo e sem contagem de cursos. Some quando nada daquela aba está trancado.
 *
 * O "quando" vem pronto do host (`MoldaToolAccess.upcoming`): a oficina nunca monta frase com nome
 * de posto, e o que passa do horizonte do catálogo chega como "E tem muito mais pela frente".
 */
import { SCENE_TOOL_ACCESS_COPY } from '../../../core/sceneToolAccessCopy'
import type { MoldaToolFamily, MoldaToolTab } from '../../../core/toolFamilies'
import { useMoldaToolAccess } from '../../toolAccess'

export function SceneUpcomingTools({
  tabs,
  className = '',
}: {
  tabs: readonly MoldaToolTab[]
  /** Onde a linha cabe (a coluna do Pintar, no celular, não tem altura para mais uma fileira). */
  className?: string
}) {
  const access = useMoldaToolAccess()
  // Duas abas na mesma linha (o Modelar leva também a barra do app): o mesmo "quando" vira um grupo.
  const groups = new Map<string, MoldaToolFamily[]>()
  for (const tab of tabs)
    for (const group of access.upcoming(tab))
      groups.set(group.when, [...(groups.get(group.when) ?? []), ...group.families])
  if (!groups.size) return null
  return (
    <details
      className={`w-full rounded-lg border border-mld-border border-dashed text-sm ${className}`}
    >
      <summary className="flex min-h-11 cursor-pointer items-center px-3 font-bold text-mld-muted">
        {SCENE_TOOL_ACCESS_COPY.upcoming}
      </summary>
      <div className="space-y-2 px-3 pb-3">
        {[...groups].map(([when, families]) => (
          <div key={when}>
            <p className="font-bold text-mld-text">{when}</p>
            <ul className="list-disc space-y-0.5 pl-5 text-mld-text-soft">
              {families.map((family) => (
                <li key={family.id}>{family.label}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  )
}
