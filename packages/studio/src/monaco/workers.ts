import { loader } from '@monaco-editor/react'
// Basic-languages: registram os tokenizers Monarch que fazem a COLORIZAÇÃO
// (syntax highlighting) de HTML/CSS/JS. Os language services (carregados sob
// demanda em `loadLanguageServices`) NÃO incluem isso para HTML/CSS — sem estes
// imports o editor fica monocromático. São leves, então ficam no chunk do editor.
import 'monaco-editor/esm/vs/basic-languages/css/css.contribution.js'
import 'monaco-editor/esm/vs/basic-languages/html/html.contribution.js'
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution.js'
// Algumas contribuições do editor precisam registrar ações/serviços antes de o
// editor ser instanciado. Elas ficam no chunk lazy do Monaco, não na listagem.
import 'monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestController.js'
import 'monaco-editor/esm/vs/editor/contrib/snippet/browser/snippetController2.js'
import 'monaco-editor/esm/vs/editor/contrib/format/browser/formatActions.js'
import 'monaco-editor/esm/vs/editor/contrib/parameterHints/browser/parameterHints.js'
import 'monaco-editor/esm/vs/editor/contrib/hover/browser/hoverContribution.js'
import 'monaco-editor/esm/vs/editor/contrib/bracketMatching/browser/bracketMatching.js'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import type { MonacoModelRegistry } from './modelPaths'

let configured = false

/**
 * Configuração MÍNIMA e SÍNCRONA do Monaco para um ambiente Vite. Deve poder
 * rodar no primeiro import do editor sem carregar os serviços de linguagem do
 * TS/HTML/CSS. Esses recursos entram depois em `loadLanguageServices`, fora do
 * caminho crítico de navegação.
 *
 * Faz duas coisas:
 *
 * 1. `loader.config({ monaco })` — fixa o `@monaco-editor/react` no Monaco ESM
 *    já empacotado pelo Vite. Sem isso, o `@monaco-editor/loader` injeta o
 *    loader AMD do Monaco (um `define()` global), que COLIDE com o bundle UMD
 *    do Blockly (`blocks_compressed.js`) e dispara o erro "Can only have one
 *    anonymous define call per script file" ao alternar entre Código e
 *    Blocos/Ponte. Usando o ESM bundlado, nenhum `define` global é criado.
 *
 * 2. `getWorker` roteado por `label` — cada serviço de linguagem (HTML, CSS,
 *    JS/TS) roda no seu próprio Web Worker, criado via
 *    `new Worker(new URL('./workers/x.worker.ts', import.meta.url))`, a forma
 *    CROSS-BUNDLER (Vite no playground; Turbopack/webpack nos apps Next que
 *    embarcam o <Studio>). Cada `new URL` precisa de literal INLINE — os
 *    bundlers fazem análise estática e não resolvem variável/helper. Os
 *    wrappers em ./workers/ existem porque o Vite não resolve bare specifier
 *    (monaco-editor/esm/...) dentro de new URL(); um caminho relativo do
 *    próprio package resolve nos três. Os workers só são INSTANCIADOS quando
 *    um serviço de linguagem efetivamente pede (após `loadLanguageServices`).
 */
/**
 * Nomes dos temas do Monaco do Studio. Há exatamente UM tema ativo global por
 * página (consequência do namespace único do Monaco), então duas instâncias em
 * Código/Ponte compartilham o último tema definido. Estes nomes apenas garantem
 * que o tema esteja registrado ANTES de qualquer editor montar (ver
 * `docs/embedding.md`, "Limitações conhecidas").
 */
export const SZ_MONACO_DARK = 'sz-monaco-dark'
export const SZ_MONACO_LIGHT = 'sz-monaco-light'

let themesDefined = false

/**
 * Registra os temas nomeados do Studio UMA vez. Herdam de `vs-dark`/`vs` (sem
 * `rules`/`colors` próprios) para manter a aparência idêntica aos temas
 * embutidos — o objetivo é só ter um NOME estável registrado antes de o
 * `@monaco-editor/react` instanciar o editor, evitando a corrida em que o editor
 * monta com um tema ainda não definido. `defineTheme` deve rodar uma única vez
 * por nome (ver docs do Monaco).
 */
export function defineMonacoThemes(): void {
  if (themesDefined) return
  themesDefined = true
  monaco.editor.defineTheme(SZ_MONACO_DARK, {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {},
  })
  monaco.editor.defineTheme(SZ_MONACO_LIGHT, {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {},
  })
}

/** Mapeia o tema da instância para o tema nomeado registrado em `defineMonacoThemes`. */
export function monacoThemeName(theme: 'vs-dark' | 'light'): string {
  return theme === 'light' ? SZ_MONACO_LIGHT : SZ_MONACO_DARK
}

export function configureMonacoWorkers(): void {
  if (configured) return
  configured = true
  loader.config({ monaco })
  defineMonacoThemes()
  ;(self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
    getWorker(_workerId: string, label: string) {
      if (label === 'css' || label === 'scss' || label === 'less')
        return new Worker(new URL('./workers/css.worker.ts', import.meta.url), { type: 'module' })
      if (label === 'html' || label === 'handlebars' || label === 'razor')
        return new Worker(new URL('./workers/html.worker.ts', import.meta.url), { type: 'module' })
      if (label === 'typescript' || label === 'javascript')
        return new Worker(new URL('./workers/ts.worker.ts', import.meta.url), { type: 'module' })
      return new Worker(new URL('./workers/editor.worker.ts', import.meta.url), { type: 'module' })
    },
  }
}

export function getMonacoModelRegistry(): MonacoModelRegistry {
  return monaco.editor
}

let languageServicesPromise: Promise<void> | null = null

/**
 * Carrega SOB DEMANDA os serviços de linguagem do Monaco. São módulos
 * main-thread que registram providers que conversam com os workers e — no caso
 * do TypeScript — expõem o namespace `monaco.languages.typescript`. Importar só
 * os `*.worker` NÃO basta.
 *
 * Ficam FORA do escopo de módulo (que é avaliado de forma síncrona quando o
 * chunk do editor é avaliado) para não travar a main thread: o
 * `typescript/monaco.contribution` puxa o compilador do TS (~6 MB). Carregando
 * aqui, de forma assíncrona e idempotente, o editor abre na hora e o
 * IntelliSense "acende" logo depois.
 */
export function loadLanguageServices(): Promise<void> {
  if (languageServicesPromise) return languageServicesPromise
  configureMonacoWorkers()
  languageServicesPromise = Promise.all([
    import('monaco-editor/esm/vs/language/css/monaco.contribution.js'),
    import('monaco-editor/esm/vs/language/html/monaco.contribution.js'),
    import('monaco-editor/esm/vs/language/typescript/monaco.contribution.js'),
  ])
    .then(() => {
      // Defaults do JavaScript — autocomplete "limpo": completa globais do
      // browser (document, querySelector, canvas…) mas SEM sublinhar erros. No
      // modo Ponte quem reporta erros de sintaxe é o parser (Babel); ligar a
      // validação do TS aqui só duplicaria avisos e marcaria falso-positivos em
      // globais do aluno. Só é seguro acessar `monaco.languages.typescript`
      // DEPOIS de a contribution acima ter sido importada.
      const ts = monaco.languages.typescript
      ts.javascriptDefaults.setCompilerOptions({
        target: ts.ScriptTarget.ESNext,
        allowNonTsExtensions: true,
        allowJs: true,
        checkJs: false,
        lib: ['esnext', 'dom', 'dom.iterable'],
      })
      ts.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: true,
      })
      ts.javascriptDefaults.setEagerModelSync(true)
    })
    .catch((err) => {
      // Permite nova tentativa numa próxima montagem do editor.
      languageServicesPromise = null
      throw err
    })
  return languageServicesPromise
}

let warmedUp = false

/**
 * Pré-aquece os serviços de linguagem do Monaco em segundo plano. Além de
 * carregar as contribuições (via `loadLanguageServices`), força o worker do
 * TypeScript a inicializar (compilador + libs do DOM) com uma consulta efêmera,
 * para que o autocomplete de JS apareça na hora quando o aluno começar a digitar.
 *
 * É best-effort e idempotente. Deve ser chamado durante `idle` para não
 * competir com o render inicial do editor.
 */
export async function warmupMonacoLanguageServices(): Promise<void> {
  if (warmedUp) return
  warmedUp = true
  try {
    await loadLanguageServices()
    const uri = monaco.Uri.parse('inmemory://sz-warmup/warmup.js')
    const model =
      monaco.editor.getModel(uri) ?? monaco.editor.createModel('document;', 'javascript', uri)
    try {
      const getWorker = await monaco.languages.typescript.getJavaScriptWorker()
      const client = await getWorker(model.uri)
      // Qualquer consulta força o worker a carregar o compilador + libs.
      await client.getCompletionsAtPosition(model.uri.toString(), model.getValue().length)
    } finally {
      // Descarta o model efêmero mesmo se a consulta ao worker lançar — senão o
      // model de aquecimento vaza no registro global do Monaco.
      model.dispose()
    }
  } catch {
    // Aquecimento é opcional; se falhar, o worker carrega normalmente ao abrir o editor.
    warmedUp = false
  }
}
