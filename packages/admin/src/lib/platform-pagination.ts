import type { Platform } from './platform'

export interface PlatformPage {
  platform: Platform
  offset: number
}

/** Uma página pertence à audiência em que foi escolhida; outra audiência começa em zero. */
export function offsetForPlatform(page: PlatformPage, platform: Platform): number {
  return pageForPlatform(page, platform).offset
}

/** Persiste a troca de audiência para que voltar depois não restaure um offset antigo. */
export function pageForPlatform(page: PlatformPage, platform: Platform): PlatformPage {
  return page.platform === platform ? page : { platform, offset: 0 }
}
