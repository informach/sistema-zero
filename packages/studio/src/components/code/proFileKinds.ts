/**
 * O que cada arquivo do projeto Pro É, na língua da criança (redesenho de 11/2026): a cor e a
 * sigla do ladrilho, a frase de apoio ("O que o jogo faz") e se ele mora na gaveta "Configuração"
 * (os arquivos que a criança não precisa abrir). Puro: o `ProFileTree`, a faixa de abas, o
 * "Ir para um arquivo" e a janela "Criar um arquivo" leem a mesma tabela.
 */

export type ProFileTone =
  | 'js'
  | 'py'
  | 'css'
  | 'html'
  | 'json'
  | 'text'
  | 'image'
  | 'config'
  | 'dir'

export interface ProFileKind {
  tone: ProFileTone
  /** Sigla curta no ladrilho ('JS', 'Py', 'TS'); vazia = um ícone no lugar. */
  short: string
  /** Chave i18n da frase de apoio. */
  descriptionKey: string
  /** Mora na gaveta "Configuração" (fechada por padrão). */
  config: boolean
}

/** Os arquivos que dizem como o jogo é MONTADO, não o que ele faz. */
export function isProConfigPath(path: string): boolean {
  const name = path.slice(path.lastIndexOf('/') + 1)
  if (path.includes('/')) return false
  return (
    name === 'package.json' ||
    name === 'package-lock.json' ||
    name === '.gitignore' ||
    name === '.npmrc' ||
    /^vite\.config\.[cm]?[jt]sx?$/.test(name) ||
    /^tsconfig(?:\.[\w-]+)?\.json$/.test(name) ||
    /^biome\.json[c]?$/.test(name) ||
    /^\.eslintrc(?:\..+)?$/.test(name)
  )
}

const DESCRIPTION_KEYS: Record<ProFileTone, string> = {
  js: 'pro.files.desc.js',
  py: 'pro.files.desc.py',
  css: 'pro.files.desc.css',
  html: 'pro.files.desc.html',
  json: 'pro.files.desc.json',
  text: 'pro.files.desc.text',
  image: 'pro.files.desc.image',
  config: 'pro.files.desc.config',
  dir: 'pro.files.desc.dir',
}

export function proFileKind(
  path: string,
  options: {
    kind?: 'file' | 'dir'
    /** O arquivo por onde o programa começa (o `entrypoint` do Python ou o `src/main.*` do JS). */
    entrypoint?: string | null
  } = {},
): ProFileKind {
  if (options.kind === 'dir')
    return { tone: 'dir', short: '', descriptionKey: DESCRIPTION_KEYS.dir, config: false }
  const name = path.slice(path.lastIndexOf('/') + 1)
  const extension = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : ''
  const main = options.entrypoint ? path === options.entrypoint : isDefaultProEntrypoint(path)
  if (isProConfigPath(path)) {
    return {
      tone: 'config',
      short: name === 'package.json' || name === 'package-lock.json' ? '{ }' : '',
      descriptionKey:
        name === 'package.json' || name === 'package-lock.json'
          ? 'pro.files.desc.package'
          : DESCRIPTION_KEYS.config,
      config: true,
    }
  }
  if (extension === 'py') {
    return {
      tone: 'py',
      short: 'Py',
      descriptionKey: main ? 'pro.files.desc.entry' : DESCRIPTION_KEYS.py,
      config: false,
    }
  }
  if (['js', 'mjs', 'cjs', 'jsx'].includes(extension)) {
    return {
      tone: 'js',
      short: 'JS',
      descriptionKey: main ? 'pro.files.desc.main' : DESCRIPTION_KEYS.js,
      config: false,
    }
  }
  if (['ts', 'mts', 'cts', 'tsx'].includes(extension)) {
    return {
      tone: 'js',
      short: 'TS',
      descriptionKey: main ? 'pro.files.desc.main' : DESCRIPTION_KEYS.js,
      config: false,
    }
  }
  if (extension === 'css' || extension === 'scss')
    return { tone: 'css', short: '', descriptionKey: DESCRIPTION_KEYS.css, config: false }
  if (extension === 'html' || extension === 'htm')
    return { tone: 'html', short: '', descriptionKey: DESCRIPTION_KEYS.html, config: false }
  if (extension === 'json')
    return { tone: 'json', short: '{ }', descriptionKey: DESCRIPTION_KEYS.json, config: false }
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico'].includes(extension))
    return { tone: 'image', short: '', descriptionKey: DESCRIPTION_KEYS.image, config: false }
  return { tone: 'text', short: '', descriptionKey: DESCRIPTION_KEYS.text, config: false }
}

/** Sem `entrypoint` explícito, o JS começa pelo mesmo arquivo que o workspace abre primeiro. */
function isDefaultProEntrypoint(path: string): boolean {
  return ['src/main.tsx', 'src/main.ts', 'src/main.js', 'src/main.py', 'main.py'].includes(path)
}

/** O nome que a criança lê na aba e na lista: só o arquivo, sem a pasta. */
export function proFileBaseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}
