/**
 * `?nivel=explorer|architect|god` no playground: a oficina como a criança daquele posto a vê.
 * Espelho de demonstração do que o kids calcula (`community-kids/src/lib/molda-tool-access.ts`),
 * sem importar o kids. Sem o parâmetro (ou `god`), tudo liberado.
 */
import { type MoldaToolAccess, moldaToolFamilyIds } from '../src/core/toolFamilies'

const ARCHITECT = 'Abrem no nível Arquiteto(a) de Mundos'
const LEGEND = 'Abrem no nível Lenda'

export function playgroundToolAccess(nivel: string | null): MoldaToolAccess | undefined {
  if (nivel === 'explorer')
    return {
      allow: moldaToolFamilyIds(['basic']),
      upcoming: [
        { when: ARCHITECT, families: moldaToolFamilyIds(['intermediate']) },
        { when: LEGEND, families: moldaToolFamilyIds(['professional']) },
      ],
    }
  if (nivel === 'architect')
    return {
      allow: moldaToolFamilyIds(['basic', 'intermediate']),
      upcoming: [{ when: LEGEND, families: moldaToolFamilyIds(['professional']) }],
    }
  return undefined
}
