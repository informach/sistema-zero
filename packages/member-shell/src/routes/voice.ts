import { InMemoryRateLimiter } from '@sistemazero/core/security'
import { NextResponse } from 'next/server'
import { learnerIdentity } from '../lib/learner-identity'
import type { ProfileView, SessionUser } from '../lib/types'
import {
  audioFormatFromBytes,
  SPOKEN_AUDIO_MAX_BYTES,
  SPOKEN_AUDIO_MIN_BYTES,
  SPOKEN_MAX_CHARS_HEADER,
  sanitizeSpokenContext,
  spokenTextMaxChars,
} from '../lib/voice/transcription'
import { hasAdultCapability } from '../server/adult-capabilities'
import type { MembersClient } from '../server/clients'
import type { GatewayResponse } from '../server/gateway'
import {
  isVoiceInputConfigured,
  TranscribeError,
  type TranscribeInput,
  transcribeSpeech,
} from '../server/openrouter-transcribe'

/**
 * `POST /api/voice/transcribe` (14/10/2026): a fala da criança vira texto para a equipe.
 *
 * O corpo é o áudio cru (`audio/*`), lido em fluxo com teto e conferido pelos bytes. A rota mora
 * DENTRO do matcher do proxy (mesma origem, prova `x-sz-session` e a política do Kids) e confere
 * aqui o resto: sessão de CRIANÇA, nenhuma sessão de suporte, o perfil da aba (`x-sz-viewer`), o
 * interruptor do servidor, a escolha dos pais relida na hora e os limites de uso. A resposta é só
 * `{text}`: a criança confere e envia como uma mensagem escrita.
 *
 * ⚠️ A voz não é guardada em lugar nenhum, e nenhum erro ou log leva o áudio nem o texto.
 */

const CONTEXT_HEADER = 'x-sz-voice-context'

/** Por perfil: o minuto segura a rajada, a hora segura o uso contínuo. */
const PER_MINUTE = 6
const PER_HOUR = 40
/** O processo inteiro (réplica única): disjuntor de custo. */
const GLOBAL_PER_HOUR = 600

type VoiceLimits = {
  minute: InMemoryRateLimiter
  hour: InMemoryRateLimiter
  global: InMemoryRateLimiter
  /** Perfis com uma transcrição em andamento: uma por vez (o botão também só manda uma). */
  inflight: Set<string>
}

const LIMITS_SLOT = Symbol.for('sz.voice.limits')

/** Em `globalThis`: o Turbopack dá a cada bundle uma cópia do módulo. */
function sharedLimits(): VoiceLimits {
  const g = globalThis as unknown as Record<symbol, VoiceLimits | undefined>
  g[LIMITS_SLOT] ??= {
    minute: new InMemoryRateLimiter(PER_MINUTE, 60_000),
    hour: new InMemoryRateLimiter(PER_HOUR, 3_600_000),
    global: new InMemoryRateLimiter(GLOBAL_PER_HOUR, 3_600_000),
    inflight: new Set(),
  }
  return g[LIMITS_SLOT]
}

function fail(status: number, code: string, message: string, headers?: Record<string, string>) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { 'Cache-Control': 'private, no-store', ...headers } },
  )
}

type ReadResult = { ok: true; bytes: Uint8Array } | { ok: false; reason: 'too-large' | 'empty' }

/** Lê o corpo em fluxo e para no teto (o `Content-Length` pode mentir ou faltar). */
async function readAudio(req: Request, max: number): Promise<ReadResult> {
  const declared = Number(req.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > max) return { ok: false, reason: 'too-large' }
  if (!req.body) return { ok: false, reason: 'empty' }
  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > max) {
      await reader.cancel().catch(() => undefined)
      return { ok: false, reason: 'too-large' }
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return total === 0 ? { ok: false, reason: 'empty' } : { ok: true, bytes }
}

/** O contexto vem com percent-encoding (emoji num título quebraria o cabeçalho). */
function readContext(req: Request): string {
  const raw = req.headers.get(CONTEXT_HEADER)
  if (!raw) return ''
  try {
    return sanitizeSpokenContext(decodeURIComponent(raw))
  } catch {
    return ''
  }
}

export function createVoiceRoutes({
  session,
  auth,
  audience = 'kids',
  members,
  transcribe = transcribeSpeech,
  configured = isVoiceInputConfigured,
  limits = sharedLimits,
}: {
  audience?: 'kids' | 'adult'
  members?: Pick<MembersClient, 'getGamification' | 'getAdultProfileReadonly'>
  session: { getSession: () => Promise<SessionUser | null> }
  auth: { getMyProfile: () => Promise<GatewayResponse<{ profile: ProfileView | null }>> }
  transcribe?: (input: TranscribeInput) => Promise<{ text: string; model: string }>
  configured?: () => boolean
  limits?: () => VoiceLimits
}) {
  const voiceTranscribe = {
    async POST(req: Request) {
      const user = await session.getSession()
      if (!user) return fail(401, 'UNAUTHORIZED', 'Sessão expirada.')
      // A fala é da criança: nem a sessão dos pais nem a da equipe (mesmo no modo de escrita).
      if (audience === 'adult' ? !learnerIdentity(user, 'adult') : user.kids?.kind !== 'student')
        return fail(403, 'STUDENT_SESSION_REQUIRED', 'Falar em vez de escrever é para a criança.')
      if (user.act) return fail(403, 'SUPPORT_SESSION', 'A sessão de suporte não usa a fala.')
      if (user.status !== 'active') return fail(403, 'FORBIDDEN', 'Conta inativa.')
      if (req.headers.get('x-sz-viewer') !== user.id)
        return fail(
          409,
          'VIEWER_CHANGED',
          'O perfil mudou. Abra esta página de novo para continuar no perfil atual.',
        )
      if (!configured()) return fail(503, 'VOICE_UNAVAILABLE', 'A fala não está disponível agora.')

      const type = (req.headers.get('content-type') ?? '').split(';')[0]?.trim().toLowerCase()
      if (!type?.startsWith('audio/'))
        return fail(415, 'VOICE_FORMAT', 'Esse arquivo não é uma gravação de voz.')

      // A escolha dos pais, relida AGORA: desligar vale no pedido seguinte.
      if (audience === 'adult') {
        if (!members || !(await hasAdultCapability(members, user, 'ai')))
          return fail(
            403,
            'ADULT_CAPABILITY_REQUIRED',
            'A fala será liberada na formação avançada.',
          )
        const preferences = await members.getAdultProfileReadonly().catch(() => null)
        if (preferences?.status !== 200 || !preferences.body)
          return fail(503, 'VOICE_UNAVAILABLE', 'Não foi possível conferir sua preferência de voz.')
        if (!preferences.body.voiceEnabled)
          return fail(403, 'VOICE_INPUT_DISABLED', 'A fala está desligada nas suas preferências.')
      } else {
        const mine = await auth.getMyProfile()
        if (mine.status === 401) return fail(401, 'UNAUTHORIZED', 'Sessão expirada.')
        if (mine.status !== 200)
          return fail(503, 'VOICE_UNAVAILABLE', 'A fala não está disponível agora.')
        const profile = mine.body?.profile
        if (!profile || profile.id !== user.id || profile.voiceInputEnabled !== true)
          return fail(403, 'VOICE_INPUT_DISABLED', 'A fala está desligada neste perfil.')
      }

      const read = await readAudio(req, SPOKEN_AUDIO_MAX_BYTES)
      if (!read.ok)
        return read.reason === 'too-large'
          ? fail(413, 'PAYLOAD_TOO_LARGE', 'A gravação ficou grande demais.')
          : fail(422, 'VOICE_EMPTY', 'Não consegui ouvir nada.')
      if (read.bytes.byteLength < SPOKEN_AUDIO_MIN_BYTES)
        return fail(422, 'VOICE_EMPTY', 'Não consegui ouvir nada.')
      const format = audioFormatFromBytes(read.bytes)
      if (!format) return fail(415, 'VOICE_FORMAT', 'Esse arquivo não é uma gravação de voz.')

      // Por último: um pedido recusado antes daqui não gasta a cota de ninguém.
      const box = limits()
      const ocupado = () =>
        fail(
          429,
          'VOICE_RATE_LIMITED',
          'Muitas gravações seguidas. Espere um pouco e tente de novo.',
          { 'Retry-After': '5' },
        )
      if (box.inflight.has(user.id)) return ocupado()
      // ⚠️ `check` CONSOME. Do mais estreito para o mais largo: uma recusa do minuto não gasta a
      // hora da criança nem a cota global (com a ordem inversa, uma criança insistindo travava a
      // fala de TODAS por uma hora). A recusa da hora gasta só o minuto dela, que volta sozinho.
      for (const [limiter, key] of [
        [box.minute, user.id],
        [box.hour, user.id],
        [box.global, 'all'],
      ] as const) {
        const verdict = limiter.check(key)
        if (!verdict.allowed)
          return fail(
            429,
            'VOICE_RATE_LIMITED',
            'Muitas gravações seguidas. Espere um pouco e tente de novo.',
            { 'Retry-After': String(verdict.retryAfterSeconds ?? 60) },
          )
      }

      box.inflight.add(user.id)
      try {
        const { text } = await transcribe({
          audio: read.bytes,
          format,
          context: readContext(req),
          // O teto maior só vem quando o formulário o pede (a ideia do Pensa); o resto, 1000.
          maxChars: spokenTextMaxChars(req.headers.get(SPOKEN_MAX_CHARS_HEADER)),
          signal: req.signal,
        })
        return NextResponse.json({ text }, { headers: { 'Cache-Control': 'private, no-store' } })
      } catch (error) {
        if (!(error instanceof TranscribeError))
          // Só o NOME: a mensagem de um erro inesperado pode carregar o que não deve sair daqui.
          console.warn('[voz] falha inesperada na transcrição', {
            name: (error as { name?: unknown } | null)?.name,
          })
        const reason = error instanceof TranscribeError ? error.reason : 'unavailable'
        if (reason === 'empty') return fail(422, 'VOICE_EMPTY', 'Não consegui entender.')
        if (reason === 'timeout')
          return fail(504, 'VOICE_TIMEOUT', 'Demorou demais para virar texto.')
        // `aborted`: o navegador foi embora; ninguém lê esta resposta.
        return fail(503, 'VOICE_UNAVAILABLE', 'A fala não está disponível agora.')
      } finally {
        box.inflight.delete(user.id)
      }
    },
  }
  return { voiceTranscribe }
}
