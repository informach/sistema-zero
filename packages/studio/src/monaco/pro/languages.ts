/// <reference path="./monarch.d.ts" />
import type * as Monaco from 'monaco-editor'

export const PRO_TS_LANGUAGE = 'sz-pro-typescript'
export const PRO_JS_LANGUAGE = 'sz-pro-javascript'
let registered = false

/** Separate language ids prevent global classic JS defaults from disabling Pro diagnostics. */
export function registerProLanguages(monaco: typeof Monaco) {
  if (registered) return
  registered = true
  for (const id of [PRO_TS_LANGUAGE, PRO_JS_LANGUAGE]) {
    monaco.languages.register({ id })
    monaco.languages.registerTokensProviderFactory(id, {
      create: async () => {
        const { language, conf } = await import(
          'monaco-editor/esm/vs/basic-languages/typescript/typescript.js'
        )
        monaco.languages.setLanguageConfiguration(id, conf)
        return language
      },
    })
  }
}

export function proLanguage(base: string): string {
  return base === 'typescript' ? PRO_TS_LANGUAGE : base === 'javascript' ? PRO_JS_LANGUAGE : base
}
