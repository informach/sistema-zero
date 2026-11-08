export type Locale = 'pt-BR' | 'en'
export type Translator = (key: string, vars?: Record<string, string | number>) => string

/** Tradução pura: cada instância conserva o idioma, sem registro global de textos. */
export function createDictionaryTranslator(
  dictionaries: Record<Locale, Record<string, string>>,
  locale: Locale = 'pt-BR',
): Translator {
  const dictionary = dictionaries[locale] ?? dictionaries['pt-BR']
  return (key, vars = {}) =>
    (dictionary[key] ?? key).replace(/\{(\w+)\}/g, (_, name: string) =>
      vars[name] !== undefined ? String(vars[name]) : `{${name}}`,
    )
}
