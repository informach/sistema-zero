/**
 * Os arquivos do avatar: onde o navegador os pede e quais existem.
 *
 * Os arquivos moram nos buckets PRIVADOS do R2 (pasta `avatar/`; o pack é pago e não pode ficar
 * num endereço público). O navegador pede `AVATAR_FILE_ROUTE + <arquivo>` ao app; o app confere a
 * sessão e se o arquivo é do catálogo (`isAvatarFile`) e devolve um link assinado que vence.
 */
import type { AvatarCatalog } from './types'

/** A rota dos apps (Kids e adulto) que entrega os arquivos do avatar. */
export const AVATAR_FILE_ROUTE = '/api/avatar3d/'

/** A pasta do avatar dentro do bucket. */
export const AVATAR_BUCKET_FOLDER = 'avatar'

/** Só nomes de arquivo como os que a migração grava: pasta, nome com a impressão digital, tipo. */
const NOME = /^(base|pecas|miniaturas)\/[a-z0-9_.-]+\.(glb|webp|png)$/

export function avatarFileUrl(file: string): string {
  return `${AVATAR_FILE_ROUTE}${file}`
}

export function avatarBucketKey(file: string): string {
  return `${AVATAR_BUCKET_FOLDER}/${file}`
}

/** Todos os arquivos que o catálogo cita. */
export function avatarFiles(catalog: AvatarCatalog): Set<string> {
  const files = new Set<string>(Object.values(catalog.base.textures))
  if (catalog.base.skeleton.file) files.add(catalog.base.skeleton.file)
  if (catalog.base.skeleton.game?.file) files.add(catalog.base.skeleton.game.file)
  for (const part of Object.values(catalog.parts)) {
    files.add(part.file)
    files.add(part.thumb)
  }
  return files
}

let cache: { catalog: AvatarCatalog; files: Set<string> } | null = null

/**
 * O arquivo pedido existe no catálogo. É o que impede alguém de usar a rota para ler outra coisa
 * do bucket privado.
 */
export function isAvatarFile(catalog: AvatarCatalog, file: string): boolean {
  if (!NOME.test(file) || file.includes('..')) return false
  if (cache?.catalog !== catalog) cache = { catalog, files: avatarFiles(catalog) }
  return cache.files.has(file)
}
