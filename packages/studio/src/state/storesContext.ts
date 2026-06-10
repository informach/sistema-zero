import { createContext } from 'react'
// Import SÓ de tipo: studioStores importa as factories em runtime; manter este
// módulo livre de imports de runtime evita o ciclo.
import type { StudioStores } from './studioStores'

/**
 * Stores POR INSTÂNCIA do <Studio>. `null` = fora de um Studio (lista de
 * projetos, testes de componente isolados) — os hooks `useXStore` caem na
 * store default de módulo. As estáticas `useXStore.getState/setState/subscribe`
 * operam SEMPRE na default (contrato usado pelos testes).
 */
export const StudioStoresContext = createContext<StudioStores | null>(null)
