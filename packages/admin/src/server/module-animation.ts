import 'server-only'
import { randomUUID } from 'node:crypto'
import {
  type ModuleAnimation,
  ModuleAnimationSchema,
} from '@sistemazero/core/course/module-animation'
import { ownedAnimationPreview, prepareAnimationFile } from '@/lib/animation-file'
import { getEnv } from '@/lib/env'
import { MediaNotConfiguredError, r2DeletePublicObject, r2PutObject } from './r2'

export function moduleAnimationPublicPrefix(): string {
  const base = getEnv().R2_PUBLIC_URL
  if (!base) throw new MediaNotConfiguredError('Prévia indisponível: configure R2_PUBLIC_URL.')
  return `${base.replace(/\/+$/, '')}/admin/module-animation/`
}

export function isModuleAnimationPreview(src: string): boolean {
  return ownedAnimationPreview(src, moduleAnimationPublicPrefix())
}

/** Both objects come from the same verified export. No reference escapes until both are stored. */
export async function storeModuleAnimation(bytes: Uint8Array): Promise<ModuleAnimation> {
  const art = prepareAnimationFile(bytes)
  const prefix = `admin/module-animation/${randomUUID()}`
  const posterKey = `${prefix}/poster.png`
  const artKey = `${prefix}/animation.edi-animation.json`
  const created: string[] = []
  try {
    created.push(posterKey)
    const poster = await r2PutObject({
      key: posterKey,
      body: art.poster.bytes,
      contentType: 'image/png',
    })
    created.push(artKey)
    const animation = await r2PutObject({
      key: artKey,
      body: art.content,
      contentType: 'application/json',
    })
    return ModuleAnimationSchema.parse({
      format: 'edi-animation',
      version: 1,
      url: animation.url,
      title: art.info.title,
      sha256: art.sha256,
      bytes: art.content.byteLength,
      poster: {
        url: poster.url,
        width: art.poster.width,
        height: art.poster.height,
        sha256: art.poster.sha256,
      },
    })
  } catch (error) {
    const cleanup = await Promise.allSettled(created.map((key) => r2DeletePublicObject(key)))
    if (cleanup.some((result) => result.status === 'rejected'))
      console.error('[module-animation] limpeza do upload incompleto pendente', { keys: created })
    throw error
  }
}
