export type CodeLanguage = 'html' | 'css' | 'javascript'

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
  return 'javascript'
}
