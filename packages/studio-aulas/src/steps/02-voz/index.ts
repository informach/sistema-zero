import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadVozEnv } from '../../config/env'
import { loadRoteiroFile } from '../../roteiro/parse'
import type { Roteiro } from '../../roteiro/schema'
import { etapa, ok, passo } from '../../util/log'
import { assertAulaExiste, aulaPaths } from '../../util/paths'
import { ElevenLabsClient, settingsParaEmocao, type VozSettings } from './elevenlabs'

/** Manifesto de áudio: cena → arquivo mp3 gerado. Consumido pela montagem. */
export interface AudioManifest {
  slug: string
  geradoEm: string
  cenas: { id: string; arquivo: string }[]
}

/**
 * Etapa 2 — gera um MP3 por cena, na voz clonada, com configuração por emoção.
 * `apenasCenas`: regenerar só algumas cenas (correção pontual sem refazer tudo).
 */
export async function gerarVoz(slug: string, apenasCenas?: string[]): Promise<AudioManifest> {
  const env = loadVozEnv()
  const paths = aulaPaths(slug)
  assertAulaExiste(paths)
  const roteiro: Roteiro = loadRoteiroFile(paths.roteiro)

  const cliente = new ElevenLabsClient({
    apiKey: env.ELEVENLABS_API_KEY,
    voiceId: env.ELEVENLABS_VOICE_ID,
    modelId: env.ELEVENLABS_MODEL_ID,
  })

  mkdirSync(paths.audioDir, { recursive: true })
  etapa(`Voz — ${roteiro.meta.titulo}`)

  const alvo = apenasCenas ? new Set(apenasCenas) : null
  const cenas: AudioManifest['cenas'] = []
  for (const cena of roteiro.cenas) {
    const arquivo = `${cena.id}.mp3`
    cenas.push({ id: cena.id, arquivo })
    if (alvo && !alvo.has(cena.id)) continue
    const settings: VozSettings = {
      ...settingsParaEmocao(cena.emocao),
      ...(roteiro.meta.voz?.estabilidade != null && { stability: roteiro.meta.voz.estabilidade }),
      ...(roteiro.meta.voz?.estilo != null && { style: roteiro.meta.voz.estilo }),
      ...(roteiro.meta.voz?.similaridade != null && {
        similarity_boost: roteiro.meta.voz.similaridade,
      }),
    }
    passo(`${cena.id} (${cena.emocao}) — ${cena.narracao.slice(0, 48)}…`)
    const mp3 = await cliente.sintetizar(cena.narracao, settings)
    writeFileSync(join(paths.audioDir, arquivo), mp3)
  }

  const manifest: AudioManifest = {
    slug,
    geradoEm: new Date().toISOString(),
    cenas,
  }
  writeFileSync(join(paths.audioDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
  ok(`${cenas.length} cenas em ${paths.audioDir}`)
  return manifest
}
