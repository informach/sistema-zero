import { createDictionaryTranslator, type Locale, type Translator } from '../translator'
import { en } from './en'
import { ptBR } from './pt-BR'

const DICT = { 'pt-BR': ptBR, en }

/** Textos compartilhados: a lista de projetos não precisa carregar o vocabulário do Pro. */
export function createSharedTranslator(locale: Locale = 'pt-BR'): Translator {
  return createDictionaryTranslator(DICT, locale)
}
