import { useContext } from 'react'
import { createSharedTranslator } from '../core/i18n/shared'
import type { Translator } from '../core/i18n/translator'
import { StudioI18nContext } from './i18n-context'

const defaultTranslator = createSharedTranslator('pt-BR')

/** Para componentes compartilhados com a lista inicial; respeita o idioma do Studio pai. */
export function useSharedT(): Translator {
  return useContext(StudioI18nContext) ?? defaultTranslator
}
