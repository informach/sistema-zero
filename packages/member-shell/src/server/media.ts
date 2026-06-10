import 'server-only'
import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { isSameOriginRequest, requiresOriginCheck } from '../lib/csrf'
import { isProd } from '../lib/env'
import type { SessionUser } from '../lib/types'
import type { GatewayModule } from './gateway'
import { optimizeImage } from './image-optimizer'
import { MediaNotConfiguredError, r2DeleteObjects, r2ListKeys, r2PutObject } from './r2'
import { captureServerException } from './sentry'
import type { AccessVerdict, SessionModule } from './session'

// ── Limites/validações (mesma régua do projeto de referência: 5MB png/jpg/webp) ─

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5MB
export const IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

/** Módulo de mídia de um app (ver `createMediaModule`). */
export type MediaModule = ReturnType<typeof createMediaModule>

// ── Guard de sessão (depende dos cookies do app → factory) ──────────────────

/**
 * As rotas de mídia (`/api/me/avatar`, downloads de material) NÃO passam pelo
 * gateway (falam com o R2 direto — provedor externo, mesma exceção consciente
 * do admin) → guard de sessão OBRIGATÓRIO aqui, e ESTRITO: token expirado NÃO
 * autoriza (`getSession` tolera exp SÓ p/ exibição) — tenta UMA rotação de
 * refresh (somos Route Handlers, podemos regravar cookies) e re-verifica;
 * falhou → 401. Qualquer conta ATIVA passa (≠ admin, que exige role).
 *
 * Mutações também passam pela checagem anti-CSRF same-origin (mesma régua do
 * proxy — `/api/me/avatar` fica FORA do matcher dele; nos GETs de download a
 * checagem não se aplica, e abrir a URL direto na barra continua funcionando).
 */
export function createMediaModule(deps: { session: SessionModule; gateway: GatewayModule }) {
  async function requireUploadSession(req: Request): Promise<SessionUser | NextResponse> {
    if (
      requiresOriginCheck(req.method) &&
      !isSameOriginRequest({
        secFetchSite: req.headers.get('sec-fetch-site'),
        origin: req.headers.get('origin'),
        host: req.headers.get('x-forwarded-host') ?? req.headers.get('host'),
      })
    ) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Origem não permitida.' } },
        { status: 403 },
      )
    }

    const access = await deps.session.getAccessToken()
    const refresh = await deps.session.getRefreshToken()
    let verdict: AccessVerdict =
      access && refresh
        ? await deps.session.verifyAccessToken(access)
        : { ok: false, expired: false }
    if (!verdict.ok && verdict.expired) {
      const renewed = await deps.gateway.tryRefresh()
      if (renewed) verdict = await deps.session.verifyAccessToken(renewed)
    }
    if (!verdict.ok) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Sessão expirada — faça login novamente.' } },
        { status: 401 },
      )
    }
    if (verdict.user.status !== 'active') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Conta sem acesso (status).' } },
        { status: 403 },
      )
    }
    // Sessão de IMPERSONAÇÃO (claim `act`) é SOMENTE-LEITURA: mutação (trocar o
    // avatar do aluno) é barrada; os GETs de download seguem — suporte pode VER o
    // que o aluno vê (a marca d'água sai com o e-mail do aluno, dono do acesso).
    if (requiresOriginCheck(req.method) && verdict.user.act) {
      return NextResponse.json(
        {
          error: {
            code: 'IMPERSONATION_READONLY',
            message: 'Sessão de suporte é somente-leitura.',
          },
        },
        { status: 403 },
      )
    }
    return verdict.user
  }

  return { requireUploadSession }
}

// ── Helpers sem dependência de sessão (exports planos) ──────────────────────

/** Erro → resposta `{ error: { code, message } }` (503 quando falta config). */
export function mediaErrorResponse(error: unknown): NextResponse {
  if (error instanceof MediaNotConfiguredError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: 503 },
    )
  }
  console.error('[media] operação falhou', error)
  // Erro local da pipeline de mídia (R2/watermark) = sinal que SÓ este serviço
  // vê → espelha pro Sentry (best-effort; o gateway não enxerga estas rotas).
  captureServerException(error, { area: 'media' })
  // Em prod a mensagem interna (ex.: erro do SDK S3) não vaza ao cliente —
  // o detalhe fica no log acima. Espelha o admin.
  const message =
    !isProd() && error instanceof Error ? error.message : 'Falha na operação de mídia.'
  return NextResponse.json({ error: { code: 'MEDIA_ERROR', message } }, { status: 500 })
}

/**
 * Pre-check do Content-Length ANTES do `req.formData()` — o parse materializa o
 * corpo INTEIRO em memória, então o limite precisa barrar o upload antes disso
 * (um arquivo de GBs mandado por engano derrubaria o host). Folga p/ o envelope
 * multipart (boundary/headers). **Content-Length é OBRIGATÓRIO** nestas rotas
 * (browsers SEMPRE declaram em `FormData`): sem ele, um corpo chunked passaria
 * sem teto até o check pós-parse — fechamos a janela exigindo a declaração (411).
 */
const MULTIPART_OVERHEAD_BYTES = 1024 * 1024

export function rejectOversizedRequest(req: Request, maxBytes: number): NextResponse | null {
  const raw = req.headers.get('content-length')
  if (!raw) {
    return NextResponse.json(
      { error: { code: 'LENGTH_REQUIRED', message: 'Content-Length obrigatório no upload.' } },
      { status: 411 },
    )
  }
  const declared = Number(raw)
  if (!Number.isFinite(declared) || declared > maxBytes + MULTIPART_OVERHEAD_BYTES) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Arquivo excede o limite da rota.' } },
      { status: 413 },
    )
  }
  return null
}

// ── Avatar (R2 + sharp→WebP) ────────────────────────────────────────────────

export interface StoredAvatar {
  url: string
  /** Key do objeto novo — usada p/ poupar na limpeza dos antigos. */
  key: string
  sizeBytes: number
}

/** Otimiza (WebP 512×512) e armazena no R2 sob `community/avatars/<userId>/<uuid>.webp`. */
export async function optimizeAndStoreAvatar(file: File, userId: string): Promise<StoredAvatar> {
  const optimized = await optimizeImage(await file.arrayBuffer(), 'avatar')
  const key = `community/avatars/${userId}/${randomUUID()}.${optimized.extension}`
  const { url } = await r2PutObject({
    key,
    body: optimized.buffer,
    contentType: optimized.contentType,
  })
  return { url, key, sizeBytes: optimized.sizeBytes }
}

/**
 * Remove os avatares ANTERIORES do aluno (prefixo próprio por usuário) após uma
 * troca bem-sucedida — sem isso cada troca acumula um objeto órfão no R2 para
 * sempre. Best-effort: falha só loga (o avatar novo já está no ar).
 */
export async function removeStaleAvatars(userId: string, keepKey: string): Promise<void> {
  try {
    const keys = (await r2ListKeys(`community/avatars/${userId}/`)).filter((k) => k !== keepKey)
    if (keys.length > 0) await r2DeleteObjects(keys)
  } catch (error) {
    console.warn('[media] limpeza de avatares antigos falhou', { userId, error })
  }
}
