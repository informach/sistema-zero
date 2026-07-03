import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadRoteiroFile } from '../../roteiro/parse'
import type { Cena, TipoCena } from '../../roteiro/schema'
import { aulaPaths, CENARIOS_DIR } from '../../util/paths'
import type { TelaTimeline } from '../04-tela/timeline'

// Plano de montagem: tudo que o Remotion precisa para renderizar SEM medir nada
// em runtime (durações já resolvidas aqui, no Node). Escrito em out/montagem.json
// e passado ao Remotion via --props. As mídias são servidas por --public-dir=out,
// então os caminhos são relativos a out/ (staticFile).

export const FPS = 30
export const LARGURA = 1280
export const ALTURA = 720

export type LayoutCena = 'avatar-cheio' | 'teoria' | 'pratica'

export interface PlanoBalao {
  texto: string
  x: number
  y: number
  w: number
  h: number
  apareceS: number
  escondeS: number
}

export interface PlanoCena {
  id: string
  tipo: TipoCena
  layout: LayoutCena
  duracaoS: number
  narracao: string
  audio?: string
  avatar?: string
  ilustracao?: { nome: string; params?: Record<string, string | number> }
  telaInicioS?: number
  telaFimS?: number
  baloes?: PlanoBalao[]
}

export interface Plano {
  slug: string
  titulo: string
  fps: number
  largura: number
  altura: number
  chroma: string
  cenarioAbertura?: string
  cenarioMeio?: string
  tela?: string
  cenas: PlanoCena[]
}

function layoutDe(tipo: TipoCena): LayoutCena {
  if (tipo === 'pratica') return 'pratica'
  if (tipo === 'teoria') return 'teoria'
  return 'avatar-cheio'
}

/** Mede a duração de um áudio via ffprobe; se indisponível, estima pela narração. */
function duracaoAudioS(path: string, narracao: string): number {
  if (existsSync(path)) {
    try {
      const out = Bun.spawnSync({
        cmd: ['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
      })
      const txt = new TextDecoder().decode(out.stdout).trim()
      const n = Number.parseFloat(txt)
      if (Number.isFinite(n) && n > 0) return n
    } catch {
      /* sem ffprobe: cai na estimativa */
    }
  }
  // Estimativa: ~2.6 palavras/seg + respiro.
  const palavras = narracao.trim().split(/\s+/).length
  return Math.max(2, palavras / 2.6 + 0.8)
}

function lerJSON<T>(path: string): T | null {
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T
  } catch {
    return null
  }
}

/** Constrói o plano a partir do roteiro + saídas já geradas (as que existirem). */
export function construirPlano(slug: string): Plano {
  const paths = aulaPaths(slug)
  const roteiro = loadRoteiroFile(paths.roteiro)
  const tela = lerJSON<TelaTimeline>(paths.telaTimeline)
  const temAudio = (id: string) => existsSync(join(paths.audioDir, `${id}.mp3`))
  const temAvatar = (id: string) => existsSync(join(paths.avatarDir, `${id}.mp4`))

  const cenas: PlanoCena[] = roteiro.cenas.map((cena: Cena) => {
    const audioPath = join(paths.audioDir, `${cena.id}.mp3`)
    const audioS = duracaoAudioS(audioPath, cena.narracao)

    const base: PlanoCena = {
      id: cena.id,
      tipo: cena.tipo,
      layout: layoutDe(cena.tipo),
      duracaoS: audioS,
      narracao: cena.narracao,
      audio: temAudio(cena.id) ? `audio/${cena.id}.mp3` : undefined,
      avatar: temAvatar(cena.id) ? `avatar/${cena.id}.mp4` : undefined,
      ilustracao: cena.ilustracao,
    }

    if (cena.tipo === 'pratica' && tela) {
      const range = tela.cenas.find((c) => c.id === cena.id)
      if (range) {
        const telaDurS = (range.fimMs - range.inicioMs) / 1000
        base.telaInicioS = range.inicioMs / 1000
        base.telaFimS = range.fimMs / 1000
        base.duracaoS = Math.max(audioS, telaDurS)
        base.baloes = tela.baloes
          .filter((b) => b.cenaId === cena.id)
          .map((b) => ({
            texto: b.texto,
            x: b.x,
            y: b.y,
            w: b.w,
            h: b.h,
            apareceS: (b.apareceMs - range.inicioMs) / 1000,
            escondeS: (b.escondeMs - range.inicioMs) / 1000,
          }))
      }
    }
    return base
  })

  // Só aponta o cenário se a imagem existir (a montagem copia p/ out/cenarios).
  // Sem imagem → undefined → o Remotion cai no gradiente de cortesia.
  const cenario = (nome: string): string | undefined =>
    existsSync(join(CENARIOS_DIR, `${nome}.png`)) ? `cenarios/${nome}.png` : undefined

  return {
    slug,
    titulo: roteiro.meta.titulo,
    fps: FPS,
    largura: LARGURA,
    altura: ALTURA,
    chroma: '#00b140',
    cenarioAbertura: cenario(roteiro.meta.cenarioAbertura),
    cenarioMeio: cenario(roteiro.meta.cenarioMeio),
    // O webm vive em out/tela/ (subpasta); o staticFile resolve relativo à raiz
    // do public (=out), então precisa do prefixo `tela/`.
    tela: tela ? `tela/${tela.video}` : undefined,
    cenas,
  }
}

/** Constrói e grava out/montagem.json. Retorna o caminho. */
export function escreverPlano(slug: string): string {
  const paths = aulaPaths(slug)
  const plano = construirPlano(slug)
  const dest = join(paths.outDir, 'montagem.json')
  writeFileSync(dest, JSON.stringify(plano, null, 2))
  return dest
}
