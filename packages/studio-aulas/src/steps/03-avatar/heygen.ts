// Cliente REST mínimo do HeyGen (avatar por ÁUDIO, v2). Fluxo:
//   1. upload do MP3 como asset               → asset_id
//   2. gerar vídeo (avatar + audio + fundo)    → video_id
//   3. polling do status                       → video_url
//   4. download do MP4
// Doc: https://docs.heygen.com/  (v2 /video/generate + v1 /video_status.get)
// ⚠️ Confira a doc atual (Context7) antes de evoluir — o contrato v2 muda.
//
// FUNDO: geramos o avatar sobre um VERDE sólido (chroma key) e a composição
// sobre o cenário é feita depois no Remotion — assim o mesmo clipe serve como
// cena cheia (apresentação/fecho) ou como cantinho (meio da aula).

const API_BASE = 'https://api.heygen.com'
const UPLOAD_BASE = 'https://upload.heygen.com'

/** Verde de chroma key (removido no Remotion). */
export const CHROMA_VERDE = '#00b140'

export interface HeyGenClientOptions {
  apiKey: string
  avatarId: string
  /** Fundo sólido do avatar. Default = verde de chroma. */
  fundo?: string
  dimensao?: { width: number; height: number }
}

interface StatusResposta {
  status: 'pending' | 'processing' | 'completed' | 'failed' | string
  video_url?: string
  error?: unknown
}

export class HeyGenClient {
  private readonly apiKey: string
  private readonly avatarId: string
  private readonly fundo: string
  private readonly dimensao: { width: number; height: number }

  constructor(opts: HeyGenClientOptions) {
    this.apiKey = opts.apiKey
    this.avatarId = opts.avatarId
    this.fundo = opts.fundo ?? CHROMA_VERDE
    this.dimensao = opts.dimensao ?? { width: 1920, height: 1080 }
  }

  /** Sobe o MP3 e devolve o id do asset de áudio. */
  async uploadAudio(mp3: Uint8Array): Promise<string> {
    const res = await fetch(`${UPLOAD_BASE}/v1/asset`, {
      method: 'POST',
      headers: { 'x-api-key': this.apiKey, 'content-type': 'audio/mpeg' },
      body: mp3,
    })
    const json = (await res.json().catch(() => ({}))) as { data?: { id?: string } }
    if (!res.ok || !json.data?.id) {
      throw new Error(`HeyGen upload ${res.status}: ${JSON.stringify(json).slice(0, 300)}`)
    }
    return json.data.id
  }

  /** Dispara a geração do vídeo do avatar a partir de um asset de áudio. */
  async gerarVideo(audioAssetId: string): Promise<string> {
    const res = await fetch(`${API_BASE}/v2/video/generate`, {
      method: 'POST',
      headers: { 'x-api-key': this.apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        video_inputs: [
          {
            character: { type: 'avatar', avatar_id: this.avatarId, avatar_style: 'normal' },
            voice: { type: 'audio', audio_asset_id: audioAssetId },
            background: { type: 'color', value: this.fundo },
          },
        ],
        dimension: this.dimensao,
      }),
    })
    const json = (await res.json().catch(() => ({}))) as { data?: { video_id?: string } }
    if (!res.ok || !json.data?.video_id) {
      throw new Error(`HeyGen generate ${res.status}: ${JSON.stringify(json).slice(0, 300)}`)
    }
    return json.data.video_id
  }

  /** Consulta o status uma vez. */
  async status(videoId: string): Promise<StatusResposta> {
    const res = await fetch(
      `${API_BASE}/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`,
      {
        headers: { 'x-api-key': this.apiKey },
      },
    )
    const json = (await res.json().catch(() => ({}))) as { data?: StatusResposta }
    if (!res.ok || !json.data) {
      throw new Error(`HeyGen status ${res.status}: ${JSON.stringify(json).slice(0, 300)}`)
    }
    return json.data
  }

  /** Faz polling até completar (ou falhar/estourar o tempo). */
  async aguardar(
    videoId: string,
    opts?: { intervaloMs?: number; timeoutMs?: number },
  ): Promise<string> {
    const intervalo = opts?.intervaloMs ?? 8000
    const timeout = opts?.timeoutMs ?? 15 * 60 * 1000
    const inicio = Date.now()
    for (;;) {
      const s = await this.status(videoId)
      if (s.status === 'completed' && s.video_url) return s.video_url
      if (s.status === 'failed') throw new Error(`HeyGen falhou: ${JSON.stringify(s.error)}`)
      if (Date.now() - inicio > timeout) throw new Error('HeyGen: tempo esgotado no polling')
      await new Promise((r) => setTimeout(r, intervalo))
    }
  }

  /** Baixa o MP4 pronto. */
  async baixar(url: string): Promise<Uint8Array> {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HeyGen download ${res.status}`)
    return new Uint8Array(await res.arrayBuffer())
  }
}
