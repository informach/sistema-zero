export type CodeLanguage =
  | 'html'
  | 'css'
  | 'javascript'
  | 'typescript'
  | 'json'
  | 'markdown'
  | 'xml'
  | 'plaintext'

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
  // Explícito (não fallback): a árvore PRO permite mjs/cjs/jsx e os extras
  // legados permitem mjs — precisam do language service de JS.
  if (/\.(?:js|mjs|cjs|jsx)$/i.test(fileName)) return 'javascript'
  if (/\.json$/i.test(fileName)) return 'json'
  if (/\.(?:md|markdown)$/i.test(fileName)) return 'markdown'
  if (/\.(?:svg|xml)$/i.test(fileName)) return 'xml'
  // Desconhecido = texto puro. O fallback antigo era 'javascript', que rodava o
  // tokenizer/formatador de JS em cima de JSON/MD/SVG na árvore PRO.
  return 'plaintext'
}
