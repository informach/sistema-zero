import type { ProductionFolder } from '@sistemazero/marketing-contracts'

/** Adapters for the existing archive's explicit directory conventions. They identify
 * a candidate group, never prove that its rendered text matches the canonical copy. */
export function productionFolderFromPath(path: string): ProductionFolder | null {
  const match = path.match(
    /^docs\/marketing\/kids\/([a-z0-9-]+)\/instagram\/producao\/(postagens|fixados|destaques)\/([^/]+)$/,
  )
  if (!match?.[1] || !match[2] || !match[3]) return null
  const [, product, family, name] = match
  if (family === 'postagens') {
    const id = name.match(/^(p\d{2})-[a-z0-9-]+$/)?.[1]
    return id ? { path, product, key: id.toUpperCase() } : null
  }
  if (family === 'fixados') {
    const number = name.match(/^(\d{2})-[a-z0-9-]+$/)?.[1]
    return number && number !== '00' ? { path, product, key: `F${number}` } : null
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) return null
  // This archive calls the directory "quem-somos" and its canonical group "Sobre nós".
  return { path, product, key: `highlight:${name === 'quem-somos' ? 'sobre-nos' : name}` }
}

export function productionCanonicalLocation(folder: ProductionFolder) {
  const root = `docs/marketing/kids/${folder.product}/instagram/`
  return folder.key.startsWith('P')
    ? `${root}postagens/`
    : `${root}${folder.key.startsWith('F') ? '02-fixados.md' : '01-destaques.md'}`
}

export function isProductionCanonicalPath(folder: ProductionFolder, path: string) {
  const location = productionCanonicalLocation(folder)
  return location.endsWith('/')
    ? path.startsWith(location) && /^[^/]+\.md$/.test(path.slice(location.length))
    : path === location
}
