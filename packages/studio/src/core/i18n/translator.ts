export type Locale = 'pt-BR' | 'en'
export type Translator = ((key: string, vars?: Record<string, string | number>) => string) & {
  /** O idioma da instância: um painel carregado sob demanda traz os próprios textos nele. */
  readonly locale?: Locale
}

/** Tradução pura: cada instância conserva o idioma, sem registro global de textos. */
export function createDictionaryTranslator(
  dictionaries: Record<Locale, Record<string, string>>,
  locale: Locale = 'pt-BR',
): Translator {
  const dictionary = dictionaries[locale] ?? dictionaries['pt-BR']
  const translate = (key: string, vars: Record<string, string | number> = {}) =>
    (dictionary[key] ?? key).replace(/\{(\w+)\}/g, (_, name: string) =>
      vars[name] !== undefined ? String(vars[name]) : `{${name}}`,
    )
  // Um idioma sem dicionário cai no pt-BR também em quem lê `locale` (o mesmo `?? 'pt-BR'`).
  return Object.assign(translate, { locale })
}
