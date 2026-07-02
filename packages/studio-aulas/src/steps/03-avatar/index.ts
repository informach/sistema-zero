import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadAvatarEnv } from '../../config/env'
import { loadRoteiroFile } from '../../roteiro/parse'
import { aviso, etapa, ok, passo } from '../../util/log'
import { assertAulaExiste, aulaPaths } from '../../util/paths'
import { CHROMA_VERDE, HeyGenClient } from './heygen'

/** Manifesto de avatar: cena → clipe mp4 (fundo verde de chroma). */
export interface AvatarManifest {
  slug: string
  geradoEm: string
  chroma: string
  cenas: { id: string; arquivo: string }[]
}

/**
 * Etapa 3 — para cada cena com áudio, gera o clipe do avatar (lip-sync no
 * HeyGen) sobre verde de chroma. Depende da etapa de voz ter rodado.
 */
export async function gerarAvatar(slug: string, apenasCenas?: string[]): Promise<AvatarManifest> {
  const env = loadAvatarEnv()
  const paths = aulaPaths(slug)
  assertAulaExiste(paths)
  const roteiro = loadRoteiroFile(paths.roteiro)

  const cliente = new HeyGenClient({
    apiKey: env.HEYGEN_API_KEY,
    avatarId: env.HEYGEN_AVATAR_ID,
    fundo: CHROMA_VERDE,
  })

  mkdirSync(paths.avatarDir, { recursive: true })
  etapa(`Avatar — ${roteiro.meta.titulo}`)

  const alvo = apenasCenas ? new Set(apenasCenas) : null
  const cenas: AvatarManifest['cenas'] = []
  for (const cena of roteiro.cenas) {
    const arquivo = `${cena.id}.mp4`
    cenas.push({ id: cena.id, arquivo })
    if (alvo && !alvo.has(cena.id)) continue

    const mp3Path = join(paths.audioDir, `${cena.id}.mp3`)
    if (!existsSync(mp3Path)) {
      aviso(`sem áudio para ${cena.id} — rode a etapa de voz antes. Pulando.`)
      continue
    }
    passo(`${cena.id} — upload do áudio…`)
    const assetId = await cliente.uploadAudio(readFileSync(mp3Path))
    passo(`${cena.id} — gerando avatar (pode levar minutos)…`)
    const videoId = await cliente.gerarVideo(assetId)
    const url = await cliente.aguardar(videoId)
    const mp4 = await cliente.baixar(url)
    writeFileSync(join(paths.avatarDir, arquivo), mp4)
    ok(`${cena.id} pronto`)
  }

  const manifest: AvatarManifest = {
    slug,
    geradoEm: new Date().toISOString(),
    chroma: CHROMA_VERDE,
    cenas,
  }
  writeFileSync(join(paths.avatarDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
  ok(`${cenas.length} clipes em ${paths.avatarDir}`)
  return manifest
}
