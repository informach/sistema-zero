import { createContext } from 'react'
import type { Translator } from '../core/i18n/translator'

// Sem dicionários aqui: componentes da lista e do editor compartilham o mesmo contexto,
// mas cada entrada carrega apenas os textos de que precisa fora de um provider.
export const StudioI18nContext = createContext<Translator | null>(null)
