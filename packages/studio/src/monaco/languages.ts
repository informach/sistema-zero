export type CodeLanguage = 'html' | 'css' | 'javascript' | 'typescript'

export const FILE_LANGUAGE: Record<string, CodeLanguage> = {
  'index.html': 'html',
  'style.css': 'css',
  'script.js': 'javascript',
}

export function inferLanguage(fileName: string): CodeLanguage {
  const known = FILE_LANGUAGE[fileName]
  if (known) return known
  if (/\.html?$/i.test(fileName)) return 'html'
  if (/\.css$/i.test(fileName)) return 'css'
  // .ts/.tsx usam a linguagem 'typescript' do Monaco (mesma para ambos; o ts
  // worker é configurado com jsx). O preview transpila via Sucrase.
  if (/\.tsx?$/i.test(fileName)) return 'typescript'
  return 'javascript'
}
