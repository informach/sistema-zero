/**
 * Slug seguro para nome de arquivo de download (ZIP). Tira acentos, espacos e
 * simbolos; cai em `projeto` quando sobra vazio. Mesma intencao do slug do
 * `ProjectCard.downloadAsJSON`, so que tambem normaliza acentos (Andre -> andre).
 */
export function sanitizeBaseFilename(name: string): string {
  const safe = name
    .normalize('NFD')
    // marcas diacriticas que o NFD separa das letras base (ex.: o acento de "é")
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return safe || 'projeto'
}
